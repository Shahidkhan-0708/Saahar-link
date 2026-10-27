import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { createTestDb } from "../src/db/index.js";

describe("health endpoints", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const db = await createTestDb();
    app = await buildApp({ logger: false, db });
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it("GET /health/live returns 200", async () => {
    const res = await app.inject({ method: "GET", url: "/health/live" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "ok", service: "sahakar-api" });
  });

  it("GET /health/ready reports readiness", async () => {
    const res = await app.inject({ method: "GET", url: "/health/ready" });
    expect([200, 503]).toContain(res.statusCode);
    expect(res.json()).toHaveProperty("checks.process", "ok");
  });

  it("health is also exposed under /v1", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/health/live" });
    expect(res.statusCode).toBe(200);
  });

  it("unknown routes return 404", async () => {
    const res = await app.inject({ method: "GET", url: "/nope" });
    expect(res.statusCode).toBe(404);
  });
});
