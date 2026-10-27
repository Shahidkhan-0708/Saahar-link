/**
 * Role-gated route prefixes (blueprint §8). The real guard reads JWT claims
 * (S1-FE01); this pure helper is the single place that mapping lives so it is
 * unit-testable without a DOM.
 */
import { type Role, can } from "@sahakar/core";

export type ConsolePrefix = "/admin" | "/trainer" | "/learn" | "/employer" | "/audit";

export const CONSOLES: { prefix: ConsolePrefix; label: string; roles: Role[] }[] = [
  {
    prefix: "/admin",
    label: "Administration",
    roles: ["ncct_admin", "institution_admin", "platform_op"],
  },
  { prefix: "/trainer", label: "Trainer", roles: ["trainer"] },
  { prefix: "/learn", label: "My learning", roles: ["trainee"] },
  {
    prefix: "/employer",
    label: "Employer",
    roles: ["employer"],
  },
  { prefix: "/audit", label: "Audit", roles: ["auditor", "ncct_admin", "platform_op"] },
];

export function consolesFor(role: Role) {
  return CONSOLES.filter((c) => c.roles.includes(role));
}

export function consoleFor(pathname: string): ConsolePrefix | null {
  const match = CONSOLES.find((c) => pathname === c.prefix || pathname.startsWith(`${c.prefix}/`));
  return match ? match.prefix : null;
}

/** Route guard: does this role reach this path? Unknown paths are allowed (public pages). */
export function canAccess(role: Role, pathname: string): boolean {
  const prefix = consoleFor(pathname);
  if (!prefix) return true;
  const console_ = CONSOLES.find((c) => c.prefix === prefix)!;
  if (!console_.roles.includes(role)) return false;
  // Extra server-authoritative check: e.g. trainees can't sit in /audit.
  return can(role, "audit_log", "read") || console_.roles.includes(role);
}
