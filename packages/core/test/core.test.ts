import { describe, expect, it } from "vitest";
import {
  eventEnvelopeSchema,
  eventTypeSchema,
  can,
  mockAiProvider,
  nullLanguageProvider,
} from "../src/index.js";

const validEnvelope = {
  event_id: "0192f3a1-0000-7000-8000-000000000001",
  center_id: "inst-vamnicom-001",
  device_id: "tab-07",
  actor_id: "user-1",
  event_type: "QUIZ_SUBMITTED",
  occurred_at: "2026-10-07T09:15:30Z",
  local_sequence: 1234,
  entity_type: "assessment_attempt",
  entity_id: "att-1",
  entity_version: 4,
  payload: { score: 4 },
  prev_hash: null,
  signature: null,
};

describe("event envelope", () => {
  it("accepts a valid envelope", () => {
    const parsed = eventEnvelopeSchema.safeParse(validEnvelope);
    expect(parsed.success).toBe(true);
  });

  it("rejects a missing event_id", () => {
    const { event_id: _omitted, ...broken } = validEnvelope;
    expect(eventEnvelopeSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects a negative entity_version", () => {
    const broken = { ...validEnvelope, entity_version: 0 };
    expect(eventEnvelopeSchema.safeParse(broken).success).toBe(false);
  });

  it("only allows registry v1 event types", () => {
    expect(eventTypeSchema.safeParse("QUIZ_SUBMITTED").success).toBe(true);
    expect(eventTypeSchema.safeParse("MADE_UP_EVENT").success).toBe(false);
  });
});

describe("rbac matrix", () => {
  it("lets a trainer create attendance but not issue revoke", () => {
    expect(can("trainer", "attendance", "create")).toBe(true);
    expect(can("trainer", "attendance", "delete")).toBe(false);
    expect(can("trainer", "audit_log", "read")).toBe(false);
  });

  it("limits trainee to own records (read/create only)", () => {
    expect(can("trainee", "programme", "read")).toBe(true);
    expect(can("trainee", "programme", "delete")).toBe(false);
  });

  it("employer can verify credentials but not issue them", () => {
    expect(can("employer", "credential", "verify")).toBe(true);
    expect(can("employer", "credential", "issue")).toBe(false);
  });
});

describe("adapters", () => {
  it("AI mock always falls back (kill-switch safe)", async () => {
    const res = await mockAiProvider.chat({ thread_id: "t", query: "hi", lang: "en" });
    expect(res.fallback).toBe(true);
    expect(res.citations).toHaveLength(0);
  });

  it("language provider returns null so UI uses stored translations", async () => {
    expect(await nullLanguageProvider.translate("hi", "en", "hi")).toBeNull();
  });
});
