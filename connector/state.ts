import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { z } from "zod";
import { ConnectorError, opaqueId } from "./core";

const schema = z
  .object({
    origin: z.string().url(),
    deviceId: z.string().uuid(),
    expiresAt: z.number(),
    seen: z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(50_000),
    checkpoint: z.string().max(128),
  })
  .strict();
export type LocalState = z.infer<typeof schema>;
export const stateDirectory = resolve(process.env.SNAIL_STATE_DIR ?? ".connector");
const statePath = join(stateDirectory, "state.json");
export async function loadState() {
  try {
    return schema.parse(JSON.parse(await readFile(statePath, "utf8")));
  } catch {
    throw new ConnectorError("pairing_required");
  }
}
export async function saveState(state: LocalState) {
  await mkdir(stateDirectory, { recursive: true, mode: 0o700 });
  await chmod(stateDirectory, 0o700);
  const next = `${statePath}.${randomUUID()}.next`;
  await writeFile(next, JSON.stringify(schema.parse(state)), { mode: 0o600 });
  await rename(next, statePath);
}
export async function clearState() {
  await rm(statePath, { force: true });
}

// Keychain credentials are passed through stdin, never argv, env, logs or a repo file.
async function keychain(args: string[], input?: string): Promise<string> {
  if (process.platform !== "darwin") throw new ConnectorError("macos_keychain_required");
  return new Promise((resolveResult, reject) => {
    const child = spawn("/usr/bin/security", args, { stdio: ["pipe", "pipe", "pipe"] });
    const out: Buffer[] = [];
    let size = 0;
    child.stdout.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 16384) {
        child.kill();
        return;
      }
      out.push(chunk);
    });
    child.stderr.resume();
    child.on("error", () => reject(new ConnectorError("keychain_unavailable")));
    child.on("close", (code) => {
      const value = Buffer.concat(out).toString().trim();
      for (const b of out) b.fill(0);
      if (code === 0) resolveResult(value);
      else reject(new ConnectorError("keychain_unavailable"));
    });
    child.stdin.end(input);
  });
}
const account = (origin: string) => `snail-${opaqueId(origin).slice(0, 24)}`;
const service = "ai.hexly.snail.connector";
export async function saveCredential(origin: string, token: string) {
  if (!/^snail_device_[a-f0-9]{64}$/.test(token))
    throw new ConnectorError("invalid_device_credential");
  await keychain(
    ["-i"],
    `add-generic-password -U -a "${account(origin)}" -s "${service}" -w "${token}"\n`,
  );
  // security's interactive shell can exit zero after a command error; verify without printing.
  if ((await readCredential(origin)) !== token) throw new ConnectorError("keychain_write_failed");
}
export async function readCredential(origin: string) {
  const token = await keychain([
    "find-generic-password",
    "-a",
    account(origin),
    "-s",
    service,
    "-w",
  ]);
  if (!/^snail_device_[a-f0-9]{64}$/.test(token)) throw new ConnectorError("keychain_unavailable");
  return token;
}
export async function deleteCredential(origin: string) {
  await keychain(["delete-generic-password", "-a", account(origin), "-s", service]);
}
