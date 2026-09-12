import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { Plugin } from "vite";
import { createHarness } from "../tests/http/harness.ts";

// Development/test adapter only. This module is never imported by the deployed Worker.
export function localHandler(
  harness: Awaited<ReturnType<typeof createHarness>>,
  origins: string[],
  allowTestIdentity = false,
) {
  const hosts = new Set(origins.map((origin) => new URL(origin).host));
  return async (request: IncomingMessage, response: ServerResponse) => {
    try {
      const origin = request.headers.origin;
      if (
        !hosts.has(request.headers.host ?? "") ||
        (origin && !origins.includes(origin)) ||
        request.headers["sec-fetch-site"] === "cross-site" ||
        (origin &&
          !["GET", "HEAD"].includes(request.method ?? "GET") &&
          request.headers["x-snail-request"] !== "1")
      ) {
        response.writeHead(403);
        response.end();
        return;
      }
      const chunks: Buffer[] = [];
      let bytes = 0;
      for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > 9 * 1024 * 1024) {
          response.writeHead(413);
          response.end();
          return;
        }
        chunks.push(chunk);
      }
      const headers: Record<string, string> = {};
      for (const [name, value] of Object.entries(request.headers)) {
        if (
          typeof value === "string" &&
          ![
            "host",
            "connection",
            "content-length",
            "x-snail-test-identity",
            "cookie",
            "cf-access-jwt-assertion",
          ].includes(name)
        )
          headers[name] = value;
      }
      const subject = String(
        allowTestIdentity
          ? (request.headers["x-snail-test-identity"] ?? "test-local")
          : "test-local",
      );
      if (!/^test-[a-zA-Z0-9_-]{1,120}$/.test(subject)) {
        response.writeHead(400);
        response.end();
        return;
      }
      const result = await harness.request(
        request.url ?? "/",
        {
          method: request.method,
          headers,
          body: chunks.length ? Buffer.concat(chunks) : undefined,
        },
        subject,
      );
      response.writeHead(result.status, Object.fromEntries(result.headers.entries()));
      if (result.body) await pipeline(Readable.fromWeb(result.body), response);
      else response.end();
    } catch {
      if (!response.headersSent) response.writeHead(500);
      response.end("Local Worker request failed");
    }
  };
}

export function localApi(): Plugin {
  let harness: Awaited<ReturnType<typeof createHarness>> | undefined;
  return {
    name: "snail-local-worker",
    apply: "serve",
    async configureServer(server) {
      harness = await createHarness({
        persist: server.config.mode === "test" ? undefined : ".wrangler/dev",
      });
      const handler = localHandler(harness, [
        "https://snail.dev.hexly.ai",
        `http://127.0.0.1:${server.config.server.port}`,
        `http://localhost:${server.config.server.port}`,
      ]);
      server.middlewares.use((request, response, next) => {
        if (request.url?.startsWith("/api/")) void handler(request, response);
        else next();
      });
    },
    async closeBundle() {
      await harness?.dispose();
    },
  };
}
