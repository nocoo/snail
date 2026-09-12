import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { version } from "../package.json";
import { verifyDeployment } from "./verify-production";

const run = (command: string, args: string[]) =>
  execFileSync(command, args, { encoding: "utf8" }).trim();
assert.match(version, /^\d+\.\d+\.\d+$/);
assert.equal(run("git", ["status", "--porcelain"]), "", "Commit the release candidate first");
assert.equal(run("git", ["branch", "--show-current"]), "main");
const sha = run("git", ["rev-parse", "HEAD"]);
const remote = JSON.parse(run("gh", ["api", "repos/nocoo/snail/commits/main"])) as { sha: string };
assert.equal(remote.sha, sha, "Push the exact candidate to main first");
const proof: Record<string, number> = {};
for (const workflow of ["CI", "Release"]) {
  const runs = JSON.parse(
    run("gh", [
      "run",
      "list",
      "--repo",
      "nocoo/snail",
      "--workflow",
      workflow,
      "--commit",
      sha,
      "--limit",
      "10",
      "--json",
      "databaseId,conclusion,status,headSha",
    ]),
  ) as { databaseId: number; conclusion: string; status: string; headSha: string }[];
  const successful = runs.find(
    (r) => r.conclusion === "success" && r.status === "completed" && r.headSha === sha,
  );
  assert.ok(successful, `${workflow} must succeed at the exact candidate SHA`);
  proof[workflow] = successful.databaseId;
}
await verifyDeployment("https://snail.hexly.ai", version);
console.log(JSON.stringify({ tag: `v${version}`, sha, proof, ready: true }, null, 2));
