/**
 * Database factory (ADR-013).
 *
 * - `DATABASE_URL` set  → PostgreSQL 16 (+ pgvector) via node-postgres.
 * - otherwise           → PGlite (real Postgres compiled to WASM) persisted at
 *                         `apps/api/data/pg`, so the whole system runs on a
 *                         machine with no Docker daemon. Same schema, same SQL.
 *
 * Migrations are applied on boot from `src/db/migrations`.
 */
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema.js";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Schema = typeof schema;

const migrationsFolder = fileURLToPath(new URL("./migrations", import.meta.url));

export type DbDriver = "pg" | "pglite";

/** Boot-time database (production/dev). */
export async function createDb(): Promise<{ db: DB; driver: DbDriver }> {
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder });
    return { db: db as unknown as DB, driver: "pg" };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir =
    process.env.SAHAKAR_PG_DIR ??
    fileURLToPath(new URL("../../data/pg", import.meta.url));
  mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder });
  return { db: db as unknown as DB, driver: "pglite" };
}

/** In-memory database for tests — same migrations, isolated per test file. */
export async function createTestDb(): Promise<DB> {
  const { PGlite } = await import("@electric-sql/pglite");
  const client = new PGlite();
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder });
  return db as unknown as DB;
}
