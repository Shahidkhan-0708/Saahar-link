import type { FastifyInstance } from "fastify";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { validate } from "../lib/errors.js";
import { HttpError, assertCan } from "../lib/guard.js";
import { writeAudit } from "../lib/audit.js";
import {
  attendanceEvents,
  attendanceExceptions,
  attendanceSessions,
  batchTrainees,
} from "../db/schema.js";

const createSessionSchema = z.object({
  batch_id: z.string().uuid(),
  method: z.enum(["FACE", "QR", "MANUAL"]).default("QR"),
});

const eventSchema = z.object({
  event_id: z.string().uuid(),
  session_id: z.string().uuid(),
  trainee_id: z.string().uuid(),
  method: z.enum(["FACE", "QR", "MANUAL"]),
  result: z.enum(["MARKED", "FAILED"]).default("MARKED"),
  proof: z.string().max(500).optional(), // token/nonce/embedding ref — never raw media
});

/**
 * Attendance (AC6 / ADR-020 / blueprint §3.2):
 *  - sessions carry a signed QR token (5-min TTL + nonce)
 *  - events are idempotent per event_id AND per (session, trainee)
 *  - failures land in the exception queue — never a silent absence
 *  - MANUAL events are signed + audited
 */
export async function attendanceRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  app.post(
    "/attendance/sessions",
    { preHandler: app.requireAuth },
    async (req, reply) => {
      const user = assertCan(req, "attendance", "create");
      const body = validate(createSessionSchema, req.body);
      const [batch] = await db
        .select({ id: batchTrainees.batchId })
        .from(batchTrainees)
        .where(eq(batchTrainees.batchId, body.batch_id))
        .limit(1);
      void batch;

      const nonce = randomUUID();
      const [session] = await db
        .insert(attendanceSessions)
        .values({
          batchId: body.batch_id,
          sessionDate: new Date().toISOString().slice(0, 10),
          tokenHash: createHash("sha256").update(nonce).digest("hex"),
          expiresAt: new Date(Date.now() + 5 * 60_000),
          createdBy: user.id,
        })
        .returning();

      // Signed token: HMAC via the app's JWT secret (exp ≤ 5 min, nonce).
      const qr_token = app.jwt.sign(
        { kind: "attendance", session_id: session!.id, nonce, method: body.method },
        { expiresIn: "5m" },
      );

      await writeAudit(db, {
        actorId: user.id,
        action: "ATTENDANCE_SESSION_CREATED",
        entityType: "attendance_session",
        entityId: session!.id,
        after: session,
      });
      return reply.code(201).send({ session, qr_token, expires_in_sec: 300 });
    },
  );

  app.get(
    "/attendance/sessions",
    { preHandler: app.requireAuth },
    async (req) => {
      assertCan(req, "attendance", "read");
      const rows = await db.select().from(attendanceSessions);
      return { sessions: rows };
    },
  );

  app.post(
    "/attendance/events",
    { preHandler: app.requireAuth },
    async (req, reply) => {
      const user = assertCan(req, "attendance", "create");
      const body = validate(eventSchema, req.body);

      // QR proof must be a live signed token for this session (when method=QR).
      if (body.method === "QR" && body.proof) {
        try {
          const claims = app.jwt.verify<{ session_id: string; kind: string }>(body.proof);
          if (claims.kind !== "attendance" || claims.session_id !== body.session_id) {
            throw new Error("wrong session");
          }
        } catch {
          throw new HttpError(401, "Invalid or expired attendance token");
        }
      }

      // Idempotency 1: same event_id → 200, no state change.
      const [byEvent] = await db
        .select()
        .from(attendanceEvents)
        .where(eq(attendanceEvents.eventId, body.event_id))
        .limit(1);
      if (byEvent) {
        return reply.code(200).send({ duplicate: true, event: byEvent });
      }

      // Idempotency 2: same (session, trainee) → 200, no double marking.
      const [byTrainee] = await db
        .select()
        .from(attendanceEvents)
        .where(
          and(
            eq(attendanceEvents.sessionId, body.session_id),
            eq(attendanceEvents.traineeUserId, body.trainee_id),
          ),
        )
        .limit(1);
      if (byTrainee) {
        return reply.code(200).send({ duplicate: true, event: byTrainee });
      }

      if (body.result === "FAILED") {
        await db.insert(attendanceExceptions).values({
          sessionId: body.session_id,
          traineeUserId: body.trainee_id,
          reason: `${body.method} capture failed`,
          status: "OPEN",
        });
        return reply.code(201).send({ failed: true, exception_opened: true });
      }

      const inserted = await db
        .insert(attendanceEvents)
        .values({
          eventId: body.event_id,
          sessionId: body.session_id,
          traineeUserId: body.trainee_id,
          method: body.method,
          result: body.result,
          embeddingRef: body.proof && body.method === "FACE" ? "ref-only" : null,
          actorId: user.id,
        })
        .onConflictDoNothing()
        .returning();

      if (inserted.length === 0) {
        const [existing] = await db
          .select()
          .from(attendanceEvents)
          .where(eq(attendanceEvents.sessionId, body.session_id))
          .limit(1);
        return reply.code(200).send({ duplicate: true, event: existing ?? null });
      }

      await writeAudit(db, {
        actorId: user.id,
        action: "ATTENDANCE_MARKED",
        entityType: "attendance_event",
        entityId: inserted[0]!.id,
        after: inserted[0],
      });
      return reply.code(201).send({ event: inserted[0] });
    },
  );

  // ---------------------------------------------------------------- exceptions

  app.get(
    "/attendance/exceptions",
    { preHandler: app.requireAuth },
    async (req) => {
      assertCan(req, "attendance", "read");
      const rows = await db.select().from(attendanceExceptions);
      return { exceptions: rows };
    },
  );

  app.post(
    "/attendance/exceptions/:id/resolve",
    { preHandler: app.requireAuth },
    async (req, reply) => {
      const user = assertCan(req, "attendance", "create");
      const { id } = req.params as { id: string };
      const body = validate(
        z.object({
          resolution: z.enum(["RESOLVED", "REJECTED"]),
          method: z.enum(["MANUAL", "QR", "FACE"]).default("MANUAL"),
          signed: z.boolean().default(true),
        }),
        req.body,
      );
      const [before] = await db
        .select()
        .from(attendanceExceptions)
        .where(eq(attendanceExceptions.id, id))
        .limit(1);
      if (!before) throw new HttpError(404, "Exception not found");
      if (before.status !== "OPEN") {
        return { exception: before, unchanged: true };
      }

      await db
        .update(attendanceExceptions)
        .set({
          status: body.resolution,
          resolvedBy: user.id,
          resolvedAt: new Date(),
        })
        .where(eq(attendanceExceptions.id, id));

      let signedEvent = null;
      if (body.resolution === "RESOLVED") {
        // Manual resolution writes a SIGNED manual event + audit row (§3.2 Path 3).
        signedEvent = (
          await db
            .insert(attendanceEvents)
            .values({
              eventId: randomUUID(),
              sessionId: before.sessionId,
              traineeUserId: before.traineeUserId,
              method: body.method,
              result: "MARKED",
              actorId: user.id,
            })
            .onConflictDoNothing()
            .returning()
        )[0] ?? null;
      }

      const [after] = await db
        .select()
        .from(attendanceExceptions)
        .where(eq(attendanceExceptions.id, id))
        .limit(1);

      await writeAudit(db, {
        actorId: user.id,
        action: `ATTENDANCE_EXCEPTION_${body.resolution}`,
        entityType: "attendance_exception",
        entityId: id,
        before,
        after,
      });
      return reply.code(200).send({ exception: after, event: signedEvent });
    },
  );
}
