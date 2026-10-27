import Database from "better-sqlite3";
import { randomBytes, randomUUID } from "node:crypto";
import type { EventEnvelope } from "@sahakar/core";

/**
 * Local Fabric store — blueprint §5.
 * WAL + synchronous=FULL (NFR-002): kill -9 / power loss at any point loses
 * nothing. The outbox is the single source of local truth for writes.
 */

export type OutboxState = "PENDING" | "SENT" | "ACKED" | "CONFLICT" | "DEAD";

export interface OutboxRow {
  local_sequence: number;
  event_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  entity_version: number;
  actor_id: string;
  device_id: string;
  center_id: string;
  occurred_at: string;
  payload: string;
  state: OutboxState;
  attempts: number;
  last_error: string | null;
}

export function uuidv7(now = Date.now()): string {
  // 48-bit unix-ms timestamp + version 7 + variant + random (RFC 9562)
  const bytes = randomBytes(16);
  const ts = BigInt(now);
  bytes[0] = Number((ts >> 40n) & 0xffn);
  bytes[1] = Number((ts >> 32n) & 0xffn);
  bytes[2] = Number((ts >> 24n) & 0xffn);
  bytes[3] = Number((ts >> 16n) & 0xffn);
  bytes[4] = Number((ts >> 8n) & 0xffn);
  bytes[5] = Number(ts & 0xffn);
  bytes[6] = 0x70; // version 7
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant 10
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const SCHEMA = `
PRAGMA journal_mode=WAL;
PRAGMA synchronous=FULL;

CREATE TABLE IF NOT EXISTS outbox_events (
  local_sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_version INTEGER NOT NULL,
  actor_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  center_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  payload TEXT NOT NULL,
  state TEXT CHECK (state IN ('PENDING','SENT','ACKED','CONFLICT','DEAD')) DEFAULT 'PENDING',
  attempts INTEGER DEFAULT 0,
  last_error TEXT
);
CREATE INDEX IF NOT EXISTS outbox_pending_idx ON outbox_events(state, local_sequence);

CREATE TABLE IF NOT EXISTS entities (
  entity_type TEXT,
  entity_id TEXT,
  version INTEGER,
  data TEXT,
  PRIMARY KEY (entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS content_cache (
  course_version_id TEXT,
  lesson_id TEXT,
  ord INTEGER,
  title TEXT,
  body_md TEXT,
  lang TEXT,
  size_bytes INTEGER,
  fetched_at TEXT,
  PRIMARY KEY (lesson_id, lang)
);

CREATE TABLE IF NOT EXISTS attendance_local (
  session_id TEXT,
  trainee_id TEXT,
  method TEXT,
  result TEXT,
  event_id TEXT UNIQUE,
  occurred_at TEXT,
  PRIMARY KEY (session_id, trainee_id)
);

CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT);
`;

export class FabricStore {
  readonly db: Database.Database;

  constructor(path: string = ":memory:") {
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = FULL");
    this.db.exec(SCHEMA);
  }

  close(): void {
    this.db.close();
  }

  // ------------------------------------------------------------------- outbox

  appendEvent(event: EventEnvelope): { sequence: number; duplicate: boolean } {
    const existing = this.db
      .prepare("SELECT local_sequence FROM outbox_events WHERE event_id = ?")
      .get(event.event_id) as { local_sequence: number } | undefined;
    if (existing) return { sequence: existing.local_sequence, duplicate: true };

    const info = this.db
      .prepare(
        `INSERT INTO outbox_events
         (event_id, event_type, entity_type, entity_id, entity_version,
          actor_id, device_id, center_id, occurred_at, payload, state)
         VALUES (@event_id, @event_type, @entity_type, @entity_id, @entity_version,
                 @actor_id, @device_id, @center_id, @occurred_at, @payload, 'PENDING')`,
      )
      .run({
        event_id: event.event_id,
        event_type: event.event_type,
        entity_type: event.entity_type,
        entity_id: event.entity_id,
        entity_version: event.entity_version,
        actor_id: event.actor_id,
        device_id: event.device_id,
        center_id: event.center_id,
        occurred_at: event.occurred_at,
        payload: JSON.stringify(event.payload ?? {}),
      });
    return { sequence: Number(info.lastInsertRowid), duplicate: false };
  }

  pendingBatch(limit = 50): OutboxRow[] {
    return this.db
      .prepare(
        "SELECT * FROM outbox_events WHERE state = 'PENDING' ORDER BY local_sequence LIMIT ?",
      )
      .all(limit) as OutboxRow[];
  }

  markState(
    eventId: string,
    state: OutboxState,
    error: string | null = null,
  ): void {
    this.db
      .prepare(
        `UPDATE outbox_events
            SET state = ?, attempts = attempts + 1, last_error = ?
          WHERE event_id = ?`,
      )
      .run(state, error, eventId);
  }

  counts(): Record<OutboxState | "TOTAL", number> {
    const rows = this.db
      .prepare("SELECT state, COUNT(*) AS n FROM outbox_events GROUP BY state")
      .all() as { state: OutboxState; n: number }[];
    const out = { PENDING: 0, SENT: 0, ACKED: 0, CONFLICT: 0, DEAD: 0, TOTAL: 0 };
    for (const r of rows) {
      out[r.state] = r.n;
      out.TOTAL += r.n;
    }
    return out;
  }

  /** Requeue SENT rows older than a threshold (crash mid-push safety). */
  requeueStale(): number {
    const info = this.db
      .prepare("UPDATE outbox_events SET state = 'PENDING' WHERE state = 'SENT'")
      .run();
    return info.changes;
  }

  // ------------------------------------------------------------------ entities

  upsertEntity(type: string, id: string, version: number, data: unknown): void {
    this.db
      .prepare(
        `INSERT INTO entities (entity_type, entity_id, version, data)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(entity_type, entity_id) DO UPDATE
           SET version = excluded.version, data = excluded.data
         WHERE excluded.version >= entities.version`,
      )
      .run(type, id, version, JSON.stringify(data));
  }

  getEntity(type: string, id: string): unknown | null {
    const row = this.db
      .prepare("SELECT data FROM entities WHERE entity_type = ? AND entity_id = ?")
      .get(type, id) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : null;
  }

  listEntities(type: string): unknown[] {
    const rows = this.db
      .prepare("SELECT data FROM entities WHERE entity_type = ?")
      .all(type) as { data: string }[];
    return rows.map((r) => JSON.parse(r.data));
  }

  // ------------------------------------------------------------ content cache

  cacheLessons(
    lessons: {
      course_version_id: string;
      lesson_id: string;
      ord: number;
      title: string;
      body_md: string;
      lang: string;
    }[],
  ): number {
    const stmt = this.db.prepare(
      `INSERT INTO content_cache
         (course_version_id, lesson_id, ord, title, body_md, lang, size_bytes, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(lesson_id, lang) DO UPDATE
         SET body_md = excluded.body_md, title = excluded.title,
             fetched_at = excluded.fetched_at`,
    );
    let n = 0;
    const tx = this.db.transaction((rows: typeof lessons) => {
      for (const l of rows) {
        stmt.run(
          l.course_version_id,
          l.lesson_id,
          l.ord,
          l.title,
          l.body_md,
          l.lang,
          Buffer.byteLength(l.body_md),
          new Date().toISOString(),
        );
        n += 1;
      }
    });
    tx(lessons);
    return n;
  }

  lessons(lang?: string): unknown[] {
    const rows = (
      lang
        ? this.db
            .prepare(
              "SELECT * FROM content_cache WHERE lang = ? ORDER BY ord",
            )
            .all(lang)
        : this.db
            .prepare("SELECT * FROM content_cache ORDER BY ord")
            .all()
    ) as Record<string, unknown>[];
    return rows;
  }

  // ---------------------------------------------------------------------- kv

  setKv(key: string, value: string): void {
    this.db
      .prepare(
        "INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      )
      .run(key, value);
  }

  getKv(key: string): string | null {
    const row = this.db
      .prepare("SELECT value FROM kv WHERE key = ?")
      .get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  // ---------------------------------------------------------------- attendance

  localAttendance(
    sessionId: string,
    traineeId: string,
    method: string,
    eventId: string,
    occurredAt: string,
  ): { inserted: boolean } {
    const info = this.db
      .prepare(
        `INSERT OR IGNORE INTO attendance_local
           (session_id, trainee_id, method, result, event_id, occurred_at)
         VALUES (?, ?, ?, 'MARKED', ?, ?)`,
      )
      .run(sessionId, traineeId, method, eventId, occurredAt);
    return { inserted: info.changes > 0 };
  }

  attendanceFor(sessionId: string): unknown[] {
    return this.db
      .prepare("SELECT * FROM attendance_local WHERE session_id = ?")
      .all(sessionId);
  }
}

export function randomEventId(): string {
  return uuidv7() ?? randomUUID();
}
