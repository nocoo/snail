import type { UploadProgress, UploadSession } from "../../shared/types";
import { api, retryTransient } from "./api";

function hashInWorker(file: File, progress: (value: number) => void, signal: AbortSignal) {
  return new Promise<string>((resolve, reject) => {
    const worker = new Worker(new URL("./hash-worker.ts", import.meta.url), { type: "module" });
    const stop = () => {
      worker.terminate();
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      stop();
      reject(new DOMException("Paused", "AbortError"));
    };
    signal.addEventListener("abort", abort, { once: true });
    worker.onmessage = (event) => {
      if (typeof event.data.progress === "number") progress(event.data.progress);
      if (event.data.hash) {
        stop();
        resolve(event.data.hash);
      }
      if (event.data.error) {
        stop();
        reject(new Error("无法校验文件。"));
      }
    };
    worker.onerror = () => {
      stop();
      reject(new Error("无法校验文件。"));
    };
    worker.postMessage(file);
    if (signal.aborted) abort();
  });
}

export function videoMetadata(
  file: File,
): Promise<{ duration?: number; width?: number; height?: number; poster?: Blob }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const metadata: { duration?: number; width?: number; height?: number; poster?: Blob } = {};
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(metadata);
    };
    const timer = setTimeout(finish, 12_000);
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) metadata.duration = video.duration;
      if (video.videoWidth && video.videoHeight) {
        metadata.width = video.videoWidth;
        metadata.height = video.videoHeight;
      }
      video.currentTime = Math.min(1, (video.duration || 1) / 3);
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(1, 640 / (video.videoWidth || 640));
      canvas.width = Math.max(1, Math.round(video.videoWidth * ratio));
      canvas.height = Math.max(1, Math.round(video.videoHeight * ratio));
      try {
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob) metadata.poster = blob;
            finish();
          },
          "image/jpeg",
          0.82,
        );
      } catch {
        finish();
      }
    };
    video.onerror = finish;
    video.src = url;
  });
}

export async function uploadFile(
  file: File,
  id: string,
  update: (progress: UploadProgress) => void,
  signal: AbortSignal,
) {
  const report = (phase: UploadProgress["phase"], percent: number, error?: string) =>
    update({ id, file, name: file.name, phase, percent, error });
  let percent = 0;
  try {
    if (file.size < 24 || file.size > 512 * 1024 * 1024)
      throw new Error("每个视频需为 24 字节至 512 MiB。");
    const mime =
      file.type ||
      (/\.webm$/i.test(file.name)
        ? "video/webm"
        : /\.mov$/i.test(file.name)
          ? "video/quicktime"
          : "video/mp4");
    if (!["video/mp4", "video/webm", "video/quicktime"].includes(mime))
      throw new Error("支持 MP4、WebM 和 MOV 视频。");
    report("hashing", 0);
    const sha256 = await hashInWorker(
      file,
      (value) => {
        percent = value * 10;
        report("hashing", percent);
      },
      signal,
    );
    const metadata = await videoMetadata(file);
    signal.throwIfAborted();
    const { poster, ...details } = metadata;
    const session = await retryTransient(
      () =>
        api<UploadSession>("/api/uploads", {
          method: "POST",
          body: {
            title: file.name.replace(/\.[^.]+$/, ""),
            size: file.size,
            mime,
            sha256,
            approved: true,
            ...details,
          },
          signal,
        }),
      signal,
    );
    let assetId = session.assetId;
    if (!assetId) {
      if (!session.id || !session.partSize) throw new Error("上传会话未能建立。");
      const partSize = session.partSize;
      const state = await api<{ parts: { partNumber: number; size: number }[] }>(
        `/api/uploads/${session.id}`,
        { signal },
      );
      const done = new Set(state.parts.map((part) => part.partNumber));
      let uploaded = state.parts.reduce((n, part) => n + part.size, 0);
      for (let start = 0, part = 1; start < file.size; start += partSize, part++) {
        signal.throwIfAborted();
        if (done.has(part)) continue;
        const slice = file.slice(start, start + partSize);
        await retryTransient(
          () =>
            api(`/api/uploads/${session.id}/parts/${part}`, { method: "PUT", raw: slice, signal }),
          signal,
        );
        uploaded += slice.size;
        percent = 10 + (uploaded / file.size) * 80;
        report("uploading", percent);
      }
      report("verifying", 95);
      for (let attempt = 0; attempt < 120; attempt++) {
        signal.throwIfAborted();
        const result = await retryTransient(
          () =>
            api<UploadSession>(`/api/uploads/${session.id}/complete`, { method: "POST", signal }),
          signal,
        );
        if (result.assetId) {
          assetId = result.assetId;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      if (!assetId) throw new Error("视频仍在校验中，请稍后刷新。");
    }
    if (poster)
      await retryTransient(
        () => api(`/api/assets/${assetId}/poster`, { method: "PUT", raw: poster, signal }),
        signal,
      ).catch(() => {});
    report("ready", 100);
    return assetId;
  } catch (error) {
    report(
      signal.aborted ? "paused" : "failed",
      percent,
      error instanceof Error ? error.message : "上传失败，请重试。",
    );
    return null;
  }
}
