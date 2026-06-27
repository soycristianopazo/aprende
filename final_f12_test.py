#!/usr/bin/env python3
"""
F1.2 Final Comprehensive Test - Multi-tenant Backend
"""
import requests
import sys
import time

BASE_URL = "https://user-credentials-6.preview.emergentagent.com/api"

test_results = []

def log_test(name: str, passed: bool, details: str = ""):
    status = "✅" if passed else "❌"
    print(f"{status} {name}")
    if details:
        print(f"   {details}")
    test_results.append({"name": name, "passed": passed, "details": details})

def login(email: str, password: str):
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    return resp.json()["token"] if resp.status_code == 200 else None

print("="*70)
print("F1.2 MULTI-TENANT COMPREHENSIVE TEST")
print("="*70)

# Test 1: Authentication
print("\n=== AUTHENTICATION ===")
superadmin_token = login("superadmin@aptiva.com", "superadmin123")
admin_token = login("admin@aptivademo.com", "admin123")
worker_token = login("trabajador@aptivademo.com", "trabajador123")

log_test("SuperAdmin login", superadmin_token is not None)
log_test("Admin Demo login", admin_token is not None)
log_test("Trabajador Demo login", worker_token is not None)

# Test 2: Tenant Isolation - Create 2nd company
print("\n=== TENANT ISOLATION ===")
company_name = f"Test Company {int(time.time())}"
resp = requests.post(f"{BASE_URL}/superadmin/companies", 
                    json={"name": company_name, "primary_color": "#FF5733"},
                    headers={"Authorization": f"Bearer {superadmin_token}"})
if resp.status_code == 200:
    company_b_id = resp.json()["company_id"]
    log_test("Create 2nd company", True, f"company_id={company_b_id}")
    
    # Create admin for company B
    admin_email = f"admin{int(time.time())}@testcompany.com"
    resp = requests.post(f"{BASE_URL}/superadmin/companies/{company_b_id}/admin",
                        json={"email": admin_email, "password": "admin123", "full_name": "Admin B"},
                        headers={"Authorization": f"Bearer {superadmin_token}"})
    if resp.status_code == 200:
        log_test("Create admin for Company B", True)
        
        # Login as company B admin
        admin_b_token = login(admin_email, "admin123")
        if admin_b_token:
            log_test("Login as Company B admin", True)
            
            # Verify empty lists
            resp = requests.get(f"{BASE_URL}/users", headers={"Authorization": f"Bearer {admin_b_token}"})
            users_count = len(resp.json()) if resp.status_code == 200 else -1
            log_test("Company B sees only their users", users_count == 1, f"users={users_count}")
            
            resp = requests.get(f"{BASE_URL}/courses", headers={"Authorization": f"Bearer {admin_b_token}"})
            courses_count = len(resp.json()) if resp.status_code == 200 else -1
            log_test("Company B has no courses", courses_count == 0, f"courses={courses_count}")
            
            resp = requests.get(f"{BASE_URL}/certificates", headers={"Authorization": f"Bearer {admin_b_token}"})
            certs_count = len(resp.json()) if resp.status_code == 200 else -1
            log_test("Company B has no certificates", certs_count == 0, f"certificates={certs_count}")
        else:
            log_test("Login as Company B admin", False)
    else:
        log_test("Create admin for Company B", False, resp.text)
else:
    log_test("Create 2nd company", False, resp.text)

# Test 3: Course Model with area_ids/activity_ids
print("\n=== COURSE MODEL (area_ids/activity_ids) ===")
resp = requests.get(f"{BASE_URL}/courses", headers={"Authorization": f"Bearer {admin_token}"})
courses = resp.json() if resp.status_code == 200 else []
has_courses_with_areas = any(c.get("area_ids") or c.get("activity_ids") for c in courses)
log_test("Courses have area_ids/activity_ids", has_courses_with_areas, 
        f"Found {len(courses)} courses, {sum(1 for c in courses if c.get('area_ids') or c.get('activity_ids'))} with area/activity tags")

# Test 4: Worker sees matching courses
print("\n=== WORKER COURSE VISIBILITY ===")
resp = requests.get(f"{BASE_URL}/courses", headers={"Authorization": f"Bearer {worker_token}"})
worker_courses = resp.json() if resp.status_code == 200 else []
log_test("Worker sees published courses", len(worker_courses) > 0, f"Visible courses: {len(worker_courses)}")

# Test 5: Auto-certificate flow
print("\n=== AUTO-CERTIFICATE FLOW ===")
resp = requests.get(f"{BASE_URL}/certificates", headers={"Authorization": f"Bearer {worker_token}"})
certificates = resp.json() if resp.status_code == 200 else []
if certificates:
    cert = certificates[0]
    log_test("Certificate exists", True, f"Found {len(certificates)} certificate(s)")
    log_test("Certificate has company_id", cert.get("company_id") is not None, 
            f"company_id={cert.get('company_id')}")
    log_test("Certificate has role_ids", len(cert.get("role_ids", [])) > 0,
            f"role_ids={cert.get('role_ids')}")
    log_test("Certificate has role_names", len(cert.get("role_names", [])) > 0,
            f"role_names={cert.get('role_names')}")
    log_test("Certificate type is role_completion", cert.get("certificate_type") == "role_completion",
            f"type={cert.get('certificate_type')}")
    log_test("Certificate has courses_detail", len(cert.get("courses_detail", [])) > 0,
            f"courses={len(cert.get('courses_detail', []))}")
    
    # Test 6: Public verification
    print("\n=== PUBLIC CERTIFICATE VERIFICATION ===")
    code = cert.get("verification_code")
    resp = requests.get(f"{BASE_URL}/certificates/verify/{code}")
    if resp.status_code == 200:
        result = resp.json()
        log_test("Public verification works (no auth)", result.get("is_valid") == True,
                f"code={code}, is_valid={result.get('is_valid')}")
    else:
        log_test("Public verification works (no auth)", False, f"Status: {resp.status_code}")
    
    # Test 7: PDF generation
    print("\n=== PDF GENERATION ===")
    cert_id = cert.get("certificate_id")
    resp = requests.get(f"{BASE_URL}/certificates/{cert_id}/pdf", 
                       headers={"Authorization": f"Bearer {worker_token}"})
    if resp.status_code == 200:
        pdf_size = len(resp.content)
        log_test("PDF generation works", pdf_size > 1000,
                f"PDF size: {pdf_size} bytes, content-type: {resp.headers.get('Content-Type')}")
    else:
        log_test("PDF generation works", False, f"Status: {resp.status_code}")
else:
    log_test("Certificate exists", False, "No certificates found")

# Test 8: Student progress
print("\n=== STUDENT PROGRESS ===")
resp = requests.get(f"{BASE_URL}/student/progress", headers={"Authorization": f"Bearer {worker_token}"})
if resp.status_code == 200:
    progress = resp.json()
    log_test("Student progress endpoint", True,
            f"total={progress.get('total_courses')}, completed={progress.get('completed_courses')}, role={progress.get('role_names')}")
else:
    log_test("Student progress endpoint", False, f"Status: {resp.status_code}")

# Test 9: Activity curriculum
print("\n=== ACTIVITY CURRICULUM ===")
resp = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {worker_token}"})
user = resp.json()
activity_ids = user.get("activity_ids", [])
if activity_ids:
    resp = requests.get(f"{BASE_URL}/activities/{activity_ids[0]}/curriculum",
                       headers={"Authorization": f"Bearer {admin_token}"})
    if resp.status_code == 200:
        curriculum = resp.json()
        log_test("Activity curriculum endpoint", True,
                f"courses={len(curriculum.get('curriculum', []))}, total_hours={curriculum.get('total_hours')}")
    else:
        log_test("Activity curriculum endpoint", False, f"Status: {resp.status_code}")
else:
    log_test("Activity curriculum endpoint", False, "No activity_ids found")

# Test 10: Reports (scoped)
print("\n=== REPORTS (SCOPED) ===")
resp = requests.get(f"{BASE_URL}/reports/summary", headers={"Authorization": f"Bearer {admin_token}"})
if resp.status_code == 200:
    summary = resp.json()
    log_test("Reports summary scoped", True,
            f"users={summary.get('total_users')}, courses={summary.get('total_courses')}, certs={summary.get('total_certificates')}")
else:
    log_test("Reports summary scoped", False, f"Status: {resp.status_code}")

resp = requests.get(f"{BASE_URL}/reports/users", headers={"Authorization": f"Bearer {admin_token}"})
if resp.status_code == 200:
    users = resp.json()
    log_test("Reports users scoped", True, f"users={len(users)}")
else:
    log_test("Reports users scoped", False, f"Status: {resp.status_code}")

# Summary
print("\n" + "="*70)
print("TEST SUMMARY")
print("="*70)
passed = sum(1 for t in test_results if t["passed"])
failed = sum(1 for t in test_results if not t["passed"])
total = len(test_results)
print(f"Total: {total} | Passed: {passed} ✅ | Failed: {failed} ❌")
print(f"Success Rate: {(passed/total*100):.1f}%")

if failed > 0:
    print("\nFailed tests:")
    for t in test_results:
        if not t["passed"]:
            print(f"  ❌ {t['name']}: {t['details']}")

sys.exit(0 if failed == 0 else 1)
