import type {
  FastifyInstance,
  FastifyRequest,
  preHandlerHookHandler,
} from "fastify";
import fastifyJwt from "@fastify/jwt";
import type { AuthUser } from "../lib/guard.js";

export interface TokenPayload extends AuthUser {
  iat?: number;
  exp?: number;
}

declare module "fastify" {
  interface FastifyInstance {
    requireAuth: preHandlerHookHandler;
    requireRole: (...roles: string[]) => preHandlerHookHandler;
  }
  interface FastifyRequest {
    /** Set by our auth hook. Named `auth` to avoid colliding with @fastify/jwt's `user`. */
    auth: TokenPayload | null;
  }
}

/**
 * Auth (S1-BE01): HS256 JWT with role + institution claims. Guards are
 * preHandlers so each route declares its own requirements.
 */
export async function authPlugin(app: FastifyInstance): Promise<void> {
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? "sahakar-link-dev-secret-change-me",
    sign: { expiresIn: "12h" },
  });

  app.decorateRequest("auth", null);

  app.addHook("onRequest", async (req: FastifyRequest) => {
    req.auth = null;
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return;
    try {
      req.auth = app.jwt.verify<TokenPayload>(header.slice(7));
    } catch {
      // Invalid/expired token is treated as anonymous; route guards decide.
      req.auth = null;
    }
  });

  const requireAuth: preHandlerHookHandler = async (req, reply) => {
    if (!req.auth) {
      return reply
        .code(401)
        .send({ statusCode: 401, error: "Authentication required" });
    }
  };

  app.decorate("requireAuth", requireAuth);
  app.decorate(
    "requireRole",
    (...roles: string[]): preHandlerHookHandler =>
      async (req, reply) => {
        if (!req.auth) {
          return reply
            .code(401)
            .send({ statusCode: 401, error: "Authentication required" });
        }
        if (!roles.includes(req.auth.role)) {
          return reply
            .code(403)
            .send({ statusCode: 403, error: "Forbidden for this role" });
        }
      },
  );
}

export function signToken(
  app: FastifyInstance,
  user: AuthUser,
): string {
  return app.jwt.sign({ ...user });
}
