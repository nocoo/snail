import { execFile, fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import type { ApprovedImport } from "../worker/contracts";
import { ConnectorError, collectTweetEntities, normalizeTweet, record } from "./core";

export interface BookmarkSnapshot {
  media: ApprovedImport[];
  posts: number;
  pages: { status: number; hasCursor: boolean }[];
  windowFull: boolean;
}
interface Page {
  goto(url: string, opts: { waitUntil: "none" }): Promise<unknown>;
  evaluate(code: string): Promise<unknown>;
  closeWindow(): Promise<void>;
}
interface Bridge {
  connect(opts: Record<string, unknown>): Promise<Page>;
  close(): Promise<void>;
}
interface Adapter {
  access: string;
  func(page: Page, args: Record<string, unknown>): Promise<unknown>;
}

// Isolate the upstream adapter: its stdout/stderr and raw authenticated responses never leave this process.
async function readInChild(limit: number, sourceId?: string): Promise<BookmarkSnapshot> {
  const root =
    process.env.SNAIL_OPENCLI_ROOT ??
    join(
      (await promisify(execFile)("npm", ["root", "-g"], { maxBuffer: 4096 })).stdout.trim(),
      "@jackwener/opencli",
    );
  const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as {
    version: string;
  };
  if (manifest.version !== "1.8.6") throw new ConnectorError("unsupported_opencli_version");
  const { BrowserBridge } = (await import(
    pathToFileURL(join(root, "dist/src/browser/bridge.js")).href
  )) as { BrowserBridge: new () => Bridge };
  const { getRegistry } = (await import(
    pathToFileURL(join(root, "dist/src/registry.js")).href
  )) as { getRegistry: () => Map<string, Adapter> };
  await import(pathToFileURL(join(root, "clis/twitter/bookmarks.js")).href);
  if (sourceId) await import(pathToFileURL(join(root, "clis/twitter/thread.js")).href);
  const bridge = new BrowserBridge();
  let page: Page | undefined;
  const entities = new Map<string, unknown>(),
    pages: BookmarkSnapshot["pages"] = [];
  const marker = "return r.ok ? await r.json() : { error: r.status };";
  const capture =
    "const body=r.ok?await r.json():{error:r.status};return {__snailResponse:true,status:r.status,body};";
  try {
    page = await bridge.connect({
      session: `snail-connector-${randomUUID()}`,
      windowMode: "background",
      siteSession: "ephemeral",
    });
    await page.goto("https://x.com/i/bookmarks", { waitUntil: "none" });
    await new Promise((r) => setTimeout(r, 1200));
    const proxy = new Proxy(page, {
      get(target, key) {
        if (key === "goto") return (url: string) => target.goto(url, { waitUntil: "none" });
        if (key === "evaluate")
          return async (code: string) => {
            if (code.includes("placeholder.json")) {
              const id = await target.evaluate(code);
              return typeof id === "string" && /^[a-zA-Z0-9_-]{10,80}$/.test(id) ? id : null;
            }
            if (code.includes(marker)) {
              const envelope = record(await target.evaluate(code.replace(marker, capture)));
              if (envelope.__snailResponse !== true)
                throw new ConnectorError("adapter_contract_changed");
              const body = envelope.body,
                status = Number(envelope.status);
              const instructions = record(
                record(record(record(body).data).bookmark_timeline_v2).timeline,
              ).instructions;
              const serialized = JSON.stringify(instructions ?? []);
              pages.push({
                status,
                hasCursor:
                  serialized.includes("cursor-bottom") ||
                  serialized.includes('"cursorType":"Bottom"'),
              });
              if (status !== 200)
                throw new ConnectorError(
                  [401, 403, 429].includes(status) ? "needs_login" : "bookmark_read_failed",
                );
              for (const [id, tw] of collectTweetEntities(body)) entities.set(id, tw);
              return body;
            }
            const value = await target.evaluate(code);
            if (code.includes("TweetDetail")) {
              for (const [id, tw] of collectTweetEntities(value)) entities.set(id, tw);
              // The single-link fallback needs the focal entity, not five pages of unrelated replies.
              const data = record(record(value).data),
                timeline = record(data.threaded_conversation_with_injections_v2);
              if (Array.isArray(timeline.instructions))
                for (const instruction of timeline.instructions) {
                  const entry = record(instruction);
                  if (Array.isArray(entry.entries))
                    entry.entries = entry.entries.filter(
                      (e) =>
                        !String(record(e).entryId ?? "").startsWith("cursor-") &&
                        !record(record(e).content).cursorType,
                    );
                }
            }
            return value;
          };
        const value = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const adapter = getRegistry().get("twitter/bookmarks");
    if (adapter?.access !== "read") throw new ConnectorError("adapter_contract_changed");
    const raw = await adapter.func(proxy, { limit });
    if (!Array.isArray(raw)) throw new ConnectorError("adapter_contract_changed");
    const selected = new Set(raw.map((row) => String(record(row).id ?? "")));
    if (sourceId && !selected.has(sourceId)) {
      const thread = getRegistry().get("twitter/thread");
      if (thread?.access !== "read") throw new ConnectorError("adapter_contract_changed");
      await thread.func(proxy, { "tweet-id": sourceId, limit: 1 });
      selected.clear();
      selected.add(sourceId);
    }
    const media = [...selected]
      .filter((id) => !sourceId || id === sourceId)
      .flatMap((id) => normalizeTweet(entities.get(id), id));
    return { media, posts: raw.length, pages, windowFull: raw.length >= limit };
  } catch (error) {
    throw error instanceof ConnectorError ? error : new ConnectorError("needs_login");
  } finally {
    if (page) await page.closeWindow().catch(() => {});
    await bridge.close().catch(() => {});
  }
}

export function readBookmarks(
  limit = 120,
  sourceId?: string,
  signal?: AbortSignal,
): Promise<BookmarkSnapshot> {
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 500 ||
    (sourceId && !/^\d{15,22}$/.test(sourceId))
  )
    throw new ConnectorError("invalid_bookmark_limit");
  return new Promise((resolveResult, reject) => {
    const child = fork(
      fileURLToPath(import.meta.url),
      ["--isolated", String(limit), sourceId ?? ""],
      { stdio: ["ignore", "ignore", "ignore", "ipc"] },
    );
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      child.kill("SIGTERM");
      finish();
      reject(new ConnectorError("interrupted"));
    };
    const timer = setTimeout(abort, 120_000);
    signal?.addEventListener("abort", abort, { once: true });
    child.once("message", (message: unknown) => {
      finish();
      const value = record(message);
      if (value.ok === true) resolveResult(value.snapshot as BookmarkSnapshot);
      else
        reject(new ConnectorError(typeof value.code === "string" ? value.code : "connector_error"));
    });
    child.once("error", () => {
      finish();
      reject(new ConnectorError("opencli_unavailable"));
    });
    child.once("close", () => {
      finish();
      // A clean exit without an IPC reply is still a failure, not an endless pending read.
      reject(new ConnectorError("opencli_unavailable"));
    });
    if (signal?.aborted) abort();
  });
}
if (
  process.argv[2] === "--isolated" &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  let message: { ok: true; snapshot: BookmarkSnapshot } | { ok: false; code: string };
  try {
    const snapshot = await readInChild(Number(process.argv[3]), process.argv[4] || undefined);
    message = { ok: true, snapshot };
  } catch (error) {
    message = {
      ok: false,
      code: error instanceof ConnectorError ? error.code : "connector_error",
    };
  }
  try {
    // Large bookmark windows must finish writing before the IPC channel disconnects.
    await new Promise<void>((resolveSend, reject) => {
      if (!process.send) return reject(new ConnectorError("opencli_unavailable"));
      process.send(message, (error) => (error ? reject(error) : resolveSend()));
    });
  } finally {
    process.disconnect?.();
  }
}
