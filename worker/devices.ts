import { z } from "zod";
import { digest, randomToken } from "./auth";
import { importSchema } from "./contracts";
import { HttpError, json, readJson } from "./http";
import { relayImport } from "./relay";
import { audit, rateLimit } from "./store";
import { type Actor, createUpload, savePoster, uploadRoute } from "./uploads";

export const scopes = ["library:read", "media:write", "jobs:read"] as const;
const scopeSchema = z
  .array(z.enum(scopes))
  .min(1)
  .max(3)
  .refine((items) => new Set(items).size === items.length);
const pairingSchema = z
  .object({ name: z.string().trim().min(1).max(80), scopes: scopeSchema })
  .strict();
const approveSchema = z
  .object({ userCode: z.string().regex(/^[A-F0-9]{4}-[A-F0-9]{4}$/), scopes: scopeSchema })
  .strict();
const exchangeSchema = z
  .object({ deviceCode: z.string().regex(/^snail_pair_[a-f0-9]{64}$/) })
  .strict();
const heartbeatSchema = z
  .object({
    checkpoint: z
      .string()
      .max(128)
      .regex(/^[a-zA-Z0-9_.:-]*$/)
      .optional(),
    version: z.string().max(30).optional(),
    state: z.enum(["idle", "syncing", "offline", "needs_login"]).optional(),
  })
  .strict();
interface Pairing {
  id: string;
  name: string;
  user_code: string;
  requested_scopes: string;
  approved_scopes: string | null;
  library_id: string | null;
  state: string;
  expires_at: number;
}
interface Device {
  id: string;
  library_id: string;
  scopes: string;
  expires_at: number;
  revoked_at: number | null;
}

export async function publicPairing(request: Request, env: Env) {
  await rateLimit(
    env,
    `pair:${await digest(request.headers.get("cf-connecting-ip") ?? "unknown")}`,
    30,
    600_000,
  );
  const path = new URL(request.url).pathname;
  if (path === "/api/connector-pairings" && request.method === "POST") {
    const input = await readJson(request, pairingSchema);
    const deviceCode = randomToken("snail_pair");
    const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) =>
      b.toString(16).padStart(2, "0"),
    )
      .join("")
      .toUpperCase();
    const userCode = `${hex.slice(0, 4)}-${hex.slice(4)}`;
    const now = Date.now();
    await env.DB.prepare(
      "INSERT INTO pairings(id,device_code_hash,user_code,name,requested_scopes,state,expires_at,created_at) VALUES (?,?,?,?,?,'pending',?,?)",
    )
      .bind(
        crypto.randomUUID(),
        await digest(deviceCode),
        userCode,
        input.name,
        JSON.stringify(input.scopes),
        now + 600_000,
        now,
      )
      .run();
    return json(
      {
        deviceCode,
        userCode,
        verificationUri: `${env.APP_ORIGIN}/connect?code=${userCode}`,
        expiresIn: 600,
        interval: 5,
      },
      201,
    );
  }
  if (path === "/api/connector-pairings/exchange" && request.method === "POST") {
    const input = await readJson(request, exchangeSchema);
    const codeHash = await digest(input.deviceCode);
    const pending = await env.DB.prepare("SELECT * FROM pairings WHERE device_code_hash=?")
      .bind(codeHash)
      .first<Pairing>();
    if (
      !pending ||
      pending.expires_at <= Date.now() ||
      ["consumed", "denied"].includes(pending.state)
    )
      throw new HttpError(410, "pairing_expired");
    if (pending.state === "pending") throw new HttpError(428, "approval_pending");
    const claimed = await env.DB.prepare(
      "UPDATE pairings SET state='consumed' WHERE device_code_hash=? AND state='approved' AND expires_at>? RETURNING *",
    )
      .bind(codeHash, Date.now())
      .first<Pairing>();
    if (!claimed?.library_id || !claimed.approved_scopes)
      throw new HttpError(410, "pairing_consumed");
    const token = randomToken("snail_device");
    const deviceId = crypto.randomUUID();
    const expiresAt = Date.now() + 30 * 86400_000;
    await env.DB.prepare(
      "INSERT INTO devices(id,library_id,name,token_hash,scopes,expires_at,created_at) VALUES (?,?,?,?,?,?,?)",
    )
      .bind(
        deviceId,
        claimed.library_id,
        claimed.name,
        await digest(token),
        claimed.approved_scopes,
        expiresAt,
        Date.now(),
      )
      .run();
    await audit(env, claimed.library_id, "device.paired", deviceId, deviceId);
    return json({ deviceId, token, expiresAt, scopes: JSON.parse(claimed.approved_scopes) });
  }
  throw new HttpError(405, "method_not_allowed");
}

export async function approvePairing(request: Request, env: Env, libraryId: string) {
  const input = await readJson(request, approveSchema);
  const pending = await env.DB.prepare(
    "SELECT * FROM pairings WHERE user_code=? AND state='pending' AND expires_at>?",
  )
    .bind(input.userCode, Date.now())
    .first<Pairing>();
  if (!pending) throw new HttpError(404, "pairing_not_found");
  const requested = JSON.parse(pending.requested_scopes) as string[];
  if (input.scopes.some((scope) => !requested.includes(scope)))
    throw new HttpError(400, "scope_not_requested");
  const result = await env.DB.prepare(
    "UPDATE pairings SET state='approved',library_id=?,approved_scopes=? WHERE id=? AND state='pending'",
  )
    .bind(libraryId, JSON.stringify(input.scopes), pending.id)
    .run();
  if (!result.meta.changes) throw new HttpError(409, "pairing_already_approved");
  await audit(env, libraryId, "pairing.approved", pending.id);
  return json({ approved: true, name: pending.name, scopes: input.scopes });
}

export async function previewPairing(env: Env, userCode: string) {
  if (!/^[A-F0-9]{4}-[A-F0-9]{4}$/.test(userCode)) throw new HttpError(400, "invalid_code");
  const row = await env.DB.prepare(
    "SELECT name,requested_scopes,expires_at FROM pairings WHERE user_code=? AND state='pending' AND expires_at>?",
  )
    .bind(userCode, Date.now())
    .first<{ name: string; requested_scopes: string; expires_at: number }>();
  if (!row) throw new HttpError(404, "pairing_not_found");
  return json({
    name: row.name,
    scopes: JSON.parse(row.requested_scopes),
    expiresAt: row.expires_at,
  });
}

export async function listDevices(env: Env, libraryId: string) {
  const rows = (
    await env.DB.prepare(
      "SELECT id,name,scopes,expires_at AS expiresAt,revoked_at AS revokedAt,last_seen_at AS lastSeenAt,created_at AS createdAt,cursor AS checkpoint FROM devices WHERE library_id=? ORDER BY created_at DESC",
    )
      .bind(libraryId)
      .all<{ scopes: string }>()
  ).results;
  return rows.map((row) => ({ ...row, scopes: JSON.parse(row.scopes) }));
}

export async function revokeDevice(env: Env, libraryId: string, id: string) {
  const result = await env.DB.prepare("UPDATE devices SET revoked_at=? WHERE id=? AND library_id=?")
    .bind(Date.now(), id, libraryId)
    .run();
  if (!result.meta.changes) throw new HttpError(404, "device_not_found");
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE uploads SET status='cancelled',updated_at=? WHERE device_id=? AND status IN ('uploading','completing','verifying')",
    ).bind(Date.now(), id),
    env.DB.prepare(
      "UPDATE jobs SET status='queued',device_id=NULL,lease_until=NULL,updated_at=? WHERE device_id=? AND status='claimed'",
    ).bind(Date.now(), id),
  ]);
  await audit(env, libraryId, "device.revoked", id, id);
  return json({ revoked: true });
}

export async function authenticateDevice(
  request: Request,
  env: Env,
): Promise<Actor & { scopes: string[] }> {
  const header = request.headers.get("authorization") ?? "";
  if (!/^Bearer snail_device_[a-f0-9]{64}$/.test(header))
    throw new HttpError(401, "device_authentication_required");
  const device = await env.DB.prepare(
    "SELECT id,library_id,scopes,expires_at,revoked_at FROM devices WHERE token_hash=?",
  )
    .bind(await digest(header.slice(7)))
    .first<Device>();
  if (!device || device.revoked_at !== null || device.expires_at <= Date.now())
    throw new HttpError(401, "device_revoked");
  await rateLimit(env, `device:${device.id}`, 240);
  return { libraryId: device.library_id, deviceId: device.id, scopes: JSON.parse(device.scopes) };
}

export async function deviceRoute(request: Request, env: Env) {
  const actor = await authenticateDevice(request, env);
  const path = new URL(request.url).pathname.slice("/api/connectors/me".length);
  const requireScope = (scope: string) => {
    if (!actor.scopes.includes(scope)) throw new HttpError(403, "scope_required");
  };
  if (path === "/heartbeat" && request.method === "POST") {
    const input = await readJson(request, heartbeatSchema);
    await env.DB.prepare(
      "UPDATE devices SET last_seen_at=?,cursor=COALESCE(?,cursor) WHERE id=? AND revoked_at IS NULL",
    )
      .bind(Date.now(), input.checkpoint ?? null, actor.deviceId)
      .run();
    return json({ connected: true, serverTime: Date.now() });
  }
  if (path === "/revoke" && request.method === "POST")
    return revokeDevice(env, actor.libraryId, actor.deviceId as string);
  if (path === "/rotate" && request.method === "POST") {
    const token = randomToken("snail_device");
    const expiresAt = Date.now() + 30 * 86400_000;
    await env.DB.prepare(
      "UPDATE devices SET token_hash=?,expires_at=? WHERE id=? AND revoked_at IS NULL",
    )
      .bind(await digest(token), expiresAt, actor.deviceId)
      .run();
    await audit(env, actor.libraryId, "device.rotated", actor.deviceId, actor.deviceId);
    return json({ token, expiresAt });
  }
  if (path === "/assets" && request.method === "GET") {
    requireScope("library:read");
    const items = (
      await env.DB.prepare(
        "SELECT id,title,source_id AS sourceId,media_id AS mediaId FROM assets WHERE library_id=? ORDER BY created_at DESC LIMIT 100",
      )
        .bind(actor.libraryId)
        .all()
    ).results;
    return json({ items });
  }
  if (path === "/imports" && request.method === "POST") {
    requireScope("media:write");
    const input = await readJson(request, importSchema);
    return relayImport(request, env, actor, input);
  }
  if (path === "/uploads" && request.method === "POST") {
    requireScope("media:write");
    return createUpload(request, env, actor);
  }
  const upload = /^\/uploads\/([a-f0-9-]{36})(?:\/(parts|complete)(?:\/(\d+))?)?$/.exec(path);
  if (upload) {
    requireScope("media:write");
    return uploadRoute(request, env, actor, upload[1], upload[2], upload[3]);
  }
  const poster = /^\/assets\/([a-f0-9-]{36})\/poster$/.exec(path);
  if (poster && request.method === "PUT") {
    requireScope("media:write");
    return savePoster(request, env, actor, poster[1]);
  }
  throw new HttpError(404, "not_found");
}
