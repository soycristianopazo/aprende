#!/usr/bin/env python3
"""
Complete all required courses to trigger auto-certificate
"""
import requests
import json

BASE_URL = "https://user-credentials-6.preview.emergentagent.com/api"

# Login as admin
resp = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "admin@aptivademo.com",
    "password": "admin123"
})
admin_token = resp.json()["token"]
admin_headers = {"Authorization": f"Bearer {admin_token}"}

# Create evaluation for "Curso F1.2 Test"
course_id = "course_4594d9bd9dfe"
eval_data = {
    "course_id": course_id,
    "questions": [
        {
            "text": "Pregunta de prueba 1",
            "options": ["A", "B", "C", "D"],
            "correct_index": 0
        },
        {
            "text": "Pregunta de prueba 2",
            "options": ["A", "B", "C", "D"],
            "correct_index": 1
        }
    ],
    "min_score": 70,
    "max_attempts": 3
}

print("Creating evaluation for Curso F1.2 Test...")
resp = requests.post(f"{BASE_URL}/evaluations", json=eval_data, headers=admin_headers)
if resp.status_code == 200:
    evaluation = resp.json()
    eval_id = evaluation['evaluation_id']
    print(f"✅ Evaluation created: {eval_id}")
elif resp.status_code == 400 and "already exists" in resp.text:
    # Evaluation already exists, get it
    print("Evaluation already exists, fetching...")
    resp = requests.get(f"{BASE_URL}/evaluations/course/{course_id}", headers=admin_headers)
    evaluation = resp.json()
    eval_id = evaluation['evaluation_id']
    print(f"✅ Evaluation found: {eval_id}")
else:
    print(f"❌ Failed to create evaluation: {resp.status_code} - {resp.text}")
    exit(1)

# Login as trabajador
resp = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "trabajador@aptivademo.com",
    "password": "trabajador123"
})
worker_token = resp.json()["token"]
worker_headers = {"Authorization": f"Bearer {worker_token}"}

# Submit evaluation with correct answers
print("\nSubmitting evaluation as trabajador...")
submit_data = {"answers": [0, 1]}  # Correct answers
resp = requests.post(f"{BASE_URL}/evaluations/{eval_id}/submit", 
                    json=submit_data, 
                    headers=worker_headers)

if resp.status_code == 200:
    result = resp.json()
    print(f"✅ Evaluation submitted")
    print(f"   Score: {result['score']}")
    print(f"   Passed: {result['passed']}")
    print(f"   All courses completed: {result.get('all_courses_completed')}")
    
    certificate = result.get('certificate')
    if certificate:
        print(f"\n🎉 AUTO-CERTIFICATE ISSUED!")
        print(f"   Certificate ID: {certificate['certificate_id']}")
        print(f"   Verification Code: {certificate['verification_code']}")
        print(f"   Type: {certificate['certificate_type']}")
        print(f"   Role IDs: {certificate.get('role_ids')}")
        print(f"   Role Names: {certificate.get('role_names')}")
        print(f"   Total Hours: {certificate.get('total_hours')}")
        print(f"   Average Score: {certificate.get('average_score')}")
        print(f"   Courses: {len(certificate.get('courses_detail', []))}")
    else:
        print(f"\n⚠️  No certificate issued yet")
        print(f"   This might be expected if not all required courses are completed")
else:
    print(f"❌ Failed to submit evaluation: {resp.status_code} - {resp.text}")
    exit(1)

# Verify certificate was created
print("\nVerifying certificates...")
resp = requests.get(f"{BASE_URL}/certificates", headers=worker_headers)
certificates = resp.json()
print(f"Total certificates: {len(certificates)}")
for cert in certificates:
    print(f"  - Type: {cert['certificate_type']}, Code: {cert['verification_code']}")
