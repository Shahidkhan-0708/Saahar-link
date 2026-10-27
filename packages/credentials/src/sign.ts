import { ed25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils";
import { canonicalJson, type CredentialPayload } from "./canonical.js";

/** A trusted verification key. Rotation adds a key_id; old keys stay trusted. */
export type TrustedKey = { key_id: string; publicKey: Uint8Array };

export type SignResult = {
  signature: string; // hex
  canonical_hash: string; // hex (sha256 of canonical payload)
  key_id: string;
};

export type VerifyResult =
  | { valid: true; status: CredentialPayload["status"] }
  | { valid: false; reason: string };

/** Generate a fresh issuer keypair from a base64 seed (env: SAHAKAR_SIGNING_KEY). */
export function keyPairFromSeed(seedBase64: string): {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
} {
  const seed = Uint8Array.from(atob(seedBase64), (c) => c.charCodeAt(0));
  if (seed.length !== 32) {
    throw new Error(`SAHAKAR_SIGNING_KEY must decode to 32 bytes, got ${seed.length}`);
  }
  const privateKey = sha256(seed);
  return { privateKey, publicKey: ed25519.getPublicKey(privateKey) };
}

export function publicKeyHex(publicKey: Uint8Array): string {
  return bytesToHex(publicKey);
}

/** Sign a credential payload (blueprint §3.3 step 2). */
export function signCredential(
  payload: CredentialPayload,
  privateKey: Uint8Array,
): SignResult {
  const canonical = canonicalJson(payload);
  const signature = ed25519.sign(utf8ToBytes(canonical), privateKey);
  return {
    signature: bytesToHex(signature),
    canonical_hash: bytesToHex(sha256(utf8ToBytes(canonical))),
    key_id: payload.key_id,
  };
}

/**
 * Fail-closed verification (blueprint §3.3): tampered payload, unknown key, or
 * unparseable input all return { valid: false, reason } — never throws.
 */
export function verifyCredential(
  payload: CredentialPayload,
  signatureHex: string,
  trustedKeys: readonly TrustedKey[],
): VerifyResult {
  try {
    const key = trustedKeys.find((k) => k.key_id === payload.key_id);
    if (!key) return { valid: false, reason: "UNKNOWN_KEY" };

    const canonical = canonicalJson(payload);
    let signature: Uint8Array;
    try {
      signature = hexToBytes(signatureHex);
    } catch {
      return { valid: false, reason: "MALFORMED_SIGNATURE" };
    }

    const ok = ed25519.verify(signature, utf8ToBytes(canonical), key.publicKey);
    if (!ok) return { valid: false, reason: "SIGNATURE_MISMATCH" };

    if (payload.status !== "ACTIVE") {
      return { valid: false, reason: `STATUS_${payload.status}` };
    }
    return { valid: true, status: payload.status };
  } catch {
    return { valid: false, reason: "VERIFICATION_ERROR" };
  }
}

/** QR payload encodes the public verify URL, never the signature (blueprint §3.3). */
export function qrPayload(verifyBaseUrl: string, credentialId: string): string {
  const base = verifyBaseUrl.replace(/\/+$/, "");
  return `${base}/verify/${credentialId}`;
}
