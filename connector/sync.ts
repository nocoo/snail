import { createHash } from "node:crypto";
import { open, readFile, rm } from "node:fs/promises";
import type { ApprovedImport } from "../worker/contracts";
import type { DeviceClient } from "./client";
import { ConnectorError, opaqueId } from "./core";
import { downloadVerified, makePoster } from "./media";

export async function importMedia(
  client: DeviceClient,
  input: ApprovedImport,
  directory: string,
  signal?: AbortSignal,
  relay = false,
  mediaFetch: typeof fetch = fetch,
) {
  const video = await downloadVerified(input, directory, signal, mediaFetch);
  let poster: string | null = null;
  try {
    let result: { assetId?: string; sha256?: string; size?: number; status?: string };
    if (relay) {
      result = await client.request("/imports", {
        body: input,
        idempotencyKey: `x:${input.sourceId}:${input.mediaId}:${opaqueId(JSON.stringify(input)).slice(0, 24)}`,
        signal,
      });
      if (result.sha256 && result.sha256 !== video.sha256)
        throw new ConnectorError("relay_hash_mismatch");
      if (result.size && result.size !== video.size)
        throw new ConnectorError("relay_size_mismatch");
    } else {
      const session = await client.request<{ id?: string; assetId?: string; partSize?: number }>(
        "/uploads",
        {
          body: {
            title: input.title,
            source: { id: input.sourceId, url: input.sourceUrl, mediaId: input.mediaId },
            job: input.job,
            size: video.size,
            mime: video.mime,
            sha256: video.sha256,
            duration: video.duration,
            width: video.width,
            height: video.height,
            approved: true,
          },
          signal,
        },
      );
      result = session;
      if (!session.assetId) {
        if (!session.id || !session.partSize || session.partSize > 8 * 1024 * 1024)
          throw new ConnectorError("invalid_upload_session");
        const status = await client.request<{ parts: { partNumber: number; sha256: string }[] }>(
          `/uploads/${session.id}`,
          { signal },
        );
        const parts = new Map(status.parts.map((part) => [part.partNumber, part.sha256]));
        const file = await open(video.path, "r");
        try {
          for (let offset = 0, part = 1; offset < video.size; offset += session.partSize, part++) {
            signal?.throwIfAborted();
            const bytes = new Uint8Array(Math.min(session.partSize, video.size - offset));
            const { bytesRead } = await file.read(bytes, 0, bytes.length, offset);
            if (bytesRead !== bytes.length) throw new ConnectorError("local_file_changed");
            const hash = createHash("sha256").update(bytes).digest("hex");
            if (parts.has(part)) {
              if (parts.get(part) !== hash) throw new ConnectorError("part_conflict");
              continue;
            }
            await client.request(`/uploads/${session.id}/parts/${part}`, {
              method: "PUT",
              raw: bytes,
              signal,
            });
          }
        } finally {
          await file.close();
        }
        for (let tries = 0; tries < 120; tries++) {
          result = await client.request(`/uploads/${session.id}/complete`, { body: {}, signal });
          if (result.assetId) break;
          await new Promise((r) => setTimeout(r, 1000));
          signal?.throwIfAborted();
        }
      }
    }
    if (!result.assetId) throw new ConnectorError("upload_pending");
    poster = await makePoster(video.path, signal);
    let posterSaved = false;
    if (poster)
      await client
        .request(`/assets/${result.assetId}/poster`, {
          method: "PUT",
          raw: new Uint8Array(await readFile(poster)),
          contentType: "image/jpeg",
          signal,
        })
        .then(() => {
          posterSaved = true;
        })
        .catch(() => {});
    return {
      assetId: result.assetId,
      size: video.size,
      sha256: video.sha256,
      mime: video.mime,
      decode: video.decode,
      poster: posterSaved ? "ready" : "unavailable",
      width: video.width,
      height: video.height,
      duration: video.duration,
      transfer: relay ? "relay" : "multipart",
    };
  } finally {
    await rm(video.path, { force: true });
    if (poster) await rm(poster, { force: true });
  }
}
