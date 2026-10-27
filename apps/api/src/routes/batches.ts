import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { validate } from "../lib/errors.js";
import { HttpError, assertCan, assertInstitutionScope } from "../lib/guard.js";
import { writeAudit } from "../lib/audit.js";
import {
  batchTrainees,
  batches,
  nominations,
  programmes,
  resources,
  timetableSessions,
  users,
} from "../db/schema.js";

const batchSchema = z.object({
  programme_id: z.string().uuid(),
  name: z.string().min(2).max(120),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  from_approved_nominations: z.boolean().default(true),
});

const sessionSchema = z.object({
  batch_id: z.string().uuid(),
  lesson_id: z.string().uuid().optional(),
  trainer_user_id: z.string().uuid().optional(),
  resource_id: z.string().uuid(),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
});

/**
 * Batches (S1-BE05) + timetable (S1-BE06).
 * A batch can only be formed from APPROVED nominations; timetable conflicts
 * are detected against overlapping sessions on the same resource (the gist
 * EXCLUDE constraint enforces the same rule at the DB layer).
 */
export async function batchRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  app.get("/batches", { preHandler: app.requireAuth }, async (req) => {
    assertCan(req, "batch", "read");
    const rows = await db
      .select({
        id: batches.id,
        programmeId: batches.programmeId,
        name: batches.name,
        startDate: batches.startDate,
        endDate: batches.endDate,
        status: batches.status,
        version: batches.version,
        programmeTitle: programmes.title,
      })
      .from(batches)
      .innerJoin(programmes, eq(batches.programmeId, programmes.id));
    return { batches: rows };
  });

  app.post("/batches", { preHandler: app.requireAuth }, async (req, reply) => {
    const user = assertCan(req, "batch", "create");
    const body = validate(batchSchema, req.body);
    const [programme] = await db
      .select()
      .from(programmes)
      .where(eq(programmes.id, body.programme_id))
      .limit(1);
    if (!programme) throw new HttpError(404, "Programme not found");
    assertInstitutionScope(req, programme.institutionId);

    const [batch] = await db
      .insert(batches)
      .values({
        programmeId: body.programme_id,
        name: body.name,
        startDate: body.start_date,
        endDate: body.end_date,
        status: "ACTIVE",
      })
      .returning();

    let added = 0;
    if (body.from_approved_nominations) {
      const approved = await db
        .select({ traineeUserId: nominations.traineeUserId })
        .from(nominations)
        .where(
          and(
            eq(nominations.programmeId, body.programme_id),
            eq(nominations.status, "APPROVED"),
          ),
        );
      for (const { traineeUserId } of approved) {
        await db
          .insert(batchTrainees)
          .values({ batchId: batch!.id, traineeUserId })
          .onConflictDoNothing();
        added += 1;
      }
    }

    await writeAudit(db, {
      actorId: user.id,
      action: "BATCH_CREATED",
      entityType: "batch",
      entityId: batch!.id,
      after: batch,
      ip: req.ip,
    });
    return reply.code(201).send({ batch, trainees_added: added });
  });

  app.get(
    "/batches/:id/trainees",
    { preHandler: app.requireAuth },
    async (req) => {
      assertCan(req, "batch", "read");
      const { id } = req.params as { id: string };
      const rows = await db
        .select({
          traineeUserId: batchTrainees.traineeUserId,
          name: users.displayName,
          email: users.email,
        })
        .from(batchTrainees)
        .innerJoin(users, eq(batchTrainees.traineeUserId, users.id))
        .where(eq(batchTrainees.batchId, id));
      return { trainees: rows };
    },
  );

  // ---------------------------------------------------------------- resources

  app.get("/resources", { preHandler: app.requireAuth }, async (req) => {
    assertCan(req, "timetable", "read");
    const rows = await db.select().from(resources);
    return { resources: rows };
  });

  app.post("/resources", { preHandler: app.requireAuth }, async (req, reply) => {
    const user = assertCan(req, "timetable", "create");
    const body = validate(
      z.object({
        kind: z.enum(["ROOM", "LAB", "HOSTEL", "EQUIPMENT"]),
        name: z.string().min(1).max(120),
      }),
      req.body,
    );
    if (!user.institution_id) throw new HttpError(400, "User has no institution");
    const [row] = await db
      .insert(resources)
      .values({ institutionId: user.institution_id, kind: body.kind, name: body.name })
      .returning();
    return reply.code(201).send({ resource: row });
  });

  // ---------------------------------------------------------------- timetable

  app.get("/timetable", { preHandler: app.requireAuth }, async (req) => {
    assertCan(req, "timetable", "read");
    const query = req.query as { batch_id?: string };
    const rows = await db
      .select()
      .from(timetableSessions)
      .where(
        query.batch_id ? eq(timetableSessions.batchId, query.batch_id) : undefined,
      );
    return { sessions: rows };
  });

  app.post("/timetable", { preHandler: app.requireAuth }, async (req, reply) => {
    const user = assertCan(req, "timetable", "create");
    const body = validate(sessionSchema, req.body);
    const starts = new Date(body.starts_at);
    const ends = new Date(body.ends_at);
    if (ends <= starts) throw new HttpError(400, "ends_at must be after starts_at");

    const [batch] = await db
      .select()
      .from(batches)
      .where(eq(batches.id, body.batch_id))
      .limit(1);
    if (!batch) throw new HttpError(404, "Batch not found");

    const conflict = await findConflict(body.resource_id, starts, ends);
    if (conflict) {
      throw new HttpError(409, "Resource already booked for this slot", {
        conflicting_session_id: conflict.id,
        starts_at: conflict.startsAt,
        ends_at: conflict.endsAt,
      });
    }

    const [row] = await db
      .insert(timetableSessions)
      .values({
        batchId: body.batch_id,
        lessonId: body.lesson_id ?? null,
        trainerUserId: body.trainer_user_id ?? user.id,
        resourceId: body.resource_id,
        startsAt: starts,
        endsAt: ends,
      })
      .returning();
    await writeAudit(db, {
      actorId: user.id,
      action: "SESSION_SCHEDULED",
      entityType: "timetable_session",
      entityId: row!.id,
      after: row,
    });
    return reply.code(201).send({ session: row });
  });

  app.delete(
    "/timetable/:id",
    { preHandler: app.requireAuth },
    async (req) => {
      const user = assertCan(req, "timetable", "update");
      const { id } = req.params as { id: string };
      const [before] = await db
        .select()
        .from(timetableSessions)
        .where(eq(timetableSessions.id, id))
        .limit(1);
      if (!before) throw new HttpError(404, "Session not found");
      await db.delete(timetableSessions).where(eq(timetableSessions.id, id));
      await writeAudit(db, {
        actorId: user.id,
        action: "SESSION_CANCELLED",
        entityType: "timetable_session",
        entityId: id,
        before,
      });
      return { deleted: true };
    },
  );

  async function findConflict(resourceId: string, starts: Date, ends: Date) {
    const overlapping = await db
      .select()
      .from(timetableSessions)
      .where(eq(timetableSessions.resourceId, resourceId));
    return overlapping.find(
      (s) =>
        s.startsAt < ends &&
        s.endsAt > starts &&
        s.status !== "CANCELLED",
    );
  }

  void inArray;
}
