import { digest } from "./auth";
import { type ApprovedImport, MAX_VIDEO_BYTES } from "./contracts";
import { HttpError, json, readBytes } from "./http";
import { sniffPoster, validateMediaUrl } from "./media";
import { type Actor, activeDevice, hashObject, publishAsset } from "./uploads";

export async function fetchMedia(
  url: string,
  mediaId: string,
  signal: AbortSignal,
  poster = false,
) {
  let current = validateMediaUrl(url, mediaId, poster);
  for (let redirect = 0; redirect <= 2; redirect++) {
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
    if (prior.status === "ready")
      return json({ status: "ready", assetId: prior.asset_id, replay: true });
    if (prior.status === "fetching" && Date.now() - prior.updated_at < 180_000)
      return json({ status: "fetching" }, 202);
    await env.DB.prepare("DELETE FROM imports WHERE id=? AND updated_at=?")
      .bind(prior.id, prior.updated_at)
      .run();
  }
  const existing = await env.DB.prepare(
    "SELECT id FROM assets WHERE library_id=? AND source_id=? AND media_id=?",
  )
    .bind(actor.libraryId, input.sourceId, input.mediaId)
    .first<{ id: string }>();
  if (existing) return json({ status: "ready", assetId: existing.id, deduplicated: true });
  const id = crypto.randomUUID();
  const objectKey = `v1/libraries/${actor.libraryId}/media/${id}/video`;
  const now = Date.now();
  const inserted = await env.DB.prepare(
    "INSERT OR IGNORE INTO imports(id,library_id,device_id,idempotency_key,request_hash,status,created_at,updated_at) VALUES (?,?,?,?,?,'fetching',?,?)",
  )
    .bind(id, actor.libraryId, actor.deviceId, key, requestHash, now, now)
    .run();
  if (!inserted.meta.changes) return json({ status: "fetching" }, 202);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const { response, mime, size } = await fetchMedia(
      input.mediaUrl,
      input.mediaId,
      controller.signal,
    );
    const fixed = new FixedLengthStream(size);
    const put = env.MEDIA.put(objectKey, fixed.readable, { httpMetadata: { contentType: mime } });
    const pipe = response.body?.pipeTo(fixed.writable, { signal: controller.signal });
    const results = await Promise.allSettled([put, pipe]);
    if (results.some((result) => result.status === "rejected"))
      throw new HttpError(422, "media_transfer_failed");
    const sha256 = await hashObject(env, objectKey, size, mime);
    await activeDevice(env, actor);
    const result = await publishAsset(
      env,
      actor,
      {
        title: input.title,
        size,
        sha256,
        mime: "video/mp4",
        approved: true,
        source: { id: input.sourceId, url: input.sourceUrl, mediaId: input.mediaId },
        duration: input.duration,
        width: input.width,
        height: input.height,
      },
      objectKey,
    );
    await env.DB.prepare("UPDATE assets SET description=? WHERE id=? AND library_id=?")
      .bind(input.description ?? "", result.assetId, actor.libraryId)
      .run();
    let posterStatus = "none";
    if (input.posterUrl) {
      try {
        const poster = await fetchMedia(input.posterUrl, input.mediaId, controller.signal, true);
        const bytes = await readBytes(
          new Request("https://snail.invalid", { method: "POST", body: poster.response.body }),
          2 * 1024 * 1024,
        );
        sniffPoster(bytes, poster.mime);
        const posterKey = `v1/libraries/${actor.libraryId}/posters/${result.assetId}/${crypto.randomUUID()}`;
        await env.MEDIA.put(posterKey, bytes, { httpMetadata: { contentType: poster.mime } });
        await env.DB.prepare(
          "UPDATE assets SET poster_key=? WHERE id=? AND library_id=? AND poster_key IS NULL",
        )
          .bind(posterKey, result.assetId, actor.libraryId)
          .run();
        posterStatus = "ready";
      } catch {
        posterStatus = "unavailable";
      }
    }
    await env.DB.prepare("UPDATE imports SET status='ready',asset_id=?,updated_at=? WHERE id=?")
      .bind(result.assetId, Date.now(), id)
      .run();
    return json({ status: "ready", ...result, sha256, size, mime, posterStatus });
  } catch (error) {
    const code = error instanceof HttpError ? error.code : "media_transfer_failed";
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE imports SET status='failed',error_code=?,updated_at=? WHERE id=?",
      ).bind(code, Date.now(), id),
      env.DB.prepare("INSERT OR IGNORE INTO garbage(object_key,delete_after) VALUES (?,?)").bind(
        objectKey,
        Date.now() + 3600_000,
      ),
    ]);
    throw error instanceof HttpError ? error : new HttpError(422, code);
  } finally {
    clearTimeout(timeout);
  }
}
