"""
Backend API Tests for E-Learning Platform - Prerequisites System
Tests the curriculum and prerequisites functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://elearn-hub-16.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@elearning.com"
ADMIN_PASSWORD = "admin123"
STUDENT_EMAIL = "demo.alumno@test.com"
STUDENT_PASSWORD = "demo123"
ROLE_ID = "role_b9d0af933ed8"

# Course IDs
COURSE_INDUCCION = "course_700e34687aed"
COURSE_SEGURIDAD_BASICA = "course_7cba543d9e13"
COURSE_SEGURIDAD_AVANZADA = "course_e1ba9b6b0c83"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def student_token():
    """Get student authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": STUDENT_EMAIL,
        "password": STUDENT_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Student authentication failed")


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["is_admin"] == True
    
    def test_student_login_success(self):
        """Test student login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STUDENT_EMAIL,
            "password": STUDENT_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == STUDENT_EMAIL
        assert data["user"]["is_admin"] == False
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


class TestRoleCurriculum:
    """Role curriculum endpoint tests"""
    
    def test_get_role_curriculum_success(self):
        """Test getting role curriculum returns ordered courses with prerequisites"""
        response = requests.get(f"{BASE_URL}/api/roles/{ROLE_ID}/curriculum")
        assert response.status_code == 200
        
        data = response.json()
        assert "role" in data
        assert "curriculum" in data
        assert "total_hours" in data
        
        # Verify role data
        assert data["role"]["role_id"] == ROLE_ID
        assert data["role"]["name"] == "Operador"
        
        # Verify curriculum structure
        curriculum = data["curriculum"]
        assert len(curriculum) == 3
        
        # Verify course order
        assert curriculum[0]["order"] == 1
        assert curriculum[0]["name"] == "Inducción General"
        assert curriculum[0]["prerequisites"] == []
        
        assert curriculum[1]["order"] == 2
        assert curriculum[1]["name"] == "Seguridad Básica"
        assert COURSE_INDUCCION in curriculum[1]["prerequisites"]
        
        assert curriculum[2]["order"] == 3
        assert curriculum[2]["name"] == "Seguridad Avanzada"
        assert COURSE_INDUCCION in curriculum[2]["prerequisites"]
        assert COURSE_SEGURIDAD_BASICA in curriculum[2]["prerequisites"]
    
    def test_get_role_curriculum_prerequisite_names(self):
        """Test that curriculum includes prerequisite names"""
        response = requests.get(f"{BASE_URL}/api/roles/{ROLE_ID}/curriculum")
        assert response.status_code == 200
        
        data = response.json()
        curriculum = data["curriculum"]
        
        # First course has no prerequisites
        assert curriculum[0]["prerequisite_names"] == []
        
        # Second course requires first
        assert "Inducción General" in curriculum[1]["prerequisite_names"]
        
        # Third course requires both previous
        assert "Inducción General" in curriculum[2]["prerequisite_names"]
        assert "Seguridad Básica" in curriculum[2]["prerequisite_names"]
    
    def test_get_role_curriculum_total_hours(self):
        """Test that total hours is calculated correctly"""
        response = requests.get(f"{BASE_URL}/api/roles/{ROLE_ID}/curriculum")
        assert response.status_code == 200
        
        data = response.json()
        curriculum = data["curriculum"]
        
        # Calculate expected total
        expected_total = sum(c["hours"] for c in curriculum)
        assert data["total_hours"] == expected_total
    
    def test_get_role_curriculum_not_found(self):
        """Test getting curriculum for non-existent role"""
        response = requests.get(f"{BASE_URL}/api/roles/invalid_role_id/curriculum")
        assert response.status_code == 404


class TestStudentProgress:
    """Student progress endpoint tests"""
    
    def test_get_student_progress_success(self, student_token):
        """Test getting student progress returns courses with lock status"""
        response = requests.get(
            f"{BASE_URL}/api/student/progress",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "role_name" in data
        assert "courses" in data
        assert "completed_courses" in data
        assert "total_courses" in data
        assert "completion_percentage" in data
    
    def test_student_progress_course_order(self, student_token):
        """Test that courses are returned in correct order"""
        response = requests.get(
            f"{BASE_URL}/api/student/progress",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        courses = data["courses"]
        
        # Verify order
        for i, course in enumerate(courses):
            assert course["order"] == i + 1
    
    def test_student_progress_first_course_available(self, student_token):
        """Test that first course without prerequisites is available"""
        response = requests.get(
            f"{BASE_URL}/api/student/progress",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        courses = data["courses"]
        
        # First course should be available (not locked)
        first_course = courses[0]
        assert first_course["is_locked"] == False
        assert first_course["missing_prerequisites"] == []
    
    def test_student_progress_locked_courses_show_missing_prerequisites(self, student_token):
        """Test that locked courses show which prerequisites are missing"""
        response = requests.get(
            f"{BASE_URL}/api/student/progress",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        courses = data["courses"]
        
        # Second course should be locked with missing prerequisites
        second_course = courses[1]
        assert second_course["is_locked"] == True
        assert len(second_course["missing_prerequisites"]) > 0
        
        # Verify missing prerequisite structure
        missing = second_course["missing_prerequisites"]
        assert all("course_id" in m for m in missing)
        assert all("name" in m for m in missing)
    
    def test_student_progress_requires_auth(self):
        """Test that student progress requires authentication"""
        response = requests.get(f"{BASE_URL}/api/student/progress")
        assert response.status_code == 401


class TestCoursePrerequisites:
    """Course prerequisites management tests"""
    
    def test_get_course_with_prerequisites(self, admin_token):
        """Test getting course includes prerequisites field"""
        response = requests.get(
            f"{BASE_URL}/api/courses/{COURSE_SEGURIDAD_BASICA}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "prerequisites" in data
        assert isinstance(data["prerequisites"], list)
    
    def test_update_course_prerequisites(self, admin_token):
        """Test updating course prerequisites"""
        # Get current prerequisites
        response = requests.get(
            f"{BASE_URL}/api/courses/{COURSE_SEGURIDAD_BASICA}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        original_prereqs = response.json().get("prerequisites", [])
        
        # Update prerequisites (add if not present, or verify current)
        new_prereqs = [COURSE_INDUCCION]
        response = requests.put(
            f"{BASE_URL}/api/courses/{COURSE_SEGURIDAD_BASICA}",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"prerequisites": new_prereqs}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["prerequisites"] == new_prereqs


class TestRolesEndpoints:
    """Role management endpoint tests"""
    
    def test_get_roles_list(self):
        """Test getting list of roles"""
        response = requests.get(f"{BASE_URL}/api/roles")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Find our test role
        test_role = next((r for r in data if r["role_id"] == ROLE_ID), None)
        assert test_role is not None
        assert "course_ids" in test_role
        assert "course_order" in test_role
    
    def test_get_role_by_id(self):
        """Test getting single role by ID"""
        response = requests.get(f"{BASE_URL}/api/roles/{ROLE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["role_id"] == ROLE_ID
        assert "name" in data
        assert "course_ids" in data
        assert "course_order" in data
    
    def test_role_has_course_order(self):
        """Test that role includes course_order field"""
        response = requests.get(f"{BASE_URL}/api/roles/{ROLE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "course_order" in data
        assert isinstance(data["course_order"], list)
        assert len(data["course_order"]) > 0


class TestCoursesEndpoints:
    """Course management endpoint tests"""
    
    def test_get_courses_list(self, admin_token):
        """Test getting list of courses"""
        response = requests.get(
            f"{BASE_URL}/api/courses",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_course_has_prerequisites_field(self, admin_token):
        """Test that courses include prerequisites field"""
        response = requests.get(
            f"{BASE_URL}/api/courses",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        for course in data:
            assert "prerequisites" in course


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
