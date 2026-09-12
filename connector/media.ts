import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { assertPublicMediaDns } from "../shared/media-dns";
import { MAX_VIDEO_BYTES } from "../worker/contracts";
import { sniffVideo, validateMediaUrl } from "../worker/media";
import { ConnectorError, record } from "./core";

const execute = promisify(execFile);
export async function downloadVerified(
  metadata: { mediaUrl: string; mediaId: string },
  directory: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  let url = validateMediaUrl(metadata.mediaUrl, metadata.mediaId);
  const timeout = AbortSignal.timeout(120_000),
    bounded = signal ? AbortSignal.any([signal, timeout]) : timeout;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const path = join(directory, `${randomUUID()}.mp4`),
    partial = `${path}.partial`;
  let file: Awaited<ReturnType<typeof open>> | undefined;
  try {
    let response: Response | undefined;
    for (let redirects = 0; redirects <= 2; redirects++) {
      if (fetcher === fetch) {
        await assertPublicMediaDns(new URL(url).hostname, bounded);
      }
      response = await fetcher(url, {
        redirect: "manual",
        headers: { Accept: "video/mp4" },
        signal: bounded,
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get("location");
        if (!location || redirects === 2) throw new ConnectorError("unsafe_redirect");
        url = validateMediaUrl(new URL(location, url).href, metadata.mediaId);
        continue;
      }
      break;
    }
    const mime = response?.headers.get("content-type")?.split(";")[0].trim(),
      declared = response?.headers.get("content-length") ?? "",
      size = Number(declared);
    if (
      response?.status !== 200 ||
      !response.body ||
      mime !== "video/mp4" ||
      !/^\d+$/.test(declared) ||
      !Number.isSafeInteger(size) ||
      size < 24 ||
      size > MAX_VIDEO_BYTES
    ) {
      await response?.body?.cancel();
      throw new ConnectorError("invalid_media");
    }
    file = await open(partial, "wx", 0o600);
    const reader = response.body.getReader(),
      hash = createHash("sha256");
    let count = 0,
      head = new Uint8Array();
    try {
      for (;;) {
        bounded.throwIfAborted();
        const { value, done } = await reader.read();
        if (done) break;
        count += value.length;
        if (count > size) throw new ConnectorError("size_mismatch");
        if (head.length < 32) {
          const next = new Uint8Array(Math.min(32, head.length + value.length));
          next.set(head);
          next.set(value.subarray(0, next.length - head.length), head.length);
          head = next;
        }
        hash.update(value);
        await file.writeFile(value);
      }
      if (count !== size) throw new ConnectorError("size_mismatch");
      try {
        sniffVideo(head, mime);
      } catch {
        throw new ConnectorError("invalid_media");
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    await file.close();
    file = undefined;
    await rename(partial, path);
    let probe: Record<string, unknown>;
    try {
      const result = await execute(
        "ffprobe",
        [
          "-v",
          "error",
          "-show_entries",
          "format=duration:stream=codec_type,codec_name,width,height",
          "-of",
          "json",
          path,
        ],
        { timeout: 120_000, maxBuffer: 1_048_576, signal: bounded },
      );
      probe = record(JSON.parse(result.stdout));
      await execute(
        "ffmpeg",
        [
          "-nostdin",
          "-hide_banner",
          "-v",
          "error",
          "-xerror",
          "-i",
          path,
          "-map",
          "0:v:0",
          "-map",
          "0:a?",
          "-f",
          "null",
          "-",
        ],
        { timeout: 120_000, maxBuffer: 1_048_576, signal: bounded },
      );
    } catch {
      throw new ConnectorError("decode_failed");
    }
    const streams = Array.isArray(probe.streams) ? probe.streams.map(record) : [],
      video = streams.find((x) => x.codec_type === "video"),
      duration = Number(record(probe.format).duration);
    if (!video || !Number.isFinite(duration) || duration <= 0)
      throw new ConnectorError("decode_failed");
    return {
      path,
      size,
      sha256: hash.digest("hex"),
      mime: "video/mp4" as const,
      duration,
      width: Number(video.width),
      height: Number(video.height),
      codec: String(video.codec_name),
      decode: "ok" as const,
      httpStatus: 200,
    };
  } catch (error) {
    await file?.close().catch(() => {});
    await Promise.all([rm(partial, { force: true }), rm(path, { force: true })]);
    throw error instanceof ConnectorError
      ? error
      : new ConnectorError(signal?.aborted ? "interrupted" : "download_failed");
  }
}

export async function makePoster(path: string, signal?: AbortSignal) {
  const poster = `${path}.jpg`;
  try {
    await execute(
      "ffmpeg",
      [
        "-nostdin",
        "-hide_banner",
        "-v",
        "error",
        "-y",
        "-ss",
        "0",
        "-i",
        path,
        "-frames:v",
        "1",
        "-vf",
        "scale=640:-2",
        "-q:v",
        "3",
        poster,
      ],
      { timeout: 30_000, maxBuffer: 1_048_576, signal },
    );
    return poster;
  } catch {
    return null;
  }
}
