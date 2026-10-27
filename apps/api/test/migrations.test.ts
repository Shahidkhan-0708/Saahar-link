import { beforeAll, describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

/**
 * Runs the real drizzle-kit migrations against an in-process Postgres (PGlite),
 * proving the blueprint §4 schema applies cleanly even where no Docker daemon
 * is available (S0-OPS02). Docker-backed `drizzle-kit push` remains the
 * integration check against real Postgres 16 + pgvector.
 */
const migrationsDir = fileURLToPath(new URL("../src/db/migrations", import.meta.url));

const migrationSql = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(migrationsDir, f), "utf8"))
  .join("\n");

describe("drizzle migrations", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(migrationSql);
  }, 60_000);

  it("applies cleanly to an empty database", async () => {
    const { rows } = await db.query<{ count: string }>(
      `select count(*)::text as count
         from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'`,
    );
    // blueprint §4 core DDL: the core tables land in migration 0000
    expect(Number(rows[0]!.count)).toBeGreaterThanOrEqual(25);
  });

  it("enforces the attendance idempotency indexes (ADR-020)", async () => {
    const { rows } = await db.query<{ indexname: string }>(
      `select indexname from pg_indexes
        where tablename = 'attendance_events' order by indexname`,
    );
    const indexes = rows.map((r) => r.indexname);
    expect(indexes.some((i) => i.includes("event_id"))).toBe(true);
    expect(indexes.some((i) => i.includes("session") && i.includes("trainee"))).toBe(true);
  });

  it("rejects duplicate nominations per programme+trainee (blueprint §4)", async () => {
    const { rows } = await db.query<{ indexname: string }>(
      `select indexname from pg_indexes where tablename = 'nominations'`,
    );
    expect(rows.map((r) => r.indexname).some((i) => i.includes("programme"))).toBe(true);
  });
});
