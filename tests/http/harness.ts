import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { convertV4MiniflareOptions, Response as MfResponse, Miniflare } from "miniflare";

export async function createHarness() {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "test-key", alg: "RS256", use: "sig" };
  const output = await build({
    entryPoints: ["worker/index.ts"],
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    target: "es2024",
    external: ["cloudflare:workers", "node:*"],
    logLevel: "silent",
  });
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: output.outputFiles[0].text,
      compatibilityDate: "2026-09-12",
      compatibilityFlags: ["nodejs_compat"],
      d1Databases: ["DB"],
      r2Buckets: ["MEDIA"],
      bindings: {
        ACCESS_TEAM_DOMAIN: "https://test.cloudflareaccess.com",
        ACCESS_AUD: "snail-test-aud",
        APP_ORIGIN: "https://snail.test",
      },
      outboundService: async (request) => {
        if (new URL(request.url).pathname === "/cdn-cgi/access/certs")
          return new MfResponse(JSON.stringify({ keys: [jwk] }), {
            headers: { "Content-Type": "application/json" },
          });
        return new MfResponse("Blocked test upstream", { status: 502 });
      },
    }),
  );
  const db = await mf.getD1Database("DB");
  const schema = await readFile("migrations/0001_library.sql", "utf8");
  for (const sql of schema
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await db.prepare(sql).run();
  async function token(subject = "user-a") {
    return new SignJWT({ email: `${subject}@example.test` })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setSubject(subject)
      .setIssuer("https://test.cloudflareaccess.com")
      .setAudience("snail-test-aud")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey);
  }
  async function request(
    path: string,
    init: { method?: string; headers?: HeadersInit; body?: string | Uint8Array } = {},
    user = "user-a",
  ) {
    const headers = new Headers(init.headers);
    if (user) headers.set("cf-access-jwt-assertion", await token(user));
    if (init.method && !["GET", "HEAD"].includes(init.method)) {
      headers.set("Origin", "https://snail.test");
      headers.set("X-Snail-Request", "1");
    }
    if (typeof init.body === "string") headers.set("Content-Type", "application/json");
    return mf.dispatchFetch(`https://snail.test${path}`, {
      ...init,
      headers: Object.fromEntries(headers.entries()),
    });
  }
  return { mf, db, request, token, dispose: () => mf.dispose() };
}
