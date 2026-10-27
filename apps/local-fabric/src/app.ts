import Fastify, { type FastifyInstance } from "fastify";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { eventEnvelopeSchema, type EventEnvelope } from "@sahakar/core";
import { FabricStore, uuidv7 } from "./store.js";
import { runCycle } from "./sync-worker.js";

export interface FabricOptions {
  store: FabricStore;
  /** shared with the cloud API — same JWT_SECRET verifies device tokens */
  jwtSecret?: string;
}

function verifyJwt(token: string, secret: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts as [string, string, string];
  const expected = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Local Fabric LAN API (S2-LF01/LF02):
 *  - device auth: the same HS256 JWT the cloud issues (shared secret)
 *  - writes go to the durable outbox (append-only), never straight to cloud
 *  - reads (lessons, roster, attendance) served from SQLite while offline
 *  - /sync/run forces one push/pull cycle (the worker also loops on a timer)
 */
export function buildFabric(opts: FabricOptions): FastifyInstance {
  const { store } = opts;
  const secret = opts.jwtSecret ?? process.env.JWT_SECRET ?? "sahakar-link-dev-secret-change-me";
  const app = Fastify({ logger: false });

  const fabricToken = () => store.getKv("fabric_token") ?? process.env.FABRIC_TOKEN ?? "demo-fabric-token";
  const cloudUrl = () => store.getKv("cloud_url") ?? process.env.CLOUD_URL ?? "http://localhost:3001";

  app.get("/health", async () => ({
    status: "ok",
    service: "sahakar-fabric",
    cloud_url: cloudUrl(),
    paired: store.getKv("paired") === "1",
    outbox: store.counts(),
    lessons_cached: store.lessons().length,
    last_sync_at: store.getKv("last_sync_at"),
  }));

  /** Pair once while cloud-reachable (blueprint §12 step 4). */
  app.post("/pair", async (req, reply) => {
    const body = z
      .object({
        cloud_url: z.string().url(),
        fabric_token: z.string().min(8),
        center_id: z.string().min(1),
        device_id: z.string().min(1),
      })
      .parse(req.body);
    store.setKv("cloud_url", body.cloud_url);
    store.setKv("fabric_token", body.fabric_token);
    store.setKv("center_id", body.center_id);
    store.setKv("device_id", body.device_id);
    store.setKv("paired", "1");
    return reply.code(201).send({ paired: true });
  });

  /** Local write → append-only outbox (blueprint §3.1 left side). */
  app.post("/events", async (req, reply) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      return reply.code(401).send({ statusCode: 401, error: "Authentication required" });
    }
    const claims = verifyJwt(auth.slice(7), secret);
    if (!claims || typeof claims.sub !== "string") {
      return reply.code(401).send({ statusCode: 401, error: "Invalid token" });
    }

    const body = z
      .object({
        event_type: z.string().min(1),
        entity_type: z.string().min(1),
        entity_id: z.string().uuid(),
        entity_version: z.number().int().positive(),
        payload: z.unknown().default({}),
      })
      .parse(req.body);

    const event = {
      event_id: uuidv7(),
      center_id: store.getKv("center_id") ?? "local-center",
      device_id: store.getKv("device_id") ?? "local-device",
      actor_id: claims.sub,
      event_type: body.event_type,
      occurred_at: new Date().toISOString(),
      local_sequence: 0, // assigned by the outbox insert
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      entity_version: body.entity_version,
      payload: body.payload,
      prev_hash: null,
      signature: null,
    } satisfies EventEnvelope;

    const parsed = eventEnvelopeSchema.safeParse(event);
    if (!parsed.success) {
      return reply.code(422).send({ statusCode: 422, error: "Malformed envelope", issues: parsed.error.issues });
    }

    const { sequence, duplicate } = store.appendEvent(parsed.data);

    // Attendance writes also update the fast local read model (§5).
    if (body.event_type === "ATTENDANCE_MARKED" || body.event_type === "ATTENDANCE_CORRECTED") {
      const p = (body.payload ?? {}) as { session_id?: string; trainee_id?: string; method?: string };
      if (p.session_id && p.trainee_id) {
        store.localAttendance(p.session_id, p.trainee_id, p.method ?? "QR", event.event_id, event.occurred_at);
      }
    }

    return reply.code(duplicate ? 200 : 201).send({
      event_id: event.event_id,
      local_sequence: sequence,
      duplicate,
      queued: store.counts().PENDING,
    });
  });

  app.get("/outbox", async () => ({
    counts: store.counts(),
    pending: store.pendingBatch(50),
  }));

  /** Offline reads — everything here works with the cloud unplugged. */
  app.get("/lessons", async (req) => {
    const lang = (req.query as { lang?: string }).lang;
    return { lessons: store.lessons(lang) };
  });

  app.get("/attendance/:sessionId", async (req) => {
    const { sessionId } = req.params as { sessionId: string };
    return { marked: store.attendanceFor(sessionId) };
  });

  app.post("/sync/run", async (req, reply) => {
    try {
      const result = await runCycle(store, {
        cloud_url: cloudUrl(),
        fabric_token: fabricToken(),
      });
      store.setKv("last_sync_at", new Date().toISOString());
      return reply.send(result);
    } catch (err) {
      store.requeueStale();
      return reply
        .code(503)
        .send({ statusCode: 503, error: err instanceof Error ? err.message : "sync failed" });
    }
  });

  return app;
}
