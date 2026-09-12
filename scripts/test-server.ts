import { createServer } from "node:http";
import { Readable } from "node:stream";
import { createHarness } from "../tests/http/harness.ts";

const harness = await createHarness({ assets: "dist" });
const server = createServer(async (request, response) => {
  try {
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
        !["host", "connection", "content-length", "x-snail-test-identity"].includes(name)
      )
        headers[name] = value;
    }
    const subject = String(request.headers["x-snail-test-identity"] ?? "test-local");
    if (!/^test-[a-zA-Z0-9_-]{1,120}$/.test(subject)) {
      response.writeHead(400);
      response.end();
      return;
    }
    const result = await harness.request(
      request.url ?? "/",
      { method: request.method, headers, body: chunks.length ? Buffer.concat(chunks) : undefined },
      subject,
    );
    response.writeHead(result.status, Object.fromEntries(result.headers.entries()));
    if (result.body) Readable.fromWeb(result.body).pipe(response);
    else response.end();
  } catch {
    response.writeHead(500);
    response.end("Test proxy error");
  }
});
server.listen(4173, "127.0.0.1", () =>
  process.stdout.write("Snail local signed-session test server ready\n"),
);
async function close() {
  server.close();
  await harness.dispose();
  process.exit(0);
}
process.on("SIGTERM", () => void close());
process.on("SIGINT", () => void close());
