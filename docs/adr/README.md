# Sahakar-Link — Architecture Decision Records

Register of architectural decisions. ADR-001…010 are inherited verbatim (status included) from TRD §26. ADR-011…020 record the decisions this design phase added, each with context, decision, and consequences. An ADR may be superseded only by a new ADR referencing it.

| ADR | Decision | Status |
|---|---|---|
| [ADR-001](#adr-001-hardware-agnostic-deployment) | Hardware-agnostic deployment | Accepted (inherited) |
| [ADR-002](#adr-002-local-first-lms) | Local-first LMS | Accepted (inherited) |
| [ADR-003](#adr-003-append-only-sync-events--server-reconciliation) | Append-only sync events + server reconciliation | Accepted (inherited) |
| [ADR-004](#adr-004-multimodal-attendance) | Multimodal attendance | Accepted (inherited) |
| [ADR-005](#adr-005-signed-credentials-no-blockchain) | Signed credentials; no blockchain | Accepted (inherited) |
| [ADR-006](#adr-006-deterministichybrid-explainable-matching) | Deterministic/hybrid explainable matching | Accepted (inherited) |
| [ADR-007](#adr-007-bounded-rag-ai) | Bounded RAG AI | Accepted (inherited) |
| [ADR-008](#adr-008-integration-adapter-layer) | Integration adapter layer | Accepted (inherited) |
| [ADR-009](#adr-009-privacy-by-minimization) | Privacy by minimization | Accepted (inherited) |
| [ADR-010](#adr-010-confirm-sih-hardware-category-interpretation) | Confirm SIH Hardware category interpretation | Open (inherited) |
| [ADR-011](#adr-011-build-deployment-profile-c-on-a-low-cost-mini-pc) | Build Deployment Profile C on a low-cost mini-PC | Accepted |
| [ADR-012](#adr-012-monorepo-pnpm--turborepo--shared-core-package) | Monorepo pnpm + Turborepo + shared core package | Accepted |
| [ADR-013](#adr-013-drizzle-orm-for-postgresql-better-sqlite3-for-local-fabric) | Drizzle ORM (Postgres) + better-sqlite3 (Local Fabric) | Accepted |
| [ADR-014](#adr-014-postgresql-backed-job-table-instead-of-redis-for-mvp) | PostgreSQL-backed job table instead of Redis for MVP | Accepted |
| [ADR-015](#adr-015-in-browser-face-recognition-mediapipe-wasm-no-server-cv) | In-browser face recognition (MediaPipe WASM), no server CV | Accepted |
| [ADR-016](#adr-016-uuidv7-event-ids--idempotency-key-on-all-stateful-posts) | UUIDv7 event IDs + idempotency keys on all stateful POSTs | Accepted |
| [ADR-017](#adr-017-tanstack-routerquery-react-19-vite-6-pwa) | TanStack Router/Query, React 19, Vite 6 PWA | Accepted |
| [ADR-018](#adr-018-i18next-with-enhimr-seed-bundles-bhashini-optional-online-only) | i18next with en/hi/mr seed bundles; Bhashini optional, online-only | Accepted |
| [ADR-019](#adr-019-pgvector-rag-with-openai-embeddings-behind-a-provider-adapter) | pgvector RAG with OpenAI embeddings behind a provider adapter | Accepted |
| [ADR-020](#adr-020-attendance-idempotency-at-the-database-layer) | Attendance idempotency at the database layer | Accepted |

---

## ADR-001 Hardware-agnostic deployment

**Status:** Accepted (inherited from TRD). The software runs on laptops/desktops/tablets/phones; no proprietary hardware required. Optional local node support retained.

## ADR-002 Local-first LMS

**Status:** Accepted (inherited). Only frontline workloads need offline operation; national governance stays cloud-centric.

## ADR-003 Append-only sync events + server reconciliation

**Status:** Accepted (inherited). No CRDT-everywhere in MVP; conflicts resolve via version checks and human review (blueprint §3.1, §6).

## ADR-004 Multimodal attendance

**Status:** Accepted (inherited). Face+liveness optional; QR and manual review are first-class fallbacks.

## ADR-005 Signed credentials; no blockchain

**Status:** Accepted (inherited). Ed25519 signatures + public verification endpoint; DigiLocker remains a future adapter.

## ADR-006 Deterministic/hybrid explainable matching

**Status:** Accepted (inherited). Deterministic scoring is the critical path; AI only narrates stored results (blueprint §3.4).

## ADR-007 Bounded RAG AI

**Status:** Accepted (inherited). RAG over approved knowledge with citations; AI failure must not block core operations (AC12).

## ADR-008 Integration adapter layer

**Status:** Accepted (inherited). NCCT/government/Bhashini/employer integrations sit behind adapter interfaces; NCCT adapter ships as a mock contract.

## ADR-009 Privacy by minimization

**Status:** Accepted (inherited). No Aadhaar, no raw biometric media persisted; frames in-memory only; DPDP-aligned notice/retention design.

## ADR-010 Confirm SIH Hardware category interpretation

**Status:** **Open** (inherited — the only open ADR). Owner: team lead, via SIH SPOC. Mitigation: ADR-011 makes the Hardware story demonstrable regardless of the outcome.

---

## ADR-011 Build Deployment Profile C on a low-cost mini-PC

**Context:** SIH26087 is a Hardware-edition PS with "Software + Hardware" mode. A pure-cloud demo risks being judged out of scope (blueprint §0, risk 1).
**Decision:** Package the Local Fabric binary for Profile C on a ₹4–6k mini-PC (Pi 5 / N100) hosting a Wi-Fi hotspot; the same binary serves Profile B on a laptop. Hardware provisioning runbook is blueprint §12.
**Consequences:** Hardware-edition evidence is demonstrable offline in front of judges; adds one provisioning workstream (Sprint 6) and venue-fallback planning (phone hotspot). No architecture change — profiles B and C share the binary (ADR-001).

## ADR-012 Monorepo pnpm + Turborepo + shared core package

**Context:** Web, API, and Local Fabric must share event envelope schemas, conflict rules, and the matching engine without drift.
**Decision:** pnpm workspace + Turborepo pipeline (lint → typecheck → test → build); `packages/core` (zod schemas, envelope, matching) and `packages/credentials` (canonical JSON + Ed25519) are consumed by all three apps.
**Consequences:** single source of protocol truth; one CI pipeline; slight onboarding overhead vs multi-repo.

## ADR-013 Drizzle ORM (Postgres) + better-sqlite3 (Local Fabric)

**Context:** TRD specifies PostgreSQL authoritative + SQLite locally; we must pick ORMs.
**Decision:** Drizzle ORM with drizzle-kit migrations for PostgreSQL (SQL-first, mirrors blueprint §4 DDL 1:1); better-sqlite3 in WAL mode with `synchronous=FULL` for the fabric (durability per NFR-002).
**Consequences:** typed schema shared via core; `synchronous=FULL` trades write latency for power-loss safety — correct trade for outbox durability.

## ADR-014 PostgreSQL-backed job table instead of Redis for MVP

**Context:** TRD §8 permits either; Redis adds an ops dependency with no demo value.
**Decision:** Job table in Postgres with `FOR UPDATE SKIP LOCKED` workers; Redis/BullMQ deferred until measured need.
**Consequences:** one less service in docker-compose; fine at demo scale; revisit at production scale.

## ADR-015 In-browser face recognition (MediaPipe WASM), no server CV

**Context:** Attendance face path must work offline on the fabric LAN; a server CV service adds failure modes and biometric data movement.
**Decision:** Face detection + liveness challenge + embedding match run fully in-browser (MediaPipe Face Landmarker WASM or face-api.js); model files precached by the service worker; threshold 0.85; quality gate precedes match; raw frames never leave memory (ADR-009).
**Consequences:** zero biometric upload; works against fabric-only LAN; model accuracy varies by device — mitigated by QR/manual fallbacks (ADR-004) and good-light demo protocol.

## ADR-016 UUIDv7 event IDs + idempotency keys on all stateful POSTs

**Context:** Flaky-network clients retry; duplicate events must be harmless (NFR-003, PRD §9.1).
**Decision:** All events use UUIDv7 (`event_id`, time-ordered); every stateful POST accepts `Idempotency-Key`; unique constraints at DB layer (blueprint §4) make duplicates no-ops.
**Consequences:** retries are always safe; sync dedupe is a single indexed lookup; UUIDv7 index locality beats UUIDv4.

## ADR-017 TanStack Router/Query, React 19, Vite 6 PWA

**Context:** Frontend needs typed routing with role guards, cache-aware data layer for offline UX, and PWA support.
**Decision:** React 19 + Vite 6 + TypeScript 5.7; TanStack Router (typed routes, guards) + Query (cache = offline read layer); `vite-plugin-pwa` (Workbox) for precache + lesson-package runtime caching.
**Consequences:** offline reads come straight from Query cache + fabric API; one mental model for loading/queued/synced states (UX inventory §4).

## ADR-018 i18next with en/hi/mr seed bundles; Bhashini optional, online-only

**Context:** MR-07 requires Indian-language experiences; PRD §12 forbids claiming Bhashini works offline.
**Decision:** i18next + react-i18next with en/hi/mr bundles seeded alongside course content; `LanguageProvider` adapter interface (translate/STT/TTS) with Bhashini as an optional online implementation; UI falls back to stored translations when the adapter is unavailable.
**Consequences:** multilingual demo works fully offline; voice is a Phase-2 adapter implementation, not an MVP dependency.

## ADR-019 pgvector RAG with OpenAI embeddings behind a provider adapter

**Context:** Career/Learning Copilot needs retrieval grounding (ADR-007) with swappable providers and cost control.
**Decision:** pgvector(1536) over `knowledge_chunks`; OpenAI `text-embedding-3-small` at seed time + cheap chat model behind `AiProvider` adapter; top-k=6, cutoff 0.28; below threshold → deterministic fallback; offline → fabric FAQ table.
**Consequences:** provider rotation without core changes; bounded demo cost (embeddings batched at seed, chat capped); grounding threshold is configurable per environment.

## ADR-020 Attendance idempotency at the database layer

**Context:** PRD acceptance rule: a duplicate submission must not create double attendance; trainer retries and multi-device clients make this a certainty, not an edge case.
**Decision:** `attendance_events` enforces `UNIQUE(event_id)` and `UNIQUE(session_id, trainee)`; corrections are new immutable events referencing `corrected_by_event`; failures never auto-mark absence.
**Consequences:** duplicate protection survives any client bug or sync replay; the audit trail keeps original + correction as separate actions (PRD §9.1).
