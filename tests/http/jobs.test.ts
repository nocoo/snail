import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHarness, pairDevice } from "./harness";

const source = "https://x.com/snail_test/status/2000000000000000001";
describe("approved jobs, leases and offline recovery", () => {
  let h: Awaited<ReturnType<typeof createHarness>>;
  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h?.dispose();
  });
  const create = (url = source) =>
    h.request("/api/jobs", { method: "POST", body: JSON.stringify({ url, approved: true }) });
  it("normalizes links, requires rights approval and deduplicates queued work", async () => {
    expect(
      (
        await h.request("/api/jobs", {
          method: "POST",
          body: JSON.stringify({ url: source, approved: false }),
        })
      ).status,
    ).toBe(400);
    const response = await create(`${source}?s=46`);
    expect(response.status).toBe(201);
    const job = (await response.json()) as { id: string; sourceUrl: string };
    expect(job.sourceUrl).toBe(source);
    const duplicate = (await (await create()).json()) as { id: string };
    expect(duplicate.id).toBe(job.id);
    expect(await (await h.request("/api/jobs", {}, "user-b")).json()).toEqual([]);
    expect((await create("https://127.0.0.1/status/2000000000000000001")).status).toBe(400);
    expect(
      (
        await h.request("/api/jobs", {
          method: "POST",
          body: JSON.stringify({ url: source, approved: true, cookies: "fake" }),
        })
      ).status,
    ).toBe(400);
  });
  it("claims once, fences expired leases, and recovers without a browser session in the daemon", async () => {
    const a = await pairDevice(h),
      b = await pairDevice(h);
    const readOnly = await pairDevice(h, ["jobs:read"]);
    expect((await readOnly.request("/jobs/claim", {})).status).toBe(403);
    const first = await a.request("/jobs/claim", {});
    expect(first.status).toBe(200);
    const claim = (await first.json()) as {
      job: { id: string; leaseId: string; sourceUrl: string };
    };
    expect(claim.job.sourceUrl).toBe(source);
    expect(await (await b.request("/jobs/claim", {})).json()).toEqual({ job: null });
    await h.db.prepare("UPDATE jobs SET lease_until=0 WHERE id=?").bind(claim.job.id).run();
    const recovered = (await (await b.request("/jobs/claim", {})).json()) as {
      job: { id: string; leaseId: string; sourceUrl: string };
    };
    expect(recovered.job.id).toBe(claim.job.id);
    expect(recovered.job.leaseId).not.toBe(claim.job.leaseId);
    expect(
      (await a.request(`/jobs/${claim.job.id}/heartbeat`, { leaseId: claim.job.leaseId })).status,
    ).toBe(409);
    expect(
      (await b.request(`/jobs/${claim.job.id}/heartbeat`, { leaseId: recovered.job.leaseId }))
        .status,
    ).toBe(200);
    expect(
      (
        await b.request(`/jobs/${claim.job.id}/fail`, {
          leaseId: recovered.job.leaseId,
          errorCode: "needs_login",
        })
      ).status,
    ).toBe(200);
    expect(
      (await h.request(`/api/jobs/${claim.job.id}/retry`, { method: "POST", body: "{}" })).status,
    ).toBe(200);
  });
  it("cancellation and device revocation reject late results and keep jobs isolated", async () => {
    const a = await pairDevice(h);
    const claimed = (await (await a.request("/jobs/claim", {})).json()) as {
      job: { id: string; leaseId: string; sourceUrl: string };
    };
    expect(
      (
        await h.request(
          `/api/jobs/${claimed.job.id}/cancel`,
          { method: "POST", body: "{}" },
          "user-b",
        )
      ).status,
    ).toBe(404);
    expect(
      (await h.request(`/api/jobs/${claimed.job.id}/cancel`, { method: "POST", body: "{}" }))
        .status,
    ).toBe(200);
    expect(
      (await a.request(`/jobs/${claimed.job.id}/heartbeat`, { leaseId: claimed.job.leaseId }))
        .status,
    ).toBe(409);
    const made = (await (
      await create("https://x.com/snail_test/status/2000000000000000002")
    ).json()) as { id: string };
    await a.request("/jobs/claim", {});
    await h.request(`/api/devices/${a.deviceId}`, { method: "DELETE" });
    expect((await a.request("/jobs/claim", {})).status).toBe(401);
    const b = await pairDevice(h);
    const recovered = (await (await b.request("/jobs/claim", {})).json()) as {
      job: { id: string };
    };
    expect(recovered.job.id).toBe(made.id);
  });
  it("reclaim and cancellation stop stale transfers and queue their objects for cleanup", async () => {
    const subject = "job-cleanup-user";
    const a = await pairDevice(h, ["media:write", "jobs:read"], subject);
    const b = await pairDevice(h, ["media:write", "jobs:read"], subject);
    const made = (await (
      await h.request(
        "/api/jobs",
        {
          method: "POST",
          body: JSON.stringify({ url: source, approved: true }),
        },
        subject,
      )
    ).json()) as { id: string };
    const first = (await (await a.request("/jobs/claim", {})).json()) as {
      job: { id: string; leaseId: string };
    };
    const input = {
      title: "Lease test",
      approved: true,
      mime: "video/mp4",
      size: 2048,
      sha256: "0".repeat(64),
      source: { id: "2000000000000000001", mediaId: "2000000000000000002", url: source },
      job: { id: first.job.id, leaseId: first.job.leaseId },
    };
    const uploading = (await (await a.request("/uploads", input)).json()) as { id: string };
    await h.db.prepare("UPDATE jobs SET lease_until=0 WHERE id=?").bind(made.id).run();
    const next = (await (await b.request("/jobs/claim", {})).json()) as {
      job: { id: string; leaseId: string };
    };
    expect(
      (
        await h.db
          .prepare("SELECT status FROM uploads WHERE id=?")
          .bind(uploading.id)
          .first<{ status: string }>()
      )?.status,
    ).toBe("cancelled");
    expect((await a.request(`/uploads/${uploading.id}/complete`, {})).status).toBe(409);
    const active = (await (
      await b.request("/uploads", { ...input, job: { id: next.job.id, leaseId: next.job.leaseId } })
    ).json()) as { id: string };
    expect(active.id).toBeDefined();
    expect(active.id).not.toBe(uploading.id);
    await h.request(`/api/jobs/${made.id}/cancel`, { method: "POST", body: "{}" }, subject);
    expect(
      (
        await h.db
          .prepare("SELECT status FROM uploads WHERE id=?")
          .bind(active.id)
          .first<{ status: string }>()
      )?.status,
    ).toBe("cancelled");
    expect(
      (
        await h.db
          .prepare(
            "SELECT COUNT(*) AS n FROM garbage WHERE object_key IN (SELECT object_key FROM uploads WHERE job_id=?)",
          )
          .bind(made.id)
          .first<{ n: number }>()
      )?.n,
    ).toBe(2);
  });
});
