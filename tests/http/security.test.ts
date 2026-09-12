import { createHash } from "node:crypto";
import { type Request as MfRequest, Response as MfResponse } from "miniflare";
import { afterEach, describe, expect, it } from "vitest";
import { createHarness, pairDevice } from "./harness";

const bytes = new Uint8Array(2048);
bytes.set([
  0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 2, 0, 105, 115, 111, 109, 109, 112, 52,
  49,
]);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const metadata = {
  sourceId: "2000000000000000001",
  sourceUrl: "https://x.com/snail_test/status/2000000000000000001",
  mediaId: "2000000000000000002",
  mediaUrl: "https://video.twimg.com/amplify_video/2000000000000000002/vid/avc1/320x568/test.mp4",
  title: "Synthetic relay",
  approved: true,
};
const input = {
  title: "Synthetic upload",
  size: bytes.length,
  mime: "video/mp4",
  sha256,
  approved: true,
};
const media = () =>
  new MfResponse(bytes, {
    headers: { "Content-Type": "video/mp4", "Content-Length": String(bytes.length) },
  });
const all: Awaited<ReturnType<typeof createHarness>>[] = [];
async function setup(upstream?: (r: MfRequest) => Promise<MfResponse> | MfResponse) {
  const h = await createHarness({ upstream });
  all.push(h);
  return h;
}
afterEach(async () => {
  await Promise.all(all.splice(0).map((h) => h.dispose()));
});

describe("media security and lifecycle regression", () => {
  it("relays verified bytes without X credentials; replays safely and rejects key reuse", async () => {
    let calls = 0;
    const h = await setup((r) => {
      calls++;
      expect(r.headers.has("cookie")).toBe(false);
      expect(r.headers.has("authorization")).toBe(false);
      return media();
    });
    const d = await pairDevice(h);
    const send = (body: unknown = metadata) =>
      d.request("/imports", body, "POST", { "Idempotency-Key": "test-relay-001" });
    const response = await send();
    expect(response.status, await response.clone().text()).toBe(200);
    const result = (await response.json()) as { assetId: string; sha256: string; size: number };
    expect(result).toMatchObject({ sha256, size: bytes.length });
    expect(
      createHash("sha256")
        .update(
          new Uint8Array(
            await (await h.request(`/api/assets/${result.assetId}/media`)).arrayBuffer(),
          ),
        )
        .digest("hex"),
    ).toBe(sha256);
    expect((await send()).status).toBe(200);
    expect(calls).toBe(1);
    expect((await send({ ...metadata, title: "different" })).status).toBe(409);
  });
  it("rejects fake HTML, cross-host redirects and unapproved/unknown fields with an audit", async () => {
    let mode = "html";
    const h = await setup(() =>
      mode === "redirect"
        ? new MfResponse(null, { status: 302, headers: { Location: "http://127.0.0.1/private" } })
        : new MfResponse("<!doctype html>not a video", {
            headers: { "Content-Type": "video/mp4", "Content-Length": "26" },
          }),
    );
    const d = await pairDevice(h);
    const send = (body: unknown = metadata, key = "test-bad-001") =>
      d.request("/imports", body, "POST", { "Idempotency-Key": key });
    expect((await send()).status).toBeGreaterThanOrEqual(400);
    mode = "redirect";
    expect((await send(metadata, "test-bad-002")).status).toBe(400);
    expect((await send({ ...metadata, cookies: "fake" })).status).toBe(400);
    const audit = await h.db
      .prepare("SELECT COUNT(*) AS n FROM audit WHERE action='protocol.rejected'")
      .first<{ n: number }>();
    expect(audit?.n).toBeGreaterThan(0);
    expect(await (await h.request("/api/assets")).json()).toMatchObject({ total: 0 });
  });
  it("reserves the same quota for relays and direct uploads", async () => {
    let calls = 0;
    const h = await setup(() => {
      calls++;
      return media();
    });
    const d = await pairDevice(h);
    const library = (await (await h.request("/api/me")).json()) as { libraryId: string };
    await h.db
      .prepare(
        "INSERT INTO blobs(id,library_id,object_key,sha256,size,mime,created_at) VALUES (?,?,?,?,?,'video/mp4',?)",
      )
      .bind(
        crypto.randomUUID(),
        library.libraryId,
        "synthetic/quota",
        "f".repeat(64),
        50 * 1024 * 1024 * 1024,
        Date.now(),
      )
      .run();
    expect(
      (await d.request("/imports", metadata, "POST", { "Idempotency-Key": "test-quota-001" }))
        .status,
    ).toBe(409);
    expect(calls).toBe(0);
  });
  it("revocation while a CDN request is pending prevents late publication and records cleanup", async () => {
    let reached!: () => void;
    const requested = new Promise<void>((r) => {
      reached = r;
    });
    let release!: (r: MfResponse) => void;
    const gate = new Promise<MfResponse>((r) => {
      release = r;
    });
    const h = await setup(() => {
      reached();
      return gate;
    });
    const d = await pairDevice(h);
    const pending = d.request("/imports", metadata, "POST", {
      "Idempotency-Key": "test-revoke-001",
    });
    await requested;
    expect((await h.request(`/api/devices/${d.deviceId}`, { method: "DELETE" })).status).toBe(200);
    release(media());
    expect((await pending).status).toBe(401);
    expect(await (await h.request("/api/assets")).json()).toMatchObject({ total: 0 });
    expect(
      (
        await h.db
          .prepare("SELECT COUNT(*) AS n FROM imports WHERE status='fetching'")
          .first<{ n: number }>()
      )?.n,
    ).toBe(0);
  });
  it("retries an interrupted part reservation and prevents concurrent different bytes from overwriting it", async () => {
    const h = await setup();
    const upload = (await (
      await h.request("/api/uploads", { method: "POST", body: JSON.stringify(input) })
    ).json()) as { id: string };
    await h.db
      .prepare(
        "INSERT INTO upload_parts(upload_id,part_number,etag,size,sha256) VALUES (?,1,'',?,?)",
      )
      .bind(upload.id, bytes.length, sha256)
      .run();
    const altered = bytes.slice();
    altered[64] = 2;
    const results = await Promise.all([
      h.request(`/api/uploads/${upload.id}/parts/1`, { method: "PUT", body: bytes }),
      h.request(`/api/uploads/${upload.id}/parts/1`, { method: "PUT", body: altered }),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 409]);
    const finish = await h.request(`/api/uploads/${upload.id}/complete`, { method: "POST" });
    expect(finish.status).toBe(200);
  });
  it("never resumes bytes under a different post or media identity", async () => {
    const h = await setup();
    const start = (sourceId: string) =>
      h.request("/api/uploads", {
        method: "POST",
        body: JSON.stringify({
          ...input,
          source: {
            id: sourceId,
            mediaId: "2000000000000000003",
            url: `https://x.com/i/status/${sourceId}`,
          },
        }),
      });
    const first = (await (await start("2000000000000000001")).json()) as { id: string };
    const second = (await (await start("2000000000000000002")).json()) as { id: string };
    expect(first.id).toBeDefined();
    expect(second.id).toBeDefined();
    expect(second.id).not.toBe(first.id);
    const resumed = (await (await start("2000000000000000001")).json()) as { id: string };
    expect(resumed.id).toBe(first.id);
  });
  it("deletion releases metadata immediately; scheduled cleanup deletes only unreferenced objects", async () => {
    const h = await setup();
    const { MEDIA: bucket } = await h.mf.getBindings<{
      MEDIA: {
        put(key: string, bytes: Uint8Array): Promise<unknown>;
        head(key: string): Promise<unknown>;
      };
    }>();
    const upload = (await (
      await h.request("/api/uploads", { method: "POST", body: JSON.stringify(input) })
    ).json()) as { id: string };
    await h.request(`/api/uploads/${upload.id}/parts/1`, { method: "PUT", body: bytes });
    const result = (await (
      await h.request(`/api/uploads/${upload.id}/complete`, { method: "POST" })
    ).json()) as { assetId: string };
    const blob = await h.db
      .prepare("SELECT object_key FROM blobs LIMIT 1")
      .first<{ object_key: string }>();
    if (!blob) throw new Error("Expected published synthetic blob");
    await h.db
      .prepare("INSERT INTO garbage(object_key,delete_after) VALUES (?,0)")
      .bind(blob.object_key)
      .run();
    await bucket.put("synthetic/orphan", bytes);
    await h.db
      .prepare("INSERT INTO garbage(object_key,delete_after) VALUES ('synthetic/orphan',0)")
      .run();
    expect((await h.mf.dispatchFetch("http://localhost/cdn-cgi/local/scheduled")).status).toBe(200);
    expect(await bucket.head("synthetic/orphan")).toBeNull();
    expect(await bucket.head(blob.object_key)).not.toBeNull();
    expect((await h.request(`/api/assets/${result.assetId}`, { method: "DELETE" })).status).toBe(
      200,
    );
    expect((await h.db.prepare("SELECT COUNT(*) AS n FROM blobs").first<{ n: number }>())?.n).toBe(
      0,
    );
    expect((await h.mf.dispatchFetch("http://localhost/cdn-cgi/local/scheduled")).status).toBe(200);
    expect(await bucket.head(blob.object_key)).toBeNull();
    const fresh = await h.request("/api/uploads", { method: "POST", body: JSON.stringify(input) });
    expect(fresh.status).toBe(201);
  });
});
