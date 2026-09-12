import { sha256 } from "@noble/hashes/sha2.js";

export async function calculateHash(
  file: Blob,
  progress: (fraction: number) => void,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const hash = sha256.create();
  const reader = file.stream().getReader();
  let bytes = 0;
  try {
    for (;;) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      hash.update(value);
      bytes += value.length;
      progress(file.size ? bytes / file.size : 1);
    }
    return Array.from(hash.digest(), (b) => b.toString(16).padStart(2, "0")).join("");
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}
