import { mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { downloadVerified } from "../../connector/media";

it("checks real bytes and decodes a synthetic MP4, while refusing HTML and truncated containers", async () => {
  const dir = await mkdtemp(resolve(".artifacts/media-check-"));
  const meta = {
    mediaId: "2000000000000000002",
    mediaUrl: "https://video.twimg.com/amplify_video/2000000000000000002/vid/avc1/320x568/test.mp4",
  };
  try {
    const bytes = await readFile(".artifacts/media/synthetic.mp4");
    const fetcher =
      (body: Uint8Array, mime = "video/mp4"): typeof fetch =>
      async (_url, init) => {
        expect(new Headers(init?.headers).has("cookie")).toBe(false);
        expect(new Headers(init?.headers).has("authorization")).toBe(false);
        return new Response(new Uint8Array(body).buffer, {
          headers: { "Content-Type": mime, "Content-Length": String(body.length) },
        });
      };
    const result = await downloadVerified(meta, dir, undefined, fetcher(bytes));
    expect(result).toMatchObject({ size: bytes.length, mime: "video/mp4", decode: "ok" });
    expect(result.duration).toBeGreaterThan(0);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    await expect(
      downloadVerified(
        meta,
        dir,
        undefined,
        fetcher(new TextEncoder().encode("<!doctype html>fake video fake video")),
      ),
    ).rejects.toMatchObject({ code: "invalid_media" });
    await expect(
      downloadVerified(meta, dir, undefined, fetcher(bytes.subarray(0, 100))),
    ).rejects.toMatchObject({ code: "decode_failed" });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 30000);
