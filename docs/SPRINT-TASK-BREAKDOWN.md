# Sahakar-Link — Sprint Task Breakdown

Companion to `IMPLEMENTATION-BLUEPRINT.md` §9. Task-level work breakdown with dependencies, team lanes, and the stub register. IDs are stable for task assignment (`S{n}-{lane}{##}`).

**Lanes:** **BE** cloud API/DB · **FE** web app · **LF** Local Fabric/sync · **INT** integration/AI · **QA** tests/chaos · **OPS** infra/hardware. A task's "Done" is its test, not its code.

**Team assumption:** 4 builders (2 full-stack, 1 frontend-leaning, 1 backend/infra-leaning) — lanes reassign freely; dependencies are the real constraint.

**Critical path:** `S1-BE01 → S1-FE01 → S2-LF01 → S2-LF02 → S2-LF03 → S3-* → Gate C → S4-* → Gate D → S5 → Gate E`. Sprint 2's sync spine (S2-LF02/03) is the single highest-risk item — it starts day one of Sprint 2 and its chaos tests gate the sprint.

---

## Sprint 0 — Foundation (½ week)

| ID | Task | Lane | Depends on | Done when |
|---|---|---|---|---|
| S0-OPS01 | Monorepo scaffold: pnpm workspace, turbo pipeline (lint→typecheck→test→build), ESLint 9 flat, TS 5.7 base tsconfig | OPS | — | `pnpm build` green on empty packages |
| S0-OPS02 | docker-compose: postgres 16 + pgvector, minio; drizzle-kit init; blueprint §4 schema as migrations | OPS | S0-OPS01 | `docker compose up` + `drizzle-kit push` clean |
| S0-OPS03 | CI (GitHub Actions): lint → typecheck → unit → build; badge in README | OPS | S0-OPS01 | CI green on first PR |
| S0-BE01 | Fastify 5 app skeleton: /health/live + /health/ready, zod error mapper, structured logs | BE | S0-OPS02 | health endpoints respond; CI covers |
| S0-FE01 | Vite + React 19 + TanStack Router skeleton; app shell route tree (empty consoles); PWA manifest | FE | S0-OPS01 | dev server renders shell; precache works |
| S0-QA01 | Vitest workspace config; one smoke test per package | QA | S0-OPS01 | `pnpm test` runs everywhere |
| S0-INT01 | Adapter interfaces in packages/core: `AiProvider`, `LanguageProvider`, `NcctAdapter`, `NotificationAdapter` (mock impls) | INT | S0-OPS01 | mocks consumed by API skeleton |

## Sprint 1 — Training operations (AC1) — Gate A draft

| ID | Task | Lane | Depends on | Done when |
|---|---|---|---|---|
| S1-BE01 | Auth: users/institutions tables, register/login, @fastify/jwt, role claims | BE | S0-BE01 | Supertest: login → token → 403 without role |
| S1-BE02 | RBAC guard (blueprint §4 matrix) + institution scoping helper | BE | S1-BE01 | route tests per role × resource pass |
| S1-BE03 | Programmes CRUD + nomination windows (PRD-FR-001) | BE | S1-BE02 | AC1 API path: create → window opens |
| S1-BE04 | Nominations workflow (SUBMITTED→…→APPROVED/REJECTED/WAITLISTED) + uniqueness | BE | S1-BE03 | state-machine tests; duplicate nomination 409 |
| S1-BE05 | Batches + batch_trainees (PRD-FR-003) | BE | S1-BE04 | batch formed only from approved nominations |
| S1-BE06 | Timetable + resources + EXCLUDE no-double-booking constraint | BE | S1-BE05 | double-book insert violates constraint (test) |
| S1-FE01 | Login page + auth store + role-guarded route tree | FE | S1-BE01 | all 6 consoles reachable per role |
| S1-FE02 | S-11 programmes list/create + S-12 nomination review (bulk approve) | FE | S1-BE03/04 | AC1 UI flow works E2E on seed data |
| S1-FE03 | S-13 batches + S-14 timetable grid + S-15 resources/hostel stub | FE | S1-BE05/06 | timetable conflict warning renders inline |
| S1-QA01 | Seed script v1: institutions, users (all roles), 2 programmes, nominations, batch, timetable (blueprint §10 subset) | QA | S1-BE03..06 | one command loads; AC1 demo runs from seed |
| S1-INT01 | Seed data pack: 12 trainees, 3 trainers, names/personas, fictional-but-plausible content | INT | S1-QA01 | personas match demo script |
| S1-OPS01 | Vercel/Railway deploy of API+web (Profile A) + managed Postgres; env/secrets wiring | OPS | S1-BE01..06 | Profile A URL live from main |

**Gate A draft:** PS capability → module map populated; AC1 demonstrable.

## Sprint 2 — Sync spine + offline LMS (AC2–5) — Gate B ⚠ critical path

| ID | Task | Lane | Depends on | Done when |
|---|---|---|---|---|
| S2-LF01 | Local Fabric skeleton: Fastify + better-sqlite3 (WAL, FULL), blueprint §5 schema, pairing endpoint → cloud edge_nodes | LF | S1-OPS01 | fabric boots; pairing persists token |
| S2-LF02 | **Outbox engine**: append-only outbox_events, entities mirror, read APIs for lessons/quiz/progress; uuidv7 event ids | LF | S2-LF01 | kill -9 mid-write → outbox intact (test) |
| S2-LF03 | **Sync worker**: batch push ≤50 by local_sequence, per-event ACK/CONFLICT/DEAD handling, cursor pull, backoff 5→60s | LF | S2-LF01, BE01 | replayed batch → all DUPLICATE, state unchanged |
| S2-BE01 | `/v1/sync/push` + `/v1/sync/pull`: envelope zod, auth (fabric token), dedupe, version check, transactional apply, dead-letter table (blueprint §6) | BE | S1-BE02 | chaos: duplicate/reorder/retry/partial pass |
| S2-BE02 | Event registry v1 (8 types, blueprint §6.2) + quarantine for unknown types | BE | S2-BE01 | unknown event → DEAD_LETTER not applied |
| S2-FE01 | Sync client in web: outbox mirror, status chip (Online·Synced·Queued·Conflicts), retry policy | FE | S2-BE01 | airplane-mode toggles chip correctly |
| S2-FE02 | S-40 my learning + "Download for offline" (lesson packages → fabric content_cache + IndexedDB) | FE | S2-LF02 | lesson reads fully offline on phone |
| S2-FE03 | S-41 lesson player + S-42 quiz runner with autosave→outbox idempotent submit | FE | S2-FE02, S2-LF02 | AC2–4 in one take on device |
| S2-FE04 | S-03 conflict review screen (diff, keep-mine/theirs/merge) + audit on resolution | FE | S2-BE01 | forced conflict resolves; audit row exists |
| S2-QA01 | **Chaos harness** (blueprint §6.5 all 8 scenarios) as CI-runnable scripts | QA | S2-BE01, S2-LF03 | matrix green; reruns stable |
| S2-QA02 | Offline E2E: learn→airplane→quiz→reconnect→ACK, no dupes (Playwright/device) | QA | S2-FE03, S2-QA01 | AC5 E2E green |
| S2-OPS01 | Fabric packaging: single binary/script, systemd unit draft, power-loss test protocol | OPS | S2-LF03 | kill -9 + restart → sync completes |

**Gate B:** AC2,3,4,5 demonstrable offline; chaos matrix fully green. **Nothing else ships before this passes.**

## Sprint 3 — Trust layer (AC6,7,11) — Gate C

| ID | Task | Lane | Depends on | Done when |
|---|---|---|---|---|
| S3-BE01 | attendance_sessions + signed QR token (5-min TTL, nonce) + `POST /attendance/events` (idempotent per ADR-020) | BE | S2-BE01 | duplicate submit → 200 no-op (test) |
| S3-BE02 | attendance_exceptions queue + manual resolution → signed event + audit | BE | S3-BE01 | failed face → exception → resolution audited |
| S3-BE03 | Credentials: canonical JSON + Ed25519 sign (@noble), key_id, status; issue/revoke endpoints; credential_events audit | BE | S1-BE02 | tamper test fails verification |
| S3-BE04 | `GET /credentials/:id/verify` public + rate-limited, fail-closed semantics | BE | S3-BE03 | revoked/unknown/tampered → cannot-verify |
| S3-FE01 | S-31 attendance runner (QR auto-refresh + live roster) + S-30 today | FE | S3-BE01 | 7/8 marked via QR in demo seed |
| S3-FE02 | S-43 trainee self-service: QR scan (BarcodeDetector/jsQR) + face path with liveness challenge | FE | S3-BE01 | face success + light-failure → QR fallback |
| S3-FE03 | S-32 exception queue + S-33 assessments finalize (immutable) | FE | S3-BE02 | finalize locks attempts (test) |
| S3-FE04 | S-17 issuance + S-44 my credentials + **S-70 public verify page** (fail-closed states, UX inventory §3) | FE | S3-BE03/04 | scan QR on phone → verify flow |
| S3-FE05 | S-20 audit browser + S-60/S-61 auditor read-only screens | FE | S1-BE02 | auditor sees all, edits nothing (test) |
| S3-LF01 | Offline attendance against fabric LAN: roster read + event outbox; embedding ref storage only | LF | S2-LF02 | attendance works with cloud unplugged |
| S3-INT01 | Face pipeline in-browser: MediaPipe WASM precache, quality gate, liveness challenge, match ≥0.85 | INT | S3-FE02 | light/spoof test matrix passes on 2 devices |
| S3-QA01 | Trust E2E: face-fail→QR→exception→manual→audit; issue→verify→revoke→re-verify | QA | S3-FE04 | AC6, AC7 E2E green |
| S3-QA02 | Audit coverage test: every action in blueprint §4 critical list emits audit row | QA | S3-BE03 | AC11 coverage 100% on defined actions |

**Gate C:** fallback chain demoable; verify page fails closed; audit trail complete.

## Sprint 4 — Employment (AC8,9) — Gate D

| ID | Task | Lane | Depends on | Done when |
|---|---|---|---|---|
| S4-BE01 | Employers + verification workflow; skills + skill_evidence (course/assessment/credential refs) | BE | S1-BE02 | employer pending→verified by admin |
| S4-BE02 | Jobs + structured job_requirements (required/optional/gate/location/experience) | BE | S4-BE01 | job with requirement set saved |
| S4-BE03 | **Matching engine** (deterministic, blueprint §3.4) in packages/core + `GET /jobs/:id/matches` storing requirement results + evidence refs | BE | S4-BE01/02 | match rows render MET/MISSING with evidence links |
| S4-BE04 | Applications state machine (APPLIED→…→JOINED/REJECTED/WITHDRAWN) + uniqueness | BE | S4-BE02 | invalid transition 409; duplicate apply 409 |
| S4-BE05 | Outcome milestones (REPORTED→…→RETAINED) idempotent + verified_by | BE | S4-BE04 | duplicate join event idempotent (test) |
| S4-FE01 | S-50 onboarding + S-51 jobs editor with structured requirements | FE | S4-BE01/02 | employer creates job unaided |
| S4-FE02 | **S-52 matches screen** with requirement table + evidence links (+ AI note slot, disabled until S5) | FE | S4-BE03 | the UX inventory §3 S-52 mock renders from real data |
| S4-FE03 | S-46/S-47 trainee jobs+apply+tracker (with own "why you match") | FE | S4-BE03/04 | apply→shortlist→select→joined via UI |
| S4-FE04 | S-53 pipeline kanban-lite + S-54 outcome confirmation | FE | S4-BE04/05 | employer confirms joining; outcome recorded |
| S4-QA01 | Employment E2E: verify employer→job→match(evidence)→apply→join→confirm | QA | S4-FE04 | AC8, AC9 E2E green; Gate D pass |

**Gate D:** one employer, one job, one evidence-backed match, one full application flow.

## Sprint 5 — Copilot, languages, analytics (AC10,12)

| ID | Task | Lane | Depends on | Done when |
|---|---|---|---|---|
| S5-INT01 | RAG pipeline: knowledge_chunks + embeddings at seed, retrieval top-k6/0.28, AiProvider chat with citations; redaction of personal fields | INT | S1-QA01 | answers cite sources; below-threshold → fallback |
| S5-FE01 | S-48 copilot UI (citation chips, FAQ-fallback banner offline) | FE | S5-INT01 | offline → FAQ mode, no generated text |
| S5-INT02 | i18next en/hi/mr bundles + language switcher; seed course translated (en/hi/mr) | INT | S2-FE02 | demo paths render in hi + mr with no English leaks |
| S5-BE01 | Analytics: funnel aggregation view + `/analytics/funnel` + sync-lag/queue-depth metrics | BE | S4-BE05 | funnel numbers reconcile with seed |
| S5-FE02 | S-10 dashboard + S-19 analytics drill-down + sync health panel; S-18 edge nodes | FE | S5-BE01 | NCCT console shows live funnel |
| S5-QA01 | AI kill-switch test: AI adapter off → core LMS/attendance/credential flows unaffected | QA | S5-INT01 | AC12 proven in CI |
| S5-QA02 | i18n + a11y pass: keyboard-only demo path, 1.3× text scale, 44px targets | QA | S5-INT02 | UX inventory §5 checklist green |

## Sprint 6 — Hardening + demo (Gate A final + E)

| ID | Task | Lane | Depends on | Done when |
|---|---|---|---|---|
| S6-QA01 | Security suite: RBAC bypass, IDOR per institution scope, injection, rate limits, secret scan | QA | S5 | suite green; no criticals |
| S6-QA02 | Perf pass: seed-scale load → common APIs <500 ms server time; sync batch benchmark | QA | S5 | NFR-005 targets met (measured, recorded) |
| S6-OPS01 | **Profile C provisioning** on mini-PC: Node, systemd unit, hostapd+dnsmasq hotspot, avahi, pairing, power-loss video (blueprint §12) | OPS | S2-OPS01 | phone joins hotspot → full offline demo works |
| S6-OPS02 | Venue fallback: phone-hotspot profile rehearsed; PWA precache verified before each run | OPS | S6-OPS01 | fallback run works end-to-end |
| S6-FE01 | Seed polish + demo-data reset script (one command to pristine demo state) | FE | all | demo repeatable in <2 min |
| S6-QA03 | **Gate E rehearsal**: blueprint §11 script, twice, with airplane-mode toggles, timer ≤7 min | QA | S6-* | recorded run + checklist signed |
| S6-OPS03 | Docs freeze: README quickstart, ADR register final, runbook printout for judges | OPS | S6-OPS01 | docs match running system |

---

## Stub register (explicitly non-building — adapters/mocks only)

| Item | Stub shape | Where |
|---|---|---|
| Hostel/logistics deep workflows | rooms list + occupancy counts only | S1-FE03 |
| Bhashini voice (STT/TTS/translate) | `LanguageProvider` mock returns null → UI fallback | S0-INT01 |
| NCCT legacy integration | `NcctAdapter` mock contract + docs | S0-INT01 |
| External notifications (SMS/WhatsApp) | in-app drawer only | S0-INT01 |
| DigiLocker credential rail | adapter interface + design note | packages/core |
| Predictive analytics | excluded from MVP | — |
| OTP/passwordless login | interface stub; password login ships | S1-BE01 |

Any new idea during Sprints 2–6 lands here first; it enters a sprint only if it unblocks an AC or a gate.

---

## Dependency graph (sprint level)

```
S0 ──► S1 ──► S2 (sync spine, chaos) ──► S3 (trust) ──► S4 (employment) ──► S5 ──► S6
       │      │                            │                │
       │      └─ Gate A draft             └─ Gate B ⚠      ├─ Gate C        ├─ Gate D
       └─ Profile A live                                                          │
                                                       S6-OPS01 runs parallel to S6-QA01/02
                                                       from end of S4 (Pi procurement lead time)
```

**Procurement trigger:** order the mini-PC (ADR-011) at Sprint 3 start — 1–2 week lead time must not collide with Sprint 6.
