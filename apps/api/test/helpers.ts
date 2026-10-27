import { buildApp } from "../src/app.js";
import { type DB, createTestDb } from "../src/db/index.js";
import { hashPassword } from "../src/lib/password.js";
import { institutions, users } from "../src/db/schema.js";

export interface TestContext {
  app: Awaited<ReturnType<typeof buildApp>>;
  db: DB;
  ids: Record<string, string>;
}

export const PASSWORD = "TestPass123!";

/**
 * Boots the real app against an in-process Postgres with the real migrations,
 * plus one user per role (fixed emails so tests can log in).
 */
export async function setup(): Promise<TestContext> {
  const db = await createTestDb();
  const app = await buildApp({ logger: false, db });

  const [inst] = await db
    .insert(institutions)
    .values({ name: "VAMNICOM-Pune (Demo)", code: "VAMNICOM-PUNE", type: "VAMNICOM" })
    .returning();

  const specs = [
    ["ncct_admin", "ncct@demo.in"],
    ["institution_admin", "admin@demo.in"],
    ["trainer", "trainer@demo.in"],
    ["trainee", "trainee@demo.in"],
    ["employer", "employer@demo.in"],
    ["auditor", "auditor@demo.in"],
  ] as const;

  const ids: Record<string, string> = { institution: inst!.id };
  for (const [role, email] of specs) {
    const [row] = await db
      .insert(users)
      .values({
        email,
        passwordHash: hashPassword(PASSWORD),
        displayName: role.replace("_", " "),
        role,
        institutionId: role === "employer" ? null : inst!.id,
      })
      .returning();
    ids[role] = row!.id;
  }

  return { app, db, ids };
}

export async function login(
  app: TestContext["app"],
  email: string,
): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/v1/auth/login",
    payload: { email, password: PASSWORD },
  });
  if (res.statusCode !== 200) {
    throw new Error(`login failed: ${res.statusCode} ${res.body}`);
  }
  return res.json().token as string;
}

export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

/** Fabric token for /v1/sync/* (matches FABRIC_TOKEN default). */
export const FABRIC_HEADERS = {
  "x-fabric-token": process.env.FABRIC_TOKEN ?? "demo-fabric-token",
};
