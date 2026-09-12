import { randomBytes, randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { deleteCredential, readCredential, saveCredential } from "../../connector/state";

it.skipIf(process.platform !== "darwin")(
  "persists, rotates and removes a device credential in macOS Keychain without exposing it",
  async () => {
    const origin = `https://snail-keychain-test-${randomUUID()}.invalid`;
    const token = () => `snail_device_${randomBytes(32).toString("hex")}`;
    try {
      const first = token();
      await saveCredential(origin, first);
      expect((await readCredential(origin)) === first).toBe(true);
      const rotated = token();
      await saveCredential(origin, rotated);
      expect((await readCredential(origin)) === rotated).toBe(true);
      await deleteCredential(origin);
      await expect(readCredential(origin)).rejects.toMatchObject({ code: "keychain_unavailable" });
    } finally {
      await deleteCredential(origin).catch(() => {});
    }
  },
);
