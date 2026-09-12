import { version } from "../package.json";
import { enforceOrigin, verifyIdentity } from "./auth";
import {
  approvePairing,
  deviceRoute,
  listDevices,
  previewPairing,
  publicPairing,
  revokeDevice,
} from "./devices";
import { HttpError, json, secureResponse } from "./http";
import {
  bulkAssets,
  deleteAssets,
  getAsset,
  listAssets,
  patchAsset,
  taxonomyRoute,
} from "./library";
import { ensureLibrary, rateLimit } from "./store";
import { createUpload, savePoster, serveMedia, uploadRoute } from "./uploads";

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (["/api/connector-pairings", "/api/connector-pairings/exchange"].includes(url.pathname))
    return publicPairing(request, env);
  if (url.pathname.startsWith("/api/connectors/me/")) return deviceRoute(request, env);
  if (url.pathname === "/api/live" && ["GET", "HEAD"].includes(request.method)) {
    try {
      await Promise.all([
        env.DB.prepare("SELECT id FROM libraries LIMIT 1").first(),
        env.MEDIA.list({ limit: 1 }),
      ]);
      const response = json({
        status: "ok",
        service: "snail",
        version,
        timestamp: new Date().toISOString(),
        checks: { database: "ok", storage: "ok" },
      });
      return request.method === "HEAD" ? new Response(null, response) : response;
    } catch {
      return json({ status: "error", service: "snail", version }, 503);
    }
  }
  const identity = await verifyIdentity(request, env);
  enforceOrigin(request, env.APP_ORIGIN);
  if (url.pathname.startsWith("/api/")) {
    await ensureLibrary(env, identity);
    await rateLimit(env, `user:${identity.libraryId}`, 600);
    if (url.pathname === "/api/me/connector-pairings/approve" && request.method === "POST")
      return approvePairing(request, env, identity.libraryId);
    if (url.pathname === "/api/me/connector-pairings" && request.method === "GET")
      return previewPairing(env, url.searchParams.get("code") ?? "");
    if (url.pathname === "/api/devices" && request.method === "GET")
      return json(await listDevices(env, identity.libraryId));
    const device = /^\/api\/devices\/([a-f0-9-]{36})$/.exec(url.pathname);
    if (device && request.method === "DELETE")
      return revokeDevice(env, identity.libraryId, device[1]);
    if (url.pathname === "/api/uploads" && request.method === "POST")
      return createUpload(request, env, identity);
    const upload = /^\/api\/uploads\/([a-f0-9-]{36})(?:\/(parts|complete)(?:\/(\d+))?)?$/.exec(
      url.pathname,
    );
    if (upload) return uploadRoute(request, env, identity, upload[1], upload[2], upload[3]);
    const media = /^\/api\/assets\/([a-f0-9-]{36})\/(media|poster)$/.exec(url.pathname);
    if (media && ["GET", "HEAD"].includes(request.method))
      return serveMedia(request, env, identity, media[1], media[2] === "poster");
    if (media?.[2] === "poster" && request.method === "PUT")
      return savePoster(request, env, identity, media[1]);
    if (url.pathname === "/api/me" && request.method === "GET")
      return json({ libraryId: identity.libraryId, email: identity.email, version });
    const taxonomy = /^\/api\/(categories|tags)(?:\/([a-f0-9-]{36}))?$/.exec(url.pathname);
    if (taxonomy)
      return taxonomyRoute(
        request,
        env,
        identity.libraryId,
        taxonomy[1] as "categories" | "tags",
        taxonomy[2],
      );
    if (url.pathname === "/api/assets" && request.method === "GET")
      return json(await listAssets(env, identity.libraryId, url.searchParams));
    if (url.pathname === "/api/assets/bulk" && request.method === "POST")
      return bulkAssets(request, env, identity.libraryId);
    const asset = /^\/api\/assets\/([a-f0-9-]{36})$/.exec(url.pathname);
    if (asset) {
      if (request.method === "GET") return json(await getAsset(env, identity.libraryId, asset[1]));
      if (request.method === "PATCH") return patchAsset(request, env, identity.libraryId, asset[1]);
      if (request.method === "DELETE") return deleteAssets(env, identity.libraryId, [asset[1]]);
    }
    throw new HttpError(404, "not_found");
  }
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env) {
    try {
      return secureResponse(await handle(request, env));
    } catch (error) {
      const known = error instanceof HttpError;
      return secureResponse(
        json(
          { error: { code: known ? error.code : "internal_error" } },
          known ? error.status : 500,
          known && error.status === 429 ? { "Retry-After": "60" } : undefined,
        ),
      );
    }
  },
} satisfies ExportedHandler<Env>;
