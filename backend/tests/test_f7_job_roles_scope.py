"""
F7 backend tests: Job Roles CRUD + users.role_id + mandante standard item scope.
"""
import os
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://user-credentials-6.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@aptivademo.com"
ADMIN_PASSWORD = "admin123"
WORKER_EMAIL = "trabajador@aptivademo.com"
WORKER_PASSWORD = "trabajador123"


@pytest.fixture(scope="module")
def admin_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    return s


@pytest.fixture(scope="module")
def worker_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE}/api/auth/login", json={"email": WORKER_EMAIL, "password": WORKER_PASSWORD})
    if r.status_code != 200:
        pytest.skip("Worker login failed")
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    return s


# ===== Job Roles =====

class TestJobRoles:
    created_id = None

    def test_list_job_roles_admin(self, admin_client):
        r = admin_client.get(f"{BASE}/api/job-roles")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_job_role(self, admin_client):
        payload = {"name": "TEST_Supervisor_F7", "description": "Cargo de prueba"}
        r = admin_client.post(f"{BASE}/api/job-roles", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == payload["name"]
        assert data["description"] == payload["description"]
        assert "role_id" in data and data["role_id"].startswith("jr_")
        TestJobRoles.created_id = data["role_id"]

    def test_create_duplicate_name_fails(self, admin_client):
        r = admin_client.post(f"{BASE}/api/job-roles", json={"name": "TEST_Supervisor_F7"})
        assert r.status_code == 400

    def test_list_contains_created(self, admin_client):
        r = admin_client.get(f"{BASE}/api/job-roles")
        assert r.status_code == 200
        ids = [x["role_id"] for x in r.json()]
        assert TestJobRoles.created_id in ids

    def test_update_job_role(self, admin_client):
        rid = TestJobRoles.created_id
        r = admin_client.put(f"{BASE}/api/job-roles/{rid}", json={"description": "Actualizada"})
        assert r.status_code == 200, r.text
        assert r.json()["description"] == "Actualizada"

    def test_assign_role_to_user_via_users_endpoint(self, admin_client):
        # Find the worker
        users = admin_client.get(f"{BASE}/api/users").json()
        worker = next((u for u in users if u["email"] == WORKER_EMAIL), None)
        assert worker is not None
        uid = worker["user_id"]
        rid = TestJobRoles.created_id

        # PUT role_id
        r = admin_client.put(f"{BASE}/api/users/{uid}", json={"role_id": rid})
        assert r.status_code == 200, r.text
        assert r.json().get("role_id") == rid

        # GET users list and verify
        users2 = admin_client.get(f"{BASE}/api/users").json()
        worker2 = next((u for u in users2 if u["user_id"] == uid), None)
        assert worker2 is not None
        assert worker2.get("role_id") == rid

    def test_worker_can_list_job_roles(self, worker_client):
        # Non-admin can list (GET uses get_current_user)
        r = worker_client.get(f"{BASE}/api/job-roles")
        assert r.status_code == 200

    def test_worker_cannot_create_job_role(self, worker_client):
        r = worker_client.post(f"{BASE}/api/job-roles", json={"name": "TEST_FromWorker"})
        assert r.status_code == 403

    def test_delete_job_role_nulls_user_role(self, admin_client):
        rid = TestJobRoles.created_id
        r = admin_client.delete(f"{BASE}/api/job-roles/{rid}")
        assert r.status_code == 200, r.text

        # Verify trabajador role_id is now null
        users = admin_client.get(f"{BASE}/api/users").json()
        worker = next((u for u in users if u["email"] == WORKER_EMAIL), None)
        assert worker is not None
        assert worker.get("role_id") in (None, "")

    def test_delete_nonexistent(self, admin_client):
        r = admin_client.delete(f"{BASE}/api/job-roles/jr_does_not_exist_xx")
        assert r.status_code == 404


# ===== Standard Items with scope =====

class TestStandardItemScope:
    mandante_id = None
    category_id = None
    item_id = None
    role_id = None
    cleanup_mandante_we_created = False

    def test_setup_mandante_and_category(self, admin_client):
        # Reuse first mandante if exists, else create one
        r = admin_client.get(f"{BASE}/api/mandantes")
        assert r.status_code == 200, r.text
        mandantes = r.json()
        if mandantes:
            TestStandardItemScope.mandante_id = mandantes[0]["mandante_id"]
        else:
            r = admin_client.post(f"{BASE}/api/mandantes", json={"name": "TEST_Mandante_F7"})
            assert r.status_code == 200, r.text
            TestStandardItemScope.mandante_id = r.json()["mandante_id"]
            TestStandardItemScope.cleanup_mandante_we_created = True

        # Get or create category
        std = admin_client.get(f"{BASE}/api/mandantes/{TestStandardItemScope.mandante_id}/standard").json()
        cats = std.get("categories", [])
        if cats:
            TestStandardItemScope.category_id = cats[0]["category_id"]
        else:
            r = admin_client.post(
                f"{BASE}/api/mandantes/{TestStandardItemScope.mandante_id}/standard/categories",
                json={"name": "TEST_Cat_F7", "order_index": 0},
            )
            assert r.status_code == 200, r.text
            TestStandardItemScope.category_id = r.json()["category_id"]

        # Create a job role to attach as scope
        r = admin_client.post(f"{BASE}/api/job-roles", json={"name": "TEST_RoleScope_F7"})
        assert r.status_code == 200
        TestStandardItemScope.role_id = r.json()["role_id"]

    def test_create_item_with_scope(self, admin_client):
        # Find an area + activity
        areas = admin_client.get(f"{BASE}/api/areas").json()
        acts = admin_client.get(f"{BASE}/api/activities").json()
        area_id = areas[0]["area_id"] if areas else None
        act_id = acts[0]["activity_id"] if acts else None

        payload = {
            "category_id": TestStandardItemScope.category_id,
            "name": "TEST_Item_Scope_F7",
            "description": "ítem con scope",
            "is_required": True,
            "order_index": 0,
            "area_id": area_id,
            "role_id": TestStandardItemScope.role_id,
            "activity_id": act_id,
        }
        r = admin_client.post(
            f"{BASE}/api/mandantes/{TestStandardItemScope.mandante_id}/standard/items",
            json=payload,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == "TEST_Item_Scope_F7"
        assert data.get("area_id") == area_id
        assert data.get("role_id") == TestStandardItemScope.role_id
        assert data.get("activity_id") == act_id
        TestStandardItemScope.item_id = data["item_id"]

    def test_item_persisted_in_get(self, admin_client):
        std = admin_client.get(
            f"{BASE}/api/mandantes/{TestStandardItemScope.mandante_id}/standard"
        ).json()
        items = std.get("items", [])
        item = next((i for i in items if i["item_id"] == TestStandardItemScope.item_id), None)
        assert item is not None
        assert item.get("role_id") == TestStandardItemScope.role_id
        assert item.get("area_id") is not None
        assert item.get("activity_id") is not None

    def test_clear_scope_with_empty_string(self, admin_client):
        # PUT with empty strings should null the scope columns
        r = admin_client.put(
            f"{BASE}/api/mandantes/{TestStandardItemScope.mandante_id}/standard/items/{TestStandardItemScope.item_id}",
            json={"area_id": "", "role_id": "", "activity_id": ""},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("area_id") in (None, "")
        assert data.get("role_id") in (None, "")
        assert data.get("activity_id") in (None, "")

    def test_cleanup(self, admin_client):
        # Delete item
        if TestStandardItemScope.item_id:
            admin_client.delete(
                f"{BASE}/api/mandantes/{TestStandardItemScope.mandante_id}/standard/items/{TestStandardItemScope.item_id}"
            )
        # Delete role
        if TestStandardItemScope.role_id:
            admin_client.delete(f"{BASE}/api/job-roles/{TestStandardItemScope.role_id}")
        # Do NOT delete mandante / category — they may be shared with the UI state
