import { createHash } from "node:crypto";
import { type ApprovedImport, importSchema } from "../worker/contracts";
import { validateMediaUrl } from "../worker/media";

export class ConnectorError extends Error {
  constructor(
    public code: string,
    public status = 0,
  ) {
    super(code);
  }
}
export function canonicalOrigin(raw: string, localTest = false) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ConnectorError("invalid_origin");
  }
  const local =
    localTest &&
    ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
    url.protocol === "http:";
  if (
    (url.protocol !== "https:" && !local) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new ConnectorError("invalid_origin");
  return url.origin;
}
export const opaqueId = (value: string) => createHash("sha256").update(value).digest("hex");
export function mergeCheckpoint(previous: string[], processed: string[]) {
  return [...new Set([...previous, ...processed.map(opaqueId)])].slice(-50_000);
}
export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
const text = (value: unknown) => (typeof value === "string" ? value : "");

// A normalized post is derived from its own GraphQL entity, never from all DOM articles.
export function normalizeTweet(raw: unknown, targetId: string): ApprovedImport[] {
  const wrapped = record(raw),
    tw = record(wrapped.tweet ?? wrapped),
    legacy = record(tw.legacy);
  if (text(tw.rest_id) !== targetId || !/^\d{15,22}$/.test(targetId)) return [];
  const user = record(record(record(tw.core).user_results).result),
    userLegacy = record(user.legacy);
  if (
    userLegacy.protected === true ||
    record(user.privacy).protected === true ||
    tw.__typename === "TweetUnavailable"
  )
    return [];
  const screen = text(userLegacy.screen_name) || text(record(user.core).screen_name);
  if (!/^[a-zA-Z0-9_]{1,50}$/.test(screen)) return [];
  const note = record(record(tw.note_tweet).note_tweet_results).result;
  const description = (text(record(note).text) || text(legacy.full_text)).slice(0, 5000);
  const title = description.replace(/\s+/g, " ").slice(0, 160).trim() || "X 视频";
  const attachments = record(legacy.extended_entities).media;
  if (!Array.isArray(attachments)) return [];
  const result: ApprovedImport[] = [];
  for (const rawMedia of attachments.slice(0, 16)) {
    const media = record(rawMedia),
      mediaId = text(media.id_str);
    if (!["video", "animated_gif"].includes(text(media.type)) || !/^\d{15,22}$/.test(mediaId))
      continue;
    if (media.source_status_id_str && media.source_status_id_str !== targetId) continue;
    if (media.ext_media_availability && record(media.ext_media_availability).status !== "Available")
      continue;
    const info = record(media.video_info),
      variants = Array.isArray(info.variants) ? info.variants.map(record) : [];
    const mp4s = variants
      .filter((x) => x.content_type === "video/mp4" && typeof x.url === "string")
      .sort((a, b) => Number(b.bitrate ?? 0) - Number(a.bitrate ?? 0));
    let mediaUrl: string | undefined;
    for (const variant of mp4s) {
      try {
        mediaUrl = validateMediaUrl(text(variant.url), mediaId);
        break;
      } catch {}
    }
    if (!mediaUrl) continue;
    let posterUrl: string | undefined;
    try {
      posterUrl = validateMediaUrl(text(media.media_url_https), mediaId, true);
    } catch {}
    const dimensions = /\/(\d+)x(\d+)\//.exec(new URL(mediaUrl).pathname);
    const candidate = importSchema.safeParse({
      sourceId: targetId,
      sourceUrl: `https://x.com/${screen}/status/${targetId}`,
      title,
      description,
      mediaId,
      mediaUrl,
      posterUrl,
      ...(typeof info.duration_millis === "number" && info.duration_millis > 0
        ? { duration: info.duration_millis / 1000 }
        : {}),
      ...(dimensions ? { width: Number(dimensions[1]), height: Number(dimensions[2]) } : {}),
      approved: true,
    });
    if (candidate.success) result.push(candidate.data);
  }
  return result;
}

export function collectTweetEntities(payload: unknown) {
  const result = new Map<string, unknown>(),
    stack: unknown[] = [payload];
  let visited = 0;
  while (stack.length && visited++ < 50_000) {
    const value = stack.pop();
    if (Array.isArray(value)) {
      stack.push(...value);
      continue;
    }
    const obj = record(value);
    if (typeof obj.rest_id === "string" && record(obj.legacy).extended_entities)
      result.set(obj.rest_id, obj);
    stack.push(...Object.values(obj).filter((x) => x !== null && typeof x === "object"));
  }
  return result;
}
