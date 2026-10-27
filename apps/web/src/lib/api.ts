/**
 * API client + auth store + offline outbox (S2-FE01).
 *
 * Writes are queued first (localStorage outbox), then pushed to the Local
 * Fabric when it is reachable, else straight to the cloud. Nothing silently
 * fails: every queued item surfaces in the status chip.
 */

export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";
export const FABRIC_URL_KEY = "sahakar.fabric_url";

export interface ApiUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
  institution_id: string | null;
}

const TOKEN_KEY = "sahakar.token";
const USER_KEY = "sahakar.user";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): ApiUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as ApiUser) : null;
}

export function setSession(token: string, user: ApiUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function api<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers.authorization = `Bearer ${token}`;
  let body = init.body;
  if (init.json !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, body });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth")) clearSession();
    throw new ApiError(res.status, data?.error ?? `HTTP ${res.status}`, data);
  }
  return data as T;
}

// ---------------------------------------------------------------------- outbox

export interface QueuedEvent {
  event_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  entity_version: number;
  payload: unknown;
  queued_at: number;
  state: "QUEUED" | "SENT" | "CONFLICT" | "DEAD";
  error?: string;
}

const OUTBOX_KEY = "sahakar.outbox";

function readOutbox(): QueuedEvent[] {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? "[]") as QueuedEvent[];
  } catch {
    return [];
  }
}

function writeOutbox(events: QueuedEvent[]): void {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(events));
  window.dispatchEvent(new CustomEvent("sahakar:outbox"));
}

export function uuidv7(): string {
  // time-ordered id for offline-created events (ADR-016)
  const now = Date.now();
  const hex = now.toString(16).padStart(12, "0");
  const rest = [...crypto.getRandomValues(new Uint8Array(10))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const s = `${hex}${rest}`;
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-7${s.slice(13, 16)}-8${s.slice(17, 20)}-${s.slice(20, 32)}`;
}

/** Queue a write. Safe to call while offline — it never throws. */
export function enqueue(event: Omit<QueuedEvent, "queued_at" | "state">): QueuedEvent {
  const row: QueuedEvent = { ...event, queued_at: Date.now(), state: "QUEUED" };
  writeOutbox([...readOutbox(), row]);
  return row;
}

export function outboxCounts(): { queued: number; conflict: number; dead: number; total: number } {
  const rows = readOutbox();
  return {
    queued: rows.filter((r) => r.state === "QUEUED").length,
    conflict: rows.filter((r) => r.state === "CONFLICT").length,
    dead: rows.filter((r) => r.state === "DEAD").length,
    total: rows.length,
  };
}

function replaceEvent(eventId: string, patch: Partial<QueuedEvent>): void {
  writeOutbox(
    readOutbox().map((r) => (r.event_id === eventId ? { ...r, ...patch } : r)),
  );
}

export async function flushOutbox(): Promise<number> {
  const rows = readOutbox().filter((r) => r.state === "QUEUED");
  if (rows.length === 0) return 0;
  const fabric = localStorage.getItem(FABRIC_URL_KEY);

  // Prefer the Local Fabric (LAN) when configured and reachable.
  if (fabric) {
    try {
      const probe = await fetch(`${fabric}/health`);
      if (probe.ok) {
        let sent = 0;
        const token = getToken();
        for (const row of rows) {
          const res = await fetch(`${fabric}/events`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(token ? { authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              event_type: row.event_type,
              entity_type: row.entity_type,
              entity_id: row.entity_id,
              entity_version: row.entity_version,
              payload: row.payload,
            }),
          });
          if (!res.ok) break;
          replaceEvent(row.event_id, { state: "SENT" });
          // The fabric owns the durable copy from here; drop from local queue.
          writeOutbox(readOutbox().filter((r) => r.event_id !== row.event_id));
          sent += 1;
        }
        if (sent > 0) return sent;
      }
    } catch {
      // fabric unreachable → fall through to cloud
    }
  }

  // Direct to cloud.
  let sent = 0;
  for (const row of rows) {
    try {
      const res = await fetch(`${API_BASE}/v1/sync/push`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(getToken() ? { authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({
          events: [
            {
              ...row,
              center_id: "web-center",
              device_id: "web",
              actor_id: getUser()?.id ?? "web",
              occurred_at: new Date(row.queued_at).toISOString(),
              local_sequence: row.queued_at,
              prev_hash: null,
              signature: null,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as {
        results: { result: string; expected_version?: number }[];
      };
      const result = body.results[0];
      if (result?.result === "CONFLICT") {
        replaceEvent(row.event_id, { state: "CONFLICT", error: "version conflict" });
      } else if (result?.result === "DEAD_LETTER") {
        replaceEvent(row.event_id, { state: "DEAD", error: "quarantined" });
      } else {
        writeOutbox(readOutbox().filter((r) => r.event_id !== row.event_id));
        sent += 1;
      }
    } catch (err) {
      replaceEvent(row.event_id, {
        state: "QUEUED",
        error: err instanceof Error ? err.message : "push failed",
      });
      break; // offline: stop trying the rest
    }
  }
  return sent;
}
