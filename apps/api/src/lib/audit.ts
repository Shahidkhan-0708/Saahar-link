import type { DB } from "../db/index.js";

export interface AuditEntry {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}

/**
 * Append-only audit trail (blueprint §4, AC11). Every critical action listed
 * in the RBAC matrix emits exactly one row; rows are never updated.
 */
export async function writeAudit(db: DB, entry: AuditEntry): Promise<void> {
  await db.insert(auditLogsTable).values({
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    before: entry.before ?? null,
    after: entry.after ?? null,
    ip: entry.ip ?? null,
  });
}

import { auditLogs as auditLogsTable } from "../db/schema.js";
