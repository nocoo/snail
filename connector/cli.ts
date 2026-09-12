#!/usr/bin/env bun
import { execFile } from "node:child_process";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { version } from "../package.json";
import { canonicalPost } from "../shared/source";
import { readBytes } from "../worker/http";
import { DeviceClient } from "./client";
import { ConnectorError, canonicalOrigin, mergeCheckpoint, opaqueId, record } from "./core";
import { readBookmarks } from "./opencli";
import {
  clearState,
  deleteCredential,
  type LocalState,
  loadState,
  readCredential,
  saveCredential,
  saveState,
  stateDirectory,
} from "./state";
import { importMedia } from "./sync";

const { positionals, values } = parseArgs({
  args: process.argv.slice(2).filter((x) => x !== "--"),
  allowPositionals: true,
  options: {
    "approve-rights": { type: "boolean" },
    relay: { type: "boolean" },
    limit: { type: "string", default: "120" },
    "local-test": { type: "boolean" },
    "read-library": { type: "boolean" },
    help: { type: "boolean" },
  },
});
const [command, arg] = positionals,
  limit = Number(values.limit),
  abort = new AbortController();
process.on("SIGINT", () => abort.abort());
process.on("SIGTERM", () => abort.abort());
const output = (event: string, fields: Record<string, unknown> = {}) =>
  process.stdout.write(`${JSON.stringify({ event, ...fields })}\n`);
const wait = (ms: number) =>
  new Promise<void>((resolveWait) => {
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      abort.signal.removeEventListener("abort", done);
      resolveWait();
    }
    abort.signal.addEventListener("abort", done, { once: true });
    if (abort.signal.aborted) done();
  });

async function publicRequest(origin: string, path: string, body: unknown) {
  const r = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    redirect: "manual",
    signal: AbortSignal.any([abort.signal, AbortSignal.timeout(20_000)]),
  });
  if (r.status >= 300 && r.status < 400) throw new ConnectorError("access_misconfigured");
  if (!r.headers.get("content-type")?.includes("application/json"))
    throw new ConnectorError("invalid_server_response");
  const raw = new TextDecoder().decode(await readBytes(r, 16384));
  const data = record(JSON.parse(raw));
  if (!r.ok) {
    const code = record(data.error).code;
    throw new ConnectorError(
      typeof code === "string" && /^[a-z_]{1,80}$/.test(code) ? code : "server_error",
      r.status,
    );
  }
  return data;
}
async function pair(originInput: string) {
  const origin = canonicalOrigin(originInput, values["local-test"] === true);
  const scopes = ["media:write", "jobs:read", ...(values["read-library"] ? ["library:read"] : [])];
  const data = await publicRequest(origin, "/api/connector-pairings", {
    name: "Snail local connector",
    scopes,
  });
  if (
    typeof data.deviceCode !== "string" ||
    !/^snail_pair_[a-f0-9]{64}$/.test(data.deviceCode) ||
    typeof data.userCode !== "string" ||
    !/^\w{4}-\w{4}$/.test(data.userCode)
  )
    throw new ConnectorError("invalid_pairing_response");
  const uri = `${origin}/connect?code=${data.userCode}`;
  output("pairing_pending", {
    verificationUri: uri,
    userCode: data.userCode,
    expiresIn: 600,
    scopes,
  });
  if (process.platform === "darwin") execFile("open", [uri], () => {});
  const deadline = Date.now() + 600_000;
  while (Date.now() < deadline && !abort.signal.aborted) {
    await wait(5000);
    if (abort.signal.aborted) break;
    try {
      const exchanged = await publicRequest(origin, "/api/connector-pairings/exchange", {
        deviceCode: data.deviceCode,
      });
      if (
        typeof exchanged.token !== "string" ||
        typeof exchanged.deviceId !== "string" ||
        typeof exchanged.expiresAt !== "number"
      )
        throw new ConnectorError("invalid_pairing_response");
      try {
        await saveCredential(origin, exchanged.token);
        await saveState({
          origin,
          deviceId: exchanged.deviceId,
          expiresAt: exchanged.expiresAt,
          seen: [],
          checkpoint: "v1.empty",
        });
      } catch (error) {
        await new DeviceClient(origin, exchanged.token, fetch, values["local-test"] === true)
          .request("/revoke", { body: {} })
          .catch(() => {});
        throw error;
      }
      output("paired", {
        deviceId: exchanged.deviceId,
        expiresAt: exchanged.expiresAt,
        credentialStorage: "macOS Keychain",
      });
      return;
    } catch (error) {
      if (error instanceof ConnectorError && error.code === "approval_pending") continue;
      if (error instanceof ConnectorError && error.status === 429) {
        await wait(60000);
        continue;
      }
      throw error;
    }
  }
  throw new ConnectorError("pairing_expired");
}
async function connected() {
  const state = await loadState();
  const client = new DeviceClient(
    state.origin,
    await readCredential(state.origin),
    fetch,
    values["local-test"] === true,
  );
  if (state.expiresAt < Date.now()) throw new ConnectorError("pairing_expired");
  if (state.expiresAt - Date.now() < 86400_000) {
    const renewed = await client.rotate();
    await saveCredential(state.origin, renewed.token);
    state.expiresAt = renewed.expiresAt;
    await saveState(state);
  }
  return { state, client };
}
async function synchronize(
  client: DeviceClient,
  state: LocalState,
  sourceId?: string,
  job?: { id: string; leaseId: string },
) {
  if (!values["approve-rights"] && !job) throw new ConnectorError("rights_required");
  const snapshot = await readBookmarks(limit, sourceId, abort.signal);
  if (sourceId && !snapshot.media.length) throw new ConnectorError("media_unavailable");
  const media = snapshot.media.filter(
    (item) => job || sourceId || !state.seen.includes(opaqueId(`${item.sourceId}:${item.mediaId}`)),
  );
  const processed: string[] = [];
  let assetId: string | undefined;
  for (const item of media) {
    abort.signal.throwIfAborted();
    const result = await importMedia(
      client,
      { ...item, job: job ? { id: job.id, leaseId: job.leaseId } : undefined },
      join(stateDirectory, "tmp"),
      abort.signal,
      values.relay === true,
    );
    assetId ??= result.assetId;
    processed.push(`${item.sourceId}:${item.mediaId}`);
    state.seen = mergeCheckpoint(state.seen, processed);
    state.checkpoint = `v1.${opaqueId(state.seen.join(":"))}`;
    await saveState(state);
    output("media_saved", result);
  }
  output("sync_complete", {
    observedPosts: snapshot.posts,
    saved: processed.length,
    windowFull: snapshot.windowFull,
    pagination: snapshot.pages,
    checkpoint: state.checkpoint,
  });
  if (snapshot.windowFull && !sourceId)
    output("bounded_window", {
      limit,
      maximum: 500,
      message: "仅检查最近的书签窗口。需要追溯历史时提高 --limit；原始 X 游标不会上传。",
    });
  return assetId;
}
async function watch(client: DeviceClient, state: LocalState) {
  output("watching", {
    mode: "approved_jobs",
    bookmarkSync: values["approve-rights"] === true,
    intervalSeconds: 120,
  });
  let lastSync = 0;
  while (!abort.signal.aborted) {
    try {
      await client.request("/heartbeat", {
        body: { checkpoint: state.checkpoint, state: "idle", version },
      });
      const { job } = await client.request<{
        job: null | { id: string; leaseId: string; sourceId: string };
      }>("/jobs/claim", { body: {} });
      if (job) {
        let leaseLost = false;
        const lease = setInterval(() => {
          void client
            .request(`/jobs/${job.id}/heartbeat`, { body: { leaseId: job.leaseId } })
            .catch(() => {
              leaseLost = true;
            });
        }, 30_000);
        try {
          const assetId = await synchronize(client, state, job.sourceId, job);
          if (leaseLost || !assetId) throw new ConnectorError("job_lease_lost");
          await client.request(`/jobs/${job.id}/complete`, {
            body: { leaseId: job.leaseId, assetId },
          });
        } catch (error) {
          const code = error instanceof ConnectorError ? error.code : "connector_error";
          await client
            .request(`/jobs/${job.id}/fail`, {
              body: {
                leaseId: job.leaseId,
                errorCode: [
                  "needs_login",
                  "media_unavailable",
                  "invalid_media",
                  "download_failed",
                  "decode_failed",
                  "rights_required",
                ].includes(code)
                  ? code
                  : "connector_error",
              },
            })
            .catch(() => {});
          output("job_failed", { code });
        } finally {
          clearInterval(lease);
        }
      } else if (values["approve-rights"] && Date.now() - lastSync > 120_000) {
        await synchronize(client, state);
        lastSync = Date.now();
      }
      await wait(20_000);
    } catch (error) {
      const code = error instanceof ConnectorError ? error.code : "connector_error";
      output("connector_waiting", { code });
      if (["device_revoked", "pairing_expired"].includes(code)) throw error;
      await wait(code === "needs_login" ? 120_000 : 60000);
    }
  }
  await client
    .request("/heartbeat", { body: { state: "offline", checkpoint: state.checkpoint, version } })
    .catch(() => {});
}

try {
  if (values.help || !command) {
    process.stdout.write(
      `Snail Connector ${version}\n\nbun run connector -- pair https://snail.hexly.ai\nbun run connector -- preview [X_URL] --limit 120\nbun run connector -- import X_URL --approve-rights [--relay]\nbun run connector -- sync --approve-rights --limit 120\nbun run connector -- watch\nbun run connector -- status | rotate | revoke\n\n默认 watch 只处理网页中已获准的任务。--approve-rights 才允许同步书签窗口。\n设备 token 仅存 macOS Keychain；X 会话只由本机 OpenCLI 复用。\n`,
    );
  } else if (command === "pair") await pair(arg ?? "https://snail.hexly.ai");
  else if (command === "preview") {
    const sourceId = arg ? canonicalPost(arg).id : undefined;
    const snapshot = await readBookmarks(limit, sourceId, abort.signal);
    output("preview", {
      posts: snapshot.posts,
      videos: snapshot.media.length,
      pages: snapshot.pages,
      windowFull: snapshot.windowFull,
      targetFound: sourceId ? !!snapshot.media.length : undefined,
    });
  } else {
    const { state, client } = await connected();
    if (command === "status") {
      await client.request("/heartbeat", {
        body: { state: "idle", checkpoint: state.checkpoint, version },
      });
      output("connected", { deviceId: state.deviceId, expiresAt: state.expiresAt, version });
    } else if (command === "rotate") {
      const result = await client.rotate();
      await saveCredential(state.origin, result.token);
      state.expiresAt = result.expiresAt;
      await saveState(state);
      output("rotated", { expiresAt: state.expiresAt });
    } else if (command === "revoke") {
      await client.request("/revoke", { body: {} });
      await deleteCredential(state.origin);
      await clearState();
      output("revoked");
    } else if (command === "import") {
      if (!arg) throw new ConnectorError("source_required");
      await synchronize(client, state, canonicalPost(arg).id);
    } else if (command === "sync") await synchronize(client, state);
    else if (command === "watch") await watch(client, state);
    else throw new ConnectorError("unknown_command");
  }
} catch (error) {
  output("error", {
    code:
      error instanceof ConnectorError
        ? error.code
        : abort.signal.aborted
          ? "interrupted"
          : "connector_error",
  });
  process.exitCode = 1;
}
