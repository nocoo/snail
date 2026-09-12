import { z } from "zod";
import { canonicalPost } from "../shared/source";
import { emptySchema, idSchema } from "./contracts";
import { HttpError, json, readJson } from "./http";
import { audit } from "./store";
import type { Actor } from "./uploads";

const jobSchema = z.object({ url: z.string().max(2048), approved: z.literal(true) }).strict();
const leaseSchema = z.object({ leaseId: idSchema }).strict();
const finishSchema = z.object({ leaseId: idSchema, assetId: idSchema }).strict();
const failSchema = z
  .object({
    leaseId: idSchema,
    errorCode: z.enum([
      "needs_login",
      "media_unavailable",
      "invalid_media",
      "download_failed",
      "decode_failed",
      "connector_error",
      "rights_required",
      "upload_failed",
    ]),
  })
  .strict();
const columns =
  "id,source_url AS sourceUrl,source_id AS sourceId,status,asset_id AS assetId,error_code AS errorCode,created_at AS createdAt,updated_at AS updatedAt,lease_id AS leaseId,lease_until AS leaseUntil,attempts";
const LEASE_MS = 180_000;

async function stopStaleTransfers(env: Env, libraryId: string) {
  const now = Date.now();
  const stale = (table: string) =>
    `library_id=? AND job_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jobs WHERE jobs.id=${table}.job_id AND jobs.status='claimed' AND jobs.lease_id=${table}.lease_id AND jobs.device_id=${table}.device_id AND jobs.lease_until>?)`;
  const results = await env.DB.batch([
    env.DB.prepare(
      `UPDATE uploads SET status='cancelled',updated_at=? WHERE status IN ('uploading','completing','verifying') AND ${stale("uploads")} RETURNING object_key,multipart_id`,
    ).bind(now, libraryId, now),
    env.DB.prepare(
      `UPDATE imports SET status='failed',error_code='job_lease_lost',updated_at=? WHERE status='fetching' AND ${stale("imports")}`,
    ).bind(now, libraryId, now),
    env.DB.prepare(
      "INSERT OR IGNORE INTO garbage(object_key,delete_after) SELECT object_key,? FROM uploads WHERE library_id=? AND job_id IS NOT NULL AND status='cancelled' AND updated_at=?",
    ).bind(now + 300_000, libraryId, now),
    env.DB.prepare(
      "INSERT OR IGNORE INTO garbage(object_key,delete_after) SELECT object_key,? FROM imports WHERE library_id=? AND job_id IS NOT NULL AND status='failed' AND object_key IS NOT NULL AND updated_at=?",
    ).bind(now + 300_000, libraryId, now),
  ]);
  for (const row of results[0].results as { object_key: string; multipart_id: string }[]) {
    await env.MEDIA.resumeMultipartUpload(row.object_key, row.multipart_id)
      .abort()
      .catch(() => {});
  }
}

export async function userJobs(
  request: Request,
  env: Env,
  libraryId: string,
  id?: string,
  action?: string,
) {
  if (!id && request.method === "GET")
    return json(
      (
        await env.DB.prepare(
          `SELECT ${columns} FROM jobs WHERE library_id=? ORDER BY created_at DESC LIMIT 100`,
        )
          .bind(libraryId)
          .all()
      ).results,
    );
  if (!id && request.method === "POST") {
    const input = await readJson(request, jobSchema),
      source = canonicalPost(input.url),
      now = Date.now(),
      jobId = crypto.randomUUID();
    const result = await env.DB.prepare(
      "INSERT OR IGNORE INTO jobs(id,library_id,source_url,source_id,status,created_at,updated_at) SELECT ?,?,?,?,'queued',?,? WHERE (SELECT COUNT(*) FROM jobs WHERE library_id=? AND status IN ('queued','claimed'))<200",
    )
      .bind(jobId, libraryId, source.url, source.id, now, now, libraryId)
      .run();
    const row = await env.DB.prepare(
      `SELECT ${columns} FROM jobs WHERE library_id=? AND source_id=? AND status IN ('queued','claimed')`,
    )
      .bind(libraryId, source.id)
      .first();
    if (!row) throw new HttpError(409, "job_quota_exceeded");
    if (result.meta.changes) await audit(env, libraryId, "job.approved", jobId);
    return json(row, result.meta.changes ? 201 : 200);
  }
  if (id && request.method === "POST" && ["retry", "cancel"].includes(action ?? "")) {
    await readJson(request, emptySchema);
    const row = await env.DB.prepare("SELECT status FROM jobs WHERE id=? AND library_id=?")
      .bind(id, libraryId)
      .first<{ status: string }>();
    if (!row) throw new HttpError(404, "job_not_found");
    if (action === "retry") {
      if (row.status !== "failed") throw new HttpError(409, "job_not_retryable");
      try {
        await env.DB.prepare(
          "UPDATE jobs SET status='queued',device_id=NULL,lease_id=NULL,lease_until=NULL,error_code=NULL,updated_at=? WHERE id=? AND library_id=? AND status='failed'",
        )
          .bind(Date.now(), id, libraryId)
          .run();
      } catch {
        throw new HttpError(409, "job_already_queued");
      }
    } else {
      if (row.status === "ready") throw new HttpError(409, "job_already_complete");
      await env.DB.prepare(
        "UPDATE jobs SET status='cancelled',lease_until=NULL,lease_id=NULL,updated_at=? WHERE id=? AND library_id=? AND status!='ready'",
      )
        .bind(Date.now(), id, libraryId)
        .run();
    }
    await stopStaleTransfers(env, libraryId);
    await audit(env, libraryId, `job.${action}`, id);
    return json({ status: action === "retry" ? "queued" : "cancelled" });
  }
  throw new HttpError(405, "method_not_allowed");
}

export async function deviceJobs(request: Request, env: Env, actor: Actor, path: string) {
  if (request.method !== "POST") throw new HttpError(405, "method_not_allowed");
  const now = Date.now();
  if (path === "/jobs/claim") {
    await readJson(request, emptySchema);
    const job = await env.DB.prepare(
      `UPDATE jobs SET status='claimed',device_id=?,lease_id=?,lease_until=?,attempts=attempts+1,updated_at=? WHERE id=(SELECT id FROM jobs WHERE library_id=? AND (status='queued' OR (status='claimed' AND lease_until<?)) ORDER BY created_at,id LIMIT 1) AND EXISTS(SELECT 1 FROM devices WHERE id=? AND revoked_at IS NULL AND expires_at>?) RETURNING ${columns}`,
    )
      .bind(
        actor.deviceId,
        crypto.randomUUID(),
        now + LEASE_MS,
        now,
        actor.libraryId,
        now,
        actor.deviceId,
        now,
      )
      .first();
    await stopStaleTransfers(env, actor.libraryId);
    return json({ job });
  }
  const route = /^\/jobs\/([a-f0-9-]{36})\/(heartbeat|complete|fail)$/.exec(path);
  if (!route) throw new HttpError(404, "not_found");
  const [, id, action] = route;
  const input = await readJson(
    request,
    action === "complete" ? finishSchema : action === "fail" ? failSchema : leaseSchema,
  );
  const guard =
    "id=? AND library_id=? AND device_id=? AND status='claimed' AND lease_id=? AND lease_until>? AND EXISTS(SELECT 1 FROM devices WHERE id=? AND revoked_at IS NULL AND expires_at>?)";
  const binds = [
    id,
    actor.libraryId,
    actor.deviceId ?? null,
    input.leaseId,
    now,
    actor.deviceId ?? null,
    now,
  ];
  let result: D1Result | undefined;
  if (action === "heartbeat")
    result = await env.DB.prepare(`UPDATE jobs SET lease_until=?,updated_at=? WHERE ${guard}`)
      .bind(now + LEASE_MS, now, ...binds)
      .run();
  else if (action === "fail" && "errorCode" in input)
    result = await env.DB.prepare(
      `UPDATE jobs SET status='failed',error_code=?,lease_until=NULL,updated_at=? WHERE ${guard}`,
    )
      .bind(input.errorCode, now, ...binds)
      .run();
  else if (action === "complete" && "assetId" in input)
    result = await env.DB.prepare(
      `UPDATE jobs SET status='ready',asset_id=?,error_code=NULL,lease_until=NULL,updated_at=? WHERE ${guard} AND EXISTS(SELECT 1 FROM assets WHERE id=? AND library_id=jobs.library_id AND source_id=jobs.source_id)`,
    )
      .bind(input.assetId, now, ...binds, input.assetId)
      .run();
  if (!result?.meta.changes) throw new HttpError(409, "job_lease_lost");
  if (action === "fail") await stopStaleTransfers(env, actor.libraryId);
  return json({
    status: action === "heartbeat" ? "claimed" : action === "complete" ? "ready" : "failed",
    leaseUntil: now + LEASE_MS,
  });
}
