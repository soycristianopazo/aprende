"""
routes_v2.py - Multi-tenant routes for Aptiva platform
- SuperAdmin: companies CRUD + create admin per company
- Per-company branding
- Areas, document types, worker documents
- Bulk user import (CSV)
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Any, Dict
from datetime import datetime, timezone, timedelta
import uuid
import csv
import io
import bcrypt
import logging

from db_adapter import db
from storage_client import upload_to_storage, get_public_url

logger = logging.getLogger(__name__)

# Re-import auth deps from server.py
from server import (
    get_current_user,
    require_admin,
    require_super_admin,
    scoped_filter,
    hash_password,
)

v2_router = APIRouter(prefix="/api")


# ==================== Pydantic Models ====================
class CompanyCreate(BaseModel):
    name: str
    rut: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    company_type: Optional[str] = None  # 'mandante' | 'contratista' | None
    primary_color: str = "#2563EB"
    secondary_color: str = "#3B82F6"


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    business_name: Optional[str] = None
    rut: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    legal_representative: Optional[str] = None
    legal_representative_rut: Optional[str] = None
    company_type: Optional[str] = None
    is_active: Optional[bool] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    footer_text: Optional[str] = None


class CompanyAdminCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    rut: Optional[str] = None


class AreaCreate(BaseModel):
    name: str
    description: Optional[str] = None


class AreaUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class DocumentTypeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    requires_expiry: bool = False
    area_ids: List[str] = []
    activity_ids: List[str] = []


class DocumentTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    requires_expiry: Optional[bool] = None
    area_ids: Optional[List[str]] = None
    activity_ids: Optional[List[str]] = None
    is_active: Optional[bool] = None


class CompetencyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    validity_months: Optional[int] = None  # None = no expiration


class CompetencyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    validity_months: Optional[int] = None
    is_active: Optional[bool] = None


class WorkerCompetencyManualCreate(BaseModel):
    """JSON body used when admin marks competency acquired without uploading a file."""
    expiry_date: Optional[str] = None
    notes: Optional[str] = None


class WorkerCreate(BaseModel):
    """Used by company admin to create a worker."""
    email: EmailStr
    password: str
    full_name: str
    rut: Optional[str] = None
    area_ids: List[str] = []
    activity_ids: List[str] = []


# ============================================================
# SUPERADMIN: Companies CRUD
# ============================================================
@v2_router.get("/superadmin/companies")
async def list_companies(_user: dict = Depends(require_super_admin)):
    return await db.companies.find({}).sort("created_at", -1).to_list(500)


@v2_router.post("/superadmin/companies")
async def create_company(data: CompanyCreate, _user: dict = Depends(require_super_admin)):
    company_id = f"company_{uuid.uuid4().hex[:12]}"
    doc = {
        "company_id": company_id,
        "name": data.name,
        "rut": data.rut,
        "contact_email": data.contact_email,
        "contact_phone": data.contact_phone,
        "address": data.address,
        "company_type": data.company_type,
        "is_active": True,
        "primary_color": data.primary_color,
        "secondary_color": data.secondary_color,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.companies.insert_one(doc)
    return doc


@v2_router.get("/superadmin/companies/{company_id}")
async def get_company(company_id: str, _user: dict = Depends(require_super_admin)):
    c = await db.companies.find_one({"company_id": company_id})
    if not c:
        raise HTTPException(404, "Company not found")
    return c


@v2_router.put("/superadmin/companies/{company_id}")
async def update_company(company_id: str, data: CompanyUpdate, _user: dict = Depends(require_super_admin)):
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")
    res = await db.companies.update_one({"company_id": company_id}, {"$set": payload})
    if res.matched_count == 0:
        raise HTTPException(404, "Company not found")
    return await db.companies.find_one({"company_id": company_id})


@v2_router.delete("/superadmin/companies/{company_id}")
async def delete_company(company_id: str, _user: dict = Depends(require_super_admin)):
    res = await db.companies.delete_one({"company_id": company_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Company not found")
    return {"deleted": True}


@v2_router.post("/superadmin/companies/{company_id}/admin")
async def create_company_admin(company_id: str, data: CompanyAdminCreate, _user: dict = Depends(require_super_admin)):
    """Create or upgrade an admin user for a specific company."""
    company = await db.companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(404, "Company not found")

    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(400, f"User {data.email} already exists")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "company_id": company_id,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "full_name": data.full_name,
        "rut": data.rut,
        "company": company["name"],
        "is_super_admin": False,
        "is_admin": True,
        "is_active": True,
        "area_ids": [],
        "activity_ids": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    user_doc.pop("password_hash", None)
    return user_doc


@v2_router.get("/superadmin/companies/{company_id}/admins")
async def list_company_admins(company_id: str, _user: dict = Depends(require_super_admin)):
    admins = await db.users.find({"company_id": company_id, "is_admin": True}, {"password_hash": 0}).to_list(100)
    return admins


# ============================================================
# BRANDING (per company)
# ============================================================
@v2_router.get("/branding")
async def get_branding(company_id: Optional[str] = None, request: Request = None):
    """
    Returns the branding (logo, colors, etc.) for a company.
    - If query ?company_id=X is provided, returns that company's branding (public).
    - Else if user is authenticated, returns their company's branding.
    - Else returns default branding.
    """
    target_id = company_id
    if not target_id and request is not None:
        # try to read user from request (without forcing auth)
        try:
            user = await get_current_user(request)
            target_id = user.get("company_id")
        except Exception:
            target_id = None

    if not target_id:
        return {
            "company_id": None,
            "primary_color": "#2563EB",
            "secondary_color": "#3B82F6",
            "logo_url": None,
            "banner_logo_url": None,
            "signature_url": None,
            "footer_text": "© Aptiva",
            "footer_image_url": None,
        }

    company = await db.companies.find_one({"company_id": target_id})
    if not company:
        return {
            "company_id": None,
            "primary_color": "#2563EB",
            "secondary_color": "#3B82F6",
        }
    return {
        "company_id": company["company_id"],
        "primary_color": company.get("primary_color") or "#2563EB",
        "secondary_color": company.get("secondary_color") or "#3B82F6",
        "logo_url": company.get("logo_url"),
        "banner_logo_url": company.get("banner_logo_url"),
        "signature_url": company.get("signature_url"),
        "footer_text": company.get("footer_text"),
        "footer_image_url": company.get("footer_image_url"),
    }


@v2_router.put("/branding")
async def update_branding(payload: Dict[str, Any], admin: dict = Depends(require_admin)):
    company_id = admin.get("company_id")
    if not company_id:
        raise HTTPException(400, "Super admin must specify company_id explicitly")
    allowed = {"primary_color", "secondary_color", "footer_text"}
    update_data = {k: v for k, v in payload.items() if k in allowed and v is not None}
    if not update_data:
        raise HTTPException(400, "No valid fields to update")
    await db.companies.update_one({"company_id": company_id}, {"$set": update_data})
    return await get_branding(company_id=company_id)


async def _save_branding_image(folder: str, field: str, file: UploadFile, admin: dict):
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        raise HTTPException(400, "Only PNG/JPG files allowed")
    company_id = admin.get("company_id")
    if not company_id:
        raise HTTPException(400, "Company scope required")
    ext = "png" if file.filename.lower().endswith(".png") else "jpg"
    filename = f"{company_id}_{field}_{uuid.uuid4().hex[:8]}.{ext}"
    content = await file.read()
    await upload_to_storage(folder, filename, content, f"image/{'jpeg' if ext == 'jpg' else 'png'}")
    url = f"/api/files/{folder}/{filename}"
    await db.companies.update_one({"company_id": company_id}, {"$set": {field: url}})
    return {field: url}


@v2_router.post("/branding/logo")
async def upload_branding_logo(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    return await _save_branding_image("logos", "logo_url", file, admin)


@v2_router.post("/branding/banner-logo")
async def upload_branding_banner(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    return await _save_branding_image("logos", "banner_logo_url", file, admin)


@v2_router.post("/branding/signature")
async def upload_branding_signature(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    return await _save_branding_image("signatures", "signature_url", file, admin)


@v2_router.post("/branding/footer")
async def upload_branding_footer(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    return await _save_branding_image("logos", "footer_image_url", file, admin)


# ============================================================
# AREAS (scoped by company)
# ============================================================
@v2_router.get("/areas")
async def list_areas(user: dict = Depends(get_current_user)):
    return await db.areas.find(scoped_filter(user)).sort("name", 1).to_list(500)


@v2_router.post("/areas")
async def create_area(data: AreaCreate, admin: dict = Depends(require_admin)):
    company_id = admin.get("company_id")
    if not company_id:
        raise HTTPException(400, "Company scope required")
    doc = {
        "area_id": f"area_{uuid.uuid4().hex[:12]}",
        "company_id": company_id,
        "name": data.name,
        "description": data.description,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await db.areas.insert_one(doc)
    except Exception as e:
        raise HTTPException(400, f"Could not create area: {e}")
    return doc


@v2_router.put("/areas/{area_id}")
async def update_area(area_id: str, data: AreaUpdate, admin: dict = Depends(require_admin)):
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")
    f = scoped_filter(admin, {"area_id": area_id})
    res = await db.areas.update_one(f, {"$set": payload})
    if res.matched_count == 0:
        raise HTTPException(404, "Area not found")
    return await db.areas.find_one(f)


@v2_router.delete("/areas/{area_id}")
async def delete_area(area_id: str, admin: dict = Depends(require_admin)):
    f = scoped_filter(admin, {"area_id": area_id})
    res = await db.areas.delete_one(f)
    if res.deleted_count == 0:
        raise HTTPException(404, "Area not found")
    return {"deleted": True}


# ============================================================
# DOCUMENT TYPES (scoped by company; dynamic per company)
# ============================================================
@v2_router.get("/document-types")
async def list_document_types(user: dict = Depends(get_current_user)):
    return await db.document_types.find(scoped_filter(user)).sort("name", 1).to_list(500)


@v2_router.post("/document-types")
async def create_document_type(data: DocumentTypeCreate, admin: dict = Depends(require_admin)):
    company_id = admin.get("company_id")
    if not company_id:
        raise HTTPException(400, "Company scope required")
    doc = {
        "document_type_id": f"doctype_{uuid.uuid4().hex[:12]}",
        "company_id": company_id,
        "name": data.name,
        "description": data.description,
        "requires_expiry": data.requires_expiry,
        "area_ids": data.area_ids,
        "activity_ids": data.activity_ids,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.document_types.insert_one(doc)
    return doc


@v2_router.put("/document-types/{doctype_id}")
async def update_document_type(doctype_id: str, data: DocumentTypeUpdate, admin: dict = Depends(require_admin)):
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")
    f = scoped_filter(admin, {"document_type_id": doctype_id})
    res = await db.document_types.update_one(f, {"$set": payload})
    if res.matched_count == 0:
        raise HTTPException(404, "Document type not found")
    return await db.document_types.find_one(f)


@v2_router.delete("/document-types/{doctype_id}")
async def delete_document_type(doctype_id: str, admin: dict = Depends(require_admin)):
    f = scoped_filter(admin, {"document_type_id": doctype_id})
    res = await db.document_types.delete_one(f)
    if res.deleted_count == 0:
        raise HTTPException(404, "Document type not found")
    return {"deleted": True}


# ============================================================
# WORKER DOCUMENTS (per-user, multiple files per type, with expiry)
# ============================================================
@v2_router.get("/worker-documents/{user_id}")
async def get_worker_documents(user_id: str, user: dict = Depends(get_current_user)):
    """Return all worker_documents for the given user.
    A trabajador can only access their own; admin can access anyone in their company."""
    if not user.get("is_admin") and not user.get("is_super_admin"):
        if user["user_id"] != user_id:
            raise HTTPException(403, "Forbidden")
    f = scoped_filter(user, {"user_id": user_id})
    return await db.worker_documents.find(f).to_list(500)


@v2_router.post("/worker-documents/{user_id}/upload")
async def upload_worker_document(
    user_id: str,
    document_type_id: str = Form(...),
    expiry_date: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    admin: dict = Depends(require_admin),
):
    """Admin uploads a file for a given user + document_type. Appends to files JSONB list."""
    company_id = admin.get("company_id")
    target_user = await db.users.find_one({"user_id": user_id})
    if not target_user or (company_id and target_user.get("company_id") != company_id):
        raise HTTPException(404, "User not found in your company")

    doctype = await db.document_types.find_one(scoped_filter(admin, {"document_type_id": document_type_id}))
    if not doctype:
        raise HTTPException(404, "Document type not found")

    content = await file.read()
    ext = file.filename.split('.')[-1].lower() if '.' in file.filename else 'bin'
    safe_filename = f"{company_id}_{user_id}_{document_type_id}_{uuid.uuid4().hex[:8]}.{ext}"
    await upload_to_storage("materials", safe_filename, content,
                            file.content_type or "application/octet-stream")
    file_url = f"/api/files/materials/{safe_filename}"

    new_file = {
        "file_url": file_url,
        "original_name": file.filename,
        "expiry_date": expiry_date,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "uploaded_by": admin["user_id"],
    }

    # Upsert: 1 worker_document row per (user_id, document_type_id)
    existing = await db.worker_documents.find_one({
        "user_id": user_id, "document_type_id": document_type_id
    })
    if existing:
        files = existing.get("files") or []
        files.append(new_file)
        await db.worker_documents.update_one(
            {"worker_document_id": existing["worker_document_id"]},
            {"$set": {"files": files, "notes": notes or existing.get("notes"),
                      "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        return await db.worker_documents.find_one({"worker_document_id": existing["worker_document_id"]})
    else:
        wd_id = f"wdoc_{uuid.uuid4().hex[:12]}"
        doc = {
            "worker_document_id": wd_id,
            "company_id": company_id,
            "user_id": user_id,
            "document_type_id": document_type_id,
            "files": [new_file],
            "notes": notes,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.worker_documents.insert_one(doc)
        return doc


@v2_router.delete("/worker-documents/{worker_doc_id}/files/{file_idx}")
async def delete_worker_document_file(worker_doc_id: str, file_idx: int, admin: dict = Depends(require_admin)):
    """Remove a single file from the worker_document's files array."""
    f = scoped_filter(admin, {"worker_document_id": worker_doc_id})
    wd = await db.worker_documents.find_one(f)
    if not wd:
        raise HTTPException(404, "Worker document not found")
    files = wd.get("files") or []
    if file_idx < 0 or file_idx >= len(files):
        raise HTTPException(400, "Invalid file index")
    files.pop(file_idx)
    await db.worker_documents.update_one(
        {"worker_document_id": worker_doc_id},
        {"$set": {"files": files, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"deleted": True, "remaining_files": len(files)}


@v2_router.get("/my-documents")
async def list_my_documents(user: dict = Depends(get_current_user)):
    """Trabajador self-service: returns the required document types for them + their uploaded files."""
    company_id = user.get("company_id")
    if not company_id:
        return []

    # Determine required document types for this user based on their areas/activities
    user_areas = set(user.get("area_ids") or [])
    user_acts = set(user.get("activity_ids") or [])

    all_types = await db.document_types.find({"company_id": company_id, "is_active": True}).to_list(500)
    required = []
    for dt in all_types:
        dt_areas = set(dt.get("area_ids") or [])
        dt_acts = set(dt.get("activity_ids") or [])
        # If doc type has no area/activity restrictions, applies to all
        # Else, must match at least one of user's areas or activities
        if (not dt_areas and not dt_acts) or (dt_areas & user_areas) or (dt_acts & user_acts):
            required.append(dt)

    # Get worker_documents already uploaded
    wdocs = await db.worker_documents.find({"user_id": user["user_id"]}).to_list(500)
    wdocs_by_type = {w["document_type_id"]: w for w in wdocs}

    result = []
    for dt in required:
        wd = wdocs_by_type.get(dt["document_type_id"])
        result.append({
            "document_type": dt,
            "worker_document": wd,
            "uploaded_files_count": len(wd["files"]) if wd and wd.get("files") else 0,
        })
    return result


# ============================================================
# BULK USER IMPORT (CSV)
# ============================================================
@v2_router.post("/users/bulk-import")
async def bulk_import_users(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    """
    CSV columns expected (header row required):
        email,password,full_name,rut,area_names,activity_names
    area_names and activity_names are semicolon-separated.
    Matches existing areas/activities by name; missing ones are skipped (not auto-created).
    """
    company_id = admin.get("company_id")
    if not company_id:
        raise HTTPException(400, "Company scope required")

    content = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))

    # Build name->id lookup for areas and activities of THIS company
    areas = await db.areas.find({"company_id": company_id}).to_list(500)
    activities = await db.activities.find({"company_id": company_id}).to_list(500)
    area_by_name = {a["name"].strip().upper(): a["area_id"] for a in areas}
    act_by_name = {a["name"].strip().upper(): a["activity_id"] for a in activities}

    # Re-import auth deps from server.py
    from server import default_password_from_rut

    created, errors, skipped = [], [], []
    for i, row in enumerate(reader, start=2):  # row 1 = header
        try:
            email = (row.get("email") or "").strip().lower()
            password = (row.get("password") or "").strip()
            full_name = (row.get("full_name") or "").strip()
            rut = (row.get("rut") or "").strip() or None
            if not email or not full_name:
                errors.append({"row": i, "error": "Missing email/full_name"})
                continue
            if not password:
                password = default_password_from_rut(rut) or ""
            if not password:
                errors.append({"row": i, "error": "Sin contraseña y RUT con menos de 5 dígitos"})
                continue

            existing = await db.users.find_one({"email": email})
            if existing:
                skipped.append({"row": i, "email": email, "reason": "already exists"})
                continue

            user_area_ids, user_act_ids = [], []
            for nm in (row.get("area_names") or "").split(";"):
                k = nm.strip().upper()
                if k and k in area_by_name:
                    user_area_ids.append(area_by_name[k])
            for nm in (row.get("activity_names") or "").split(";"):
                k = nm.strip().upper()
                if k and k in act_by_name:
                    user_act_ids.append(act_by_name[k])

            uid = f"user_{uuid.uuid4().hex[:12]}"
            await db.users.insert_one({
                "user_id": uid,
                "company_id": company_id,
                "email": email,
                "password_hash": hash_password(password),
                "full_name": full_name,
                "rut": rut,
                "is_super_admin": False,
                "is_admin": False,
                "is_active": True,
                "area_ids": user_area_ids,
                "activity_ids": user_act_ids,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            created.append({"row": i, "email": email, "user_id": uid})
        except Exception as e:
            errors.append({"row": i, "error": str(e)})

    return {"created": created, "skipped": skipped, "errors": errors,
            "summary": {"created": len(created), "skipped": len(skipped), "errors": len(errors)}}



# ============================================================
# COMPETENCIES (F4 — catálogo por empresa)
# ============================================================

@v2_router.get("/competencies")
async def list_competencies(user: dict = Depends(get_current_user)):
    f = scoped_filter(user, {"is_active": True})
    return await db.competencies.find(f).sort("name", 1).to_list(500)


@v2_router.post("/competencies")
async def create_competency(data: CompetencyCreate, admin: dict = Depends(require_admin)):
    company_id = admin.get("company_id")
    if not company_id:
        raise HTTPException(400, "Company scope required")
    existing = await db.competencies.find_one({"company_id": company_id, "name": data.name})
    if existing:
        raise HTTPException(400, f"Competencia '{data.name}' ya existe en tu empresa")
    cid = f"comp_{uuid.uuid4().hex[:12]}"
    doc = {
        "competency_id": cid,
        "company_id": company_id,
        "name": data.name,
        "description": data.description,
        "validity_months": data.validity_months,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.competencies.insert_one(doc)
    return doc


@v2_router.put("/competencies/{competency_id}")
async def update_competency(competency_id: str, data: CompetencyUpdate, admin: dict = Depends(require_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(400, "No update data")
    f = scoped_filter(admin, {"competency_id": competency_id})
    res = await db.competencies.update_one(f, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(404, "Competencia no encontrada")
    return await db.competencies.find_one(f)


@v2_router.delete("/competencies/{competency_id}")
async def delete_competency(competency_id: str, admin: dict = Depends(require_admin)):
    f = scoped_filter(admin, {"competency_id": competency_id})
    res = await db.competencies.delete_one(f)
    if res.deleted_count == 0:
        raise HTTPException(404, "Competencia no encontrada")
    return {"deleted": True}


# ============================================================
# WORKER COMPETENCIES
# ============================================================

def _compute_expiry(validity_months: Optional[int], base: Optional[datetime] = None) -> Optional[str]:
    if not validity_months:
        return None
    base = base or datetime.now(timezone.utc)
    # rough month math (30-day months — enough for compliance UI)
    return (base + timedelta(days=validity_months * 30)).isoformat()


@v2_router.get("/worker-competencies/{user_id}")
async def get_worker_competencies(user_id: str, user: dict = Depends(get_current_user)):
    company_id = user.get("company_id")
    if not company_id:
        return []
    target = await db.users.find_one({"user_id": user_id, "company_id": company_id})
    if not target:
        raise HTTPException(404, "Trabajador no encontrado")
    return await db.worker_competencies.find({"user_id": user_id, "company_id": company_id}).to_list(500)


@v2_router.post("/worker-competencies/{user_id}/upload")
async def upload_worker_competency(
    user_id: str,
    competency_id: str = Form(...),
    expiry_date: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    admin: dict = Depends(require_admin),
):
    """Admin manually grants a competency to a worker (with optional evidence file)."""
    company_id = admin.get("company_id")
    target = await db.users.find_one({"user_id": user_id, "company_id": company_id})
    if not target:
        raise HTTPException(404, "Trabajador no encontrado")

    competency = await db.competencies.find_one({"competency_id": competency_id, "company_id": company_id})
    if not competency:
        raise HTTPException(404, "Competencia no encontrada")

    file_url = None
    original_name = None
    if file is not None:
        content = await file.read()
        ext = (file.filename or "file").rsplit(".", 1)[-1].lower()
        stored_name = f"{company_id}_{user_id}_{competency_id}_{uuid.uuid4().hex[:8]}.{ext}"
        await upload_to_storage("materials", stored_name, content, file.content_type or "application/octet-stream")
        file_url = f"/api/files/materials/{stored_name}"
        original_name = file.filename

    # If admin provided no expiry but the competency has validity_months, auto-compute
    final_expiry = expiry_date
    if not final_expiry and competency.get("validity_months"):
        final_expiry = _compute_expiry(competency["validity_months"])

    existing = await db.worker_competencies.find_one({"user_id": user_id, "competency_id": competency_id})
    now_iso = datetime.now(timezone.utc).isoformat()
    if existing:
        update = {
            "source": "manual",
            "source_course_id": None,
            "acquired_at": now_iso,
            "expiry_date": final_expiry,
            "notes": notes,
            "uploaded_by": admin["user_id"],
        }
        if file_url:
            update["file_url"] = file_url
            update["original_name"] = original_name
        await db.worker_competencies.update_one(
            {"worker_competency_id": existing["worker_competency_id"]},
            {"$set": update},
        )
        return await db.worker_competencies.find_one({"worker_competency_id": existing["worker_competency_id"]})

    wc_id = f"wcomp_{uuid.uuid4().hex[:12]}"
    doc = {
        "worker_competency_id": wc_id,
        "company_id": company_id,
        "user_id": user_id,
        "competency_id": competency_id,
        "source": "manual",
        "source_course_id": None,
        "acquired_at": now_iso,
        "expiry_date": final_expiry,
        "file_url": file_url,
        "original_name": original_name,
        "notes": notes,
        "uploaded_by": admin["user_id"],
        "created_at": now_iso,
    }
    await db.worker_competencies.insert_one(doc)
    return doc


@v2_router.delete("/worker-competencies/{worker_competency_id}")
async def delete_worker_competency(worker_competency_id: str, admin: dict = Depends(require_admin)):
    f = scoped_filter(admin, {"worker_competency_id": worker_competency_id})
    res = await db.worker_competencies.delete_one(f)
    if res.deleted_count == 0:
        raise HTTPException(404, "No encontrado")
    return {"deleted": True}


# ============================================================
# WORKER SELF-SERVICE — Mis Competencias
# ============================================================

@v2_router.get("/my-competencies")
async def list_my_competencies(user: dict = Depends(get_current_user)):
    """Returns required competencies for this worker (based on their activities) + acquisition status."""
    company_id = user.get("company_id")
    if not company_id:
        return []

    # Collect required competency_ids from worker's activities
    user_acts = user.get("activity_ids") or []
    required_comp_ids: set = set()
    if user_acts:
        acts = await db.activities.find({"activity_id": {"$in": user_acts}, "company_id": company_id}).to_list(200)
        for a in acts:
            for cid in (a.get("competency_ids") or []):
                required_comp_ids.add(cid)

    # Always also include any competency the worker has already acquired (so the admin can grant ad-hoc)
    own_wcs = await db.worker_competencies.find({"user_id": user["user_id"], "company_id": company_id}).to_list(500)
    own_by_comp = {w["competency_id"]: w for w in own_wcs}
    for cid in own_by_comp.keys():
        required_comp_ids.add(cid)

    if not required_comp_ids:
        return []

    comps = await db.competencies.find({"competency_id": {"$in": list(required_comp_ids)}, "company_id": company_id, "is_active": True}).to_list(500)

    result = []
    for c in comps:
        result.append({
            "competency": c,
            "worker_competency": own_by_comp.get(c["competency_id"]),
        })
    # Sort: by competency name
    result.sort(key=lambda x: (x["competency"].get("name") or "").lower())
    return result


# ============================================================
# Helper for course completion auto-grant (called from server.py)
# ============================================================

async def grant_competencies_for_course_completion(user_id: str, company_id: str, course: dict):
    """Auto-grant any competencies the course is configured to grant.
    Idempotent: existing acquired rows for the same (user, competency) are refreshed to source='course'.
    """
    grant_ids = course.get("grants_competency_ids") or []
    if not grant_ids:
        return
    comps = await db.competencies.find({"competency_id": {"$in": grant_ids}, "company_id": company_id, "is_active": True}).to_list(200)
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    for c in comps:
        expiry = _compute_expiry(c.get("validity_months"), base=now)
        existing = await db.worker_competencies.find_one({"user_id": user_id, "competency_id": c["competency_id"]})
        if existing:
            await db.worker_competencies.update_one(
                {"worker_competency_id": existing["worker_competency_id"]},
                {"$set": {
                    "source": "course",
                    "source_course_id": course["course_id"],
                    "acquired_at": now_iso,
                    "expiry_date": expiry,
                }},
            )
        else:
            await db.worker_competencies.insert_one({
                "worker_competency_id": f"wcomp_{uuid.uuid4().hex[:12]}",
                "company_id": company_id,
                "user_id": user_id,
                "competency_id": c["competency_id"],
                "source": "course",
                "source_course_id": course["course_id"],
                "acquired_at": now_iso,
                "expiry_date": expiry,
                "file_url": None,
                "original_name": None,
                "notes": f"Otorgada por curso: {course.get('name','')}",
                "uploaded_by": None,
                "created_at": now_iso,
            })



# ============================================================
# COMPLIANCE HEATMAP (admin only)
# ============================================================

def _is_vigent(expiry_value, now: datetime) -> bool:
    """True if the worker_competency has no expiry or expires in the future."""
    if not expiry_value:
        return True
    try:
        if isinstance(expiry_value, str):
            dt = datetime.fromisoformat(expiry_value.replace("Z", "+00:00"))
        else:
            dt = expiry_value
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt > now
    except Exception:
        return True


async def _compute_compliance_matrix(company_id: str):
    """Build the activity × competency matrix for a company."""
    now = datetime.now(timezone.utc)

    activities = await db.activities.find({"company_id": company_id}).sort("name", 1).to_list(500)
    competencies = await db.competencies.find({"company_id": company_id, "is_active": True}).sort("name", 1).to_list(500)
    workers = await db.users.find({"company_id": company_id, "is_admin": False, "is_super_admin": False}).to_list(2000)
    wcs = await db.worker_competencies.find({"company_id": company_id}).to_list(5000)

    wc_index: Dict[tuple, Dict[str, Any]] = {}
    for w in wcs:
        wc_index[(w["user_id"], w["competency_id"])] = w

    workers_by_activity: Dict[str, List[Dict[str, Any]]] = {}
    for w in workers:
        for aid in (w.get("activity_ids") or []):
            workers_by_activity.setdefault(aid, []).append(w)

    cells: List[Dict[str, Any]] = []
    for a in activities:
        a_comp_ids = a.get("competency_ids") or []
        if not a_comp_ids:
            continue
        a_workers = workers_by_activity.get(a["activity_id"], [])
        for cid in a_comp_ids:
            comp = next((c for c in competencies if c["competency_id"] == cid), None)
            if not comp:
                continue
            total = len(a_workers)
            acquired = 0
            expired = 0
            pending = 0
            for w in a_workers:
                wc = wc_index.get((w["user_id"], cid))
                if wc and _is_vigent(wc.get("expiry_date"), now):
                    acquired += 1
                elif wc and not _is_vigent(wc.get("expiry_date"), now):
                    expired += 1
                else:
                    pending += 1
            pct = int(round((acquired / total) * 100)) if total > 0 else 0
            cells.append({
                "activity_id": a["activity_id"],
                "activity_name": a["name"],
                "competency_id": comp["competency_id"],
                "competency_name": comp["name"],
                "validity_months": comp.get("validity_months"),
                "total_workers": total,
                "acquired": acquired,
                "expired": expired,
                "pending": pending,
                "percentage": pct,
            })

    total_cells = len(cells)
    if total_cells:
        avg_pct = int(round(sum(c["percentage"] for c in cells) / total_cells))
        critical_cells = [c for c in cells if c["percentage"] < 50]
        green_cells = [c for c in cells if c["percentage"] >= 80]
    else:
        avg_pct = 0
        critical_cells = []
        green_cells = []

    return {
        "activities": [{"activity_id": a["activity_id"], "name": a["name"]} for a in activities if (a.get("competency_ids") or [])],
        "competencies": [{"competency_id": c["competency_id"], "name": c["name"]} for c in competencies],
        "cells": cells,
        "summary": {
            "total_cells": total_cells,
            "average_compliance": avg_pct,
            "critical_count": len(critical_cells),
            "green_count": len(green_cells),
            "total_workers": len(workers),
        },
        "generated_at": now.isoformat(),
    }


@v2_router.get("/compliance/heatmap")
async def get_compliance_heatmap(admin: dict = Depends(require_admin)):
    company_id = admin.get("company_id")
    if not company_id:
        raise HTTPException(400, "Company scope required")
    return await _compute_compliance_matrix(company_id)


@v2_router.get("/compliance/heatmap/export")
async def export_compliance_heatmap(admin: dict = Depends(require_admin)):
    """Returns the matrix as a CSV file ready for an audit binder."""
    from fastapi.responses import StreamingResponse
    company_id = admin.get("company_id")
    if not company_id:
        raise HTTPException(400, "Company scope required")
    company = await db.companies.find_one({"company_id": company_id})
    matrix = await _compute_compliance_matrix(company_id)

    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=";", quoting=csv.QUOTE_MINIMAL)
    writer.writerow(["Aptiva — Reporte de Cumplimiento de Competencias"])
    writer.writerow([f"Empresa: {company.get('name') if company else ''}"])
    writer.writerow([f"RUT: {company.get('rut') or '' if company else ''}"])
    writer.writerow([f"Generado: {matrix['generated_at']}"])
    writer.writerow([])
    writer.writerow([
        "Actividad",
        "Competencia",
        "Vigencia (meses)",
        "Trabajadores en actividad",
        "Acreditados vigentes",
        "Vencidos",
        "Pendientes",
        "% Cumplimiento",
        "Estado",
    ])
    for c in matrix["cells"]:
        if c["percentage"] >= 80:
            state = "OK"
        elif c["percentage"] >= 50:
            state = "Atencion"
        else:
            state = "Critico"
        writer.writerow([
            c["activity_name"],
            c["competency_name"],
            c["validity_months"] if c["validity_months"] else "Sin vencimiento",
            c["total_workers"],
            c["acquired"],
            c["expired"],
            c["pending"],
            f"{c['percentage']}%",
            state,
        ])
    writer.writerow([])
    s = matrix["summary"]
    writer.writerow(["Resumen"])
    writer.writerow(["Total trabajadores", s["total_workers"]])
    writer.writerow(["Cumplimiento promedio", f"{s['average_compliance']}%"])
    writer.writerow(["Celdas criticas (<50%)", s["critical_count"]])
    writer.writerow(["Celdas en verde (>=80%)", s["green_count"]])

    filename = f"aptiva_cumplimiento_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M')}.csv"
    content = ("\ufeff" + buf.getvalue()).encode("utf-8")
    return StreamingResponse(
        io.BytesIO(content),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ============================================================
# COMPANY PROFILE (admin self-service)
# ============================================================

# Fields the admin is NOT allowed to change on their own company.
_PROTECTED_COMPANY_FIELDS = {"is_active", "company_type"}


@v2_router.get("/company")
async def get_my_company(admin: dict = Depends(require_admin)):
    """Admin gets their own company profile."""
    company_id = admin.get("company_id")
    if not company_id:
        raise HTTPException(400, "Sin empresa asociada")
    company = await db.companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(404, "Empresa no encontrada")
    return company


@v2_router.put("/company")
async def update_my_company(data: CompanyUpdate, admin: dict = Depends(require_admin)):
    """Admin updates their own company (cannot touch is_active)."""
    company_id = admin.get("company_id")
    if not company_id:
        raise HTTPException(400, "Sin empresa asociada")
    update_data = {
        k: v for k, v in data.model_dump().items()
        if v is not None and k not in _PROTECTED_COMPANY_FIELDS
    }
    if not update_data:
        raise HTTPException(400, "Nada que actualizar")
    res = await db.companies.update_one({"company_id": company_id}, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(404, "Empresa no encontrada")
    return await db.companies.find_one({"company_id": company_id})



# ============================================================
# MANDANTES (only available when company_type == 'contratista')
# ============================================================

class MandanteCreate(BaseModel):
    name: str
    rut: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class MandanteUpdate(BaseModel):
    name: Optional[str] = None
    rut: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


async def _require_company_type(admin: dict, expected: str) -> str:
    """Ensure the admin's company has the expected company_type. Returns company_id."""
    company_id = admin.get("company_id")
    if not company_id:
        raise HTTPException(400, "Sin empresa asociada")
    company = await db.companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(404, "Empresa no encontrada")
    if (company.get("company_type") or "") != expected:
        raise HTTPException(403, f"Esta funcionalidad solo está disponible para empresas de tipo '{expected}'.")
    return company_id


@v2_router.get("/mandantes")
async def list_mandantes(admin: dict = Depends(require_admin)):
    company_id = await _require_company_type(admin, "contratista")
    return await db.mandantes.find({"company_id": company_id}).sort("name", 1).to_list(500)


@v2_router.post("/mandantes")
async def create_mandante(data: MandanteCreate, admin: dict = Depends(require_admin)):
    company_id = await _require_company_type(admin, "contratista")
    existing = await db.mandantes.find_one({"company_id": company_id, "name": data.name})
    if existing:
        raise HTTPException(400, f"Mandante '{data.name}' ya existe")
    doc = {
        "mandante_id": f"mandante_{uuid.uuid4().hex[:12]}",
        "company_id": company_id,
        "name": data.name,
        "rut": data.rut,
        "contact_email": data.contact_email,
        "contact_phone": data.contact_phone,
        "address": data.address,
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.mandantes.insert_one(doc)
    return doc


@v2_router.put("/mandantes/{mandante_id}")
async def update_mandante(mandante_id: str, data: MandanteUpdate, admin: dict = Depends(require_admin)):
    company_id = await _require_company_type(admin, "contratista")
    upd = {k: v for k, v in data.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(400, "Nada que actualizar")
    res = await db.mandantes.update_one({"mandante_id": mandante_id, "company_id": company_id}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(404, "Mandante no encontrado")
    return await db.mandantes.find_one({"mandante_id": mandante_id})


@v2_router.delete("/mandantes/{mandante_id}")
async def delete_mandante(mandante_id: str, admin: dict = Depends(require_admin)):
    company_id = await _require_company_type(admin, "contratista")
    res = await db.mandantes.delete_one({"mandante_id": mandante_id, "company_id": company_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Mandante no encontrado")
    return {"deleted": True}


# ============================================================
# CONTRATOS (contratista only)
# ============================================================

class ContractCreate(BaseModel):
    mandante_id: str
    contract_number: str
    glosa: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str = "active"
    notes: Optional[str] = None
    worker_ids: List[str] = []


class ContractUpdate(BaseModel):
    mandante_id: Optional[str] = None
    contract_number: Optional[str] = None
    glosa: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    worker_ids: Optional[List[str]] = None


@v2_router.get("/contracts")
async def list_contracts(mandante_id: Optional[str] = None, admin: dict = Depends(require_admin)):
    company_id = await _require_company_type(admin, "contratista")
    f = {"company_id": company_id}
    if mandante_id:
        f["mandante_id"] = mandante_id
    return await db.contracts.find(f).sort("created_at", -1).to_list(1000)


@v2_router.post("/contracts")
async def create_contract(data: ContractCreate, admin: dict = Depends(require_admin)):
    company_id = await _require_company_type(admin, "contratista")
    # Validate mandante
    mandante = await db.mandantes.find_one({"mandante_id": data.mandante_id, "company_id": company_id})
    if not mandante:
        raise HTTPException(404, "Mandante no encontrado")
    # Unique contract_number per company
    existing = await db.contracts.find_one({"company_id": company_id, "contract_number": data.contract_number})
    if existing:
        raise HTTPException(400, f"Contrato N° '{data.contract_number}' ya existe")
    doc = {
        "contract_id": f"contract_{uuid.uuid4().hex[:12]}",
        "company_id": company_id,
        "mandante_id": data.mandante_id,
        "contract_number": data.contract_number,
        "glosa": data.glosa,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "status": data.status,
        "notes": data.notes,
        "worker_ids": data.worker_ids,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.contracts.insert_one(doc)
    return doc


@v2_router.put("/contracts/{contract_id}")
async def update_contract(contract_id: str, data: ContractUpdate, admin: dict = Depends(require_admin)):
    company_id = await _require_company_type(admin, "contratista")
    upd = {k: v for k, v in data.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(400, "Nada que actualizar")
    if "mandante_id" in upd:
        m = await db.mandantes.find_one({"mandante_id": upd["mandante_id"], "company_id": company_id})
        if not m:
            raise HTTPException(404, "Mandante no encontrado")
    res = await db.contracts.update_one({"contract_id": contract_id, "company_id": company_id}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(404, "Contrato no encontrado")
    return await db.contracts.find_one({"contract_id": contract_id})


@v2_router.delete("/contracts/{contract_id}")
async def delete_contract(contract_id: str, admin: dict = Depends(require_admin)):
    company_id = await _require_company_type(admin, "contratista")
    res = await db.contracts.delete_one({"contract_id": contract_id, "company_id": company_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Contrato no encontrado")
    return {"deleted": True}


# ============================================================
# GERENCIAS (mandante only)
# ============================================================

class GerenciaCreate(BaseModel):
    name: str
    description: Optional[str] = None
    worker_ids: List[str] = []


class GerenciaUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    worker_ids: Optional[List[str]] = None


@v2_router.get("/gerencias")
async def list_gerencias(admin: dict = Depends(require_admin)):
    company_id = await _require_company_type(admin, "mandante")
    return await db.gerencias.find({"company_id": company_id}).sort("name", 1).to_list(500)


@v2_router.post("/gerencias")
async def create_gerencia(data: GerenciaCreate, admin: dict = Depends(require_admin)):
    company_id = await _require_company_type(admin, "mandante")
    existing = await db.gerencias.find_one({"company_id": company_id, "name": data.name})
    if existing:
        raise HTTPException(400, f"Gerencia '{data.name}' ya existe")
    doc = {
        "gerencia_id": f"gerencia_{uuid.uuid4().hex[:12]}",
        "company_id": company_id,
        "name": data.name,
        "description": data.description,
        "worker_ids": data.worker_ids,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.gerencias.insert_one(doc)
    return doc


@v2_router.put("/gerencias/{gerencia_id}")
async def update_gerencia(gerencia_id: str, data: GerenciaUpdate, admin: dict = Depends(require_admin)):
    company_id = await _require_company_type(admin, "mandante")
    upd = {k: v for k, v in data.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(400, "Nada que actualizar")
    res = await db.gerencias.update_one({"gerencia_id": gerencia_id, "company_id": company_id}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(404, "Gerencia no encontrada")
    return await db.gerencias.find_one({"gerencia_id": gerencia_id})


@v2_router.delete("/gerencias/{gerencia_id}")
async def delete_gerencia(gerencia_id: str, admin: dict = Depends(require_admin)):
    company_id = await _require_company_type(admin, "mandante")
    res = await db.gerencias.delete_one({"gerencia_id": gerencia_id, "company_id": company_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Gerencia no encontrada")
    return {"deleted": True}



# ============================================================
# ESTÁNDAR DE ACREDITACIÓN (por mandante, contratista only)
# ============================================================

class StandardCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    order_index: int = 0


class StandardCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    order_index: Optional[int] = None


class StandardItemCreate(BaseModel):
    category_id: str
    name: str
    description: Optional[str] = None
    document_type_id: Optional[str] = None
    is_required: bool = True
    order_index: int = 0
    area_id: Optional[str] = None
    role_id: Optional[str] = None
    activity_id: Optional[str] = None


class StandardItemUpdate(BaseModel):
    category_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    document_type_id: Optional[str] = None
    is_required: Optional[bool] = None
    order_index: Optional[int] = None
    area_id: Optional[str] = None
    role_id: Optional[str] = None
    activity_id: Optional[str] = None


async def _ensure_mandante(admin: dict, mandante_id: str) -> str:
    """Verify mandante belongs to admin's contratista company. Returns company_id."""
    company_id = await _require_company_type(admin, "contratista")
    mandante = await db.mandantes.find_one({"mandante_id": mandante_id, "company_id": company_id})
    if not mandante:
        raise HTTPException(404, "Mandante no encontrado")
    return company_id


@v2_router.get("/mandantes/{mandante_id}/standard")
async def get_mandante_standard(mandante_id: str, admin: dict = Depends(require_admin)):
    """Returns the full accreditation standard (categories + items) for a mandante."""
    company_id = await _ensure_mandante(admin, mandante_id)
    cats = await db.mandante_standard_categories.find(
        {"mandante_id": mandante_id, "company_id": company_id}
    ).sort("order_index", 1).to_list(500)
    items = await db.mandante_standard_items.find(
        {"mandante_id": mandante_id, "company_id": company_id}
    ).sort("order_index", 1).to_list(2000)
    return {"categories": cats, "items": items}


@v2_router.post("/mandantes/{mandante_id}/standard/categories")
async def create_standard_category(mandante_id: str, data: StandardCategoryCreate, admin: dict = Depends(require_admin)):
    company_id = await _ensure_mandante(admin, mandante_id)
    existing = await db.mandante_standard_categories.find_one({"mandante_id": mandante_id, "name": data.name})
    if existing:
        raise HTTPException(400, f"Categoría '{data.name}' ya existe en este mandante")
    doc = {
        "category_id": f"mscat_{uuid.uuid4().hex[:12]}",
        "company_id": company_id,
        "mandante_id": mandante_id,
        "name": data.name,
        "description": data.description,
        "order_index": data.order_index,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.mandante_standard_categories.insert_one(doc)
    return doc


@v2_router.put("/mandantes/{mandante_id}/standard/categories/{category_id}")
async def update_standard_category(mandante_id: str, category_id: str, data: StandardCategoryUpdate, admin: dict = Depends(require_admin)):
    company_id = await _ensure_mandante(admin, mandante_id)
    upd = {k: v for k, v in data.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(400, "Nada que actualizar")
    res = await db.mandante_standard_categories.update_one(
        {"category_id": category_id, "mandante_id": mandante_id, "company_id": company_id},
        {"$set": upd},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Categoría no encontrada")
    return await db.mandante_standard_categories.find_one({"category_id": category_id})


@v2_router.delete("/mandantes/{mandante_id}/standard/categories/{category_id}")
async def delete_standard_category(mandante_id: str, category_id: str, admin: dict = Depends(require_admin)):
    company_id = await _ensure_mandante(admin, mandante_id)
    res = await db.mandante_standard_categories.delete_one(
        {"category_id": category_id, "mandante_id": mandante_id, "company_id": company_id}
    )
    if res.deleted_count == 0:
        raise HTTPException(404, "Categoría no encontrada")
    return {"deleted": True}


@v2_router.post("/mandantes/{mandante_id}/standard/items")
async def create_standard_item(mandante_id: str, data: StandardItemCreate, admin: dict = Depends(require_admin)):
    company_id = await _ensure_mandante(admin, mandante_id)
    cat = await db.mandante_standard_categories.find_one(
        {"category_id": data.category_id, "mandante_id": mandante_id}
    )
    if not cat:
        raise HTTPException(404, "Categoría no encontrada")
    doc = {
        "item_id": f"msitem_{uuid.uuid4().hex[:12]}",
        "company_id": company_id,
        "mandante_id": mandante_id,
        "category_id": data.category_id,
        "name": data.name,
        "description": data.description,
        "document_type_id": data.document_type_id,
        "is_required": data.is_required,
        "order_index": data.order_index,
        "area_id": data.area_id,
        "role_id": data.role_id,
        "activity_id": data.activity_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.mandante_standard_items.insert_one(doc)
    return doc


@v2_router.put("/mandantes/{mandante_id}/standard/items/{item_id}")
async def update_standard_item(mandante_id: str, item_id: str, data: StandardItemUpdate, admin: dict = Depends(require_admin)):
    company_id = await _ensure_mandante(admin, mandante_id)
    raw = data.model_dump(exclude_unset=True)
    # Allow nulling scope columns by passing empty string
    for k in ("area_id", "role_id", "activity_id", "document_type_id"):
        if k in raw and raw[k] == "":
            raw[k] = None
    upd = {k: v for k, v in raw.items() if not (v is None and k not in ("area_id", "role_id", "activity_id", "document_type_id"))}
    if not upd:
        raise HTTPException(400, "Nada que actualizar")
    res = await db.mandante_standard_items.update_one(
        {"item_id": item_id, "mandante_id": mandante_id, "company_id": company_id},
        {"$set": upd},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Ítem no encontrado")
    return await db.mandante_standard_items.find_one({"item_id": item_id})


@v2_router.delete("/mandantes/{mandante_id}/standard/items/{item_id}")
async def delete_standard_item(mandante_id: str, item_id: str, admin: dict = Depends(require_admin)):
    company_id = await _ensure_mandante(admin, mandante_id)
    res = await db.mandante_standard_items.delete_one(
        {"item_id": item_id, "mandante_id": mandante_id, "company_id": company_id}
    )
    if res.deleted_count == 0:
        raise HTTPException(404, "Ítem no encontrado")
    return {"deleted": True}



# ============================================================
# JOB ROLES / CARGOS (scoped by company)
# ============================================================

class JobRoleCreate(BaseModel):
    name: str
    description: Optional[str] = None


class JobRoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


@v2_router.get("/job-roles")
async def list_job_roles(user: dict = Depends(get_current_user)):
    return await db.job_roles.find(scoped_filter(user)).sort("name", 1).to_list(500)


@v2_router.post("/job-roles")
async def create_job_role(data: JobRoleCreate, admin: dict = Depends(require_admin)):
    company_id = admin.get("company_id")
    if not company_id:
        raise HTTPException(400, "Company scope required")
    existing = await db.job_roles.find_one({"company_id": company_id, "name": data.name})
    if existing:
        raise HTTPException(400, f"Cargo '{data.name}' ya existe")
    doc = {
        "role_id": f"jr_{uuid.uuid4().hex[:12]}",
        "company_id": company_id,
        "name": data.name,
        "description": data.description,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.job_roles.insert_one(doc)
    return doc


@v2_router.put("/job-roles/{role_id}")
async def update_job_role(role_id: str, data: JobRoleUpdate, admin: dict = Depends(require_admin)):
    upd = {k: v for k, v in data.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(400, "Nada que actualizar")
    f = scoped_filter(admin, {"role_id": role_id})
    res = await db.job_roles.update_one(f, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(404, "Cargo no encontrado")
    return await db.job_roles.find_one(f)


@v2_router.delete("/job-roles/{role_id}")
async def delete_job_role(role_id: str, admin: dict = Depends(require_admin)):
    f = scoped_filter(admin, {"role_id": role_id})
    # Clear role_id from ALL users in this company that reference this cargo
    from db_adapter import get_pool
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            'UPDATE "users" SET "role_id" = NULL WHERE "role_id" = $1 AND "company_id" = $2',
            role_id, admin.get("company_id"),
        )
    res = await db.job_roles.delete_one(f)
    if res.deleted_count == 0:
        raise HTTPException(404, "Cargo no encontrado")
    return {"deleted": True}
