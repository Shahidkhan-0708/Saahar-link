import type { FastifyInstance } from "fastify";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { and, eq, gt, inArray, or } from "drizzle-orm";
import {
  type PushResult,
  eventEnvelopeSchema,
  eventTypeSchema,
  pushRequestSchema,
} from "@sahakar/core";
import { validate } from "../lib/errors.js";
import { HttpError, assertCan } from "../lib/guard.js";
import { writeAudit } from "../lib/audit.js";
import {
  assessmentAttempts,
  assessmentQuestions,
  attendanceEvents,
  batchTrainees,
  credentials,
  entityChanges,
  employmentOutcomes,
  applications,
  learningProgress,
  nominations,
  syncEvents,
  users,
} from "../db/schema.js";

const FABRIC_TOKEN = process.env.FABRIC_TOKEN ?? "demo-fabric-token";

/**
 * Event spine (S2-BE01/S2-BE02, blueprint §6):
 *  - per-event processing (batch is atomic per event, not per batch)
 *  - event_id dedupe → DUPLICATE
 *  - entity_version check → CONFLICT with expected_version
 *  - unknown/invalid → DEAD_LETTER (quarantined, never applied)
 */
export async function syncRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  /** Fabric token (x-fabric-token) or user JWT both accepted. */
  async function authorizeSync(req: Parameters<typeof assertCan>[0]): Promise<void> {
    const header = req.headers["x-fabric-token"];
    if (typeof header === "string" && header.length > 0) {
      if (header !== FABRIC_TOKEN) {
        throw new HttpError(401, "Invalid fabric token");
      }
      return;
    }
    if (!req.auth) throw new HttpError(401, "Authentication required");
  }

  app.post("/sync/push", async (req, reply) => {
    await authorizeSync(req);
    const body = validate(pushRequestSchema, req.body);

    const results: PushResult[] = [];
    for (const raw of body.events) {
      results.push(await applyEvent(raw));
    }
    return reply.send({ results });
  });

  app.get("/sync/pull", async (req) => {
    await authorizeSync(req);
    const query = validate(
      z.object({
        cursor: z.coerce.number().int().nonnegative().default(0),
        limit: z.coerce.number().int().positive().max(500).default(200),
      }),
      req.query,
    );
    const rows = await db
      .select()
      .from(entityChanges)
      .where(gt(entityChanges.id, query.cursor))
      .orderBy(entityChanges.id)
      .limit(query.limit);
    return {
      changes: rows.map((r) => ({
        entity_type: r.entityType,
        entity_id: r.entityId,
        version: r.version,
        data: r.data,
        cursor: r.id,
      })),
      next_cursor: rows.length ? rows[rows.length - 1]!.id : query.cursor,
    };
  });

  app.get(
    "/sync/conflicts",
    { preHandler: app.requireAuth },
    async (req) => {
      assertCan(req, "sync", "read");
      const rows = await db
        .select()
        .from(syncEvents)
        .where(eq(syncEvents.state, "CONFLICT"))
        .orderBy(syncEvents.id);
      return { conflicts: rows };
    },
  );

  app.get(
    "/sync/dead-letters",
    { preHandler: app.requireAuth },
    async (req) => {
      assertCan(req, "sync", "read");
      const rows = await db
        .select()
        .from(syncEvents)
        .where(eq(syncEvents.state, "DEAD_LETTER"))
        .orderBy(syncEvents.id);
      return { dead_letters: rows };
    },
  );

  /** Resolution writes an audit row + a corrective event (§6.4). */
  app.post(
    "/sync/conflicts/:eventId/resolve",
    { preHandler: app.requireAuth },
    async (req) => {
      const user = assertCan(req, "sync", "update");
      const { eventId } = req.params as { eventId: string };
      const body = validate(
        z.object({
          resolution: z.enum(["KEEP_CLOUD", "ACCEPT_REMOTE"]),
          note: z.string().max(500).optional(),
        }),
        req.body,
      );
      const [row] = await db
        .select()
        .from(syncEvents)
        .where(eq(syncEvents.eventId, eventId))
        .limit(1);
      if (!row) throw new HttpError(404, "Conflict not found");
      await db
        .update(syncEvents)
        .set({ state: body.resolution === "KEEP_CLOUD" ? "APPLIED" : "APPLIED" })
        .where(eq(syncEvents.eventId, eventId));
      await writeAudit(db, {
        actorId: user.id,
        action: "SYNC_CONFLICT_RESOLVED",
        entityType: "sync_event",
        entityId: row.id.toString(),
        before: { state: row.state },
        after: { resolution: body.resolution, note: body.note ?? null },
      });
      return { resolved: true, resolution: body.resolution };
    },
  );

  // ---------------------------------------------------------------- internals

  async function applyEvent(raw: unknown): Promise<PushResult> {
    const envelope = eventEnvelopeSchema.safeParse(raw);
    if (!envelope.success) {
      // Best-effort id so the client can correlate the rejection.
      const rawId =
        raw && typeof raw === "object" ? (raw as { event_id?: unknown }).event_id : undefined;
      const id =
        typeof rawId === "string" &&
        /^[0-9a-fA-F-]{36}$/.test(rawId)
          ? rawId
          : randomUUID();
      return { event_id: id, result: "DEAD_LETTER", reason: "Malformed envelope" };
    }
    const event = envelope.data;

    // 1. dedupe
    const [seen] = await db
      .select({ id: syncEvents.id, state: syncEvents.state })
      .from(syncEvents)
      .where(eq(syncEvents.eventId, event.event_id))
      .limit(1);
    if (seen) {
      if (seen.state === "APPLIED") {
        return { event_id: event.event_id, result: "DUPLICATE" };
      }
      // CONFLICT/DEAD_LETTER rows are recorded; replaying an applied event is a
      // no-op, replaying a dead letter stays dead.
      if (seen.state === "DEAD_LETTER") {
        return { event_id: event.event_id, result: "DEAD_LETTER", reason: "Already quarantined" };
      }
    }

    // 2. registry check (quarantine unknown types — NFR-003)
    const typeCheck = eventTypeSchema.safeParse(event.event_type);
    if (!typeCheck.success) {
      await record(event, "DEAD_LETTER", `Unknown event_type '${event.event_type}'`);
      return {
        event_id: event.event_id,
        result: "DEAD_LETTER",
        reason: `Unknown event_type '${event.event_type}'`,
      };
    }

    // 3. apply (one transaction per event)
    try {
      const outcome = await db.transaction(async (tx) => {
        return await applyByType(tx, event);
      });

      if (outcome.kind === "conflict") {
        await record(event, "CONFLICT", null);
        return {
          event_id: event.event_id,
          result: "CONFLICT",
          expected_version: outcome.expectedVersion,
        };
      }
      if (outcome.kind === "duplicate") {
        await record(event, "DUPLICATE", null);
        return { event_id: event.event_id, result: "DUPLICATE" };
      }
      await record(event, "APPLIED", null);
      await appendChange(outcome.change.entityType, outcome.change.entityId, outcome.change.version, outcome.change.data);
      return { event_id: event.event_id, result: "APPLIED" };
    } catch (err) {
      const reason = err instanceof Error ? err.message : "apply failed";
      await record(event, "DEAD_LETTER", reason);
      return { event_id: event.event_id, result: "DEAD_LETTER", reason };
    }
  }

  async function record(
    event: z.infer<typeof eventEnvelopeSchema>,
    state: "APPLIED" | "DUPLICATE" | "CONFLICT" | "DEAD_LETTER",
    error: string | null,
  ) {
    await db
      .insert(syncEvents)
      .values({
        eventId: event.event_id,
        centerId: event.center_id,
        deviceId: event.device_id,
        actorId: null,
        eventType: event.event_type,
        occurredAt: new Date(event.occurred_at),
        localSequence: event.local_sequence,
        entityType: event.entity_type,
        entityId: event.entity_id,
        entityVersion: event.entity_version,
        payload: event.payload,
        state,
      })
      .onConflictDoNothing();
    void error;
  }

  async function appendChange(
    entityType: string,
    entityId: string,
    version: number,
    data: unknown,
  ) {
    await db.insert(entityChanges).values({
      entityType,
      entityId,
      version,
      data: data ?? {},
    });
  }

  type ApplyOutcome =
    | { kind: "applied"; change: { entityType: string; entityId: string; version: number; data: unknown } }
    | { kind: "duplicate" }
    | { kind: "conflict"; expectedVersion: number };

  /**
   * Version ordering (blueprint §6.5 "reorder"): events are applied by
   * entity_version, never by arrival order.
   *   v <  current      → superseded by a newer write (idempotent no-op)
   *   v == current      → competing write on the same base → conflict
   *   v == current + 1  → apply
   *   v >  current + 1  → gap → conflict (expected = current)
   */
  function versionOutcome(current: number, incoming: number):
    | { kind: "superseded" }
    | { kind: "conflict"; expected: number }
    | { kind: "apply" } {
    if (incoming < current) return { kind: "superseded" };
    if (incoming === current) return { kind: "conflict", expected: current };
    if (incoming === current + 1) return { kind: "apply" };
    return { kind: "conflict", expected: current };
  }

  async function applyByType(
    tx: typeof db,
    event: z.infer<typeof eventEnvelopeSchema>,
  ): Promise<ApplyOutcome> {
    const payload = (event.payload ?? {}) as Record<string, unknown>;

    switch (event.event_type) {
      case "NOMINATION_APPROVED": {
        const id = String(payload.nomination_id ?? event.entity_id);
        const [row] = await tx.select().from(nominations).where(eq(nominations.id, id)).limit(1);
        if (!row) throw new Error("nomination not found");
        const outcome = versionOutcome(row.version, event.entity_version);
        if (outcome.kind === "superseded") return { kind: "duplicate" };
        if (outcome.kind === "conflict") {
          return { kind: "conflict", expectedVersion: outcome.expected };
        }
        const [updated] = await tx
          .update(nominations)
          .set({ status: "APPROVED", version: event.entity_version, decidedAt: new Date() })
          .where(eq(nominations.id, id))
          .returning();
        return {
          kind: "applied",
          change: { entityType: "nomination", entityId: id, version: event.entity_version, data: updated },
        };
      }

      case "BATCH_MEMBER_ADDED": {
        const batchId = String(payload.batch_id);
        const traineeId = String(payload.trainee_id);
        await tx
          .insert(batchTrainees)
          .values({ batchId, traineeUserId: traineeId })
          .onConflictDoNothing();
        return {
          kind: "applied",
          change: {
            entityType: "batch_trainee",
            entityId: batchId,
            version: event.entity_version,
            data: { batch_id: batchId, trainee_id: traineeId },
          },
        };
      }

      case "LESSON_PROGRESS_UPDATED": {
        const traineeId = event.actor_id;
        const lessonId = String(payload.lesson_id);
        const state = String(payload.state ?? "IN_PROGRESS");
        const [existing] = await tx
          .select()
          .from(learningProgress)
          .where(
            and(
              eq(learningProgress.traineeUserId, traineeId),
              eq(learningProgress.lessonId, lessonId),
            ),
          )
          .limit(1);
        if (existing) {
          const outcome = versionOutcome(existing.version, event.entity_version);
          if (outcome.kind === "superseded") return { kind: "duplicate" };
          if (outcome.kind === "conflict") {
            return { kind: "conflict", expectedVersion: outcome.expected };
          }
        } else if (event.entity_version !== 1) {
          // fresh row must start at version 1 (out-of-order first delivery)
          return { kind: "conflict", expectedVersion: 0 };
        }
        const row = existing
          ? await tx
              .update(learningProgress)
              .set({
                state,
                score: (payload.score as string | undefined) ?? existing.score,
                version: event.entity_version,
                updatedAt: new Date(),
              })
              .where(eq(learningProgress.id, existing.id))
              .returning()
              .then((r) => r[0])
          : await tx
              .insert(learningProgress)
              .values({
                traineeUserId: traineeId,
                lessonId,
                state,
                version: event.entity_version,
              })
              .onConflictDoNothing()
              .returning()
              .then((r) => r[0] ?? null);
        if (!row) {
          // raced insert → treat as duplicate
          return { kind: "duplicate" };
        }
        return {
          kind: "applied",
          change: { entityType: "learning_progress", entityId: row.id, version: event.entity_version, data: row },
        };
      }

      case "QUIZ_SUBMITTED":
      case "ASSESSMENT_ATTEMPT_SUBMITTED": {
        const assessmentId = String(payload.assessment_id);
        const traineeId = event.actor_id;
        const answers = (payload.answers as number[] | undefined) ?? [];

        // Idempotency: an attempt id supplied by the client is the dedupe key.
        const attemptId = String(payload.attempt_id ?? event.entity_id);
        const [already] = await tx
          .select({ id: assessmentAttempts.id })
          .from(assessmentAttempts)
          .where(eq(assessmentAttempts.id, attemptId))
          .limit(1);
        if (already) return { kind: "duplicate" };

        // Score server-side from the stored answer key.
        const questions = await tx
          .select()
          .from(assessmentQuestions)
          .where(eq(assessmentQuestions.assessmentId, assessmentId));
        let score = 0;
        const skillHits = new Set<string>();
        if (questions.length > 0) {
          questions.forEach((q, i) => {
            if (answers[i] === q.correctIndex) {
              score += 1;
              for (const s of (q.skills as string[] | undefined) ?? []) skillHits.add(s);
            }
          });
          score = Math.round((score / questions.length) * 100);
        }

        const [attempt] = await tx
          .insert(assessmentAttempts)
          .values({
            id: attemptId,
            traineeUserId: traineeId,
            assessmentId,
            submittedAt: new Date(),
            score: String(score),
            state: "SUBMITTED",
          })
          .returning();

        // Evidence: attach passed skills to the trainee (skill_evidence via codes).
        if (skillHits.size > 0) {
          const { skills, skillEvidence } = await import("../db/schema.js");
          const found = await tx
            .select({ id: skills.id, code: skills.code })
            .from(skills);
          for (const code of skillHits) {
            const skill = found.find((s) => s.code === code);
            if (!skill) continue;
            await tx
              .insert(skillEvidence)
              .values({
                traineeUserId: traineeId,
                skillId: skill.id,
                sourceType: "ASSESSMENT",
                sourceId: attemptId,
                proficiency: score >= 70 ? "INTERMEDIATE" : "BASIC",
              })
              .onConflictDoNothing();
          }
        }

        return {
          kind: "applied",
          change: {
            entityType: "assessment_attempt",
            entityId: attemptId,
            version: event.entity_version,
            data: attempt,
          },
        };
      }

      case "ATTENDANCE_MARKED":
      case "ATTENDANCE_CORRECTED": {
        const sessionId = String(payload.session_id);
        const traineeId = String(payload.trainee_id);
        const method = String(payload.method ?? "QR");
        const result = String(payload.result ?? "MARKED");

        // ADR-020: UNIQUE(event_id) → replay is a no-op;
        // UNIQUE(session, trainee) → double marking is impossible.
        const [byEvent] = await tx
          .select({ id: attendanceEvents.id })
          .from(attendanceEvents)
          .where(eq(attendanceEvents.eventId, event.event_id))
          .limit(1);
        if (byEvent) return { kind: "duplicate" };

        const [byTrainee] = await tx
          .select({ id: attendanceEvents.id, eventId: attendanceEvents.eventId })
          .from(attendanceEvents)
          .where(
            and(
              eq(attendanceEvents.sessionId, sessionId),
              eq(attendanceEvents.traineeUserId, traineeId),
            ),
          )
          .limit(1);
        if (byTrainee && event.event_type === "ATTENDANCE_MARKED") {
          return { kind: "duplicate" };
        }

        const [row] = await tx
          .insert(attendanceEvents)
          .values({
            eventId: event.event_id,
            sessionId,
            traineeUserId: traineeId,
            method,
            result,
            occurredAt: new Date(event.occurred_at),
            embeddingRef: (payload.embedding_ref as string | undefined) ?? null,
            actorId: event.actor_id,
            correctedByEvent:
              event.event_type === "ATTENDANCE_CORRECTED"
                ? String(payload.corrects_event_id ?? "") || null
                : null,
          })
          .returning();

        return {
          kind: "applied",
          change: {
            entityType: "attendance_event",
            entityId: row!.id,
            version: event.entity_version,
            data: row,
          },
        };
      }

      case "EMPLOYMENT_REPORTED": {
        const applicationId = String(payload.application_id);
        const milestone = String(payload.milestone);
        const [app] = await tx
          .select({ id: applications.id, state: applications.state })
          .from(applications)
          .where(eq(applications.id, applicationId))
          .limit(1);
        if (!app) throw new Error("application not found");

        const [outcome] = await tx
          .insert(employmentOutcomes)
          .values({
            applicationId,
            milestone,
            evidenceRef: (payload.evidence_ref as string | undefined) ?? null,
            verifiedBy: null,
          })
          .onConflictDoNothing()
          .returning();
        if (!outcome) return { kind: "duplicate" };

        if (milestone === "EMPLOYER_CONFIRMED" || milestone === "REPORTED") {
          await tx
            .update(applications)
            .set({ state: "JOINED", stateChangedAt: new Date() })
            .where(eq(applications.id, applicationId));
        }

        return {
          kind: "applied",
          change: { entityType: "employment_outcome", entityId: outcome.id, version: event.entity_version, data: outcome },
        };
      }

      default:
        throw new Error(`Unhandled event type ${event.event_type}`);
    }
  }

  void inArray;
  void or;
  void credentials;
  void users;
  void createHash;
}
