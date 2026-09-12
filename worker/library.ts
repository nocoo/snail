import type { Asset, AssetPage } from "../shared/types";
import { assetPatchSchema, bulkSchema, categorySchema, tagSchema } from "./contracts";
import { HttpError, json, readJson } from "./http";
import { audit, createCategory, listCategories } from "./store";

const columns = `a.id,a.title,a.description,a.favorite,a.category_id AS categoryId,a.source_id AS sourceId,a.source_url AS sourceUrl,a.media_id AS mediaId,
  a.duration,a.width,a.height,a.created_at AS createdAt,a.updated_at AS updatedAt,b.size,b.mime,b.sha256,(a.poster_key IS NOT NULL) AS hasPoster,
  (SELECT json_group_array(json_object('id',t.id,'name',t.name)) FROM asset_tags at JOIN tags t ON t.id=at.tag_id WHERE at.asset_id=a.id) AS tags`;
type RawAsset = Omit<Asset, "tags" | "favorite" | "hasPoster"> & {
  tags: string;
  favorite: number;
  hasPoster: number;
};
function normalize(row: RawAsset): Asset {
  return {
    ...row,
    favorite: Boolean(row.favorite),
    hasPoster: Boolean(row.hasPoster),
    tags: JSON.parse(row.tags),
  };
}

export async function getAsset(env: Env, libraryId: string, id: string) {
  const asset = await env.DB.prepare(
    `SELECT ${columns} FROM assets a JOIN blobs b ON b.id=a.blob_id WHERE a.library_id=? AND a.id=?`,
  )
    .bind(libraryId, id)
    .first<RawAsset>();
  if (!asset) throw new HttpError(404, "asset_not_found");
  return normalize(asset);
}

export async function listAssets(
  env: Env,
  libraryId: string,
  query: URLSearchParams,
): Promise<AssetPage> {
  const clauses = ["a.library_id=?"];
  const values: (string | number)[] = [libraryId];
  const q = query.get("q")?.trim().slice(0, 200);
  if (q) {
    // D1 limits LIKE patterns to 50 bytes; instr also treats %, _ and backslashes literally.
    clauses.push(
      "(instr(lower(a.title),lower(?))>0 OR instr(lower(a.description),lower(?))>0 OR EXISTS(SELECT 1 FROM asset_tags ats JOIN tags t ON t.id=ats.tag_id WHERE ats.asset_id=a.id AND instr(lower(t.name),lower(?))>0))",
    );
    values.push(q, q, q);
  }
  if (query.get("favorite") === "true") clauses.push("a.favorite=1");
  const category = query.get("category");
  if (category === "uncategorized") clauses.push("a.category_id IS NULL");
  else if (category) {
    clauses.push("a.category_id=?");
    values.push(category);
  }
  const tag = query.get("tag");
  if (tag) {
    clauses.push("EXISTS(SELECT 1 FROM asset_tags at WHERE at.asset_id=a.id AND at.tag_id=?)");
    values.push(tag);
  }
  const order: Record<string, string> = {
    newest: "a.created_at DESC,a.id DESC",
    oldest: "a.created_at ASC,a.id ASC",
    title: "a.title COLLATE NOCASE ASC,a.id",
    size: "b.size DESC,a.id",
    duration: "a.duration DESC,a.id",
  };
  const sort = order[query.get("sort") ?? "newest"] ?? order.newest;
  const page = Math.min(100_000, Math.max(1, Number(query.get("page")) || 1)) | 0;
  const limit = Math.min(100, Math.max(1, Number(query.get("limit")) || 48)) | 0;
  const where = clauses.join(" AND ");
  const result = await env.DB.batch([
    env.DB.prepare(
      `SELECT ${columns} FROM assets a JOIN blobs b ON b.id=a.blob_id WHERE ${where} ORDER BY ${sort} LIMIT ? OFFSET ?`,
    ).bind(...values, limit, (page - 1) * limit),
    env.DB.prepare(
      `SELECT COUNT(*) AS count FROM assets a JOIN blobs b ON b.id=a.blob_id WHERE ${where}`,
    ).bind(...values),
  ]);
  return {
    items: (result[0].results as RawAsset[]).map(normalize),
    total: Number((result[1].results[0] as { count: number }).count),
    page,
    limit,
  };
}

async function validateOrganization(
  env: Env,
  libraryId: string,
  categoryId?: string | null,
  tagIds?: string[],
) {
  if (
    categoryId &&
    !(await env.DB.prepare("SELECT id FROM categories WHERE library_id=? AND id=?")
      .bind(libraryId, categoryId)
      .first())
  )
    throw new HttpError(400, "invalid_category");
  if (tagIds?.length) {
    const distinct = [...new Set(tagIds)];
    const count = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM tags WHERE library_id=? AND id IN (${distinct.map(() => "?").join(",")})`,
    )
      .bind(libraryId, ...distinct)
      .first<{ count: number }>();
    if (count?.count !== distinct.length) throw new HttpError(400, "invalid_tags");
  }
}

export async function patchAsset(request: Request, env: Env, libraryId: string, id: string) {
  const patch = await readJson(request, assetPatchSchema);
  await getAsset(env, libraryId, id);
  await validateOrganization(env, libraryId, patch.categoryId, patch.tagIds);
  const sets = ["updated_at=?"];
  const values: (string | number | null)[] = [Date.now()];
  if (patch.title !== undefined) {
    sets.push("title=?");
    values.push(patch.title);
  }
  if (patch.description !== undefined) {
    sets.push("description=?");
    values.push(patch.description);
  }
  if (patch.favorite !== undefined) {
    sets.push("favorite=?");
    values.push(patch.favorite ? 1 : 0);
  }
  if (patch.categoryId !== undefined) {
    sets.push("category_id=?");
    values.push(patch.categoryId);
  }
  const operations = [
    env.DB.prepare(`UPDATE assets SET ${sets.join(",")} WHERE id=? AND library_id=?`).bind(
      ...values,
      id,
      libraryId,
    ),
  ];
  if (patch.tagIds) {
    operations.push(
      env.DB.prepare("DELETE FROM asset_tags WHERE asset_id=? AND library_id=?").bind(
        id,
        libraryId,
      ),
    );
    for (const tag of new Set(patch.tagIds))
      operations.push(
        env.DB.prepare("INSERT INTO asset_tags(library_id,asset_id,tag_id) VALUES (?,?,?)").bind(
          libraryId,
          id,
          tag,
        ),
      );
  }
  await env.DB.batch(operations);
  return json(await getAsset(env, libraryId, id));
}

export async function deleteAssets(env: Env, libraryId: string, ids: string[]) {
  const placeholders = ids.map(() => "?").join(",");
  const rows = (
    await env.DB.prepare(
      `SELECT a.id,a.poster_key,b.id AS blob_id,b.object_key FROM assets a JOIN blobs b ON b.id=a.blob_id WHERE a.library_id=? AND a.id IN (${placeholders})`,
    )
      .bind(libraryId, ...ids)
      .all<{ id: string; poster_key: string | null; blob_id: string; object_key: string }>()
  ).results;
  if (rows.length !== ids.length) throw new HttpError(404, "asset_not_found");
  const now = Date.now();
  const ops = [
    env.DB.prepare(`DELETE FROM assets WHERE library_id=? AND id IN (${placeholders})`).bind(
      libraryId,
      ...ids,
    ),
  ];
  for (const row of rows) {
    if (row.poster_key)
      ops.push(
        env.DB.prepare("INSERT OR IGNORE INTO garbage(object_key,delete_after) VALUES (?,?)").bind(
          row.poster_key,
          now,
        ),
      );
    ops.push(
      env.DB.prepare(
        "INSERT OR IGNORE INTO garbage(object_key,delete_after) SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM assets WHERE blob_id=?)",
      ).bind(row.object_key, now, row.blob_id),
    );
    ops.push(
      env.DB.prepare(
        "DELETE FROM blobs WHERE id=? AND library_id=? AND NOT EXISTS(SELECT 1 FROM assets WHERE blob_id=?)",
      ).bind(row.blob_id, libraryId, row.blob_id),
    );
  }
  await env.DB.batch(ops);
  await audit(env, libraryId, "asset.deleted", ids.length === 1 ? ids[0] : undefined);
  return json({ deleted: ids.length });
}

export async function bulkAssets(request: Request, env: Env, libraryId: string) {
  const body = await readJson(request, bulkSchema);
  const ids = [...new Set(body.ids)];
  const placeholders = ids.map(() => "?").join(",");
  const found = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM assets WHERE library_id=? AND id IN (${placeholders})`,
  )
    .bind(libraryId, ...ids)
    .first<{ count: number }>();
  if (found?.count !== ids.length) throw new HttpError(404, "asset_not_found");
  if (body.action === "delete") return deleteAssets(env, libraryId, ids);
  await validateOrganization(env, libraryId, body.categoryId, body.tagIds);
  const ops: D1PreparedStatement[] = [];
  if (["favorite", "unfavorite"].includes(body.action))
    ops.push(
      env.DB.prepare(
        `UPDATE assets SET favorite=?,updated_at=? WHERE library_id=? AND id IN (${placeholders})`,
      ).bind(body.action === "favorite" ? 1 : 0, Date.now(), libraryId, ...ids),
    );
  if (body.action === "category")
    ops.push(
      env.DB.prepare(
        `UPDATE assets SET category_id=?,updated_at=? WHERE library_id=? AND id IN (${placeholders})`,
      ).bind(body.categoryId ?? null, Date.now(), libraryId, ...ids),
    );
  if (body.action === "tags")
    for (const id of ids)
      for (const tag of new Set(body.tagIds ?? []))
        ops.push(
          env.DB.prepare(
            "INSERT OR IGNORE INTO asset_tags(library_id,asset_id,tag_id) VALUES (?,?,?)",
          ).bind(libraryId, id, tag),
        );
  if (ops.length) await env.DB.batch(ops);
  await audit(env, libraryId, `asset.bulk.${body.action}`);
  return json({ updated: ids.length });
}

export async function taxonomyRoute(
  request: Request,
  env: Env,
  libraryId: string,
  type: "categories" | "tags",
  id?: string,
) {
  if (!id) {
    if (request.method === "GET")
      return json(
        type === "categories"
          ? await listCategories(env, libraryId)
          : (
              await env.DB.prepare(
                "SELECT id,name FROM tags WHERE library_id=? ORDER BY name COLLATE NOCASE",
              )
                .bind(libraryId)
                .all()
            ).results,
      );
    if (request.method === "POST") {
      if (type === "categories") {
        const input = await readJson(request, categorySchema);
        return json(await createCategory(env, libraryId, input.name, input.parentId), 201);
      }
      const input = await readJson(request, tagSchema);
      const tagId = crypto.randomUUID();
      try {
        await env.DB.prepare("INSERT INTO tags(id,library_id,name,created_at) VALUES (?,?,?,?)")
          .bind(tagId, libraryId, input.name, Date.now())
          .run();
      } catch {
        throw new HttpError(409, "tag_exists");
      }
      return json({ id: tagId, name: input.name }, 201);
    }
  } else {
    const row = await env.DB.prepare(`SELECT id FROM ${type} WHERE id=? AND library_id=?`)
      .bind(id, libraryId)
      .first();
    if (!row) throw new HttpError(404, "not_found");
    if (request.method === "PATCH") {
      const input = await readJson(request, tagSchema);
      try {
        await env.DB.prepare(`UPDATE ${type} SET name=? WHERE id=? AND library_id=?`)
          .bind(input.name, id, libraryId)
          .run();
      } catch {
        throw new HttpError(409, "name_exists");
      }
      return json({ id, name: input.name });
    }
    if (request.method === "DELETE") {
      const ops: D1PreparedStatement[] = [];
      if (type === "categories") {
        ops.push(
          env.DB.prepare(
            "UPDATE categories SET parent_id=NULL WHERE parent_id=? AND library_id=?",
          ).bind(id, libraryId),
        );
        ops.push(
          env.DB.prepare(
            "UPDATE assets SET category_id=NULL WHERE category_id=? AND library_id=?",
          ).bind(id, libraryId),
        );
      }
      ops.push(
        env.DB.prepare(`DELETE FROM ${type} WHERE id=? AND library_id=?`).bind(id, libraryId),
      );
      await env.DB.batch(ops);
      return json({ deleted: true });
    }
  }
  throw new HttpError(405, "method_not_allowed");
}
