import assert from "node:assert/strict";
import { z } from "zod";

const evidenceSchema = z.strictObject({
  sha: z.string().regex(/^[a-f0-9]{40}$/),
  version: z.string(),
  checks: z.record(
    z.enum([
      "access_login",
      "browser_upload_play_organize",
      "multipart_resume_dedup_range",
      "connector_pairing_keychain_scopes",
      "approved_x_import_hash_range_decode",
      "device_revocation_late_write",
      "test_data_cleanup",
    ]),
    z.literal("pass"),
  ),
});

export function assertProductionAcceptance(input: unknown, sha: string, version: string) {
  const result = evidenceSchema.safeParse(input);
  assert.ok(result.success, "All authenticated production acceptance checks must pass");
  assert.equal(result.data.sha, sha, "Production acceptance must match the exact release SHA");
  assert.equal(
    result.data.version,
    version,
    "Production acceptance must match the release version",
  );
}
