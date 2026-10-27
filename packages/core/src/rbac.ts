import { z } from "zod";

/** Roles per blueprint §4 RBAC matrix. */
export const ROLES = [
  "ncct_admin",
  "institution_admin",
  "trainer",
  "trainee",
  "employer",
  "auditor",
  "platform_op",
] as const;

export type Role = (typeof ROLES)[number];

export const roleSchema = z.enum(ROLES);

/** Resources that appear in the RBAC matrix. */
export type Resource =
  | "programme"
  | "nomination"
  | "batch"
  | "timetable"
  | "content"
  | "attendance"
  | "credential"
  | "job"
  | "application"
  | "outcome"
  | "audit_log"
  | "sync";

export type Action = "read" | "create" | "update" | "delete" | "issue" | "revoke" | "verify";

type Permission = readonly Action[];

/**
 * RBAC matrix from blueprint §4, encoded as code.
 * Enforced by one guard (apps/api) and tested per route (S1-BE02).
 */
const READ_ONLY: Partial<Record<Resource, Permission>> = {
  programme: ["read"],
  nomination: ["read"],
  batch: ["read"],
  timetable: ["read"],
  content: ["read"],
  attendance: ["read"],
  credential: ["read"],
  job: ["read"],
  application: ["read"],
  outcome: ["read"],
  audit_log: ["read"],
  sync: ["read"],
};

export const RBAC: Record<Role, Partial<Record<Resource, readonly Action[]>>> = {
  ncct_admin: {
    programme: ["read", "create", "update", "delete"],
    nomination: ["read", "create", "update", "delete"],
    batch: ["read", "create", "update", "delete"],
    timetable: ["read"],
    content: ["read"],
    attendance: ["read"],
    credential: ["issue", "revoke", "read"],
    job: ["read", "update"],
    application: ["read"],
    outcome: ["read"],
    audit_log: ["read"],
    sync: ["read"],
  },
  institution_admin: {
    programme: ["read", "create", "update", "delete"],
    nomination: ["read", "create", "update", "delete"],
    batch: ["read", "create", "update", "delete"],
    timetable: ["read", "create", "update", "delete"],
    content: ["read", "create", "update"],
    attendance: ["read"],
    credential: ["issue", "revoke", "read"],
    job: ["read", "update"],
    application: ["read"],
    outcome: ["verify", "read"],
    audit_log: ["read"],
    sync: ["read"],
  },
  trainer: {
    programme: ["read"],
    nomination: ["read"],
    batch: ["read"],
    timetable: ["read", "create", "update"],
    content: ["read", "create", "update"],
    attendance: ["create", "read"],
    credential: ["issue", "read"],
    job: [],
    application: [],
    outcome: [],
    audit_log: [],
    sync: [],
  },
  trainee: {
    programme: ["read"],
    nomination: ["read", "create"],
    batch: ["read"],
    timetable: ["read"],
    content: ["read", "create"],
    attendance: ["read"],
    credential: ["read"],
    job: ["read"],
    application: ["read", "create"],
    outcome: ["create", "read"],
    audit_log: [],
    sync: [],
  },
  employer: {
    programme: ["read"],
    nomination: [],
    batch: [],
    timetable: [],
    content: [],
    attendance: [],
    credential: ["verify"],
    job: ["read", "create", "update", "delete"],
    application: ["read", "update"],
    outcome: ["create", "read"],
    audit_log: [],
    sync: [],
  },
  auditor: {
    programme: ["read"],
    nomination: ["read"],
    batch: ["read"],
    timetable: ["read"],
    content: ["read"],
    attendance: ["read"],
    credential: ["read"],
    job: ["read"],
    application: ["read"],
    outcome: ["read"],
    audit_log: ["read"],
    sync: ["read"],
  },
  platform_op: {
    ...READ_ONLY,
    sync: ["read", "update", "delete"],
  },
};

export function can(role: Role, resource: Resource, action: Action): boolean {
  const actions = RBAC[role][resource];
  return actions !== undefined && actions.includes(action);
}
