import { createServer } from "node:http";
import { createHarness } from "../tests/http/harness.ts";
import { localHandler } from "./local-api.ts";

const harness = await createHarness({ assets: "dist" });
const server = createServer(localHandler(harness, ["http://127.0.0.1:17051"], true));
server.listen(17051, "127.0.0.1", () =>
  process.stdout.write("Snail local signed-session test server ready\n"),
);
async function close() {
  server.close();
  await harness.dispose();
  process.exit(0);
}
process.on("SIGTERM", () => void close());
process.on("SIGINT", () => void close());
