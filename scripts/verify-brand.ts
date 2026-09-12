import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import provenance from "../public/brand/provenance.json";

const sha256 = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");
const manifest = await readFile("public/brand/upstream-manifest.json");
assert.equal(provenance.sourceCommit, "352eb2652d4e11c876ef84152fc8e02f8d5ed331");
assert.equal(sha256(manifest), "11b8203d41030ad5317b94fd8a2a19d7a7b1077f174410b89caea4fd0d082ec8");
const upstream = JSON.parse(manifest.toString()) as {
  files: { path: string; bytes: number; sha256: string }[];
};
for (const item of provenance.files) {
  const original = upstream.files.find((file) => file.path === `/brands/snail/v1.0.0/${item.file}`);
  assert.ok(original, item.file);
  const data = await readFile(`public/brand/${item.file}`);
  assert.equal(data.length, original.bytes, item.file);
  assert.equal(sha256(data), original.sha256, item.file);
  assert.equal(item.sha256, original.sha256, item.file);
}
assert.deepEqual(await readFile("logo.png"), await readFile("public/brand/logo-light.png"));
const ico = await readFile("public/brand/favicon.ico");
assert.equal(ico.readUInt16LE(2), 1);
const sizes = Array.from({ length: ico.readUInt16LE(4) }, (_, i) => ico[6 + i * 16] || 256);
assert.deepEqual(sizes, [16, 32, 48, 64, 128, 256]);
console.log(
  `Brand 1.0.0: ${provenance.files.length} immutable files, pinned manifest, root logo and ICO sizes verified.`,
);
