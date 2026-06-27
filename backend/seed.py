"""Seed initial data into Supabase: admin, demo student, and predefined roles."""
import asyncio
import os
import sys
import uuid
import bcrypt
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")
sys.path.insert(0, str(ROOT))

from db_adapter import db, close_pool  # noqa: E402


PREDEFINED_ROLES = [
    "TRABAJO EN ALTURA",
    "ARMADO DE ANDAMIOS",
    "OPERADOR PLATAFORMAS MÓVILES MOTORIZADAS",
    "OPERADOR GRÚA",
    "RIGGER",
    "IZAJE",
    "OPERADOR EQUIPO EXCAVACIÓN Y MOVIMIENTO DE TIERRA",
    "ESPACIOS CONFINADOS",
    "SOLDADOR",
    "ACTIVIDADES CON LLAMA ABIERTA O TRABAJOS EN CALIENTE",
    "ESPECIALISTA SEC CON INTERVENCIÓN EN LÍNEAS DE GAS",
    "OPERADOR EQUIPO RADIACTIVO",
    "AISLACIÓN Y BLOQUEO DE ENERGÍAS",
    "INSTALADOR ELÉCTRICO",
    "INTERVENCIÓN EN ENERGÍA ELÉCTRICA",
    "MANIPULADOR DE EXPLOSIVOS",
    "CONDUCCIÓN",
    "CONDUCCIÓN DE BUS O VEHÍCULOS DE TRANSPORTE DE CARGA",
    "CONDUCCIÓN MINA",
]


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


async def main():
    # --- Admin ---
    admin = await db.users.find_one({"email": "admin@elearning.com"})
    if not admin:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": "admin@elearning.com",
            "password_hash": hash_password("admin123"),
            "full_name": "Administrador",
            "rut": "11111111-1",
            "company": "E-Learning Platform",
            "role_ids": [],
            "is_admin": True,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        print("✓ Admin created: admin@elearning.com / admin123")
    else:
        print("• Admin already exists")

    # --- Demo student ---
    student = await db.users.find_one({"email": "demo.alumno@test.com"})
    if not student:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": "demo.alumno@test.com",
            "password_hash": hash_password("demo123"),
            "full_name": "Alumno Demo",
            "rut": "22222222-2",
            "company": "Empresa Demo",
            "role_ids": [],
            "is_admin": False,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        print("✓ Demo student created: demo.alumno@test.com / demo123")
    else:
        print("• Demo student already exists")

    # --- Predefined roles ---
    created_roles = 0
    for role_name in PREDEFINED_ROLES:
        existing = await db.roles.find_one({"name": role_name})
        if not existing:
            await db.roles.insert_one({
                "role_id": f"role_{uuid.uuid4().hex[:12]}",
                "name": role_name,
                "description": f"Rol predefinido: {role_name}",
                "course_ids": [],
                "course_order": [],
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            created_roles += 1
    print(f"✓ Predefined roles seeded ({created_roles} new, {len(PREDEFINED_ROLES) - created_roles} already existed)")

    # --- Branding (singleton) ---
    branding = await db.branding.find_one({})
    if not branding:
        await db.branding.insert_one({
            "id": "default",
            "primary_color": "#1e40af",
            "secondary_color": "#3b82f6",
            "footer_text": "© 2025 E-Learning Platform - Capacitaciones",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        print("✓ Branding initialized")
    else:
        print("• Branding already exists")

    await close_pool()
    print("\nSeed complete.")


if __name__ == "__main__":
    asyncio.run(main())
