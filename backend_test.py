#!/usr/bin/env python3
"""
Supabase Storage Integration Test Suite
Tests file upload to Supabase Storage buckets and serving via 302 redirects.
"""
import requests
import io
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

# Configuration
BASE_URL = "https://e401cd41-8492-43eb-83ab-c33230484a34.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@elearning.com"
ADMIN_PASSWORD = "admin123"
SUPABASE_STORAGE_BASE = "https://jnqdgknthzslhbfsmjtq.supabase.co/storage/v1/object/public"

# Test results
results = {
    "passed": 0,
    "failed": 0,
    "errors": []
}

def log_test(name, passed, message=""):
    """Log test result"""
    if passed:
        results["passed"] += 1
        print(f"✅ {name}")
    else:
        results["failed"] += 1
        results["errors"].append(f"{name}: {message}")
        print(f"❌ {name}: {message}")

def create_test_png():
    """Create a small test PNG image"""
    img = Image.new('RGB', (100, 100), color='red')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer

def create_test_pdf():
    """Create a small test PDF"""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.drawString(100, 750, "Test Course Material")
    c.save()
    buffer.seek(0)
    return buffer

def create_test_txt():
    """Create a test text file"""
    return io.BytesIO(b"This is a text file")

print("=" * 80)
print("SUPABASE STORAGE INTEGRATION TEST SUITE")
print("=" * 80)

# Test 1: Admin login
print("\n[1] Testing admin login...")
try:
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        data = resp.json()
        admin_token = data.get("token")
        log_test("Admin login", admin_token is not None, f"Status: {resp.status_code}")
    else:
        log_test("Admin login", False, f"Status: {resp.status_code}, Response: {resp.text}")
        admin_token = None
except Exception as e:
    log_test("Admin login", False, str(e))
    admin_token = None

if not admin_token:
    print("\n❌ Cannot proceed without admin token. Exiting.")
    exit(1)

headers = {"Authorization": f"Bearer {admin_token}"}

# Test 2: POST /api/branding/logo with PNG
print("\n[2] Testing POST /api/branding/logo (PNG)...")
try:
    png_file = create_test_png()
    files = {"file": ("test_logo.png", png_file, "image/png")}
    resp = requests.post(f"{BASE_URL}/branding/logo", files=files, headers=headers)
    
    if resp.status_code == 200:
        data = resp.json()
        logo_url = data.get("logo_url")
        if logo_url and logo_url.startswith("/api/files/logos/"):
            log_test("POST /api/branding/logo", True)
        else:
            log_test("POST /api/branding/logo", False, f"Invalid logo_url: {logo_url}")
    else:
        log_test("POST /api/branding/logo", False, f"Status: {resp.status_code}, Response: {resp.text}")
        logo_url = None
except Exception as e:
    log_test("POST /api/branding/logo", False, str(e))
    logo_url = None

# Test 3: POST /api/branding/banner-logo with PNG
print("\n[3] Testing POST /api/branding/banner-logo (PNG)...")
try:
    png_file = create_test_png()
    files = {"file": ("test_banner.png", png_file, "image/png")}
    resp = requests.post(f"{BASE_URL}/branding/banner-logo", files=files, headers=headers)
    
    if resp.status_code == 200:
        data = resp.json()
        banner_logo_url = data.get("banner_logo_url")
        if banner_logo_url and banner_logo_url.startswith("/api/files/logos/"):
            log_test("POST /api/branding/banner-logo", True)
        else:
            log_test("POST /api/branding/banner-logo", False, f"Invalid banner_logo_url: {banner_logo_url}")
    else:
        log_test("POST /api/branding/banner-logo", False, f"Status: {resp.status_code}, Response: {resp.text}")
        banner_logo_url = None
except Exception as e:
    log_test("POST /api/branding/banner-logo", False, str(e))
    banner_logo_url = None

# Test 4: POST /api/branding/signature with PNG
print("\n[4] Testing POST /api/branding/signature (PNG)...")
try:
    png_file = create_test_png()
    files = {"file": ("test_signature.png", png_file, "image/png")}
    resp = requests.post(f"{BASE_URL}/branding/signature", files=files, headers=headers)
    
    if resp.status_code == 200:
        data = resp.json()
        signature_url = data.get("signature_url")
        if signature_url and signature_url.startswith("/api/files/signatures/"):
            log_test("POST /api/branding/signature", True)
        else:
            log_test("POST /api/branding/signature", False, f"Invalid signature_url: {signature_url}")
    else:
        log_test("POST /api/branding/signature", False, f"Status: {resp.status_code}, Response: {resp.text}")
        signature_url = None
except Exception as e:
    log_test("POST /api/branding/signature", False, str(e))
    signature_url = None

# Test 5: POST /api/branding/footer with PNG
print("\n[5] Testing POST /api/branding/footer (PNG)...")
try:
    png_file = create_test_png()
    files = {"file": ("test_footer.png", png_file, "image/png")}
    resp = requests.post(f"{BASE_URL}/branding/footer", files=files, headers=headers)
    
    if resp.status_code == 200:
        data = resp.json()
        footer_image_url = data.get("footer_image_url")
        if footer_image_url and footer_image_url.startswith("/api/files/logos/"):
            log_test("POST /api/branding/footer", True)
        else:
            log_test("POST /api/branding/footer", False, f"Invalid footer_image_url: {footer_image_url}")
    else:
        log_test("POST /api/branding/footer", False, f"Status: {resp.status_code}, Response: {resp.text}")
        footer_image_url = None
except Exception as e:
    log_test("POST /api/branding/footer", False, str(e))
    footer_image_url = None

# Test 6: Create a course for material upload test
print("\n[6] Creating test course for material upload...")
try:
    course_data = {
        "name": "Test Course for Storage",
        "description": "Test course for Supabase Storage material upload",
        "hours": 5,
        "validity_hours": 8760,
        "training_type": "e-learning",
        "status": "draft",
        "prerequisites": []
    }
    resp = requests.post(f"{BASE_URL}/courses", json=course_data, headers=headers)
    
    if resp.status_code == 200:
        data = resp.json()
        course_id = data.get("course_id")
        log_test("Create test course", course_id is not None)
    else:
        log_test("Create test course", False, f"Status: {resp.status_code}, Response: {resp.text}")
        course_id = None
except Exception as e:
    log_test("Create test course", False, str(e))
    course_id = None

# Test 7: POST /api/courses/{course_id}/material with PDF
material_url = None
if course_id:
    print("\n[7] Testing POST /api/courses/{course_id}/material (PDF)...")
    try:
        pdf_file = create_test_pdf()
        files = {"file": ("test_material.pdf", pdf_file, "application/pdf")}
        resp = requests.post(f"{BASE_URL}/courses/{course_id}/material", files=files, headers=headers)
        
        if resp.status_code == 200:
            data = resp.json()
            material_url = data.get("material_url")
            if material_url and material_url.startswith("/api/files/materials/"):
                log_test("POST /api/courses/{course_id}/material", True)
            else:
                log_test("POST /api/courses/{course_id}/material", False, f"Invalid material_url: {material_url}")
        else:
            log_test("POST /api/courses/{course_id}/material", False, f"Status: {resp.status_code}, Response: {resp.text}")
    except Exception as e:
        log_test("POST /api/courses/{course_id}/material", False, str(e))
else:
    print("\n[7] Skipping material upload test (no course_id)")
    log_test("POST /api/courses/{course_id}/material", False, "No course_id available")

# Test 8: GET /api/branding to verify stored URLs
print("\n[8] Testing GET /api/branding (verify stored URLs)...")
try:
    resp = requests.get(f"{BASE_URL}/branding")
    
    if resp.status_code == 200:
        data = resp.json()
        stored_logo = data.get("logo_url")
        stored_banner = data.get("banner_logo_url")
        stored_signature = data.get("signature_url")
        stored_footer = data.get("footer_image_url")
        
        all_match = True
        mismatches = []
        
        if logo_url and stored_logo != logo_url:
            all_match = False
            mismatches.append(f"logo_url mismatch: expected {logo_url}, got {stored_logo}")
        
        if banner_logo_url and stored_banner != banner_logo_url:
            all_match = False
            mismatches.append(f"banner_logo_url mismatch: expected {banner_logo_url}, got {stored_banner}")
        
        if signature_url and stored_signature != signature_url:
            all_match = False
            mismatches.append(f"signature_url mismatch: expected {signature_url}, got {stored_signature}")
        
        if footer_image_url and stored_footer != footer_image_url:
            all_match = False
            mismatches.append(f"footer_image_url mismatch: expected {footer_image_url}, got {stored_footer}")
        
        if all_match:
            log_test("GET /api/branding (stored URLs)", True)
        else:
            log_test("GET /api/branding (stored URLs)", False, "; ".join(mismatches))
    else:
        log_test("GET /api/branding (stored URLs)", False, f"Status: {resp.status_code}, Response: {resp.text}")
except Exception as e:
    log_test("GET /api/branding (stored URLs)", False, str(e))

# Test 9-13: GET each uploaded file with redirect follow
uploaded_urls = [
    ("logo", logo_url),
    ("banner-logo", banner_logo_url),
    ("signature", signature_url),
    ("footer", footer_image_url),
    ("material", material_url)
]

test_num = 9
for name, url in uploaded_urls:
    if url:
        print(f"\n[{test_num}] Testing GET {url} (follow redirect)...")
        try:
            # Follow redirects with allow_redirects=True
            resp = requests.get(f"{BASE_URL.replace('/api', '')}{url}", allow_redirects=True)
            
            if resp.status_code == 200:
                # Check if we got redirected to Supabase
                if SUPABASE_STORAGE_BASE in resp.url:
                    # Check content is non-empty
                    if len(resp.content) > 0:
                        log_test(f"GET {url} (redirect + content)", True)
                    else:
                        log_test(f"GET {url} (redirect + content)", False, "Empty content")
                else:
                    log_test(f"GET {url} (redirect + content)", False, f"Did not redirect to Supabase. Final URL: {resp.url}")
            else:
                log_test(f"GET {url} (redirect + content)", False, f"Status: {resp.status_code}")
        except Exception as e:
            log_test(f"GET {url} (redirect + content)", False, str(e))
    else:
        print(f"\n[{test_num}] Skipping GET test for {name} (no URL)")
        log_test(f"GET {name} (redirect + content)", False, "No URL available")
    
    test_num += 1

# Test 14: Validation - upload .txt file to /api/branding/logo (expect 400)
print("\n[14] Testing validation: upload .txt to /api/branding/logo (expect 400)...")
try:
    txt_file = create_test_txt()
    files = {"file": ("test.txt", txt_file, "text/plain")}
    resp = requests.post(f"{BASE_URL}/branding/logo", files=files, headers=headers)
    
    if resp.status_code == 400:
        log_test("Validation: reject .txt file", True)
    else:
        log_test("Validation: reject .txt file", False, f"Expected 400, got {resp.status_code}")
except Exception as e:
    log_test("Validation: reject .txt file", False, str(e))

# Test 15: Non-existent file - GET /api/files/logos/nonexistent_xyz123.png (expect 400/404)
print("\n[15] Testing non-existent file: GET /api/files/logos/nonexistent_xyz123.png (expect 400/404)...")
try:
    resp = requests.get(f"{BASE_URL}/files/logos/nonexistent_xyz123.png", allow_redirects=True)
    
    if resp.status_code in (400, 404):
        log_test("Non-existent file returns 400/404", True)
    else:
        log_test("Non-existent file returns 400/404", False, f"Expected 400/404, got {resp.status_code}")
except Exception as e:
    log_test("Non-existent file returns 400/404", False, str(e))

# Cleanup: Delete test course
if course_id:
    print(f"\n[Cleanup] Deleting test course {course_id}...")
    try:
        resp = requests.delete(f"{BASE_URL}/courses/{course_id}", headers=headers)
        if resp.status_code == 200:
            print(f"✅ Test course deleted")
        else:
            print(f"⚠️  Failed to delete test course: {resp.status_code}")
    except Exception as e:
        print(f"⚠️  Error deleting test course: {e}")

# Summary
print("\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print(f"✅ Passed: {results['passed']}")
print(f"❌ Failed: {results['failed']}")
print(f"📊 Total: {results['passed'] + results['failed']}")
print(f"🎯 Success Rate: {results['passed'] / (results['passed'] + results['failed']) * 100:.1f}%")

if results["errors"]:
    print("\n❌ FAILED TESTS:")
    for error in results["errors"]:
        print(f"  - {error}")

print("=" * 80)

# Exit with appropriate code
exit(0 if results["failed"] == 0 else 1)
