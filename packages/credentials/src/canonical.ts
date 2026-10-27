import { z } from "zod";

/** Credential payload per blueprint §3.3 / TRD §12. */
export const credentialPayloadSchema = z.object({
  credential_id: z.string().uuid(),
  issuer_id: z.string().min(1),
  subject_id: z.string().min(1),
  programme_id: z.string().uuid(),
  subject_display_name: z.string().min(1),
  programme_title: z.string().min(1),
  skills: z.array(z.string()),
  assessment_summary: z.record(z.unknown()),
  issued_at: z.string().datetime({ offset: true }),
  expires_at: z.string().datetime({ offset: true }).nullable().default(null),
  status: z.enum(["ACTIVE", "REVOKED", "SUSPENDED"]).default("ACTIVE"),
  key_id: z.string().min(1),
});

export type CredentialPayload = z.infer<typeof credentialPayloadSchema>;

/**
 * Deterministic JSON serialization: object keys sorted lexicographically at
 * every level so signature verification recomputes byte-identical input.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJson(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const entries = Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`);
  return `{${entries.join(",")}}`;
}
