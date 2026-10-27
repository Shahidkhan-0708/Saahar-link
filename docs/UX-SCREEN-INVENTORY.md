# Sahakar-Link — UX Screen Inventory

Companion to `IMPLEMENTATION-BLUEPRINT.md` §8. Defines every surface the 12 PRD acceptance criteria require, mapped to roles, routes, and sprints. Deliberately minimal: a screen not traceable to an AC or a sprint exit criterion is out of scope.

**Notation:** `R` = read · `C` = create · `U` = update · `—` = no access. Roles: **NA** NCCT admin · **IA** institution admin · **TR** trainer · **TE** trainee · **EM** employer · **AU** auditor.

---

## 1. Route map

```
/                        → marketing landing + login (single entry, all roles)
/login                   → auth (email+password MVP; OTP stub behind adapter)
/admin/*                 → NA + IA (institution-scoped for IA)
/trainer/*               → TR
/learn/*                 → TE (PWA-first; the only route designed offline-first)
/employer/*              → EM
/audit/*                 → AU
/verify/:credentialId    → PUBLIC (no login; rate-limited)
/review/*                → NA + IA + TR (conflict & exception queues; §6.4 of blueprint)
```

Routing: TanStack Router with role guards from JWT claims; institution scoping enforced server-side (UI guard is UX only).

---

## 2. Screen inventory

### 2.1 Shared

| # | Screen | Route | NA | IA | TR | TE | EM | AU | Sprint | AC |
|---|---|---|---|---|---|---|---|---|---|---|
| S-01 | Login | `/login` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 1 | — |
| S-02 | App shell: nav by role, **sync status chip** (`Online · Synced 128 · Queued 3 · Conflicts 1`), theme toggle, language switcher (en/hi/mr) | all | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 1–2 | 2 |
| S-03 | Conflict review queue (3 columns: Conflicts · Queued · Dead letters; diff view; Keep mine / Keep theirs / Merge) | `/review/sync` | ✓ | ✓ | ✓ | — | — | R | 2 | 5 |
| S-04 | Notifications drawer (in-app only) | global | ✓ | ✓ | ✓ | ✓ | ✓ | — | 5 | — |

The sync status chip is the product's most important UI element (MRD §8 "operational transparency") — present in every console, never hidden.

### 2.2 NCCT / Institution admin (`/admin`)

| # | Screen | Route | Purpose | Sprint | AC |
|---|---|---|---|---|---|
| S-10 | Dashboard (funnel summary: nominations → enrolled → completed → certified → joined) | `/admin` | AC10 preview at a glance | 5 | 10 |
| S-11 | Programmes list + create/edit (eligibility, capacity, nomination window) | `/admin/programmes` | AC1 start | 1 | 1 |
| S-12 | Nomination review table (approve/reject/waitlist, bulk actions) | `/admin/programmes/:id/nominations` | AC1 | 1 | 1 |
| S-13 | Batches: create from approved nominations, assign trainers | `/admin/batches` | AC1 | 1 | 1 |
| S-14 | Timetable grid (week view; drag-lite MVP = select session → trainer + room + slot; conflict warning inline) | `/admin/timetable` | PS-05 | 1 | 1 |
| S-15 | Resources & hostel stub (rooms list, occupancy counts — create/list only, per blueprint §9 stub rule) | `/admin/resources` | PS-05 | 1 | — |
| S-16 | Employers & verification (approve employer accounts) | `/admin/employers` | Gate D prerequisite | 4 | 8 |
| S-17 | Credential issuance (select finalized batch → review → issue; revoke with reason) | `/admin/credentials` | AC7 | 3 | 7 |
| S-18 | Edge nodes / fabric health (paired centers, last heartbeat, pending queue depth) | `/admin/edge-nodes` | Profile C ops | 6 | — |
| S-19 | Analytics: full funnel + per-programme drill-down + sync-lag panel | `/admin/analytics` | AC10 | 5 | 10 |
| S-20 | Audit log browser (filter by actor/action/entity; immutable view) | `/admin/audit` | AC11 | 3 | 11 |

### 2.3 Trainer (`/trainer`)

| # | Screen | Route | Purpose | Sprint | AC |
|---|---|---|---|---|---|
| S-30 | Today (sessions now, quick attendance entry points, pending exceptions count) | `/trainer` | daily driver | 3 | 6 |
| S-31 | Attendance session runner: generate QR (large, auto-refreshing token) + live roster with marked/unmarked | `/trainer/attendance/:sessionId` | AC6 | 3 | 6 |
| S-32 | Exception queue: failed face attempts + unresolved scans → resolve (mark present / absent / re-ask) with signed audit note | `/trainer/exceptions` | AC6 fallback | 3 | 6 |
| S-33 | Assessments: view attempts, grade subjective items, **finalize** (immutable; triggers credential eligibility) | `/trainer/assessments` | AC6→7 bridge | 3 | 7 |
| S-34 | Batch progress (per trainee: lessons done, quiz scores, attendance %) | `/trainer/batches/:id` | weak-topic alerts | 3–5 | 10 |
| S-35 | Sync conflict review (trainer-scoped: attendance & progress entities) | `/review/sync` | AC5 | 2 | 5 |

### 2.4 Trainee (`/learn`) — offline-first, PWA

| # | Screen | Route | Offline behavior | Sprint | AC |
|---|---|---|---|---|---|
| S-40 | My learning (courses in my batch, progress rings, "Download for offline" per course) | `/learn` | cached list | 2 | 2–3 |
| S-41 | Lesson player (markdown body, embedded media from cache, mark-complete, next/prev) | `/learn/lesson/:id` | **fully offline** | 2 | 3 |
| S-42 | Quiz runner (single attempt UX, autosave answers to outbox, submit → `Queued` badge) | `/learn/quiz/:id` | **fully offline**, idempotent submit | 2 | 4–5 |
| S-43 | Attendance self-service: scan session QR (camera → `BarcodeDetector`/jsQR) or face attempt (start → liveness challenge → result) | `/learn/attendance` | QR works against fabric on LAN; face fully local | 3 | 6 |
| S-44 | My credentials (list, QR code per credential, link to public verify view) | `/learn/credentials` | cached list | 3 | 7 |
| S-45 | Skill passport (skills with evidence chips → source lesson/assessment) | `/learn/skills` | cached | 4 | 8 |
| S-46 | Jobs browser + apply (filter by skill; explainable "why you match" panel **for the trainee too**) | `/learn/jobs` | cached while offline; apply queues | 4 | 9 |
| S-47 | Applications tracker (state machine stepper: Applied → Shortlisted → Selected → Joined) | `/learn/applications` | cached | 4 | 9 |
| S-48 | Career Copilot (chat thread with citation chips; offline → FAQ mode banner) | `/learn/copilot` | cached FAQ only | 5 | 12 |
| S-49 | Language & accessibility settings (language, text scale) | `/learn/settings` | local | 5 | — |

### 2.5 Employer (`/employer`)

| # | Screen | Route | Purpose | Sprint | AC |
|---|---|---|---|---|---|
| S-50 | Onboarding/verification status (pending → verified by admin) | `/employer/onboarding` | Gate D entry | 4 | 8 |
| S-51 | Jobs list + create/edit with **structured requirements** (required/optional skills, credential gate, location, experience) — no free-text-only postings (MR-06) | `/employer/jobs` | AC8 | 4 | 8 |
| S-52 | Candidate matches for a job: ranked rows; expanding a row shows the **requirement table** (MET/PARTIAL/MISSING + evidence links) + optional AI note | `/employer/jobs/:id/matches` | AC8 core screen | 4 | 8 |
| S-53 | Application pipeline (kanban-lite columns by state; move → state-machine event) | `/employer/jobs/:id/applications` | AC9 | 4 | 9 |
| S-54 | Outcome confirmation (confirm joining; retention milestone follow-up) | `/employer/outcomes` | AC9 + funnel truth | 4–5 | 9 |

### 2.6 Auditor (`/audit`) — read-only

| # | Screen | Route | Purpose | Sprint | AC |
|---|---|---|---|---|---|
| S-60 | Audit trail (global filter: action, actor, institution, date; drill into before/after JSON) | `/audit` | AC11 | 3 | 11 |
| S-61 | Credential history (issue/revoke/reinstate timeline per credential) | `/audit/credentials` | Gate C | 3 | 7 |

### 2.7 Public

| # | Screen | Route | Purpose | Sprint | AC |
|---|---|---|---|---|---|
| S-70 | Credential verification result (scan target: signature ✓, status ACTIVE/REVOKED, subject display name, programme, skills; fail-closed states for tampered/unknown/revoked) | `/verify/:id` | AC7 public trust | 3 | 7 |

---

## 3. Key screen specifications (the ones that make or break the demo)

### S-03 Conflict review — states
- **Conflicts:** card shows entity icon, two-column diff (critical fields highlighted red), buttons `Keep mine` `Keep theirs` `Merge fields`. Resolution → audit row + corrective event.
- **Queued:** count + oldest-first list with age; "will sync automatically".
- **Dead letters:** error reason + `Replay` (admin only).
- Empty state is explicit: "No conflicts. All changes synced."

### S-31/S-43 Attendance runner ↔ self-service pairing
- Trainer screen shows QR that refreshes every 4 min (token TTL 5 min) with a countdown ring.
- Trainee scan success → roster row flips to ✅ within 1s (WebSocket to fabric on LAN; polling fallback).
- Face attempt flow: camera preview → quality feedback ("move to light") → liveness ("blink twice") → matched/failed. Failure routes trainee to QR with one tap; **never** renders as absence (PRD §9.1 rule).

### S-42 Quiz runner — offline correctness
- Answers autosaved to IndexedDB every change; submit creates outbox event with `event_id` (uuidv7) → idempotent on retry.
- Banner while offline: "Saved on device — will sync when back online."
- Submit button disabled only while the same attempt has a PENDING submit event (prevents double-submission at the UI layer; server remains the enforcer).

### S-52 Explainable match row
```
┌ Anand Pattern Dairy — QA Supervisor        score 87 ┐
│ ▸ Anjali Deshmukh — Dairy Farm Mgmt, batch B-7       │
│   Required skills                                    │
│   ✔ Milk quality testing   evidence: Quiz Q4 (92%)   │
│   ✔ Cold-chain handling    evidence: Course C-2 L3   │
│   ✔ FPO governance         evidence: Credential #…   │
│   ✘ Accounts (Tally)       missing — no evidence     │
│   Optional: ✔ Communication  (partial)               │
│   [View profile] [Shortlist]                          │
└──────────────────────────────────────────────────────┘
```
- Score is secondary; the requirement table is the primary content (ADR-006).
- AI note (≤2 sentences, cited) renders only when online and adds a "AI-generated summary" label; never shown as the sole justification.

### S-70 Verify page — fail-closed presentation
- `ACTIVE` → green panel, skills as chips, "Issued by VAMNICOM-Pune (Demo) · signature verified".
- `REVOKED`/`SUSPENDED` → red panel with reason and revocation date.
- Unknown id / bad signature / server error → neutral red "Cannot verify — do not accept" (never a soft maybe).

---

## 4. Global states matrix (applies to every data surface)

| State | UI contract |
|---|---|
| Loading | skeleton rows, not spinners |
| Empty | sentence explaining what will appear here + primary action |
| Offline | S-02 chip turns amber; write actions remain available where supported; read from cache |
| Queued write | row-level clock badge + count in chip |
| Synced | badge clears; no toast spam — the chip is the feedback |
| Conflict | chip turns red + badge; blocking banner on affected entity screens |
| Error | inline, actionable ("Retry" / "Go to review"), never alert() |
| AI unavailable | copilot shows FAQ fallback; all other screens unaffected (AC12) |

## 5. Accessibility & i18n baseline (NFR-007, MR-07)

- Keyboard: every list action reachable; attendance runner and quiz runner fully keyboard/touch operable.
- Target sizes ≥44px for the primary touch actions (attendance, submit).
- Text scale respects system setting; tested at 1.3×.
- All screens render with hi and mr bundles using the seed course content — no placeholder English leaks in those locales on demo paths.
