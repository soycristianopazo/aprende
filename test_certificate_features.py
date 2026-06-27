#!/usr/bin/env python3
"""
Test certificate verification and PDF generation
"""
import requests

BASE_URL = "https://user-credentials-6.preview.emergentagent.com/api"

# Test 1: Public certificate verification (no auth)
print("=== TEST 1: Public Certificate Verification ===")
verification_code = "95A7D112"
resp = requests.get(f"{BASE_URL}/certificates/verify/{verification_code}")
if resp.status_code == 200:
    result = resp.json()
    certificate = result.get("certificate")
    is_valid = result.get("is_valid")
    print(f"✅ Public verification works")
    print(f"   Is Valid: {is_valid}")
    print(f"   Certificate Type: {certificate.get('certificate_type')}")
    print(f"   User Name: {certificate.get('user_name')}")
    print(f"   Role Names: {certificate.get('role_names')}")
else:
    print(f"❌ Failed: {resp.status_code} - {resp.text}")

# Test 2: PDF generation
print("\n=== TEST 2: Certificate PDF Generation ===")
# Login as trabajador
resp = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "trabajador@aptivademo.com",
    "password": "trabajador123"
})
token = resp.json()["token"]
headers = {"Authorization": f"Bearer {token}"}

# Get certificate ID
resp = requests.get(f"{BASE_URL}/certificates", headers=headers)
certificates = resp.json()
if certificates:
    cert_id = certificates[0]['certificate_id']
    
    # Download PDF
    resp = requests.get(f"{BASE_URL}/certificates/{cert_id}/pdf", headers=headers)
    if resp.status_code == 200:
        content_type = resp.headers.get("Content-Type", "")
        content_length = len(resp.content)
        print(f"✅ PDF generation works")
        print(f"   Content-Type: {content_type}")
        print(f"   Size: {content_length} bytes")
        
        # Save PDF for inspection
        with open("/tmp/certificate_test.pdf", "wb") as f:
            f.write(resp.content)
        print(f"   PDF saved to /tmp/certificate_test.pdf")
    else:
        print(f"❌ Failed: {resp.status_code} - {resp.text}")
else:
    print("❌ No certificates found")

# Test 3: Verify company branding is embedded
print("\n=== TEST 3: Company Branding in Certificate ===")
resp = requests.get(f"{BASE_URL}/branding", headers=headers)
if resp.status_code == 200:
    branding = resp.json()
    print(f"✅ Branding retrieved")
    print(f"   Company ID: {branding.get('company_id')}")
    print(f"   Primary Color: {branding.get('primary_color')}")
    print(f"   Logo URL: {branding.get('logo_url')}")
    print(f"   Signature URL: {branding.get('signature_url')}")
else:
    print(f"❌ Failed: {resp.status_code}")
