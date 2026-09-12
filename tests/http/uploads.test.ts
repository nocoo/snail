import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHarness } from "./harness";

const header = new Uint8Array([
  0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 2, 0, 105, 115, 111, 109, 109, 112, 52,
  49,
]);
function testVideo(size = 1024) {
  const bytes = new Uint8Array(size);
  bytes.set(header);
  return bytes;
}
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

describe("multipart upload to private playback", () => {
  let h: Awaited<ReturnType<typeof createHarness>>;
  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h?.dispose();
  });
  const create = (bytes: Uint8Array, title = "My video", sha256 = hash(bytes)) =>
    h.request("/api/uploads", {
      method: "POST",
      body: JSON.stringify({
        title,
        size: bytes.length,
        mime: "video/mp4",
        sha256,
        approved: true,
      }),
    });
  it("accepts two parts, resumes without re-upload, publishes after hash verification and handles Range", async () => {
    const bytes = testVideo(8 * 1024 * 1024 + 1536);
    const created = await create(bytes);
    expect(created.status).toBe(201);
    const upload = (await created.json()) as { id: string; partSize: number };
    expect(upload.partSize).toBe(8 * 1024 * 1024);
    const part = await h.request(`/api/uploads/${upload.id}/parts/1`, {
      method: "PUT",
      body: bytes.slice(0, upload.partSize),
    });
    expect(part.status).toBe(200);
    const resumed = (await (await h.request(`/api/uploads/${upload.id}`)).json()) as {
      parts: unknown[];
    };
    expect(resumed.parts).toHaveLength(1);
    expect((await h.request(`/api/uploads/${upload.id}/complete`, { method: "POST" })).status).toBe(
      409,
    );
    expect(
      (
        await h.request(`/api/uploads/${upload.id}/parts/2`, {
          method: "PUT",
          body: bytes.slice(upload.partSize),
        })
      ).status,
    ).toBe(200);
    const completed = await h.request(`/api/uploads/${upload.id}/complete`, { method: "POST" });
    expect(completed.status).toBe(200);
    const result = (await completed.json()) as { assetId: string; status: string };
    expect(result.status).toBe("ready");
    const media = `/api/assets/${result.assetId}/media`;
    const partial = await h.request(media, { headers: { Range: "bytes=0-31" } });
    expect(partial.status).toBe(206);
    expect(partial.headers.get("content-type")).toBe("video/mp4");
    expect(partial.headers.get("content-range")).toBe(`bytes 0-31/${bytes.length}`);
    expect(new Uint8Array(await partial.arrayBuffer())).toEqual(bytes.slice(0, 32));
    const suffix = await h.request(media, { headers: { Range: "bytes=-10" } });
    expect(suffix.status).toBe(206);
    expect((await suffix.arrayBuffer()).byteLength).toBe(10);
    const invalid = await h.request(media, { headers: { Range: `bytes=${bytes.length}-` } });
    expect(invalid.status).toBe(416);
    expect(invalid.headers.get("content-range")).toBe(`bytes */${bytes.length}`);
    const head = await h.request(media, { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(head.headers.get("content-length")).toBe(String(bytes.length));
    expect((await head.arrayBuffer()).byteLength).toBe(0);
    expect((await h.request(media, {}, "user-b")).status).toBe(404);
    expect((await h.request(media, {}, "")).status).toBe(401);
    const duplicate = (await (await create(bytes)).json()) as {
      assetId: string;
      deduplicated: boolean;
    };
    expect(duplicate).toMatchObject({ assetId: result.assetId, deduplicated: true });
    expect((await h.request(`/api/uploads/${upload.id}/complete`, { method: "POST" })).status).toBe(
      200,
    );
    const full = await h.request(media);
    expect(hash(new Uint8Array(await full.arrayBuffer()))).toBe(hash(bytes));
  });

  it("rejects HTML masquerading as MP4, oversize declarations and hash mismatch", async () => {
    const fake = new TextEncoder().encode(
      "<!DOCTYPE html><html>not a video, even with mp4 extension</html>",
    );
    const upload = (await (await create(fake)).json()) as { id: string };
    expect(
      (await h.request(`/api/uploads/${upload.id}/parts/1`, { method: "PUT", body: fake })).status,
    ).toBe(415);
    const big = await h.request("/api/uploads", {
      method: "POST",
      body: JSON.stringify({
        title: "Huge",
        mime: "video/mp4",
        size: 513 * 1024 * 1024,
        sha256: "0".repeat(64),
        approved: true,
      }),
    });
    expect(big.status).toBe(400);
    const bytes = testVideo(2048);
    const wrong = (await (await create(bytes, "Mismatch", "0".repeat(64))).json()) as {
      id: string;
    };
    expect(
      (await h.request(`/api/uploads/${wrong.id}/parts/1`, { method: "PUT", body: bytes })).status,
    ).toBe(200);
    expect((await h.request(`/api/uploads/${wrong.id}/complete`, { method: "POST" })).status).toBe(
      422,
    );
    const status = (await (await h.request(`/api/uploads/${wrong.id}`)).json()) as {
      status: string;
    };
    expect(status.status).toBe("failed");
  });

  it("isolates/cancels uploads and refuses late parts", async () => {
    const bytes = testVideo(4096);
    const upload = (await (await create(bytes)).json()) as { id: string };
    expect((await h.request(`/api/uploads/${upload.id}`, {}, "user-b")).status).toBe(404);
    expect((await h.request(`/api/uploads/${upload.id}`, { method: "DELETE" })).status).toBe(200);
    expect(
      (await h.request(`/api/uploads/${upload.id}/parts/1`, { method: "PUT", body: bytes })).status,
    ).toBe(409);
  });
});
