import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import provenance from "../public/brand/provenance.json";

const sha256 = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");
const manifest = await readFile("public/brand/upstream-manifest.json");
assert.equal(provenance.brandVersion, "2.0.0");
assert.equal(provenance.sourceCommit, "a3e257311fec177cf2e2fd61bdb69dd13b68d408");
assert.equal(sha256(manifest), "e563c69e9dbcb1acb105fe0aa0bcfcd4692bbf548aa599d03e14a1a4053493f1");
assert.equal(provenance.manifestSha256, sha256(manifest));
const upstream = JSON.parse(manifest.toString()) as {
  files: { path: string; bytes: number; sha256: string }[];
};
for (const item of provenance.files) {
  const original = upstream.files.find((file) => file.path === `/brands/snail/v2.0.0/${item.file}`);
  assert.ok(original, item.file);
  const data = await readFile(item.target);
  assert.equal(data.length, original.bytes, item.file);
  assert.equal(sha256(data), original.sha256, item.file);
  assert.equal(item.sha256, original.sha256, item.file);
  assert.equal(item.bytes, original.bytes, item.file);
}
function checkPng(data: Buffer, size: number) {
  assert.equal(data.subarray(1, 4).toString(), "PNG");
  assert.equal(data.readUInt32BE(16), size);
  assert.equal(data.readUInt32BE(20), size);
  assert.equal(data[25], 6, "Transparent foreground must retain RGBA");
}
checkPng(await readFile("logo.png"), 2048);
for (const size of [48, 64, 128]) checkPng(await readFile(`public/brand/mark-${size}.png`), size);
const ico = await readFile("public/brand/favicon.ico");
assert.equal(ico.readUInt16LE(2), 1);
const sizes = Array.from({ length: ico.readUInt16LE(4) }, (_, i) => ico[6 + i * 16] || 256);
assert.deepEqual(sizes, [16, 32, 48, 64, 128, 256]);
for (const [index, size] of sizes.entries()) {
  const entry = 6 + index * 16;
  const offset = ico.readUInt32LE(entry + 12);
  const length = ico.readUInt32LE(entry + 8);
  checkPng(ico.subarray(offset, offset + length), size);
}
console.log(
  `Brand 2.0.0: ${provenance.files.length} immutable files, pinned manifest, native master and transparent PNG/ICO sizes verified.`,
);
