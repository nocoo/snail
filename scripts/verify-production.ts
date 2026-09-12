import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { version } from "../package.json";
import { readBytes } from "../worker/http";

export async function verifyDeployment(
  origin: string,
  expectedVersion: string,
  fetcher: typeof fetch = fetch,
) {
  assert.equal(new URL(origin).protocol, "https:");
  const probes: { path: string; status: number; mime: string | null }[] = [];
  async function get(path: string, method = "GET") {
    const response = await fetcher(`${origin}${path}`, {
      method,
      redirect: "manual",
      credentials: "omit",
      signal: AbortSignal.timeout(15_000),
      ...(method === "POST" ? { headers: { "Content-Type": "application/json" }, body: "{}" } : {}),
    });
    probes.push({ path, status: response.status, mime: response.headers.get("content-type") });
    return response;
  }
  const health = await get("/api/live");
  assert.equal(health.status, 200, "Public /api/live must return 200");
  assert.ok(
    health.headers.get("content-type")?.startsWith("application/json"),
    "Health must be JSON, never an Access page",
  );
  assert.ok(health.headers.get("cache-control")?.includes("no-store"), "Health must not be cached");
  const body = JSON.parse(new TextDecoder().decode(await readBytes(health, 65_536)));
  assert.equal(body.status, "ok", "Bindings must be healthy");
  assert.equal(body.version, expectedVersion, "Production version must match the release");
  function requireAccessRedirect(response: Response, path: string) {
    assert.equal(response.status, 302, `${path} must require Cloudflare Access`);
    assert.equal(
      new URL(response.headers.get("location") ?? "https://invalid.test").hostname,
      "nocoo.cloudflareaccess.com",
      `${path} must use Snail's Access team`,
    );
  }
  for (const path of ["/", "/api/me", "/api/me/connector-pairings/approve"]) {
    const response = await get(path);
    requireAccessRedirect(response, path);
    await response.body?.cancel();
  }
  // Access application paths can include descendants; the Worker must deny them itself.
  for (const path of ["/api/live/", "/api/live/child"]) {
    const response = await get(path);
    if (response.status === 401) {
      assert.ok(response.headers.get("content-type")?.startsWith("application/json"));
      const denied = JSON.parse(new TextDecoder().decode(await readBytes(response, 65_536)));
      assert.equal(denied.error?.code, "authentication_required");
    } else {
      requireAccessRedirect(response, path);
      await response.body?.cancel();
    }
  }
  const device = await get("/api/connectors/me/heartbeat", "POST");
  assert.equal(
    device.status,
    401,
    "Device path must require a device credential, not an SSO redirect",
  );
  assert.ok(device.headers.get("content-type")?.startsWith("application/json"));
  await device.body?.cancel();
  return { origin, version: expectedVersion, healthy: true, probes };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    console.log(JSON.stringify(await verifyDeployment("https://snail.hexly.ai", version), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Production verification failed");
    process.exitCode = 1;
  }
}
