import { HttpError } from "./http";

export function sniffVideo(bytes: Uint8Array, mime: string): string {
  if (bytes.length < 24) throw new HttpError(415, "invalid_video_signature");
  const text = new TextDecoder("ascii").decode(bytes.slice(4, 12));
  const box = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
  if (
    text.startsWith("ftyp") &&
    box >= 16 &&
    box <= 4096 &&
    /^(isom|iso[2-9]|mp4[12]|avc1|M4V |qt {2}|MSNV|dash)/.test(text.slice(4))
  ) {
    if (["video/mp4", "video/quicktime"].includes(mime)) return mime;
  }
  if (
    mime === "video/webm" &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  )
    return mime;
  throw new HttpError(415, "invalid_video_signature");
}

export function sniffPoster(bytes: Uint8Array, mime: string) {
  const text = new TextDecoder("ascii");
  if (mime === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return mime;
  if (
    mime === "image/png" &&
    bytes.length > 24 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)
  )
    return mime;
  if (
    mime === "image/webp" &&
    text.decode(bytes.slice(0, 4)) === "RIFF" &&
    text.decode(bytes.slice(8, 12)) === "WEBP"
  )
    return mime;
  throw new HttpError(415, "invalid_poster_signature");
}

export function parseRange(
  header: string | null,
  size: number,
): { offset: number; length: number } | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || size === 0) throw new HttpError(416, "invalid_range");
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) throw new HttpError(416, "invalid_range");
    const length = Math.min(size, suffix);
    return { offset: size - length, length };
  }
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start)
    throw new HttpError(416, "invalid_range");
  return { offset: start, length: Math.min(end, size - 1) - start + 1 };
}

export function validateMediaUrl(input: string, mediaId: string, poster = false): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new HttpError(400, "unsafe_media_url");
  }
  if (
    url.protocol !== "https:" ||
    (url.port && url.port !== "443") ||
    url.username ||
    url.password ||
    url.hash ||
    !/^\d{15,22}$/.test(mediaId)
  )
    throw new HttpError(400, "unsafe_media_url");
  const correctHost = poster
    ? url.hostname === "pbs.twimg.com"
    : url.hostname === "video.twimg.com";
  const path = poster
    ? new RegExp(
        `^/(amplify_video_thumb|ext_tw_video_thumb)/${mediaId}/(img|pu/img)/[A-Za-z0-9_-]+(?:\\.(jpg|png|webp))?$`,
      )
    : new RegExp(
        `^/(amplify_video|ext_tw_video)/${mediaId}/(?:pu/)?vid/(?:avc1/)?[0-9]+x[0-9]+/[A-Za-z0-9_-]+\\.mp4$`,
      );
  const queries = poster ? ["format", "name"] : ["tag"];
  if (
    !correctHost ||
    !path.test(url.pathname) ||
    [...url.searchParams.keys()].some((key) => !queries.includes(key))
  )
    throw new HttpError(400, "unsafe_media_url");
  return url.href;
}
