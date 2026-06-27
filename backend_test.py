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
    def __init__(self, base_url="https://user-credentials-6.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.student_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_data = {}

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
        return False

    def test_student_registration(self):
        """Test student registration"""
        student_data = {
            "email": f"student_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "student123",
            "full_name": "Test Student",
            "rut": f"12345678-{datetime.now().strftime('%S')}",
            "company": "Test Company",
            "is_admin": False
        }
        
        success, response = self.run_test(
            "Student Registration",
            "POST",
            "auth/register",
            200,
            data=student_data,
            description="Register new student user"
        )
        
        if success and 'token' in response:
            self.student_token = response['token']
            self.test_data['student_user'] = response.get('user', {})
            self.test_data['student_data'] = student_data
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
        """Test roles CRUD operations"""
        if not self.admin_token:
            return False

        auth_headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Create role
        role_data = {
            "name": "Test Role",
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
            
            # Get roles
            success = self.run_test(
                "Get Roles",
                "GET",
                "roles",
                200,
                headers=auth_headers,
                description="List all roles"
            )[0]
            
            if success:
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
        """Test evaluations CRUD operations"""
        if not self.admin_token or 'course_id' not in self.test_data:
            return False

        auth_headers = {'Authorization': f'Bearer {self.admin_token}'}
        course_id = self.test_data['course_id']
        
        # Create evaluation
        eval_data = {
            "course_id": course_id,
            "questions": [
                {
                    "text": "What is 2+2?",
                    "options": ["3", "4", "5", "6"],
                    "correct_index": 1
                },
                {
                    "text": "What is the capital of Chile?",
                    "options": ["Santiago", "Valparaíso", "Concepción", "La Serena"],
                    "correct_index": 0
                }
            ],
            "min_score": 70,
            "max_attempts": 3
        }
        
        success, response = self.run_test(
            "Create Evaluation",
            "POST",
            "evaluations",
            200,
            data=eval_data,
            headers=auth_headers,
            description="Create evaluation for course"
        )
        
        if success and 'evaluation_id' in response:
            eval_id = response['evaluation_id']
            self.test_data['evaluation_id'] = eval_id
            
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
        """Test student taking evaluation"""
        if not self.student_token or 'evaluation_id' not in self.test_data:
            return False

        auth_headers = {'Authorization': f'Bearer {self.student_token}'}
        eval_id = self.test_data['evaluation_id']
        
        # Submit evaluation with correct answers
        submit_data = {
            "answers": [1, 0]  # Correct answers for both questions
        }
        
        success, response = self.run_test(
            "Submit Evaluation",
            "POST",
            f"evaluations/{eval_id}/submit",
            200,
            data=submit_data,
            headers=auth_headers,
            description="Submit evaluation with correct answers"
        )
        
        if success and response.get('certificate'):
            self.test_data['certificate'] = response['certificate']
            return True
            
        return success

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
        """Test reports functionality"""
        if not self.admin_token:
            return False

        auth_headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Get reports summary
        success = self.run_test(
            "Get Reports Summary",
            "GET",
            "reports/summary",
            200,
            headers=auth_headers,
            description="Get platform statistics summary"
        )[0]
        
        if success:
            # Get users report
            success = self.run_test(
                "Get Users Report",
                "GET",
                "reports/users",
                200,
                headers=auth_headers,
                description="Get detailed users report"
            )[0]

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
        self.log("🚀 Starting E-Learning Platform API Tests")
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
        
        if not self.test_student_registration():
            self.log("❌ Student registration failed, stopping tests")
            return False
        
        # Test authenticated endpoints
        self.test_auth_me()
        self.test_users_crud()
        self.test_roles_crud()
        self.test_courses_crud()
        self.test_evaluations_crud()
        self.test_student_evaluation_flow()
        self.test_certificates()
        self.test_branding()
        self.test_reports()
        self.test_student_progress()
        
        # Print results
        self.log("=" * 50)
        self.log(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
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