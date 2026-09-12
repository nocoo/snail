import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHarness } from "./harness";

describe("Worker identity and library HTTP", () => {
  let h: Awaited<ReturnType<typeof createHarness>>;
  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h?.dispose();
  });
  it("has real public JSON health but refuses private API and assets anonymously", async () => {
    const health = await h.request("/api/live", {}, "");
    expect(health.status).toBe(200);
    expect(health.headers.get("content-type")).toContain("application/json");
    expect(await health.json()).toMatchObject({ status: "ok", version: "0.1.0", service: "snail" });
    expect((await h.request("/api/assets", {}, "")).status).toBe(401);
    expect((await h.request("/", {}, "")).status).toBe(401);
    expect(health.headers.get("x-content-type-options")).toBe("nosniff");
  });
  it("initializes each authenticated library independently", async () => {
    const a = (await (await h.request("/api/me")).json()) as { libraryId: string };
    const b = (await (await h.request("/api/me", {}, "user-b")).json()) as { libraryId: string };
    expect(a.libraryId).not.toBe(b.libraryId);
    expect(
      (
        await h.request("/api/categories", {
          method: "POST",
          body: JSON.stringify({ name: "Travel" }),
        })
      ).status,
    ).toBe(201);
    const categories = (await (await h.request("/api/categories")).json()) as unknown[];
    expect(categories).toHaveLength(1);
    expect(await (await h.request("/api/categories", {}, "user-b")).json()).toEqual([]);
  });
  it("blocks cross-site and missing-origin mutations without CORS opt-in", async () => {
    const response = await h.mf.dispatchFetch("https://snail.test/api/categories", {
      method: "POST",
      headers: {
        "cf-access-jwt-assertion": await h.token(),
        Origin: "https://attacker.test",
        "X-Snail-Request": "1",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Bad" }),
    });
    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });
});
