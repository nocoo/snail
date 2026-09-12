import { expect, it } from "vitest";
import { verifyDeployment } from "../../scripts/verify-production";

it("requires real public JSON health, version match, Access and device isolation", async () => {
  const upstream =
    (health: Response): typeof fetch =>
    async (input, init) => {
      expect(init?.redirect).toBe("manual");
      expect(init?.credentials).toBe("omit");
      const path = new URL(String(input)).pathname;
      if (path === "/api/live") return health.clone();
      if (path === "/api/connectors/me/heartbeat")
        return Response.json({ error: { code: "device_required" } }, { status: 401 });
      return new Response(null, {
        status: 302,
        headers: {
          Location: "https://nocoo.cloudflareaccess.com/cdn-cgi/access/login/snail.hexly.ai",
        },
      });
    };
  const good = Response.json(
    { status: "ok", version: "0.1.0" },
    { headers: { "Cache-Control": "no-store" } },
  );
  expect(await verifyDeployment("https://snail.hexly.ai", "0.1.0", upstream(good))).toMatchObject({
    version: "0.1.0",
    healthy: true,
  });
  await expect(
    verifyDeployment(
      "https://snail.hexly.ai",
      "0.1.0",
      upstream(new Response("Login", { headers: { "Content-Type": "text/html" } })),
    ),
  ).rejects.toThrow();
  await expect(
    verifyDeployment("https://snail.hexly.ai", "0.2.0", upstream(good)),
  ).rejects.toThrow();
  await expect(
    verifyDeployment("https://snail.hexly.ai", "0.1.0", async () => good.clone()),
  ).rejects.toThrow();
});

it("requires fail-closed authentication on health descendants bypassed by Access path matching", async () => {
  const upstream =
    (denied: Response): typeof fetch =>
    async (input) => {
      const path = new URL(String(input)).pathname;
      if (path === "/api/live")
        return Response.json(
          { status: "ok", version: "0.1.0" },
          { headers: { "Cache-Control": "no-store" } },
        );
      if (path === "/api/live/" || path === "/api/live/child") return denied.clone();
      if (path === "/api/connectors/me/heartbeat")
        return Response.json({ error: { code: "device_required" } }, { status: 401 });
      return new Response(null, {
        status: 302,
        headers: { Location: "https://nocoo.cloudflareaccess.com/cdn-cgi/access/login" },
      });
    };
  const denied = Response.json({ error: { code: "authentication_required" } }, { status: 401 });
  expect(await verifyDeployment("https://snail.hexly.ai", "0.1.0", upstream(denied))).toMatchObject(
    {
      healthy: true,
    },
  );
  for (const invalid of [
    Response.json({ status: "ok", version: "0.1.0" }),
    Response.json({ error: { code: "internal_error" } }, { status: 401 }),
    new Response("Access required", { status: 401 }),
  ]) {
    await expect(
      verifyDeployment("https://snail.hexly.ai", "0.1.0", upstream(invalid)),
    ).rejects.toThrow();
  }
});
