import { digest } from "./auth";
import { type ApprovedImport, MAX_VIDEO_BYTES } from "./contracts";
import { HttpError, json, readBytes } from "./http";
import { validateMediaUrl } from "./media";
import {
  type Actor,
  activeDevice,
  hashObject,
  LIBRARY_QUOTA,
  publicationGuard,
  publishAsset,
  savePoster,
} from "./uploads";

export async function fetchMedia(
  url: string,
  mediaId: string,
  signal: AbortSignal,
  poster = false,
) {
  let current = validateMediaUrl(url, mediaId, poster);
  for (let redirect = 0; redirect <= 2; redirect++) {
    await assertPublicMediaDns(new URL(current).hostname, signal);
    const response = await fetch(current, {
      method: "GET",
      redirect: "manual",
      signal,
      headers: { Accept: poster ? "image/webp,image/jpeg,image/png" : "video/mp4" },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location || redirect === 2) throw new HttpError(422, "redirect_rejected");
      current = validateMediaUrl(new URL(location, current).href, mediaId, poster);
      continue;
    }
    if (response.status !== 200 || !response.body) {
      await response.body?.cancel();
      throw new HttpError(422, "media_unavailable");
    }
    const mime = response.headers.get("content-type")?.split(";")[0].trim() ?? "";
    const allowed = poster ? ["image/jpeg", "image/png", "image/webp"] : ["video/mp4"];
    const rawSize = response.headers.get("content-length") ?? "";
    const size = Number(rawSize);
    if (
      !allowed.includes(mime) ||
      !/^\d+$/.test(rawSize) ||
      !Number.isSafeInteger(size) ||
      size <= 0 ||
      size > (poster ? 2 * 1024 * 1024 : MAX_VIDEO_BYTES)
    ) {
      await response.body.cancel();
      throw new HttpError(422, "invalid_media_response");
    }
    return { response, mime, size };
  }
  throw new HttpError(422, "redirect_rejected");
}

export async function relayImport(request: Request, env: Env, actor: Actor, input: ApprovedImport) {
  validateMediaUrl(input.mediaUrl, input.mediaId);
  if (input.posterUrl) validateMediaUrl(input.posterUrl, input.mediaId, true);
  const key = request.headers.get("idempotency-key");
  if (!key || !/^[a-zA-Z0-9_.:-]{8,128}$/.test(key))
    throw new HttpError(400, "idempotency_key_required");
  const requestHash = await digest(JSON.stringify(input));
  const prior = await env.DB.prepare(
    "SELECT * FROM imports WHERE library_id=? AND device_id=? AND idempotency_key=?",
  )
    .bind(actor.libraryId, actor.deviceId, key)
    .first<{
      id: string;
      request_hash: string;
      status: string;
      asset_id: string | null;
      updated_at: number;
    }>();
  if (prior) {
    if (prior.request_hash !== requestHash) throw new HttpError(409, "idempotency_conflict");
    if (prior.status === "ready") {
      const exists = await env.DB.prepare("SELECT id FROM assets WHERE id=? AND library_id=?")
        .bind(prior.asset_id, actor.libraryId)
        .first();
      if (!exists) throw new HttpError(410, "import_deleted");
      return json({ status: "ready", assetId: prior.asset_id, replay: true });
    }
    if (prior.status === "fetching") return json({ status: "fetching" }, 202);
  }
  const id = prior?.id ?? crypto.randomUUID(),
    now = Date.now();
  const objectKey = `v1/libraries/${actor.libraryId}/media/${crypto.randomUUID()}/video`;
  const source = { id: input.sourceId, url: input.sourceUrl, mediaId: input.mediaId };
  const guard = publicationGuard(actor, { source, job: input.job }, now);
  const quotaSql = `(SELECT COUNT(*) FROM uploads WHERE library_id=? AND status IN ('uploading','completing','verifying') AND expires_at>?) + (SELECT COUNT(*) FROM imports WHERE library_id=? AND status='fetching') < 5 AND
    COALESCE((SELECT SUM(size) FROM blobs WHERE library_id=?),0)+COALESCE((SELECT SUM(size) FROM uploads WHERE library_id=? AND status IN ('uploading','completing','verifying') AND expires_at>?),0)+COALESCE((SELECT SUM(size) FROM imports WHERE library_id=? AND status='fetching'),0)+?<=?`;
  const quotaValues = [
    actor.libraryId,
    now,
    actor.libraryId,
    actor.libraryId,
    actor.libraryId,
    now,
    actor.libraryId,
    MAX_VIDEO_BYTES,
    LIBRARY_QUOTA,
  ];
  const inserted = prior
    ? await env.DB.prepare(
        `UPDATE imports SET status='fetching',error_code=NULL,object_key=?,size=?,updated_at=? WHERE id=? AND status='failed' AND updated_at=? AND ${guard.sql} AND ${quotaSql}`,
      )
        .bind(
          objectKey,
          MAX_VIDEO_BYTES,
          now,
          id,
          prior.updated_at,
          ...guard.values,
          ...quotaValues,
        )
        .run()
    : await env.DB.prepare(
        `INSERT OR IGNORE INTO imports(id,library_id,device_id,idempotency_key,request_hash,status,object_key,size,job_id,lease_id,created_at,updated_at) SELECT ?,?,?,?,?,'fetching',?,?,?,?,?,? WHERE ${guard.sql} AND ${quotaSql}`,
      )
        .bind(
          id,
          actor.libraryId,
          actor.deviceId,
          key,
          requestHash,
          objectKey,
          MAX_VIDEO_BYTES,
          input.job?.id ?? null,
          input.job?.leaseId ?? null,
          now,
          now,
          ...guard.values,
          ...quotaValues,
        )
        .run();
  if (!inserted.meta.changes) throw new HttpError(409, "import_busy_or_quota");
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const { response, mime, size } = await fetchMedia(
      input.mediaUrl,
      input.mediaId,
      controller.signal,
    );
    await activeDevice(env, actor);
    const reservation = await env.DB.prepare(
      "UPDATE imports SET size=? WHERE id=? AND status='fetching' AND object_key=?",
    )
      .bind(size, id, objectKey)
      .run();
    if (!reservation.meta.changes) {
      await response.body?.cancel();
      throw new HttpError(409, "import_cancelled");
    }
    const fixed = new FixedLengthStream(size);
    const put = env.MEDIA.put(objectKey, fixed.readable, { httpMetadata: { contentType: mime } });
    const pipe = response.body?.pipeTo(fixed.writable, { signal: controller.signal });
    const results = await Promise.allSettled([put, pipe]);
    if (results.some((r) => r.status === "rejected"))
      throw new HttpError(422, "media_transfer_failed");
    const sha256 = await hashObject(env, objectKey, size, mime);
    const result = await publishAsset(
      env,
      actor,
      {
        title: input.title,
        size,
        sha256,
        mime: "video/mp4",
        approved: true,
        source,
        job: input.job,
        duration: input.duration,
        width: input.width,
        height: input.height,
      },
      objectKey,
      { importId: id },
    );
    if (!result.deduplicated && input.description) {
      const writeGuard = publicationGuard(actor, { source, job: input.job });
      await env.DB.prepare(
        `UPDATE assets SET description=? WHERE id=? AND library_id=? AND ${writeGuard.sql}`,
      )
        .bind(input.description, result.assetId, actor.libraryId, ...writeGuard.values)
        .run();
    }
    let posterStatus = "none";
    if (input.posterUrl && !result.deduplicated) {
      try {
        const poster = await fetchMedia(input.posterUrl, input.mediaId, controller.signal, true);
        const bytes = await readBytes(
          new Request("https://snail.invalid", { method: "POST", body: poster.response.body }),
          2 * 1024 * 1024,
        );
        if (bytes.length !== poster.size) throw new HttpError(422, "size_mismatch");
        await savePoster(
          new Request("https://snail.invalid", {
            method: "PUT",
            body: bytes,
            headers: { "Content-Type": poster.mime },
          }),
          env,
          actor,
          result.assetId,
        );
        posterStatus = "ready";
      } catch {
        posterStatus = "unavailable";
      }
    }
    return json({ status: "ready", ...result, sha256, size, mime, posterStatus });
  } catch (error) {
    controller.abort();
    const code = error instanceof HttpError ? error.code : "media_transfer_failed";
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE imports SET status='failed',error_code=?,updated_at=? WHERE id=? AND object_key=? AND status!='ready'",
      ).bind(code, Date.now(), id, objectKey),
      env.DB.prepare("INSERT OR IGNORE INTO garbage(object_key,delete_after) VALUES (?,?)").bind(
        objectKey,
        Date.now() + 300_000,
      ),
    ]);
    throw error instanceof HttpError ? error : new HttpError(422, code);
  } finally {
    clearTimeout(timeout);
  }
}

import { assertPublicMediaDns } from "../shared/media-dns";
