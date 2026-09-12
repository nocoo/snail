// D1 owns reachability. Object keys are immutable; deleted keys are never reused.
export async function cleanup(env: Env, now = Date.now()) {
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE uploads SET status='cancelled',updated_at=? WHERE status IN ('uploading','completing','verifying') AND expires_at<=?",
    ).bind(now, now),
    env.DB.prepare(
      "UPDATE imports SET status='failed',error_code='transfer_expired',updated_at=? WHERE status='fetching' AND updated_at<?",
    ).bind(now, now - 600_000),
    env.DB.prepare(
      "INSERT OR IGNORE INTO garbage(object_key,delete_after) SELECT object_key,? FROM uploads WHERE status IN ('failed','cancelled')",
    ).bind(now + 300_000),
    env.DB.prepare(
      "INSERT OR IGNORE INTO garbage(object_key,delete_after) SELECT object_key,? FROM imports WHERE status='failed' AND object_key IS NOT NULL",
    ).bind(now + 300_000),
    env.DB.prepare(
      "INSERT OR IGNORE INTO garbage(object_key,delete_after) SELECT object_key,? FROM blobs WHERE created_at<? AND NOT EXISTS(SELECT 1 FROM assets WHERE blob_id=blobs.id)",
    ).bind(now, now - 3600_000),
    env.DB.prepare(
      "DELETE FROM blobs WHERE created_at<? AND NOT EXISTS(SELECT 1 FROM assets WHERE blob_id=blobs.id)",
    ).bind(now - 3600_000),
    env.DB.prepare("DELETE FROM pairings WHERE expires_at<?").bind(now - 86400_000),
    env.DB.prepare("DELETE FROM audit WHERE created_at<?").bind(now - 90 * 86400_000),
    env.DB.prepare("DELETE FROM rate_limits WHERE window<?").bind(
      Math.floor((now - 86400_000) / 600_000),
    ),
  ]);
  const abandoned = (
    await env.DB.prepare(
      "SELECT id,object_key,multipart_id FROM uploads WHERE status IN ('failed','cancelled') LIMIT 50",
    ).all<{ id: string; object_key: string; multipart_id: string }>()
  ).results;
  for (const row of abandoned) {
    // R2 lifecycle also aborts multipart uploads after one day, including crash-before-D1 orphans.
    await env.MEDIA.resumeMultipartUpload(row.object_key, row.multipart_id)
      .abort()
      .catch(() => {});
    await env.DB.prepare(
      "DELETE FROM uploads WHERE id=? AND status IN ('failed','cancelled') AND updated_at<?",
    )
      .bind(row.id, now - 86400_000)
      .run();
  }
  const rows = (
    await env.DB.prepare(
      "SELECT object_key FROM garbage WHERE delete_after<=? ORDER BY delete_after LIMIT 100",
    )
      .bind(now)
      .all<{ object_key: string }>()
  ).results;
  for (const { object_key: key } of rows) {
    const live =
      await env.DB.prepare(`SELECT 1 FROM blobs WHERE object_key=? UNION ALL SELECT 1 FROM assets WHERE poster_key=?
      UNION ALL SELECT 1 FROM uploads WHERE object_key=? AND status IN ('uploading','completing','verifying')
      UNION ALL SELECT 1 FROM imports WHERE object_key=? AND status='fetching' LIMIT 1`)
        .bind(key, key, key, key)
        .first();
    if (live) {
      await env.DB.prepare(
        "DELETE FROM garbage WHERE object_key=? AND (EXISTS(SELECT 1 FROM blobs WHERE object_key=?) OR EXISTS(SELECT 1 FROM assets WHERE poster_key=?))",
      )
        .bind(key, key, key)
        .run();
      continue;
    }
    await env.MEDIA.delete(key);
    await env.DB.prepare("DELETE FROM garbage WHERE object_key=?").bind(key).run();
  }
  await env.DB.batch([
    env.DB.prepare("DELETE FROM uploads WHERE status='ready' AND updated_at<?").bind(
      now - 7 * 86400_000,
    ),
    env.DB.prepare("DELETE FROM imports WHERE status IN ('ready','failed') AND updated_at<?").bind(
      now - 30 * 86400_000,
    ),
    env.DB.prepare("DELETE FROM jobs WHERE status IN ('ready','cancelled') AND updated_at<?").bind(
      now - 90 * 86400_000,
    ),
  ]);
}
