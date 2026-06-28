"""F5 Ruta Aptiva - competency-driven /api/student/progress filter tests.

Verifies:
- Response shape: required_competencies_total / acquired_competencies_total / missing_competencies
- Status='pending' for missing, 'expired' for past expiry_date
- Strict filter: courses granting only-acquired-active comps are removed (unless completed)
- Completed courses are kept (history)
- Legacy fallback: cannot easily verify w/o mutating seed (the demo worker has competency
  configured on activity), so we instead assert the seed expectations from the request.
"""
import os
import uuid
import requests
import pytest
from datetime import datetime, timezone, timedelta

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or "https://user-credentials-6.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@aptivademo.com"
ADMIN_PASS = "admin123"
WORKER_EMAIL = "trabajador@aptivademo.com"
WORKER_PASS = "trabajador123"

SEED_COMP_ID = "comp_22335c7e0cf4"   # Trabajo en Altura - Competencia base
SEED_ACT_ID = "activity_f69acf0e4fb9"  # Trabajo en Altura


def _login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()


def H(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def admin():
    return _login(ADMIN_EMAIL, ADMIN_PASS)


@pytest.fixture(scope="module")
def worker():
    return _login(WORKER_EMAIL, WORKER_PASS)


def test_login_three_roles(admin, worker):
    assert admin["user"]["email"] == ADMIN_EMAIL
    assert worker["user"]["email"] == WORKER_EMAIL


def test_progress_shape_and_seed_expectations(worker):
    """Initial seed state: required_competencies_total=1, acquired=0, 1 missing pending."""
    r = requests.get(f"{BASE_URL}/api/student/progress",
                     headers=H(worker["token"]), timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()

    # shape
    for k in ("courses", "total_courses", "completed_courses", "completion_percentage",
             "missing_competencies", "required_competencies_total",
             "acquired_competencies_total"):
        assert k in data, f"missing key: {k}"

    # seed expectations (per problem statement)
    assert data["required_competencies_total"] == 1
    assert data["acquired_competencies_total"] == 0
    assert len(data["missing_competencies"]) == 1
    mc = data["missing_competencies"][0]
    assert mc["competency_id"] == SEED_COMP_ID
    assert mc["status"] == "pending"

    # the 3 completed courses are kept for history
    completed_in_resp = [c for c in data["courses"] if c["is_completed"]]
    assert len(completed_in_resp) >= 1, "expected at least 1 completed course (history)"


def _create_course(admin_token, *, grants):
    """Create a published course tagged to the seed activity that grants `grants`."""
    name = f"TEST_F5_Course_{uuid.uuid4().hex[:6]}"
    r = requests.post(f"{BASE_URL}/api/courses", headers=H(admin_token), json={
        "name": name,
        "description": "F5 test course",
        "hours": 1,
        "validity_hours": 0,
        "training_type": "induccion",
        "video_url": "",
        "status": "published",
        "prerequisites": [],
        "area_ids": [],
        "activity_ids": [SEED_ACT_ID],
        "grants_competency_ids": grants,
    }, timeout=20)
    assert r.status_code == 200, f"create course failed: {r.status_code} {r.text}"
    return r.json()


def _delete_course(admin_token, course_id):
    requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=H(admin_token), timeout=20)


def _upload_wc(admin_token, user_id, comp_id, expiry_iso):
    r = requests.post(
        f"{BASE_URL}/api/worker-competencies/{user_id}/upload",
        headers=H(admin_token),
        data={"competency_id": comp_id, "expiry_date": expiry_iso, "notes": "F5 test"},
        timeout=30,
    )
    assert r.status_code == 200, f"upload wc failed: {r.status_code} {r.text}"
    return r.json()


def _delete_wc(admin_token, worker_competency_id):
    requests.delete(f"{BASE_URL}/api/worker-competencies/{worker_competency_id}",
                    headers=H(admin_token), timeout=20)


def test_strict_filter_hides_course_when_competency_acquired(admin, worker):
    """End-to-end:
       1. Create new published course grants=[SEED_COMP_ID] → appears in worker route (missing)
       2. Grant competency to worker w/ future expiry → course disappears & missing=0
       3. Cleanup
    """
    admin_t = admin["token"]
    worker_t = worker["token"]
    worker_id = worker["user"]["user_id"]

    course = _create_course(admin_t, grants=[SEED_COMP_ID])
    course_id = course["course_id"]
    wc_id = None
    try:
        # Step 1: course should appear (worker is missing the competency)
        r = requests.get(f"{BASE_URL}/api/student/progress", headers=H(worker_t), timeout=20)
        assert r.status_code == 200
        data = r.json()
        course_ids = [c["course"]["course_id"] for c in data["courses"]]
        assert course_id in course_ids, (
            "Newly-created course granting the missing competency must appear in route. "
            f"got: {course_ids}"
        )
        assert data["missing_competencies"] and \
               data["missing_competencies"][0]["status"] == "pending"

        # Step 2: grant the competency with FUTURE expiry → acquired_active
        future = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
        wc = _upload_wc(admin_t, worker_id, SEED_COMP_ID, future)
        wc_id = wc["worker_competency_id"]

        r = requests.get(f"{BASE_URL}/api/student/progress", headers=H(worker_t), timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["acquired_competencies_total"] == 1
        assert data["missing_competencies"] == [], \
            f"missing_competencies must be empty after acquiring, got: {data['missing_competencies']}"

        course_ids = [c["course"]["course_id"] for c in data["courses"]]
        assert course_id not in course_ids, (
            "Newly-created (not completed) course granting the now-acquired competency "
            f"must be HIDDEN. still present: {course_ids}"
        )
    finally:
        if wc_id:
            _delete_wc(admin_t, wc_id)
        _delete_course(admin_t, course_id)


def test_expired_competency_marks_status_expired_and_reincludes_course(admin, worker):
    """If expiry_date is in the past → status='expired' in missing_competencies,
    and courses granting it re-appear in the route."""
    admin_t = admin["token"]
    worker_t = worker["token"]
    worker_id = worker["user"]["user_id"]

    course = _create_course(admin_t, grants=[SEED_COMP_ID])
    course_id = course["course_id"]
    wc_id = None
    try:
        past = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        wc = _upload_wc(admin_t, worker_id, SEED_COMP_ID, past)
        wc_id = wc["worker_competency_id"]

        r = requests.get(f"{BASE_URL}/api/student/progress", headers=H(worker_t), timeout=20)
        assert r.status_code == 200
        data = r.json()

        # acquired_active should be 0 (the wc is expired)
        assert data["acquired_competencies_total"] == 0
        # missing should contain the seed comp with status='expired'
        statuses = {m["competency_id"]: m["status"] for m in data["missing_competencies"]}
        assert statuses.get(SEED_COMP_ID) == "expired", \
            f"expected status='expired' for {SEED_COMP_ID}, got: {statuses}"

        # course granting the expired comp re-appears
        course_ids = [c["course"]["course_id"] for c in data["courses"]]
        assert course_id in course_ids, \
            "Course granting an EXPIRED competency must re-appear in the route."
    finally:
        if wc_id:
            _delete_wc(admin_t, wc_id)
        _delete_course(admin_t, course_id)


def test_general_courses_without_grants_are_always_kept(admin, worker):
    """A course with empty grants_competency_ids must always appear (general course)."""
    admin_t = admin["token"]
    worker_t = worker["token"]

    course = _create_course(admin_t, grants=[])
    course_id = course["course_id"]
    try:
        r = requests.get(f"{BASE_URL}/api/student/progress", headers=H(worker_t), timeout=20)
        assert r.status_code == 200
        data = r.json()
        course_ids = [c["course"]["course_id"] for c in data["courses"]]
        assert course_id in course_ids, \
            "A general course (empty grants_competency_ids) must always be included."
    finally:
        _delete_course(admin_t, course_id)


def test_course_for_other_competency_only_is_filtered_out(admin, worker):
    """Create a TEST competency NOT linked to worker activities,
    then create a course granting only that competency.
    Course must NOT appear (not completed, grants only non-required comp)."""
    admin_t = admin["token"]
    worker_t = worker["token"]

    # Create a TEST competency (not linked to any activity)
    r = requests.post(f"{BASE_URL}/api/competencies", headers=H(admin_t), json={
        "name": f"TEST_F5_OtherComp_{uuid.uuid4().hex[:6]}",
        "description": "unrelated",
        "validity_months": 12,
    }, timeout=20)
    assert r.status_code == 200, r.text
    other_comp_id = r.json()["competency_id"]

    course = _create_course(admin_t, grants=[other_comp_id])
    course_id = course["course_id"]
    try:
        r = requests.get(f"{BASE_URL}/api/student/progress", headers=H(worker_t), timeout=20)
        assert r.status_code == 200
        data = r.json()
        course_ids = [c["course"]["course_id"] for c in data["courses"]]
        assert course_id not in course_ids, (
            "Course that grants only a non-required competency must NOT appear in the route. "
            f"got: {course_ids}"
        )
    finally:
        _delete_course(admin_t, course_id)
        requests.delete(f"{BASE_URL}/api/competencies/{other_comp_id}",
                        headers=H(admin_t), timeout=20)
