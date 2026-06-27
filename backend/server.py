from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request, Response
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import io
import csv
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.graphics.shapes import Drawing, Line

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# PostgreSQL (Supabase) connection via MongoDB-compatible adapter
from db_adapter import db, close_pool, ping as db_ping
# Supabase Storage client
from storage_client import upload_to_storage, get_public_url

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'elearning_secret_key_2024_secure')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# File upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
(UPLOAD_DIR / "logos").mkdir(exist_ok=True)
(UPLOAD_DIR / "signatures").mkdir(exist_ok=True)
(UPLOAD_DIR / "materials").mkdir(exist_ok=True)

app = FastAPI(title="E-Learning Platform API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    rut: Optional[str] = None
    company: Optional[str] = None
    area_ids: List[str] = []
    activity_ids: List[str] = []
    is_admin: bool = False

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    company: Optional[str] = None
    area_ids: Optional[List[str]] = None
    activity_ids: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ActivityCreate(BaseModel):
    name: str
    description: Optional[str] = None
    course_ids: List[str] = []
    course_order: List[str] = []  # Ordered list of course_ids for curriculum path

class ActivityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    course_ids: Optional[List[str]] = None
    course_order: Optional[List[str]] = None

class CourseCreate(BaseModel):
    name: str
    description: str
    hours: int
    validity_hours: int
    training_type: str = "e-learning"
    video_url: Optional[str] = None
    status: str = "draft"
    prerequisites: List[str] = []
    area_ids: List[str] = []
    activity_ids: List[str] = []

class CourseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    hours: Optional[int] = None
    validity_hours: Optional[int] = None
    training_type: Optional[str] = None
    video_url: Optional[str] = None
    material_url: Optional[str] = None
    status: Optional[str] = None
    prerequisites: Optional[List[str]] = None
    area_ids: Optional[List[str]] = None
    activity_ids: Optional[List[str]] = None

class QuestionCreate(BaseModel):
    text: str
    options: List[str]
    correct_index: int

class EvaluationCreate(BaseModel):
    course_id: str
    questions: List[QuestionCreate]
    min_score: int = 70
    max_attempts: int = 3

class EvaluationUpdate(BaseModel):
    questions: Optional[List[QuestionCreate]] = None
    min_score: Optional[int] = None
    max_attempts: Optional[int] = None

class EvaluationSubmit(BaseModel):
    answers: List[int]

class BrandingUpdate(BaseModel):
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    footer_text: Optional[str] = None
    banner_logo_url: Optional[str] = None

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, is_admin: bool) -> str:
    payload = {
        "user_id": user_id,
        "is_admin": is_admin,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request):
    # Check cookie first, then header
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="No authentication token provided")
    
    # Check if it's a session token (Google OAuth)
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        expires_at = session.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    
    # Check if it's a JWT token
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user: dict = Depends(get_current_user)):
    """Requires admin (within their company) OR super_admin."""
    if not (user.get("is_admin") or user.get("is_super_admin")):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_super_admin(user: dict = Depends(get_current_user)):
    """Requires super_admin (global)."""
    if not user.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user


def get_user_company_id(user: dict) -> Optional[str]:
    """Returns the company_id that scopes a user's data access.
    For super_admin returns None (unrestricted)."""
    if user.get("is_super_admin"):
        return None
    return user.get("company_id")


def scoped_filter(user: dict, extra: Optional[dict] = None) -> dict:
    """Build a query filter that auto-scopes to the user's company.
    Super admins are NOT scoped (None means unscoped)."""
    f = dict(extra) if extra else {}
    if not user.get("is_super_admin"):
        f["company_id"] = user.get("company_id")
    return f

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    """Public register is DEPRECATED in multi-tenant mode.
    Users are created by company admin via /api/users or POST /api/users/bulk-import.
    Kept for backward compat: if no company_id is provided, returns 403."""
    raise HTTPException(
        status_code=403,
        detail="Self-registration disabled. Ask your company administrator to create your account."
    )

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is inactive")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["user_id"], user.get("is_admin", False))
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRATION_HOURS * 3600
    )
    
    user.pop("password_hash", None)
    return {"token": token, "user": user}

@api_router.post("/auth/session")
async def process_google_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        oauth_data = resp.json()
    
    email = oauth_data.get("email")
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": oauth_data.get("name"),
                "picture": oauth_data.get("picture")
            }}
        )
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "full_name": oauth_data.get("name", ""),
            "name": oauth_data.get("name", ""),
            "picture": oauth_data.get("picture"),
            "rut": "",
            "company": None,
            "role_id": None,
            "is_admin": False,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
        user.pop("_id", None)
    
    session_token = oauth_data.get("session_token")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 3600
    )
    
    user.pop("password_hash", None)
    return {"user": user, "token": session_token}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    user.pop("password_hash", None)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== USER ROUTES ====================

@api_router.post("/users")
async def create_user(data: UserCreate, admin: dict = Depends(require_admin)):
    """Admin creates a worker (or another admin) in their own company."""
    company_id = admin.get("company_id")
    if not company_id and not admin.get("is_super_admin"):
        raise HTTPException(400, "Company scope required")
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(400, "Email already registered")
    if data.rut and await db.users.find_one({"company_id": company_id, "rut": data.rut}):
        raise HTTPException(400, "RUT already registered in this company")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "company_id": company_id,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "full_name": data.full_name,
        "rut": data.rut,
        "company": data.company,
        "is_super_admin": False,
        "is_admin": data.is_admin,
        "is_active": True,
        "area_ids": data.area_ids,
        "activity_ids": data.activity_ids,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    doc.pop("password_hash", None)
    return doc

@api_router.get("/users")
async def get_users(admin: dict = Depends(require_admin)):
    users = await db.users.find(scoped_filter(admin, {"is_super_admin": {"$ne": True}}), {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, admin: dict = Depends(require_admin)):
    user = await db.users.find_one(scoped_filter(admin, {"user_id": user_id}), {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, data: UserUpdate, admin: dict = Depends(require_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    # Make sure target user is within admin's company
    existing = await db.users.find_one(scoped_filter(admin, {"user_id": user_id}))
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return user

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    existing = await db.users.find_one(scoped_filter(admin, {"user_id": user_id}))
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.delete_one({"user_id": user_id})
    return {"message": "User deleted"}

@api_router.get("/users/search/rut/{rut}")
async def search_user_by_rut(rut: str, admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"rut": rut}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get certificates
    certificates = await db.certificates.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    
    # Get course completions
    completions = await db.course_completions.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    
    return {
        "user": user,
        "certificates": certificates,
        "completions": completions
    }

# ==================== ROLE ROUTES ====================

# Predefined activity names (admin may seed these via POST /api/activities/predefined/init)
PREDEFINED_ROLES = [
    "TRABAJO EN ALTURA", "ARMADO DE ANDAMIOS", "OPERADOR PLATAFORMAS MÓVILES MOTORIZADAS",
    "OPERADOR GRÚA", "RIGGER", "IZAJE",
    "OPERADOR EQUIPO EXCAVACIÓN Y MOVIMIENTO DE TIERRA",
    "ESPACIOS CONFINADOS", "SOLDADOR",
    "ACTIVIDADES CON LLAMA ABIERTA O TRABAJOS EN CALIENTE",
    "ESPECIALISTA SEC CON INTERVENCIÓN EN LÍNEAS DE GAS",
    "OPERADOR EQUIPO RADIACTIVO", "AISLACIÓN Y BLOQUEO DE ENERGÍAS",
    "INSTALADOR ELÉCTRICO", "INTERVENCIÓN EN ENERGÍA ELÉCTRICA",
    "MANIPULADOR DE EXPLOSIVOS", "CONDUCCIÓN",
    "CONDUCCIÓN DE BUS O VEHÍCULOS DE TRANSPORTE DE CARGA", "CONDUCCIÓN MINA"
]

@api_router.get("/activities/predefined/list")
async def get_predefined_roles():
    return {"roles": PREDEFINED_ROLES}

@api_router.post("/activities/predefined/init")
async def init_predefined_roles(admin: dict = Depends(require_admin)):
    """Seed the predefined activities into the admin's company."""
    company_id = admin.get("company_id")
    if not company_id:
        raise HTTPException(400, "Company scope required")
    created = []
    for role_name in PREDEFINED_ROLES:
        existing = await db.activities.find_one({"company_id": company_id, "name": role_name})
        if not existing:
            await db.activities.insert_one({
                "activity_id": f"activity_{uuid.uuid4().hex[:12]}",
                "company_id": company_id,
                "name": role_name,
                "description": f"Actividad: {role_name}",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            created.append(role_name)
    return {"message": f"Created {len(created)} activities", "created": created}

@api_router.post("/activities")
async def create_activity(data: ActivityCreate, admin: dict = Depends(require_admin)):
    company_id = admin.get("company_id")
    if not company_id:
        raise HTTPException(400, "Company scope required")
    activity_id = f"activity_{uuid.uuid4().hex[:12]}"
    doc = {
        "activity_id": activity_id,
        "company_id": company_id,
        "name": data.name,
        "description": data.description,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.activities.insert_one(doc)
    return doc

@api_router.get("/activities")
async def get_activities(user: dict = Depends(get_current_user)):
    return await db.activities.find(scoped_filter(user)).sort("name", 1).to_list(500)

@api_router.get("/activities/{activity_id}")
async def get_activity(activity_id: str, user: dict = Depends(get_current_user)):
    a = await db.activities.find_one(scoped_filter(user, {"activity_id": activity_id}))
    if not a:
        raise HTTPException(status_code=404, detail="Activity not found")
    return a

@api_router.put("/activities/{activity_id}")
async def update_activity(activity_id: str, data: ActivityUpdate, admin: dict = Depends(require_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    f = scoped_filter(admin, {"activity_id": activity_id})
    res = await db.activities.update_one(f, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(404, "Activity not found")
    return await db.activities.find_one(f)

@api_router.delete("/activities/{activity_id}")
async def delete_activity(activity_id: str, admin: dict = Depends(require_admin)):
    f = scoped_filter(admin, {"activity_id": activity_id})
    res = await db.activities.delete_one(f)
    if res.deleted_count == 0:
        raise HTTPException(404, "Activity not found")
    return {"message": "Activity deleted"}

# ==================== COURSE ROUTES ====================

@api_router.post("/courses")
async def create_course(data: CourseCreate, admin: dict = Depends(require_admin)):
    company_id = admin.get("company_id")
    if not company_id:
        raise HTTPException(400, "Company scope required")
    course_id = f"course_{uuid.uuid4().hex[:12]}"
    course_doc = {
        "course_id": course_id,
        "company_id": company_id,
        "name": data.name,
        "description": data.description,
        "hours": data.hours,
        "validity_hours": data.validity_hours,
        "training_type": data.training_type,
        "video_url": data.video_url,
        "material_url": None,
        "status": data.status,
        "prerequisites": data.prerequisites,
        "area_ids": data.area_ids,
        "activity_ids": data.activity_ids,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.courses.insert_one(course_doc)
    return course_doc

@api_router.get("/courses")
async def get_courses(user: dict = Depends(get_current_user)):
    """
    Admin: all courses of their company.
    Trabajador: only published courses matching their area_ids/activity_ids.
    SuperAdmin: all courses (across all companies).
    """
    base = scoped_filter(user)
    if user.get("is_admin") or user.get("is_super_admin"):
        return await db.courses.find(base).to_list(500)

    # Worker: filter by published + (area/activity match)
    user_areas = user.get("area_ids") or []
    user_acts = user.get("activity_ids") or []
    base["status"] = "published"
    all_courses = await db.courses.find(base).to_list(500)
    result = []
    for c in all_courses:
        c_areas = c.get("area_ids") or []
        c_acts = c.get("activity_ids") or []
        # If course has no area/activity restrictions, show to everyone in company
        if (not c_areas and not c_acts) or \
           (any(a in user_areas for a in c_areas)) or \
           (any(a in user_acts for a in c_acts)):
            result.append(c)
    return result

@api_router.get("/courses/{course_id}")
async def get_course(course_id: str, user: dict = Depends(get_current_user)):
    course = await db.courses.find_one(scoped_filter(user, {"course_id": course_id}))
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

@api_router.put("/courses/{course_id}")
async def update_course(course_id: str, data: CourseUpdate, admin: dict = Depends(require_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    f = scoped_filter(admin, {"course_id": course_id})
    existing = await db.courses.find_one(f)
    if not existing:
        raise HTTPException(status_code=404, detail="Course not found")
    await db.courses.update_one({"course_id": course_id}, {"$set": update_data})
    return await db.courses.find_one({"course_id": course_id})

@api_router.delete("/courses/{course_id}")
async def delete_course(course_id: str, admin: dict = Depends(require_admin)):
    f = scoped_filter(admin, {"course_id": course_id})
    existing = await db.courses.find_one(f)
    if not existing:
        raise HTTPException(status_code=404, detail="Course not found")
    await db.courses.delete_one({"course_id": course_id})
    return {"message": "Course deleted"}

@api_router.post("/courses/{course_id}/material")
async def upload_course_material(course_id: str, file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")
    # Verify course is in admin's company
    course = await db.courses.find_one(scoped_filter(admin, {"course_id": course_id}))
    if not course:
        raise HTTPException(404, "Course not found")
    filename = f"{course_id}_{uuid.uuid4().hex[:8]}.pdf"
    content = await file.read()
    await upload_to_storage("materials", filename, content, "application/pdf")
    material_url = f"/api/files/materials/{filename}"
    await db.courses.update_one({"course_id": course_id}, {"$set": {"material_url": material_url}})
    return {"material_url": material_url}

# ==================== EVALUATION ROUTES ====================

@api_router.post("/evaluations")
async def create_evaluation(data: EvaluationCreate, admin: dict = Depends(require_admin)):
    company_id = admin.get("company_id")
    if not company_id:
        raise HTTPException(400, "Company scope required")
    # Verify course is in admin's company
    course = await db.courses.find_one({"company_id": company_id, "course_id": data.course_id})
    if not course:
        raise HTTPException(404, "Course not found in your company")
    # Check if evaluation exists for course
    existing = await db.evaluations.find_one({"course_id": data.course_id})
    if existing:
        raise HTTPException(status_code=400, detail="Evaluation already exists for this course")
    
    eval_id = f"eval_{uuid.uuid4().hex[:12]}"
    eval_doc = {
        "evaluation_id": eval_id,
        "company_id": company_id,
        "course_id": data.course_id,
        "questions": [q.model_dump() for q in data.questions],
        "min_score": data.min_score,
        "max_attempts": data.max_attempts,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.evaluations.insert_one(eval_doc)
    return eval_doc

@api_router.get("/evaluations/course/{course_id}")
async def get_evaluation_by_course(course_id: str, user: dict = Depends(get_current_user)):
    evaluation = await db.evaluations.find_one(scoped_filter(user, {"course_id": course_id}))
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return evaluation

@api_router.put("/evaluations/{eval_id}")
async def update_evaluation(eval_id: str, data: EvaluationUpdate, admin: dict = Depends(require_admin)):
    update_data = {}
    if data.questions is not None:
        update_data["questions"] = [q.model_dump() for q in data.questions]
    if data.min_score is not None:
        update_data["min_score"] = data.min_score
    if data.max_attempts is not None:
        update_data["max_attempts"] = data.max_attempts
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    existing = await db.evaluations.find_one(scoped_filter(admin, {"evaluation_id": eval_id}))
    if not existing:
        raise HTTPException(404, "Evaluation not found")
    await db.evaluations.update_one({"evaluation_id": eval_id}, {"$set": update_data})
    return await db.evaluations.find_one({"evaluation_id": eval_id})

@api_router.post("/evaluations/{eval_id}/submit")
async def submit_evaluation(eval_id: str, data: EvaluationSubmit, user: dict = Depends(get_current_user)):
    evaluation = await db.evaluations.find_one(scoped_filter(user, {"evaluation_id": eval_id}))
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    # Check attempts
    attempts = await db.evaluation_attempts.count_documents({
        "evaluation_id": eval_id,
        "user_id": user["user_id"]
    })
    
    if attempts >= evaluation["max_attempts"]:
        raise HTTPException(status_code=400, detail="Maximum attempts reached")
    
    # Calculate score
    questions = evaluation["questions"]
    if len(data.answers) != len(questions):
        raise HTTPException(status_code=400, detail="Invalid number of answers")
    
    correct = sum(1 for i, ans in enumerate(data.answers) if ans == questions[i]["correct_index"])
    score = int((correct / len(questions)) * 100)
    passed = score >= evaluation["min_score"]
    
    # Save attempt
    attempt_id = f"attempt_{uuid.uuid4().hex[:12]}"
    attempt_doc = {
        "attempt_id": attempt_id,
        "company_id": user.get("company_id"),
        "evaluation_id": eval_id,
        "course_id": evaluation["course_id"],
        "user_id": user["user_id"],
        "answers": data.answers,
        "score": score,
        "passed": passed,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.evaluation_attempts.insert_one(attempt_doc)
    
    certificate = None
    all_courses_completed = False
    
    if passed:
        course = await db.courses.find_one({"course_id": evaluation["course_id"]}, {"_id": 0})
        
        # Check if completion already exists
        existing_completion = await db.course_completions.find_one({
            "user_id": user["user_id"],
            "course_id": evaluation["course_id"]
        })
        
        if not existing_completion:
            await db.course_completions.insert_one({
                "company_id": user.get("company_id"),
                "user_id": user["user_id"],
                "course_id": evaluation["course_id"],
                "course_name": course["name"],
                "score": score,
                "hours": course["hours"],
                "training_type": course["training_type"],
                "completed_at": datetime.now(timezone.utc).isoformat()
            })
        else:
            if score > existing_completion.get("score", 0):
                await db.course_completions.update_one(
                    {"user_id": user["user_id"], "course_id": evaluation["course_id"]},
                    {"$set": {"score": score}}
                )
        
        # Compute required courses based on user's areas/activities (multi-tenant model)
        company_id = user.get("company_id")
        user_areas = set(user.get("area_ids") or [])
        user_acts = set(user.get("activity_ids") or [])
        all_courses = await db.courses.find({"company_id": company_id, "status": "published"}).to_list(500)
        required_course_ids = set()
        for c in all_courses:
            c_areas = set(c.get("area_ids") or [])
            c_acts = set(c.get("activity_ids") or [])
            if (not c_areas and not c_acts) or (c_areas & user_areas) or (c_acts & user_acts):
                required_course_ids.add(c["course_id"])
        
        if required_course_ids:
            completions = await db.course_completions.find({"user_id": user["user_id"]}).to_list(500)
            completed_ids = {c["course_id"] for c in completions}
            if required_course_ids.issubset(completed_ids):
                all_courses_completed = True
                existing_cert = await db.certificates.find_one({
                    "user_id": user["user_id"],
                    "certificate_type": "role_completion",
                })
                if not existing_cert:
                    relevant_completions = [c for c in completions if c["course_id"] in required_course_ids]
                    total_hours = sum(c.get("hours", 0) for c in relevant_completions)
                    avg_score = int(sum(c.get("score", 0) for c in relevant_completions) / max(1, len(relevant_completions)))
                    # Min validity across all required courses
                    min_validity = 8760
                    for cid in required_course_ids:
                        c2 = await db.courses.find_one({"course_id": cid})
                        if c2 and (c2.get("validity_hours") or 8760) < min_validity:
                            min_validity = c2.get("validity_hours") or 8760
                    # Activity names
                    user_act_ids = list(user_acts)
                    act_objs = await db.activities.find({"activity_id": {"$in": user_act_ids}}).to_list(500) if user_act_ids else []
                    act_names = [a["name"] for a in act_objs]
                    
                    cert_id = f"cert_{uuid.uuid4().hex[:12]}"
                    verification_code = uuid.uuid4().hex[:8].upper()
                    issued_at = datetime.now(timezone.utc)
                    expires_at = issued_at + timedelta(hours=min_validity)
                    cert_doc = {
                        "certificate_id": cert_id,
                        "company_id": company_id,
                        "verification_code": verification_code,
                        "certificate_type": "role_completion",
                        "user_id": user["user_id"],
                        "role_ids": user_act_ids,
                        "role_names": act_names,
                        "user_name": user.get("full_name") or user.get("name", ""),
                        "user_rut": user.get("rut", ""),
                        "user_company": user.get("company", ""),
                        "total_hours": total_hours,
                        "average_score": avg_score,
                        "courses_detail": [
                            {
                                "course_id": c["course_id"],
                                "course_name": c.get("course_name", ""),
                                "score": c.get("score", 0),
                                "hours": c.get("hours", 0),
                                "training_type": c.get("training_type", "e-learning")
                            } for c in relevant_completions
                        ],
                        "issued_at": issued_at.isoformat(),
                        "expires_at": expires_at.isoformat(),
                        "is_valid": True
                    }
                    await db.certificates.insert_one(cert_doc)
                    certificate = cert_doc
    
    return {
        "score": score,
        "passed": passed,
        "attempts_remaining": evaluation["max_attempts"] - attempts - 1,
        "certificate": certificate,
        "all_courses_completed": all_courses_completed
    }

# ==================== CERTIFICATE ROUTES ====================

@api_router.get("/certificates")
async def get_certificates(user: dict = Depends(get_current_user)):
    if user.get("is_admin") or user.get("is_super_admin"):
        certificates = await db.certificates.find(scoped_filter(user)).to_list(1000)
    else:
        certificates = await db.certificates.find({"user_id": user["user_id"]}).to_list(100)
    return certificates

@api_router.get("/certificates/{cert_id}")
async def get_certificate(cert_id: str, user: dict = Depends(get_current_user)):
    certificate = await db.certificates.find_one(scoped_filter(user, {"certificate_id": cert_id}))
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    # If non-admin, must own the certificate
    if not (user.get("is_admin") or user.get("is_super_admin")) and certificate.get("user_id") != user["user_id"]:
        raise HTTPException(403, "Forbidden")
    return certificate

@api_router.get("/certificates/verify/{code}")
async def verify_certificate(code: str):
    certificate = await db.certificates.find_one({"verification_code": code})
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    expires_at = datetime.fromisoformat(certificate["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    is_valid = certificate["is_valid"] and expires_at > datetime.now(timezone.utc)
    
    return {
        "certificate": certificate,
        "is_valid": is_valid,
        "expired": expires_at < datetime.now(timezone.utc)
    }

@api_router.get("/certificates/{cert_id}/pdf")
async def download_certificate_pdf(cert_id: str, user: dict = Depends(get_current_user)):
    certificate = await db.certificates.find_one(scoped_filter(user, {"certificate_id": cert_id}))
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    if not (user.get("is_admin") or user.get("is_super_admin")) and certificate.get("user_id") != user["user_id"]:
        raise HTTPException(403, "Forbidden")
    
    # Branding now lives in companies row
    company = await db.companies.find_one({"company_id": certificate.get("company_id")}) or {}
    branding = {
        "primary_color": company.get("primary_color"),
        "secondary_color": company.get("secondary_color"),
        "logo_url": company.get("logo_url"),
        "banner_logo_url": company.get("banner_logo_url"),
        "signature_url": company.get("signature_url"),
        "footer_text": company.get("footer_text"),
        "footer_image_url": company.get("footer_image_url"),
    }
    pdf_buffer = generate_certificate_pdf(certificate, branding)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=certificado_{certificate['verification_code']}.pdf"}
    )

@api_router.post("/certificates/{cert_id}/regenerate")
async def regenerate_certificate(cert_id: str, admin: dict = Depends(require_admin)):
    certificate = await db.certificates.find_one(scoped_filter(admin, {"certificate_id": cert_id}))
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    # Update with new dates
    issued_at = datetime.now(timezone.utc)
    course = await db.courses.find_one({"course_id": certificate.get("course_id", "")}) if certificate.get("course_id") else None
    validity_hours = course.get("validity_hours", 8760) if course else 8760
    expires_at = issued_at + timedelta(hours=validity_hours)
    
    await db.certificates.update_one(
        {"certificate_id": cert_id},
        {"$set": {
            "issued_at": issued_at.isoformat(),
            "expires_at": expires_at.isoformat(),
            "is_valid": True
        }}
    )
    
    certificate = await db.certificates.find_one({"certificate_id": cert_id}, {"_id": 0})
    return certificate

def generate_certificate_pdf(certificate: dict, branding: dict) -> io.BytesIO:
    buffer = io.BytesIO()
    
    # Usar orientación horizontal para mejor diseño
    page_width, page_height = landscape(A4)
    
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=landscape(A4), 
        topMargin=0.8*cm, 
        bottomMargin=0.8*cm,
        leftMargin=1.2*cm,
        rightMargin=1.2*cm
    )
    
    primary_color = branding.get("primary_color", "#2563EB")
    # Convert hex to RGB
    try:
        r = int(primary_color[1:3], 16) / 255
        g = int(primary_color[3:5], 16) / 255
        b = int(primary_color[5:7], 16) / 255
        main_color = colors.Color(r, g, b)
    except:
        main_color = colors.Color(0.976, 0.451, 0.086)  # Orange default
    
    # Colores del diseño moderno
    dark_blue = colors.Color(0.1, 0.15, 0.25)
    gold = colors.Color(0.85, 0.65, 0.13)
    light_gray = colors.Color(0.95, 0.95, 0.95)
    medium_gray = colors.Color(0.5, 0.5, 0.5)
    
    styles = getSampleStyleSheet()
    
    # Estilos personalizados modernos
    title_style = ParagraphStyle(
        'CertTitle',
        parent=styles['Heading1'],
        fontSize=36,
        textColor=dark_blue,
        alignment=TA_CENTER,
        spaceAfter=8,
        fontName='Helvetica-Bold',
        leading=40
    )
    
    subtitle_style = ParagraphStyle(
        'CertSubtitle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=medium_gray,
        alignment=TA_CENTER,
        spaceAfter=12,
        leading=14
    )
    
    name_style = ParagraphStyle(
        'StudentName',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=main_color,
        alignment=TA_CENTER,
        spaceAfter=4,
        fontName='Helvetica-Bold',
        leading=32
    )
    
    rut_style = ParagraphStyle(
        'StudentRut',
        parent=styles['Normal'],
        fontSize=10,
        textColor=medium_gray,
        alignment=TA_CENTER,
        spaceAfter=10
    )
    
    normal_center = ParagraphStyle(
        'NormalCenter',
        parent=styles['Normal'],
        fontSize=11,
        alignment=TA_CENTER,
        spaceAfter=6,
        textColor=colors.Color(0.3, 0.3, 0.3),
        leading=14
    )
    
    role_style = ParagraphStyle(
        'RoleName',
        parent=styles['Heading2'],
        fontSize=18,
        textColor=dark_blue,
        alignment=TA_CENTER,
        spaceAfter=8,
        fontName='Helvetica-Bold'
    )
    
    small_style = ParagraphStyle(
        'Small',
        parent=styles['Normal'],
        fontSize=9,
        textColor=medium_gray,
        alignment=TA_CENTER
    )
    
    code_style = ParagraphStyle(
        'VerificationCode',
        parent=styles['Normal'],
        fontSize=14,
        fontName='Courier-Bold',
        alignment=TA_CENTER,
        spaceAfter=3,
        textColor=dark_blue
    )
    
    # Formatear fechas en español
    MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
             'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    
    issued_dt = datetime.fromisoformat(certificate["issued_at"])
    expires_dt = datetime.fromisoformat(certificate["expires_at"])
    
    issued_date = f"{issued_dt.day} de {MESES[issued_dt.month-1]} de {issued_dt.year}"
    expires_date = f"{expires_dt.day} de {MESES[expires_dt.month-1]} de {expires_dt.year}"
    
    elements = []
    
    # ============ CONTENIDO DEL CERTIFICADO ============
    
    elements.append(Spacer(1, 5))
    
    # Logo centrado (sin distorsión)
    logo_url = branding.get("logo_url")
    if logo_url:
        try:
            logo_path = ROOT_DIR / logo_url.replace("/api/files/", "uploads/")
            if logo_path.exists():
                from PIL import Image as PILImage
                with PILImage.open(str(logo_path)) as img:
                    orig_width, orig_height = img.size
                    max_width = 5*cm
                    max_height = 2.2*cm
                    # Calcular escala manteniendo proporción
                    scale = min(max_width / orig_width, max_height / orig_height)
                    new_width = orig_width * scale
                    new_height = orig_height * scale
                    logo = RLImage(str(logo_path), width=new_width, height=new_height)
                    logo.hAlign = 'CENTER'
                    elements.append(logo)
                    elements.append(Spacer(1, 8))
        except Exception as e:
            logger.error(f"Error loading logo: {e}")
    
    # Título principal
    elements.append(Paragraph("CERTIFICADO DE CAPACITACIÓN", title_style))
    
    # Línea decorativa dorada
    line_drawing = Drawing(page_width - 4*cm, 3)
    line_drawing.add(Line(80, 1.5, page_width - 6*cm, 1.5, strokeColor=gold, strokeWidth=2))
    line_drawing.hAlign = 'CENTER'
    elements.append(line_drawing)
    
    elements.append(Spacer(1, 10))
    
    # Texto de otorgamiento
    elements.append(Paragraph(
        "Se certifica que",
        subtitle_style
    ))
    
    # Nombre del estudiante
    elements.append(Paragraph(
        f"{certificate['user_name'].upper()}",
        name_style
    ))
    
    # RUT y empresa
    rut = certificate.get('user_rut', '')
    company = certificate.get('user_company', '')
    if rut:
        info_text = f"RUT: {rut}"
        if company:
            info_text += f" | Empresa: {company}"
        elements.append(Paragraph(info_text, rut_style))
    
    # Verificar si es certificado de rol (todos los cursos) o individual
    is_role_cert = certificate.get("certificate_type") == "role_completion"
    
    if is_role_cert:
        # Certificado de ROL - con tabla de cursos
        role_names = certificate.get("role_names") or certificate.get("role_name", "")
        # Handle both list and string formats
        if isinstance(role_names, list):
            role_names_str = ", ".join(role_names)
        else:
            role_names_str = str(role_names)
        elements.append(Paragraph(
            f"Ha completado satisfactoriamente la malla curricular correspondiente al Rol/Actividad:",
            normal_center
        ))
        elements.append(Paragraph(f"{role_names_str.upper()}", role_style))
        
        elements.append(Spacer(1, 6))
        
        # Tabla de cursos con porcentajes
        courses_detail = certificate.get("courses_detail", [])
        if courses_detail:
            # Header de la tabla
            table_data = [["N°", "Curso", "Tipo", "Horas", "Aprobación"]]
            
            for idx, course in enumerate(courses_detail, 1):
                score = course.get("score", 0)
                score_text = f"{score}%"
                table_data.append([
                    str(idx),
                    course.get("course_name", "")[:40],
                    course.get("training_type", "e-learning").capitalize(),
                    f"{course.get('hours', 0)}h",
                    score_text
                ])
            
            # Fila de totales
            total_hours = certificate.get("total_hours", 0)
            avg_score = certificate.get("average_score", 0)
            table_data.append(["", "TOTAL", "", f"{total_hours}h", f"{avg_score}%"])
            
            col_widths = [1*cm, 10*cm, 3*cm, 2*cm, 2.5*cm]
            course_table = Table(table_data, colWidths=col_widths)
            
            course_table.setStyle(TableStyle([
                # Header
                ('BACKGROUND', (0, 0), (-1, 0), dark_blue),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
                ('TOPPADDING', (0, 0), (-1, 0), 6),
                
                # Body
                ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -2), 9),
                ('ALIGN', (0, 1), (0, -1), 'CENTER'),
                ('ALIGN', (2, 1), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 1), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 1), (-1, -2), 5),
                ('TOPPADDING', (0, 1), (-1, -2), 5),
                
                # Totals row
                ('BACKGROUND', (0, -1), (-1, -1), light_gray),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, -1), (-1, -1), 9),
                
                # Borders
                ('LINEBELOW', (0, 0), (-1, 0), 1, gold),
                ('LINEABOVE', (0, -1), (-1, -1), 1, dark_blue),
                ('LINEBELOW', (0, -1), (-1, -1), 1, dark_blue),
                ('BOX', (0, 0), (-1, -1), 1, dark_blue),
                
                # Alternate row colors
                *[('BACKGROUND', (0, i), (-1, i), light_gray) for i in range(2, len(table_data)-1, 2)]
            ]))
            
            elements.append(course_table)
        
        elements.append(Spacer(1, 8))
    else:
        # Certificado individual (legacy)
        elements.append(Paragraph(
            "Ha completado satisfactoriamente el curso:",
            normal_center
        ))
        
        course_name = certificate.get('course_name', '')
        elements.append(Paragraph(f"{course_name.upper()}", role_style))
        
        hours = certificate.get('hours', 0)
        training_type = certificate.get('training_type', 'e-learning').upper()
        score = certificate.get('score', 0)
        
        elements.append(Paragraph(
            f"Duración: {hours} horas | Modalidad: {training_type} | Aprobación: {score}%",
            normal_center
        ))
        
        elements.append(Spacer(1, 8))
    
    # Vigencia y emisión en línea
    elements.append(Paragraph(
        f"Emitido el {issued_date} | Válido hasta el {expires_date}",
        small_style
    ))
    
    elements.append(Spacer(1, 12))
    
    # Firma centrada
    signature_url = branding.get("signature_url")
    if signature_url:
        try:
            sig_path = ROOT_DIR / signature_url.replace("/api/files/", "uploads/")
            if sig_path.exists():
                from PIL import Image as PILImage
                with PILImage.open(str(sig_path)) as img:
                    orig_width, orig_height = img.size
                    max_width = 3.5*cm
                    max_height = 1.8*cm
                    scale = min(max_width / orig_width, max_height / orig_height)
                    new_width = orig_width * scale
                    new_height = orig_height * scale
                    signature = RLImage(str(sig_path), width=new_width, height=new_height)
                    signature.hAlign = 'CENTER'
                    elements.append(signature)
        except Exception as e:
            logger.error(f"Error loading signature: {e}")
    
    elements.append(Paragraph("_________________________", small_style))
    elements.append(Paragraph("Firma Autorizada", small_style))
    
    elements.append(Spacer(1, 10))
    
    # Línea decorativa inferior
    elements.append(line_drawing)
    
    elements.append(Spacer(1, 6))
    
    # Código de verificación
    elements.append(Paragraph(f"Código de verificación: {certificate['verification_code']}", code_style))
    elements.append(Paragraph("Verifique este certificado en nuestra plataforma", small_style))
    
    # Función para dibujar marco moderno
    def draw_frame(canvas, doc):
        canvas.saveState()
        
        # Marco exterior elegante
        margin = 0.5*cm
        canvas.setStrokeColor(dark_blue)
        canvas.setLineWidth(3)
        canvas.roundRect(margin, margin, page_width - 2*margin, page_height - 2*margin, 10)
        
        # Marco interior dorado
        inner_margin = 0.8*cm
        canvas.setStrokeColor(gold)
        canvas.setLineWidth(1.5)
        canvas.roundRect(inner_margin, inner_margin, page_width - 2*inner_margin, page_height - 2*inner_margin, 8)
        
        # Esquinas decorativas
        corner_size = 1.5*cm
        canvas.setStrokeColor(main_color)
        canvas.setLineWidth(2)
        
        # Esquina superior izquierda
        canvas.line(margin + 0.3*cm, page_height - margin - corner_size, margin + 0.3*cm, page_height - margin - 0.3*cm)
        canvas.line(margin + 0.3*cm, page_height - margin - 0.3*cm, margin + corner_size, page_height - margin - 0.3*cm)
        
        # Esquina superior derecha
        canvas.line(page_width - margin - 0.3*cm, page_height - margin - corner_size, page_width - margin - 0.3*cm, page_height - margin - 0.3*cm)
        canvas.line(page_width - margin - corner_size, page_height - margin - 0.3*cm, page_width - margin - 0.3*cm, page_height - margin - 0.3*cm)
        
        # Esquina inferior izquierda
        canvas.line(margin + 0.3*cm, margin + corner_size, margin + 0.3*cm, margin + 0.3*cm)
        canvas.line(margin + 0.3*cm, margin + 0.3*cm, margin + corner_size, margin + 0.3*cm)
        
        # Esquina inferior derecha
        canvas.line(page_width - margin - 0.3*cm, margin + corner_size, page_width - margin - 0.3*cm, margin + 0.3*cm)
        canvas.line(page_width - margin - corner_size, margin + 0.3*cm, page_width - margin - 0.3*cm, margin + 0.3*cm)
        
        canvas.restoreState()
    
    doc.build(elements, onFirstPage=draw_frame, onLaterPages=draw_frame)
    buffer.seek(0)
    return buffer

# ==================== BRANDING ROUTES ====================

# Branding & company-scoped endpoints moved to routes_v2.py (multi-tenant)

# ==================== FILE SERVING (proxies to Supabase Storage) ====================

@api_router.get("/files/{folder}/{filename}")
async def serve_file(folder: str, filename: str):
    """
    Serves files by proxying to Supabase Storage public URLs.
    Legacy fallback: if file exists in local /uploads (pre-migration), serve it.
    """
    allowed_folders = ["logos", "signatures", "materials"]
    if folder not in allowed_folders:
        raise HTTPException(status_code=404, detail="File not found")

    # Legacy fallback for files that may still exist on disk
    local_path = UPLOAD_DIR / folder / filename
    if local_path.exists():
        return FileResponse(local_path)

    # Redirect to Supabase Storage public URL (302)
    from fastapi.responses import RedirectResponse
    public_url = get_public_url(folder, filename)
    return RedirectResponse(public_url, status_code=302)

# ==================== REPORTS ROUTES ====================

@api_router.get("/reports/summary")
async def get_reports_summary(admin: dict = Depends(require_admin)):
    base = scoped_filter(admin)
    base_workers = {**base, "is_admin": False, "is_super_admin": {"$ne": True}}
    total_users = await db.users.count_documents(base_workers)
    active_users = await db.users.count_documents({**base_workers, "is_active": True})
    total_courses = await db.courses.count_documents(base)
    published_courses = await db.courses.count_documents({**base, "status": "published"})
    total_certificates = await db.certificates.count_documents(base)
    
    now = datetime.now(timezone.utc)
    valid_certificates = 0
    expired_certificates = 0
    
    async for cert in db.certificates.find(base):
        expires_at = cert.get("expires_at")
        if not expires_at:
            continue
        expires_at = datetime.fromisoformat(expires_at) if isinstance(expires_at, str) else expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if cert["is_valid"] and expires_at > now:
            valid_certificates += 1
        else:
            expired_certificates += 1
    
    # Users by activity (only within the admin's company)
    users_by_role = []
    from db_adapter import get_pool
    pool = await get_pool()
    company_filter = ""
    params = []
    if not admin.get("is_super_admin"):
        company_filter = "WHERE u.company_id = $1"
        params = [admin.get("company_id")]
        worker_filter = "AND u.is_admin = FALSE AND COALESCE(u.is_super_admin, FALSE) = FALSE"
    else:
        worker_filter = "WHERE u.is_admin = FALSE AND COALESCE(u.is_super_admin, FALSE) = FALSE"
    sql = f"""
        SELECT COALESCE(a.activity_id, NULL) AS activity_id,
               COALESCE(a.name, 'Sin actividad') AS activity_name,
               COUNT(*) AS count
        FROM users u
        LEFT JOIN LATERAL UNNEST(
            CASE WHEN array_length(u.activity_ids, 1) > 0 THEN u.activity_ids ELSE ARRAY[NULL]::TEXT[] END
        ) AS aid ON TRUE
        LEFT JOIN activities a ON a.activity_id = aid
        {company_filter} {worker_filter if company_filter else worker_filter}
        GROUP BY a.activity_id, a.name
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, *params)
    for r in rows:
        users_by_role.append({"role": r["activity_name"] or "Sin actividad", "count": r["count"]})
    
    completions = await db.course_completions.count_documents(base)
    
    total_hours = 0
    async for cert in db.certificates.find(base):
        total_hours += (cert.get("hours") or 0)
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_courses": total_courses,
        "published_courses": published_courses,
        "total_certificates": total_certificates,
        "valid_certificates": valid_certificates,
        "expired_certificates": expired_certificates,
        "users_by_role": users_by_role,
        "total_completions": completions,
        "total_hours_trained": total_hours
    }

@api_router.get("/reports/users")
async def get_users_report(admin: dict = Depends(require_admin)):
    base = scoped_filter(admin, {"is_admin": False, "is_super_admin": {"$ne": True}})
    users = await db.users.find(base, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    for user in users:
        # Get activity names
        act_ids = user.get("activity_ids") or []
        if act_ids:
            acts = await db.activities.find({"activity_id": {"$in": act_ids}}).to_list(100)
            user["role_name"] = ", ".join([a["name"] for a in acts]) if acts else "Sin actividad"
        else:
            user["role_name"] = "Sin actividad"
        
        user["certificates_count"] = await db.certificates.count_documents({"user_id": user["user_id"]})
        
        total_hours = 0
        async for cert in db.certificates.find({"user_id": user["user_id"]}):
            total_hours += (cert.get("hours") or 0)
        user["total_hours_trained"] = total_hours
    
    return users

@api_router.get("/reports/export/users")
async def export_users_csv(admin: dict = Depends(require_admin)):
    users = await get_users_report(admin)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Nombre", "RUT", "Email", "Empresa", "Rol", "Estado", "Certificados", "Horas Capacitadas"])
    
    for user in users:
        writer.writerow([
            user.get("full_name", user.get("name", "")),
            user.get("rut", ""),
            user.get("email", ""),
            user.get("company", ""),
            user.get("role_name", ""),
            "Activo" if user.get("is_active", True) else "Inactivo",
            user.get("certificates_count", 0),
            user.get("total_hours_trained", 0)
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=reporte_usuarios.csv"}
    )

@api_router.get("/reports/export/certificates")
async def export_certificates_csv(admin: dict = Depends(require_admin)):
    certificates = await db.certificates.find(scoped_filter(admin)).to_list(1000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Código", "Alumno", "RUT", "Curso", "Horas", "Tipo", "Fecha Emisión", "Vigencia", "Estado"])
    
    now = datetime.now(timezone.utc)
    for cert in certificates:
        expires_at = datetime.fromisoformat(cert["expires_at"])
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        status = "Válido" if cert["is_valid"] and expires_at > now else "Vencido"
        
        writer.writerow([
            cert.get("verification_code", ""),
            cert.get("user_name", ""),
            cert.get("user_rut", ""),
            cert.get("course_name", ""),
            cert.get("hours", 0),
            cert.get("training_type", ""),
            datetime.fromisoformat(cert["issued_at"]).strftime("%d/%m/%Y"),
            expires_at.strftime("%d/%m/%Y"),
            status
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=reporte_certificados.csv"}
    )

# ==================== STUDENT PROGRESS ====================

@api_router.get("/student/progress")
async def get_student_progress(user: dict = Depends(get_current_user)):
    """
    Student progress (multi-tenant): courses are derived from user's area_ids/activity_ids
    and the courses tagged with matching areas/activities (or untagged = applies to all).
    """
    company_id = user.get("company_id")
    if not company_id:
        return {"courses": [], "total_courses": 0, "completed_courses": 0,
                "completion_percentage": 0, "role_names": None, "roles": []}
    
    user_areas = set(user.get("area_ids") or [])
    user_acts = set(user.get("activity_ids") or [])
    
    all_courses = await db.courses.find({"company_id": company_id, "status": "published"}).to_list(500)
    courses = []
    for c in all_courses:
        c_areas = set(c.get("area_ids") or [])
        c_acts = set(c.get("activity_ids") or [])
        if (not c_areas and not c_acts) or (c_areas & user_areas) or (c_acts & user_acts):
            courses.append(c)
    
    completions = await db.course_completions.find({"user_id": user["user_id"]}).to_list(500)
    completed_ids = {c["course_id"] for c in completions}
    
    certificates = await db.certificates.find({"user_id": user["user_id"]}).to_list(500)
    cert_by_course = {c.get("course_id"): c for c in certificates if c.get("course_id")}
    
    course_map = {c["course_id"]: c for c in courses}
    
    # Get user's activities (for display names)
    act_objs = []
    if user_acts:
        act_objs = await db.activities.find({"activity_id": {"$in": list(user_acts)}}).to_list(100)
    
    progress = []
    for idx, course in enumerate(courses):
        is_completed = course["course_id"] in completed_ids
        certificate = cert_by_course.get(course["course_id"])
        
        prerequisites = course.get("prerequisites") or []
        missing_prerequisites = []
        is_locked = False
        for prereq_id in prerequisites:
            if prereq_id not in completed_ids:
                is_locked = True
                pre = course_map.get(prereq_id)
                if pre:
                    missing_prerequisites.append({"course_id": prereq_id, "name": pre["name"]})
        
        progress.append({
            "course": course,
            "is_completed": is_completed,
            "certificate": certificate,
            "order": idx + 1,
            "is_locked": is_locked,
            "missing_prerequisites": missing_prerequisites
        })
    
    total_courses = len(courses)
    completed_courses = len(completed_ids & {c["course_id"] for c in courses})
    role_names = ", ".join([a["name"] for a in act_objs]) if act_objs else None
    
    return {
        "courses": progress,
        "total_courses": total_courses,
        "completed_courses": completed_courses,
        "completion_percentage": int((completed_courses / total_courses * 100) if total_courses > 0 else 0),
        "role_names": role_names,
        "roles": [{"role_id": a["activity_id"], "name": a["name"]} for a in act_objs]
    }

@api_router.get("/activities/{activity_id}/curriculum")
async def get_activity_curriculum(activity_id: str, user: dict = Depends(get_current_user)):
    """Get the curriculum (courses) tagged with this activity (in the user's company)."""
    activity = await db.activities.find_one(scoped_filter(user, {"activity_id": activity_id}))
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # Courses in this company tagged with this activity
    company_id = activity["company_id"]
    all_courses = await db.courses.find({"company_id": company_id}).to_list(500)
    courses = [c for c in all_courses if activity_id in (c.get("activity_ids") or [])]
    
    course_map = {c["course_id"]: c for c in courses}
    curriculum = []
    for idx, course in enumerate(courses):
        prerequisites = course.get("prerequisites") or []
        prereq_names = []
        for pre_id in prerequisites:
            pre = course_map.get(pre_id)
            if pre:
                prereq_names.append(pre["name"])
        curriculum.append({
            "order": idx + 1,
            "course_id": course["course_id"],
            "name": course["name"],
            "description": course.get("description"),
            "hours": course.get("hours") or 0,
            "training_type": course.get("training_type"),
            "prerequisites": prerequisites,
            "prerequisite_names": prereq_names
        })
    
    return {
        "role": activity,
        "curriculum": curriculum,
        "total_hours": sum((c.get("hours") or 0) for c in courses)
    }

# ==================== SETUP ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "E-Learning Platform API", "status": "running"}

@api_router.post("/setup/admin")
async def setup_admin():
    """DEPRECATED: superadmin now creates admins per-company via /api/superadmin/companies/{id}/admin."""
    return {"message": "Endpoint deprecated. Use superadmin login to create companies and admins.", "created": False}

# Include router and middleware
app.include_router(api_router)

# Include multi-tenant routes (companies, areas, document_types, worker_documents, bulk-import)
from routes_v2 import v2_router
app.include_router(v2_router)

# Get allowed origins from environment or use defaults
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://localhost:3000",
    os.environ.get("FRONTEND_URL", "https://user-credentials-6.preview.emergentagent.com"),
]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_pool()
