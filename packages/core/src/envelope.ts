import { z } from "zod";

/**
 * Sync event envelope — TRD §9.1 / blueprint §6.1.
 * This is the single source of protocol truth: the cloud API, the Local Fabric,
 * and the web sync client all validate against this schema.
 */
export const eventEnvelopeSchema = z.object({
  /** uuidv7, time-ordered (ADR-016) */
  event_id: z.string().uuid(),
  center_id: z.string().min(1),
  device_id: z.string().min(1),
  actor_id: z.string().min(1),
  event_type: z.string().min(1),
  occurred_at: z.string().datetime({ offset: true }),
  local_sequence: z.number().int().nonnegative(),
  entity_type: z.string().min(1),
  entity_id: z.string().min(1),
  entity_version: z.number().int().positive(),
  payload: z.unknown(),
  /** optional tamper-evidence chain */
  prev_hash: z.string().nullable().default(null),
  /** required for MANUAL attendance events */
  signature: z.string().nullable().default(null),
});

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;

/** Blueprint §6.2 — event registry v1. Unknown types are quarantined (NFR-003). */
export const EVENT_TYPES = [
  "NOMINATION_APPROVED",
  "BATCH_MEMBER_ADDED",
  "LESSON_PROGRESS_UPDATED",
  "QUIZ_SUBMITTED",
  "ATTENDANCE_MARKED",
  "ATTENDANCE_CORRECTED",
  "ASSESSMENT_ATTEMPT_SUBMITTED",
  "EMPLOYMENT_REPORTED",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const eventTypeSchema = z.enum(EVENT_TYPES);

/** Blueprint §6.3 — per-event push results. */
export const pushResultSchema = z.discriminatedUnion("result", [
  z.object({
    event_id: z.string().uuid(),
    result: z.enum(["APPLIED", "DUPLICATE"]),
  }),
  z.object({
    event_id: z.string().uuid(),
    result: z.literal("CONFLICT"),
    expected_version: z.number().int().positive(),
  }),
  z.object({
    event_id: z.string().uuid(),
    result: z.literal("DEAD_LETTER"),
    reason: z.string(),
  }),
]);

export type PushResult = z.infer<typeof pushResultSchema>;

/**
 * Transport-level shape: events are validated INDIVIDUALLY so one bad event
 * yields DEAD_LETTER instead of failing the whole batch (blueprint §6.5
 * "partial" scenario — batch is atomic per event, not per batch).
 */
export const pushRequestSchema = z.object({
  events: z.array(z.unknown()).min(1).max(50),
});

export const pushResponseSchema = z.object({
  results: z.array(pushResultSchema),
});

export const pullChangeSchema = z.object({
  entity_type: z.string().min(1),
  entity_id: z.string().min(1),
  version: z.number().int().positive(),
  data: z.unknown(),
});

export const pullResponseSchema = z.object({
  changes: z.array(pullChangeSchema),
  next_cursor: z.number().int().nonnegative(),
});
