"""F6 — Compliance Heatmap (Mapa de Calor de Cumplimiento) — backend tests.

Covers:
- GET /api/compliance/heatmap (admin only) — shape, summary, cells
- Vigent vs expired classification (worker_competency expiry in future / past / null)
- GET /api/compliance/heatmap/export — CSV (UTF-8 BOM, ';' separator, filename, attachment)
- Auth: worker & unauthenticated rejected (401/403)
"""
import os
import re
import requests
import pytest
from datetime import datetime, timezone, timedelta

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or "https://user-credentials-6.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@aptivademo.com"
ADMIN_PASS = "admin123"
WORKER_EMAIL = "trabajador@aptivademo.com"
WORKER_PASS = "trabajador123"

SEED_COMP_ID = "comp_22335c7e0cf4"      # Trabajo en Altura - Competencia base
SEED_ACT_ID = "activity_f69acf0e4fb9"    # Trabajo en Altura


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


@pytest.fixture(scope="module")
def worker_user_id(worker):
    return worker["user"]["user_id"]


# ============================================================
# Auth / RBAC
# ============================================================

def test_login_admin_and_worker(admin, worker):
    assert admin["user"]["email"] == ADMIN_EMAIL
    assert worker["user"]["email"] == WORKER_EMAIL
    assert admin["user"].get("is_admin") is True


def test_heatmap_rejects_worker(worker):
    r = requests.get(f"{BASE_URL}/api/compliance/heatmap",
                     headers=H(worker["token"]), timeout=20)
    assert r.status_code in (401, 403), f"worker should be denied, got {r.status_code} {r.text}"


def test_export_rejects_worker(worker):
    r = requests.get(f"{BASE_URL}/api/compliance/heatmap/export",
                     headers=H(worker["token"]), timeout=20)
    assert r.status_code in (401, 403), f"worker should be denied, got {r.status_code} {r.text}"


def test_heatmap_rejects_anonymous():
    r = requests.get(f"{BASE_URL}/api/compliance/heatmap", timeout=20)
    assert r.status_code in (401, 403)


# ============================================================
# GET /api/compliance/heatmap — shape + seed expectations
# ============================================================

def test_heatmap_shape_and_seed(admin):
    """Initial seed: 1 activity with 1 competency linked, 2 workers, 0 acquired => 0% / 1 critical."""
    r = requests.get(f"{BASE_URL}/api/compliance/heatmap",
                     headers=H(admin["token"]), timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()

    # Top-level shape
    for key in ("activities", "competencies", "cells", "summary", "generated_at"):
        assert key in d, f"missing key {key}"

    # Activities returned only contain those with at least one competency_id
    assert any(a["activity_id"] == SEED_ACT_ID for a in d["activities"]), "Trabajo en Altura must be in activities"
    # Competencies present
    assert any(c["competency_id"] == SEED_COMP_ID for c in d["competencies"])

    # Cells: should include (Trabajo en Altura × Comp base)
    cell = next((c for c in d["cells"]
                 if c["activity_id"] == SEED_ACT_ID and c["competency_id"] == SEED_COMP_ID), None)
    assert cell is not None, f"seed cell missing in cells: {d['cells']}"
    for k in ("total_workers", "acquired", "expired", "pending",
              "percentage", "validity_months", "activity_name", "competency_name"):
        assert k in cell, f"cell missing key {k}"
    assert cell["total_workers"] >= 2
    assert cell["percentage"] == 0
    assert cell["acquired"] == 0
    assert cell["pending"] == cell["total_workers"]
    assert cell["validity_months"] == 24

    # Summary
    s = d["summary"]
    assert s["total_cells"] >= 1
    assert s["critical_count"] >= 1
    assert s["green_count"] == 0
    assert s["total_workers"] >= 2
    assert s["average_compliance"] == 0


# ============================================================
# Vigent vs expired classification
# ============================================================

def _upload_wc(admin_token, user_id, competency_id, expiry_iso=None):
    """POST as multipart/form-data (Form fields)."""
    data = {"competency_id": competency_id}
    if expiry_iso is not None:
        data["expiry_date"] = expiry_iso
    r = requests.post(
        f"{BASE_URL}/api/worker-competencies/{user_id}/upload",
        headers=H(admin_token),
        data=data,
        timeout=30,
    )
    assert r.status_code == 200, f"upload failed: {r.status_code} {r.text}"
    return r.json()


def _delete_wc(admin_token, wc_id):
    r = requests.delete(
        f"{BASE_URL}/api/worker-competencies/{wc_id}",
        headers=H(admin_token), timeout=20,
    )
    assert r.status_code in (200, 204, 404), r.text


def _find_seed_cell(d):
    return next((c for c in d["cells"]
                 if c["activity_id"] == SEED_ACT_ID and c["competency_id"] == SEED_COMP_ID), None)


def test_acquired_when_expiry_future(admin, worker_user_id):
    """Worker with expiry in the future -> 'acquired'."""
    future = (datetime.now(timezone.utc) + timedelta(days=180)).isoformat()
    wc = _upload_wc(admin["token"], worker_user_id, SEED_COMP_ID, future)
    wc_id = wc["worker_competency_id"]
    try:
        r = requests.get(f"{BASE_URL}/api/compliance/heatmap",
                         headers=H(admin["token"]), timeout=20)
        assert r.status_code == 200
        cell = _find_seed_cell(r.json())
        assert cell["acquired"] >= 1, f"expected >=1 acquired, got {cell}"
        assert cell["expired"] == 0
        # 1 acquired out of total (>=2) should be >=33 and <100
        expected_pct = int(round((cell["acquired"] / cell["total_workers"]) * 100))
        assert cell["percentage"] == expected_pct
    finally:
        _delete_wc(admin["token"], wc_id)


def test_expired_when_expiry_past(admin, worker_user_id):
    """Worker with expiry in the past -> 'expired'."""
    past = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    wc = _upload_wc(admin["token"], worker_user_id, SEED_COMP_ID, past)
    wc_id = wc["worker_competency_id"]
    try:
        r = requests.get(f"{BASE_URL}/api/compliance/heatmap",
                         headers=H(admin["token"]), timeout=20)
        cell = _find_seed_cell(r.json())
        assert cell["expired"] >= 1, f"expected >=1 expired, got {cell}"
        assert cell["acquired"] == 0
        assert cell["percentage"] == 0
    finally:
        _delete_wc(admin["token"], wc_id)


def test_acquired_when_no_expiry(admin, worker_user_id):
    """Worker with no expiry_date -> 'acquired' (lifetime).
    NOTE: upload endpoint auto-fills expiry from validity_months when none provided.
    Seed competency has validity_months=24 → resulting record has a FUTURE expiry,
    which still counts as 'acquired'. This is the same code path the spec describes.
    """
    wc = _upload_wc(admin["token"], worker_user_id, SEED_COMP_ID, None)
    wc_id = wc["worker_competency_id"]
    try:
        r = requests.get(f"{BASE_URL}/api/compliance/heatmap",
                         headers=H(admin["token"]), timeout=20)
        cell = _find_seed_cell(r.json())
        assert cell["acquired"] >= 1
        assert cell["expired"] == 0
    finally:
        _delete_wc(admin["token"], wc_id)


# ============================================================
# CSV export
# ============================================================

def test_csv_export_headers_and_content(admin):
    r = requests.get(f"{BASE_URL}/api/compliance/heatmap/export",
                     headers=H(admin["token"]), timeout=30)
    assert r.status_code == 200, r.text

    # Content-Type contains text/csv
    ct = r.headers.get("content-type", "")
    assert "text/csv" in ct.lower(), f"unexpected content-type: {ct}"

    # Content-Disposition attachment + filename pattern
    cd = r.headers.get("content-disposition", "")
    assert "attachment" in cd.lower(), f"missing attachment in {cd}"
    m = re.search(r'filename="(aptiva_cumplimiento_\d{8}_\d{4}\.csv)"', cd)
    assert m, f"filename pattern not matched in {cd}"

    body_bytes = r.content
    # UTF-8 BOM
    assert body_bytes.startswith(b"\xef\xbb\xbf"), "CSV must start with UTF-8 BOM"

    text = body_bytes.decode("utf-8-sig")
    # ';' separator (at least one line with ';')
    assert ";" in text
    # Required sections
    assert "Aptiva" in text
    assert "Empresa:" in text
    assert "Generado:" in text
    assert "Actividad" in text and "Competencia" in text and "% Cumplimiento" in text
    assert "Resumen" in text

    # At least one cell row with one of OK/Atencion/Critico states
    assert re.search(r";(OK|Atencion|Critico)\b", text), "expected a state column value"


# ============================================================
# Critical-count consistency
# ============================================================

def test_critical_and_green_counts_consistent(admin):
    r = requests.get(f"{BASE_URL}/api/compliance/heatmap",
                     headers=H(admin["token"]), timeout=20)
    d = r.json()
    cells = d["cells"]
    expected_critical = sum(1 for c in cells if c["percentage"] < 50)
    expected_green = sum(1 for c in cells if c["percentage"] >= 80)
    assert d["summary"]["critical_count"] == expected_critical
    assert d["summary"]["green_count"] == expected_green
    assert d["summary"]["total_cells"] == len(cells)
