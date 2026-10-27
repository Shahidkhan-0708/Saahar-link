import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { mockAiProvider } from "@sahakar/core";
import { validate } from "../lib/errors.js";
import { assertCan } from "../lib/guard.js";
import {
  applications,
  assessmentAttempts,
  attendanceEvents,
  auditLogs,
  batchTrainees,
  batches,
  credentials,
  employmentOutcomes,
  knowledgeChunks,
  nominations,
} from "../db/schema.js";

/** Audit browser (AC11), analytics funnel (AC10), bounded copilot (AC12). */
export async function insightRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  app.get("/audit-logs", { preHandler: app.requireAuth }, async (req) => {
    assertCan(req, "audit_log", "read");
    const query = validate(
      z.object({
        limit: z.coerce.number().int().positive().max(500).default(100),
        entity_id: z.string().uuid().optional(),
      }),
      req.query,
    );
    const rows = await db
      .select()
      .from(auditLogs)
      .where(query.entity_id ? eq(auditLogs.entityId, query.entity_id) : undefined)
      .orderBy(desc(auditLogs.at))
      .limit(query.limit);
    return { audit_logs: rows };
  });

  app.get("/analytics/funnel", { preHandler: app.requireAuth }, async (req) => {
    assertCan(req, "programme", "read");
    const query = validate(
      z.object({ programme_id: z.string().uuid().optional() }),
      req.query,
    );

    const allNominations = await db.select().from(nominations);
    const nomCount = query.programme_id
      ? allNominations.filter((n) => n.programmeId === query.programme_id)
      : allNominations;
    const approved = nomCount.filter((n) => n.status === "APPROVED");

    const allBatches = await db.select().from(batches);
    const batchIds = (
      query.programme_id
        ? allBatches.filter((b) => b.programmeId === query.programme_id)
        : allBatches
    ).map((b) => b.id);
    const traineeRows = await db.select().from(batchTrainees);
    const enrolled = traineeRows.filter((t) => batchIds.includes(t.batchId));

    const attempts = await db.select().from(assessmentAttempts);
    const completed = attempts.filter(
      (a) => a.state === "GRADED" || a.state === "FINALIZED" || a.state === "SUBMITTED",
    );
    const creds = await db.select().from(credentials);
    const apps = await db.select().from(applications);
    const outcomes = await db.select().from(employmentOutcomes);

    const certified = creds.length;
    const { jobMatches } = await import("../db/schema.js");
    const matched = await db.$count(jobMatches);
    const applied = apps.length;
    const joined = apps.filter((a) => a.state === "JOINED").length;
    const retained = outcomes.filter((o) => o.milestone === "RETAINED").length;

    return {
      nominations: nomCount.length,
      approved: approved.length,
      enrolled: enrolled.length,
      completed: completed.length,
      certified,
      matched,
      applied,
      joined,
      retained,
      retention_pct: joined > 0 ? Math.round((retained / joined) * 100) : 0,
    };
  });

  app.get(
    "/analytics/attendance",
    { preHandler: app.requireAuth },
    async (req) => {
      assertCan(req, "attendance", "read");
      const rows = await db.select().from(attendanceEvents);
      const marked = rows.filter((r) => r.result === "MARKED").length;
      return { total_events: rows.length, marked };
    },
  );

  /**
   * Bounded copilot (AC12): provider behind the AiProvider adapter; when the
   * adapter is off/unavailable it returns the deterministic fallback — core
   * flows never call this path.
   */
  app.post("/ai/chat", { preHandler: app.requireAuth }, async (req) => {
    const body = validate(
      z.object({
        thread_id: z.string().min(1),
        query: z.string().min(2).max(1000),
        lang: z.enum(["en", "hi", "mr"]).default("en"),
      }),
      req.body,
    );

    if (process.env.AI_DISABLED === "1") {
      return {
        answer:
          "The assistant is switched off. Ask your trainer or open the FAQ (works offline).",
        citations: [],
        fallback: true,
      };
    }

    // Retrieval stub: keyword match over approved chunks until S5-INT01 embeddings land.
    const chunks = await db
      .select()
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.lang, body.lang))
      .limit(50);
    const terms = body.query.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
    const hits = chunks
      .map((c) => ({
        c,
        score: terms.filter((t) => c.content.toLowerCase().includes(t)).length,
      }))
      .filter((h) => h.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    if (hits.length === 0) {
      return await mockAiProvider.chat({
        thread_id: body.thread_id,
        query: body.query,
        lang: body.lang,
      });
    }

    return {
      answer: hits
        .map((h, i) => `${h.c.content} [${i + 1}]`)
        .join("\n\n"),
      citations: hits.map((h, i) => ({
        ref: String(h.c.sourceId),
        label: `[${i + 1}] ${h.c.sourceType}`,
      })),
      fallback: false,
    };
  });
}
