import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { validate } from "../lib/errors.js";
import {
  HttpError,
  assertCan,
  assertInstitutionScope,
} from "../lib/guard.js";
import { writeAudit } from "../lib/audit.js";
import { programmes } from "../db/schema.js";

const programmeSchema = z.object({
  title: z.string().min(3).max(200),
  category: z.string().min(2).max(80),
  capacity: z.number().int().positive().max(10_000),
  eligibility: z.record(z.unknown()).default({}),
  nomination_opens: z.string().datetime({ offset: true }).nullable().optional(),
  nomination_closes: z.string().datetime({ offset: true }).nullable().optional(),
});

const updateSchema = programmeSchema.partial().extend({
  status: z.enum(["DRAFT", "OPEN", "CLOSED", "RUNNING", "COMPLETED"]).optional(),
  version: z.number().int().positive(),
});

/** AC1: programmes CRUD + nomination windows (PRD-FR-001). */
export async function programmeRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  app.get("/programmes", { preHandler: app.requireAuth }, async (req) => {
    const user = assertCan(req, "programme", "read");
    const rows = await db.select().from(programmes);
    // Institution scoping: everyone sees their own institution's programmes
    // (auditors/ncct_admin/platform_op see all — enforced in assertInstitutionScope
    // on writes; reads are filtered here for UX + least exposure).
    const scoped = ["ncct_admin", "platform_op", "auditor", "employer"].includes(
      user.role,
    )
      ? rows
      : rows.filter((r) => !user.institution_id || r.institutionId === user.institution_id);
    return { programmes: scoped };
  });

  app.post("/programmes", { preHandler: app.requireAuth }, async (req, reply) => {
    const user = assertCan(req, "programme", "create");
    if (!user.institution_id && user.role !== "platform_op") {
      throw new HttpError(400, "User has no institution");
    }
    const body = validate(programmeSchema, req.body);
    const [row] = await db
      .insert(programmes)
      .values({
        institutionId: user.institution_id!,
        title: body.title,
        category: body.category,
        capacity: body.capacity,
        eligibility: body.eligibility,
        nominationOpens: body.nomination_opens ? new Date(body.nomination_opens) : null,
        nominationCloses: body.nomination_closes ? new Date(body.nomination_closes) : null,
        createdBy: user.id,
      })
      .returning();
    await writeAudit(db, {
      actorId: user.id,
      action: "PROGRAMME_CREATED",
      entityType: "programme",
      entityId: row!.id,
      after: row,
      ip: req.ip,
    });
    return reply.code(201).send({ programme: row });
  });

  app.get("/programmes/:id", { preHandler: app.requireAuth }, async (req) => {
    const user = assertCan(req, "programme", "read");
    const { id } = req.params as { id: string };
    const [row] = await db.select().from(programmes).where(eq(programmes.id, id)).limit(1);
    if (!row) throw new HttpError(404, "Programme not found");
    assertInstitutionScope(req, row.institutionId);
    void user;
    return { programme: row };
  });

  app.patch("/programmes/:id", { preHandler: app.requireAuth }, async (req) => {
    const user = assertCan(req, "programme", "update");
    const { id } = req.params as { id: string };
    const body = validate(updateSchema, req.body);
    const [before] = await db.select().from(programmes).where(eq(programmes.id, id)).limit(1);
    if (!before) throw new HttpError(404, "Programme not found");
    assertInstitutionScope(req, before.institutionId);
    if (before.version !== body.version) {
      throw new HttpError(409, "Version conflict", {
        expected_version: before.version,
      });
    }

    // Nomination window sanity: closes must be after opens.
    const opens = body.nomination_opens ? new Date(body.nomination_opens) : before.nominationOpens;
    const closes = body.nomination_closes ? new Date(body.nomination_closes) : before.nominationCloses;
    if (opens && closes && closes <= opens) {
      throw new HttpError(400, "nomination_closes must be after nomination_opens");
    }

    const [row] = await db
      .update(programmes)
      .set({
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.capacity !== undefined ? { capacity: body.capacity } : {}),
        ...(body.eligibility !== undefined ? { eligibility: body.eligibility } : {}),
        ...(body.nomination_opens !== undefined
          ? { nominationOpens: body.nomination_opens ? new Date(body.nomination_opens) : null }
          : {}),
        ...(body.nomination_closes !== undefined
          ? { nominationCloses: body.nomination_closes ? new Date(body.nomination_closes) : null }
          : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        version: before.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(programmes.id, id))
      .returning();

    await writeAudit(db, {
      actorId: user.id,
      action: "PROGRAMME_UPDATED",
      entityType: "programme",
      entityId: id,
      before,
      after: row,
      ip: req.ip,
    });
    return { programme: row };
  });

  app.delete("/programmes/:id", { preHandler: app.requireAuth }, async (req) => {
    const user = assertCan(req, "programme", "delete");
    const { id } = req.params as { id: string };
    const [before] = await db.select().from(programmes).where(eq(programmes.id, id)).limit(1);
    if (!before) throw new HttpError(404, "Programme not found");
    assertInstitutionScope(req, before.institutionId);
    await db.delete(programmes).where(eq(programmes.id, id));
    await writeAudit(db, {
      actorId: user.id,
      action: "PROGRAMME_DELETED",
      entityType: "programme",
      entityId: id,
      before,
      ip: req.ip,
    });
    return { deleted: true };
  });
}
