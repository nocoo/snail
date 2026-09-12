import { expect, it } from "vitest";
import { assertProductionAcceptance } from "../../scripts/production-acceptance";

it("blocks a release until authenticated production flows pass at the exact candidate", () => {
  const sha = "a".repeat(40);
  const report = {
    sha,
    version: "0.1.0",
    checks: {
      access_login: "pass",
      browser_upload_play_organize: "pass",
      multipart_resume_dedup_range: "pass",
      connector_pairing_keychain_scopes: "pass",
      approved_x_import_hash_range_decode: "pass",
      device_revocation_late_write: "pass",
      test_data_cleanup: "pass",
    },
  };
  expect(() => assertProductionAcceptance(report, sha, "0.1.0")).not.toThrow();
  expect(() => assertProductionAcceptance({ ...report, checks: {} }, sha, "0.1.0")).toThrow();
  expect(() =>
    assertProductionAcceptance(
      { ...report, checks: { ...report.checks, access_login: "pending" } },
      sha,
      "0.1.0",
    ),
  ).toThrow();
  expect(() => assertProductionAcceptance(report, "b".repeat(40), "0.1.0")).toThrow();
  expect(() => assertProductionAcceptance(report, sha, "0.2.0")).toThrow();
});
