"""Tests for GET /api/notifications - expiration alerts (feature under test)."""
import os
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://user-credentials-6.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def token_fcab():
    return _login("copazo@fcab.cl", "fcab123")


@pytest.fixture(scope="module")
def token_rioloa():
    return _login("admin@aptivademo.com", "admin123")


@pytest.fixture(scope="module")
def token_worker():
    # Password is first 5 digits of RUT for FCAB workers per test_credentials.md
    r = requests.post(f"{API}/auth/login",
                      json={"email": "criquelme@fcab.cl", "password": "14234"}, timeout=30)
    if r.status_code == 200:
        return r.json()["token"]
    # Fallback: try rio loa worker
    r = requests.post(f"{API}/auth/login",
                      json={"email": "jsoto@rioloaspa.cl", "password": "17234"}, timeout=30)
    assert r.status_code == 200, f"worker login failed: {r.status_code} {r.text}"
    return r.json()["token"]


# ---------- Auth ----------
class TestNotificationsAuth:
    def test_no_token_rejected(self):
        r = requests.get(f"{API}/notifications", timeout=30)
        assert r.status_code in (401, 403), f"expected 401/403 got {r.status_code}"

    def test_worker_forbidden(self, token_worker):
        r = requests.get(f"{API}/notifications",
                         headers={"Authorization": f"Bearer {token_worker}"}, timeout=30)
        assert r.status_code == 403, f"expected 403 got {r.status_code}"


# ---------- FCAB baseline ----------
class TestNotificationsFcab:
    def test_returns_summary_and_list(self, token_fcab):
        r = requests.get(f"{API}/notifications?horizon_days=90",
                         headers={"Authorization": f"Bearer {token_fcab}"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "summary" in data and "notifications" in data
        s = data["summary"]
        for key in ("total", "expired", "critical", "warning", "info", "workers_affected", "horizon_days", "generated_at"):
            assert key in s, f"missing {key} in summary"
        assert s["horizon_days"] == 90

    def test_fcab_seed_all_expired(self, token_fcab):
        r = requests.get(f"{API}/notifications",
                         headers={"Authorization": f"Bearer {token_fcab}"}, timeout=30)
        data = r.json()
        s = data["summary"]
        # Per task: FCAB seeded 6 expired competencies
        assert s["total"] >= 6, f"expected >=6 alerts, got {s['total']}"
        assert s["expired"] >= 6, f"expected >=6 expired, got {s['expired']}"
        for n in data["notifications"]:
            for field in ("id", "kind", "kind_label", "user_id", "user_name",
                          "user_rut", "item_id", "item_name", "expiry_date",
                          "days_remaining", "severity"):
                assert field in n, f"missing field {field} in notification"
            assert n["severity"] in ("expired", "critical", "warning", "info")
            assert n["kind"] in ("competency", "document")
            # id prefix contract
            assert n["id"].startswith("wc:") or n["id"].startswith("wd:")

    def test_severity_calculation_consistent(self, token_fcab):
        r = requests.get(f"{API}/notifications",
                         headers={"Authorization": f"Bearer {token_fcab}"}, timeout=30)
        for n in r.json()["notifications"]:
            d = n["days_remaining"]
            expected = ("expired" if d < 0 else
                        "critical" if d <= 30 else
                        "warning" if d <= 90 else "info")
            assert n["severity"] == expected, \
                f"severity mismatch for days={d}: got {n['severity']} expected {expected}"


# ---------- Multi-tenant isolation ----------
class TestNotificationsMultiTenant:
    def test_rioloa_and_fcab_isolated(self, token_fcab, token_rioloa):
        rf = requests.get(f"{API}/notifications",
                          headers={"Authorization": f"Bearer {token_fcab}"}, timeout=30).json()
        rr = requests.get(f"{API}/notifications",
                          headers={"Authorization": f"Bearer {token_rioloa}"}, timeout=30).json()
        fcab_users = {n["user_id"] for n in rf["notifications"]}
        rio_users = {n["user_id"] for n in rr["notifications"]}
        # No user should appear in both tenants
        assert fcab_users.isdisjoint(rio_users), "Cross-tenant leak: shared user_ids"
        # No notification id should appear in both
        fcab_ids = {n["id"] for n in rf["notifications"]}
        rio_ids = {n["id"] for n in rr["notifications"]}
        assert fcab_ids.isdisjoint(rio_ids), "Cross-tenant leak: shared notification ids"


# ---------- include_ok ----------
class TestIncludeOk:
    def test_include_ok_adds_info_items(self, token_rioloa):
        base = requests.get(f"{API}/notifications?horizon_days=90",
                            headers={"Authorization": f"Bearer {token_rioloa}"}, timeout=30).json()
        withok = requests.get(f"{API}/notifications?horizon_days=90&include_ok=true",
                              headers={"Authorization": f"Bearer {token_rioloa}"}, timeout=30).json()
        # include_ok must be >= base (never fewer)
        assert withok["summary"]["total"] >= base["summary"]["total"]
        # Default should NOT have severity=info items
        assert all(n["severity"] != "info" for n in base["notifications"]), \
            "Default (include_ok=false) should exclude severity=info"


# ---------- worker_documents integration ----------
class TestWorkerDocumentsNotification:
    """Insert a worker_document with a file expiring in 20 days directly in Mongo, verify appears."""

    @pytest.fixture(scope="class")
    def inserted_doc(self, token_fcab):
        import asyncio
        import sys
        sys.path.insert(0, "/app/backend")
        from dotenv import load_dotenv
        load_dotenv("/app/backend/.env")
        from db_adapter import db  # uses configured Postgres/Mongo

        async def _setup():
            user = await db.users.find_one({"email": "criquelme@fcab.cl"})
            assert user, "FCAB seed worker missing"
            dt = await db.document_types.find_one({"company_id": user["company_id"]})
            if not dt:
                pytest.skip("No document_types in FCAB tenant to attach test doc")
            expiry = (datetime.now(timezone.utc) + timedelta(days=20)).isoformat()
            wd_id = "TEST_wd_notifications_20d"
            await db.worker_documents.delete_one({"worker_document_id": wd_id})
            await db.worker_documents.insert_one({
                "worker_document_id": wd_id,
                "company_id": user["company_id"],
                "user_id": user["user_id"],
                "document_type_id": dt["document_type_id"],
                "files": [{"file_url": "/uploads/test.pdf", "expiry_date": expiry}],
                "created_at": datetime.now(timezone.utc),
            })
            return wd_id

        loop = asyncio.new_event_loop()
        try:
            wd_id = loop.run_until_complete(_setup())
            yield wd_id
        finally:
            async def _teardown():
                await db.worker_documents.delete_one({"worker_document_id": wd_id})
            try:
                loop.run_until_complete(_teardown())
            except Exception:
                pass
            loop.close()

    def test_worker_document_appears_as_critical(self, inserted_doc, token_fcab):
        r = requests.get(f"{API}/notifications",
                         headers={"Authorization": f"Bearer {token_fcab}"}, timeout=30)
        assert r.status_code == 200
        notifs = r.json()["notifications"]
        target_id = f"wd:{inserted_doc}"
        match = [n for n in notifs if n["id"] == target_id]
        assert match, f"Inserted worker_document {target_id} not in notifications"
        n = match[0]
        assert n["kind"] == "document"
        assert n["kind_label"] == "Documento"
        # 20 days out -> critical (<=30)
        assert n["severity"] == "critical", f"expected critical for 20d, got {n['severity']}"
        assert 18 <= n["days_remaining"] <= 21, f"days_remaining {n['days_remaining']} not near 20"
