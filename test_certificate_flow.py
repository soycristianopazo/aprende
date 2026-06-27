#!/usr/bin/env python3
"""
Test auto-certificate flow by completing ALL required courses
"""
import requests
import json

BASE_URL = "https://user-credentials-6.preview.emergentagent.com/api"

# Login as trabajador
resp = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "trabajador@aptivademo.com",
    "password": "trabajador123"
})
token = resp.json()["token"]
headers = {"Authorization": f"Bearer {token}"}

# Get user info
resp = requests.get(f"{BASE_URL}/auth/me", headers=headers)
user = resp.json()
print(f"User: {user['email']}")
print(f"Area IDs: {user.get('area_ids')}")
print(f"Activity IDs: {user.get('activity_ids')}")

# Get all courses visible to worker
resp = requests.get(f"{BASE_URL}/courses", headers=headers)
courses = resp.json()
print(f"\nVisible courses: {len(courses)}")
for c in courses:
    print(f"  - {c['name']} (course_id={c['course_id']})")

# Get student progress
resp = requests.get(f"{BASE_URL}/student/progress", headers=headers)
progress = resp.json()
print(f"\nProgress:")
print(f"  Total courses: {progress['total_courses']}")
print(f"  Completed: {progress['completed_courses']}")
print(f"  Role names: {progress.get('role_names')}")

# Check which courses are completed
for item in progress['courses']:
    course = item['course']
    is_completed = item['is_completed']
    print(f"  - {course['name']}: {'✅ Completed' if is_completed else '❌ Not completed'}")

# Get existing certificates
resp = requests.get(f"{BASE_URL}/certificates", headers=headers)
certificates = resp.json()
print(f"\nExisting certificates: {len(certificates)}")
for cert in certificates:
    print(f"  - {cert.get('certificate_type')}: {cert.get('verification_code')}")

# Find courses that need completion
incomplete_courses = [item for item in progress['courses'] if not item['is_completed']]
print(f"\nIncomplete courses: {len(incomplete_courses)}")

if incomplete_courses:
    print("\nTo trigger auto-certificate, need to complete these courses:")
    for item in incomplete_courses:
        course = item['course']
        print(f"  - {course['name']} (course_id={course['course_id']})")
        
        # Check if evaluation exists
        resp = requests.get(f"{BASE_URL}/evaluations/course/{course['course_id']}", headers=headers)
        if resp.status_code == 200:
            evaluation = resp.json()
            print(f"    Evaluation exists: eval_id={evaluation['evaluation_id']}")
        else:
            print(f"    No evaluation found (status: {resp.status_code})")
