import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ROLES } from "@sahakar/core";
import { validate } from "../lib/errors.js";
import { HttpError, requireUser } from "../lib/guard.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { signToken } from "../plugins/auth.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  display_name: z.string().min(2).max(120),
  role: z.enum(ROLES).default("trainee"),
  institution_id: z.string().uuid().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Self-serve roles; privileged roles must be created by an admin or seed. */
const SELF_SERVE = ["trainee", "employer"];

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  app.post("/auth/register", async (req, reply) => {
    const body = validate(registerSchema, req.body);
    if (!SELF_SERVE.includes(body.role) && !req.auth) {
      // Privileged accounts require an authenticated ncct_admin/institution_admin.
      throw new HttpError(403, `Role '${body.role}' cannot self-register`);
    }
    if (req.auth && !["ncct_admin", "institution_admin"].includes(req.auth.role)) {
      throw new HttpError(403, "Only admins may create privileged accounts");
    }
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);
    if (existing) throw new HttpError(409, "Email already registered");

    const [row] = await db
      .insert(users)
      .values({
        email: body.email,
        passwordHash: hashPassword(body.password),
        displayName: body.display_name,
        role: body.role,
        institutionId: req.auth?.institution_id ?? body.institution_id ?? null,
      })
      .returning();

    const token = signToken(app, {
      id: row!.id,
      role: row!.role,
      institution_id: row!.institutionId,
      display_name: row!.displayName,
    });
    return reply.code(201).send({
      token,
      user: {
        id: row!.id,
        email: row!.email,
        display_name: row!.displayName,
        role: row!.role,
        institution_id: row!.institutionId,
      },
    });
  });

  app.post("/auth/login", async (req) => {
    const body = validate(loginSchema, req.body);
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);
    // Same error for unknown email and bad password (no account enumeration).
    if (!row || !verifyPassword(body.password, row.passwordHash)) {
      throw new HttpError(401, "Invalid email or password");
    }
    const token = signToken(app, {
      id: row.id,
      role: row.role,
      institution_id: row.institutionId,
      display_name: row.displayName,
    });
    return {
      token,
      user: {
        id: row.id,
        email: row.email,
        display_name: row.displayName,
        role: row.role,
        institution_id: row.institutionId,
      },
    };
  });

  app.get(
    "/auth/me",
    { preHandler: app.requireAuth },
    async (req) => {
      const auth = requireUser(req);
      const [row] = await db
        .select({
          id: users.id,
          email: users.email,
          display_name: users.displayName,
          role: users.role,
          institution_id: users.institutionId,
          locale: users.locale,
        })
        .from(users)
        .where(eq(users.id, auth.id))
        .limit(1);
      if (!row) throw new HttpError(401, "User no longer exists");
      return { user: row };
    },
  );
}
