import { afterAll, beforeAll, expect, it } from "vitest";
import { DeviceClient } from "../../connector/client";
import { createHarness, pairDevice } from "./harness";

let h: Awaited<ReturnType<typeof createHarness>>;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h?.dispose();
});
it("uses only device auth, rotates, heartbeats and refuses a revoked session", async () => {
  const d = await pairDevice(h);
  const fetcher: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    expect(request.headers.has("cookie")).toBe(false);
    expect(request.url).toMatch(/^https:\/\/snail.test\/api\/connectors\/me\//);
    const body = request.body ? new Uint8Array(await request.arrayBuffer()) : undefined;
    const response = await h.request(
      new URL(request.url).pathname,
      { method: request.method, headers: request.headers, body },
      "",
    );
    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers: response.headers,
    });
  };
  const c = new DeviceClient("https://snail.test", d.token, fetcher);
  expect(
    await c.request("/heartbeat", { body: { checkpoint: "v1.synthetic", state: "idle" } }),
  ).toMatchObject({ connected: true });
  const rotated = await c.rotate();
  expect(rotated.token).not.toBe(d.token);
  expect((await d.request("/heartbeat", {})).status).toBe(401);
  expect(await c.request("/heartbeat", { body: { state: "idle" } })).toMatchObject({
    connected: true,
  });
  await c.request("/revoke", { body: {} });
  await expect(c.request("/heartbeat", { body: {} })).rejects.toMatchObject({
    code: "device_revoked",
  });
});
it("does not follow redirects with the device credential", async () => {
  let calls = 0;
  const c = new DeviceClient(
    "https://snail.test",
    `snail_device_${"a".repeat(64)}`,
    async (_i, init) => {
      calls++;
      expect(init?.redirect).toBe("manual");
      return new Response(null, { status: 302, headers: { location: "https://evil.test" } });
    },
  );
  await expect(c.request("/heartbeat", { body: {} })).rejects.toMatchObject({
    code: "access_misconfigured",
  });
  expect(calls).toBe(1);
});
