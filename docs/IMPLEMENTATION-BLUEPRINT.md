# Sahakar-Link — Implementation Blueprint

**Problem statement:** SIH26087 — AI & LMS-Enabled Cooperative Capacity Building, ERP & Employment Ecosystem (Hardware edition, Smart Education)
**Owner:** Ministry of Cooperation / National Council for Cooperative Training (NCCT)
**Inputs:** `Sahakar-Link_PRD (1).pdf`, `Sahakar-Link_TRD (1).docx`, `SahakarLink_BRD (1).docx`, `SahakarLink_MRD (2).docx` (v1.0, Sep 2026)
**Status:** Build-ready blueprint. Where a decision was left open in the TRD/PRD, this document **decides it** and marks the choice with `[DECISION]`.

**Companion design documents:**

- `docs/UX-SCREEN-INVENTORY.md` — screen-level UX: routes, role access, offline behavior, key screen specs, global states matrix
- `docs/SPRINT-TASK-BREAKDOWN.md` — task-level WBS with lanes, dependencies, done-criteria, and the stub register
- `docs/adr/README.md` — ADR-001…020 register (inherited from TRD §26 plus the decisions made in this design phase)
- §9 of this blueprint, together with the sprint breakdown, replaces the PRD's 8-sprint outline with a 6-sprint execution plan

---

## 0. Validation verdict (carried from analysis)

The four documents are internally consistent, cover every feature of the official PS, and honestly separate verified facts from NCCT assumptions. The solution **does** solve the stated problem, conditional on three things this blueprint enforces:

1. **Category risk (Hardware edition):** mitigated by building Deployment Profile C — the Local Fabric packaged for a low-cost mini-PC — so "Software + Hardware" is demonstrated, not just claimed. (§12)
2. **Sync integrity:** the event-spine is implemented first (Sprint 2) and chaos-tested before features are layered on. (§6)
3. **Scope discipline:** only what the 12 PRD acceptance criteria require gets built; everything else is stubbed behind adapters. (§9)

---

## 1. Repository layout (TRD-faithful monorepo)

```
sahakar-link/
├── apps/
│   ├── web/                    React 19 + Vite 6 + TS PWA (all 6 role consoles)
│   │   ├── src/app/            routes, layout, role guards
│   │   ├── src/modules/        programmes/ nominations/ lms/ attendance/
│   │   │                       assessments/ credentials/ employment/ analytics/
│   │   ├── src/offline/        service worker hooks, cache manager, status banner
│   │   ├── src/sync/           sync client, outbox, retry policy
│   │   └── src/i18n/           en, hi, mr resource bundles
│   ├── api/                    Fastify 5 cloud API (authoritative)
│   │   ├── src/routes/v1/      one file per resource (TRD §16)
│   │   ├── src/services/       identity, programme, learning, assessment,
│   │   │                       attendance, credential, skill, employment,
│   │   │                       analytics, sync, audit, notification
│   │   ├── src/adapters/       ai/, language/, nctc-mock/, notification/
│   │   └── src/db/             drizzle schema + migrations (PostgreSQL)
│   └── local-fabric/           Fastify 5 + SQLite center node
│       ├── src/local-api/      local LAN API for trainee devices
│       ├── src/store/          SQLite schema, event outbox, content cache
│       ├── src/sync-worker/    batch push/pull, backoff, dead-letter
│       └── src/health/         heartbeat to cloud when online
├── packages/
│   ├── core/                   domain types, event envelope, zod schemas,
│   │                           matching engine, conflict rules (shared)
│   └── credentials/            canonical JSON, Ed25519 sign/verify, QR payload
├── infra/
│   ├── docker-compose.yml      postgres + pgvector, object storage (minio)
│   ├── seed/                   deterministic demo seed (TS, shared IDs)
│   ├── pi/                     mini-PC provisioning: systemd units, hostapd,
│   │                           dnsmasq, pairing runbook
│   └── chaos/                  duplicate/reorder/retry/conflict test scripts
├── archive/saahar-portal/      (previous unrelated landing page — kept, not deployed)
├── docs/
│   ├── IMPLEMENTATION-BLUEPRINT.md   (this file)
│   └── adr/                    ADR-001..010 (inherited from TRD) + new ones
├── pnpm-workspace.yaml
└── turbo.json                  lint → typecheck → test → build pipeline
```

**Stack `[DECISION]`** (each item verified available on npm):

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node 22 LTS, pnpm 9, Turborepo | workspace builds + caching |
| Web | React 19, Vite 6, TypeScript 5.7, TanStack Router+Query | PWA via `vite-plugin-pwa` (Workbox) |
| API / Fabric | Fastify 5, zod (request validation), @fastify/jwt | identical plugin style both apps |
| Cloud DB | PostgreSQL 16 + pgvector | Drizzle ORM + drizzle-kit migrations |
| Local DB | better-sqlite3 (WAL mode) | durable, survives `kill -9` / power loss |
| Crypto | @noble/curves (ed25519), @noble/hashes | no heavyweight deps |
| QR | `qrcode` (generate) + device camera (`BarcodeDetector` API, jsQR fallback) | |
| Jobs | PostgreSQL-backed job table (TRD §8 explicitly permits this for MVP) | Redis/BullMQ only if already in team tooling |
| i18n | i18next + react-i18next | en/hi/mr seed bundles |
| Tests | Vitest (unit), Supertest (API), custom chaos scripts (§6.5) | |
| Lint/CI | ESLint 9 flat, GitHub Actions: lint → typecheck → unit → integration → build | TRD §23 |

---

## 2. Deployment profiles (TRD §4) — what we actually demo

| Profile | Implementation | Demo role |
|---|---|---|
| A — Cloud only | `apps/api` + `apps/web` on Vercel/Railway; Postgres managed | Default judge walkthrough |
| B — Cloud + Local Fabric | Local Fabric runs on the presenter laptop; trainee phones on same Wi-Fi join it as PWA clients | Offline proof (Gate B) |
| C — Optional edge appliance `[DECISION: build this]` | Same Local Fabric binary provisioned on a ₹4–6k mini-PC (Raspberry Pi 5 or Intel N100 box) hosting a local hotspot (`hostapd`), mDNS `sahakarlink.local` | Hardware-edition evidence; judges physically toggle airplane mode |

The Local Fabric binary is **identical** in B and C — hardware choice never changes code (ADR-001).

---

## 3. Core data flows

### 3.1 Offline write → sync → ACK (the spine)

```
Trainee device (PWA)                Local Fabric (SQLite)              Cloud API (PostgreSQL)
────────────────────                ─────────────────────              ─────────────────────
UI action ──► local write ──► append outbox event (event_id, entity_version)
                     │                │
                     ▼                │  reads locally: lesson, quiz,
              optimistic UI           │  progress, attendance status
                                      ▼
                              sync worker: batch unsent events
                              ordered by local_sequence        ──►  POST /v1/sync/push
                                                                    1. auth (fabric token)
                                                                    2. schema + permission check
                                                                    3. event_id seen? → ACK "already applied"
                                                                    4. entity_version matches? → commit
                                                                       event + derived state in 1 txn
                                                                    5. mismatch → 409 CONFLICT
                                                                    6. permanent reject → dead-letter
                                       ◄──  ACK per event  ─────────────┘
mark event synced; UI badge: queued → synced; conflicts → review queue (trainer/admin)
```

Rules (TRD §9.3, restated as code behavior):

| Data class | Policy |
|---|---|
| Immutable events (attendance, submissions) | never overwritten; corrections are **new** events |
| Profile fields | version check; LWW only for low-risk fields; identity-critical → review |
| Timetable/room | conflict review when both edits touch same resource/time |
| Assessment marks | immutable after finalization; correction = authorized workflow |
| Credentials | immutable once issued; correction = revoke + reissue |
| Employment outcome | state machine + idempotent join events |

### 3.2 Attendance pipeline (PRD §9 acceptance rules are hard requirements)

```
Path 1: Face  capture frame → quality gate (brightness/blur/occlusion)
              → liveness challenge (blink/turn) → embedding match ≥ 0.85 [DECISION threshold]
              → ACCEPT → ATTENDANCE_MARKED event (embedding ref only, frame discarded)
Path 2: QR    session QR carries signed token {session_id, exp≤5min, nonce}
              → verify signature+window+session → ACCEPT → event
Path 3: Manual exception queue → trainer/admin review → SIGNED manual event + audit
Any failure → Path 2/3, never a silent absence. Duplicate submission → idempotent no-op.
Raw media: in-memory only, never uploaded (DPDP minimization, ADR-009).
```

Face model `[DECISION]`: **MediaPipe Face Landmarker (WASM)** or **face-api.js** running fully in-browser — no server CV service in MVP, no model download at runtime in offline mode (model file pre-cached by service worker). If device has no camera or model fails, QR path is always available (PRD rule).

### 3.3 Credential chain (TRD §12)

```
finalize assessment (authorized trainer)
→ canonical JSON payload {credential_id, issuer_id, subject_id, programme_id,
   skills[], assessment_summary, issued_at, expires_at?, status: ACTIVE}
→ Ed25519 sign with issuer key (per-environment key; private key in env/secret store)
→ store credential + signature + status; credential_events row appended (audit)
→ QR encodes https://<host>/verify/{credential_id}   (never the signature itself)
→ verifier page: GET /v1/credentials/:id/verify (public, rate-limited)
   → recompute canonical JSON → verify signature → check status
   → ACTIVE / REVOKED / SUSPENDED; unknown id or key error → fail closed
```

Key management: `SAHAKAR_SIGNING_KEY` (env, base64 seed) per environment; rotation = new `key_id` on credentials, old keys retained for verification (verification accepts any trusted historical key).

### 3.4 Explainable matching (ADR-006 — deterministic critical path)

```
score(job, candidate) = Σ weighted requirement results
  required skill   w=3   MET if skill_evidence exists (course/assessment ref)
  optional skill   w=1   MET/PARTIAL
  credential gate  w=—   HARD FILTER (e.g. "credential in programme X must exist")
  location         w=1   MET if within employer radius (or REMOTE)
  experience       w=1   months since credential issue (proxy for MVP)
output = { total_score: 0–100 normalized,
           requirements: [{requirement, result: MET|PARTIAL|MISSING, evidence:[refs]}] }
```

Every match row **stores** the requirement set + evidence refs so the employer screen renders "why this candidate" without recompute. AI (if online) may generate one narrative sentence over the table — it can never add/remove requirements or reorder beyond score. (MRD §10 guardrail.)

### 3.5 Career/Learning Copilot (bounded RAG)

```
query → safety/intent gate → embed(query)
      → pgvector ANN over knowledge_chunks (course text, programme metadata,
        skill taxonomy, approved career FAQ, job catalogue)
      → top-k=6 chunks (score ≥ 0.28 [DECISION]) → context window
      → LLM adapter (provider-pluggable; answer with [1][2] citations)
grounding < threshold → deterministic fallback ("Ask your trainer / see FAQ")
offline → cached FAQ table served by Local Fabric (no generative answer)
core flows (LMS, attendance, credentials) never call the AI path.
```

Embedding `[DECISION]`: OpenAI `text-embedding-3-small` for demo; adapter interface allows a local `bge-small` via transformers.js later. Bhashini = optional online adapter implementing `LanguageProvider {translate, speechToText, textToSpeech}`; never claimed offline (PRD §12).

---

## 4. PostgreSQL schema (authoritative — core DDL)

34 entities per TRD §11. Critical tables with types/constraints (Drizzle schema mirrors this 1:1):

```sql
-- identity & scope
users(id uuid PK, institution_id uuid FK, role text CHECK (role IN
  ('ncct_admin','institution_admin','trainer','trainee','employer','auditor','platform_op')),
  password_hash text, created_at timestamptz, updated_at timestamptz, version int);
institutions(id uuid PK, name text, code text UNIQUE, type text, -- VAMNICOM/RICM/ICM
  config jsonb DEFAULT '{}');

-- training lifecycle
programmes(id uuid PK, institution_id FK, title, category, eligibility jsonb,
  capacity int, nomination_opens timestamptz, nomination_closes timestamptz,
  status text, created_by FK, version int);
nominations(id uuid PK, programme_id FK, trainee_user_id FK, status text CHECK
  (status IN ('SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','WAITLISTED')),
  submitted_at timestamptz, decided_by uuid, decided_at timestamptz, UNIQUE(programme_id, trainee_user_id));
batches(id uuid PK, programme_id FK, name, start_date, end_date, status, version int);
batch_trainees(batch_id FK, trainee_user_id FK, PRIMARY KEY(batch_id, trainee_user_id));
timetable_sessions(id uuid PK, batch_id FK, lesson_id FK, trainer_user_id FK,
  resource_id FK, starts_at timestamptz, ends_at timestamptz, status, version int);
-- EXCLUDE constraint (gist on (resource_id, tstzrange(starts_at, ends_at))) prevents double-booking

-- learning
courses(id PK, title, language text, programme_id FK, status);
course_versions(id PK, course_id FK, version int, published_at, content_ref text); -- object storage key
lessons(id PK, course_version_id FK, ord int, title, body_md text, media_ref text,
  duration_min int);
assessment_attempts(id PK, trainee FK, assessment_id FK, started_at, submitted_at,
  score numeric, state text CHECK (state IN ('IN_PROGRESS','SUBMITTED','GRADED','FINALIZED')),
  UNIQUE(trainee, assessment, started_at)); -- idempotency aid

-- attendance (immutable)
attendance_sessions(id PK, batch_id FK, session_date date, token_hash text,
  expires_at timestamptz, created_by FK);
attendance_events(id PK, event_id uuid UNIQUE, session_id FK, trainee FK, method text
  CHECK (method IN ('FACE','QR','MANUAL')), result text, occurred_at timestamptz,
  embedding_ref text NULL, actor_id, corrected_by_event uuid NULL REFERENCES attendance_events(id),
  UNIQUE(session_id, trainee)); -- idempotent: no double marking
attendance_exceptions(id PK, session_id FK, trainee FK, reason, status text
  CHECK (status IN ('OPEN','RESOLVED','REJECTED')), resolved_by, resolved_at);

-- credentials
credentials(id uuid PK, issuer_id FK, subject_id FK, programme_id FK, skills jsonb,
  assessment_summary jsonb, issued_at timestamptz, expires_at timestamptz NULL,
  status text CHECK (status IN ('ACTIVE','REVOKED','SUSPENDED')) DEFAULT 'ACTIVE',
  key_id text, signature text, canonical_hash text);
credential_events(id PK, credential_id FK, action text CHECK (action IN
  ('ISSUED','REVOKED','SUSPENDED','REINSTATED')), actor_id, at timestamptz, reason text);

-- skills & employment
skills(id PK, code text UNIQUE, name text, parent_id FK NULL);
skill_evidence(id PK, trainee FK, skill_id FK, source_type text CHECK
  (source_type IN ('COURSE','ASSESSMENT','CREDENTIAL')), source_id uuid, proficiency text);
employers(id PK, name, gst_no text NULL, verified bool DEFAULT false, verified_by, created_by FK);
jobs(id PK, employer_id FK, title, location, employment_type, experience_min_months int,
  status, created_at);
job_requirements(id PK, job_id FK, skill_id FK, kind text CHECK (kind IN ('REQUIRED','OPTIONAL')),
  credential_gate uuid NULL REFERENCES programmes(id));
applications(id PK, job_id FK, trainee FK, state text CHECK (state IN
  ('APPLIED','SHORTLISTED','SELECTED','JOINED','REJECTED','WITHDRAWN')),
  state_changed_at timestamptz, UNIQUE(job_id, trainee));
employment_outcomes(id PK, application_id FK, milestone text CHECK (milestone IN
  ('REPORTED','EMPLOYER_CONFIRMED','INSTITUTION_VERIFIED','RETAINED')),
  evidence_ref text, verified_by, at timestamptz, UNIQUE(application_id, milestone));

-- sync, audit, ai, ops
sync_events(id PK, event_id uuid UNIQUE, center_id, device_id, actor_id, event_type,
  occurred_at, local_sequence int, entity_type, entity_id, entity_version int,
  payload jsonb, received_at timestamptz, state text CHECK (state IN
  ('APPLIED','DUPLICATE','CONFLICT','DEAD_LETTER')));
audit_logs(id bigserial PK, actor_id, action text, entity_type, entity_id, before jsonb,
  after jsonb, at timestamptz, ip inet);          -- append-only (revoke UPDATE/DELETE)
notifications(id PK, user_id FK, kind, payload jsonb, read_at timestamptz);
knowledge_chunks(id PK, source_type, source_id, lang text, content text,
  embedding vector(1536));                        -- pgvector
edge_nodes(id PK, center_id FK, pairing_token_hash, last_heartbeat timestamptz, version);
```

**RBAC matrix** (enforced in one guard, tested per route):

| Resource | ncct_admin | inst_admin | trainer | trainee | employer | auditor | platform_op |
|---|---|---|---|---|---|---|---|
| Programmes/nominations/batches | CRUD (all inst.) | CRUD (own inst.) | R | R (own) | — | R | R |
| Timetable/hostel/resources | R | CRUD | R | R (own batch) | — | R | R |
| Lessons/quiz content | R | CRUD | CRUD | R + submit | — | R | R |
| Attendance events | R | R | C + review | R (own) | — | R | R |
| Credentials | issue/revoke | issue/revoke (own inst.) | finalize → issue | R (own) | verify only | R | R |
| Jobs/applications | R | R | — | apply | CRUD own jobs + shortlist | R | R |
| Outcomes | R | verify (own inst.) | — | report | confirm | R | R |
| Audit logs | R | R (own inst.) | — | — | — | R | R |
| Sync/edge nodes | R | R (own center) | — | — | — | R | CRUD |

---

## 5. Local Fabric SQLite schema

```sql
PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;   -- NFR-002 durability

outbox_events(       -- append-only; the single source of local truth for writes
  local_sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT UNIQUE NOT NULL, event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, entity_version INTEGER NOT NULL,
  actor_id TEXT NOT NULL, device_id TEXT NOT NULL, center_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL, payload TEXT NOT NULL,     -- canonical JSON
  state TEXT CHECK (state IN ('PENDING','SENT','ACKED','CONFLICT','DEAD')) DEFAULT 'PENDING',
  attempts INTEGER DEFAULT 0, last_error TEXT);
entities(            -- versioned mirror of cloud rows the center reads/writes
  entity_type TEXT, entity_id TEXT, version INTEGER, data TEXT,  -- JSON
  PRIMARY KEY (entity_type, entity_id));
content_cache(       -- lesson packages for offline learning
  course_version_id TEXT, lesson_id TEXT, ord INTEGER, body_md TEXT, media_path TEXT,
  lang TEXT, size_bytes INTEGER, fetched_at TEXT, PRIMARY KEY (lesson_id, lang));
attendance_local(    -- fast local read model; cloud attendance_events remains authoritative
  session_id TEXT, trainee_id TEXT, method TEXT, result TEXT, event_id TEXT UNIQUE,
  occurred_at TEXT, PRIMARY KEY (session_id, trainee_id));
knowledge_faq(id TEXT PK, lang TEXT, question TEXT, answer TEXT, embedding BLOB);
kv(key TEXT PRIMARY KEY, value TEXT);   -- pairing token, fabric config, last_sync_cursor
```

Sync worker loop: every 5s when online (backoff 5s→60s on failure): batch ≤50 `PENDING` events ordered by `local_sequence` → `POST /v1/sync/push` → per-event ACK/CONFLICT/DEAD update → `pull` deltas since cursor for entities the center subscribes to. `kill -9` at any point loses nothing (WAL + FULL fsync) — this is the NFR-002 demo.

---

## 6. Sync protocol details

### 6.1 Event envelope (TRD §9.1, verbatim contract, zod-validated both sides)

```json
{
  "event_id": "0192f3a1-…",          // uuidv7 (time-ordered)
  "center_id": "inst-vamnicom-001",
  "device_id": "tab-07",
  "actor_id": "user-…",
  "event_type": "QUIZ_SUBMITTED",     // see §6.2 registry
  "occurred_at": "2026-10-07T09:15:30Z",
  "local_sequence": 1234,
  "entity_type": "assessment_attempt",
  "entity_id": "…",
  "entity_version": 4,
  "payload": { },
  "prev_hash": null,                  // optional chain for tamper evidence
  "signature": null                   // optional, required for MANUAL attendance
}
```

### 6.2 Event registry (v1)

`NOMINATION_APPROVED`, `BATCH_MEMBER_ADDED`, `LESSON_PROGRESS_UPDATED`, `QUIZ_SUBMITTED`,
`ATTENDANCE_MARKED`, `ATTENDANCE_CORRECTED`, `ASSESSMENT_ATTEMPT_SUBMITTED`,
`EMPLOYMENT_REPORTED` — each with a zod payload schema; unknown types are quarantined, not applied (NFR-003).

### 6.3 Push response per event

`200 {event_id, result: "APPLIED" | "DUPLICATE"}` · `409 {event_id, result:"CONFLICT", expected_version}` · `422 {event_id, result:"DEAD_LETTER", reason}` — batch is atomic per event, not per batch (partial failure isolation).

### 6.4 Conflict UI (the missing wireframe from the docs — defined now)

Trainer/admin console → **Review** page, three columns: *Conflicts* (entity, two versions side-by-side, diff of critical fields, [Keep mine] [Keep theirs] [Merge]) · *Queued* (count, oldest first) · *Dead letters* (reason + replay button). Every resolution writes an audit row + a corrective event.

### 6.5 Chaos test matrix (must pass before Sprint 2 exits — Gate B)

| Scenario | Injected condition | Expected |
|---|---|---|
| Duplicate | same event pushed twice | second returns DUPLICATE; no state change |
| Reorder | batch delivered out of sequence | applied by entity_version, not arrival order |
| Retry | 500 on first push, drop network, retry | ACK exactly once; UI shows queued→synced |
| Partial | batch of 10, event 5 invalid | 1–4 ACKed, 5 DEAD, 6–10 unaffected |
| Conflict | two devices edit same timetable row offline | one APPLIED, one CONFLICT → review queue |
| Power loss | `kill -9` mid-write; also pull power on Pi | restart → outbox intact, no half-applied events |
| Clock skew | device clock −30 min | accepted if within policy window (±24h), flagged |
| Spoof | replay ACKed event with edited payload | signature/hash mismatch → DEAD_LETTER |

---

## 7. API surface (TRD §16 expanded, all under `/v1`, zod-validated, JWT or fabric-token auth)

Key request/response contracts beyond the obvious CRUD:

```
POST /sync/push            {events: Envelope[]} → {results: [{event_id, result, expected_version?}]}
GET  /sync/pull?cursor=…&entities=… → {changes: [{entity_type, entity_id, version, data}], next_cursor}
POST /attendance/sessions  {batch_id, method} → {session_id, qr_token (signed, exp 5 min)}
POST /attendance/events    {event_id, session_id, trainee_id, method, proof} → 201 | 200 duplicate
GET  /credentials/:id/verify (public) → {valid: bool, status, subject_display_name,
                              programme, skills[], issued_at, reason_if_invalid}
POST /credentials          (authorized) → {credential_id, signature, qr_data_url}
GET  /jobs/:id/matches     → {matches: [{candidate, score, requirements:[{requirement,
                              result, evidence: [{type, label, ref}]}], ai_note?}]}
POST /ai/chat              {thread_id, query, lang} → {answer, citations[], fallback?: bool}
POST /outcomes/events      {application_id, milestone, evidence_ref} → state machine result
GET  /analytics/funnel?programme_id=… → {nominations, enrolled, completed, certified,
                              matched, applied, joined, retained, retention_pct}
GET /health/live | /health/ready           (public, no auth)
```

Idempotency: all POSTs that create state accept `Idempotency-Key` (or an `event_id`) and are safe to retry — this is what makes flaky-network clients correct.

---

## 8. Frontend architecture

- **Role-gated routing:** `/admin/*` (NCCT + institution), `/trainer/*`, `/learn/*` (trainee PWA), `/employer/*`, `/audit/*`. Route guards read JWT claims; institution scoping enforced client-side for UX and server-side for security.
- **Online/offline is first-class UI** (MRD §8): persistent status chip `Online · Synced 128 · Queued 3 · Conflicts 1`; queued writes show a small clock badge; nothing silently fails.
- **PWA:** precache app shell + face model files; runtime cache for fetched lesson packages (stale-while-revalidate); lesson packages explicitly persisted to IndexedDB + Local Fabric content_cache when downloading "for offline".
- **i18n:** all strings via i18next; seed bundles en/hi/mr; course content language chosen per user; LanguageProvider adapter stub returns `null` → UI falls back to stored translations (Bhashini optional online, per PRD).

---

## 9. Build order — sprints mapped to acceptance criteria & gates

| Sprint | Deliverable | Exit criterion (testable) | ACs | Gate |
|---|---|---|---|---|
| 0 | Monorepo, CI, docker-compose, Drizzle schema, seed script | `pnpm test` green in CI; seed loads | — | — |
| 1 | Auth+RBAC, institutions, programmes, nominations, batches, profiles, base UI shells | AC1 demo: admin creates programme → opens window → nominates → batch | AC1 | Gate A draft (traceability matrix populated) |
| 2 | **Sync spine first:** PWA shell + Local Fabric + outbox + sync worker + offline LMS (lessons, quiz) + conflict review UI + chaos tests | AC2–5 demo: learn online → airplane mode → continue → submit quiz → network back → ACK, no dupes | AC2,3,4,5 | **Gate B (offline proof)** |
| 3 | Attendance (QR → face/liveness → exception queue), assessments finalize → Ed25519 credentials → public verify page, audit log | AC6,7,11 demos; chaos matrix green; revoke test | AC6,7,11 | **Gate C (trust proof)** |
| 4 | Employer onboarding/verify, jobs + requirements, deterministic matching + explanation UI, applications state machine, outcome milestones | AC8,9 demos: 1 employer, 1 job, 1 evidence-backed match, apply→joined | AC8,9 | **Gate D (employment proof)** |
| 5 | RAG copilot (+offline FAQ fallback), i18n en/hi/mr, analytics funnels + NCCT dashboard | AC10,12 demos; AI-kill switch test (core flows unaffected) | AC10,12 | — |
| 6 | Hardening: security tests (RBAC bypass, injection, rate limits), performance pass (<500 ms targets), Pi provisioning + hotspot, seed polish, demo rehearsal | Gate E run ≤7 min, twice, with network toggles | all | **Gate A final + E (demo proof)** |

Anything not required by an AC is a **stub behind an adapter**: hostel/logistics (create/list only), Bhashini (interface + mock), NCCT adapter (mock contract), notifications (in-app only), predictive analytics (excluded).

---

## 10. Demo seed data (`infra/seed`, deterministic IDs, one command)

- Institution `VAMNICOM-Pune (Demo)`; programmes: *Cooperative Accounting & Compliance*, *Dairy Farm Management*.
- 12 trainees (fictional Indian names, 3 marked low-connectivity personas), 3 trainers, 1 institution admin, 1 NCCT admin, 1 auditor, 2 employers (1 verified: *Anand Pattern Dairy Co-op*).
- 1 batch of 8 trainees with a week of timetable sessions; 1 course × 3 lessons in en/hi/mr; 1 quiz (5 Qs) mapped to 4 skills; skill taxonomy ≈15 skills (accounting, dairy QA, cold-chain, FPO governance…).
- 2 jobs with requirement sets designed so one candidate matches cleanly (for the explainable-match screenshot) and one shows MISSING rows.
- Pre-loaded audit trail + one historical credential (ACTIVE) for verify-page demo.

---

## 11. Demo script (Gate E, 5–7 minutes — rehearsed in Sprint 6)

1. **(0:00)** NCCT dashboard → create programme, open nominations (AC1).
2. **(0:45)** Approve 8 nominations → form batch → publish timetable (AC1).
3. **(1:15)** Switch to trainee phone: open lesson **→ toggle airplane mode on camera-visible Pi/laptop** → continue lesson, submit quiz → UI shows `Queued: 3` (AC2–4).
4. **(2:30)** Network restored → sync badge animates to `Synced`, sync log shows ACKs; replay one event → `DUPLICATE` (AC5).
5. **(3:00)** Trainer: QR attendance success for 7 trainees; face attempt in bad light fails → exception → manual review → signed event + audit row (AC6).
6. **(4:00)** Finalize quiz results → issue credential → phone camera scans QR → public verify page `ACTIVE` → admin revokes → rescan shows `REVOKED` (AC7).
7. **(4:45)** Employer: create job with skill requirements → explainable match (MET/MISSING with evidence links) → apply → shortlist → select → joined → outcome `EMPLOYER_CONFIRMED` (AC8, 9).
8. **(5:30)** NCCT funnel updates live; auditor opens audit trail; ask copilot a career question with citations; show offline FAQ fallback (AC10, 12, 11).

---

## 12. Hardware runbook (Profile C — the Hardware-edition answer)

Target: Raspberry Pi 5 (4 GB) or Intel N100 mini-PC, ₹4–6k, flashed with Raspberry Pi OS Lite.

1. Install Node 22; clone repo; `pnpm --filter local-fabric build`.
2. `infra/pi/sahakar-fabric.service` (systemd, `Restart=always`) runs the fabric; SQLite at `/var/lib/sahakar/fabric.sqlite`.
3. `hostapd` hotspot `SahakarLink-Local` + `dnsmasq` DHCP; `avahi` advertises `sahakarlink.local`; trainee phones join and open the PWA (service worker already cached).
4. Pair once while cloud is reachable: fabric presents pairing token → cloud `edge_nodes` row created → fabric token stored in `kv` (revocable from cloud admin).
5. Power-loss test: yank cable mid-quiz-submission; reboot; outbox intact; sync completes (NFR-002 evidence — record on video for the pitch).
6. Fallback if judge Wi-Fi is hostile: same fabric on presenter laptop with phone hotspot.

---

## 13. Traceability — AC → mechanism → sprint

| PRD AC | Mechanism (§) | Sprint | Also satisfies BRD gate |
|---|---|---|---|
| 1 programme→nomination→batch | §4 schema, §7 API | 1 | A |
| 2 online learning | PWA + LMS module | 2 | — |
| 3 offline continuation | Local Fabric content_cache | 2 | B |
| 4 local persistence survives restart | SQLite WAL+FULL outbox; §6.5 power-loss test | 2 | B |
| 5 reconnect sync w/o duplicates | §6.3 idempotent push; chaos matrix | 2 | B |
| 6 attendance face/QR/manual | §3.2 pipeline | 3 | C |
| 7 signed credential + QR verify | §3.3 chain | 3 | C |
| 8 explainable matches | §3.4 engine | 4 | D |
| 9 application → outcome states | state machine + milestones | 4 | D |
| 10 dashboards | §7 funnel API | 5 | E |
| 11 audit coverage | audit_logs on all critical actions (§4) | 3 | C |
| 12 core ops without AI | AI isolated behind adapter; kill-switch test | 5 | — |

---

## 14. Risks register (implementation view)

| Risk | Mitigation in this blueprint |
|---|---|
| Face model accuracy varies by device | quality gate + 0.85 threshold + QR/manual always available; demo in good light |
| pgvector/demo-provider cost | embeddings batched at seed time; chat uses cheap model; hard cap + fallback text |
| Pi Wi-Fi congestion in venue | presenter phone hotspot fallback; PWA precached before demo |
| Scope creep (hostel, voice, predictive) | all stubbed behind adapters by design; AC checklist is the contract |
| Judge asks "where's the AI?" | copilot with citations + AI-kill-switch demo shows governance posture |

---

## 15. Definition of done

- [ ] All 12 PRD acceptance criteria demonstrable in one continuous session (Gate E script, §11)
- [ ] Chaos matrix §6.5 fully green in CI
- [ ] RBAC matrix §4 enforced and covered by route-level tests
- [ ] `kill -9` / power-loss test recorded (NFR-002)
- [ ] Profile C provisioned on mini-PC (or laptop fallback) with hotspot working
- [ ] Credential verify fails closed for tampered/revoked/unknown cases
- [ ] No raw biometric media persisted anywhere (code review + grep gate)
- [ ] Docs: README quickstart, ADR register copied from TRD + this file's decisions
