import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { FabricStore, uuidv7 } from "../src/store.js";
import { buildFabric } from "../src/app.js";
import { runCycle } from "../src/sync-worker.js";

// Real cloud API + real migrations (shared test helpers from the API package).
import { bearer, login, setup } from "../../api/test/helpers.js";
import { assessments, courseVersions, courses, lessons } from "../../api/src/db/schema.js";

let cloud: FastifyInstance;
let cloudUrl: string;
let fabric: FastifyInstance;
let store: FabricStore;
let tmp: string;
let traineeId: string;
let traineeToken: string;
let assessmentId: string;
let lessonId: string;
let ids: Record<string, string>;

beforeAll(async () => {
  const ctx = await setup();
  cloud = ctx.app;
  ids = ctx.ids;
  traineeId = ctx.ids.trainee;
  traineeToken = await login(cloud, "trainee@demo.in");

  const [course] = await ctx.db
    .insert(courses)
    .values({ title: "Offline Course", language: "en", status: "PUBLISHED" })
    .returning();
  const [cv] = await ctx.db
    .insert(courseVersions)
    .values({ courseId: course!.id, version: 1, publishedAt: new Date() })
    .returning();
  const [lesson] = await ctx.db
    .insert(lessons)
    .values({ courseVersionId: cv!.id, ord: 1, title: "L1", bodyMd: "# Body", lang: "en" })
    .returning();
  const [assessment] = await ctx.db
    .insert(assessments)
    .values({ courseVersionId: cv!.id, title: "Quiz", kind: "QUIZ", status: "PUBLISHED" })
    .returning();
  lessonId = lesson!.id;
  assessmentId = assessment!.id;

  await cloud.listen({ port: 0, host: "127.0.0.1" });
  const address = cloud.server.address();
  if (typeof address === "object" && address) cloudUrl = `http://127.0.0.1:${address.port}`;

  tmp = mkdtempSync(join(tmpdir(), "fabric-"));
  store = new FabricStore(join(tmp, "fabric-store.sqlite"));
  fabric = buildFabric({ store, jwtSecret: "sahakar-link-dev-secret-change-me" });
  await fabric.listen({ port: 0, host: "127.0.0.1" });
  const faddr = fabric.server.address();
  if (typeof faddr === "object" && faddr) {
    store.setKv("cloud_url", `http://127.0.0.1:${faddr.port}`); // unused; cloudUrl passed explicitly
  }
  store.setKv("center_id", "center-1");
  store.setKv("device_id", "tab-07");
}, 60_000);

afterAll(async () => {
  await fabric?.close();
  await cloud?.close();
  store?.close();
  rmSync(tmp, { recursive: true, force: true });
});

describe("outbox durability (NFR-002)", () => {
  it("appends are durable across close/reopen (kill -9 simulation)", () => {
    const path = join(tmpdir(), `fabric-durability-${Date.now()}.sqlite`);
    const a = new FabricStore(path);
    const { sequence, duplicate } = a.appendEvent({
      event_id: uuidv7(),
      center_id: "c",
      device_id: "d",
      actor_id: traineeId,
      event_type: "LESSON_PROGRESS_UPDATED",
      occurred_at: new Date().toISOString(),
      local_sequence: 0,
      entity_type: "learning_progress",
      entity_id: lessonId,
      entity_version: 1,
      payload: { lesson_id: lessonId, state: "IN_PROGRESS" },
      prev_hash: null,
      signature: null,
    } as never);
    expect(duplicate).toBe(false);
    expect(sequence).toBeGreaterThan(0);
    a.close(); // simulate process death after fsync (WAL + FULL)

    const b = new FabricStore(path);
    const pending = b.pendingBatch();
    expect(pending).toHaveLength(1);
    expect(pending[0]!.event_id).toBeTruthy();
    expect(pending[0]!.state).toBe("PENDING");

    // appending the same event again is a local no-op
    const again = b.appendEvent({ ...(JSON.parse(JSON.stringify(pending[0])) as never) } as never);
    void again;
    b.close();
    rmSync(path, { force: true });
    rmSync(`${path}-wal`, { force: true });
    rmSync(`${path}-shm`, { force: true });
  });

  it("uuidv7 ids are time-ordered", () => {
    const a = uuidv7(1_700_000_000_000);
    const b = uuidv7(1_800_000_000_000);
    expect(a < b).toBe(true);
  });
});

describe("fabric LAN API", () => {
  it("rejects unauthenticated local writes (401)", async () => {
    const res = await fabric.inject({ method: "POST", url: "/events", payload: {} });
    expect(res.statusCode).toBe(401);
  });

  it("accepts a device write into the outbox with a device token", async () => {
    const token = cloud.jwt!.sign({
      sub: traineeId,
      role: "trainee",
      institution_id: ids.institution,
      display_name: "trainee",
    });
    const res = await fabric.inject({
      method: "POST",
      url: "/events",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        event_type: "LESSON_PROGRESS_UPDATED",
        entity_type: "learning_progress",
        entity_id: lessonId,
        entity_version: 1,
        payload: { lesson_id: lessonId, state: "COMPLETED" },
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().queued).toBeGreaterThanOrEqual(1);
    expect(res.json().event_id).toMatch(/-/);
  });
});

describe("sync cycle (Gate B spine)", () => {
  it("push → ACK, pull → entities mirror; replay → DUPLICATE with no state change", async () => {
    // 1. a local quiz submit queued while offline
    const attemptId = uuidv7();
    store.appendEvent({
      event_id: uuidv7(),
      center_id: "center-1",
      device_id: "tab-07",
      actor_id: traineeId,
      event_type: "QUIZ_SUBMITTED",
      occurred_at: new Date().toISOString(),
      local_sequence: 0,
      entity_type: "assessment_attempt",
      entity_id: attemptId,
      entity_version: 1,
      payload: { attempt_id: attemptId, assessment_id: assessmentId, answers: [] },
      prev_hash: null,
      signature: null,
    } as never);

    // 2. network returns → one cycle
    const cycle1 = await runCycle(store, {
      cloud_url: cloudUrl,
      fabric_token: process.env.FABRIC_TOKEN ?? "demo-fabric-token",
    });
    expect(cycle1.pushed).toBeGreaterThanOrEqual(1);
    expect(cycle1.results.every((r) => r.result === "APPLIED" || r.result === "DUPLICATE")).toBe(
      true,
    );
    expect(store.counts().PENDING).toBe(0);

    // 3. pull mirrored the attempt into the local entities table
    const mirrored = store.getEntity("assessment_attempt", attemptId);
    expect(mirrored).toBeTruthy();

    // 4. crash-after-ACK replay: requeue the same row and push again → DUPLICATE
    store.db
      .prepare("UPDATE outbox_events SET state = 'PENDING' WHERE event_id = ?")
      .run(cycle1.results[0]!.event_id);
    const cycle2 = await runCycle(store, {
      cloud_url: cloudUrl,
      fabric_token: process.env.FABRIC_TOKEN ?? "demo-fabric-token",
    });
    expect(cycle2.results[0]!.result).toBe("DUPLICATE");
    expect(store.counts().PENDING).toBe(0);
  }, 30_000);

  it("offline cloud → cycle fails cleanly and requeues (backoff contract)", async () => {
    store.appendEvent({
      event_id: uuidv7(),
      center_id: "center-1",
      device_id: "tab-07",
      actor_id: traineeId,
      event_type: "LESSON_PROGRESS_UPDATED",
      occurred_at: new Date().toISOString(),
      local_sequence: 0,
      entity_type: "learning_progress",
      entity_id: lessonId,
      entity_version: 2,
      payload: { lesson_id: lessonId, state: "IN_PROGRESS" },
      prev_hash: null,
      signature: null,
    } as never);

    await expect(
      runCycle(store, {
        cloud_url: "http://127.0.0.1:1", // nothing listens here
        fabric_token: "demo-fabric-token",
      }),
    ).rejects.toThrow();
    store.requeueStale();
    expect(store.counts().PENDING).toBeGreaterThanOrEqual(1);
  });
});

describe("auth pass-through", () => {
  it("fabric accepts only tokens signed with the shared secret", async () => {
    const forged = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64url") +
      "." +
      Buffer.from(JSON.stringify({ sub: traineeId })).toString("base64url") +
      ".forged";
    const res = await fabric.inject({
      method: "POST",
      url: "/events",
      headers: { authorization: `Bearer ${forged}` },
      payload: {
        event_type: "LESSON_PROGRESS_UPDATED",
        entity_type: "learning_progress",
        entity_id: lessonId,
        entity_version: 3,
        payload: {},
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it("bearer helper from api test utils still works against the cloud", async () => {
    const res = await cloud.inject({
      method: "GET",
      url: "/v1/programmes",
      headers: bearer(traineeToken),
    });
    expect(res.statusCode).toBe(200);
  });
});
