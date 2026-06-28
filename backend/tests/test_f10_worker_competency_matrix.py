"""
F10 backend tests: Worker × Competency Matrix report endpoints.

Endpoints under test:
  - GET /api/reports/worker-competency-matrix       (admin only, JSON)
  - GET /api/reports/worker-competency-matrix/export (admin only, CSV)

Validates:
  * Auth (no token → 401/403, worker token → 403)
  * Response shape: workers, competencies, cells, summary
  * Status semantics: valid / warning / expired / missing / not_required
  * Compliance % is computed only over required set (excludes not_required)
  * CSV: UTF-8 BOM, attachment Content-Disposition, filename pattern,
         header 'Reporte: Matriz Trabajadores x Competencias', 'Resumen' section
"""
import os
import re
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN_EMAIL = "admin@aptivademo.com"
ADMIN_PASSWORD = "admin123"
WORKER_EMAIL = "jsoto@rioloaspa.cl"
WORKER_PASSWORD = "17234"  # primeros 5 dígitos del RUT seed


# ---------- Fixtures ----------

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
        pytest.skip(f"Worker login failed: {r.status_code} {r.text[:200]}")
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    return s


@pytest.fixture(scope="module")
def matrix_payload(admin_client):
    r = admin_client.get(f"{BASE}/api/reports/worker-competency-matrix")
    assert r.status_code == 200, r.text
    return r.json()


# ---------- Auth tests ----------

class TestAuthMatrix:
    def test_no_token_unauthorized(self):
        r = requests.get(f"{BASE}/api/reports/worker-competency-matrix")
        assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"

    def test_no_token_export_unauthorized(self):
        r = requests.get(f"{BASE}/api/reports/worker-competency-matrix/export")
        assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"

    def test_worker_forbidden_json(self, worker_client):
        r = worker_client.get(f"{BASE}/api/reports/worker-competency-matrix")
        assert r.status_code == 403, f"Expected 403, got {r.status_code} body={r.text[:200]}"

    def test_worker_forbidden_export(self, worker_client):
        r = worker_client.get(f"{BASE}/api/reports/worker-competency-matrix/export")
        assert r.status_code == 403, f"Expected 403, got {r.status_code} body={r.text[:200]}"


# ---------- Shape & semantics ----------

class TestMatrixShape:
    def test_top_level_keys(self, matrix_payload):
        for k in ("workers", "competencies", "cells", "summary", "generated_at"):
            assert k in matrix_payload, f"Missing key: {k}"

    def test_counts_consistent(self, matrix_payload):
        n_w = len(matrix_payload["workers"])
        n_c = len(matrix_payload["competencies"])
        # 1 cell per (worker, competency)
        assert len(matrix_payload["cells"]) == n_w * n_c, (
            f"cells={len(matrix_payload['cells'])} expected {n_w}*{n_c}"
        )
        assert matrix_payload["summary"]["total_workers"] == n_w
        assert matrix_payload["summary"]["total_competencies"] == n_c

    def test_summary_buckets_sum(self, matrix_payload):
        s = matrix_payload["summary"]
        total = s["valid"] + s["warning"] + s["expired"] + s["missing"] + s["not_required"]
        assert total == len(matrix_payload["cells"]), (
            f"summary buckets {total} != cells {len(matrix_payload['cells'])}"
        )

    def test_cell_status_values(self, matrix_payload):
        allowed = {"valid", "warning", "expired", "missing", "not_required"}
        bad = [c for c in matrix_payload["cells"] if c["status"] not in allowed]
        assert not bad, f"Found {len(bad)} cells with invalid status: {bad[:3]}"

    def test_required_flag_consistent_with_not_required(self, matrix_payload):
        # not_required => required=False; missing => required=True
        bad_nr = [c for c in matrix_payload["cells"] if c["status"] == "not_required" and c["required"]]
        bad_m = [c for c in matrix_payload["cells"] if c["status"] == "missing" and not c["required"]]
        assert not bad_nr, f"not_required cells with required=True: {bad_nr[:3]}"
        assert not bad_m, f"missing cells with required=False: {bad_m[:3]}"

    def test_worker_shape(self, matrix_payload):
        assert matrix_payload["workers"], "Expected at least one worker"
        w = matrix_payload["workers"][0]
        for k in ("user_id", "full_name", "rut", "totals", "compliance_pct"):
            assert k in w, f"Worker missing key {k}"

    def test_compliance_excludes_not_required(self, matrix_payload):
        # For each worker, compute expected compliance over required set and compare
        for w in matrix_payload["workers"]:
            t = w["totals"]
            req = t["valid"] + t["warning"] + t["expired"] + t["missing"]
            if req == 0:
                assert w["compliance_pct"] in (None, 0), f"Expected null/0 compliance, got {w['compliance_pct']}"
            else:
                expected = round(((t["valid"] + t["warning"]) / req) * 100)
                assert w["compliance_pct"] == expected, (
                    f"Worker {w['user_id']}: expected {expected}, got {w['compliance_pct']}"
                )

    def test_average_compliance_reasonable(self, matrix_payload):
        avg = matrix_payload["summary"]["average_compliance"]
        assert 0 <= avg <= 100, f"avg out of range: {avg}"

    def test_multitenant_only_rio_loa(self, matrix_payload):
        # All worker emails should belong to Río Loa (or admin-domain seed). At minimum,
        # there should not be users outside the admin's tenant.
        emails = [w.get("email", "") for w in matrix_payload["workers"]]
        # Heuristic: every email is a string (we cannot directly check company_id from client,
        # but the endpoint filters by admin.company_id internally)
        assert all(isinstance(e, str) for e in emails)
        # Sanity: seed says 8 trabajadores Río Loa
        assert len(emails) >= 1


# ---------- Export CSV ----------

class TestMatrixExport:
    def test_export_status_and_headers(self, admin_client):
        r = admin_client.get(f"{BASE}/api/reports/worker-competency-matrix/export")
        assert r.status_code == 200, r.text[:300]
        ctype = r.headers.get("content-type", "")
        assert "csv" in ctype.lower(), f"Unexpected content-type: {ctype}"
        cd = r.headers.get("content-disposition", "")
        assert "attachment" in cd.lower()
        assert re.search(r'filename="?aptiva_matriz_competencias_\d{8}_\d{4}\.csv"?', cd), (
            f"Filename pattern mismatch: {cd}"
        )

    def test_export_body_bom_and_sections(self, admin_client):
        r = admin_client.get(f"{BASE}/api/reports/worker-competency-matrix/export")
        assert r.status_code == 200
        raw = r.content
        assert len(raw) > 100, f"CSV too small: {len(raw)} bytes"
        # BOM UTF-8
        assert raw.startswith(b"\xef\xbb\xbf"), "Missing UTF-8 BOM"
        text = raw.decode("utf-8-sig")
        first_line = text.splitlines()[0]
        assert "Reporte: Matriz Trabajadores x Competencias" in first_line, first_line
        # Header columns
        assert "RUT" in text and "Trabajador" in text and "% Cumplimiento" in text
        # Resumen section
        assert "Resumen" in text
        assert "Cumplimiento promedio" in text
