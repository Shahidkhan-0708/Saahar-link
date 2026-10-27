import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { validate } from "../lib/errors.js";
import {
  type AuthUser,
  HttpError,
  assertCan,
  assertInstitutionScope,
} from "../lib/guard.js";
import { writeAudit } from "../lib/audit.js";
import { nominations, programmes, users } from "../db/schema.js";

const submitSchema = z.object({ programme_id: z.string().uuid() });

const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "WAITLISTED", "UNDER_REVIEW"]),
  bulk_ids: z.array(z.string().uuid()).max(200).optional(),
});

/**
 * Nominations workflow (S1-BE04): SUBMITTED → UNDER_REVIEW → APPROVED /
 * REJECTED / WAITLISTED. Uniqueness (programme, trainee) is a DB index —
 * duplicate submit returns 409.
 */
export async function nominationRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  app.get("/nominations", { preHandler: app.requireAuth }, async (req) => {
    const user = assertCan(req, "nomination", "read");
    const query = req.query as { programme_id?: string };
    const rows = await db
      .select({
        id: nominations.id,
        programmeId: nominations.programmeId,
        traineeUserId: nominations.traineeUserId,
        status: nominations.status,
        submittedAt: nominations.submittedAt,
        decidedBy: nominations.decidedBy,
        decidedAt: nominations.decidedAt,
        version: nominations.version,
        traineeName: users.displayName,
        traineeEmail: users.email,
        programmeTitle: programmes.title,
      })
      .from(nominations)
      .innerJoin(users, eq(nominations.traineeUserId, users.id))
      .innerJoin(programmes, eq(nominations.programmeId, programmes.id))
      .where(
        query.programme_id ? eq(nominations.programmeId, query.programme_id) : undefined,
      );

    // Trainees only see their own nominations; admins/auditors see the rest.
    const visible =
      user.role === "trainee" ? rows.filter((r) => r.traineeUserId === user.id) : rows;
    return { nominations: visible };
  });

  app.post("/nominations", { preHandler: app.requireAuth }, async (req, reply) => {
    const user = assertCan(req, "nomination", "create");
    const body = validate(submitSchema, req.body);
    const [programme] = await db
      .select()
      .from(programmes)
      .where(eq(programmes.id, body.programme_id))
      .limit(1);
    if (!programme) throw new HttpError(404, "Programme not found");
    assertInstitutionScope(req, programme.institutionId);
    if (programme.status !== "OPEN") {
      throw new HttpError(409, "Nominations are not open for this programme");
    }
    const now = new Date();
    if (programme.nominationOpens && now < programme.nominationOpens) {
      throw new HttpError(409, "Nomination window has not opened");
    }
    if (programme.nominationCloses && now > programme.nominationCloses) {
      throw new HttpError(409, "Nomination window has closed");
    }

    const [existing] = await db
      .select({ id: nominations.id })
      .from(nominations)
      .where(
        and(
          eq(nominations.programmeId, body.programme_id),
          eq(nominations.traineeUserId, user.id),
        ),
      )
      .limit(1);
    if (existing) throw new HttpError(409, "Already nominated for this programme");

    const [row] = await db
      .insert(nominations)
      .values({
        programmeId: body.programme_id,
        traineeUserId: user.id,
        status: "SUBMITTED",
      })
      .returning();
    return reply.code(201).send({ nomination: row });
  });

  app.patch(
    "/nominations/:id/decision",
    { preHandler: app.requireAuth },
    async (req) => {
      const user = assertCan(req, "nomination", "update");
      const { id } = req.params as { id: string };
      const body = validate(decisionSchema, req.body);
      return decideOne(user, id, body.decision);
    },
  );

  app.post(
    "/nominations/bulk-decision",
    { preHandler: app.requireAuth },
    async (req) => {
      const user = assertCan(req, "nomination", "update");
      const body = validate(decisionSchema, req.body);
      if (!body.bulk_ids?.length) throw new HttpError(400, "bulk_ids required");
      const results = [];
      for (const id of body.bulk_ids) {
        results.push(await decideOne(user, id, body.decision));
      }
      return { decided: results.length, results };
    },
  );

  async function decideOne(
    user: AuthUser,
    id: string,
    decision: "APPROVED" | "REJECTED" | "WAITLISTED" | "UNDER_REVIEW",
  ) {
    const [before] = await db
      .select()
      .from(nominations)
      .where(eq(nominations.id, id))
      .limit(1);
    if (!before) throw new HttpError(404, "Nomination not found");
    if (before.status === decision) {
      // Idempotent — safe for retries and bulk re-runs.
      return { nomination: before, unchanged: true };
    }
    const [row] = await db
      .update(nominations)
      .set({
        status: decision,
        decidedBy: user.id,
        decidedAt: new Date(),
        version: before.version + 1,
      })
      .where(eq(nominations.id, id))
      .returning();
    await writeAudit(db, {
      actorId: user.id,
      action: `NOMINATION_${decision}`,
      entityType: "nomination",
      entityId: id,
      before,
      after: row,
    });
    return { nomination: row };
  }
}
