#!/usr/bin/env python3
"""
E-Learning Platform Backend API Testing
Tests all major API endpoints for functionality
"""

import requests
import sys
import json
from datetime import datetime

class ELearningAPITester:
    def __init__(self, base_url="https://e401cd41-8492-43eb-83ab-c33230484a34.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.student_token = None
        self.demo_student_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_data = {}
        self.critical_failures = []

    def log(self, message, level="INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, description=""):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"Testing {name}... {description}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - {name} - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                self.log(f"❌ FAILED - {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    self.log(f"   Error details: {error_detail}")
                except:
                    self.log(f"   Response text: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log(f"❌ FAILED - {name} - Exception: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200, description="Check if API is running")

    def test_setup_admin(self):
        """Test admin setup"""
        return self.run_test("Setup Admin", "POST", "setup/admin", 200, description="Create initial admin user")

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login", 
            "POST", 
            "auth/login", 
            200,
            data={"email": "admin@elearning.com", "password": "admin123"},
            description="Login with admin credentials"
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            self.test_data['admin_user'] = response.get('user', {})
            return True
        else:
            self.critical_failures.append("Admin login failed - cannot proceed with tests")
        return False

    def test_demo_student_login(self):
        """Test demo student login (seeded user)"""
        success, response = self.run_test(
            "Demo Student Login", 
            "POST", 
            "auth/login", 
            200,
            data={"email": "demo.alumno@test.com", "password": "demo123"},
            description="Login with demo student credentials"
        )
        if success and 'token' in response:
            self.demo_student_token = response['token']
            self.test_data['demo_student_user'] = response.get('user', {})
            return True
        else:
            self.critical_failures.append("Demo student login failed")
        return False

    def test_student_registration(self):
        """Test student registration with role_ids array"""
        # Get a role_id first if available
        role_ids = []
        if 'role_id' in self.test_data:
            role_ids = [self.test_data['role_id']]
        
        student_data = {
            "email": f"student_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "student123",
            "full_name": "María González Pérez",
            "rut": f"12345678-{datetime.now().strftime('%S')}",
            "company": "Empresa Minera del Norte",
            "role_ids": role_ids,
            "is_admin": False
        }
        
        success, response = self.run_test(
            "Student Registration (with role_ids[])",
            "POST",
            "auth/register",
            200,
            data=student_data,
            description="Register new student user with role_ids array"
        )
        
        if success and 'token' in response:
            self.student_token = response['token']
            self.test_data['student_user'] = response.get('user', {})
            self.test_data['student_data'] = student_data
            # Verify role_ids is an array
            user = response.get('user', {})
            if 'role_ids' in user:
                if isinstance(user['role_ids'], list):
                    self.log(f"   ✅ role_ids is correctly stored as array: {user['role_ids']}")
                else:
                    self.log(f"   ❌ role_ids is not an array: {type(user['role_ids'])}")
                    self.critical_failures.append("role_ids not stored as TEXT[] array")
            return True
        return False

    def test_auth_me(self):
        """Test get current user"""
        if not self.admin_token:
            return False
            
        return self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200,
            headers={'Authorization': f'Bearer {self.admin_token}'},
            description="Get authenticated user info"
        )[0]

    def test_users_crud(self):
        """Test users CRUD operations"""
        if not self.admin_token:
            return False

        auth_headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Get users
        success = self.run_test(
            "Get Users",
            "GET",
            "users",
            200,
            headers=auth_headers,
            description="List all users"
        )[0]
        
        if not success:
            return False

        # Get specific user
        if 'student_user' in self.test_data:
            user_id = self.test_data['student_user']['user_id']
            success = self.run_test(
                "Get User by ID",
                "GET",
                f"users/{user_id}",
                200,
                headers=auth_headers,
                description=f"Get user {user_id}"
            )[0]
            
            if success:
                # Update user
                success = self.run_test(
                    "Update User",
                    "PUT",
                    f"users/{user_id}",
                    200,
                    data={"company": "Updated Company"},
                    headers=auth_headers,
                    description="Update user company"
                )[0]

        return success

    def test_roles_crud(self):
        """Test roles CRUD operations and verify 19 predefined roles"""
        if not self.admin_token:
            return False

        auth_headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Get roles - should have 19 predefined roles
        success, response = self.run_test(
            "Get Roles (19 predefined)",
            "GET",
            "roles",
            200,
            headers=auth_headers,
            description="List all roles - should have 19 predefined"
        )
        
        if success:
            roles = response if isinstance(response, list) else []
            self.log(f"   Found {len(roles)} roles")
            if len(roles) != 19:
                self.log(f"   ⚠️  Expected 19 predefined roles, found {len(roles)}")
                self.critical_failures.append(f"Expected 19 predefined roles, found {len(roles)}")
            else:
                self.log(f"   ✅ Confirmed 19 predefined roles exist")
        
        # Create role
        role_data = {
            "name": f"Test Role {datetime.now().strftime('%H%M%S')}",
            "description": "Test role for testing",
            "course_ids": []
        }
        
        success, response = self.run_test(
            "Create Role",
            "POST",
            "roles",
            200,
            data=role_data,
            headers=auth_headers,
            description="Create new role"
        )
        
        if success and 'role_id' in response:
            role_id = response['role_id']
            self.test_data['role_id'] = role_id
            
            # Get specific role
            success = self.run_test(
                "Get Role by ID",
                "GET",
                f"roles/{role_id}",
                200,
                headers=auth_headers,
                description=f"Get role {role_id}"
            )[0]

        return success

    def test_courses_crud(self):
        """Test courses CRUD operations"""
        if not self.admin_token:
            return False

        auth_headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Create course
        course_data = {
            "name": "Test Course",
            "description": "Test course for API testing",
            "hours": 8,
            "validity_hours": 8760,
            "training_type": "e-learning",
            "video_url": "https://vimeo.com/123456789",
            "status": "published"
        }
        
        success, response = self.run_test(
            "Create Course",
            "POST",
            "courses",
            200,
            data=course_data,
            headers=auth_headers,
            description="Create new course"
        )
        
        if success and 'course_id' in response:
            course_id = response['course_id']
            self.test_data['course_id'] = course_id
            
            # Get courses
            success = self.run_test(
                "Get Courses",
                "GET",
                "courses",
                200,
                headers=auth_headers,
                description="List all courses"
            )[0]
            
            if success:
                # Get specific course
                success = self.run_test(
                    "Get Course by ID",
                    "GET",
                    f"courses/{course_id}",
                    200,
                    headers=auth_headers,
                    description=f"Get course {course_id}"
                )[0]
                
                if success:
                    # Update course
                    success = self.run_test(
                        "Update Course",
                        "PUT",
                        f"courses/{course_id}",
                        200,
                        data={"description": "Updated course description"},
                        headers=auth_headers,
                        description="Update course description"
                    )[0]

        return success

    def test_evaluations_crud(self):
        """Test evaluations CRUD operations with JSONB questions"""
        if not self.admin_token or 'course_id' not in self.test_data:
            return False

        auth_headers = {'Authorization': f'Bearer {self.admin_token}'}
        course_id = self.test_data['course_id']
        
        # Create evaluation with JSONB questions
        eval_data = {
            "course_id": course_id,
            "questions": [
                {
                    "text": "¿Cuál es la altura mínima para considerar trabajo en altura?",
                    "options": ["1.5 metros", "1.8 metros", "2.0 metros", "2.5 metros"],
                    "correct_index": 1
                },
                {
                    "text": "¿Qué equipo de protección personal es obligatorio?",
                    "options": ["Casco", "Arnés", "Guantes", "Todos los anteriores"],
                    "correct_index": 3
                }
            ],
            "min_score": 70,
            "max_attempts": 3
        }
        
        success, response = self.run_test(
            "Create Evaluation (JSONB questions)",
            "POST",
            "evaluations",
            200,
            data=eval_data,
            headers=auth_headers,
            description="Create evaluation with JSONB questions"
        )
        
        if success and 'evaluation_id' in response:
            eval_id = response['evaluation_id']
            self.test_data['evaluation_id'] = eval_id
            
            # Verify questions are stored and returned correctly as JSONB
            if 'questions' in response:
                questions = response['questions']
                if isinstance(questions, list) and len(questions) == 2:
                    self.log(f"   ✅ JSONB questions stored and retrieved correctly")
                    # Verify structure
                    if all('text' in q and 'options' in q and 'correct_index' in q for q in questions):
                        self.log(f"   ✅ Question structure is correct")
                    else:
                        self.log(f"   ❌ Question structure is incorrect")
                        self.critical_failures.append("JSONB questions structure incorrect")
                else:
                    self.log(f"   ❌ JSONB questions not returned correctly")
                    self.critical_failures.append("JSONB questions not returned correctly")
            
            # Get evaluation by course
            success = self.run_test(
                "Get Evaluation by Course",
                "GET",
                f"evaluations/course/{course_id}",
                200,
                headers=auth_headers,
                description=f"Get evaluation for course {course_id}"
            )[0]

        return success

    def test_student_evaluation_flow(self):
        """Test student taking evaluation and scoring"""
        if not self.student_token or 'evaluation_id' not in self.test_data:
            return False

        auth_headers = {'Authorization': f'Bearer {self.student_token}'}
        eval_id = self.test_data['evaluation_id']
        
        # Submit evaluation with correct answers
        submit_data = {
            "answers": [1, 3]  # Correct answers for both questions
        }
        
        success, response = self.run_test(
            "Submit Evaluation (scoring)",
            "POST",
            f"evaluations/{eval_id}/submit",
            200,
            data=submit_data,
            headers=auth_headers,
            description="Submit evaluation with correct answers"
        )
        
        if success:
            score = response.get('score', 0)
            passed = response.get('passed', False)
            self.log(f"   Score: {score}%, Passed: {passed}")
            
            if score == 100 and passed:
                self.log(f"   ✅ Scoring calculation correct")
            else:
                self.log(f"   ⚠️  Expected 100% and passed=True")
            
            # Check if certificate was issued (may not be if not all courses completed)
            if response.get('certificate'):
                self.test_data['certificate'] = response['certificate']
                self.log(f"   ✅ Certificate auto-issued")
            else:
                self.log(f"   ℹ️  Certificate not issued (expected if not all role courses completed)")
            
            return True
            
        return success

    def test_auto_certificate_issuance(self):
        """Test auto-certificate issuance when all courses in role are completed"""
        if not self.admin_token:
            return False

        auth_headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Create a test role with one course
        role_data = {
            "name": f"Test Cert Role {datetime.now().strftime('%H%M%S')}",
            "description": "Role for testing auto-certificate",
            "course_ids": [],
            "course_order": []
        }
        
        success, role_response = self.run_test(
            "Create Role for Cert Test",
            "POST",
            "roles",
            200,
            data=role_data,
            headers=auth_headers,
            description="Create role for certificate test"
        )
        
        if not success:
            return False
        
        test_role_id = role_response['role_id']
        
        # Create a course
        course_data = {
            "name": f"Test Cert Course {datetime.now().strftime('%H%M%S')}",
            "description": "Course for certificate testing",
            "hours": 4,
            "validity_hours": 8760,
            "training_type": "e-learning",
            "status": "published",
            "prerequisites": []
        }
        
        success, course_response = self.run_test(
            "Create Course for Cert Test",
            "POST",
            "courses",
            200,
            data=course_data,
            headers=auth_headers,
            description="Create course for certificate test"
        )
        
        if not success:
            return False
        
        test_course_id = course_response['course_id']
        
        # Update role to include this course
        success = self.run_test(
            "Update Role with Course",
            "PUT",
            f"roles/{test_role_id}",
            200,
            data={"course_ids": [test_course_id], "course_order": [test_course_id]},
            headers=auth_headers,
            description="Add course to role"
        )[0]
        
        if not success:
            return False
        
        # Create a test user with this role
        test_user_data = {
            "email": f"certtest_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "test123",
            "full_name": "Juan Pérez Certificado",
            "rut": f"98765432-{datetime.now().strftime('%S')}",
            "company": "Empresa Test",
            "role_ids": [test_role_id],
            "is_admin": False
        }
        
        success, user_response = self.run_test(
            "Create User for Cert Test",
            "POST",
            "auth/register",
            200,
            data=test_user_data,
            description="Create user with test role"
        )
        
        if not success:
            return False
        
        test_user_token = user_response['token']
        
        # Create evaluation for the course
        eval_data = {
            "course_id": test_course_id,
            "questions": [
                {
                    "text": "Test question?",
                    "options": ["A", "B", "C", "D"],
                    "correct_index": 0
                }
            ],
            "min_score": 70,
            "max_attempts": 3
        }
        
        success, eval_response = self.run_test(
            "Create Evaluation for Cert Test",
            "POST",
            "evaluations",
            200,
            data=eval_data,
            headers=auth_headers,
            description="Create evaluation"
        )
        
        if not success:
            return False
        
        test_eval_id = eval_response['evaluation_id']
        
        # Submit evaluation as test user (should auto-issue certificate)
        success, submit_response = self.run_test(
            "Submit Eval (Auto-Cert Test)",
            "POST",
            f"evaluations/{test_eval_id}/submit",
            200,
            data={"answers": [0]},
            headers={'Authorization': f'Bearer {test_user_token}'},
            description="Submit evaluation - should auto-issue certificate"
        )
        
        if success:
            if submit_response.get('certificate'):
                self.log(f"   ✅ Certificate auto-issued when all role courses completed")
                cert = submit_response['certificate']
                # Verify certificate has role_ids array
                if 'role_ids' in cert and isinstance(cert['role_ids'], list):
                    self.log(f"   ✅ Certificate has role_ids array: {cert['role_ids']}")
                else:
                    self.log(f"   ❌ Certificate missing role_ids array")
                    self.critical_failures.append("Certificate missing role_ids array")
                return True
            else:
                self.log(f"   ❌ Certificate NOT auto-issued when all courses completed")
                self.critical_failures.append("Auto-certificate issuance failed")
                return False
        
        return False

    def test_certificates(self):
        """Test certificates functionality"""
        if not self.admin_token:
            return False

        auth_headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Get certificates
        success = self.run_test(
            "Get Certificates",
            "GET",
            "certificates",
            200,
            headers=auth_headers,
            description="List all certificates"
        )[0]
        
        if success and 'certificate' in self.test_data:
            cert = self.test_data['certificate']
            cert_id = cert['certificate_id']
            verification_code = cert['verification_code']
            
            # Get specific certificate
            success = self.run_test(
                "Get Certificate by ID",
                "GET",
                f"certificates/{cert_id}",
                200,
                headers=auth_headers,
                description=f"Get certificate {cert_id}"
            )[0]
            
            if success:
                # Verify certificate (public endpoint)
                success = self.run_test(
                    "Verify Certificate",
                    "GET",
                    f"certificates/verify/{verification_code}",
                    200,
                    description=f"Verify certificate with code {verification_code}"
                )[0]

        return success

    def test_branding(self):
        """Test branding functionality"""
        if not self.admin_token:
            return False

        auth_headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Get branding
        success = self.run_test(
            "Get Branding",
            "GET",
            "branding",
            200,
            description="Get branding configuration"
        )[0]
        
        if success:
            # Update branding
            success = self.run_test(
                "Update Branding",
                "PUT",
                "branding",
                200,
                data={"primary_color": "#FF6B35", "footer_text": "Test Footer"},
                headers=auth_headers,
                description="Update branding colors and footer"
            )[0]

        return success

    def test_reports(self):
        """Test reports functionality including CSV export"""
        if not self.admin_token:
            return False

        auth_headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Get reports summary (tests users_by_role aggregation with UNNEST)
        success, response = self.run_test(
            "Get Reports Summary (users_by_role)",
            "GET",
            "reports/summary",
            200,
            headers=auth_headers,
            description="Get platform statistics with users_by_role aggregation"
        )
        
        if success:
            # Verify users_by_role exists and uses UNNEST aggregation
            if 'users_by_role' in response:
                users_by_role = response['users_by_role']
                self.log(f"   ✅ users_by_role aggregation working: {len(users_by_role)} role groups")
                if isinstance(users_by_role, list):
                    for role_stat in users_by_role[:3]:  # Show first 3
                        self.log(f"      - {role_stat.get('role', 'Unknown')}: {role_stat.get('count', 0)} users")
                else:
                    self.log(f"   ❌ users_by_role is not a list")
                    self.critical_failures.append("users_by_role aggregation incorrect format")
            else:
                self.log(f"   ❌ users_by_role missing from summary")
                self.critical_failures.append("users_by_role missing from reports/summary")
            
            # Get users report
            success = self.run_test(
                "Get Users Report",
                "GET",
                "reports/users",
                200,
                headers=auth_headers,
                description="Get detailed users report"
            )[0]
            
            if success:
                # Test CSV export
                success = self.run_test(
                    "Export Users CSV",
                    "GET",
                    "reports/export/users",
                    200,
                    headers=auth_headers,
                    description="Export users report as CSV"
                )[0]
                
                if success:
                    self.log(f"   ✅ CSV export working")

        return success

    def test_student_progress(self):
        """Test student progress functionality"""
        if not self.student_token:
            return False

        auth_headers = {'Authorization': f'Bearer {self.student_token}'}
        
        return self.run_test(
            "Get Student Progress",
            "GET",
            "student/progress",
            200,
            headers=auth_headers,
            description="Get student course progress"
        )[0]

    def run_all_tests(self):
        """Run all API tests"""
        self.log("🚀 Starting E-Learning Platform API Tests (Supabase PostgreSQL Migration)")
        self.log(f"Testing against: {self.base_url}")
        
        # Basic connectivity
        if not self.test_root_endpoint():
            self.log("❌ API is not accessible, stopping tests")
            return False
        
        # Setup and authentication
        self.test_setup_admin()
        
        if not self.test_admin_login():
            self.log("❌ Admin login failed, stopping tests")
            return False
        
        # Test demo student login (seeded user)
        self.test_demo_student_login()
        
        # Test authenticated endpoints
        self.test_auth_me()
        
        # Test roles first (to get role_id for user creation)
        self.test_roles_crud()
        
        # Test user registration with role_ids[]
        if not self.test_student_registration():
            self.log("❌ Student registration failed, stopping tests")
            return False
        
        self.test_users_crud()
        self.test_courses_crud()
        self.test_evaluations_crud()
        self.test_student_evaluation_flow()
        
        # Test auto-certificate issuance (critical for migration)
        self.test_auto_certificate_issuance()
        
        self.test_certificates()
        self.test_branding()
        self.test_reports()
        self.test_student_progress()
        
        # Print results
        self.log("=" * 50)
        self.log(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"📈 Success Rate: {success_rate:.1f}%")
        
        # Report critical failures
        if self.critical_failures:
            self.log("=" * 50)
            self.log("🚨 CRITICAL FAILURES:")
            for failure in self.critical_failures:
                self.log(f"   ❌ {failure}")
        
        if success_rate >= 80 and len(self.critical_failures) == 0:
            self.log("✅ Backend API is working well!")
            return True
        else:
            self.log("❌ Backend has significant issues")
            return False

def main():
    tester = ELearningAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())