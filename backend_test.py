#!/usr/bin/env python3
"""
F1.2 Multi-tenant Backend Testing Script
Tests multi-tenant scope for legacy endpoints: courses, evaluations, certificates, completions, reports, student/progress
"""
import requests
import json
import sys
from typing import Dict, Any, Optional

BASE_URL = "https://user-credentials-6.preview.emergentagent.com/api"

# Test credentials
SUPERADMIN_EMAIL = "superadmin@aptiva.com"
SUPERADMIN_PASSWORD = "superadmin123"

ADMIN_DEMO_EMAIL = "admin@aptivademo.com"
ADMIN_DEMO_PASSWORD = "admin123"

TRABAJADOR_DEMO_EMAIL = "trabajador@aptivademo.com"
TRABAJADOR_DEMO_PASSWORD = "trabajador123"

# Test state
test_results = []
test_data = {}


def log_test(name: str, passed: bool, details: str = ""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"  Details: {details}")
    test_results.append({"name": name, "passed": passed, "details": details})


def login(email: str, password: str) -> Optional[str]:
    """Login and return token"""
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
        if resp.status_code == 200:
            data = resp.json()
            return data.get("token")
        else:
            print(f"Login failed for {email}: {resp.status_code} - {resp.text}")
            return None
    except Exception as e:
        print(f"Login exception for {email}: {e}")
        return None


def get_headers(token: str) -> Dict[str, str]:
    """Get authorization headers"""
    return {"Authorization": f"Bearer {token}"}


def test_authentication():
    """Test 1: Verify authentication for all users"""
    print("\n=== TEST 1: Authentication ===")
    
    # SuperAdmin login
    token = login(SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
    if token:
        test_data["superadmin_token"] = token
        resp = requests.get(f"{BASE_URL}/auth/me", headers=get_headers(token))
        if resp.status_code == 200:
            user = resp.json()
            test_data["superadmin_user"] = user
            log_test("SuperAdmin login", 
                    user.get("is_super_admin") == True and user.get("company_id") is None,
                    f"is_super_admin={user.get('is_super_admin')}, company_id={user.get('company_id')}")
        else:
            log_test("SuperAdmin login", False, f"GET /auth/me failed: {resp.status_code}")
    else:
        log_test("SuperAdmin login", False, "Login failed")
    
    # Admin Demo login
    token = login(ADMIN_DEMO_EMAIL, ADMIN_DEMO_PASSWORD)
    if token:
        test_data["admin_demo_token"] = token
        resp = requests.get(f"{BASE_URL}/auth/me", headers=get_headers(token))
        if resp.status_code == 200:
            user = resp.json()
            test_data["admin_demo_user"] = user
            test_data["aptiva_demo_company_id"] = user.get("company_id")
            log_test("Admin Demo login", 
                    user.get("is_admin") == True and user.get("company_id") is not None,
                    f"is_admin={user.get('is_admin')}, company_id={user.get('company_id')}")
        else:
            log_test("Admin Demo login", False, f"GET /auth/me failed: {resp.status_code}")
    else:
        log_test("Admin Demo login", False, "Login failed")
    
    # Trabajador Demo login
    token = login(TRABAJADOR_DEMO_EMAIL, TRABAJADOR_DEMO_PASSWORD)
    if token:
        test_data["trabajador_demo_token"] = token
        resp = requests.get(f"{BASE_URL}/auth/me", headers=get_headers(token))
        if resp.status_code == 200:
            user = resp.json()
            test_data["trabajador_demo_user"] = user
            log_test("Trabajador Demo login", 
                    user.get("is_admin") == False and user.get("company_id") is not None,
                    f"area_ids={user.get('area_ids')}, activity_ids={user.get('activity_ids')}")
        else:
            log_test("Trabajador Demo login", False, f"GET /auth/me failed: {resp.status_code}")
    else:
        log_test("Trabajador Demo login", False, "Login failed")


def test_create_second_company():
    """Test 2: Create a second company and admin for tenant isolation testing"""
    print("\n=== TEST 2: Create Second Company ===")
    
    token = test_data.get("superadmin_token")
    if not token:
        log_test("Create second company", False, "SuperAdmin token not available")
        return
    
    # Create company
    company_data = {
        "name": "Test Company B",
        "rut": "99999999-9",
        "contact_email": "contact@testcompanyb.com",
        "primary_color": "#FF5733",
        "secondary_color": "#C70039"
    }
    resp = requests.post(f"{BASE_URL}/superadmin/companies", 
                        json=company_data, 
                        headers=get_headers(token))
    
    if resp.status_code == 200:
        company = resp.json()
        test_data["company_b_id"] = company.get("company_id")
        log_test("Create Test Company B", True, f"company_id={company.get('company_id')}")
        
        # Create admin for company B
        admin_data = {
            "email": "admin@testcompanyb.com",
            "password": "admin123",
            "full_name": "Admin Company B",
            "rut": "88888888-8"
        }
        resp = requests.post(f"{BASE_URL}/superadmin/companies/{company['company_id']}/admin",
                           json=admin_data,
                           headers=get_headers(token))
        
        if resp.status_code == 200:
            admin = resp.json()
            log_test("Create Admin for Company B", True, f"user_id={admin.get('user_id')}")
            
            # Login as company B admin
            token_b = login("admin@testcompanyb.com", "admin123")
            if token_b:
                test_data["admin_b_token"] = token_b
                resp = requests.get(f"{BASE_URL}/auth/me", headers=get_headers(token_b))
                if resp.status_code == 200:
                    user = resp.json()
                    test_data["admin_b_user"] = user
                    log_test("Login as Admin Company B", True, f"company_id={user.get('company_id')}")
                else:
                    log_test("Login as Admin Company B", False, f"GET /auth/me failed: {resp.status_code}")
            else:
                log_test("Login as Admin Company B", False, "Login failed")
        else:
            log_test("Create Admin for Company B", False, f"Status: {resp.status_code}, Response: {resp.text}")
    else:
        log_test("Create Test Company B", False, f"Status: {resp.status_code}, Response: {resp.text}")


def test_tenant_isolation_empty_lists():
    """Test 3: Verify Company B admin sees empty lists (no data from Aptiva Demo)"""
    print("\n=== TEST 3: Tenant Isolation - Empty Lists ===")
    
    token = test_data.get("admin_b_token")
    if not token:
        log_test("Tenant isolation - empty lists", False, "Admin B token not available")
        return
    
    # Check users
    resp = requests.get(f"{BASE_URL}/users", headers=get_headers(token))
    if resp.status_code == 200:
        users = resp.json()
        # Should only see admin@testcompanyb.com (themselves)
        log_test("Company B - GET /users (empty)", 
                len(users) == 1 and users[0].get("email") == "admin@testcompanyb.com",
                f"Found {len(users)} users: {[u.get('email') for u in users]}")
    else:
        log_test("Company B - GET /users", False, f"Status: {resp.status_code}")
    
    # Check courses
    resp = requests.get(f"{BASE_URL}/courses", headers=get_headers(token))
    if resp.status_code == 200:
        courses = resp.json()
        log_test("Company B - GET /courses (empty)", 
                len(courses) == 0,
                f"Found {len(courses)} courses")
    else:
        log_test("Company B - GET /courses", False, f"Status: {resp.status_code}")
    
    # Check areas
    resp = requests.get(f"{BASE_URL}/areas", headers=get_headers(token))
    if resp.status_code == 200:
        areas = resp.json()
        log_test("Company B - GET /areas (empty)", 
                len(areas) == 0,
                f"Found {len(areas)} areas")
    else:
        log_test("Company B - GET /areas", False, f"Status: {resp.status_code}")
    
    # Check activities
    resp = requests.get(f"{BASE_URL}/activities", headers=get_headers(token))
    if resp.status_code == 200:
        activities = resp.json()
        log_test("Company B - GET /activities (empty)", 
                len(activities) == 0,
                f"Found {len(activities)} activities")
    else:
        log_test("Company B - GET /activities", False, f"Status: {resp.status_code}")
    
    # Check certificates
    resp = requests.get(f"{BASE_URL}/certificates", headers=get_headers(token))
    if resp.status_code == 200:
        certificates = resp.json()
        log_test("Company B - GET /certificates (empty)", 
                len(certificates) == 0,
                f"Found {len(certificates)} certificates")
    else:
        log_test("Company B - GET /certificates", False, f"Status: {resp.status_code}")
    
    # Check reports/summary
    resp = requests.get(f"{BASE_URL}/reports/summary", headers=get_headers(token))
    if resp.status_code == 200:
        summary = resp.json()
        log_test("Company B - GET /reports/summary (empty)", 
                summary.get("total_users") == 0 and summary.get("total_courses") == 0,
                f"total_users={summary.get('total_users')}, total_courses={summary.get('total_courses')}")
    else:
        log_test("Company B - GET /reports/summary", False, f"Status: {resp.status_code}")


def test_create_course_with_areas_activities():
    """Test 4: Create course with area_ids and activity_ids in Aptiva Demo"""
    print("\n=== TEST 4: Create Course with Areas/Activities ===")
    
    token = test_data.get("admin_demo_token")
    if not token:
        log_test("Create course with areas/activities", False, "Admin Demo token not available")
        return
    
    # Get areas and activities first
    resp = requests.get(f"{BASE_URL}/areas", headers=get_headers(token))
    if resp.status_code == 200:
        areas = resp.json()
        test_data["areas"] = areas
        print(f"  Found {len(areas)} areas: {[a.get('name') for a in areas]}")
    
    resp = requests.get(f"{BASE_URL}/activities", headers=get_headers(token))
    if resp.status_code == 200:
        activities = resp.json()
        test_data["activities"] = activities
        print(f"  Found {len(activities)} activities: {[a.get('name') for a in activities]}")
        
        # Find "Trabajo en Altura" activity
        trabajo_altura = next((a for a in activities if "Trabajo en Altura" in a.get("name", "")), None)
        if trabajo_altura:
            test_data["trabajo_altura_activity_id"] = trabajo_altura.get("activity_id")
    
    # Find "Operaciones Mina" area
    areas = test_data.get("areas", [])
    operaciones_mina = next((a for a in areas if "Operaciones Mina" in a.get("name", "")), None)
    if operaciones_mina:
        test_data["operaciones_mina_area_id"] = operaciones_mina.get("area_id")
    
    # Create course with area_ids and activity_ids
    course_data = {
        "name": "Curso de Seguridad en Altura",
        "description": "Curso de capacitación para trabajo en altura",
        "hours": 8,
        "validity_hours": 8760,
        "training_type": "e-learning",
        "status": "published",
        "prerequisites": [],
        "area_ids": [test_data.get("operaciones_mina_area_id")] if test_data.get("operaciones_mina_area_id") else [],
        "activity_ids": [test_data.get("trabajo_altura_activity_id")] if test_data.get("trabajo_altura_activity_id") else []
    }
    
    resp = requests.post(f"{BASE_URL}/courses", json=course_data, headers=get_headers(token))
    if resp.status_code == 200:
        course = resp.json()
        test_data["course_id"] = course.get("course_id")
        log_test("Create course with area_ids/activity_ids", 
                course.get("company_id") == test_data.get("aptiva_demo_company_id"),
                f"course_id={course.get('course_id')}, area_ids={course.get('area_ids')}, activity_ids={course.get('activity_ids')}")
    else:
        log_test("Create course with area_ids/activity_ids", False, f"Status: {resp.status_code}, Response: {resp.text}")


def test_worker_sees_matching_courses():
    """Test 5: Trabajador sees courses matching their area_ids/activity_ids"""
    print("\n=== TEST 5: Worker Sees Matching Courses ===")
    
    token = test_data.get("trabajador_demo_token")
    if not token:
        log_test("Worker sees matching courses", False, "Trabajador token not available")
        return
    
    resp = requests.get(f"{BASE_URL}/courses", headers=get_headers(token))
    if resp.status_code == 200:
        courses = resp.json()
        # Should see the course we created (matches their activity_ids)
        course_names = [c.get("name") for c in courses]
        has_matching_course = any("Seguridad en Altura" in name for name in course_names)
        log_test("Trabajador sees matching courses", 
                has_matching_course,
                f"Found {len(courses)} courses: {course_names}")
    else:
        log_test("Trabajador sees matching courses", False, f"Status: {resp.status_code}")


def test_create_evaluation():
    """Test 6: Create evaluation for the course"""
    print("\n=== TEST 6: Create Evaluation ===")
    
    token = test_data.get("admin_demo_token")
    course_id = test_data.get("course_id")
    
    if not token or not course_id:
        log_test("Create evaluation", False, "Token or course_id not available")
        return
    
    eval_data = {
        "course_id": course_id,
        "questions": [
            {
                "text": "¿Cuál es la altura mínima para considerar trabajo en altura?",
                "options": ["1 metro", "1.5 metros", "1.8 metros", "2 metros"],
                "correct_index": 2
            },
            {
                "text": "¿Qué equipo es obligatorio para trabajo en altura?",
                "options": ["Casco", "Arnés de seguridad", "Guantes", "Botas"],
                "correct_index": 1
            },
            {
                "text": "¿Cada cuánto se debe inspeccionar el arnés?",
                "options": ["Diariamente", "Semanalmente", "Mensualmente", "Anualmente"],
                "correct_index": 0
            }
        ],
        "min_score": 70,
        "max_attempts": 3
    }
    
    resp = requests.post(f"{BASE_URL}/evaluations", json=eval_data, headers=get_headers(token))
    if resp.status_code == 200:
        evaluation = resp.json()
        test_data["evaluation_id"] = evaluation.get("evaluation_id")
        log_test("Create evaluation", 
                evaluation.get("company_id") == test_data.get("aptiva_demo_company_id"),
                f"evaluation_id={evaluation.get('evaluation_id')}, questions={len(evaluation.get('questions', []))}")
    else:
        log_test("Create evaluation", False, f"Status: {resp.status_code}, Response: {resp.text}")


def test_worker_submit_evaluation():
    """Test 7: Worker submits evaluation and auto-certificate is issued"""
    print("\n=== TEST 7: Worker Submit Evaluation & Auto-Certificate ===")
    
    token = test_data.get("trabajador_demo_token")
    eval_id = test_data.get("evaluation_id")
    
    if not token or not eval_id:
        log_test("Worker submit evaluation", False, "Token or evaluation_id not available")
        return
    
    # Submit with all correct answers
    submit_data = {
        "answers": [2, 1, 0]  # All correct
    }
    
    resp = requests.post(f"{BASE_URL}/evaluations/{eval_id}/submit", 
                        json=submit_data, 
                        headers=get_headers(token))
    
    if resp.status_code == 200:
        result = resp.json()
        passed = result.get("passed")
        score = result.get("score")
        certificate = result.get("certificate")
        all_courses_completed = result.get("all_courses_completed")
        
        log_test("Worker submit evaluation - passed", 
                passed and score == 100,
                f"score={score}, passed={passed}")
        
        if certificate:
            test_data["certificate_id"] = certificate.get("certificate_id")
            test_data["verification_code"] = certificate.get("verification_code")
            
            # Verify certificate fields
            has_company_id = certificate.get("company_id") == test_data.get("aptiva_demo_company_id")
            has_role_ids = len(certificate.get("role_ids", [])) > 0
            has_role_names = len(certificate.get("role_names", [])) > 0
            has_courses_detail = len(certificate.get("courses_detail", [])) > 0
            cert_type = certificate.get("certificate_type") == "role_completion"
            
            log_test("Auto-certificate issued", 
                    has_company_id and has_role_ids and has_role_names and cert_type,
                    f"certificate_id={certificate.get('certificate_id')}, type={certificate.get('certificate_type')}, role_names={certificate.get('role_names')}")
            
            log_test("Certificate has correct fields",
                    has_courses_detail and certificate.get("total_hours") > 0,
                    f"total_hours={certificate.get('total_hours')}, average_score={certificate.get('average_score')}, courses={len(certificate.get('courses_detail', []))}")
        else:
            log_test("Auto-certificate issued", False, "No certificate in response")
    else:
        log_test("Worker submit evaluation", False, f"Status: {resp.status_code}, Response: {resp.text}")


def test_get_certificates():
    """Test 8: Worker can retrieve their certificates"""
    print("\n=== TEST 8: Get Certificates ===")
    
    token = test_data.get("trabajador_demo_token")
    if not token:
        log_test("Get certificates", False, "Trabajador token not available")
        return
    
    resp = requests.get(f"{BASE_URL}/certificates", headers=get_headers(token))
    if resp.status_code == 200:
        certificates = resp.json()
        has_certificate = len(certificates) > 0
        log_test("Worker GET /certificates", 
                has_certificate,
                f"Found {len(certificates)} certificates")
    else:
        log_test("Worker GET /certificates", False, f"Status: {resp.status_code}")


def test_public_certificate_verification():
    """Test 9: Public certificate verification endpoint (no auth)"""
    print("\n=== TEST 9: Public Certificate Verification ===")
    
    code = test_data.get("verification_code")
    if not code:
        log_test("Public certificate verification", False, "Verification code not available")
        return
    
    # No auth header - public endpoint
    resp = requests.get(f"{BASE_URL}/certificates/verify/{code}")
    if resp.status_code == 200:
        result = resp.json()
        certificate = result.get("certificate")
        is_valid = result.get("is_valid")
        
        log_test("Public certificate verification", 
                certificate is not None and is_valid,
                f"is_valid={is_valid}, verification_code={certificate.get('verification_code') if certificate else None}")
    else:
        log_test("Public certificate verification", False, f"Status: {resp.status_code}")


def test_certificate_pdf_generation():
    """Test 10: PDF generation with company branding"""
    print("\n=== TEST 10: Certificate PDF Generation ===")
    
    token = test_data.get("trabajador_demo_token")
    cert_id = test_data.get("certificate_id")
    
    if not token or not cert_id:
        log_test("Certificate PDF generation", False, "Token or certificate_id not available")
        return
    
    resp = requests.get(f"{BASE_URL}/certificates/{cert_id}/pdf", headers=get_headers(token))
    if resp.status_code == 200:
        content_type = resp.headers.get("Content-Type", "")
        content_length = len(resp.content)
        
        log_test("Certificate PDF generation", 
                "application/pdf" in content_type and content_length > 1000,
                f"content_type={content_type}, size={content_length} bytes")
    else:
        log_test("Certificate PDF generation", False, f"Status: {resp.status_code}")


def test_tenant_isolation_cross_access():
    """Test 11: Company B admin cannot access Aptiva Demo course"""
    print("\n=== TEST 11: Tenant Isolation - Cross-Access Denied ===")
    
    token = test_data.get("admin_b_token")
    course_id = test_data.get("course_id")
    
    if not token or not course_id:
        log_test("Tenant isolation - cross-access", False, "Token or course_id not available")
        return
    
    # Try to access Aptiva Demo course from Company B
    resp = requests.get(f"{BASE_URL}/courses/{course_id}", headers=get_headers(token))
    log_test("Company B cannot access Aptiva Demo course", 
            resp.status_code == 404,
            f"Status: {resp.status_code} (expected 404)")


def test_student_progress():
    """Test 12: Student progress endpoint shows correct courses"""
    print("\n=== TEST 12: Student Progress ===")
    
    token = test_data.get("trabajador_demo_token")
    if not token:
        log_test("Student progress", False, "Trabajador token not available")
        return
    
    resp = requests.get(f"{BASE_URL}/student/progress", headers=get_headers(token))
    if resp.status_code == 200:
        progress = resp.json()
        courses = progress.get("courses", [])
        total_courses = progress.get("total_courses", 0)
        completed_courses = progress.get("completed_courses", 0)
        role_names = progress.get("role_names")
        
        log_test("Student progress endpoint", 
                total_courses > 0 and completed_courses > 0,
                f"total={total_courses}, completed={completed_courses}, role_names={role_names}")
    else:
        log_test("Student progress endpoint", False, f"Status: {resp.status_code}")


def test_activity_curriculum():
    """Test 13: Activity curriculum endpoint returns courses tagged with activity"""
    print("\n=== TEST 13: Activity Curriculum ===")
    
    token = test_data.get("admin_demo_token")
    activity_id = test_data.get("trabajo_altura_activity_id")
    
    if not token or not activity_id:
        log_test("Activity curriculum", False, "Token or activity_id not available")
        return
    
    resp = requests.get(f"{BASE_URL}/activities/{activity_id}/curriculum", headers=get_headers(token))
    if resp.status_code == 200:
        result = resp.json()
        curriculum = result.get("curriculum", [])
        total_hours = result.get("total_hours", 0)
        
        log_test("Activity curriculum endpoint", 
                len(curriculum) > 0,
                f"Found {len(curriculum)} courses, total_hours={total_hours}")
    else:
        log_test("Activity curriculum endpoint", False, f"Status: {resp.status_code}")


def test_reports_summary():
    """Test 14: Reports summary is scoped to company"""
    print("\n=== TEST 14: Reports Summary (Scoped) ===")
    
    token = test_data.get("admin_demo_token")
    if not token:
        log_test("Reports summary", False, "Admin Demo token not available")
        return
    
    resp = requests.get(f"{BASE_URL}/reports/summary", headers=get_headers(token))
    if resp.status_code == 200:
        summary = resp.json()
        total_users = summary.get("total_users", 0)
        total_courses = summary.get("total_courses", 0)
        total_certificates = summary.get("total_certificates", 0)
        users_by_role = summary.get("users_by_role", [])
        
        log_test("Reports summary scoped to company", 
                total_users > 0 and total_courses > 0,
                f"users={total_users}, courses={total_courses}, certificates={total_certificates}, users_by_role={len(users_by_role)}")
    else:
        log_test("Reports summary", False, f"Status: {resp.status_code}")


def test_reports_users():
    """Test 15: Reports users endpoint is scoped to company"""
    print("\n=== TEST 15: Reports Users (Scoped) ===")
    
    token = test_data.get("admin_demo_token")
    if not token:
        log_test("Reports users", False, "Admin Demo token not available")
        return
    
    resp = requests.get(f"{BASE_URL}/reports/users", headers=get_headers(token))
    if resp.status_code == 200:
        users = resp.json()
        # Should only see users from Aptiva Demo company
        log_test("Reports users scoped to company", 
                len(users) > 0,
                f"Found {len(users)} users")
    else:
        log_test("Reports users", False, f"Status: {resp.status_code}")


def print_summary():
    """Print test summary"""
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for t in test_results if t["passed"])
    failed = sum(1 for t in test_results if not t["passed"])
    total = len(test_results)
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed} ✅")
    print(f"Failed: {failed} ❌")
    print(f"Success Rate: {(passed/total*100):.1f}%")
    
    if failed > 0:
        print("\n" + "="*60)
        print("FAILED TESTS:")
        print("="*60)
        for t in test_results:
            if not t["passed"]:
                print(f"\n❌ {t['name']}")
                if t["details"]:
                    print(f"   {t['details']}")
    
    return failed == 0


def main():
    """Run all tests"""
    print("="*60)
    print("F1.2 MULTI-TENANT BACKEND TESTING")
    print("="*60)
    
    try:
        test_authentication()
        test_create_second_company()
        test_tenant_isolation_empty_lists()
        test_create_course_with_areas_activities()
        test_worker_sees_matching_courses()
        test_create_evaluation()
        test_worker_submit_evaluation()
        test_get_certificates()
        test_public_certificate_verification()
        test_certificate_pdf_generation()
        test_tenant_isolation_cross_access()
        test_student_progress()
        test_activity_curriculum()
        test_reports_summary()
        test_reports_users()
        
        success = print_summary()
        sys.exit(0 if success else 1)
        
    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
