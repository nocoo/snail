import { describe, expect, it } from "vitest";
import { retryTransient } from "../../src/lib/api";
import { calculateHash } from "../../src/lib/hash";

describe("resilient upload client", () => {
  it("hashes the file stream without trusting a filename and reports progress", async () => {
    const progress: number[] = [];
    const hash = await calculateHash(new File(["abc"], "renamed.mp4"), (value) =>
      progress.push(value),
    );
    expect(hash).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(progress.at(-1)).toBe(1);
  });
  it("honors abort before reading sensitive local bytes", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      calculateHash(new File(["secret"], "local.mp4"), () => {}, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
  it("retries transient transport failure but stops on permission errors", async () => {
    let calls = 0;
    const result = await retryTransient(
      async () => {
        if (++calls === 1) throw new TypeError("network");
        return "done";
      },
      undefined,
      async () => {},
    );
    expect(result).toBe("done");
    expect(calls).toBe(2);
    calls = 0;
    await expect(
      retryTransient(
        async () => {
          calls++;
          throw Object.assign(new Error("forbidden"), { status: 403 });
        },
        undefined,
        async () => {},
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(calls).toBe(1);
  });
});
