import { HttpError } from "../worker/http";

export function canonicalPost(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError(400, "invalid_source_url");
  }
  const match = /^\/([a-zA-Z0-9_]{1,50})\/status\/(\d{15,22})\/?$/.exec(url.pathname);
  if (
    url.protocol !== "https:" ||
    !["x.com", "twitter.com", "www.twitter.com", "www.x.com"].includes(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    !match
  )
    throw new HttpError(400, "invalid_source_url");
  return { id: match[2], url: `https://x.com/${match[1]}/status/${match[2]}` };
}
