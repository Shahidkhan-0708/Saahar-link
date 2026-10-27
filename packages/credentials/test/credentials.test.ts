import { describe, expect, it } from "vitest";
import {
  canonicalJson,
  credentialPayloadSchema,
  keyPairFromSeed,
  qrPayload,
  signCredential,
  verifyCredential,
} from "../src/index.js";

// exactly 32 bytes, as SAHAKAR_SIGNING_KEY requires
const seed = btoa("0123456789abcdef0123456789abcdef");

const basePayload = credentialPayloadSchema.parse({
  credential_id: "0192f3a1-0000-7000-8000-00000000abcd",
  issuer_id: "inst-vamnicom-001",
  subject_id: "user-trainee-01",
  programme_id: "0192f3a1-0000-7000-8000-00000000beef",
  subject_display_name: "Aarti Deshmukh",
  programme_title: "Cooperative Accounting & Compliance",
  skills: ["bookkeeping", "gst-filing"],
  assessment_summary: { score: 87, grade: "A" },
  issued_at: "2026-10-07T09:15:30Z",
  expires_at: null,
  status: "ACTIVE",
  key_id: "key-2026-10",
});

describe("canonical json", () => {
  it("is stable under key reordering", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });
});

describe("credential signing", () => {
  const { privateKey, publicKey } = keyPairFromSeed(seed);
  const trusted = [{ key_id: "key-2026-10", publicKey }];

  it("signs and verifies", () => {
    const { signature } = signCredential(basePayload, privateKey);
    expect(verifyCredential(basePayload, signature, trusted)).toEqual({
      valid: true,
      status: "ACTIVE",
    });
  });

  it("fails closed on tampered payload", () => {
    const { signature } = signCredential(basePayload, privateKey);
    const tampered = { ...basePayload, subject_display_name: "Someone Else" };
    const result = verifyCredential(tampered, signature, trusted);
    expect(result).toEqual({ valid: false, reason: "SIGNATURE_MISMATCH" });
  });

  it("fails closed on unknown key_id", () => {
    const other = keyPairFromSeed(btoa("fedcba9876543210fedcba9876543210"));
    const untrusted = { ...basePayload, key_id: "key-unknown" };
    const { signature } = signCredential(untrusted, other.privateKey);
    expect(verifyCredential(untrusted, signature, trusted)).toEqual({
      valid: false,
      reason: "UNKNOWN_KEY",
    });
  });

  it("rejects revoked credentials even with a valid signature", () => {
    const revoked = { ...basePayload, status: "REVOKED" as const };
    const { signature } = signCredential(revoked, privateKey);
    expect(verifyCredential(revoked, signature, trusted)).toEqual({
      valid: false,
      reason: "STATUS_REVOKED",
    });
  });

  it("QR encodes the verify URL, not the signature", () => {
    const url = qrPayload("https://sahakarlink.example/", basePayload.credential_id);
    expect(url).toBe(
      `https://sahakarlink.example/verify/${basePayload.credential_id}`,
    );
    expect(url).not.toContain("signature");
  });
});
