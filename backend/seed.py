"""Seed initial data for the multi-tenant Aptiva platform.

Creates:
  - 1 super_admin (global, no company)
  - 1 demo company "Aptiva Demo"
  - 1 admin for that company
  - 1 trabajador (worker) for that company
  - 3 sample areas + 3 sample activities + a few document types for the demo company
"""
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


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


async def main():
    now = datetime.now(timezone.utc).isoformat()

    # ---- 1) SuperAdmin (global)
    if not await db.users.find_one({"email": "superadmin@aptiva.com"}):
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "company_id": None,
            "email": "superadmin@aptiva.com",
            "password_hash": hash_password("superadmin123"),
            "full_name": "Super Administrador Aptiva",
            "is_super_admin": True,
            "is_admin": False,
            "is_active": True,
            "area_ids": [],
            "activity_ids": [],
            "created_at": now,
        })
        print("✓ SuperAdmin: superadmin@aptiva.com / superadmin123")
    else:
        print("• SuperAdmin already exists")

    # ---- 2) Demo company
    demo_company_id = None
    existing = await db.companies.find_one({"name": "Aptiva Demo"})
    if existing:
        demo_company_id = existing["company_id"]
        print(f"• Company 'Aptiva Demo' already exists ({demo_company_id})")
    else:
        demo_company_id = f"company_{uuid.uuid4().hex[:12]}"
        await db.companies.insert_one({
            "company_id": demo_company_id,
            "name": "Aptiva Demo",
            "rut": "76.000.000-1",
            "contact_email": "contacto@aptivademo.com",
            "is_active": True,
            "primary_color": "#2563EB",
            "secondary_color": "#3B82F6",
            "footer_text": "© Aptiva Demo",
            "created_at": now,
        })
        print(f"✓ Company 'Aptiva Demo' created ({demo_company_id})")

    # ---- 3) Admin for demo company
    if not await db.users.find_one({"email": "admin@aptivademo.com"}):
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "company_id": demo_company_id,
            "email": "admin@aptivademo.com",
            "password_hash": hash_password("admin123"),
            "full_name": "Administrador Aptiva Demo",
            "rut": "11.111.111-1",
            "company": "Aptiva Demo",
            "is_super_admin": False,
            "is_admin": True,
            "is_active": True,
            "area_ids": [],
            "activity_ids": [],
            "created_at": now,
        })
        print("✓ Admin: admin@aptivademo.com / admin123 (Aptiva Demo)")
    else:
        print("• Demo admin already exists")

    # ---- 4) Sample areas
    sample_areas = ["Operaciones Mina", "Mantenimiento", "Administración"]
    area_id_by_name = {}
    for name in sample_areas:
        existing = await db.areas.find_one({"company_id": demo_company_id, "name": name})
        if existing:
            area_id_by_name[name] = existing["area_id"]
        else:
            area_id = f"area_{uuid.uuid4().hex[:12]}"
            await db.areas.insert_one({
                "area_id": area_id,
                "company_id": demo_company_id,
                "name": name,
                "description": f"Área: {name}",
                "created_at": now,
            })
            area_id_by_name[name] = area_id
    print(f"✓ Areas: {list(area_id_by_name.keys())}")

    # ---- 5) Sample activities (ex-roles)
    sample_activities = ["Trabajo en Altura", "Conducción", "Soldadura"]
    activity_id_by_name = {}
    for name in sample_activities:
        existing = await db.activities.find_one({"company_id": demo_company_id, "name": name})
        if existing:
            activity_id_by_name[name] = existing["activity_id"]
        else:
            act_id = f"activity_{uuid.uuid4().hex[:12]}"
            await db.activities.insert_one({
                "activity_id": act_id,
                "company_id": demo_company_id,
                "name": name,
                "description": f"Actividad: {name}",
                "created_at": now,
            })
            activity_id_by_name[name] = act_id
    print(f"✓ Activities: {list(activity_id_by_name.keys())}")

    # ---- 6) Sample document types
    sample_doctypes = [
        ("Contrato de Trabajo", False, [], []),
        ("Examen Pre-ocupacional", True, [], []),
        ("Certificado Altura", True, [], [activity_id_by_name["Trabajo en Altura"]]),
        ("Licencia de Conducir", True, [], [activity_id_by_name["Conducción"]]),
    ]
    for name, requires_expiry, area_ids, activity_ids in sample_doctypes:
        existing = await db.document_types.find_one({"company_id": demo_company_id, "name": name})
        if not existing:
            await db.document_types.insert_one({
                "document_type_id": f"doctype_{uuid.uuid4().hex[:12]}",
                "company_id": demo_company_id,
                "name": name,
                "description": f"Documento: {name}",
                "requires_expiry": requires_expiry,
                "area_ids": area_ids,
                "activity_ids": activity_ids,
                "is_active": True,
                "created_at": now,
            })
    print(f"✓ Document types: {[d[0] for d in sample_doctypes]}")

    # ---- 7) Sample trabajador
    if not await db.users.find_one({"email": "trabajador@aptivademo.com"}):
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "company_id": demo_company_id,
            "email": "trabajador@aptivademo.com",
            "password_hash": hash_password("trabajador123"),
            "full_name": "Trabajador Demo",
            "rut": "22.222.222-2",
            "company": "Aptiva Demo",
            "is_super_admin": False,
            "is_admin": False,
            "is_active": True,
            "area_ids": [area_id_by_name["Operaciones Mina"]],
            "activity_ids": [activity_id_by_name["Trabajo en Altura"]],
            "created_at": now,
        })
        print("✓ Trabajador: trabajador@aptivademo.com / trabajador123")
    else:
        print("• Demo trabajador already exists")

    await close_pool()
    print("\nSeed complete.")


if __name__ == "__main__":
    asyncio.run(main())
