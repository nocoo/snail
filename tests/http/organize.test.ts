import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHarness } from "./harness";

describe("organize a private video library", () => {
  let h: Awaited<ReturnType<typeof createHarness>>;
  let assetId: string;
  beforeAll(async () => {
    h = await createHarness();
    const bytes = new Uint8Array(256);
    bytes.set([
      0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 2, 0, 105, 115, 111, 109, 109, 112,
      52, 49,
    ]);
    const created = (await (
      await h.request("/api/uploads", {
        method: "POST",
        body: JSON.stringify({
          title: "Harbor light",
          mime: "video/mp4",
          size: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          approved: true,
        }),
      })
    ).json()) as { id: string };
    await h.request(`/api/uploads/${created.id}/parts/1`, { method: "PUT", body: bytes });
    assetId = (
      (await (
        await h.request(`/api/uploads/${created.id}/complete`, { method: "POST" })
      ).json()) as { assetId: string }
    ).assetId;
  });
  afterAll(async () => {
    await h?.dispose();
  });
  it("edits title, category, tags and favorites; searches and sorts on the server", async () => {
    const category = (await (
      await h.request("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: "Travel" }),
      })
    ).json()) as { id: string };
    const tagResult = await h.request("/api/tags", {
      method: "POST",
      body: JSON.stringify({ name: "Inspiration" }),
    });
    expect(tagResult.status).toBe(201);
    const tag = (await tagResult.json()) as { id: string };
    expect(
      (
        await h.request(`/api/assets/${assetId}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: "Evening harbor",
            description: "Warm reflections",
            categoryId: category.id,
            tagIds: [tag.id],
            favorite: true,
          }),
        })
      ).status,
    ).toBe(200);
    const listed = (await (
      await h.request(
        `/api/assets?q=reflections&favorite=true&category=${category.id}&tag=${tag.id}&sort=title`,
      )
    ).json()) as {
      total: number;
      items: { id: string; title: string; favorite: boolean; tags: unknown[] }[];
    };
    expect(listed.total).toBe(1);
    expect(listed.items[0]).toMatchObject({ id: assetId, title: "Evening harbor", favorite: true });
    expect(listed.items[0].tags).toHaveLength(1);
    const none = (await (await h.request("/api/assets?q=%27%20OR%201%3D1--")).json()) as {
      total: number;
    };
    expect(none.total).toBe(0);
  });
  it("rejects foreign category/tag/asset IDs and applies bulk changes atomically", async () => {
    const foreign = (await (
      await h.request(
        "/api/tags",
        { method: "POST", body: JSON.stringify({ name: "Private" }) },
        "user-b",
      )
    ).json()) as { id: string };
    expect(
      (
        await h.request(`/api/assets/${assetId}`, {
          method: "PATCH",
          body: JSON.stringify({ tagIds: [foreign.id] }),
        })
      ).status,
    ).toBe(400);
    expect((await h.request(`/api/assets/${assetId}`, { method: "GET" }, "user-b")).status).toBe(
      404,
    );
    expect(
      (
        await h.request("/api/assets/bulk", {
          method: "POST",
          body: JSON.stringify({ ids: [assetId, crypto.randomUUID()], action: "unfavorite" }),
        })
      ).status,
    ).toBe(404);
    const stillFavorite = (await (await h.request(`/api/assets/${assetId}`)).json()) as {
      favorite: boolean;
    };
    expect(stillFavorite.favorite).toBe(true);
    expect(
      (
        await h.request("/api/assets/bulk", {
          method: "POST",
          body: JSON.stringify({ ids: [assetId], action: "unfavorite" }),
        })
      ).status,
    ).toBe(200);
    const unfavorite = (await (await h.request(`/api/assets/${assetId}`)).json()) as {
      favorite: boolean;
    };
    expect(unfavorite.favorite).toBe(false);
  });
  it("deletes metadata immediately and schedules unreferenced R2 objects for cleanup", async () => {
    expect((await h.request(`/api/assets/${assetId}`, { method: "DELETE" })).status).toBe(200);
    expect((await h.request(`/api/assets/${assetId}/media`)).status).toBe(404);
    const garbage = await h.db.prepare("SELECT object_key FROM garbage").all();
    expect(garbage.results.length).toBeGreaterThan(0);
  });
});
