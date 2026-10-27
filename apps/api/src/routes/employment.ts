import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { type MatchResult, scoreMatch } from "@sahakar/core";
import { validate } from "../lib/errors.js";
import { HttpError, assertCan, assertInstitutionScope } from "../lib/guard.js";
import { writeAudit } from "../lib/audit.js";
import {
  applications,
  credentials,
  employers,
  employmentOutcomes,
  jobMatches,
  jobRequirements,
  jobs,
  skillEvidence,
  skills,
  users,
} from "../db/schema.js";

const jobSchema = z.object({
  title: z.string().min(3).max(160),
  location: z.string().min(2).max(120),
  employment_type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "APPRENTICESHIP"]).default("FULL_TIME"),
  experience_min_months: z.number().int().min(0).max(600).default(0),
  remote: z.boolean().default(false),
  requirements: z
    .array(
      z.object({
        skill_code: z.string().min(1),
        kind: z.enum(["REQUIRED", "OPTIONAL"]),
        credential_gate_programme_id: z.string().uuid().nullable().optional(),
      }),
    )
    .min(1),
});

const APPLICATION_TRANSITIONS: Record<string, string[]> = {
  APPLIED: ["SHORTLISTED", "REJECTED", "WITHDRAWN"],
  SHORTLISTED: ["SELECTED", "REJECTED", "WITHDRAWN"],
  SELECTED: ["JOINED", "REJECTED"],
  REJECTED: [],
  WITHDRAWN: [],
  JOINED: [],
};

const OUTCOME_MILESTONES = [
  "REPORTED",
  "EMPLOYER_CONFIRMED",
  "INSTITUTION_VERIFIED",
  "RETAINED",
] as const;

/**
 * Employment (AC8, AC9):
 *  - employers + verification
 *  - jobs with structured requirements
 *  - deterministic explainable matching (blueprint §3.4) — results STORED
 *  - application state machine with DB-level uniqueness
 *  - outcome milestones, idempotent per (application, milestone)
 */
export async function employmentRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  // ------------------------------------------------------------------ employers

  app.get("/employers", { preHandler: app.requireAuth }, async (req) => {
    assertCan(req, "job", "read");
    const rows = await db.select().from(employers);
    return { employers: rows };
  });

  app.post("/employers", { preHandler: app.requireAuth }, async (req, reply) => {
    const user = assertCan(req, "job", "create");
    const body = validate(
      z.object({
        name: z.string().min(2).max(160),
        gst_no: z.string().max(20).nullable().optional(),
      }),
      req.body,
    );
    const [row] = await db
      .insert(employers)
      .values({ name: body.name, gstNo: body.gst_no ?? null, createdBy: user.id })
      .returning();
    await writeAudit(db, {
      actorId: user.id,
      action: "EMPLOYER_CREATED",
      entityType: "employer",
      entityId: row!.id,
      after: row,
    });
    return reply.code(201).send({ employer: row });
  });

  app.post(
    "/employers/:id/verify",
    { preHandler: app.requireAuth },
    async (req) => {
      const user = assertCan(req, "job", "update");
      const { id } = req.params as { id: string };
      const [before] = await db.select().from(employers).where(eq(employers.id, id)).limit(1);
      if (!before) throw new HttpError(404, "Employer not found");
      if (before.verified) return { employer: before, unchanged: true };
      const [row] = await db
        .update(employers)
        .set({ verified: true, verifiedBy: user.id, version: before.version + 1 })
        .where(eq(employers.id, id))
        .returning();
      await writeAudit(db, {
        actorId: user.id,
        action: "EMPLOYER_VERIFIED",
        entityType: "employer",
        entityId: id,
        before,
        after: row,
      });
      return { employer: row };
    },
  );

  // ---------------------------------------------------------------------- jobs

  app.get("/jobs", { preHandler: app.requireAuth }, async (req) => {
    assertCan(req, "job", "read");
    const rows = await db
      .select({
        id: jobs.id,
        employerId: jobs.employerId,
        title: jobs.title,
        location: jobs.location,
        employmentType: jobs.employmentType,
        experienceMinMonths: jobs.experienceMinMonths,
        status: jobs.status,
        employerName: employers.name,
        employerVerified: employers.verified,
      })
      .from(jobs)
      .innerJoin(employers, eq(jobs.employerId, employers.id));
    return { jobs: rows };
  });

  app.post("/jobs", { preHandler: app.requireAuth }, async (req, reply) => {
    const user = assertCan(req, "job", "create");
    const body = validate(jobSchema, req.body);
    // Employers create jobs against their own employer row (sent via body).
    const employerId = (req.body as { employer_id?: string }).employer_id;
    if (!employerId) throw new HttpError(400, "employer_id required");
    const [employerRow] = await db
      .select()
      .from(employers)
      .where(eq(employers.id, employerId))
      .limit(1);
    if (!employerRow) throw new HttpError(404, "Employer not found");

    const [job] = await db
      .insert(jobs)
      .values({
        employerId,
        title: body.title,
        location: body.location,
        employmentType: body.employment_type,
        experienceMinMonths: body.experience_min_months,
      })
      .returning();

    // Resolve skill codes → skill rows (create on first use for the demo).
    const created: { skillId: string; kind: string; gate: string | null }[] = [];
    for (const req_ of body.requirements) {
      let [skill] = await db
        .select()
        .from(skills)
        .where(eq(skills.code, req_.skill_code))
        .limit(1);
      if (!skill) {
        [skill] = await db
          .insert(skills)
          .values({ code: req_.skill_code, name: req_.skill_code.replace(/-/g, " ") })
          .returning();
      }
      await db.insert(jobRequirements).values({
        jobId: job!.id,
        skillId: skill!.id,
        kind: req_.kind,
        credentialGate: req_.credential_gate_programme_id ?? null,
      });
      created.push({
        skillId: skill!.id,
        kind: req_.kind,
        gate: req_.credential_gate_programme_id ?? null,
      });
    }

    await writeAudit(db, {
      actorId: user.id,
      action: "JOB_CREATED",
      entityType: "job",
      entityId: job!.id,
      after: job,
    });
    return reply.code(201).send({ job, requirements: created });
  });

  app.get(
    "/jobs/:id/requirements",
    { preHandler: app.requireAuth },
    async (req) => {
      assertCan(req, "job", "read");
      const { id } = req.params as { id: string };
      const rows = await db
        .select({
          id: jobRequirements.id,
          kind: jobRequirements.kind,
          credentialGate: jobRequirements.credentialGate,
          skill_code: skills.code,
          skill_name: skills.name,
        })
        .from(jobRequirements)
        .innerJoin(skills, eq(jobRequirements.skillId, skills.id))
        .where(eq(jobRequirements.jobId, id));
      return { requirements: rows };
    },
  );

  // ------------------------------------------------------------------ matching

  app.get("/jobs/:id/matches", { preHandler: app.requireAuth }, async (req) => {
    assertCan(req, "job", "read");
    const { id } = req.params as { id: string };
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    if (!job) throw new HttpError(404, "Job not found");

    const reqs = await db
      .select()
      .from(jobRequirements)
      .innerJoin(skills, eq(jobRequirements.skillId, skills.id))
      .where(eq(jobRequirements.jobId, id));
    const gate = reqs.find((r) => r.job_requirements.credentialGate)
      ?.job_requirements.credentialGate ?? null;

    const trainees = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.role, "trainee"));

    const matches: {
      candidate: { id: string; display_name: string; email: string };
      score: number;
      requirements: MatchResult["requirements"];
      ai_note?: string;
    }[] = [];

    for (const trainee of trainees) {
      const evidence = await db
        .select({
          code: skills.code,
          sourceType: skillEvidence.sourceType,
          sourceId: skillEvidence.sourceId,
          label: skills.name,
        })
        .from(skillEvidence)
        .innerJoin(skills, eq(skillEvidence.skillId, skills.id))
        .where(eq(skillEvidence.traineeUserId, trainee.id));

      const creds = await db
        .select({ programmeId: credentials.programmeId, issuedAt: credentials.issuedAt })
        .from(credentials)
        .where(
          and(eq(credentials.subjectId, trainee.id), eq(credentials.status, "ACTIVE")),
        );

      const earliest = creds[0]?.issuedAt ?? null;
      const experienceMonths = earliest
        ? Math.max(
            0,
            Math.floor((Date.now() - earliest.getTime()) / (30 * 24 * 3600 * 1000)),
          )
        : 0;

      const result = scoreMatch(
        {
          requirements: reqs.map((r) => ({
            skill_code: r.skills.code,
            skill_name: r.skills.name,
            kind: r.job_requirements.kind as "REQUIRED" | "OPTIONAL",
          })),
          credential_gate_programme_id: gate,
          location: job.location,
          remote: false,
          experience_min_months: job.experienceMinMonths,
        },
        {
          skills: [...new Set(evidence.map((e) => e.code))].map((code) => ({
            skill_code: code,
            evidence: evidence
              .filter((e) => e.code === code)
              .map((e) => ({
                type: e.sourceType as "COURSE" | "ASSESSMENT" | "CREDENTIAL",
                label: `${e.label} (${e.sourceType})`,
                ref: e.sourceId,
              })),
          })),
          credential_programme_ids: creds.map((c) => c.programmeId),
          location: null,
          remote_ok: true,
          experience_months: experienceMonths,
        },
      );

      matches.push({
        candidate: {
          id: trainee.id,
          display_name: trainee.displayName,
          email: trainee.email,
        },
        score: result.total_score,
        requirements: result.requirements,
      });

      await db
        .insert(jobMatches)
        .values({
          jobId: id,
          traineeUserId: trainee.id,
          score: String(result.total_score),
          requirements: result.requirements,
        })
        .onConflictDoNothing();
    }

    matches.sort((a, b) => b.score - a.score);
    return { matches };
  });

  // --------------------------------------------------------------- applications

  app.get("/applications", { preHandler: app.requireAuth }, async (req) => {
    const user = assertCan(req, "application", "read");
    const rows = await db
      .select({
        id: applications.id,
        jobId: applications.jobId,
        traineeUserId: applications.traineeUserId,
        state: applications.state,
        stateChangedAt: applications.stateChangedAt,
        jobTitle: jobs.title,
        traineeName: users.displayName,
      })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .innerJoin(users, eq(applications.traineeUserId, users.id));
    const visible =
      user.role === "trainee"
        ? rows.filter((r) => r.traineeUserId === user.id)
        : rows;
    return { applications: visible };
  });

  app.post("/applications", { preHandler: app.requireAuth }, async (req, reply) => {
    const user = assertCan(req, "application", "create");
    const body = validate(z.object({ job_id: z.string().uuid() }), req.body);
    const [job] = await db.select().from(jobs).where(eq(jobs.id, body.job_id)).limit(1);
    if (!job) throw new HttpError(404, "Job not found");
    const [existing] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(eq(applications.jobId, body.job_id), eq(applications.traineeUserId, user.id)),
      )
      .limit(1);
    if (existing) throw new HttpError(409, "Already applied to this job");

    const [row] = await db
      .insert(applications)
      .values({ jobId: body.job_id, traineeUserId: user.id, state: "APPLIED" })
      .returning();
    await writeAudit(db, {
      actorId: user.id,
      action: "APPLICATION_CREATED",
      entityType: "application",
      entityId: row!.id,
      after: row,
    });
    return reply.code(201).send({ application: row });
  });

  app.patch(
    "/applications/:id/state",
    { preHandler: app.requireAuth },
    async (req) => {
      const user = assertCan(req, "application", "update");
      const { id } = req.params as { id: string };
      const body = validate(
        z.object({ state: z.enum(["SHORTLISTED", "SELECTED", "JOINED", "REJECTED", "WITHDRAWN"]) }),
        req.body,
      );
      const [before] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, id))
        .limit(1);
      if (!before) throw new HttpError(404, "Application not found");
      const allowed = APPLICATION_TRANSITIONS[before.state] ?? [];
      if (!allowed.includes(body.state)) {
        throw new HttpError(409, `Invalid transition ${before.state} → ${body.state}`, {
          allowed,
        });
      }
      const [row] = await db
        .update(applications)
        .set({
          state: body.state,
          stateChangedAt: new Date(),
          version: before.version + 1,
        })
        .where(eq(applications.id, id))
        .returning();
      await writeAudit(db, {
        actorId: user.id,
        action: `APPLICATION_${body.state}`,
        entityType: "application",
        entityId: id,
        before,
        after: row,
      });
      return { application: row };
    },
  );

  // ------------------------------------------------------------------- outcomes

  app.post(
    "/outcomes/events",
    { preHandler: app.requireAuth },
    async (req, reply) => {
      const user = assertCan(req, "outcome", "create");
      const body = validate(
        z.object({
          application_id: z.string().uuid(),
          milestone: z.enum(OUTCOME_MILESTONES),
          evidence_ref: z.string().max(300).optional(),
        }),
        req.body,
      );
      const [application] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, body.application_id))
        .limit(1);
      if (!application) throw new HttpError(404, "Application not found");

      // Idempotent: duplicate milestone → 200 with existing row (AC9).
      const [existing] = await db
        .select()
        .from(employmentOutcomes)
        .where(
          and(
            eq(employmentOutcomes.applicationId, body.application_id),
            eq(employmentOutcomes.milestone, body.milestone),
          ),
        )
        .limit(1);
      if (existing) {
        return reply.code(200).send({ outcome: existing, duplicate: true });
      }

      const [row] = await db
        .insert(employmentOutcomes)
        .values({
          applicationId: body.application_id,
          milestone: body.milestone,
          evidenceRef: body.evidence_ref ?? null,
          verifiedBy: user.id,
        })
        .returning();

      if (body.milestone === "EMPLOYER_CONFIRMED" && application.state !== "JOINED") {
        await db
          .update(applications)
          .set({ state: "JOINED", stateChangedAt: new Date() })
          .where(eq(applications.id, body.application_id));
      }

      await writeAudit(db, {
        actorId: user.id,
        action: `OUTCOME_${body.milestone}`,
        entityType: "employment_outcome",
        entityId: row!.id,
        after: row,
      });
      return reply.code(201).send({ outcome: row });
    },
  );

  app.get(
    "/outcomes",
    { preHandler: app.requireAuth },
    async (req) => {
      assertCan(req, "outcome", "read");
      const rows = await db.select().from(employmentOutcomes);
      return { outcomes: rows };
    },
  );

  void assertInstitutionScope;
  void inArray;
  void jobMatches;
}
