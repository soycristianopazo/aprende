from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request, Response
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
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
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.enums import TA_CENTER, TA_LEFT

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
    rut: str
    company: Optional[str] = None
    role_id: Optional[str] = None
    is_admin: bool = False

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    company: Optional[str] = None
    role_id: Optional[str] = None
    is_active: Optional[bool] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    course_ids: List[str] = []
    course_order: List[str] = []  # Ordered list of course_ids for curriculum path

class RoleUpdate(BaseModel):
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
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    existing_rut = await db.users.find_one({"rut": user_data.rut})
    if existing_rut:
        raise HTTPException(status_code=400, detail="RUT already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "rut": user_data.rut,
        "company": user_data.company,
        "role_id": user_data.role_id,
        "is_admin": user_data.is_admin,
        "is_active": True,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.is_admin)
    user_doc.pop("password_hash")
    user_doc.pop("_id", None)
    
    return {"token": token, "user": user_doc}

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

@api_router.get("/users")
async def get_users(admin: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, data: UserUpdate, admin: dict = Depends(require_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return user

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    result = await db.users.delete_one({"user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
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

@api_router.post("/roles")
async def create_role(data: RoleCreate, admin: dict = Depends(require_admin)):
    role_id = f"role_{uuid.uuid4().hex[:12]}"
    role_doc = {
        "role_id": role_id,
        "name": data.name,
        "description": data.description,
        "course_ids": data.course_ids,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.roles.insert_one(role_doc)
    role_doc.pop("_id", None)
    return role_doc

@api_router.get("/roles")
async def get_roles():
    roles = await db.roles.find({}, {"_id": 0}).to_list(100)
    return roles

@api_router.get("/roles/{role_id}")
async def get_role(role_id: str):
    role = await db.roles.find_one({"role_id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role

@api_router.put("/roles/{role_id}")
async def update_role(role_id: str, data: RoleUpdate, admin: dict = Depends(require_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.roles.update_one({"role_id": role_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Role not found")
    
    role = await db.roles.find_one({"role_id": role_id}, {"_id": 0})
    return role

@api_router.delete("/roles/{role_id}")
async def delete_role(role_id: str, admin: dict = Depends(require_admin)):
    result = await db.roles.delete_one({"role_id": role_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Role not found")
    return {"message": "Role deleted"}

# ==================== COURSE ROUTES ====================

@api_router.post("/courses")
async def create_course(data: CourseCreate, admin: dict = Depends(require_admin)):
    course_id = f"course_{uuid.uuid4().hex[:12]}"
    course_doc = {
        "course_id": course_id,
        "name": data.name,
        "description": data.description,
        "hours": data.hours,
        "validity_hours": data.validity_hours,
        "training_type": data.training_type,
        "video_url": data.video_url,
        "material_url": None,
        "status": data.status,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.courses.insert_one(course_doc)
    course_doc.pop("_id", None)
    return course_doc

@api_router.get("/courses")
async def get_courses(user: dict = Depends(get_current_user)):
    if user.get("is_admin"):
        courses = await db.courses.find({}, {"_id": 0}).to_list(100)
    else:
        # Get courses for user's role
        if user.get("role_id"):
            role = await db.roles.find_one({"role_id": user["role_id"]}, {"_id": 0})
            if role:
                course_ids = role.get("course_ids", [])
                courses = await db.courses.find(
                    {"course_id": {"$in": course_ids}, "status": "published"},
                    {"_id": 0}
                ).to_list(100)
            else:
                courses = []
        else:
            courses = await db.courses.find({"status": "published"}, {"_id": 0}).to_list(100)
    
    return courses

@api_router.get("/courses/{course_id}")
async def get_course(course_id: str, user: dict = Depends(get_current_user)):
    course = await db.courses.find_one({"course_id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

@api_router.put("/courses/{course_id}")
async def update_course(course_id: str, data: CourseUpdate, admin: dict = Depends(require_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.courses.update_one({"course_id": course_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    
    course = await db.courses.find_one({"course_id": course_id}, {"_id": 0})
    return course

@api_router.delete("/courses/{course_id}")
async def delete_course(course_id: str, admin: dict = Depends(require_admin)):
    result = await db.courses.delete_one({"course_id": course_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"message": "Course deleted"}

@api_router.post("/courses/{course_id}/material")
async def upload_course_material(course_id: str, file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")
    
    filename = f"{course_id}_{uuid.uuid4().hex[:8]}.pdf"
    filepath = UPLOAD_DIR / "materials" / filename
    
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    
    material_url = f"/api/files/materials/{filename}"
    await db.courses.update_one({"course_id": course_id}, {"$set": {"material_url": material_url}})
    
    return {"material_url": material_url}

# ==================== EVALUATION ROUTES ====================

@api_router.post("/evaluations")
async def create_evaluation(data: EvaluationCreate, admin: dict = Depends(require_admin)):
    # Check if evaluation exists for course
    existing = await db.evaluations.find_one({"course_id": data.course_id})
    if existing:
        raise HTTPException(status_code=400, detail="Evaluation already exists for this course")
    
    eval_id = f"eval_{uuid.uuid4().hex[:12]}"
    eval_doc = {
        "evaluation_id": eval_id,
        "course_id": data.course_id,
        "questions": [q.model_dump() for q in data.questions],
        "min_score": data.min_score,
        "max_attempts": data.max_attempts,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.evaluations.insert_one(eval_doc)
    eval_doc.pop("_id", None)
    return eval_doc

@api_router.get("/evaluations/course/{course_id}")
async def get_evaluation_by_course(course_id: str, user: dict = Depends(get_current_user)):
    evaluation = await db.evaluations.find_one({"course_id": course_id}, {"_id": 0})
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
    
    result = await db.evaluations.update_one({"evaluation_id": eval_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    evaluation = await db.evaluations.find_one({"evaluation_id": eval_id}, {"_id": 0})
    return evaluation

@api_router.post("/evaluations/{eval_id}/submit")
async def submit_evaluation(eval_id: str, data: EvaluationSubmit, user: dict = Depends(get_current_user)):
    evaluation = await db.evaluations.find_one({"evaluation_id": eval_id}, {"_id": 0})
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
        "evaluation_id": eval_id,
        "course_id": evaluation["course_id"],
        "user_id": user["user_id"],
        "answers": data.answers,
        "score": score,
        "passed": passed,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.evaluation_attempts.insert_one(attempt_doc)
    
    # If passed, create certificate
    certificate = None
    if passed:
        course = await db.courses.find_one({"course_id": evaluation["course_id"]}, {"_id": 0})
        cert_id = f"cert_{uuid.uuid4().hex[:12]}"
        verification_code = uuid.uuid4().hex[:8].upper()
        
        issued_at = datetime.now(timezone.utc)
        expires_at = issued_at + timedelta(hours=course.get("validity_hours", 8760))
        
        cert_doc = {
            "certificate_id": cert_id,
            "verification_code": verification_code,
            "user_id": user["user_id"],
            "course_id": evaluation["course_id"],
            "course_name": course["name"],
            "user_name": user.get("full_name") or user.get("name", ""),
            "user_rut": user.get("rut", ""),
            "hours": course["hours"],
            "training_type": course["training_type"],
            "score": score,
            "issued_at": issued_at.isoformat(),
            "expires_at": expires_at.isoformat(),
            "is_valid": True
        }
        await db.certificates.insert_one(cert_doc)
        cert_doc.pop("_id", None)
        certificate = cert_doc
        
        # Save course completion
        await db.course_completions.insert_one({
            "user_id": user["user_id"],
            "course_id": evaluation["course_id"],
            "completed_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {
        "score": score,
        "passed": passed,
        "attempts_remaining": evaluation["max_attempts"] - attempts - 1,
        "certificate": certificate
    }

# ==================== CERTIFICATE ROUTES ====================

@api_router.get("/certificates")
async def get_certificates(user: dict = Depends(get_current_user)):
    if user.get("is_admin"):
        certificates = await db.certificates.find({}, {"_id": 0}).to_list(1000)
    else:
        certificates = await db.certificates.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return certificates

@api_router.get("/certificates/{cert_id}")
async def get_certificate(cert_id: str, user: dict = Depends(get_current_user)):
    certificate = await db.certificates.find_one({"certificate_id": cert_id}, {"_id": 0})
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return certificate

@api_router.get("/certificates/verify/{code}")
async def verify_certificate(code: str):
    certificate = await db.certificates.find_one({"verification_code": code}, {"_id": 0})
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
    certificate = await db.certificates.find_one({"certificate_id": cert_id}, {"_id": 0})
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    # Get branding
    branding = await db.branding.find_one({}, {"_id": 0}) or {}
    
    pdf_buffer = generate_certificate_pdf(certificate, branding)
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=certificado_{certificate['verification_code']}.pdf"}
    )

@api_router.post("/certificates/{cert_id}/regenerate")
async def regenerate_certificate(cert_id: str, admin: dict = Depends(require_admin)):
    certificate = await db.certificates.find_one({"certificate_id": cert_id}, {"_id": 0})
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    # Update with new dates
    issued_at = datetime.now(timezone.utc)
    course = await db.courses.find_one({"course_id": certificate["course_id"]}, {"_id": 0})
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
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        topMargin=1.5*cm, 
        bottomMargin=1.5*cm,
        leftMargin=2*cm,
        rightMargin=2*cm
    )
    
    primary_color = branding.get("primary_color", "#F97316")
    # Convert hex to RGB
    try:
        r = int(primary_color[1:3], 16) / 255
        g = int(primary_color[3:5], 16) / 255
        b = int(primary_color[5:7], 16) / 255
        main_color = colors.Color(r, g, b)
    except:
        main_color = colors.Color(0.976, 0.451, 0.086)  # Orange default
    
    styles = getSampleStyleSheet()
    
    # Estilos personalizados
    title_style = ParagraphStyle(
        'CertTitle',
        parent=styles['Heading1'],
        fontSize=32,
        textColor=main_color,
        alignment=TA_CENTER,
        spaceAfter=15,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'CertSubtitle',
        parent=styles['Normal'],
        fontSize=14,
        textColor=colors.Color(0.4, 0.4, 0.4),
        alignment=TA_CENTER,
        spaceAfter=25,
        leading=18
    )
    
    name_style = ParagraphStyle(
        'StudentName',
        parent=styles['Heading1'],
        fontSize=26,
        textColor=colors.Color(0.1, 0.1, 0.1),
        alignment=TA_CENTER,
        spaceAfter=5,
        fontName='Helvetica-Bold',
        leading=32
    )
    
    rut_style = ParagraphStyle(
        'StudentRut',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.Color(0.3, 0.3, 0.3),
        alignment=TA_CENTER,
        spaceAfter=20
    )
    
    normal_center = ParagraphStyle(
        'NormalCenter',
        parent=styles['Normal'],
        fontSize=13,
        alignment=TA_CENTER,
        spaceAfter=8,
        textColor=colors.Color(0.3, 0.3, 0.3),
        leading=18
    )
    
    course_style = ParagraphStyle(
        'CourseName',
        parent=styles['Heading2'],
        fontSize=20,
        textColor=main_color,
        alignment=TA_CENTER,
        spaceAfter=15,
        fontName='Helvetica-Bold'
    )
    
    details_style = ParagraphStyle(
        'Details',
        parent=styles['Normal'],
        fontSize=12,
        alignment=TA_CENTER,
        spaceAfter=8,
        textColor=colors.Color(0.3, 0.3, 0.3)
    )
    
    small_style = ParagraphStyle(
        'Small',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.Color(0.5, 0.5, 0.5),
        alignment=TA_CENTER
    )
    
    code_style = ParagraphStyle(
        'VerificationCode',
        parent=styles['Normal'],
        fontSize=16,
        fontName='Courier-Bold',
        alignment=TA_CENTER,
        spaceAfter=5,
        textColor=colors.Color(0.2, 0.2, 0.2)
    )
    
    # Formatear fechas en español
    MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
             'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
    
    issued_dt = datetime.fromisoformat(certificate["issued_at"])
    expires_dt = datetime.fromisoformat(certificate["expires_at"])
    
    issued_date = f"{issued_dt.day} de {MESES[issued_dt.month-1]} de {issued_dt.year}"
    expires_day_name = DIAS[expires_dt.weekday()]
    expires_date = f"{expires_day_name} {expires_dt.day} de {MESES[expires_dt.month-1]} de {expires_dt.year}"
    
    elements = []
    
    # Logo (si existe)
    logo_url = branding.get("logo_url")
    if logo_url:
        try:
            logo_path = ROOT_DIR / logo_url.replace("/api/files/", "uploads/")
            if logo_path.exists():
                logo = RLImage(str(logo_path), width=4*cm, height=2*cm)
                logo.hAlign = 'CENTER'
                elements.append(logo)
                elements.append(Spacer(1, 15))
        except Exception as e:
            logger.error(f"Error loading logo: {e}")
    
    elements.append(Spacer(1, 20))
    
    # Título principal
    elements.append(Paragraph("CERTIFICADO", title_style))
    
    elements.append(Spacer(1, 25))
    
    # Línea decorativa
    line_data = [['', '', '']]
    line_table = Table(line_data, colWidths=[5*cm, 5*cm, 5*cm])
    line_table.setStyle(TableStyle([
        ('LINEBELOW', (1, 0), (1, 0), 2, main_color),
    ]))
    elements.append(line_table)
    
    elements.append(Spacer(1, 25))
    
    # Texto de otorgamiento
    elements.append(Paragraph(
        "SE OTORGA EL PRESENTE CERTIFICADO DE ASISTENCIA Y APROBACIÓN A:",
        subtitle_style
    ))
    
    elements.append(Spacer(1, 15))
    
    # Nombre del estudiante
    elements.append(Paragraph(
        f"<b>{certificate['user_name'].upper()}</b>",
        name_style
    ))
    
    # RUT
    rut = certificate.get('user_rut', '')
    if rut:
        elements.append(Paragraph(f"RUT: {rut}", rut_style))
    
    elements.append(Spacer(1, 20))
    
    # Texto del curso
    elements.append(Paragraph(
        "Por haber completado de manera satisfactoria el curso:",
        normal_center
    ))
    
    elements.append(Spacer(1, 10))
    
    # Nombre del curso
    elements.append(Paragraph(
        f"<b>{certificate['course_name'].upper()}</b>",
        course_style
    ))
    
    elements.append(Spacer(1, 15))
    
    # Detalles del curso
    training_type = certificate.get('training_type', 'e-learning').upper()
    hours = certificate.get('hours', 0)
    
    elements.append(Paragraph(
        f"Con un total de <b>{hours} horas</b> cronológicas. ({training_type})",
        details_style
    ))
    
    elements.append(Spacer(1, 10))
    
    # Vigencia
    elements.append(Paragraph(
        f"Certificación válida hasta el <b>{expires_date}</b>.",
        details_style
    ))
    
    elements.append(Spacer(1, 10))
    
    # Fecha de emisión
    elements.append(Paragraph(
        f"Emitido el {issued_date}.",
        small_style
    ))
    
    elements.append(Spacer(1, 40))
    
    # Firma (si existe)
    signature_url = branding.get("signature_url")
    if signature_url:
        try:
            sig_path = ROOT_DIR / signature_url.replace("/api/files/", "uploads/")
            if sig_path.exists():
                signature = RLImage(str(sig_path), width=4*cm, height=2*cm)
                signature.hAlign = 'CENTER'
                elements.append(signature)
        except Exception as e:
            logger.error(f"Error loading signature: {e}")
    
    # Línea de firma
    elements.append(Paragraph("_______________________________", normal_center))
    elements.append(Paragraph("Firma Autorizada", small_style))
    
    elements.append(Spacer(1, 30))
    
    # Línea decorativa inferior
    elements.append(line_table)
    
    elements.append(Spacer(1, 20))
    
    # Código de verificación
    elements.append(Paragraph("Código de verificación:", small_style))
    elements.append(Paragraph(certificate['verification_code'], code_style))
    elements.append(Paragraph("Verifique este certificado en la plataforma", small_style))
    
    # Footer image (si existe)
    footer_url = branding.get("footer_image_url")
    if footer_url:
        try:
            footer_path = ROOT_DIR / footer_url.replace("/api/files/", "uploads/")
            if footer_path.exists():
                elements.append(Spacer(1, 20))
                footer_img = RLImage(str(footer_path), width=10*cm, height=2*cm)
                footer_img.hAlign = 'CENTER'
                elements.append(footer_img)
        except Exception as e:
            logger.error(f"Error loading footer: {e}")
    
    doc.build(elements)
    buffer.seek(0)
    return buffer

# ==================== BRANDING ROUTES ====================

@api_router.get("/branding")
async def get_branding():
    branding = await db.branding.find_one({}, {"_id": 0})
    if not branding:
        branding = {
            "branding_id": "default",
            "logo_url": None,
            "banner_logo_url": None,
            "signature_url": None,
            "footer_image_url": None,
            "primary_color": "#F97316",
            "secondary_color": "#F1F5F9"
        }
    return branding

@api_router.put("/branding")
async def update_branding(data: BrandingUpdate, admin: dict = Depends(require_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    existing = await db.branding.find_one({})
    if existing:
        await db.branding.update_one({}, {"$set": update_data})
    else:
        branding_doc = {
            "branding_id": "default",
            "logo_url": None,
            "signature_url": None,
            "footer_image_url": None,
            "primary_color": "#F97316",
            "secondary_color": "#F1F5F9",
            **update_data
        }
        await db.branding.insert_one(branding_doc)
    
    branding = await db.branding.find_one({}, {"_id": 0})
    return branding

@api_router.post("/branding/logo")
async def upload_logo(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        raise HTTPException(status_code=400, detail="Only PNG/JPG files allowed")
    
    filename = f"logo_{uuid.uuid4().hex[:8]}.png"
    filepath = UPLOAD_DIR / "logos" / filename
    
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    
    logo_url = f"/api/files/logos/{filename}"
    
    existing = await db.branding.find_one({})
    if existing:
        await db.branding.update_one({}, {"$set": {"logo_url": logo_url}})
    else:
        await db.branding.insert_one({
            "branding_id": "default",
            "logo_url": logo_url,
            "primary_color": "#F97316",
            "secondary_color": "#F1F5F9"
        })
    
    return {"logo_url": logo_url}

@api_router.post("/branding/banner-logo")
async def upload_banner_logo(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        raise HTTPException(status_code=400, detail="Only PNG/JPG files allowed")
    
    filename = f"banner_logo_{uuid.uuid4().hex[:8]}.png"
    filepath = UPLOAD_DIR / "logos" / filename
    
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    
    banner_logo_url = f"/api/files/logos/{filename}"
    
    existing = await db.branding.find_one({})
    if existing:
        await db.branding.update_one({}, {"$set": {"banner_logo_url": banner_logo_url}})
    else:
        await db.branding.insert_one({
            "branding_id": "default",
            "banner_logo_url": banner_logo_url,
            "primary_color": "#F97316",
            "secondary_color": "#F1F5F9"
        })
    
    return {"banner_logo_url": banner_logo_url}

@api_router.post("/branding/signature")
async def upload_signature(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        raise HTTPException(status_code=400, detail="Only PNG/JPG files allowed")
    
    filename = f"signature_{uuid.uuid4().hex[:8]}.png"
    filepath = UPLOAD_DIR / "signatures" / filename
    
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    
    signature_url = f"/api/files/signatures/{filename}"
    
    existing = await db.branding.find_one({})
    if existing:
        await db.branding.update_one({}, {"$set": {"signature_url": signature_url}})
    else:
        await db.branding.insert_one({
            "branding_id": "default",
            "signature_url": signature_url,
            "primary_color": "#F97316",
            "secondary_color": "#F1F5F9"
        })
    
    return {"signature_url": signature_url}

@api_router.post("/branding/footer")
async def upload_footer(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        raise HTTPException(status_code=400, detail="Only PNG/JPG files allowed")
    
    filename = f"footer_{uuid.uuid4().hex[:8]}.png"
    filepath = UPLOAD_DIR / "logos" / filename
    
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    
    footer_image_url = f"/api/files/logos/{filename}"
    
    existing = await db.branding.find_one({})
    if existing:
        await db.branding.update_one({}, {"$set": {"footer_image_url": footer_image_url}})
    else:
        await db.branding.insert_one({
            "branding_id": "default",
            "footer_image_url": footer_image_url,
            "primary_color": "#F97316",
            "secondary_color": "#F1F5F9"
        })
    
    return {"footer_image_url": footer_image_url}

# ==================== FILE SERVING ====================

@api_router.get("/files/{folder}/{filename}")
async def serve_file(folder: str, filename: str):
    allowed_folders = ["logos", "signatures", "materials"]
    if folder not in allowed_folders:
        raise HTTPException(status_code=404, detail="File not found")
    
    filepath = UPLOAD_DIR / folder / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(filepath)

# ==================== REPORTS ROUTES ====================

@api_router.get("/reports/summary")
async def get_reports_summary(admin: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({"is_admin": False})
    active_users = await db.users.count_documents({"is_admin": False, "is_active": True})
    total_courses = await db.courses.count_documents({})
    published_courses = await db.courses.count_documents({"status": "published"})
    total_certificates = await db.certificates.count_documents({})
    
    now = datetime.now(timezone.utc)
    valid_certificates = 0
    expired_certificates = 0
    
    async for cert in db.certificates.find({}, {"_id": 0, "expires_at": 1, "is_valid": 1}):
        expires_at = datetime.fromisoformat(cert["expires_at"])
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if cert["is_valid"] and expires_at > now:
            valid_certificates += 1
        else:
            expired_certificates += 1
    
    # Get users by role
    pipeline = [
        {"$match": {"is_admin": False}},
        {"$group": {"_id": "$role_id", "count": {"$sum": 1}}}
    ]
    users_by_role = []
    async for doc in db.users.aggregate(pipeline):
        role_id = doc["_id"]
        role_name = "Sin rol"
        if role_id:
            role = await db.roles.find_one({"role_id": role_id}, {"_id": 0, "name": 1})
            if role:
                role_name = role["name"]
        users_by_role.append({"role": role_name, "count": doc["count"]})
    
    # Get course completions stats
    completions = await db.course_completions.count_documents({})
    
    # Calculate total hours trained
    total_hours = 0
    async for cert in db.certificates.find({}, {"_id": 0, "hours": 1}):
        total_hours += cert.get("hours", 0)
    
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
    users = await db.users.find({"is_admin": False}, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    for user in users:
        # Get role name
        if user.get("role_id"):
            role = await db.roles.find_one({"role_id": user["role_id"]}, {"_id": 0, "name": 1})
            user["role_name"] = role["name"] if role else "Sin rol"
        else:
            user["role_name"] = "Sin rol"
        
        # Get certificates count
        user["certificates_count"] = await db.certificates.count_documents({"user_id": user["user_id"]})
        
        # Get total hours
        total_hours = 0
        async for cert in db.certificates.find({"user_id": user["user_id"]}, {"_id": 0, "hours": 1}):
            total_hours += cert.get("hours", 0)
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
    certificates = await db.certificates.find({}, {"_id": 0}).to_list(1000)
    
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
    # Get courses for user's role
    courses = []
    if user.get("role_id"):
        role = await db.roles.find_one({"role_id": user["role_id"]}, {"_id": 0})
        if role:
            course_ids = role.get("course_ids", [])
            courses = await db.courses.find(
                {"course_id": {"$in": course_ids}, "status": "published"},
                {"_id": 0}
            ).to_list(100)
    else:
        courses = await db.courses.find({"status": "published"}, {"_id": 0}).to_list(100)
    
    # Get completions
    completions = await db.course_completions.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    completed_ids = {c["course_id"] for c in completions}
    
    # Get certificates
    certificates = await db.certificates.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    cert_by_course = {c["course_id"]: c for c in certificates}
    
    progress = []
    for course in courses:
        is_completed = course["course_id"] in completed_ids
        certificate = cert_by_course.get(course["course_id"])
        
        progress.append({
            "course": course,
            "is_completed": is_completed,
            "certificate": certificate
        })
    
    total_courses = len(courses)
    completed_courses = len(completed_ids & {c["course_id"] for c in courses})
    
    return {
        "courses": progress,
        "total_courses": total_courses,
        "completed_courses": completed_courses,
        "completion_percentage": int((completed_courses / total_courses * 100) if total_courses > 0 else 0)
    }

# ==================== SETUP ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "E-Learning Platform API", "status": "running"}

@api_router.post("/setup/admin")
async def setup_admin():
    """Create initial admin user if none exists"""
    admin = await db.users.find_one({"is_admin": True})
    if admin:
        return {"message": "Admin already exists", "created": False}
    
    admin_id = f"user_{uuid.uuid4().hex[:12]}"
    admin_doc = {
        "user_id": admin_id,
        "email": "admin@elearning.com",
        "password_hash": hash_password("admin123"),
        "full_name": "Administrador",
        "rut": "11111111-1",
        "company": "E-Learning Platform",
        "role_id": None,
        "is_admin": True,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_doc)
    
    return {"message": "Admin created", "created": True, "email": "admin@elearning.com", "password": "admin123"}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
