import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer, type ViteDevServer } from "vite";
import { afterEach, describe, expect, it } from "vitest";
import { createHarness } from "./harness";

let server: ViteDevServer | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe("local development", () => {
  it("starting HTTP tests preserves the running development app's dependency cache", async () => {
    const dependency = resolve(
      `node_modules/.vite/deps/snail-cache-check-${crypto.randomUUID()}.js`,
    );
    await mkdir(resolve("node_modules/.vite/deps"), { recursive: true });
    await writeFile(dependency, "export const retained = true;");
    try {
      server = await createServer({
        mode: "test",
        logLevel: "silent",
        optimizeDeps: { force: true },
        server: { port: 17051, strictPort: true, host: "127.0.0.1" },
      });
      await server.listen();
      expect(await readFile(dependency, "utf8")).toBe("export const retained = true;");
    } finally {
      await rm(dependency, { force: true });
    }
  });

  it("serves the signed Worker API alongside Vite and rejects foreign browser requests", async () => {
    server = await createServer({
      logLevel: "silent",
      mode: "test",
      server: { port: 17051, strictPort: true, host: "127.0.0.1" },
    });
    await server.listen();
    const origin = "http://127.0.0.1:17051";
    const live = await fetch(`${origin}/api/live`);
    expect(live.headers.get("content-type")).toContain("application/json");
    expect(live.status).toBe(200);
    const me = await fetch(`${origin}/api/me`, {
      headers: { "X-Snail-Test-Identity": "test-another-user" },
    });
    expect(await me.json()).toMatchObject({ email: "test-local@example.test" });
    const write = (browserOrigin: string) =>
      fetch(`${origin}/api/categories`, {
        method: "POST",
        headers: {
          Origin: browserOrigin,
          "Content-Type": "application/json",
          "X-Snail-Request": "1",
        },
        body: JSON.stringify({ name: "Local development check" }),
      });
    expect((await write("https://untrusted.example")).status).toBe(403);
    const category = await write("https://snail.dev.hexly.ai");
    expect(category.status).toBe(201);
    const { id } = (await category.json()) as { id: string };
    const cleanup = await fetch(`${origin}/api/categories/${id}`, {
      method: "DELETE",
      headers: { Origin: origin, "X-Snail-Request": "1" },
    });
    expect(cleanup.status).toBe(200);
    expect(
      (await fetch(`${origin}/api/me`, { headers: { Origin: "https://untrusted.example" } }))
        .status,
    ).toBe(403);
  });

  it("retains local D1 and R2 across restarts while test databases remain isolated", async () => {
    const persist = await mkdtemp(join(tmpdir(), "snail-local-"));
    let harness: Awaited<ReturnType<typeof createHarness>> | undefined;
    try {
      harness = await createHarness({ persist });
      expect(
        (
          await harness.request("/api/categories", {
            method: "POST",
            body: JSON.stringify({ name: "Retained local category" }),
          })
        ).status,
      ).toBe(201);
      const bytes = new Uint8Array(1024);
      bytes.set([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 2, 0]);
      const upload = (await (
        await harness.request("/api/uploads", {
          method: "POST",
          body: JSON.stringify({
            title: "Local persistence check",
            mime: "video/mp4",
            size: bytes.length,
            sha256: createHash("sha256").update(bytes).digest("hex"),
            approved: true,
          }),
        })
      ).json()) as { id: string };
      expect(
        (
          await harness.request(`/api/uploads/${upload.id}/parts/1`, {
            method: "PUT",
            body: bytes,
          })
        ).status,
      ).toBe(200);
      const completed = await harness.request(`/api/uploads/${upload.id}/complete`, {
        method: "POST",
      });
      expect(completed.status).toBe(200);
      const { assetId } = (await completed.json()) as { assetId: string };
      await harness.dispose();
      harness = await createHarness({ persist });
      const categories = await (await harness.request("/api/categories")).json();
      expect(categories).toEqual([expect.objectContaining({ name: "Retained local category" })]);
      const media = await harness.request(`/api/assets/${assetId}/media`);
      expect(media.status).toBe(200);
      expect(new Uint8Array(await media.arrayBuffer())).toEqual(bytes);
      await harness.dispose();
      harness = await createHarness();
      expect(await (await harness.request("/api/categories")).json()).toEqual([]);
      expect((await harness.request(`/api/assets/${assetId}/media`)).status).toBe(404);
    } finally {
      await harness?.dispose();
      await rm(persist, { recursive: true, force: true });
    }
  });
});
