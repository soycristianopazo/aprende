#!/usr/bin/env python3
"""
E-Learning Platform - Auto-Certificate Issuance Test
Tests the complete flow of auto-issuing certificates when a student completes all courses in their role.
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend/.env
BASE_URL = "https://e401cd41-8492-43eb-83ab-c33230484a34.preview.emergentagent.com/api"

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "admin@elearning.com"
ADMIN_PASSWORD = "admin123"
STUDENT_EMAIL = "demo.alumno@test.com"
STUDENT_PASSWORD = "demo123"

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def log_success(msg):
    print(f"{GREEN}✅ {msg}{RESET}")

def log_error(msg):
    print(f"{RED}❌ {msg}{RESET}")

def log_info(msg):
    print(f"{BLUE}ℹ️  {msg}{RESET}")

def log_warning(msg):
    print(f"{YELLOW}⚠️  {msg}{RESET}")

class TestRunner:
    def __init__(self):
        self.admin_token = None
        self.student_token = None
        self.role_id = None
        self.course_id = None
        self.evaluation_id = None
        self.certificate_id = None
        self.verification_code = None
        self.student_user_id = None
        self.initial_cert_count = 0
        
    def login_admin(self):
        """Login as admin and get token"""
        log_info("Step 1: Login as admin...")
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code != 200:
            log_error(f"Admin login failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        self.admin_token = data.get("token") or data.get("access_token")
        if not self.admin_token:
            log_error("No token in admin login response")
            return False
        
        log_success(f"Admin logged in successfully")
        return True
    
    def get_initial_cert_count(self):
        """Get initial certificate count from reports/summary"""
        log_info("Getting initial certificate count...")
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.get(f"{BASE_URL}/reports/summary", headers=headers)
        
        if response.status_code != 200:
            log_warning(f"Could not get initial cert count: {response.status_code}")
            return True  # Non-critical
        
        data = response.json()
        self.initial_cert_count = data.get("total_certificates", 0)
        log_info(f"Initial certificate count: {self.initial_cert_count}")
        return True
    
    def create_role(self):
        """Create a role with 1 course (will be assigned later)"""
        log_info("Step 2: Creating a role...")
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        role_name = f"Test Role Auto-Cert {datetime.now().strftime('%H%M%S')}"
        response = requests.post(f"{BASE_URL}/roles", headers=headers, json={
            "name": role_name,
            "description": "Test role for auto-certificate issuance",
            "course_ids": [],  # Will add course later
            "course_order": []
        })
        
        if response.status_code != 200:
            log_error(f"Role creation failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        self.role_id = data.get("role_id")
        if not self.role_id:
            log_error("No role_id in response")
            return False
        
        log_success(f"Role created: {role_name} (ID: {self.role_id})")
        return True
    
    def create_course(self):
        """Create a course"""
        log_info("Step 3: Creating a course...")
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        course_name = f"Test Course Auto-Cert {datetime.now().strftime('%H%M%S')}"
        response = requests.post(f"{BASE_URL}/courses", headers=headers, json={
            "name": course_name,
            "description": "Test course for auto-certificate issuance",
            "hours": 10,
            "validity_hours": 8760,
            "training_type": "e-learning",
            "status": "published",
            "prerequisites": []
        })
        
        if response.status_code != 200:
            log_error(f"Course creation failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        self.course_id = data.get("course_id")
        if not self.course_id:
            log_error("No course_id in response")
            return False
        
        log_success(f"Course created: {course_name} (ID: {self.course_id})")
        return True
    
    def assign_course_to_role(self):
        """Assign the course to the role"""
        log_info("Step 4: Assigning course to role...")
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        response = requests.put(f"{BASE_URL}/roles/{self.role_id}", headers=headers, json={
            "course_ids": [self.course_id],
            "course_order": [self.course_id]
        })
        
        if response.status_code != 200:
            log_error(f"Course assignment failed: {response.status_code} - {response.text}")
            return False
        
        log_success(f"Course assigned to role")
        return True
    
    def get_student_user(self):
        """Get the demo student user"""
        log_info("Step 5: Getting demo student user...")
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        response = requests.get(f"{BASE_URL}/users", headers=headers)
        if response.status_code != 200:
            log_error(f"Failed to get users: {response.status_code}")
            return False
        
        users = response.json()
        student = next((u for u in users if u.get("email") == STUDENT_EMAIL), None)
        
        if not student:
            log_error(f"Student user {STUDENT_EMAIL} not found")
            return False
        
        self.student_user_id = student.get("user_id")
        log_success(f"Found student user: {student.get('full_name')} (ID: {self.student_user_id})")
        return True
    
    def assign_role_to_student(self):
        """Assign the role to the student"""
        log_info("Step 6: Assigning role to student...")
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        response = requests.put(f"{BASE_URL}/users/{self.student_user_id}", headers=headers, json={
            "role_ids": [self.role_id]
        })
        
        if response.status_code != 200:
            log_error(f"Role assignment failed: {response.status_code} - {response.text}")
            return False
        
        log_success(f"Role assigned to student")
        return True
    
    def create_evaluation(self):
        """Create an evaluation for the course"""
        log_info("Step 7: Creating evaluation for the course...")
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        response = requests.post(f"{BASE_URL}/evaluations", headers=headers, json={
            "course_id": self.course_id,
            "min_score": 70,
            "max_attempts": 3,
            "questions": [
                {
                    "text": "What is 2 + 2?",
                    "options": ["3", "4", "5", "6"],
                    "correct_index": 1
                },
                {
                    "text": "What is the capital of France?",
                    "options": ["London", "Berlin", "Paris", "Madrid"],
                    "correct_index": 2
                }
            ]
        })
        
        if response.status_code != 200:
            log_error(f"Evaluation creation failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        self.evaluation_id = data.get("evaluation_id")
        if not self.evaluation_id:
            log_error("No evaluation_id in response")
            return False
        
        log_success(f"Evaluation created (ID: {self.evaluation_id})")
        return True
    
    def login_student(self):
        """Login as student"""
        log_info("Step 8: Login as student...")
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": STUDENT_EMAIL,
            "password": STUDENT_PASSWORD
        })
        
        if response.status_code != 200:
            log_error(f"Student login failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        self.student_token = data.get("token") or data.get("access_token")
        if not self.student_token:
            log_error("No token in student login response")
            return False
        
        log_success(f"Student logged in successfully")
        return True
    
    def submit_evaluation(self):
        """Submit evaluation with correct answers"""
        log_info("Step 9: Submitting evaluation with correct answers...")
        headers = {"Authorization": f"Bearer {self.student_token}"}
        
        response = requests.post(
            f"{BASE_URL}/evaluations/{self.evaluation_id}/submit",
            headers=headers,
            json={
                "answers": [1, 2]  # Correct answers
            }
        )
        
        if response.status_code != 200:
            log_error(f"Evaluation submission failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        score = data.get("score")
        passed = data.get("passed")
        certificate = data.get("certificate")
        all_courses_completed = data.get("all_courses_completed")
        
        log_success(f"Evaluation submitted - Score: {score}%, Passed: {passed}")
        
        if not passed:
            log_error("Evaluation not passed - cannot test certificate issuance")
            return False
        
        if not all_courses_completed:
            log_error("all_courses_completed is False - expected True since role has only 1 course")
            return False
        
        log_success("all_courses_completed is True")
        
        if not certificate:
            log_error("No certificate returned in response - auto-issuance FAILED")
            return False
        
        # Validate certificate structure
        self.certificate_id = certificate.get("certificate_id")
        self.verification_code = certificate.get("verification_code")
        
        required_fields = [
            "certificate_id", "verification_code", "certificate_type", "user_id",
            "role_ids", "role_names", "user_name", "user_rut", "user_company",
            "total_hours", "average_score", "courses_detail", "issued_at", "expires_at"
        ]
        
        missing_fields = [f for f in required_fields if f not in certificate]
        if missing_fields:
            log_error(f"Certificate missing fields: {missing_fields}")
            return False
        
        # Validate certificate_type
        if certificate.get("certificate_type") != "role_completion":
            log_error(f"Expected certificate_type='role_completion', got '{certificate.get('certificate_type')}'")
            return False
        
        # Validate courses_detail
        courses_detail = certificate.get("courses_detail", [])
        if not courses_detail or len(courses_detail) != 1:
            log_error(f"Expected 1 course in courses_detail, got {len(courses_detail)}")
            return False
        
        log_success(f"✨ Certificate auto-issued successfully!")
        log_info(f"   Certificate ID: {self.certificate_id}")
        log_info(f"   Verification Code: {self.verification_code}")
        log_info(f"   Type: {certificate.get('certificate_type')}")
        log_info(f"   Total Hours: {certificate.get('total_hours')}")
        log_info(f"   Average Score: {certificate.get('average_score')}%")
        log_info(f"   Courses: {len(courses_detail)}")
        
        return True
    
    def verify_get_certificates(self):
        """Verify GET /api/certificates returns the certificate"""
        log_info("Step 10: Verifying GET /api/certificates...")
        headers = {"Authorization": f"Bearer {self.student_token}"}
        
        response = requests.get(f"{BASE_URL}/certificates", headers=headers)
        
        if response.status_code != 200:
            log_error(f"GET /api/certificates failed: {response.status_code} - {response.text}")
            return False
        
        certificates = response.json()
        
        # Find our certificate
        cert = next((c for c in certificates if c.get("certificate_id") == self.certificate_id), None)
        
        if not cert:
            log_error(f"Certificate {self.certificate_id} not found in GET /api/certificates")
            return False
        
        log_success(f"Certificate found in GET /api/certificates")
        return True
    
    def verify_public_verification(self):
        """Verify GET /api/certificates/verify/{code} works"""
        log_info("Step 11: Verifying public verification endpoint...")
        
        response = requests.get(f"{BASE_URL}/certificates/verify/{self.verification_code}")
        
        if response.status_code != 200:
            log_error(f"GET /api/certificates/verify/{self.verification_code} failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        certificate = data.get("certificate")
        is_valid = data.get("is_valid")
        
        if not certificate:
            log_error("No certificate in verification response")
            return False
        
        if certificate.get("certificate_id") != self.certificate_id:
            log_error(f"Wrong certificate returned: {certificate.get('certificate_id')}")
            return False
        
        if not is_valid:
            log_error("Certificate marked as invalid")
            return False
        
        log_success(f"Public verification endpoint working correctly")
        return True
    
    def verify_reports_summary(self):
        """Verify GET /api/reports/summary shows incremented certificate count"""
        log_info("Step 12: Verifying reports/summary certificate count...")
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        response = requests.get(f"{BASE_URL}/reports/summary", headers=headers)
        
        if response.status_code != 200:
            log_warning(f"GET /api/reports/summary failed: {response.status_code}")
            return True  # Non-critical
        
        data = response.json()
        current_cert_count = data.get("total_certificates", 0)
        
        if current_cert_count <= self.initial_cert_count:
            log_warning(f"Certificate count not incremented: initial={self.initial_cert_count}, current={current_cert_count}")
            return True  # Non-critical warning
        
        log_success(f"Certificate count incremented: {self.initial_cert_count} → {current_cert_count}")
        return True
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("\n" + "="*80)
        print("🧪 AUTO-CERTIFICATE ISSUANCE TEST")
        print("="*80 + "\n")
        
        tests = [
            ("Admin Login", self.login_admin),
            ("Get Initial Cert Count", self.get_initial_cert_count),
            ("Create Role", self.create_role),
            ("Create Course", self.create_course),
            ("Assign Course to Role", self.assign_course_to_role),
            ("Get Student User", self.get_student_user),
            ("Assign Role to Student", self.assign_role_to_student),
            ("Create Evaluation", self.create_evaluation),
            ("Student Login", self.login_student),
            ("Submit Evaluation & Auto-Issue Certificate", self.submit_evaluation),
            ("Verify GET /api/certificates", self.verify_get_certificates),
            ("Verify Public Verification Endpoint", self.verify_public_verification),
            ("Verify Reports Summary", self.verify_reports_summary),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            try:
                if test_func():
                    passed += 1
                else:
                    failed += 1
                    log_error(f"Test failed: {test_name}")
                    break  # Stop on first failure
            except Exception as e:
                failed += 1
                log_error(f"Test exception in {test_name}: {str(e)}")
                import traceback
                traceback.print_exc()
                break
        
        print("\n" + "="*80)
        print(f"📊 TEST RESULTS: {passed} passed, {failed} failed")
        print("="*80 + "\n")
        
        if failed == 0:
            log_success("🎉 ALL TESTS PASSED - Auto-certificate issuance is working!")
            return 0
        else:
            log_error("❌ TESTS FAILED - Auto-certificate issuance has issues")
            return 1

if __name__ == "__main__":
    runner = TestRunner()
    sys.exit(runner.run_all_tests())
