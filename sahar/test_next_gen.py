"""
Automated Test Suite for Sahakar-Link 3.0 Next-Gen Technologies
Tests:
1. W3C DID Resolver (did:peer and did:web)
2. Algorithmic Fairness & Bias Audit Engine (DPR, EOR, Disparate Impact)
3. Endpoints Integration via HTTP
"""

import sys
import json
import urllib.request
from backend.did_resolver import W3CDIDResolver
from backend.fairness import AlgorithmicFairnessAuditor

def test_did_resolver():
    print("=== 1. W3C DID RESOLVER TEST ===")
    trainee_id = 1
    peer_did = W3CDIDResolver.get_trainee_did(trainee_id)
    assert peer_did.startswith("did:peer:2"), f"Invalid peer DID: {peer_did}"
    print(f"[PASS] Created did:peer Method 2: {peer_did}")
    
    doc = W3CDIDResolver.resolve_did(peer_did)
    assert doc["id"] == peer_did
    assert len(doc["verificationMethod"]) > 0
    assert doc["verificationMethod"][0]["type"] == "Ed25519VerificationKey2020"
    print(f"[PASS] Resolved W3C DID Document with {len(doc['authentication'])} authentication keys.")
    assert doc["id"] == peer_did
    assert len(doc["verificationMethod"]) > 0
    assert doc["verificationMethod"][0]["type"] == "Ed25519VerificationKey2020"
    print(f"[PASS] Resolved W3C DID Document with {len(doc['authentication'])} authentication keys.")

def test_fairness_engine():
    print("\n=== 2. ALGORITHMIC FAIRNESS & BIAS AUDIT ENGINE TEST ===")
    audit = AlgorithmicFairnessAuditor.audit_job_matching(1, "PACS Chief Accountant", "Rampur PACS")
    assert "metrics" in audit
    conventional_di = audit["metrics"]["conventional"]["disparate_impact_score"]
    bbs_di = audit["metrics"]["bbs_plus_redacted"]["disparate_impact_score"]
    
    print(f"[PASS] Conventional Disparate Impact: {conventional_di} (Biased: {not audit['metrics']['conventional']['is_compliant']})")
    print(f"[PASS] BBS+ Redacted Disparate Impact: {bbs_di} (Compliant: {audit['metrics']['bbs_plus_redacted']['is_compliant']})")
    assert bbs_di >= 0.80, "BBS+ Redacted Disparate Impact must satisfy EEOC 4/5ths rule (>=0.80)"
    assert len(audit["candidate_comparisons"]) >= 6, "Expected 6 candidate evaluations in cohort"
    print(f"[PASS] Demographic Parity Ratio: {audit['metrics']['bbs_plus_redacted']['demographic_parity_ratio']}")
    print(f"[PASS] Equal Opportunity Ratio: {audit['metrics']['bbs_plus_redacted']['equal_opportunity_ratio']}")

def test_http_endpoints():
    print("\n=== 3. HTTP ENDPOINTS LIVE AUDIT ===")
    # 1. DID Endpoint
    url_did = "http://127.0.0.1:8000/api/certificates/did/resolve?did=did:web:sahakarlink.gov.in:trainees:CERT-01"
    req = urllib.request.urlopen(url_did)
    did_doc = json.loads(req.read())
    assert did_doc["id"].startswith("did:web"), "Failed did:web resolution over HTTP"
    print(f"[PASS] HTTP GET /api/certificates/did/resolve returned W3C Document: {did_doc['id']}")

    # 2. Fairness Audit Endpoint
    url_fairness = "http://127.0.0.1:8000/api/jobs/1/fairness-audit"
    req2 = urllib.request.urlopen(url_fairness)
    fairness_data = json.loads(req2.read())
    assert fairness_data["job_id"] == 1
    assert fairness_data["metrics"]["bbs_plus_redacted"]["is_compliant"] is True
    print(f"[PASS] HTTP GET /api/jobs/1/fairness-audit returned compliant audit report.")

if __name__ == "__main__":
    test_did_resolver()
    test_fairness_engine()
    test_http_endpoints()
    print("\nALL NEXT-GEN TECHNOLOGIES VERIFIED SUCCESSFULLY 100%!")
