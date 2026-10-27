import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  credentialPayloadSchema,
  keyPairFromSeed,
  qrPayload,
  signCredential,
  verifyCredential,
} from "@sahakar/credentials";
import { validate } from "../lib/errors.js";
import { HttpError, assertCan } from "../lib/guard.js";
import { writeAudit } from "../lib/audit.js";
import { credentialEvents, credentials, programmes, users } from "../db/schema.js";

const issueSchema = z.object({
  subject_id: z.string().uuid(),
  programme_id: z.string().uuid(),
  skills: z.array(z.string()).default([]),
  assessment_summary: z.record(z.unknown()).default({}),
  expires_at: z.string().datetime({ offset: true }).nullable().optional(),
});

/**
 * Credential chain (blueprint §3.3 / ADR-005):
 * canonical JSON → Ed25519 sign → store + credential_events audit →
 * QR encodes the public verify URL (never the signature).
 * Verification is public and fail-closed.
 */
export async function credentialRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  function signingKey() {
    const seed = process.env.SAHAKAR_SIGNING_KEY;
    if (!seed) {
      // Dev/demo default — production must set SAHAKAR_SIGNING_KEY (32 bytes b64).
      return {
        ...keyPairFromSeed(Buffer.from("sahakar-link-dev-signing-key-32b").toString("base64")),
        key_id: "key-dev",
      };
    }
    return {
      ...keyPairFromSeed(seed),
      key_id: process.env.SAHAKAR_KEY_ID ?? "key-current",
    };
  }

  function trustedKeys() {
    const keys: { key_id: string; publicKey: Uint8Array }[] = [];
    const current = signingKey();
    keys.push({ key_id: current.key_id, publicKey: current.publicKey });
    // SAHAKAR_TRUSTED_KEYS="kid1:hex,kid2:hex" — rotation keeps old keys trusted.
    for (const pair of (process.env.SAHAKAR_TRUSTED_KEYS ?? "").split(",")) {
      const [kid, hex] = pair.split(":");
      if (!kid || !hex) continue;
      try {
        keys.push({
          key_id: kid,
          publicKey: Uint8Array.from(hex.match(/.{2}/g) ?? [], (b) => parseInt(b, 16)),
        });
      } catch {
        // ignore malformed trusted key entries — fail closed on use
      }
    }
    return keys;
  }

  app.post("/credentials", { preHandler: app.requireAuth }, async (req, reply) => {
    const user = assertCan(req, "credential", "issue");
    const body = validate(issueSchema, req.body);

    const [subject] = await db
      .select()
      .from(users)
      .where(eq(users.id, body.subject_id))
      .limit(1);
    if (!subject) throw new HttpError(404, "Subject not found");
    const [programme] = await db
      .select()
      .from(programmes)
      .where(eq(programmes.id, body.programme_id))
      .limit(1);
    if (!programme) throw new HttpError(404, "Programme not found");

    const credentialId = randomUUID();
    const key = signingKey();
    const payload = credentialPayloadSchema.parse({
      credential_id: credentialId,
      issuer_id: user.institution_id ?? "institution",
      subject_id: subject.id,
      programme_id: programme.id,
      subject_display_name: subject.displayName,
      programme_title: programme.title,
      skills: body.skills,
      assessment_summary: body.assessment_summary,
      issued_at: new Date().toISOString(),
      expires_at: body.expires_at ?? null,
      status: "ACTIVE",
      key_id: key.key_id,
    });

    const { signature, canonical_hash } = signCredential(payload, key.privateKey);

    const [row] = await db
      .insert(credentials)
      .values({
        id: credentialId,
        issuerId: user.institution_id ?? user.id,
        subjectId: subject.id,
        programmeId: programme.id,
        subjectName: subject.displayName,
        programmeTitle: programme.title,
        skills: payload.skills,
        assessmentSummary: payload.assessment_summary,
        issuedAt: new Date(payload.issued_at),
        expiresAt: payload.expires_at ? new Date(payload.expires_at) : null,
        keyId: payload.key_id,
        signature,
        canonicalHash: canonical_hash,
      })
      .returning();

    await db.insert(credentialEvents).values({
      credentialId,
      action: "ISSUED",
      actorId: user.id,
    });
    await writeAudit(db, {
      actorId: user.id,
      action: "CREDENTIAL_ISSUED",
      entityType: "credential",
      entityId: credentialId,
      after: row,
      ip: req.ip,
    });

    const verifyUrl = qrPayload(
      process.env.PUBLIC_BASE_URL ?? "http://localhost:5173",
      credentialId,
    );
    return reply.code(201).send({ credential: row, qr_payload: verifyUrl });
  });

  app.post(
    "/credentials/:id/revoke",
    { preHandler: app.requireAuth },
    async (req) => {
      const user = assertCan(req, "credential", "revoke");
      const { id } = req.params as { id: string };
      const body = validate(
        z.object({ reason: z.string().min(3).max(300) }),
        req.body,
      );
      const [before] = await db
        .select()
        .from(credentials)
        .where(eq(credentials.id, id))
        .limit(1);
      if (!before) throw new HttpError(404, "Credential not found");
      if (before.status === "REVOKED") {
        return { credential: before, unchanged: true };
      }
      const [row] = await db
        .update(credentials)
        .set({ status: "REVOKED", version: before.version + 1 })
        .where(eq(credentials.id, id))
        .returning();
      await db.insert(credentialEvents).values({
        credentialId: id,
        action: "REVOKED",
        actorId: user.id,
        reason: body.reason,
      });
      await writeAudit(db, {
        actorId: user.id,
        action: "CREDENTIAL_REVOKED",
        entityType: "credential",
        entityId: id,
        before,
        after: row,
        ip: req.ip,
      });
      return { credential: row };
    },
  );

  app.get(
    "/credentials/subject/:subjectId",
    { preHandler: app.requireAuth },
    async (req) => {
      const user = assertCan(req, "credential", "read");
      const { subjectId } = req.params as { subjectId: string };
      if (user.role === "trainee" && user.id !== subjectId) {
        throw new HttpError(403, "Trainees may only read their own credentials");
      }
      const rows = await db
        .select()
        .from(credentials)
        .where(eq(credentials.subjectId, subjectId));
      return { credentials: rows };
    },
  );

  /**
   * Public verification (AC7) — no auth, rate-limited at the edge in prod,
   * fail-closed for unknown id / unknown key / tampered payload / non-ACTIVE.
   */
  app.get("/credentials/:id/verify", async (req) => {
    const { id } = req.params as { id: string };
    const [row] = await db
      .select()
      .from(credentials)
      .where(eq(credentials.id, id))
      .limit(1);
    if (!row) {
      return {
        valid: false,
        status: null,
        reason_if_invalid: "UNKNOWN_CREDENTIAL",
      };
    }

    // Rebuild the signed payload from stored columns. The signature attests the
    // payload AS ISSUED (status ACTIVE); revocation is separate mutable state
    // checked after the signature — so a revoked credential fails with
    // STATUS_REVOKED, not a spurious signature error.
    const payload = credentialPayloadSchema.parse({
      credential_id: row.id,
      issuer_id: row.issuerId,
      subject_id: row.subjectId,
      programme_id: row.programmeId,
      subject_display_name: row.subjectName || "Unknown",
      programme_title: row.programmeTitle || "Unknown programme",
      skills: row.skills,
      assessment_summary: row.assessmentSummary,
      issued_at: row.issuedAt.toISOString(),
      expires_at: row.expiresAt ? row.expiresAt.toISOString() : null,
      status: "ACTIVE",
      key_id: row.keyId,
    });

    const result = verifyCredential(payload, row.signature, trustedKeys());
    if (!result.valid) {
      return {
        valid: false,
        status: row.status,
        subject_display_name: row.subjectName || "Unknown",
        programme: row.programmeTitle || "Unknown programme",
        skills: row.skills,
        issued_at: row.issuedAt.toISOString(),
        reason_if_invalid: (result as { reason: string }).reason,
      };
    }
    if (row.status !== "ACTIVE") {
      return {
        valid: false,
        status: row.status,
        subject_display_name: row.subjectName || "Unknown",
        programme: row.programmeTitle || "Unknown programme",
        skills: row.skills,
        issued_at: row.issuedAt.toISOString(),
        reason_if_invalid: `STATUS_${row.status}`,
      };
    }

    return {
      valid: true,
      status: row.status,
      subject_display_name: row.subjectName || "Unknown",
      programme: row.programmeTitle || "Unknown programme",
      skills: row.skills,
      issued_at: row.issuedAt.toISOString(),
      reason_if_invalid: null,
    };
  });
}
