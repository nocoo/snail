import { expect, it } from "vitest";
import { assertPublicMediaDns } from "../../shared/media-dns";

it("requires public A/AAAA answers for the fixed CDN allowlist and fails closed", async () => {
  let calls = 0;
  const resolver =
    (address: string): typeof fetch =>
    async (input, init) => {
      const url = new URL(String(input));
      expect(url.origin).toBe("https://cloudflare-dns.com");
      expect(url.searchParams.get("name")).toBe("video.twimg.com");
      expect(new Headers(init?.headers).has("cookie")).toBe(false);
      expect(init?.redirect).toBe("manual");
      calls++;
      return Response.json({
        Status: 0,
        Answer: [{ type: url.searchParams.get("type") === "A" ? 1 : 28, data: address }],
      });
    };
  await assertPublicMediaDns("video.twimg.com", undefined, resolver("199.232.148.158"));
  expect(calls).toBe(2);
  for (const address of [
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "192.168.1.1",
    "198.18.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
  ])
    await expect(
      assertPublicMediaDns("video.twimg.com", undefined, resolver(address)),
    ).rejects.toThrow("unsafe_media_address");
  await expect(
    assertPublicMediaDns("video.twimg.com.evil.test", undefined, resolver("199.232.148.158")),
  ).rejects.toThrow("unsafe_media_address");
  await expect(
    assertPublicMediaDns("video.twimg.com", undefined, async () => Response.json({ Status: 2 })),
  ).rejects.toThrow("media_dns_unavailable");
});
