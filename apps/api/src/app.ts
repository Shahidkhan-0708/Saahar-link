import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { type DB, createDb } from "./db/index.js";
import { ValidationError } from "./lib/errors.js";
import { HttpError } from "./lib/guard.js";
import { authPlugin } from "./plugins/auth.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { programmeRoutes } from "./routes/programmes.js";
import { nominationRoutes } from "./routes/nominations.js";
import { batchRoutes } from "./routes/batches.js";
import { contentRoutes } from "./routes/content.js";
import { syncRoutes } from "./routes/sync.js";
import { attendanceRoutes } from "./routes/attendance.js";
import { credentialRoutes } from "./routes/credentials.js";
import { employmentRoutes } from "./routes/employment.js";
import { insightRoutes } from "./routes/insights.js";

declare module "fastify" {
  interface FastifyInstance {
    db: DB;
  }
}

export interface BuildAppOptions {
  logger?: boolean;
  /** Inject a database (tests pass an in-memory PGlite; boot creates one). */
  db?: DB;
}

export async function buildApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  const db = opts.db ?? (await createDb()).db;

  const app = Fastify({
    logger: opts.logger === false ? false : { level: process.env.LOG_LEVEL ?? "info" },
  });

  app.addHook("onRequest", async (req, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-fabric-token");
    if (req.method === "OPTIONS") {
      return reply.code(204).send();
    }
  });

  app.decorate("db", db);
  await authPlugin(app);

  app.setErrorHandler((error: FastifyError | ValidationError | ZodError | HttpError, _request, reply) => {
    if (error instanceof HttpError) {
      return reply
        .code(error.statusCode)
        .send({ statusCode: error.statusCode, error: error.message, details: error.details });
    }
    if (error instanceof ValidationError || error instanceof ZodError) {
      const issues = error instanceof ZodError ? error.issues : error.issues;
      return reply.code(400).send({ statusCode: 400, error: "Validation failed", issues });
    }
    const statusCode = (error as FastifyError).statusCode;
    if (statusCode && statusCode < 500) {
      return reply.code(statusCode).send({ statusCode, error: error.message });
    }
    app.log.error({ err: error }, "unhandled error");
    return reply.code(500).send({ statusCode: 500, error: "Internal Server Error" });
  });

  // Public health at the root (no auth) …
  await app.register(healthRoutes);

  // … and every versioned resource under /v1 (blueprint §7).
  await app.register(
    async (v1) => {
      await v1.register(healthRoutes);
      await v1.register(authRoutes);
      await v1.register(programmeRoutes);
      await v1.register(nominationRoutes);
      await v1.register(batchRoutes);
      await v1.register(contentRoutes);
      await v1.register(syncRoutes);
      await v1.register(attendanceRoutes);
      await v1.register(credentialRoutes);
      await v1.register(employmentRoutes);
      await v1.register(insightRoutes);
    },
    { prefix: "/v1" },
  );

  return app;
}
