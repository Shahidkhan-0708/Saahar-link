import type { FastifyInstance } from "fastify";

/**
 * Health endpoints (blueprint §7): public, no auth, used by CI, uptime probes,
 * and the Local Fabric's cloud-reachability check.
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health/live", async () => ({
    status: "ok",
    service: "sahakar-api",
    time: new Date().toISOString(),
  }));

  app.get("/health/ready", async (_req, reply) => {
    const checks: Record<string, string> = {
      process: "ok",
      database: process.env.DATABASE_URL ? "configured" : "not_configured",
    };
    const ready = Object.values(checks).every((v) => v !== "error");
    return reply.code(ready ? 200 : 503).send({ status: ready ? "ready" : "degraded", checks });
  });
}
