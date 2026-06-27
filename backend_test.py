#!/usr/bin/env python3
"""
Comprehensive backend test for F1.1 Multi-tenant migration (Aptiva platform)
Tests:
- SuperAdmin: companies CRUD, create admin per company
- Admin: users, areas, activities, document-types, branding, worker-documents
- Trabajador: my-documents, forbidden access
- Tenant isolation (CRITICAL)
- Bulk import CSV
"""
import requests
import json
import io
import sys
from datetime import datetime

# Backend URL from frontend/.env
BASE_URL = "https://user-credentials-6.preview.emergentagent.com/api"

# Test credentials (seeded)
SUPERADMIN = {"email": "superadmin@aptiva.com", "password": "superadmin123"}
ADMIN_DEMO = {"email": "admin@aptivademo.com", "password": "admin123"}
TRABAJADOR_DEMO = {"email": "trabajador@aptivademo.com", "password": "trabajador123"}

# Global state
tokens = {}
company_ids = {}
created_resources = {
    "companies": [],
    "users": [],
    "areas": [],
    "activities": [],
    "document_types": [],
    "worker_documents": [],
}

def log(msg, level="INFO"):
    print(f"[{level}] {msg}")

def login(credentials, label):
    """Login and store token."""
    log(f"Logging in as {label} ({credentials['email']})...")
    resp = requests.post(f"{BASE_URL}/auth/login", json=credentials)
    if resp.status_code != 200:
        log(f"Login failed: {resp.status_code} {resp.text}", "ERROR")
        return None
    data = resp.json()
    token = data.get("token")
    user = data.get("user")
    tokens[label] = token
    log(f"✓ Login successful: {label} (user_id={user.get('user_id')}, company_id={user.get('company_id')})")
    return token

def get_headers(label):
    """Get auth headers for a user."""
    return {"Authorization": f"Bearer {tokens[label]}"}

def test_auth_me(label):
    """Test /api/auth/me returns correct company_id."""
    log(f"Testing /api/auth/me for {label}...")
    resp = requests.get(f"{BASE_URL}/auth/me", headers=get_headers(label))
    if resp.status_code != 200:
        log(f"GET /api/auth/me failed: {resp.status_code} {resp.text}", "ERROR")
        return False
    user = resp.json()
    company_id = user.get("company_id")
    is_super = user.get("is_super_admin")
    is_admin = user.get("is_admin")
    log(f"✓ {label}: company_id={company_id}, is_super_admin={is_super}, is_admin={is_admin}")
    return True

def test_superadmin_companies():
    """Test SuperAdmin CRUD on companies."""
    log("Testing SuperAdmin companies CRUD...")
    headers = get_headers("superadmin")
    
    # GET companies
    resp = requests.get(f"{BASE_URL}/superadmin/companies", headers=headers)
    if resp.status_code != 200:
        log(f"GET /superadmin/companies failed: {resp.status_code} {resp.text}", "ERROR")
        return False
    companies = resp.json()
    log(f"✓ GET /superadmin/companies: {len(companies)} companies")
    
    # POST create 2nd company
    new_company = {
        "name": "Test Company 2",
        "rut": "77.000.000-2",
        "contact_email": "contact@testcompany2.com",
        "primary_color": "#FF5733",
        "secondary_color": "#C70039"
    }
    resp = requests.post(f"{BASE_URL}/superadmin/companies", json=new_company, headers=headers)
    if resp.status_code != 200:
        log(f"POST /superadmin/companies failed: {resp.status_code} {resp.text}", "ERROR")
        return False
    company2 = resp.json()
    company_ids["company2"] = company2["company_id"]
    created_resources["companies"].append(company2["company_id"])
    log(f"✓ Created company2: {company2['name']} (id={company2['company_id']})")
    
    # GET single company
    resp = requests.get(f"{BASE_URL}/superadmin/companies/{company2['company_id']}", headers=headers)
    if resp.status_code != 200:
        log(f"GET /superadmin/companies/{{id}} failed: {resp.status_code} {resp.text}", "ERROR")
        return False
    log(f"✓ GET /superadmin/companies/{{id}}: {resp.json()['name']}")
    
    # PUT update company
    resp = requests.put(f"{BASE_URL}/superadmin/companies/{company2['company_id']}", 
                       json={"footer_text": "© Test Company 2"}, headers=headers)
    if resp.status_code != 200:
        log(f"PUT /superadmin/companies/{{id}} failed: {resp.status_code} {resp.text}", "ERROR")
        return False
    log(f"✓ PUT /superadmin/companies/{{id}}: updated footer_text")
    
    return True

def test_superadmin_create_admin_for_company2():
    """Test SuperAdmin creating admin for company2."""
    log("Testing SuperAdmin creating admin for company2...")
    headers = get_headers("superadmin")
    company2_id = company_ids["company2"]
    
    admin_data = {
        "email": "admin@testcompany2.com",
        "password": "admin123",
        "full_name": "Admin Test Company 2",
        "rut": "33.333.333-3"
    }
    resp = requests.post(f"{BASE_URL}/superadmin/companies/{company2_id}/admin", 
                        json=admin_data, headers=headers)
    if resp.status_code != 200:
        log(f"POST /superadmin/companies/{{id}}/admin failed: {resp.status_code} {resp.text}", "ERROR")
        return False
    admin2 = resp.json()
    created_resources["users"].append(admin2["user_id"])
    log(f"✓ Created admin for company2: {admin2['email']} (user_id={admin2['user_id']})")
    
    # Login as new admin
    token = login({"email": "admin@testcompany2.com", "password": "admin123"}, "admin_company2")
    if not token:
        return False
    
    return True

def test_admin_users():
    """Test admin CRUD on users (scoped to their company)."""
    log("Testing admin users CRUD...")
    headers = get_headers("admin_demo")
    
    # GET users (should only see their company's users, not superadmin)
    resp = requests.get(f"{BASE_URL}/users", headers=headers)
    if resp.status_code != 200:
        log(f"GET /users failed: {resp.status_code} {resp.text}", "ERROR")
        return False
    users = resp.json()
    log(f"✓ GET /users: {len(users)} users (should NOT include superadmin)")
    
    # Verify superadmin is NOT in the list
    superadmin_in_list = any(u.get("email") == "superadmin@aptiva.com" for u in users)
    if superadmin_in_list:
        log("✗ CRITICAL: SuperAdmin appears in company users list!", "ERROR")
        return False
    log("✓ SuperAdmin correctly excluded from company users list")
    
    # POST create new worker
    new_worker = {
        "email": f"worker_test_{datetime.now().timestamp()}@aptivademo.com",
        "password": "test123",
        "full_name": "Test Worker",
        "rut": "44.444.444-4",
        "area_ids": [],
        "activity_ids": [],
        "is_admin": False
    }
    resp = requests.post(f"{BASE_URL}/users", json=new_worker, headers=headers)
    if resp.status_code != 200:
        log(f"POST /users failed: {resp.status_code} {resp.text}", "ERROR")
        return False
    worker = resp.json()
    created_resources["users"].append(worker["user_id"])
    log(f"✓ Created worker: {worker['email']} (user_id={worker['user_id']}, company_id={worker.get('company_id')})")
    
    # Verify worker has correct company_id
    if worker.get("company_id") is None:
        log("✗ CRITICAL: Worker created without company_id!", "ERROR")
        return False
    
    return True

def test_admin_areas():
    """Test admin CRUD on areas."""
    log("Testing admin areas CRUD...")
    headers = get_headers("admin_demo")
    
    # GET areas
    resp = requests.get(f"{BASE_URL}/areas", headers=headers)
    if resp.status_code != 200:
        log(f"GET /areas failed: {resp.status_code} {resp.text}", "ERROR")
        return False
    areas = resp.json()
    log(f"✓ GET /areas: {len(areas)} areas")
    
    # POST create area
    new_area = {
        "name": f"Test Area {datetime.now().timestamp()}",
        "description": "Test area for multi-tenant"
    }
    resp = requests.post(f"{BASE_URL}/areas", json=new_area, headers=headers)
    if resp.status_code != 200:
        log(f"POST /areas failed: {resp.status_code} {resp.text}", "ERROR")
        return False
    area = resp.json()
    created_resources["areas"].append(area["area_id"])
    log(f"✓ Created area: {area['name']} (area_id={area['area_id']}, company_id={area.get('company_id')})")
    
    return True

def test_admin_activities():
    """Test admin CRUD on activities."""
    log("Testing admin activities CRUD...")
    headers = get_headers("admin_demo")
    
    # GET activities
    resp = requests.get(f"{BASE_URL}/activities", headers=headers)
    if resp.status_code != 200:
        log(f"GET /activities failed: {resp.status_code} {resp.text}", "ERROR")
        return False
    activities = resp.json()
    log(f"✓ GET /activities: {len(activities)} activities")
    
    # POST create activity
    new_activity = {
        "name": f"Test Activity {datetime.now().timestamp()}",
        "description": "Test activity for multi-tenant"
    }
    resp = requests.post(f"{BASE_URL}/activities", json=new_activity, headers=headers)
    if resp.status_code != 200:
        log(f"POST /activities failed: {resp.status_code} {resp.text}", "ERROR")
        return False
    activity = resp.json()
    created_resources["activities"].append(activity["activity_id"])
    log(f"✓ Created activity: {activity['name']} (activity_id={activity['activity_id']}, company_id={activity.get('company_id')})")
    
    return True

def test_admin_document_types():
    """Test admin CRUD on document types."""
    log("Testing admin document-types CRUD...")
    headers = get_headers("admin_demo")
    
    # GET document-types
    resp = requests.get(f"{BASE_URL}/document-types", headers=headers)
    if resp.status_code != 200:
        log(f"GET /document-types failed: {resp.status_code} {resp.text}", "ERROR")
        return False
    doctypes = resp.json()
    log(f"✓ GET /document-types: {len(doctypes)} document types")
    
    # POST create document type
    new_doctype = {
        "name": f"Test DocType {datetime.now().timestamp()}",
        "description": "Test document type",
        "requires_expiry": True,
        "area_ids": [],
        "activity_ids": []
    }
    resp = requests.post(f"{BASE_URL}/document-types", json=new_doctype, headers=headers)
    if resp.status_code != 200:
        log(f"POST /document-types failed: {resp.status_code} {resp.text}", "ERROR")
        return False
    doctype = resp.json()
    created_resources["document_types"].append(doctype["document_type_id"])
    log(f"✓ Created document type: {doctype['name']} (document_type_id={doctype['document_type_id']}, company_id={doctype.get('company_id')})")
    
    return True

def test_admin_branding():
    """Test admin branding GET/PUT."""
    log("Testing admin branding GET/PUT...")
    headers = get_headers("admin_demo")
    
    # GET branding
    resp = requests.get(f"{BASE_URL}/branding", headers=headers)
    if resp.status_code != 200:
        log(f"GET /branding failed: {resp.status_code} {resp.text}", "ERROR")
        return False
    branding = resp.json()
    log(f"✓ GET /branding: company_id={branding.get('company_id')}, primary_color={branding.get('primary_color')}")
    
    # PUT update branding
    update_data = {
        "primary_color": "#FF0000",
        "footer_text": "© Aptiva Demo Updated"
    }
    resp = requests.put(f"{BASE_URL}/branding", json=update_data, headers=headers)
    if resp.status_code != 200:
        log(f"PUT /branding failed: {resp.status_code} {resp.text}", "ERROR")
        return False
    updated = resp.json()
    log(f"✓ PUT /branding: primary_color={updated.get('primary_color')}")
    
    return True

def test_admin_worker_documents():
    """Test admin uploading worker documents."""
    log("Testing admin worker-documents upload...")
    headers = get_headers("admin_demo")
    
    # Get trabajador user_id
    resp = requests.get(f"{BASE_URL}/auth/me", headers=get_headers("trabajador_demo"))
    if resp.status_code != 200:
        log(f"Failed to get trabajador user_id", "ERROR")
        return False
    trabajador = resp.json()
    trabajador_user_id = trabajador["user_id"]
    
    # Get a document type
    resp = requests.get(f"{BASE_URL}/document-types", headers=headers)
    if resp.status_code != 200:
        log(f"Failed to get document types", "ERROR")
        return False
    doctypes = resp.json()
    if not doctypes:
        log("No document types available", "ERROR")
        return False
    doctype_id = doctypes[0]["document_type_id"]
    
    # Upload a test file (small PDF)
    test_file_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n190\n%%EOF"
    files = {"file": ("test_document.pdf", test_file_content, "application/pdf")}
    data = {
        "document_type_id": doctype_id,
        "expiry_date": "2025-12-31",
        "notes": "Test upload"
    }
    resp = requests.post(f"{BASE_URL}/worker-documents/{trabajador_user_id}/upload", 
                        data=data, files=files, headers=headers)
    if resp.status_code != 200:
        log(f"POST /worker-documents/{{user_id}}/upload failed: {resp.status_code} {resp.text}", "ERROR")
        return False
    wd = resp.json()
    log(f"✓ Uploaded worker document: worker_document_id={wd.get('worker_document_id')}, files_count={len(wd.get('files', []))}")
    
    # GET worker documents
    resp = requests.get(f"{BASE_URL}/worker-documents/{trabajador_user_id}", headers=headers)
    if resp.status_code != 200:
        log(f"GET /worker-documents/{{user_id}} failed: {resp.status_code} {resp.text}", "ERROR")
        return False
    wdocs = resp.json()
    log(f"✓ GET /worker-documents/{{user_id}}: {len(wdocs)} documents")
    
    return True

def test_trabajador_my_documents():
    """Test trabajador self-service /api/my-documents."""
    log("Testing trabajador /api/my-documents...")
    headers = get_headers("trabajador_demo")
    
    resp = requests.get(f"{BASE_URL}/my-documents", headers=headers)
    if resp.status_code != 200:
        log(f"GET /my-documents failed: {resp.status_code} {resp.text}", "ERROR")
        return False
    my_docs = resp.json()
    log(f"✓ GET /my-documents: {len(my_docs)} required document types")
    
    return True

def test_trabajador_forbidden_access():
    """Test trabajador cannot access other users' documents."""
    log("Testing trabajador forbidden access to other users' documents...")
    headers = get_headers("trabajador_demo")
    
    # Get admin user_id
    resp = requests.get(f"{BASE_URL}/auth/me", headers=get_headers("admin_demo"))
    if resp.status_code != 200:
        log(f"Failed to get admin user_id", "ERROR")
        return False
    admin = resp.json()
    admin_user_id = admin["user_id"]
    
    # Try to access admin's worker documents (should be 403)
    resp = requests.get(f"{BASE_URL}/worker-documents/{admin_user_id}", headers=headers)
    if resp.status_code == 403:
        log(f"✓ Trabajador correctly forbidden from accessing other user's documents (403)")
        return True
    else:
        log(f"✗ CRITICAL: Trabajador should get 403 but got {resp.status_code}", "ERROR")
        return False

def test_tenant_isolation():
    """CRITICAL: Test that company2 admin cannot see Aptiva Demo data."""
    log("Testing CRITICAL tenant isolation...")
    headers_demo = get_headers("admin_demo")
    headers_company2 = get_headers("admin_company2")
    
    # Get Aptiva Demo users
    resp = requests.get(f"{BASE_URL}/users", headers=headers_demo)
    if resp.status_code != 200:
        log(f"Failed to get Aptiva Demo users", "ERROR")
        return False
    demo_users = resp.json()
    demo_user_emails = [u["email"] for u in demo_users]
    log(f"Aptiva Demo users: {len(demo_users)} users")
    
    # Get company2 users
    resp = requests.get(f"{BASE_URL}/users", headers=headers_company2)
    if resp.status_code != 200:
        log(f"Failed to get company2 users", "ERROR")
        return False
    company2_users = resp.json()
    company2_user_emails = [u["email"] for u in company2_users]
    log(f"Company2 users: {len(company2_users)} users")
    
    # Check for overlap (should be NONE)
    overlap = set(demo_user_emails) & set(company2_user_emails)
    if overlap:
        log(f"✗ CRITICAL: Tenant isolation BROKEN! Overlapping users: {overlap}", "ERROR")
        return False
    log(f"✓ CRITICAL: Tenant isolation verified - no overlapping users")
    
    # Get Aptiva Demo areas
    resp = requests.get(f"{BASE_URL}/areas", headers=headers_demo)
    if resp.status_code != 200:
        log(f"Failed to get Aptiva Demo areas", "ERROR")
        return False
    demo_areas = resp.json()
    log(f"Aptiva Demo areas: {len(demo_areas)} areas")
    
    # Get company2 areas
    resp = requests.get(f"{BASE_URL}/areas", headers=headers_company2)
    if resp.status_code != 200:
        log(f"Failed to get company2 areas", "ERROR")
        return False
    company2_areas = resp.json()
    log(f"Company2 areas: {len(company2_areas)} areas")
    
    # Check for overlap (should be NONE)
    demo_area_names = [a["name"] for a in demo_areas]
    company2_area_names = [a["name"] for a in company2_areas]
    overlap = set(demo_area_names) & set(company2_area_names)
    if overlap:
        log(f"✗ CRITICAL: Tenant isolation BROKEN! Overlapping areas: {overlap}", "ERROR")
        return False
    log(f"✓ CRITICAL: Tenant isolation verified - no overlapping areas")
    
    return True

def test_bulk_import():
    """Test bulk user import via CSV."""
    log("Testing bulk user import...")
    headers = get_headers("admin_demo")
    
    # Create CSV content
    csv_content = """email,password,full_name,rut,area_names,activity_names
bulk1@aptivademo.com,test123,Bulk User One,90000001-1,Operaciones Mina,Trabajo en Altura
bulk2@aptivademo.com,test123,Bulk User Two,90000002-2,Mantenimiento,Soldadura"""
    
    files = {"file": ("bulk_import.csv", csv_content.encode("utf-8"), "text/csv")}
    resp = requests.post(f"{BASE_URL}/users/bulk-import", files=files, headers=headers)
    if resp.status_code != 200:
        log(f"POST /users/bulk-import failed: {resp.status_code} {resp.text}", "ERROR")
        return False
    result = resp.json()
    summary = result.get("summary", {})
    log(f"✓ Bulk import: created={summary.get('created')}, skipped={summary.get('skipped')}, errors={summary.get('errors')}")
    
    # Store created user IDs for cleanup
    for item in result.get("created", []):
        created_resources["users"].append(item["user_id"])
    
    if summary.get("created", 0) < 2:
        log(f"✗ Expected at least 2 users created, got {summary.get('created')}", "ERROR")
        return False
    
    return True

def main():
    """Run all tests."""
    log("=" * 80)
    log("F1.1 MULTI-TENANT BACKEND TESTS - APTIVA PLATFORM")
    log("=" * 80)
    
    tests = [
        ("Login SuperAdmin", lambda: login(SUPERADMIN, "superadmin")),
        ("Login Admin Demo", lambda: login(ADMIN_DEMO, "admin_demo")),
        ("Login Trabajador Demo", lambda: login(TRABAJADOR_DEMO, "trabajador_demo")),
        ("Test /api/auth/me - SuperAdmin", lambda: test_auth_me("superadmin")),
        ("Test /api/auth/me - Admin Demo", lambda: test_auth_me("admin_demo")),
        ("Test /api/auth/me - Trabajador Demo", lambda: test_auth_me("trabajador_demo")),
        ("Test SuperAdmin Companies CRUD", test_superadmin_companies),
        ("Test SuperAdmin Create Admin for Company2", test_superadmin_create_admin_for_company2),
        ("Test /api/auth/me - Admin Company2", lambda: test_auth_me("admin_company2")),
        ("Test Admin Users CRUD", test_admin_users),
        ("Test Admin Areas CRUD", test_admin_areas),
        ("Test Admin Activities CRUD", test_admin_activities),
        ("Test Admin Document Types CRUD", test_admin_document_types),
        ("Test Admin Branding GET/PUT", test_admin_branding),
        ("Test Admin Worker Documents Upload", test_admin_worker_documents),
        ("Test Trabajador My Documents", test_trabajador_my_documents),
        ("Test Trabajador Forbidden Access", test_trabajador_forbidden_access),
        ("Test CRITICAL Tenant Isolation", test_tenant_isolation),
        ("Test Bulk User Import", test_bulk_import),
    ]
    
    passed = 0
    failed = 0
    
    for name, test_func in tests:
        log("")
        log(f"Running: {name}")
        log("-" * 80)
        try:
            result = test_func()
            if result or result is None:
                passed += 1
                log(f"✓ PASSED: {name}", "SUCCESS")
            else:
                failed += 1
                log(f"✗ FAILED: {name}", "ERROR")
        except Exception as e:
            failed += 1
            log(f"✗ EXCEPTION in {name}: {e}", "ERROR")
            import traceback
            traceback.print_exc()
    
    log("")
    log("=" * 80)
    log(f"TEST SUMMARY: {passed} passed, {failed} failed out of {passed + failed} tests")
    log("=" * 80)
    
    if failed > 0:
        log("Some tests FAILED. See details above.", "ERROR")
        sys.exit(1)
    else:
        log("All tests PASSED!", "SUCCESS")
        sys.exit(0)

if __name__ == "__main__":
    main()
