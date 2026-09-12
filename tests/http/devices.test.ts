import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHarness } from "./harness";

describe("device pairing and least privilege", () => {
  let h: Awaited<ReturnType<typeof createHarness>>;
  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h?.dispose();
  });
  const start = (scopes = ["media:write", "jobs:read"]) =>
    h.request(
      "/api/connector-pairings",
      { method: "POST", body: JSON.stringify({ name: "Test laptop", scopes }) },
      "",
    );
  const exchange = (deviceCode: string) =>
    h.request(
      "/api/connector-pairings/exchange",
      { method: "POST", body: JSON.stringify({ deviceCode }) },
      "",
    );
  const device = (token: string, path: string, body?: unknown, method?: string) =>
    h.request(
      `/api/connectors/me${path}`,
      {
        method: method ?? (body ? "POST" : "GET"),
        headers: { Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      },
      "",
    );

  it("requires user approval, hashes credentials, exchanges once and revokes immediately", async () => {
    const response = await start();
    expect(response.status).toBe(201);
    const pending = (await response.json()) as { userCode: string; deviceCode: string };
    expect(pending.deviceCode.length).toBeGreaterThan(60);
    expect((await exchange(pending.deviceCode)).status).toBe(428);
    const approval = { userCode: pending.userCode, scopes: ["media:write", "jobs:read"] };
    expect(
      (
        await h.request(
          "/api/me/connector-pairings/approve",
          { method: "POST", body: JSON.stringify(approval) },
          "",
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await h.request("/api/me/connector-pairings/approve", {
          method: "POST",
          body: JSON.stringify(approval),
        })
      ).status,
    ).toBe(200);
    const result = await exchange(pending.deviceCode);
    expect(result.status).toBe(200);
    const paired = (await result.json()) as { token: string; deviceId: string };
    expect((await exchange(pending.deviceCode)).status).toBe(410);
    const stored = await h.db
      .prepare("SELECT token_hash FROM devices WHERE id=?")
      .bind(paired.deviceId)
      .first<{ token_hash: string }>();
    expect(stored?.token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored?.token_hash).not.toBe(paired.token);
    expect((await device(paired.token, "/heartbeat", { checkpoint: "batch-001" })).status).toBe(
      200,
    );
    expect((await device(paired.token, "/assets")).status).toBe(403);
    expect(
      (await h.request(`/api/devices/${paired.deviceId}`, { method: "DELETE" }, "user-b")).status,
    ).toBe(404);
    expect((await h.request(`/api/devices/${paired.deviceId}`, { method: "DELETE" })).status).toBe(
      200,
    );
    expect((await device(paired.token, "/heartbeat", { checkpoint: "late" })).status).toBe(401);
  });

  it("limits read-only tokens, checks expiry, and never lets device auth become browser auth", async () => {
    const pending = (await (await start(["library:read"])).json()) as {
      userCode: string;
      deviceCode: string;
    };
    await h.request("/api/me/connector-pairings/approve", {
      method: "POST",
      body: JSON.stringify({ userCode: pending.userCode, scopes: ["library:read"] }),
    });
    const paired = (await (await exchange(pending.deviceCode)).json()) as {
      token: string;
      deviceId: string;
    };
    expect((await device(paired.token, "/assets")).status).toBe(200);
    expect((await device(paired.token, "/imports", { approved: true })).status).toBe(403);
    expect(
      (await h.request("/api/assets", { headers: { Authorization: `Bearer ${paired.token}` } }, ""))
        .status,
    ).toBe(401);
    await h.db.prepare("UPDATE devices SET expires_at=0 WHERE id=?").bind(paired.deviceId).run();
    expect((await device(paired.token, "/assets")).status).toBe(401);
  });

  it("does not approve unrequested privileges or accept cookie-bearing imports", async () => {
    const pending = (await (await start(["media:write"])).json()) as {
      userCode: string;
      deviceCode: string;
    };
    const elevate = await h.request("/api/me/connector-pairings/approve", {
      method: "POST",
      body: JSON.stringify({ userCode: pending.userCode, scopes: ["library:read", "media:write"] }),
    });
    expect(elevate.status).toBe(400);
    await h.request("/api/me/connector-pairings/approve", {
      method: "POST",
      body: JSON.stringify({ userCode: pending.userCode, scopes: ["media:write"] }),
    });
    const paired = (await (await exchange(pending.deviceCode)).json()) as { token: string };
    const bad = await device(paired.token, "/imports", {
      cookies: "not-a-real-cookie",
      approved: true,
    });
    expect(bad.status).toBe(400);
    expect(
      (
        await device(paired.token, "/heartbeat", {
          checkpoint: "safe",
          headers: { cookie: "fake" },
        })
      ).status,
    ).toBe(400);
  });

  it("allows the advertised ten-minute polling window independently of pairing starts", async () => {
    const isolated = await createHarness();
    try {
      const pending = (await (
        await isolated.request(
          "/api/connector-pairings",
          {
            method: "POST",
            body: JSON.stringify({ name: "Polling test", scopes: ["media:write"] }),
          },
          "",
        )
      ).json()) as { deviceCode: string };
      for (let count = 0; count < 121; count++) {
        const response = await isolated.request(
          "/api/connector-pairings/exchange",
          {
            method: "POST",
            body: JSON.stringify({ deviceCode: pending.deviceCode }),
          },
          "",
        );
        expect(response.status).toBe(428);
      }
      for (let count = 1; count < 10; count++) {
        expect(
          (
            await isolated.request(
              "/api/connector-pairings",
              {
                method: "POST",
                body: JSON.stringify({ name: "Rate limit test", scopes: ["media:write"] }),
              },
              "",
            )
          ).status,
        ).toBe(201);
      }
      expect(
        (
          await isolated.request(
            "/api/connector-pairings",
            { method: "POST", body: JSON.stringify({ name: "Limited", scopes: ["media:write"] }) },
            "",
          )
        ).status,
      ).toBe(429);
    } finally {
      await isolated.dispose();
    }
  });
});
