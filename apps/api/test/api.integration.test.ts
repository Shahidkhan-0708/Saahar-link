import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import {
  type TestContext,
  FABRIC_HEADERS,
  bearer,
  login,
  setup,
} from "./helpers.js";
import {
  auditLogs,
  attendanceSessions,
  credentials,
} from "../src/db/schema.js";

let ctx: TestContext;
let ncctToken: string;
let adminToken: string;
let trainerToken: string;
let traineeToken: string;
let trainee2Token: string;
let employerToken: string;
let auditorToken: string;
let programmeId: string;
let batchId: string;
let resourceId: string;
let employerId: string;
let jobId: string;
let sessionId: string;
let qrToken: string;
let credentialId: string;
let applicationId: string;
let syncLessonId: string;
let syncAssessmentId: string;

beforeAll(async () => {
  ctx = await setup();
  ncctToken = await login(ctx.app, "ncct@demo.in");
  adminToken = await login(ctx.app, "admin@demo.in");
  trainerToken = await login(ctx.app, "trainer@demo.in");
  traineeToken = await login(ctx.app, "trainee@demo.in");
  employerToken = await login(ctx.app, "employer@demo.in");
  auditorToken = await login(ctx.app, "auditor@demo.in");
  // second trainee for matching/pipeline breadth
  const res = await ctx.app.inject({
    method: "POST",
    url: "/v1/auth/register",
    payload: {
      email: "trainee2@demo.in",
      password: "TestPass123!",
      display_name: "second trainee",
      role: "trainee",
    },
  });
  expect(res.statusCode).toBe(201);
  trainee2Token = await res.json().token;
  ctx.ids.trainee2 = res.json().user.id;

  // Content fixtures for sync events (FK targets)
  const { courses, courseVersions, lessons, assessments } = await import(
    "../src/db/schema.js"
  );
  const [course] = await ctx.db
    .insert(courses)
    .values({ title: "Demo Course", language: "en", status: "PUBLISHED" })
    .returning();
  const [cv] = await ctx.db
    .insert(courseVersions)
    .values({ courseId: course!.id, version: 1, publishedAt: new Date() })
    .returning();
  const [lesson] = await ctx.db
    .insert(lessons)
    .values({ courseVersionId: cv!.id, ord: 1, title: "Lesson 1", bodyMd: "# Hi", lang: "en" })
    .returning();
  const [assessment] = await ctx.db
    .insert(assessments)
    .values({ courseVersionId: cv!.id, title: "Quiz 1", kind: "QUIZ", status: "PUBLISHED" })
    .returning();
  syncLessonId = lesson!.id;
  syncAssessmentId = assessment!.id;
}, 60_000);

afterAll(async () => {
  await ctx.app.close();
});

describe("auth + RBAC", () => {
  it("rejects unauthenticated access (401)", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/v1/programmes" });
    expect(res.statusCode).toBe(401);
  });

  it("denies trainee programme creation (403)", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/v1/programmes",
      headers: bearer(traineeToken),
      payload: { title: "Nope", category: "x", capacity: 1 },
    });
    expect(res.statusCode).toBe(403);
  });

  it("ncct_admin can read programmes across the system", async () => {
    const res = await ctx.app.inject({
      method: "GET",
      url: "/v1/programmes",
      headers: bearer(ncctToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("denies wrong credentials (401)", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "admin@demo.in", password: "wrong" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("prevents privileged self-registration (403)", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email: "sneaky@demo.in",
        password: "TestPass123!",
        display_name: "sneak",
        role: "ncct_admin",
      },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("AC1: programme → nomination → batch", () => {
  it("admin creates a programme", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/v1/programmes",
      headers: bearer(adminToken),
      payload: {
        title: "Cooperative Accounting & Compliance",
        category: "accounting",
        capacity: 8,
        eligibility: { min_age: 18 },
      },
    });
    expect(res.statusCode).toBe(201);
    programmeId = res.json().programme.id;
  });

  it("programme must be OPEN before nominations", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/v1/nominations",
      headers: bearer(traineeToken),
      payload: { programme_id: programmeId },
    });
    expect(res.statusCode).toBe(409);
  });

  it("admin opens the nomination window", async () => {
    const [before] = await ctx.app
      .inject({
        method: "GET",
        url: `/v1/programmes/${programmeId}`,
        headers: bearer(adminToken),
      })
      .then((r) => [r.json().programme]);
    const res = await ctx.app.inject({
      method: "PATCH",
      url: `/v1/programmes/${programmeId}`,
      headers: bearer(adminToken),
      payload: {
        status: "OPEN",
        nomination_opens: new Date(Date.now() - 3600_000).toISOString(),
        nomination_closes: new Date(Date.now() + 7 * 86400_000).toISOString(),
        version: before.version,
      },
    });
    expect(res.statusCode).toBe(200);
  });

  it("trainee submits a nomination; duplicate → 409", async () => {
    const first = await ctx.app.inject({
      method: "POST",
      url: "/v1/nominations",
      headers: bearer(traineeToken),
      payload: { programme_id: programmeId },
    });
    expect(first.statusCode).toBe(201);

    const dup = await ctx.app.inject({
      method: "POST",
      url: "/v1/nominations",
      headers: bearer(traineeToken),
      payload: { programme_id: programmeId },
    });
    expect(dup.statusCode).toBe(409);
  });

  it("admin approves the nomination and forms a batch", async () => {
    const list = await ctx.app.inject({
      method: "GET",
      url: `/v1/nominations?programme_id=${programmeId}`,
      headers: bearer(adminToken),
    });
    const nom = list.json().nominations[0];
    const dec = await ctx.app.inject({
      method: "PATCH",
      url: `/v1/nominations/${nom.id}/decision`,
      headers: bearer(adminToken),
      payload: { decision: "APPROVED" },
    });
    expect(dec.statusCode).toBe(200);
    expect(dec.json().nomination.status).toBe("APPROVED");

    const batch = await ctx.app.inject({
      method: "POST",
      url: "/v1/batches",
      headers: bearer(adminToken),
      payload: {
        programme_id: programmeId,
        name: "Batch A",
        start_date: "2026-10-12",
        end_date: "2026-11-12",
      },
    });
    expect(batch.statusCode).toBe(201);
    batchId = batch.json().batch.id;
    expect(batch.json().trainees_added).toBe(1);
  });

  it("timetable double-booking is rejected (409)", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/v1/resources",
      headers: bearer(adminToken),
      payload: { kind: "ROOM", name: "Room 1" },
    });
    expect(res.statusCode).toBe(201);
    resourceId = res.json().resource.id;

    const slot = {
      batch_id: batchId,
      resource_id: resourceId,
      starts_at: "2026-10-13T09:00:00Z",
      ends_at: "2026-10-13T11:00:00Z",
    };
    const first = await ctx.app.inject({
      method: "POST",
      url: "/v1/timetable",
      headers: bearer(adminToken),
      payload: slot,
    });
    expect(first.statusCode).toBe(201);

    const clash = await ctx.app.inject({
      method: "POST",
      url: "/v1/timetable",
      headers: bearer(adminToken),
      payload: { ...slot, starts_at: "2026-10-13T10:00:00Z", ends_at: "2026-10-13T12:00:00Z" },
    });
    expect(clash.statusCode).toBe(409);
  });
});

describe("AC5 + NFR-003: sync push/pull", () => {
  const eventBase = () => ({
    event_id: randomUUID(),
    center_id: "inst-vamnicom-001",
    device_id: "tab-07",
    occurred_at: new Date().toISOString(),
    local_sequence: Math.floor(Math.random() * 1_000_000),
    entity_type: "assessment_attempt",
    entity_id: randomUUID(),
    entity_version: 1,
    payload: {},
    prev_hash: null,
    signature: null,
    // real trainee (FK) — set lazily so beforeAll has run
    actor_id: ctx.ids.trainee,
  });

  it("accepts a valid event (APPLIED)", async () => {
    const real = {
      ...eventBase(),
      event_type: "QUIZ_SUBMITTED",
      payload: { assessment_id: syncAssessmentId, answers: [], attempt_id: randomUUID() },
    };
    const res = await ctx.app.inject({
      method: "POST",
      url: "/v1/sync/push",
      headers: FABRIC_HEADERS,
      payload: { events: [real] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().results[0].result).toBe("APPLIED");
  });

  it("replayed event → DUPLICATE, no state change", async () => {
    const real = {
      ...eventBase(),
      event_type: "QUIZ_SUBMITTED",
      payload: { assessment_id: syncAssessmentId, answers: [], attempt_id: randomUUID() },
    };
    const first = await ctx.app.inject({
      method: "POST",
      url: "/v1/sync/push",
      headers: FABRIC_HEADERS,
      payload: { events: [real] },
    });
    expect(first.json().results[0].result).toBe("APPLIED");

    const second = await ctx.app.inject({
      method: "POST",
      url: "/v1/sync/push",
      headers: FABRIC_HEADERS,
      payload: { events: [real] },
    });
    expect(second.json().results[0].result).toBe("DUPLICATE");
  });

  it("unknown event type → DEAD_LETTER (quarantined)", async () => {
    const real = { ...eventBase(), event_type: "MADE_UP_EVENT" };
    const res = await ctx.app.inject({
      method: "POST",
      url: "/v1/sync/push",
      headers: FABRIC_HEADERS,
      payload: { events: [real] },
    });
    expect(res.json().results[0].result).toBe("DEAD_LETTER");

    const dead = await ctx.app.inject({
      method: "GET",
      url: "/v1/sync/dead-letters",
      headers: bearer(adminToken),
    });
    expect(dead.statusCode).toBe(200);
    expect(dead.json().dead_letters.length).toBeGreaterThanOrEqual(1);
  });

  it("version mismatch → CONFLICT with expected_version", async () => {
    // Ingest a progress event for lesson X at version 1 …
    const lessonId = syncLessonId;
    const base = {
      ...eventBase(),
      event_type: "LESSON_PROGRESS_UPDATED",
      entity_type: "learning_progress",
      entity_id: lessonId,
      entity_version: 1,
      payload: { lesson_id: lessonId, state: "IN_PROGRESS" },
    };
    const actor = ctx.ids.trainee;
    const applied = await ctx.app.inject({
      method: "POST",
      url: "/v1/sync/push",
      headers: FABRIC_HEADERS,
      payload: { events: [{ ...base, actor_id: actor }] },
    });
    expect(applied.json().results[0].result).toBe("APPLIED");

    // … then a second device pushes the same row believing it is still version 1.
    const conflict = await ctx.app.inject({
      method: "POST",
      url: "/v1/sync/push",
      headers: FABRIC_HEADERS,
      payload: {
        events: [
          {
            ...base,
            event_id: randomUUID(),
            actor_id: actor,
            entity_version: 1,
            payload: { lesson_id: lessonId, state: "COMPLETED" },
          },
        ],
      },
    });
    const result = conflict.json().results[0];
    expect(result.result).toBe("CONFLICT");
    expect(result.expected_version).toBe(1);
  });

  it("pull returns changes with a cursor", async () => {
    const res = await ctx.app.inject({
      method: "GET",
      url: "/v1/sync/pull?cursor=0",
      headers: FABRIC_HEADERS,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().changes.length).toBeGreaterThan(0);
    expect(res.json().next_cursor).toBeGreaterThan(0);
  });

  it("rejects a bogus fabric token (401)", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/v1/sync/push",
      headers: { "x-fabric-token": "evil" },
      payload: { events: [] },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("AC6: attendance fallback chain", () => {
  it("trainer creates a session with a signed QR token", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/v1/attendance/sessions",
      headers: bearer(trainerToken),
      payload: { batch_id: batchId, method: "QR" },
    });
    expect(res.statusCode).toBe(201);
    sessionId = res.json().session.id;
    qrToken = res.json().qr_token;
    expect(typeof qrToken).toBe("string");
  });

  it("marks a trainee via QR proof — idempotent (201 then 200)", async () => {
    const eventId = randomUUID();
    const first = await ctx.app.inject({
      method: "POST",
      url: "/v1/attendance/events",
      headers: bearer(trainerToken),
      payload: {
        event_id: eventId,
        session_id: sessionId,
        trainee_id: ctx.ids.trainee,
        method: "QR",
        proof: qrToken,
      },
    });
    expect(first.statusCode).toBe(201);

    const replay = await ctx.app.inject({
      method: "POST",
      url: "/v1/attendance/events",
      headers: bearer(trainerToken),
      payload: {
        event_id: eventId,
        session_id: sessionId,
        trainee_id: ctx.ids.trainee,
        method: "QR",
        proof: qrToken,
      },
    });
    expect(replay.statusCode).toBe(200);
    expect(replay.json().duplicate).toBe(true);

    // Double marking from another device is also impossible:
    const otherDevice = await ctx.app.inject({
      method: "POST",
      url: "/v1/attendance/events",
      headers: bearer(trainerToken),
      payload: {
        event_id: randomUUID(),
        session_id: sessionId,
        trainee_id: ctx.ids.trainee,
        method: "QR",
        proof: qrToken,
      },
    });
    expect(otherDevice.statusCode).toBe(200);
    expect(otherDevice.json().duplicate).toBe(true);
  });

  it("expired/foreign QR token is rejected (401)", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/v1/attendance/events",
      headers: bearer(trainerToken),
      payload: {
        event_id: randomUUID(),
        session_id: sessionId,
        trainee_id: ctx.ids.trainee,
        method: "QR",
        proof: "not-a-token",
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it("failed capture opens an exception; resolution is audited", async () => {
    const fail = await ctx.app.inject({
      method: "POST",
      url: "/v1/attendance/events",
      headers: bearer(trainerToken),
      payload: {
        event_id: randomUUID(),
        session_id: sessionId,
        trainee_id: ctx.ids.trainee2,
        method: "FACE",
        result: "FAILED",
      },
    });
    expect(fail.statusCode).toBe(201);
    expect(fail.json().exception_opened).toBe(true);

    const list = await ctx.app.inject({
      method: "GET",
      url: "/v1/attendance/exceptions",
      headers: bearer(trainerToken),
    });
    const exception = list.json().exceptions.find((e: { status: string }) => e.status === "OPEN");

    const resolve = await ctx.app.inject({
      method: "POST",
      url: `/v1/attendance/exceptions/${exception.id}/resolve`,
      headers: bearer(trainerToken),
      payload: { resolution: "RESOLVED", method: "MANUAL" },
    });
    expect(resolve.statusCode).toBe(200);
    expect(resolve.json().event).toBeTruthy();

    const audits = await ctx.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, "ATTENDANCE_EXCEPTION_RESOLVED"));
    expect(audits.length).toBe(1);
  });
});

describe("AC7: signed credentials + public verify", () => {
  it("trainer finalizes → issues a credential", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/v1/credentials",
      headers: bearer(trainerToken),
      payload: {
        subject_id: ctx.ids.trainee,
        programme_id: programmeId,
        skills: ["bookkeeping", "gst-filing"],
        assessment_summary: { score: 87 },
      },
    });
    expect(res.statusCode).toBe(201);
    credentialId = res.json().credential.id;
    expect(res.json().qr_payload).toContain(`/verify/${credentialId}`);
    expect(res.json().qr_payload).not.toContain("signature");
  });

  it("public verify returns ACTIVE with subject/programme", async () => {
    const res = await ctx.app.inject({
      method: "GET",
      url: `/v1/credentials/${credentialId}/verify`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.valid).toBe(true);
    expect(body.status).toBe("ACTIVE");
    expect(body.programme).toContain("Cooperative Accounting");
  });

  it("revocation flips verification to invalid (fail-closed)", async () => {
    const revoke = await ctx.app.inject({
      method: "POST",
      url: `/v1/credentials/${credentialId}/revoke`,
      headers: bearer(adminToken),
      payload: { reason: "issued in error" },
    });
    expect(revoke.statusCode).toBe(200);

    const verify = await ctx.app.inject({
      method: "GET",
      url: `/v1/credentials/${credentialId}/verify`,
    });
    expect(verify.json().valid).toBe(false);
    expect(verify.json().reason_if_invalid).toBe("STATUS_REVOKED");
  });

  it("unknown credential → fail-closed, not an error", async () => {
    const res = await ctx.app.inject({
      method: "GET",
      url: `/v1/credentials/${randomUUID()}/verify`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().valid).toBe(false);
    expect(res.json().reason_if_invalid).toBe("UNKNOWN_CREDENTIAL");
  });

  it("tampered stored signature → SIGNATURE_MISMATCH", async () => {
    const [row] = await ctx.db
      .select()
      .from(credentials)
      .where(eq(credentials.id, credentialId))
      .limit(1);
    await ctx.db
      .update(credentials)
      .set({ signature: "00".repeat(64) })
      .where(eq(credentials.id, credentialId));
    const res = await ctx.app.inject({
      method: "GET",
      url: `/v1/credentials/${credentialId}/verify`,
    });
    expect(res.json().valid).toBe(false);
    expect(res.json().reason_if_invalid).toBe("SIGNATURE_MISMATCH");
    void row;
  });
});

describe("AC8/AC9: employment", () => {
  it("employer onboards and gets verified", async () => {
    const created = await ctx.app.inject({
      method: "POST",
      url: "/v1/employers",
      headers: bearer(employerToken),
      payload: { name: "Anand Pattern Dairy Co-op", gst_no: "27AAAAA0000A1Z5" },
    });
    expect(created.statusCode).toBe(201);
    employerId = created.json().employer.id;

    const verified = await ctx.app.inject({
      method: "POST",
      url: `/v1/employers/${employerId}/verify`,
      headers: bearer(adminToken),
    });
    expect(verified.json().employer.verified).toBe(true);
  });

  it("employer posts a job with structured requirements", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/v1/jobs",
      headers: bearer(employerToken),
      payload: {
        employer_id: employerId,
        title: "Accounts Assistant",
        location: "Pune",
        experience_min_months: 0,
        requirements: [
          { skill_code: "bookkeeping", kind: "REQUIRED" },
          { skill_code: "cold-chain", kind: "OPTIONAL" },
        ],
      },
    });
    expect(res.statusCode).toBe(201);
    jobId = res.json().job.id;
  });

  it("matching is deterministic, explainable and stored with evidence", async () => {
    // Give trainee1 the required skill via an assessment evidence row.
    const { skills, skillEvidence } = await import("../src/db/schema.js");
    const [skill] = await ctx.db
      .select()
      .from(skills)
      .where(eq(skills.code, "bookkeeping"))
      .limit(1);
    await ctx.db.insert(skillEvidence).values({
      traineeUserId: ctx.ids.trainee,
      skillId: skill!.id,
      sourceType: "ASSESSMENT",
      sourceId: randomUUID(),
      proficiency: "INTERMEDIATE",
    });

    const res = await ctx.app.inject({
      method: "GET",
      url: `/v1/jobs/${jobId}/matches`,
      headers: bearer(employerToken),
    });
    expect(res.statusCode).toBe(200);
    const matches = res.json().matches;
    expect(matches.length).toBeGreaterThanOrEqual(2);
    // sorted by score desc
    expect(matches[0].score).toBeGreaterThanOrEqual(matches[1].score);
    const top = matches.find(
      (m: { candidate: { id: string } }) => m.candidate.id === ctx.ids.trainee,
    );
    expect(top.score).toBeGreaterThan(
      matches.find((m: { candidate: { id: string } }) => m.candidate.id !== ctx.ids.trainee)
        .score,
    );
    const required = top.requirements.find((r: { kind: string }) => r.kind === "REQUIRED");
    expect(required.result).toBe("MET");
    expect(required.evidence.length).toBeGreaterThan(0);
    const optional = top.requirements.find((r: { kind: string }) => r.kind === "OPTIONAL");
    expect(optional.result).toBe("MISSING");
  });

  it("application state machine: apply → shortlist → select → joined", async () => {
    const apply = await ctx.app.inject({
      method: "POST",
      url: "/v1/applications",
      headers: bearer(traineeToken),
      payload: { job_id: jobId },
    });
    expect(apply.statusCode).toBe(201);
    applicationId = apply.json().application.id;

    const dupApply = await ctx.app.inject({
      method: "POST",
      url: "/v1/applications",
      headers: bearer(traineeToken),
      payload: { job_id: jobId },
    });
    expect(dupApply.statusCode).toBe(409);

    const invalid = await ctx.app.inject({
      method: "PATCH",
      url: `/v1/applications/${applicationId}/state`,
      headers: bearer(employerToken),
      payload: { state: "JOINED" }, // must not jump APPLIED → JOINED
    });
    expect(invalid.statusCode).toBe(409);

    for (const state of ["SHORTLISTED", "SELECTED", "JOINED"] as const) {
      const res = await ctx.app.inject({
        method: "PATCH",
        url: `/v1/applications/${applicationId}/state`,
        headers: bearer(employerToken),
        payload: { state },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().application.state).toBe(state);
    }
  });

  it("outcome milestone is idempotent", async () => {
    const payload = {
      application_id: applicationId,
      milestone: "EMPLOYER_CONFIRMED" as const,
      evidence_ref: "offer-letter.pdf",
    };
    const first = await ctx.app.inject({
      method: "POST",
      url: "/v1/outcomes/events",
      headers: bearer(employerToken),
      payload,
    });
    expect(first.statusCode).toBe(201);

    const second = await ctx.app.inject({
      method: "POST",
      url: "/v1/outcomes/events",
      headers: bearer(employerToken),
      payload,
    });
    expect(second.statusCode).toBe(200);
    expect(second.json().duplicate).toBe(true);
  });
});

describe("AC10/AC11/AC12: insights, audit, AI kill switch", () => {
  it("funnel reconciles with what we created", async () => {
    const res = await ctx.app.inject({
      method: "GET",
      url: `/v1/analytics/funnel?programme_id=${programmeId}`,
      headers: bearer(adminToken),
    });
    expect(res.statusCode).toBe(200);
    const f = res.json();
    expect(f.nominations).toBe(1);
    expect(f.approved).toBe(1);
    expect(f.enrolled).toBe(1);
    expect(f.applied).toBeGreaterThanOrEqual(1);
    expect(f.joined).toBeGreaterThanOrEqual(1);
  });

  it("auditor can read audit logs; trainee cannot", async () => {
    const allowed = await ctx.app.inject({
      method: "GET",
      url: "/v1/audit-logs",
      headers: bearer(auditorToken),
    });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json().audit_logs.length).toBeGreaterThan(3);

    const denied = await ctx.app.inject({
      method: "GET",
      url: "/v1/audit-logs",
      headers: bearer(traineeToken),
    });
    expect(denied.statusCode).toBe(403);
  });

  it("AI kill switch: core flows unaffected, chat falls back", async () => {
    process.env.AI_DISABLED = "1";
    try {
      const chat = await ctx.app.inject({
        method: "POST",
        url: "/v1/ai/chat",
        headers: bearer(traineeToken),
        payload: { thread_id: "t1", query: "What course should I take?", lang: "en" },
      });
      expect(chat.statusCode).toBe(200);
      expect(chat.json().fallback).toBe(true);

      // …while a core flow keeps working with the AI off.
      const programmes = await ctx.app.inject({
        method: "GET",
        url: "/v1/programmes",
        headers: bearer(traineeToken),
      });
      expect(programmes.statusCode).toBe(200);
    } finally {
      delete process.env.AI_DISABLED;
    }
  });
});

describe("trainee scoping", () => {
  it("trainee only sees their own credentials", async () => {
    const res = await ctx.app.inject({
      method: "GET",
      url: `/v1/credentials/subject/${ctx.ids.trainee}`,
      headers: bearer(trainee2Token),
    });
    expect(res.statusCode).toBe(403);
  });

  it("session listing requires attendance read", async () => {
    const res = await ctx.app.inject({
      method: "GET",
      url: "/v1/attendance/sessions",
      headers: bearer(employerToken),
    });
    expect(res.statusCode).toBe(403);
  });
});

void attendanceSessions;
void desc;
