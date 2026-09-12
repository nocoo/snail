import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { DeviceClient } from "../../connector/client";
import { importMedia } from "../../connector/sync";
import { createHarness, pairDevice } from "./harness";

it("decodes and imports a synthetic source through the device protocol, with poster, Range and dedup", async () => {
  const h = await createHarness();
  const dir = await mkdtemp(resolve(".artifacts/sync-check-"));
  try {
    const device = await pairDevice(h);
    const bytes = await readFile(".artifacts/media/synthetic.mp4");
    const mediaFetch: typeof fetch = async (_url, init) => {
      expect(new Headers(init?.headers).has("cookie")).toBe(false);
      expect(new Headers(init?.headers).has("authorization")).toBe(false);
      return new Response(bytes, {
        headers: { "Content-Type": "video/mp4", "Content-Length": String(bytes.length) },
      });
    };
    const client = new DeviceClient("https://snail.test", device.token, async (input, init) => {
      const request = new Request(input, init);
      const response = await h.request(
        new URL(request.url).pathname,
        {
          method: request.method,
          headers: request.headers,
          body: request.body ? new Uint8Array(await request.arrayBuffer()) : undefined,
        },
        "",
      );
      return new Response(await response.arrayBuffer(), {
        status: response.status,
        headers: response.headers,
      });
    });
    const input = {
      sourceId: "2000000000000000001",
      mediaId: "2000000000000000002",
      sourceUrl: "https://x.com/i/status/2000000000000000001",
      mediaUrl:
        "https://video.twimg.com/amplify_video/2000000000000000002/vid/avc1/320x568/test.mp4",
      title: "Synthetic connector import",
      approved: true as const,
    };
    const result = await importMedia(client, input, dir, undefined, false, mediaFetch);
    expect(result).toMatchObject({
      size: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      decode: "ok",
      poster: "ready",
    });
    const poster = await h.request(`/api/assets/${result.assetId}/poster`);
    expect(poster.status).toBe(200);
    expect(poster.headers.get("content-type")).toBe("image/jpeg");
    const range = await h.request(`/api/assets/${result.assetId}/media`, {
      headers: { Range: "bytes=0-31" },
    });
    expect(range.status).toBe(206);
    expect(new Uint8Array(await range.arrayBuffer())).toEqual(
      new Uint8Array(bytes.subarray(0, 32)),
    );
    const duplicate = await importMedia(client, input, dir, undefined, false, mediaFetch);
    expect(duplicate.assetId).toBe(result.assetId);
    expect(await readdir(dir)).toEqual([]);
    await client.request("/revoke", { body: {} });
    await expect(
      importMedia(client, input, dir, undefined, false, mediaFetch),
    ).rejects.toMatchObject({ code: "device_revoked" });
    expect(await readdir(dir)).toEqual([]);
  } finally {
    await h.dispose();
    await rm(dir, { recursive: true, force: true });
  }
}, 30000);
