import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import { HttpError, assertCan } from "../lib/guard.js";
import {
  assessmentQuestions,
  assessments,
  attendanceEvents,
  attendanceSessions,
  batchTrainees,
  courses,
  courseVersions,
  lessons,
  learningProgress,
} from "../db/schema.js";

/**
 * LMS content (AC2): courses, lessons, assessments, quiz questions, progress.
 * Trainees never receive `correct_index` — scoring happens server-side (and in
 * the Local Fabric offline, which receives the same projection).
 */
export async function contentRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  app.get("/courses", { preHandler: app.requireAuth }, async (req) => {
    assertCan(req, "content", "read");
    const query = req.query as { programme_id?: string };
    const rows = await db
      .select()
      .from(courses)
      .where(
        query.programme_id ? eq(courses.programmeId, query.programme_id) : undefined,
      );
    return { courses: rows };
  });

  app.get("/courses/:id/lessons", { preHandler: app.requireAuth }, async (req) => {
    assertCan(req, "content", "read");
    const { id } = req.params as { id: string };
    const query = req.query as { lang?: string };
    const [version] = await db
      .select()
      .from(courseVersions)
      .where(eq(courseVersions.courseId, id))
      .orderBy(desc(courseVersions.version))
      .limit(1);
    if (!version) return { lessons: [] };
    const rows = await db
      .select()
      .from(lessons)
      .where(eq(lessons.courseVersionId, version.id));
    const filtered = query.lang ? rows.filter((l) => l.lang === query.lang) : rows;
    return { lessons: filtered.sort((a, b) => a.ord - b.ord) };
  });

  app.get("/courses/:id/assessments", { preHandler: app.requireAuth }, async (req) => {
    assertCan(req, "content", "read");
    const { id } = req.params as { id: string };
    const [version] = await db
      .select()
      .from(courseVersions)
      .where(eq(courseVersions.courseId, id))
      .orderBy(desc(courseVersions.version))
      .limit(1);
    if (!version) return { assessments: [] };
    const rows = await db
      .select()
      .from(assessments)
      .where(eq(assessments.courseVersionId, version.id));
    return { assessments: rows };
  });

  app.get("/lessons/:id", { preHandler: app.requireAuth }, async (req) => {
    assertCan(req, "content", "read");
    const { id } = req.params as { id: string };
    const [row] = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
    if (!row) throw new HttpError(404, "Lesson not found");
    return { lesson: row };
  });

  /** Quiz projection: questions without answers (correct_index stripped). */
  app.get(
    "/assessments/:id/questions",
    { preHandler: app.requireAuth },
    async (req) => {
      assertCan(req, "content", "read");
      const { id } = req.params as { id: string };
      const rows = await db
        .select({
          id: assessmentQuestions.id,
          ord: assessmentQuestions.ord,
          prompt: assessmentQuestions.prompt,
          options: assessmentQuestions.options,
        })
        .from(assessmentQuestions)
        .where(eq(assessmentQuestions.assessmentId, id));
      return { questions: rows.sort((a, b) => a.ord - b.ord) };
    },
  );

  app.get("/progress", { preHandler: app.requireAuth }, async (req) => {
    const user = assertCan(req, "content", "read");
    const query = req.query as { trainee_id?: string };
    const traineeId =
      user.role === "trainee" ? user.id : (query.trainee_id ?? user.id);
    const rows = await db
      .select()
      .from(learningProgress)
      .where(eq(learningProgress.traineeUserId, traineeId));
    return { progress: rows };
  });

  /** Fast roster for attendance: who is in this batch. */
  app.get("/batches/:id/roster", { preHandler: app.requireAuth }, async (req) => {
    assertCan(req, "attendance", "read");
    const { id } = req.params as { id: string };
    const rows = await db
      .select({ traineeUserId: batchTrainees.traineeUserId })
      .from(batchTrainees)
      .where(eq(batchTrainees.batchId, id));
    return { roster: rows.map((r) => r.traineeUserId) };
  });

  app.get(
    "/attendance/sessions/:id/status",
    { preHandler: app.requireAuth },
    async (req) => {
      assertCan(req, "attendance", "read");
      const { id } = req.params as { id: string };
      const [session] = await db
        .select()
        .from(attendanceSessions)
        .where(eq(attendanceSessions.id, id))
        .limit(1);
      if (!session) throw new HttpError(404, "Session not found");
      const marked = await db
        .select()
        .from(attendanceEvents)
        .where(eq(attendanceEvents.sessionId, id));
      return { session, events: marked };
    },
  );
}
