/**
 * Drizzle schema — mirrors blueprint §4 (authoritative core DDL) 1:1.
 * TRD §11: 34 entities; this file covers the core set required by AC1–AC12.
 *
 * Conventions: uuid PKs, `version` int on versioned entities (sync conflict
 * checks), append-only tables (attendance_events, audit_logs, sync_events,
 * credential_events) are never UPDATEd/DELETEd in application code.
 */
import {
  type AnyPgColumn,
  bigserial,
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const ROLES = [
  "ncct_admin",
  "institution_admin",
  "trainer",
  "trainee",
  "employer",
  "auditor",
  "platform_op",
] as const;

// ---------------------------------------------------------------------------
// identity & scope
// ---------------------------------------------------------------------------

export const institutions = pgTable("institutions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  // VAMNICOM / RICM / ICM
  type: text("type").notNull(),
  config: jsonb("config").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    institutionId: uuid("institution_id").references(() => institutions.id),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role").notNull(), // CHECK (role IN ROLES) — see migration
    locale: text("locale").notNull().default("en"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    version: integer("version").notNull().default(1),
  },
  (t) => [uniqueIndex("users_email_uidx").on(t.email)],
);

// ---------------------------------------------------------------------------
// training lifecycle (AC1)
// ---------------------------------------------------------------------------

export const programmes = pgTable("programmes", {
  id: uuid("id").primaryKey().defaultRandom(),
  institutionId: uuid("institution_id")
    .notNull()
    .references(() => institutions.id),
  title: text("title").notNull(),
  category: text("category").notNull(),
  eligibility: jsonb("eligibility").notNull().default({}),
  capacity: integer("capacity").notNull(),
  nominationOpens: timestamp("nomination_opens", { withTimezone: true }),
  nominationCloses: timestamp("nomination_closes", { withTimezone: true }),
  status: text("status").notNull().default("DRAFT"), // DRAFT|OPEN|CLOSED|RUNNING|COMPLETED
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});

export const nominations = pgTable(
  "nominations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    programmeId: uuid("programme_id")
      .notNull()
      .references(() => programmes.id),
    traineeUserId: uuid("trainee_user_id")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull().default("SUBMITTED"), // SUBMITTED|UNDER_REVIEW|APPROVED|REJECTED|WAITLISTED
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
  },
  (t) => [uniqueIndex("nominations_programme_trainee_uidx").on(t.programmeId, t.traineeUserId)],
);

export const batches = pgTable("batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  programmeId: uuid("programme_id")
    .notNull()
    .references(() => programmes.id),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").notNull().default("FORMING"), // FORMING|ACTIVE|COMPLETED|CANCELLED
  version: integer("version").notNull().default(1),
});

export const batchTrainees = pgTable(
  "batch_trainees",
  {
    batchId: uuid("batch_id")
      .notNull()
      .references(() => batches.id),
    traineeUserId: uuid("trainee_user_id")
      .notNull()
      .references(() => users.id),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.batchId, t.traineeUserId] })],
);

/** Rooms/venues/etc. — timetable double-booking guard targets this table. */
export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  institutionId: uuid("institution_id")
    .notNull()
    .references(() => institutions.id),
  kind: text("kind").notNull(), // ROOM|LAB|HOSTEL|EQUIPMENT
  name: text("name").notNull(),
  version: integer("version").notNull().default(1),
});

export const timetableSessions = pgTable(
  "timetable_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => batches.id),
    lessonId: uuid("lesson_id").references((): AnyPgColumn => lessons.id),
    trainerUserId: uuid("trainer_user_id").references(() => users.id),
    resourceId: uuid("resource_id").references(() => resources.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("SCHEDULED"), // SCHEDULED|IN_PROGRESS|COMPLETED|CANCELLED
    version: integer("version").notNull().default(1),
  },
  (t) => [uniqueIndex("timetable_no_double_book_uidx").on(t.resourceId, t.startsAt, t.endsAt)],
);
// NOTE: the resource/time EXCLUDE constraint (gist tstzrange) is added by raw
// SQL in the generated migration — drizzle does not express EXCLUDE natively.

// ---------------------------------------------------------------------------
// learning (AC2, AC3)
// ---------------------------------------------------------------------------

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  programmeId: uuid("programme_id").references(() => programmes.id),
  title: text("title").notNull(),
  language: text("language").notNull().default("en"),
  status: text("status").notNull().default("DRAFT"), // DRAFT|PUBLISHED|ARCHIVED
  version: integer("version").notNull().default(1),
});

export const courseVersions = pgTable("course_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id),
  version: integer("version").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  // object storage key for the packaged content
  contentRef: text("content_ref"),
});

export const lessons = pgTable("lessons", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseVersionId: uuid("course_version_id")
    .notNull()
    .references(() => courseVersions.id),
  ord: integer("ord").notNull(),
  title: text("title").notNull(),
  bodyMd: text("body_md").notNull(),
  mediaRef: text("media_ref"),
  durationMin: integer("duration_min").notNull().default(0),
  lang: text("lang").notNull().default("en"),
});

export const assessments = pgTable("assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseVersionId: uuid("course_version_id").references(() => courseVersions.id),
  title: text("title").notNull(),
  kind: text("kind").notNull().default("QUIZ"), // QUIZ|TEST|PRACTICAL
  maxScore: numeric("max_score", { precision: 6, scale: 2 }).notNull().default("100"),
  status: text("status").notNull().default("DRAFT"), // DRAFT|PUBLISHED|FINALIZED
  version: integer("version").notNull().default(1),
});

export const assessmentAttempts = pgTable(
  "assessment_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    traineeUserId: uuid("trainee_user_id")
      .notNull()
      .references(() => users.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    score: numeric("score", { precision: 6, scale: 2 }),
    state: text("state").notNull().default("IN_PROGRESS"), // IN_PROGRESS|SUBMITTED|GRADED|FINALIZED
    version: integer("version").notNull().default(1),
  },
  // idempotency aid per blueprint §4
  (t) => [uniqueIndex("attempts_idempotency_uidx").on(t.traineeUserId, t.assessmentId, t.startedAt)],
);

export const assessmentQuestions = pgTable("assessment_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  assessmentId: uuid("assessment_id")
    .notNull()
    .references(() => assessments.id),
  ord: integer("ord").notNull(),
  prompt: text("prompt").notNull(),
  options: jsonb("options").notNull(), // string[] of choices
  correctIndex: integer("correct_index").notNull(),
  // skill codes this question evidences
  skills: jsonb("skills").notNull().default([]),
});

/** Per-trainee lesson progress (LESSON_PROGRESS_UPDATED events write here). */
export const learningProgress = pgTable(
  "learning_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    traineeUserId: uuid("trainee_user_id")
      .notNull()
      .references(() => users.id),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id),
    state: text("state").notNull().default("IN_PROGRESS"), // NOT_STARTED|IN_PROGRESS|COMPLETED
    score: numeric("score", { precision: 6, scale: 2 }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    version: integer("version").notNull().default(1),
  },
  (t) => [uniqueIndex("learning_progress_uidx").on(t.traineeUserId, t.lessonId)],
);

// ---------------------------------------------------------------------------
// attendance (immutable, AC6 / ADR-020)
// ---------------------------------------------------------------------------

export const attendanceSessions = pgTable("attendance_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => batches.id),
  sessionDate: date("session_date").notNull(),
  // hash of the signed QR token; raw token never stored
  tokenHash: text("token_hash"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attendanceEvents = pgTable(
  "attendance_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().unique(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => attendanceSessions.id),
    traineeUserId: uuid("trainee_user_id")
      .notNull()
      .references(() => users.id),
    method: text("method").notNull(), // FACE|QR|MANUAL
    result: text("result").notNull(), // MARKED|FAILED|ABSENT
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    // embedding reference only — raw frames are never persisted (ADR-009)
    embeddingRef: text("embedding_ref"),
    actorId: uuid("actor_id").references(() => users.id),
    correctedByEvent: uuid("corrected_by_event").references(
      (): AnyPgColumn => attendanceEvents.id,
    ),
  },
  // ADR-020: duplicate protection at the database layer
  (t) => [uniqueIndex("attendance_session_trainee_uidx").on(t.sessionId, t.traineeUserId)],
);

export const attendanceExceptions = pgTable("attendance_exceptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => attendanceSessions.id),
  traineeUserId: uuid("trainee_user_id")
    .notNull()
    .references(() => users.id),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("OPEN"), // OPEN|RESOLVED|REJECTED
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// credentials (AC7 / blueprint §3.3)
// ---------------------------------------------------------------------------

export const credentials = pgTable("credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  issuerId: uuid("issuer_id")
    .notNull()
    .references(() => institutions.id),
  subjectId: uuid("subject_id")
    .notNull()
    .references(() => users.id),
  programmeId: uuid("programme_id")
    .notNull()
    .references(() => programmes.id),
  // immutable snapshots — verification recomputes canonical JSON from these
  subjectName: text("subject_name").notNull().default(""),
  programmeTitle: text("programme_title").notNull().default(""),
  skills: jsonb("skills").notNull().default([]),
  assessmentSummary: jsonb("assessment_summary").notNull().default({}),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE|REVOKED|SUSPENDED
  keyId: text("key_id").notNull(),
  signature: text("signature").notNull(),
  canonicalHash: text("canonical_hash").notNull(),
  version: integer("version").notNull().default(1),
});

export const credentialEvents = pgTable("credential_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  credentialId: uuid("credential_id")
    .notNull()
    .references(() => credentials.id),
  action: text("action").notNull(), // ISSUED|REVOKED|SUSPENDED|REINSTATED
  actorId: uuid("actor_id").references(() => users.id),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  reason: text("reason"),
});

// ---------------------------------------------------------------------------
// skills & employment (AC8, AC9)
// ---------------------------------------------------------------------------

export const skills = pgTable("skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  parentId: uuid("parent_id").references((): AnyPgColumn => skills.id),
});

export const skillEvidence = pgTable("skill_evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  traineeUserId: uuid("trainee_user_id")
    .notNull()
    .references(() => users.id),
  skillId: uuid("skill_id")
    .notNull()
    .references(() => skills.id),
  sourceType: text("source_type").notNull(), // COURSE|ASSESSMENT|CREDENTIAL
  sourceId: uuid("source_id").notNull(),
  proficiency: text("proficiency").notNull().default("BASIC"), // BASIC|INTERMEDIATE|ADVANCED
});

export const employers = pgTable("employers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  gstNo: text("gst_no"),
  verified: boolean("verified").notNull().default(false),
  verifiedBy: uuid("verified_by").references(() => users.id),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  employerId: uuid("employer_id")
    .notNull()
    .references(() => employers.id),
  title: text("title").notNull(),
  location: text("location").notNull(),
  employmentType: text("employment_type").notNull().default("FULL_TIME"),
  experienceMinMonths: integer("experience_min_months").notNull().default(0),
  status: text("status").notNull().default("OPEN"), // OPEN|CLOSED|FILLED
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});

export const jobRequirements = pgTable("job_requirements", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id),
  skillId: uuid("skill_id")
    .notNull()
    .references(() => skills.id),
  kind: text("kind").notNull(), // REQUIRED|OPTIONAL
  // hard filter: credential in this programme must exist
  credentialGate: uuid("credential_gate").references(() => programmes.id),
});

/**
 * Stored match results (blueprint §3.4): requirement set + evidence refs are
 * persisted so the employer screen renders "why this candidate" without recompute.
 */
export const jobMatches = pgTable(
  "job_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    traineeUserId: uuid("trainee_user_id")
      .notNull()
      .references(() => users.id),
    score: numeric("score", { precision: 5, scale: 2 }).notNull(),
    requirements: jsonb("requirements").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("job_matches_uidx").on(t.jobId, t.traineeUserId)],
);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    traineeUserId: uuid("trainee_user_id")
      .notNull()
      .references(() => users.id),
    state: text("state").notNull().default("APPLIED"), // APPLIED|SHORTLISTED|SELECTED|JOINED|REJECTED|WITHDRAWN
    stateChangedAt: timestamp("state_changed_at", { withTimezone: true }).notNull().defaultNow(),
    version: integer("version").notNull().default(1),
  },
  (t) => [uniqueIndex("applications_job_trainee_uidx").on(t.jobId, t.traineeUserId)],
);

export const employmentOutcomes = pgTable(
  "employment_outcomes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id),
    milestone: text("milestone").notNull(), // REPORTED|EMPLOYER_CONFIRMED|INSTITUTION_VERIFIED|RETAINED
    evidenceRef: text("evidence_ref"),
    verifiedBy: uuid("verified_by").references(() => users.id),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("outcomes_application_milestone_uidx").on(t.applicationId, t.milestone)],
);

// ---------------------------------------------------------------------------
// sync, audit, ai, ops (AC5, AC11)
// ---------------------------------------------------------------------------

export const syncEvents = pgTable(
  "sync_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    eventId: uuid("event_id").notNull().unique(),
    centerId: text("center_id").notNull(),
    deviceId: text("device_id").notNull(),
    actorId: uuid("actor_id").references(() => users.id),
    eventType: text("event_type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    localSequence: integer("local_sequence").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    entityVersion: integer("entity_version").notNull(),
    payload: jsonb("payload").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    // APPLIED|DUPLICATE|CONFLICT|DEAD_LETTER
    state: text("state").notNull().default("APPLIED"),
  },
  (t) => [uniqueIndex("sync_events_local_seq_uidx").on(t.centerId, t.deviceId, t.localSequence)],
);

export const auditLogs = pgTable("audit_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  actorId: uuid("actor_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  // ip inet in blueprint §4; text here, cast in migration if desired
  ip: text("ip"),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  kind: text("kind").notNull(),
  payload: jsonb("payload").notNull().default({}),
  readAt: timestamp("read_at", { withTimezone: true }),
});

export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceType: text("source_type").notNull(),
  sourceId: uuid("source_id").notNull(),
  lang: text("lang").notNull().default("en"),
  content: text("content").notNull(),
  // vector(1536) — pgvector column added by migration (extension required)
  embedding: jsonb("embedding"),
});

export const edgeNodes = pgTable("edge_nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  centerId: uuid("center_id")
    .notNull()
    .references(() => institutions.id),
  pairingTokenHash: text("pairing_token_hash").notNull(),
  lastHeartbeat: timestamp("last_heartbeat", { withTimezone: true }),
  version: integer("version").notNull().default(1),
});

/**
 * Change feed for `GET /sync/pull` — every applied event and key REST write
 * appends here; the fabric pulls deltas with a monotonic cursor (§7).
 */
export const entityChanges = pgTable("entity_changes", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  version: integer("version").notNull(),
  data: jsonb("data").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});
