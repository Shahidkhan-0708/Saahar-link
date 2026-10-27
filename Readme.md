# Sahakar-Link ✦

**Offline-first, evidence-driven operating system for cooperative training — nomination to verified employment.**
Built for **SIH26087** — *AI & LMS-Enabled Cooperative Capacity Building, ERP & Employment Ecosystem* (Ministry of Cooperation / NCCT).

## The problem

NCCT institutions (VAMNICOM, RICMs, ICMs) run training for cooperative personnel, SHGs, and rural youth with manual, fragmented workflows — and rural connectivity cannot be assumed. Training outcomes (skills, certificates) don't reach employers in verifiable form.

## The solution

| Layer | What it does |
|---|---|
| **Cloud control plane** | Fastify + PostgreSQL ERP/LMS: programmes, nominations, batches, assessments, credentials, employers, analytics |
| **Local Fabric** (software) | Fastify + SQLite node on existing center hardware (or a ₹4–6k mini-PC): offline learning, attendance capture, durable event outbox, sync to cloud |
| **Event spine** | Append-only events, idempotent sync, version conflicts to human review — connectivity loss is a normal operating state, not an outage |
| **Trust layer** | Face/QR/manual attendance with audit trail; Ed25519-signed credentials with public QR verification |
| **Employment** | Verified employers, skill-requirement jobs, **explainable** candidate matching, outcome funnel (applied → joined → retained) |
| **Bounded AI** | RAG copilot with citations over approved content; offline FAQ fallback; core flows never depend on AI |

## Documentation

- 📐 **[Implementation blueprint](docs/IMPLEMENTATION-BLUEPRINT.md)** — architecture, schemas, sync protocol, API contracts, demo script, hardware runbook *(start here)*
- 🖥️ [UX screen inventory](docs/UX-SCREEN-INVENTORY.md) — every screen, role access, offline behavior, UI states
- 🧭 [Sprint task breakdown](docs/SPRINT-TASK-BREAKDOWN.md) — task-level WBS, lanes, dependencies, stub register
- ⚖️ [ADR register](docs/adr/README.md) — all 20 architecture decisions with rationale
- 📋 Source requirement documents (PRD · TRD · BRD · MRD) in the repo root

## Quickstart

```bash
pnpm install          # workspace: apps/api, apps/web, packages/core, packages/credentials
docker compose -f infra/docker-compose.yml up -d   # postgres 16 + pgvector, minio
pnpm --filter @sahakar/api db:push                 # apply blueprint §4 schema
pnpm --filter @sahakar/api dev                     # API  → http://localhost:3001/health/live
pnpm --filter @sahakar/web dev                     # Web  → http://localhost:5173
pnpm lint && pnpm typecheck && pnpm test && pnpm build   # the CI pipeline
```

## Status

Blueprint phase complete. **Sprint 0 (foundation) implemented:** pnpm + Turborepo workspace, ESLint 9 + TS 5.9 strict, Fastify 5 API with health endpoints and zod error mapping, React 19 + Vite 6 PWA shell with role console routes, `@sahakar/core` (event envelope, RBAC matrix, adapter interfaces with mocks), `@sahakar/credentials` (canonical JSON + Ed25519 sign/verify), Drizzle schema for blueprint §4 with generated migrations (verified against an in-process Postgres), and CI (lint → typecheck → test → build).

Next: Sprint 1 (auth + RBAC + programmes/nominations/batches — Gate A), per the sprint plan (Sprint 0–6), gated by the 12 PRD acceptance criteria and the 5 BRD decision gates.

## Team / submission

Smart India Hackathon 2026 · PS SIH26087 · Hardware edition · Smart Education
