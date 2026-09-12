import { describe, expect, it } from "vitest";
import { canonicalOrigin, mergeCheckpoint, normalizeTweet } from "../../connector/core";

const postId = "2000000000000000001",
  mediaId = "2000000000000000002";
const mp4 = (size: string) =>
  `https://video.twimg.com/amplify_video/${mediaId}/vid/avc1/${size}/test.mp4?tag=29`;
const tweet = {
  rest_id: postId,
  core: { user_results: { result: { legacy: { screen_name: "snail_test", protected: false } } } },
  legacy: {
    full_text: "Synthetic video",
    extended_entities: {
      media: [
        {
          id_str: mediaId,
          type: "video",
          source_status_id_str: postId,
          video_info: {
            duration_millis: 3000,
            variants: [
              {
                content_type: "application/x-mpegURL",
                url: "https://video.twimg.com/manifest.m3u8",
              },
              { content_type: "video/mp4", bitrate: 256000, url: mp4("320x568") },
              { content_type: "video/mp4", bitrate: 2000000, url: mp4("720x1280") },
            ],
          },
        },
      ],
    },
  },
};

describe("Connector normalization and local-only checkpoint", () => {
  it("selects the best direct MP4 belonging to the exact post and strips all credentials", () => {
    const result = normalizeTweet({ ...tweet, authorization: "fake", cookie_file: "fake" }, postId);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      sourceId: postId,
      mediaId,
      mediaUrl: mp4("720x1280"),
      duration: 3,
      width: 720,
      height: 1280,
    });
    expect(JSON.stringify(result)).not.toMatch(/authorization|cookie_file|fake/);
    expect(normalizeTweet(tweet, "2000000000000000009")).toEqual([]);
  });
  it("refuses cross-post attachments, protected authors, HLS-only and mismatching media IDs", () => {
    const copy = structuredClone(tweet);
    copy.legacy.extended_entities.media[0].source_status_id_str = "2000000000000000009";
    expect(normalizeTweet(copy, postId)).toEqual([]);
    const privatePost = structuredClone(tweet);
    privatePost.core.user_results.result.legacy.protected = true;
    expect(normalizeTweet(privatePost, postId)).toEqual([]);
    const mismatched = structuredClone(tweet);
    mismatched.legacy.extended_entities.media[0].id_str = "2000000000000000008";
    expect(normalizeTweet(mismatched, postId)).toEqual([]);
    const hls = structuredClone(tweet);
    hls.legacy.extended_entities.media[0].video_info.variants =
      hls.legacy.extended_entities.media[0].video_info.variants.slice(0, 1);
    expect(normalizeTweet(hls, postId)).toEqual([]);
  });
  it("deduplicates overlapping polling windows using opaque bounded checkpoints", () => {
    const a = mergeCheckpoint([], [`${postId}:${mediaId}`]);
    const b = mergeCheckpoint(a, [
      `${postId}:${mediaId}`,
      "2000000000000000003:2000000000000000004",
    ]);
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(2);
    expect(b.every((x) => /^[a-f0-9]{64}$/.test(x))).toBe(true);
    expect(b.join("")).not.toContain(postId);
  });
  it("only pairs over HTTPS, with exact localhost reserved for explicit local tests", () => {
    expect(canonicalOrigin("https://snail.hexly.ai/")).toBe("https://snail.hexly.ai");
    for (const value of [
      "http://snail.hexly.ai",
      "https://user:secret@snail.hexly.ai",
      "https://snail.hexly.ai/path",
      "http://localhost.evil.com",
    ]) {
      expect(() => canonicalOrigin(value)).toThrow();
    }
    expect(() => canonicalOrigin("http://127.0.0.1:4173")).toThrow();
    expect(canonicalOrigin("http://127.0.0.1:4173", true)).toBe("http://127.0.0.1:4173");
  });
});
