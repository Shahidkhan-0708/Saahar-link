import type { FastifyRequest } from "fastify";
import { type Action, type Resource, can } from "@sahakar/core";

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export interface AuthUser {
  id: string;
  role: string;
  institution_id: string | null;
  display_name: string;
}

/** 401 when the request has no authenticated user. */
export function requireUser(req: FastifyRequest): AuthUser {
  const user = req.auth;
  if (!user) throw new HttpError(401, "Authentication required");
  return user;
}

/** 403 when the role is not in the allowed list. */
export function assertRole(req: FastifyRequest, ...roles: string[]): AuthUser {
  const user = requireUser(req);
  if (!roles.includes(user.role)) {
    throw new HttpError(403, `Role '${user.role}' may not perform this action`);
  }
  return user;
}

/**
 * 403 when the shared RBAC matrix (blueprint §4) denies the action.
 * Every route states its resource + action; tests assert per role.
 */
export function assertCan(
  req: FastifyRequest,
  resource: Resource,
  action: Action,
): AuthUser {
  const user = requireUser(req);
  if (!can(user.role as never, resource, action)) {
    throw new HttpError(
      403,
      `Role '${user.role}' may not ${action} ${resource}`,
    );
  }
  return user;
}

/** Institution scoping: admins/auditors may only touch their own institution's rows. */
export function assertInstitutionScope(
  req: FastifyRequest,
  rowInstitutionId: string | null | undefined,
): void {
  const user = requireUser(req);
  const scoped = ["ncct_admin", "platform_op", "auditor"];
  if (scoped.includes(user.role)) return;
  if (!user.institution_id) return;
  if (rowInstitutionId && rowInstitutionId !== user.institution_id) {
    throw new HttpError(403, "Row belongs to another institution");
  }
}
