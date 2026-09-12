import { version } from "../package.json";
import { enforceOrigin, verifyIdentity } from "./auth";
import { categorySchema } from "./contracts";
import { HttpError, json, readJson, secureResponse } from "./http";
import { createCategory, ensureLibrary, listCategories, rateLimit } from "./store";

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
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
    if (url.pathname === "/api/me" && request.method === "GET")
      return json({ libraryId: identity.libraryId, email: identity.email, version });
    if (url.pathname === "/api/categories") {
      if (request.method === "GET") return json(await listCategories(env, identity.libraryId));
      if (request.method === "POST") {
        const body = await readJson(request, categorySchema);
        return json(await createCategory(env, identity.libraryId, body.name, body.parentId), 201);
      }
    }
    if (url.pathname === "/api/assets" && request.method === "GET")
      return json({ items: [], total: 0 });
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
