import hashlib
from typing import Dict, Any, Optional
from backend.crypto import get_public_key_pem

class W3CDIDResolver:
    """W3C Decentralized Identifier (DID) Core 1.0 & DID:peer / DID:web Implementation.
    Generates deterministic, sovereign DIDs for trainees, cooperative societies,
    and NCCT training institutes under Ministry of Cooperation standards.
    """

    BASE_DOMAIN = "sahakarlink.gov.in"

    @classmethod
    def get_institute_did(cls, institute_code: str = "PTC-RAMPUR-01") -> str:
        clean_code = institute_code.lower().replace("_", "-")
        return f"did:web:{cls.BASE_DOMAIN}:institutes:{clean_code}"

    @classmethod
    def get_trainee_did(cls, trainee_id: int) -> str:
        # Peer DID Method 2 simulation using SHA-256 fingerprint
        hashed = hashlib.sha256(f"sahakar-trainee-{trainee_id}".encode("utf-8")).hexdigest()[:32]
        return f"did:peer:2.Ez6M{hashed}"

    @classmethod
    def get_coop_did(cls, society_code: str = "PACS-UP-RAMPUR-004") -> str:
        clean_code = society_code.lower().replace("_", "-")
        return f"did:web:{cls.BASE_DOMAIN}:cooperatives:{clean_code}"

    @classmethod
    def resolve_did(cls, did_uri: str, public_key_pem: Optional[str] = None) -> Dict[str, Any]:
        """Resolves a DID URI into a full W3C DID Document compliant with DID Core 1.0."""
        pub_pem = public_key_pem or get_public_key_pem()

        if did_uri.startswith("did:peer:"):
            key_id = f"{did_uri}#key-1"
            return {
                "@context": [
                    "https://www.w3.org/ns/did/v1",
                    "https://w3id.org/security/suites/ed25519-2020/v1"
                ],
                "id": did_uri,
                "alsoKnownAs": [f"urn:sahakarlink:trainee:{did_uri.split('.')[-1][:8]}"],
                "verificationMethod": [
                    {
                        "id": key_id,
                        "type": "Ed25519VerificationKey2020",
                        "controller": did_uri,
                        "publicKeyPem": pub_pem.strip()
                    }
                ],
                "authentication": [key_id],
                "assertionMethod": [key_id],
                "capabilityInvocation": [key_id],
                "service": [
                    {
                        "id": f"{did_uri}#credential-vault",
                        "type": "LinkedVerifiableCredentialStore",
                        "serviceEndpoint": f"https://{cls.BASE_DOMAIN}/api/certificates"
                    }
                ]
            }

        # did:web resolution
        key_id = f"{did_uri}#key-ed25519"
        return {
            "@context": [
                "https://www.w3.org/ns/did/v1",
                "https://w3id.org/security/suites/ed25519-2020/v1"
            ],
            "id": did_uri,
            "verificationMethod": [
                {
                    "id": key_id,
                    "type": "Ed25519VerificationKey2020",
                    "controller": did_uri,
                    "publicKeyPem": pub_pem.strip()
                }
            ],
            "authentication": [key_id],
            "assertionMethod": [key_id],
            "service": [
                {
                    "id": f"{did_uri}#ncct-registry",
                    "type": "NationalCooperativeAccreditationRegistry",
                    "serviceEndpoint": f"https://{cls.BASE_DOMAIN}/verify"
                }
            ]
        }

did_resolver = W3CDIDResolver()
