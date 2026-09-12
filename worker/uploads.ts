import { digest } from "./auth";
import { MAX_VIDEO_BYTES, PART_BYTES, type UploadInput, uploadSchema } from "./contracts";
import { HttpError, json, readBytes, readJson } from "./http";
import { parseRange, sniffPoster, sniffVideo } from "./media";
import { audit } from "./store";

export interface Actor {
  libraryId: string;
  deviceId?: string;
}
interface UploadRow {
  id: string;
  library_id: string;
  device_id: string | null;
  object_key: string;
  multipart_id: string;
  input: string;
  size: number;
  sha256: string;
  mime: string;
  status: string;
  asset_id: string | null;
  expires_at: number;
  updated_at: number;
}
interface PartRow {
  part_number: number;
  etag: string;
  size: number;
  sha256: string;
}
const quota = 50 * 1024 * 1024 * 1024;

async function findUpload(env: Env, actor: Actor, id: string) {
  const row = await env.DB.prepare("SELECT * FROM uploads WHERE id=? AND library_id=?")
    .bind(id, actor.libraryId)
    .first<UploadRow>();
  if (!row || (actor.deviceId && row.device_id !== actor.deviceId))
    throw new HttpError(404, "upload_not_found");
  return row;
}

export async function activeDevice(env: Env, actor: Actor) {
  if (
    actor.deviceId &&
    !(await env.DB.prepare(
      "SELECT id FROM devices WHERE id=? AND library_id=? AND revoked_at IS NULL AND expires_at>?",
    )
      .bind(actor.deviceId, actor.libraryId, Date.now())
      .first())
  )
    throw new HttpError(401, "device_revoked");
}

export async function hashObject(
  env: Env,
  key: string,
  expectedSize: number,
  expectedMime: string,
): Promise<string> {
  const object = await env.MEDIA.get(key);
  if (!object || object.size !== expectedSize) throw new HttpError(422, "size_mismatch");
  const hash = new crypto.DigestStream("SHA-256");
  const reader = object.body.getReader();
  const writer = hash.getWriter();
  let bytes = 0;
  let first = new Uint8Array();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (first.length < 32) {
        const head = new Uint8Array(Math.min(32, first.length + value.length));
        head.set(first);
        head.set(value.subarray(0, head.length - first.length), first.length);
        first = head;
      }
      bytes += value.length;
      if (bytes > expectedSize || bytes > MAX_VIDEO_BYTES)
        throw new HttpError(413, "video_too_large");
      await writer.write(value);
    }
    sniffVideo(first, expectedMime);
    if (bytes !== expectedSize) throw new HttpError(422, "size_mismatch");
    await writer.close();
    return Array.from(new Uint8Array(await hash.digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  } catch (error) {
    await Promise.allSettled([reader.cancel(), writer.abort()]);
    void hash.digest.catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
    writer.releaseLock();
  }
}

export async function publishAsset(
  env: Env,
  actor: Actor,
  input: UploadInput,
  objectKey: string,
  uploadId?: string,
) {
  await activeDevice(env, actor);
  const now = Date.now();
  const blobId = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT OR IGNORE INTO blobs(id,library_id,object_key,sha256,size,mime,created_at) VALUES (?,?,?,?,?,?,?)",
  )
    .bind(blobId, actor.libraryId, objectKey, input.sha256, input.size, input.mime, now)
    .run();
  const blob = await env.DB.prepare(
    "SELECT id,object_key FROM blobs WHERE library_id=? AND sha256=? AND size=?",
  )
    .bind(actor.libraryId, input.sha256, input.size)
    .first<{ id: string; object_key: string }>();
  if (!blob) throw new HttpError(500, "publish_failed");
  if (blob.object_key !== objectKey)
    await env.DB.prepare("INSERT OR IGNORE INTO garbage(object_key,delete_after) VALUES (?,?)")
      .bind(objectKey, now)
      .run();
  let existing: { id: string } | null;
  if (input.source) {
    existing = await env.DB.prepare(
      "SELECT id FROM assets WHERE library_id=? AND source_id=? AND media_id=?",
    )
      .bind(actor.libraryId, input.source.id, input.source.mediaId)
      .first<{ id: string }>();
  } else {
    existing = await env.DB.prepare(
      "SELECT id FROM assets WHERE library_id=? AND blob_id=? ORDER BY created_at LIMIT 1",
    )
      .bind(actor.libraryId, blob.id)
      .first<{ id: string }>();
  }
  await activeDevice(env, actor);
  if (existing) return { assetId: existing.id, deduplicated: true };
  const id = crypto.randomUUID();
  const inserted =
    await env.DB.prepare(`INSERT OR IGNORE INTO assets(id,library_id,blob_id,title,source_id,source_url,media_id,duration,width,height,created_at,updated_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE (? IS NULL OR EXISTS(SELECT 1 FROM devices WHERE id=? AND library_id=? AND revoked_at IS NULL AND expires_at>?))
    AND (? IS NULL OR EXISTS(SELECT 1 FROM uploads WHERE id=? AND status='verifying'))`)
      .bind(
        id,
        actor.libraryId,
        blob.id,
        input.title,
        input.source?.id ?? null,
        input.source?.url ?? null,
        input.source?.mediaId ?? null,
        input.duration ?? null,
        input.width ?? null,
        input.height ?? null,
        now,
        now,
        actor.deviceId ?? null,
        actor.deviceId ?? null,
        actor.libraryId,
        now,
        uploadId ?? null,
        uploadId ?? null,
      )
      .run();
  if (inserted.meta.changes === 0) {
    await activeDevice(env, actor);
    if (input.source) {
      const other = await env.DB.prepare(
        "SELECT id FROM assets WHERE library_id=? AND source_id=? AND media_id=?",
      )
        .bind(actor.libraryId, input.source.id, input.source.mediaId)
        .first<{ id: string }>();
      if (other) return { assetId: other.id, deduplicated: true };
    }
    throw new HttpError(409, "publish_cancelled");
  }
  await audit(env, actor.libraryId, "asset.created", id, actor.deviceId);
  return { assetId: id, deduplicated: false };
}

export async function createUpload(request: Request, env: Env, actor: Actor) {
  const input = await readJson(request, uploadSchema);
  if (input.source && !input.source.url.endsWith(`/status/${input.source.id}`))
    throw new HttpError(400, "source_mismatch");
  await activeDevice(env, actor);
  const blob = await env.DB.prepare(
    "SELECT id,object_key FROM blobs WHERE library_id=? AND sha256=? AND size=?",
  )
    .bind(actor.libraryId, input.sha256, input.size)
    .first<{ id: string; object_key: string }>();
  if (blob)
    return json({ status: "ready", ...(await publishAsset(env, actor, input, blob.object_key)) });
  const resume = await env.DB.prepare(
    "SELECT id FROM uploads WHERE library_id=? AND sha256=? AND size=? AND status='uploading' AND expires_at>? AND device_id IS ? ORDER BY created_at DESC LIMIT 1",
  )
    .bind(actor.libraryId, input.sha256, input.size, Date.now(), actor.deviceId ?? null)
    .first<{ id: string }>();
  if (resume) return json({ id: resume.id, partSize: PART_BYTES, resumed: true }, 200);
  const id = crypto.randomUUID();
  const key = `v1/libraries/${actor.libraryId}/media/${id}/video`;
  const multipart = await env.MEDIA.createMultipartUpload(key, {
    httpMetadata: { contentType: input.mime },
    customMetadata: { library: actor.libraryId },
  });
  const now = Date.now();
  try {
    const result =
      await env.DB.prepare(`INSERT INTO uploads(id,library_id,device_id,object_key,multipart_id,input,size,sha256,mime,status,created_at,updated_at,expires_at)
      SELECT ?,?,?,?,?,?,?,?,?,'uploading',?,?,? WHERE
      (SELECT COUNT(*) FROM uploads WHERE library_id=? AND status IN ('uploading','completing','verifying') AND expires_at>?) < 5 AND
      COALESCE((SELECT SUM(size) FROM blobs WHERE library_id=?),0) + COALESCE((SELECT SUM(size) FROM uploads WHERE library_id=? AND status IN ('uploading','completing','verifying') AND expires_at>?),0) + ? <= ?`)
        .bind(
          id,
          actor.libraryId,
          actor.deviceId ?? null,
          key,
          multipart.uploadId,
          JSON.stringify(input),
          input.size,
          input.sha256,
          input.mime,
          now,
          now,
          now + 24 * 3600_000,
          actor.libraryId,
          now,
          actor.libraryId,
          actor.libraryId,
          now,
          input.size,
          quota,
        )
        .run();
    if (result.meta.changes === 0) throw new HttpError(409, "upload_quota_exceeded");
  } catch (error) {
    await multipart.abort();
    throw error;
  }
  return json({ id, partSize: PART_BYTES, resumed: false }, 201);
}

export async function uploadRoute(
  request: Request,
  env: Env,
  actor: Actor,
  id: string,
  action?: string,
  number?: string,
) {
  const row = await findUpload(env, actor, id);
  const multipart = env.MEDIA.resumeMultipartUpload(row.object_key, row.multipart_id);
  if (!action && request.method === "GET") {
    const parts = (
      await env.DB.prepare(
        "SELECT part_number AS partNumber,size,sha256 FROM upload_parts WHERE upload_id=? ORDER BY part_number",
      )
        .bind(id)
        .all()
    ).results;
    return json({
      id,
      status: row.status,
      assetId: row.asset_id,
      partSize: PART_BYTES,
      size: row.size,
      expiresAt: row.expires_at,
      parts,
    });
  }
  if (!action && request.method === "DELETE") {
    if (row.status === "ready") throw new HttpError(409, "already_published");
    await env.DB.prepare("UPDATE uploads SET status='cancelled',updated_at=? WHERE id=?")
      .bind(Date.now(), id)
      .run();
    await multipart.abort().catch(() => {});
    await env.DB.prepare("INSERT OR IGNORE INTO garbage(object_key,delete_after) VALUES (?,?)")
      .bind(row.object_key, Date.now())
      .run();
    return json({ status: "cancelled" });
  }
  if (action === "complete" && request.method === "POST" && row.status === "ready")
    return json({ status: "ready", assetId: row.asset_id });
  if (row.expires_at <= Date.now()) throw new HttpError(410, "upload_expired");
  if (action === "parts" && request.method === "PUT") {
    if (row.status !== "uploading") throw new HttpError(409, "upload_not_writable");
    const part = Number(number);
    if (!Number.isInteger(part) || part < 1 || part > Math.ceil(row.size / PART_BYTES))
      throw new HttpError(400, "invalid_part");
    const expected = Math.min(PART_BYTES, row.size - (part - 1) * PART_BYTES);
    const bytes = await readBytes(request, expected);
    if (bytes.length !== expected) throw new HttpError(422, "part_size_mismatch");
    if (part === 1) sniffVideo(bytes, row.mime);
    const sha256 = await digest(bytes);
    const previous = await env.DB.prepare(
      "SELECT sha256 FROM upload_parts WHERE upload_id=? AND part_number=?",
    )
      .bind(id, part)
      .first<{ sha256: string }>();
    if (previous && previous.sha256 !== sha256) throw new HttpError(409, "part_conflict");
    if (previous) return json({ partNumber: part, sha256, reused: true });
    await activeDevice(env, actor);
    const stored = await multipart.uploadPart(part, bytes);
    const inserted = await env.DB.prepare(
      "INSERT INTO upload_parts(upload_id,part_number,etag,size,sha256) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM uploads WHERE id=? AND status='uploading') ON CONFLICT(upload_id,part_number) DO NOTHING",
    )
      .bind(id, part, stored.etag, expected, sha256, id)
      .run();
    if (!inserted.meta.changes) throw new HttpError(409, "upload_not_writable");
    await env.DB.prepare("UPDATE uploads SET updated_at=? WHERE id=?").bind(Date.now(), id).run();
    return json({ partNumber: part, sha256 });
  }
  if (action === "complete" && request.method === "POST") {
    if (!["uploading", "verifying", "completing"].includes(row.status))
      throw new HttpError(409, "upload_not_writable");
    const parts = (
      await env.DB.prepare("SELECT * FROM upload_parts WHERE upload_id=? ORDER BY part_number")
        .bind(id)
        .all<PartRow>()
    ).results;
    if (
      parts.length !== Math.ceil(row.size / PART_BYTES) ||
      parts.reduce((n, p) => n + p.size, 0) !== row.size
    )
      throw new HttpError(409, "parts_missing");
    if (row.status === "completing" && Date.now() - row.updated_at < 60_000)
      return json({ status: "completing" }, 202);
    try {
      if (row.status === "uploading") {
        const lock = await env.DB.prepare(
          "UPDATE uploads SET status='completing',updated_at=? WHERE id=? AND status='uploading'",
        )
          .bind(Date.now(), id)
          .run();
        if (!lock.meta.changes) return json({ status: "completing" }, 202);
        await multipart.complete(
          parts.map((part) => ({ partNumber: part.part_number, etag: part.etag })),
        );
      } else if (row.status === "completing" && !(await env.MEDIA.head(row.object_key))) {
        await multipart.complete(
          parts.map((part) => ({ partNumber: part.part_number, etag: part.etag })),
        );
      }
      await env.DB.prepare(
        "UPDATE uploads SET status='verifying',updated_at=? WHERE id=? AND status IN ('completing','verifying')",
      )
        .bind(Date.now(), id)
        .run();
      const sha256 = await hashObject(env, row.object_key, row.size, row.mime);
      if (sha256 !== row.sha256) throw new HttpError(422, "hash_mismatch");
      const result = await publishAsset(
        env,
        actor,
        uploadSchema.parse(JSON.parse(row.input)),
        row.object_key,
        id,
      );
      await env.DB.prepare(
        "UPDATE uploads SET status='ready',asset_id=?,updated_at=? WHERE id=? AND status='verifying'",
      )
        .bind(result.assetId, Date.now(), id)
        .run();
      return json({ status: "ready", ...result });
    } catch (error) {
      const code = error instanceof HttpError ? error.code : "upload_failed";
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE uploads SET status='failed',error_code=?,updated_at=? WHERE id=? AND status!='cancelled'",
        ).bind(code, Date.now(), id),
        env.DB.prepare("INSERT OR IGNORE INTO garbage(object_key,delete_after) VALUES (?,?)").bind(
          row.object_key,
          Date.now() + 3600_000,
        ),
      ]);
      throw error;
    }
  }
  throw new HttpError(405, "method_not_allowed");
}

export async function serveMedia(
  request: Request,
  env: Env,
  actor: Actor,
  id: string,
  poster = false,
) {
  const asset = await env.DB.prepare(
    "SELECT a.poster_key,b.object_key,b.mime,b.size FROM assets a JOIN blobs b ON b.id=a.blob_id WHERE a.id=? AND a.library_id=?",
  )
    .bind(id, actor.libraryId)
    .first<{ poster_key: string | null; object_key: string; mime: string; size: number }>();
  if (!asset || (poster && !asset.poster_key)) throw new HttpError(404, "asset_not_found");
  const key = poster ? (asset.poster_key as string) : asset.object_key;
  const head = await env.MEDIA.head(key);
  if (!head) throw new HttpError(404, "media_not_found");
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Content-Type": head.httpMetadata?.contentType ?? asset.mime,
    ETag: head.httpEtag,
    "Cache-Control": "private, no-store",
    "Content-Disposition": "inline",
  });
  let range: ReturnType<typeof parseRange> = null;
  if (
    request.method === "GET" &&
    (!request.headers.has("if-range") || request.headers.get("if-range") === head.httpEtag)
  ) {
    try {
      range = parseRange(request.headers.get("range"), head.size);
    } catch {
      headers.set("Content-Range", `bytes */${head.size}`);
      return new Response(null, { status: 416, headers });
    }
  }
  headers.set("Content-Length", String(range?.length ?? head.size));
  if (range)
    headers.set(
      "Content-Range",
      `bytes ${range.offset}-${range.offset + range.length - 1}/${head.size}`,
    );
  if (request.method === "HEAD") return new Response(null, { status: 200, headers });
  const object = await env.MEDIA.get(key, range ? { range } : undefined);
  if (!object) throw new HttpError(404, "media_not_found");
  return new Response(object.body, { status: range ? 206 : 200, headers });
}

export async function savePoster(request: Request, env: Env, actor: Actor, id: string) {
  const asset = await env.DB.prepare("SELECT poster_key FROM assets WHERE id=? AND library_id=?")
    .bind(id, actor.libraryId)
    .first<{ poster_key: string | null }>();
  if (!asset) throw new HttpError(404, "asset_not_found");
  const mime = request.headers.get("content-type")?.split(";")[0] ?? "";
  const bytes = await readBytes(request, 2 * 1024 * 1024);
  sniffPoster(bytes, mime);
  const key = `v1/libraries/${actor.libraryId}/posters/${id}/${crypto.randomUUID()}`;
  await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: mime } });
  await activeDevice(env, actor);
  await env.DB.prepare("UPDATE assets SET poster_key=?,updated_at=? WHERE id=? AND library_id=?")
    .bind(key, Date.now(), id, actor.libraryId)
    .run();
  if (asset.poster_key)
    await env.DB.prepare("INSERT OR IGNORE INTO garbage(object_key,delete_after) VALUES (?,?)")
      .bind(asset.poster_key, Date.now())
      .run();
  return json({ saved: true });
}
