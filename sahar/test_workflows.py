import requests

BASE = 'http://127.0.0.1:8000/api'

print('=== 1. AUTH & PERSONA TEST ===')
# Trainee login
r = requests.post(f'{BASE}/auth/login', json={'email': 'ramesh@sahakarlink.gov.in', 'password': 'password123'})
assert r.status_code == 200, f'Login failed: {r.text}'
trainee_token = r.json()['access_token']
trainee_headers = {'Authorization': f'Bearer {trainee_token}'}
print('[PASS] Trainee Ramesh Kumar logged in successfully.')

# Recruiter login
r = requests.post(f'{BASE}/auth/login', json={'email': 'recruiter@rampurpacs.coop', 'password': 'password123'})
assert r.status_code == 200, f'Recruiter login failed: {r.text}'
recruiter_token = r.json()['access_token']
recruiter_headers = {'Authorization': f'Bearer {recruiter_token}'}
print('[PASS] Recruiter Amit Patel logged in successfully.')

import uuid

print('=== 2. SMART ATTENDANCE & OFFLINE SYNC ===')
fresh_evt_id = f'TEST-EVT-{uuid.uuid4().hex[:8].upper()}'
r = requests.post(f'{BASE}/attendance/mark', json={
    'event_id': fresh_evt_id,
    'device_id': 'KIOSK-001',
    'trainee_id': 1,
    'method': 'FACE',
    'location': 'Main Entrance Kiosk'
})
assert r.status_code == 200
print('[PASS] Face attendance marked:', r.json()['status'])

# Offline batch sync with dynamic IDs
s1 = f'TEST-SYNC-{uuid.uuid4().hex[:8].upper()}'
s2 = f'TEST-SYNC-{uuid.uuid4().hex[:8].upper()}'
r = requests.post(f'{BASE}/attendance/sync', json={
    'device_id': 'KIOSK-001',
    'events': [
        {'event_id': s1, 'device_id': 'KIOSK-001', 'trainee_id': 1, 'method': 'NFC'},
        {'event_id': s2, 'device_id': 'KIOSK-001', 'trainee_id': 1, 'method': 'QR'}
    ]
})
assert r.status_code == 200
assert r.json()['synced_count'] == 2, 'Must sync 2 fresh events'
print('[PASS] Offline events synced:', r.json()['synced_count'])

print('=== 3. LMS & LESSON COMPLETION ===')
r = requests.post(f'{BASE}/lms/lessons/1/complete', headers=trainee_headers)
assert r.status_code == 200
print('[PASS] Lesson marked complete:', r.json()['status'])

print('=== 4. QUIZ & ED25519 CERTIFICATE ISSUANCE ===')
r = requests.post(f'{BASE}/lms/quizzes/1/submit', headers=trainee_headers, json={
    'answers': {'1': 1, '2': 1, '3': 2}
})
assert r.status_code == 200
res = r.json()
print(f"[PASS] Quiz scored: {res['score']}%, Passed: {res['passed']}, Certificate: {res['certificate_id']}")

print('=== 5. PUBLIC ZERO-LOGIN ED25519 VERIFICATION ===')
r = requests.get(f'{BASE}/certificates/verify/CERT-NCCT-2026-RAMESH01')
assert r.status_code == 200
assert r.json()['is_valid'] == True
res = r.json()
print(f"[PASS] Public Verifier: {res['status']}, Algorithm: {res['cryptography']['algorithm']}")

print('=== 6. GROUNDED RAG ASSISTANT ===')
r = requests.post(f'{BASE}/ai/ask', headers=trainee_headers, json={'question': 'What are the rules for Day-Book closing?'})
assert r.status_code == 200
res = r.json()
print(f"[PASS] AI Grounded RAG Status: {res['guardrail_status']}, Citations: {len(res['sources'])}")

print('=== 7. EXPLAINABLE JOB MATCHING & RECRUITER WORKFLOW ===')
r = requests.get(f'{BASE}/jobs/1/candidates', headers=recruiter_headers)
assert r.status_code == 200
top = r.json()['candidates'][0]
print(f"[PASS] Candidate {top['full_name']} Overall Match: {top['match']['overall_match']}%")
print(f"  (Skill: {top['match']['skill_match']}%, Cert: {top['match']['certification_match']}%, Location: {top['match']['location_match']}%)")

print('=== 8. LIVE DATABASE ANALYTICS ===')
r = requests.get(f'{BASE}/analytics/dashboard', headers=recruiter_headers)
assert r.status_code == 200
ov = r.json()['overview']
print(f"[PASS] Live Analytics: Trainees={ov['total_trainees']}, Attendance Events={ov['attendance_events_logged']}, Certificates={ov['certificates_issued']}")

print('=== 9. PACS ERP SIMULATION SANDBOX ===')
r_db = requests.post(f'{BASE}/erp/sandbox/daybook-close', headers=trainee_headers, json={
    'society_id': 'PACS-UP-RAMPUR-004',
    'cash_opening_balance': 150000.0,
    'cash_receipts': 85400.0,
    'cash_payments': 42100.0,
    'vault_cash_physical': 193300.0
})
assert r_db.status_code == 200
res_db = r_db.json()
assert res_db['status'] == 'BALANCED_AUDITED'
print(f"[PASS] Day-Book Closing: {res_db['status']}, Chain Hash: {res_db['tamper_proof_chain_hash'][:16]}")

r_kcc = requests.post(f'{BASE}/erp/sandbox/kcc-disburse', headers=trainee_headers, json={
    'farmer_name': 'Ramkishan Yadav',
    'land_holding_acres': 3.5,
    'crop_type': 'Paddy',
    'requested_amount': 150000.0,
    'prompt_repayment': True
})
assert r_kcc.status_code == 200
res_kcc = r_kcc.json()
assert res_kcc['status'] == 'APPROVED'
print(f"[PASS] KCC Loan Appraisal: {res_kcc['status']}, Effective Rate: {res_kcc['net_effective_farmer_rate']}, Sanctioned: Rs.{res_kcc['approved_amount']:,.2f}")

print('\nALL 9 CORE WORKFLOWS PASSED 100% SUCCESSFULLY!')
