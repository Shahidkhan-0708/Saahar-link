import type { EventEnvelope } from "@sahakar/core";
import type { FabricStore, OutboxRow } from "./store.js";

export interface SyncConfig {
  cloud_url: string;
  fabric_token: string;
}

export interface CycleResult {
  pushed: number;
  results: { event_id: string; result: string; expected_version?: number; reason?: string }[];
  pulled: number;
  next_cursor: number;
}

function toEnvelope(row: OutboxRow): EventEnvelope {
  return {
    event_id: row.event_id,
    center_id: row.center_id,
    device_id: row.device_id,
    actor_id: row.actor_id,
    event_type: row.event_type,
    occurred_at: row.occurred_at,
    local_sequence: row.local_sequence,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    entity_version: row.entity_version,
    payload: JSON.parse(row.payload),
    prev_hash: null,
    signature: null,
  };
}

/**
 * Sync worker cycle (S2-LF03, blueprint §6):
 *  1. push ≤50 PENDING events ordered by local_sequence (crash between
 *     mark SENT and ACK is recovered by requeueStale → replay → DUPLICATE)
 *  2. per-event ACK handling: APPLIED/DUPLICATE → ACKED, CONFLICT, DEAD
 *  3. pull deltas since the stored cursor into the entities mirror
 * Backoff (5s → 60s) lives in the scheduler around this function.
 */
export async function runCycle(store: FabricStore, cfg: SyncConfig): Promise<CycleResult> {
  const batch = store.pendingBatch(50);
  const results: CycleResult["results"] = [];

  for (const row of batch) {
    store.markState(row.event_id, "SENT");
    const res = await fetch(`${cfg.cloud_url}/v1/sync/push`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-fabric-token": cfg.fabric_token,
      },
      body: JSON.stringify({ events: [toEnvelope(row)] }),
    });
    if (!res.ok) {
      store.markState(row.event_id, "PENDING", `HTTP ${res.status}`);
      throw new Error(`push failed: HTTP ${res.status}`);
    }
    const body = (await res.json()) as {
      results: { event_id: string; result: string; expected_version?: number; reason?: string }[];
    };
    const per = body.results[0];
    if (!per) {
      store.markState(row.event_id, "PENDING", "empty result");
      throw new Error("push returned no per-event result");
    }
    switch (per.result) {
      case "APPLIED":
      case "DUPLICATE":
        store.markState(row.event_id, "ACKED");
        break;
      case "CONFLICT":
        store.markState(row.event_id, "CONFLICT", `expected ${per.expected_version}`);
        break;
      case "DEAD_LETTER":
        store.markState(row.event_id, "DEAD", per.reason ?? "dead");
        break;
      default:
        store.markState(row.event_id, "PENDING", `unknown result ${per.result}`);
    }
    results.push(per);
  }

  // Pull deltas since cursor.
  const cursor = Number(store.getKv("last_sync_cursor") ?? "0");
  const pullRes = await fetch(
    `${cfg.cloud_url}/v1/sync/pull?cursor=${cursor}`,
    { headers: { "x-fabric-token": cfg.fabric_token } },
  );
  if (!pullRes.ok) {
    throw new Error(`pull failed: HTTP ${pullRes.status}`);
  }
  const pull = (await pullRes.json()) as {
    changes: { entity_type: string; entity_id: string; version: number; data: unknown }[];
    next_cursor: number;
  };
  for (const change of pull.changes) {
    store.upsertEntity(change.entity_type, change.entity_id, change.version, change.data);
  }
  store.setKv("last_sync_cursor", String(pull.next_cursor));

  return { pushed: batch.length, results, pulled: pull.changes.length, next_cursor: pull.next_cursor };
}
