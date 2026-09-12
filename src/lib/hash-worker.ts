import { calculateHash } from "./hash";

self.onmessage = async (event: MessageEvent<File>) => {
  try {
    let last = 0;
    const hash = await calculateHash(event.data, (value) => {
      if (performance.now() - last > 100 || value === 1) {
        self.postMessage({ progress: value });
        last = performance.now();
      }
    });
    self.postMessage({ hash });
  } catch {
    self.postMessage({ error: "hash_failed" });
  }
};
