import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, expect, it } from "vitest";

const execute = promisify(execFile);
let root: string;

beforeAll(async () => {
  root = await mkdtemp(resolve(".artifacts/opencli-ipc-"));
  await Promise.all([
    mkdir(join(root, "dist/src/browser"), { recursive: true }),
    mkdir(join(root, "clis/twitter"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(join(root, "package.json"), JSON.stringify({ type: "module", version: "1.8.6" })),
    writeFile(
      join(root, "dist/src/registry.js"),
      "const registry = new Map(); export const getRegistry = () => registry;",
    ),
    writeFile(
      join(root, "clis/twitter/bookmarks.js"),
      `import { getRegistry } from '../../dist/src/registry.js';
      getRegistry().set('twitter/bookmarks', {
        access: 'read',
        async func(page, { limit }) {
          const body = await page.evaluate('return r.ok ? await r.json() : { error: r.status };');
          return body.data.tweets.slice(0, limit).map(tweet => ({ id: tweet.rest_id }));
        }
      });`,
    ),
    writeFile(
      join(root, "dist/src/browser/bridge.js"),
      `export class BrowserBridge {
        async connect() {
          return {
            async goto() {},
            async closeWindow() {},
            async evaluate() {
              if (process.env.SNAIL_OPENCLI_FIXTURE_MODE === 'empty-exit') process.exit(0);
              console.log('adapter output must remain isolated');
              const tweets = Array.from({ length: 120 }, (_, index) => {
                const id = String(2000000000000000000n + BigInt(index) * 2n);
                const mediaId = String(BigInt(id) + 1n);
                return {
                  rest_id: id,
                  core: { user_results: { result: { legacy: { screen_name: 'snail_fixture', protected: false } } } },
                  legacy: {
                    full_text: 'Synthetic fixture description. '.repeat(200),
                    extended_entities: { media: [{
                      id_str: mediaId, type: 'video', source_status_id_str: id,
                      video_info: { duration_millis: 3000, variants: [{
                        content_type: 'video/mp4', bitrate: 2000000,
                        url: 'https://video.twimg.com/amplify_video/' + mediaId + '/vid/avc1/720x1280/test.mp4'
                      }] }
                    }] }
                  }
                };
              });
              return { __snailResponse: true, status: 200, body: { data: { tweets } } };
            }
          };
        }
        async close() {}
      }`,
    ),
  ]);
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

async function preview(mode: string) {
  try {
    const result = await execute("bun", ["connector/cli.ts", "preview", "--limit", "120"], {
      env: { ...process.env, SNAIL_OPENCLI_ROOT: root, SNAIL_OPENCLI_FIXTURE_MODE: mode },
      timeout: 8000,
      killSignal: "SIGKILL",
      maxBuffer: 1_048_576,
    });
    return { code: 0, stdout: result.stdout };
  } catch (error) {
    const result = error as { code?: number | string; stdout?: string };
    return { code: result.code, stdout: result.stdout ?? "" };
  }
}

it("delivers a full bookmark window over IPC before the isolated adapter exits", async () => {
  const result = await preview("large");
  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ event: "preview", posts: 120, videos: 120 });
  expect(result.stdout).not.toMatch(/Synthetic fixture|adapter output/);
});

it("returns a fixed error when an adapter exits successfully without replying", async () => {
  const result = await preview("empty-exit");
  expect(result.code).toBe(1);
  expect(JSON.parse(result.stdout)).toEqual({ event: "error", code: "opencli_unavailable" });
});
