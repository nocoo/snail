import type { Identity } from "./auth";
import { HttpError } from "./http";

export async function ensureLibrary(env: Env, identity: Identity) {
  await env.DB.prepare("INSERT OR IGNORE INTO libraries(id,created_at) VALUES (?,?)")
    .bind(identity.libraryId, Date.now())
    .run();
}

export async function audit(
  env: Env,
  libraryId: string | null,
  action: string,
  targetId?: string,
  deviceId?: string,
) {
  await env.DB.prepare(
    "INSERT INTO audit(id,library_id,device_id,action,target_id,created_at) VALUES (?,?,?,?,?,?)",
  )
    .bind(crypto.randomUUID(), libraryId, deviceId ?? null, action, targetId ?? null, Date.now())
    .run();
}

export async function rateLimit(env: Env, key: string, max = 120, windowMs = 60_000) {
  const window = Math.floor(Date.now() / windowMs);
  const row = await env.DB.prepare(
    "INSERT INTO rate_limits(key,window,count) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET window=excluded.window,count=CASE WHEN rate_limits.window=excluded.window THEN rate_limits.count+1 ELSE 1 END RETURNING count",
  )
    .bind(key, window)
    .first<{ count: number }>();
  if (!row || row.count > max) throw new HttpError(429, "rate_limited");
}

export async function listCategories(env: Env, libraryId: string) {
  return (
    await env.DB.prepare(
      "SELECT id,name,parent_id AS parentId FROM categories WHERE library_id=? ORDER BY name COLLATE NOCASE",
    )
      .bind(libraryId)
      .all()
  ).results;
}

export async function createCategory(
  env: Env,
  libraryId: string,
  name: string,
  parentId?: string | null,
) {
  if (
    parentId &&
    !(await env.DB.prepare("SELECT id FROM categories WHERE library_id=? AND id=?")
      .bind(libraryId, parentId)
      .first())
  )
    throw new HttpError(404, "category_not_found");
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare(
      "INSERT INTO categories(id,library_id,name,parent_id,created_at) VALUES (?,?,?,?,?)",
    )
      .bind(id, libraryId, name, parentId ?? null, Date.now())
      .run();
  } catch {
    throw new HttpError(409, "category_exists");
  }
  return { id, name, parentId: parentId ?? null };
}
