import { describe, expect, it } from "vitest";
import { importSchema } from "../../worker/contracts";
import { parseRange, sniffVideo, validateMediaUrl } from "../../worker/media";

describe("video validation and range semantics", () => {
  const mp4 = new Uint8Array([
    0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 2, 0, 105, 115, 111, 109, 109, 112,
    52, 49,
  ]);
  it("validates an MP4 container signature and MIME together", () => {
    expect(sniffVideo(mp4, "video/mp4")).toBe("video/mp4");
    expect(() => sniffVideo(mp4, "text/html")).toThrow();
    expect(() =>
      sniffVideo(new TextEncoder().encode("<!DOCTYPE html><html>fake .mp4"), "video/mp4"),
    ).toThrow();
    expect(() => sniffVideo(new Uint8Array(), "video/mp4")).toThrow();
  });
  it("handles bounded, open and suffix byte ranges", () => {
    expect(parseRange(null, 100)).toBeNull();
    expect(parseRange("bytes=0-9", 100)).toEqual({ offset: 0, length: 10 });
    expect(parseRange("bytes=90-", 100)).toEqual({ offset: 90, length: 10 });
    expect(parseRange("bytes=-7", 100)).toEqual({ offset: 93, length: 7 });
    expect(parseRange("bytes=0-999", 100)).toEqual({ offset: 0, length: 100 });
    expect(parseRange("bytes=-1000", 100)).toEqual({ offset: 0, length: 100 });
  });
  it.each([
    "bytes=100-",
    "bytes=20-10",
    "bytes=0-1,2-3",
    "bytes=-0",
    "bytes=abc",
    "items=0-1",
    "bytes=9007199254740993-",
  ])("rejects unsatisfiable/unsupported range %s", (value) => {
    expect(() => parseRange(value, 100)).toThrow();
  });
});

describe("approved media relay trust boundary", () => {
  const valid =
    "https://video.twimg.com/amplify_video/2098577761237700609/vid/avc1/320x568/njVhIPPCaO1ycufn.mp4?tag=29";
  it("allows a precise CDN MP4 belonging to the declared media ID", () => {
    expect(validateMediaUrl(valid, "2098577761237700609")).toBe(valid);
    expect(() => validateMediaUrl(valid, "999")).toThrow();
  });
  it.each([
    "http://video.twimg.com/a.mp4",
    "https://video.twimg.com.evil.test/a.mp4",
    "https://video.twimg.com@127.0.0.1/a.mp4",
    "https://127.0.0.1/a.mp4",
    "https://[::1]/a.mp4",
    "file:///etc/passwd",
    "data:video/mp4;base64,AAAA",
    "https://video.twimg.com:444/a.mp4",
    "https://x.com/a/status/123",
    "https://video.twimg.com/a.m3u8",
    "https://video.twimg.com/a.mp4?token=secret",
  ])("rejects SSRF, credentials, unsupported hosts/protocols/manifests: %s", (url) => {
    expect(() => validateMediaUrl(url, "2098577761237700609")).toThrow();
  });
  it("rejects raw browser headers/cookies, unknown fields and unapproved media", () => {
    const data = {
      sourceId: "2098577796398567727",
      sourceUrl: "https://x.com/girlofflorence/status/2098577796398567727",
      title: "Approved test",
      approved: true,
      mediaId: "2098577761237700609",
      mediaUrl: valid,
    };
    expect(importSchema.safeParse(data).success).toBe(true);
    for (const key of [
      "cookies",
      "headers",
      "authorization",
      "token",
      "browser_profile",
      "cookie_file",
    ]) {
      expect(importSchema.safeParse({ ...data, [key]: "redacted" }).success).toBe(false);
    }
    expect(importSchema.safeParse({ ...data, approved: false }).success).toBe(false);
    expect(importSchema.safeParse({ ...data, sourceId: "123" }).success).toBe(false);
  });
});
