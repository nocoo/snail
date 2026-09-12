import { readdir, readFile } from "node:fs/promises";
import { build } from "esbuild";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import {
  convertV4MiniflareOptions,
  type Request as MfRequest,
  Response as MfResponse,
  Miniflare,
} from "miniflare";

export async function createHarness(
  options: {
    assets?: string;
    persist?: string;
    upstream?: (request: MfRequest) => Promise<MfResponse> | MfResponse;
  } = {},
) {
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
      unsafeTriggerHandlers: true,
      script: output.outputFiles[0].text,
      compatibilityDate: "2026-09-12",
      compatibilityFlags: ["nodejs_compat"],
      d1Databases: ["DB"],
      r2Buckets: ["MEDIA"],
      resourcePersistencePath: options.persist,
      assets: options.assets
        ? {
            directory: options.assets,
            binding: "ASSETS",
            run_worker_first: true,
            routerConfig: { has_user_worker: true },
            assetConfig: { not_found_handling: "single-page-application" },
          }
        : undefined,
      bindings: {
        ACCESS_TEAM_DOMAIN: "https://test.cloudflareaccess.com",
        ACCESS_AUD: "snail-test-aud",
        APP_ORIGIN: "https://snail.test",
      },
      outboundService: async (request) => {
        if (new URL(request.url).hostname === "cloudflare-dns.com")
          return new MfResponse(
            JSON.stringify({ Status: 0, Answer: [{ type: 1, data: "199.232.148.158" }] }),
            {
              headers: { "Content-Type": "application/dns-json" },
            },
          );
        if (new URL(request.url).pathname === "/cdn-cgi/access/certs")
          return new MfResponse(JSON.stringify({ keys: [jwk] }), {
            headers: { "Content-Type": "application/json" },
          });
        return options.upstream
          ? options.upstream(request)
          : new MfResponse("Blocked test upstream", { status: 502 });
      },
    }),
  );
  const db = await mf.getD1Database("DB");
  await db.prepare("CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)").run();
  const applied = new Set(
    (await db.prepare("SELECT name FROM local_migrations").all<{ name: string }>()).results.map(
      (row: { name: string }) => row.name,
    ),
  );
  for (const name of (await readdir("migrations")).filter((name) => name.endsWith(".sql")).sort()) {
    if (applied.has(name)) continue;
    const statements = (await readFile(`migrations/${name}`, "utf8"))
      .split(";")
      .map((sql) => sql.trim())
      .filter(Boolean)
      .map((sql) => db.prepare(sql));
    await db.batch([
      ...statements,
      db.prepare("INSERT INTO local_migrations (name) VALUES (?)").bind(name),
    ]);
  }
  async function token(subject = "user-a") {
    return new SignJWT({ type: "app", email: `${subject}@example.test` })
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

export async function pairDevice(
  h: Awaited<ReturnType<typeof createHarness>>,
  scopes = ["media:write", "jobs:read"],
  user = "user-a",
) {
  const pending = (await (
    await h.request(
      "/api/connector-pairings",
      { method: "POST", body: JSON.stringify({ name: "Synthetic connector", scopes }) },
      "",
    )
  ).json()) as { userCode: string; deviceCode: string };
  const approved = await h.request(
    "/api/me/connector-pairings/approve",
    { method: "POST", body: JSON.stringify({ userCode: pending.userCode, scopes }) },
    user,
  );
  if (approved.status !== 200) throw new Error("Test pairing approval failed");
  const paired = (await (
    await h.request(
      "/api/connector-pairings/exchange",
      { method: "POST", body: JSON.stringify({ deviceCode: pending.deviceCode }) },
      "",
    )
  ).json()) as { deviceId: string; token: string };
  return {
    ...paired,
    request: (path: string, body?: unknown, method?: string, extra?: Record<string, string>) =>
      h.request(
        `/api/connectors/me${path}`,
        {
          method: method ?? (body !== undefined ? "POST" : "GET"),
          body: body === undefined ? undefined : JSON.stringify(body),
          headers: { Authorization: `Bearer ${paired.token}`, ...extra },
        },
        "",
      ),
  };
}
