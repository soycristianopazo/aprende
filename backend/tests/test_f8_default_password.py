"""F8 — Default password from RUT + admin reset-password.

Covers:
- helper default_password_from_rut (pure function)
- POST /api/users with/without password, with short RUT
- POST /api/users/{id}/reset-password (default, manual, 404, 403)
- POST /api/users/bulk-import CSV: password derived from RUT; empty pwd+short rut -> errors
- Login with derived passwords
"""

import io
import os
import sys
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[-1].strip().split("\n")[0]
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@aptivademo.com"
ADMIN_PWD = "admin123"
WORKER_EMAIL = "jsoto@rioloaspa.cl"
WORKER_PWD = "17234"

sys.path.insert(0, "/app/backend")


# ---------- helper unit tests ----------

def test_default_password_from_rut_helper():
    from server import default_password_from_rut
    assert default_password_from_rut("17.234.567-8") == "17234"
    assert default_password_from_rut("8.234.567-9") == "82345"
    assert default_password_from_rut("12-3") is None
    assert default_password_from_rut("") is None
    assert default_password_from_rut(None) is None
    # extra: only 4 digits is still None, exactly 5 is ok
    assert default_password_from_rut("1234") is None
    assert default_password_from_rut("12345") == "12345"


# ---------- fixtures ----------

@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PWD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture
def cleanup_users(admin_headers):
    created = []
    yield created
    for uid in created:
        try:
            requests.delete(f"{API}/users/{uid}", headers=admin_headers, timeout=10)
        except Exception:
            pass


def _unique(prefix="TEST"):
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _login(email, password):
    return requests.post(f"{API}/auth/login", json={"email": email, "password": password})


# ---------- POST /api/users ----------

def test_create_user_without_password_uses_rut(admin_headers, cleanup_users):
    suffix = _unique()
    rut = "20.111.222-3"  # digits => "20111"
    payload = {
        "full_name": f"TEST {suffix}",
        "email": f"{suffix.lower()}@test.cl",
        "rut": rut,
    }
    r = requests.post(f"{API}/users", json=payload, headers=admin_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["initial_password"] == "20111"
    assert data["email"] == payload["email"]
    assert data["rut"] == rut
    cleanup_users.append(data["user_id"])

    # login with derived password
    login = _login(payload["email"], "20111")
    assert login.status_code == 200, login.text
    assert login.json()["user"]["email"] == payload["email"]


def test_create_user_explicit_password_overrides_rut(admin_headers, cleanup_users):
    suffix = _unique()
    payload = {
        "full_name": f"TEST {suffix}",
        "email": f"{suffix.lower()}@test.cl",
        "rut": "21.222.333-4",  # would derive to 21222
        "password": "manual987",
    }
    r = requests.post(f"{API}/users", json=payload, headers=admin_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["initial_password"] == "manual987"
    cleanup_users.append(data["user_id"])

    # login with manual works
    ok = _login(payload["email"], "manual987")
    assert ok.status_code == 200
    # derived must NOT work
    bad = _login(payload["email"], "21222")
    assert bad.status_code == 401


def test_create_user_short_rut_no_password_returns_400(admin_headers):
    suffix = _unique()
    payload = {
        "full_name": f"TEST {suffix}",
        "email": f"{suffix.lower()}@test.cl",
        "rut": "12-3",
    }
    r = requests.post(f"{API}/users", json=payload, headers=admin_headers)
    assert r.status_code == 400, r.text
    detail = r.json().get("detail", "")
    assert "contraseña" in detail.lower() or "rut" in detail.lower()


def test_create_user_no_rut_no_password_returns_400(admin_headers):
    suffix = _unique()
    payload = {
        "full_name": f"TEST {suffix}",
        "email": f"{suffix.lower()}@test.cl",
    }
    r = requests.post(f"{API}/users", json=payload, headers=admin_headers)
    assert r.status_code == 400, r.text


# ---------- POST /api/users/{id}/reset-password ----------

def test_reset_password_defaults_to_rut(admin_headers, cleanup_users):
    suffix = _unique()
    rut = "22.333.444-5"  # -> 22333
    create = requests.post(f"{API}/users", json={
        "full_name": f"TEST {suffix}",
        "email": f"{suffix.lower()}@test.cl",
        "rut": rut,
        "password": "initialPwd1",  # explicit
    }, headers=admin_headers)
    assert create.status_code == 200, create.text
    uid = create.json()["user_id"]
    cleanup_users.append(uid)

    # reset with empty body
    r = requests.post(f"{API}/users/{uid}/reset-password", json={}, headers=admin_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["reset"] is True
    assert body["new_password"] == "22333"

    # login works with new pwd
    ok = _login(f"{suffix.lower()}@test.cl", "22333")
    assert ok.status_code == 200
    # old pwd fails
    bad = _login(f"{suffix.lower()}@test.cl", "initialPwd1")
    assert bad.status_code == 401


def test_reset_password_no_body(admin_headers, cleanup_users):
    suffix = _unique()
    create = requests.post(f"{API}/users", json={
        "full_name": f"TEST {suffix}",
        "email": f"{suffix.lower()}@test.cl",
        "rut": "23.444.555-6",
        "password": "initialPwd2",
    }, headers=admin_headers)
    assert create.status_code == 200
    uid = create.json()["user_id"]
    cleanup_users.append(uid)

    # call without JSON body
    r = requests.post(f"{API}/users/{uid}/reset-password", headers=admin_headers)
    assert r.status_code == 200, r.text
    assert r.json()["new_password"] == "23444"


def test_reset_password_with_manual(admin_headers, cleanup_users):
    suffix = _unique()
    create = requests.post(f"{API}/users", json={
        "full_name": f"TEST {suffix}",
        "email": f"{suffix.lower()}@test.cl",
        "rut": "24.555.666-7",
        "password": "initialPwd3",
    }, headers=admin_headers)
    assert create.status_code == 200
    uid = create.json()["user_id"]
    cleanup_users.append(uid)

    r = requests.post(f"{API}/users/{uid}/reset-password",
                      json={"new_password": "manual123"}, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["new_password"] == "manual123"

    ok = _login(f"{suffix.lower()}@test.cl", "manual123")
    assert ok.status_code == 200


def test_reset_password_404_for_unknown_user(admin_headers):
    r = requests.post(f"{API}/users/user_doesnotexist/reset-password", json={}, headers=admin_headers)
    assert r.status_code == 404


def test_reset_password_403_for_worker():
    login = _login(WORKER_EMAIL, WORKER_PWD)
    assert login.status_code == 200, login.text
    worker_token = login.json()["token"]
    headers = {"Authorization": f"Bearer {worker_token}", "Content-Type": "application/json"}
    # Use admin's own id as the target (the worker is not admin so call must 403)
    r = requests.post(f"{API}/users/anyid/reset-password", json={}, headers=headers)
    assert r.status_code == 403, r.text


# ---------- bulk-import ----------

def test_bulk_import_derives_password_from_rut(admin_headers, cleanup_users):
    s1 = _unique("BULK1")
    s2 = _unique("BULK2")
    s3 = _unique("BULK3")  # short rut + empty pwd -> errors
    csv_content = (
        "email,password,full_name,rut,area_names,activity_names\n"
        f"{s1.lower()}@test.cl,,TEST {s1},25.666.777-8,,\n"
        f"{s2.lower()}@test.cl,explicitPwd,TEST {s2},26.777.888-9,,\n"
        f"{s3.lower()}@test.cl,,TEST {s3},12-3,,\n"
    )
    files = {"file": ("import.csv", csv_content.encode("utf-8"), "text/csv")}
    # don't send JSON content-type for multipart
    h = {"Authorization": admin_headers["Authorization"]}
    r = requests.post(f"{API}/users/bulk-import", files=files, headers=h)
    assert r.status_code == 200, r.text
    body = r.json()
    created_emails = {c["email"] for c in body["created"]}
    error_rows = body["errors"]
    assert f"{s1.lower()}@test.cl" in created_emails
    assert f"{s2.lower()}@test.cl" in created_emails
    assert any(f"{s3.lower()}@test.cl" in str(e) or e.get("row") == 4 for e in error_rows), f"errors={error_rows}"

    # collect created uids for cleanup
    for c in body["created"]:
        cleanup_users.append(c["user_id"])

    # Verify login: s1 -> derived "25666"; s2 -> explicitPwd
    ok1 = _login(f"{s1.lower()}@test.cl", "25666")
    assert ok1.status_code == 200, ok1.text
    ok2 = _login(f"{s2.lower()}@test.cl", "explicitPwd")
    assert ok2.status_code == 200, ok2.text


# ---------- regression: seeded worker can login ----------

def test_seeded_worker_login_with_rut_pwd():
    r = _login(WORKER_EMAIL, WORKER_PWD)
    assert r.status_code == 200, r.text
    assert r.json()["user"]["email"] == WORKER_EMAIL
