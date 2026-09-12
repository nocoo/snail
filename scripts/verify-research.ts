import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import baseline from "./research-baseline.json";

for (const [name, expected] of Object.entries(baseline)) {
  const actual = createHash("sha256")
    .update(await readFile(`docs/${name}`))
    .digest("hex");
  if (actual !== expected) throw new Error(`Research baseline changed: ${name}`);
}
process.stdout.write("All 11 original research documents match their SHA-256 baseline.\n");
