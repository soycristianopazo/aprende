"""
Reset & seed realistic fictional data for the contratista 'Río Loa SpA'.

- Wipes all child data of company_id='company_77bf0fe68d27' EXCEPT the admin user.
- Repopulates the company profile, areas, job_roles, activities, competencies,
  document_types, mandantes (Codelco Chuqui, Codelco RT, AMSA Centinela),
  contracts, mandante accreditation standard (categories + items with scope),
  and 8 realistic Chilean workers with full RUTs, areas, cargo, activities.

Run:
    python3 /app/backend/seed_rio_loa.py
"""
import asyncio
import os
import uuid
import bcrypt
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
import asyncpg

load_dotenv(Path(__file__).parent / ".env")

COMPANY_ID = "company_77bf0fe68d27"   # Río Loa
ADMIN_EMAIL = "admin@aptivademo.com"


def _hash(pwd: str) -> str:
    return bcrypt.hashpw(pwd.encode(), bcrypt.gensalt()).decode()


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def wipe(conn):
    """Delete every child row in this company except the admin user."""
    # Find admin user_id first
    admin = await conn.fetchrow(
        "SELECT user_id FROM users WHERE company_id=$1 AND email=$2",
        COMPANY_ID, ADMIN_EMAIL,
    )
    if not admin:
        raise RuntimeError(f"Admin {ADMIN_EMAIL} not found in {COMPANY_ID}")
    admin_id = admin["user_id"]

    # Order matters because of FKs (most are CASCADE on company_id but we keep
    # the company; we delete by company_id directly).
    statements = [
        ('DELETE FROM certificates WHERE company_id=$1', (COMPANY_ID,)),
        ('DELETE FROM evaluation_attempts WHERE company_id=$1', (COMPANY_ID,)),
        ('DELETE FROM course_completions WHERE company_id=$1', (COMPANY_ID,)),
        ('DELETE FROM worker_competencies WHERE company_id=$1', (COMPANY_ID,)),
        ('DELETE FROM worker_documents WHERE company_id=$1', (COMPANY_ID,)),
        ('DELETE FROM mandante_standard_items WHERE company_id=$1', (COMPANY_ID,)),
        ('DELETE FROM mandante_standard_categories WHERE company_id=$1', (COMPANY_ID,)),
        ('DELETE FROM contracts WHERE company_id=$1', (COMPANY_ID,)),
        ('DELETE FROM mandantes WHERE company_id=$1', (COMPANY_ID,)),
        ('DELETE FROM gerencias WHERE company_id=$1', (COMPANY_ID,)),
        ('DELETE FROM evaluations WHERE company_id=$1', (COMPANY_ID,)),
        ('DELETE FROM document_types WHERE company_id=$1', (COMPANY_ID,)),
        ('DELETE FROM competencies WHERE company_id=$1', (COMPANY_ID,)),
        ('DELETE FROM activities WHERE company_id=$1', (COMPANY_ID,)),
        ('DELETE FROM areas WHERE company_id=$1', (COMPANY_ID,)),
        ('DELETE FROM courses WHERE company_id=$1', (COMPANY_ID,)),
        ('DELETE FROM job_roles WHERE company_id=$1', (COMPANY_ID,)),
        # Delete every user EXCEPT admin
        ('DELETE FROM users WHERE company_id=$1 AND user_id<>$2', (COMPANY_ID, admin_id)),
    ]
    for sql, params in statements:
        await conn.execute(sql, *params)
    print(f"✓ Wiped all child data of {COMPANY_ID}, kept admin {admin_id}")
    return admin_id


async def update_company(conn):
    await conn.execute(
        """
        UPDATE companies SET
            name=$2, business_name=$3, rut=$4, contact_email=$5, contact_phone=$6,
            address=$7, city=$8, country=$9, website=$10, industry=$11,
            legal_representative=$12, legal_representative_rut=$13,
            primary_color=$14, secondary_color=$15, footer_text=$16,
            company_type=$17, is_active=true
        WHERE company_id=$1
        """,
        COMPANY_ID,
        "Río Loa SpA",
        "Servicios Mineros Río Loa SpA",
        "76.428.910-3",
        "contacto@rioloaspa.cl",
        "+56 55 234 5678",
        "Av. Granaderos 1234, Calama",
        "Calama",
        "Chile",
        "https://www.rioloaspa.cl",
        "Servicios Mineros y Construcción",
        "Patricio Fuentes Aguirre",
        "11.234.567-K",
        "#1E40AF",
        "#3B82F6",
        "© Río Loa SpA — Servicios Mineros",
        "contratista",
    )
    print("✓ Company profile updated to 'Río Loa SpA'")


async def seed_areas(conn):
    areas = [
        ("Operaciones Mina", "Operación directa en pit / rajo y planta."),
        ("Mantenimiento", "Mantención correctiva y preventiva de equipos."),
        ("Servicios Generales", "Aseo industrial, casino, transporte."),
        ("Prevención de Riesgos", "HSE, supervisión de seguridad y salud."),
    ]
    out = {}
    for name, desc in areas:
        aid = _id("area")
        await conn.execute(
            'INSERT INTO areas (area_id, company_id, name, description, created_at) VALUES ($1,$2,$3,$4,$5)',
            aid, COMPANY_ID, name, desc, _now(),
        )
        out[name] = aid
    print(f"✓ {len(out)} areas")
    return out


async def seed_job_roles(conn):
    roles = [
        ("Soldador Calificado", "Soldadura estructural, posición 3G/4G."),
        ("Eléctrico Industrial", "Instalaciones MT/BT, mantenimiento eléctrico."),
        ("Rigger / Maniobrista", "Maniobras de izaje con grúa móvil/torre."),
        ("Operador Equipo Pesado", "CAEX, Wheel Loader, Bulldozer."),
        ("Mecánico Mantenimiento", "Mantención mecánica de equipos mineros."),
        ("Supervisor de Terreno", "Supervisión operativa en faena."),
        ("Prevencionista de Riesgos", "Asesoría HSE / planes preventivos."),
        ("Mayordomo / Capataz", "Coordinación de cuadrilla en terreno."),
    ]
    out = {}
    for name, desc in roles:
        rid = _id("jr")
        await conn.execute(
            'INSERT INTO job_roles (role_id, company_id, name, description, created_at) VALUES ($1,$2,$3,$4,$5)',
            rid, COMPANY_ID, name, desc, _now(),
        )
        out[name] = rid
    print(f"✓ {len(out)} cargos")
    return out


async def seed_activities(conn, comp_ids):
    """Activities reference competencies via competency_ids[]."""
    activities = [
        ("Trabajo en Altura", "Tareas sobre 1.8m sin protección colectiva.",
         ["Curso Trabajo en Altura", "Curso Riesgos Críticos"]),
        ("Espacios Confinados", "Tareas en estanques, chimeneas, ductos.",
         ["Curso Espacios Confinados", "Curso Riesgos Críticos"]),
        ("Soldadura Estructural", "Soldadura de estructuras en faena.",
         ["Curso Soldadura Estructural 3G", "Curso Trabajo en Altura"]),
        ("Conducción Vehículos Pesados", "Operación de CAEX y camiones tolva.",
         ["Curso Conducción Camiones Mineros", "Curso Riesgos Críticos"]),
        ("Izaje y Maniobras", "Operación con grúa, eslingas, aparejos.",
         ["Curso Izaje y Aparejos", "Curso Trabajo en Altura"]),
        ("Trabajos Eléctricos en Tensión", "Intervención eléctrica energizada (MT/BT).",
         ["Curso Riesgos Críticos", "Curso IPER"]),
    ]
    out = {}
    for name, desc, comp_names in activities:
        aid = _id("activity")
        ids = [comp_ids[n] for n in comp_names if n in comp_ids]
        await conn.execute(
            'INSERT INTO activities (activity_id, company_id, name, description, competency_ids, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
            aid, COMPANY_ID, name, desc, ids, _now(),
        )
        out[name] = aid
    print(f"✓ {len(out)} actividades")
    return out


async def seed_competencies(conn):
    comps = [
        ("Curso Trabajo en Altura", "Acreditación trabajo en altura física.", 24),
        ("Curso Espacios Confinados", "Acreditación trabajos en espacios confinados.", 24),
        ("Curso Conducción Camiones Mineros", "Habilitación conducción CAEX clase D.", 12),
        ("Curso Soldadura Estructural 3G", "Calificación soldadura 3G según AWS.", 36),
        ("Curso Riesgos Críticos", "Identificación y control de riesgos críticos faena.", 12),
        ("Curso IPER", "Identificación de Peligros y Evaluación de Riesgos.", 24),
        ("Curso Izaje y Aparejos", "Operación segura de equipos de izaje.", 24),
    ]
    out = {}
    for name, desc, months in comps:
        cid = _id("comp")
        await conn.execute(
            'INSERT INTO competencies (competency_id, company_id, name, description, validity_months, is_active, created_at) VALUES ($1,$2,$3,$4,$5,true,$6)',
            cid, COMPANY_ID, name, desc, months, _now(),
        )
        out[name] = cid
    print(f"✓ {len(out)} competencias")
    return out


async def seed_doc_types(conn, area_ids, act_ids):
    dts = [
        ("Contrato de Trabajo", "Contrato firmado del trabajador.", False, [], []),
        ("Cédula de Identidad", "Copia escaneada por ambos lados.", True, [], []),
        ("Examen Pre-ocupacional", "Examen médico de aptitud al cargo.", True, [], []),
        ("Examen Altura Física", "Aptitud para trabajos en altura física.", True,
         [], [act_ids["Trabajo en Altura"]]),
        ("Licencia de Conducir Clase D", "Habilitación clase D vigente.", True,
         [], [act_ids["Conducción Vehículos Pesados"]]),
        ("Certificado de Antecedentes", "Vigencia 30 días.", True, [], []),
        ("Inducción HSE Mandante", "Inducción HSE específica del mandante.", True, [], []),
    ]
    out = {}
    for name, desc, expiry, areas, acts in dts:
        did = _id("doctype")
        await conn.execute(
            'INSERT INTO document_types (document_type_id, company_id, name, description, requires_expiry, area_ids, activity_ids, is_active, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8)',
            did, COMPANY_ID, name, desc, expiry, areas, acts, _now(),
        )
        out[name] = did
    print(f"✓ {len(out)} tipos de documento")
    return out


async def seed_mandantes(conn):
    mandantes = [
        ("Codelco División Chuquicamata", "61.704.000-K", "contacto.chuqui@codelco.cl",
         "+56 55 232 2000", "Avda. Granaderos s/n, Calama",
         "Mandante histórico — mina rajo abierto + planta concentradora."),
        ("Codelco División Radomiro Tomic", "61.704.000-K", "contacto.rt@codelco.cl",
         "+56 55 232 4000", "Carretera B-24 km 21, Calama",
         "Mandante — explotación SX/EW de óxidos de cobre."),
        ("Antofagasta Minerals — Centinela", "76.255.500-8", "contacto@aminerals.cl",
         "+56 55 268 9000", "Sierra Gorda, Región de Antofagasta",
         "Mandante — explotación cobre-oro, sulfuros."),
    ]
    out = {}
    for name, rut, email, phone, addr, notes in mandantes:
        mid = _id("mandante")
        await conn.execute(
            'INSERT INTO mandantes (mandante_id, company_id, name, rut, contact_email, contact_phone, address, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
            mid, COMPANY_ID, name, rut, email, phone, addr, notes, _now(),
        )
        out[name] = mid
    print(f"✓ {len(out)} mandantes")
    return out


async def seed_contracts(conn, mandantes):
    contracts = [
        (mandantes["Codelco División Chuquicamata"], "CHUQ-2026-014",
         "Mantención correctiva chancado primario y secundario", "active",
         "2026-01-15", "2026-12-31"),
        (mandantes["Codelco División Chuquicamata"], "CHUQ-2025-089",
         "Servicios de soldadura estructural taller mecánico", "active",
         "2025-09-01", "2026-08-31"),
        (mandantes["Codelco División Radomiro Tomic"], "RT-2026-003",
         "Servicios eléctricos planta SX/EW y subestaciones", "active",
         "2026-02-01", "2027-01-31"),
        (mandantes["Antofagasta Minerals — Centinela"], "CEN-2025-022",
         "Maniobras de izaje y soporte mantenimiento línea SAG", "active",
         "2025-11-01", "2026-10-31"),
    ]
    out = []
    for mid, num, glosa, status, start, end in contracts:
        cid = _id("contract")
        await conn.execute(
            'INSERT INTO contracts (contract_id, company_id, mandante_id, contract_number, glosa, start_date, end_date, status, worker_ids, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
            cid, COMPANY_ID, mid, num, glosa,
            datetime.fromisoformat(start).replace(tzinfo=timezone.utc),
            datetime.fromisoformat(end).replace(tzinfo=timezone.utc),
            status, [], _now(),
        )
        out.append(cid)
    print(f"✓ {len(out)} contratos")
    return out


async def seed_standard(conn, mandantes, doc_types, area_ids, role_ids, act_ids):
    """Codelco Chuqui standard with realistic categories + items with scope."""
    chuqui_id = mandantes["Codelco División Chuquicamata"]
    categories = [
        ("Documentación Legal", "Contratos, identidad y antecedentes.", 0,
         [
             ("Contrato de Trabajo firmado", doc_types["Contrato de Trabajo"], True, None, None, None),
             ("Cédula de Identidad", doc_types["Cédula de Identidad"], True, None, None, None),
             ("Certificado de Antecedentes (vigencia 30 días)", doc_types["Certificado de Antecedentes"], True, None, None, None),
         ]),
        ("Salud Ocupacional", "Aptitud médica.", 1,
         [
             ("Examen Pre-ocupacional", doc_types["Examen Pre-ocupacional"], True, None, None, None),
             ("Examen Altura Física (solo riesgo)", doc_types["Examen Altura Física"], True,
              None, None, act_ids["Trabajo en Altura"]),
         ]),
        ("Capacitaciones Obligatorias", "Cursos requeridos por la faena.", 2,
         [
             ("Inducción HSE Codelco", doc_types["Inducción HSE Mandante"], True, None, None, None),
             ("Acreditación Trabajo en Altura", None, True, None, None, act_ids["Trabajo en Altura"]),
             ("Acreditación Espacios Confinados", None, True, None, None, act_ids["Espacios Confinados"]),
             ("Riesgos Críticos (refresco anual)", None, True, None, None, None),
         ]),
        ("Habilitaciones específicas", "Licencias / habilitaciones por cargo o actividad.", 3,
         [
             ("Licencia de Conducir Clase D", doc_types["Licencia de Conducir Clase D"], True,
              None, role_ids["Operador Equipo Pesado"], None),
             ("Calificación Soldadura 3G", None, True,
              None, role_ids["Soldador Calificado"], None),
             ("Curso Rigger acreditado", None, False,
              None, role_ids["Rigger / Maniobrista"], None),
         ]),
    ]
    for cat_name, cat_desc, idx, items in categories:
        cat_id = _id("mscat")
        await conn.execute(
            'INSERT INTO mandante_standard_categories (category_id, company_id, mandante_id, name, description, order_index, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
            cat_id, COMPANY_ID, chuqui_id, cat_name, cat_desc, idx, _now(),
        )
        for j, (name, doctype_id, required, area_id, role_id, activity_id) in enumerate(items):
            iid = _id("msitem")
            await conn.execute(
                'INSERT INTO mandante_standard_items (item_id, company_id, mandante_id, category_id, name, document_type_id, is_required, order_index, area_id, role_id, activity_id, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
                iid, COMPANY_ID, chuqui_id, cat_id, name, doctype_id, required, j,
                area_id, role_id, activity_id, _now(),
            )
    print(f"✓ Estándar Codelco Chuquicamata: {len(categories)} categorías + ítems con scope")


async def seed_workers(conn, area_ids, role_ids, act_ids):
    workers = [
        # (full_name, rut, email, role, area, activities)
        ("Juan Carlos Soto Martínez", "17.234.567-8", "jsoto@rioloaspa.cl",
         "Soldador Calificado", "Operaciones Mina",
         ["Soldadura Estructural", "Trabajo en Altura"]),
        ("María José Pinto Rojas", "16.345.678-9", "mpinto@rioloaspa.cl",
         "Prevencionista de Riesgos", "Prevención de Riesgos",
         ["Trabajo en Altura", "Espacios Confinados", "Izaje y Maniobras"]),
        ("Pedro Antonio Ramírez Silva", "18.456.789-0", "pramirez@rioloaspa.cl",
         "Eléctrico Industrial", "Mantenimiento",
         ["Trabajos Eléctricos en Tensión"]),
        ("Carolina Andrea Muñoz Vega", "15.567.890-1", "cmunoz@rioloaspa.cl",
         "Supervisor de Terreno", "Operaciones Mina",
         ["Izaje y Maniobras", "Trabajo en Altura"]),
        ("Diego Esteban Vargas López", "19.678.901-2", "dvargas@rioloaspa.cl",
         "Operador Equipo Pesado", "Operaciones Mina",
         ["Conducción Vehículos Pesados"]),
        ("Francisca Belén Castillo Torres", "17.789.012-3", "fcastillo@rioloaspa.cl",
         "Mecánico Mantenimiento", "Mantenimiento",
         ["Espacios Confinados"]),
        ("Rodrigo Ignacio Espinoza Herrera", "18.890.123-4", "respinoza@rioloaspa.cl",
         "Rigger / Maniobrista", "Operaciones Mina",
         ["Izaje y Maniobras", "Trabajo en Altura"]),
        ("Camila Antonia Reyes Bravo", "16.901.234-5", "creyes@rioloaspa.cl",
         "Soldador Calificado", "Mantenimiento",
         ["Soldadura Estructural"]),
    ]
    out = []
    for full_name, rut, email, role_name, area_name, activity_names in workers:
        uid = _id("user")
        aids = [act_ids[a] for a in activity_names]
        # Default password = first 5 digits of RUT
        digits = "".join(c for c in (rut or "") if c.isdigit())
        pwd_plain = digits[:5] if len(digits) >= 5 else "trabajador"
        pwd = _hash(pwd_plain)
        await conn.execute(
            'INSERT INTO users (user_id, company_id, email, password_hash, full_name, rut, is_super_admin, is_admin, is_active, area_ids, activity_ids, role_id, created_at) VALUES ($1,$2,$3,$4,$5,$6,false,false,true,$7,$8,$9,$10)',
            uid, COMPANY_ID, email, pwd, full_name, rut,
            [area_ids[area_name]], aids, role_ids[role_name], _now(),
        )
        out.append({"user_id": uid, "name": full_name, "role": role_name, "acts": activity_names})
    print(f"✓ {len(out)} trabajadores creados (contraseña = primeros 5 dígitos del RUT)")
    return out


async def seed_worker_competencies(conn, workers, comp_ids):
    """Grant a mix of acquired/expired/missing competencies."""
    now = _now()
    rules = {
        # role -> [(competency_name, status)] where status in {valid, expired}
        "Soldador Calificado": [
            ("Curso Soldadura Estructural 3G", "valid"),
            ("Curso Trabajo en Altura", "expired"),
            ("Curso Riesgos Críticos", "valid"),
        ],
        "Prevencionista de Riesgos": [
            ("Curso IPER", "valid"),
            ("Curso Riesgos Críticos", "valid"),
            ("Curso Trabajo en Altura", "valid"),
            ("Curso Espacios Confinados", "valid"),
        ],
        "Eléctrico Industrial": [
            ("Curso Riesgos Críticos", "valid"),
            ("Curso IPER", "expired"),
        ],
        "Supervisor de Terreno": [
            ("Curso Trabajo en Altura", "valid"),
            ("Curso Izaje y Aparejos", "valid"),
            ("Curso IPER", "valid"),
        ],
        "Operador Equipo Pesado": [
            ("Curso Conducción Camiones Mineros", "valid"),
            ("Curso Riesgos Críticos", "expired"),
        ],
        "Mecánico Mantenimiento": [
            ("Curso Espacios Confinados", "valid"),
        ],
        "Rigger / Maniobrista": [
            ("Curso Izaje y Aparejos", "valid"),
            ("Curso Trabajo en Altura", "valid"),
        ],
    }
    count = 0
    for w in workers:
        for comp_name, status in rules.get(w["role"], []):
            cid = comp_ids.get(comp_name)
            if not cid:
                continue
            acquired_at = now - timedelta(days=180)
            if status == "valid":
                expiry = now + timedelta(days=200)
            else:
                expiry = now - timedelta(days=30)
            await conn.execute(
                'INSERT INTO worker_competencies (worker_competency_id, company_id, user_id, competency_id, source, source_course_id, acquired_at, expiry_date, file_url, original_name, notes, uploaded_by, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
                _id("wcomp"), COMPANY_ID, w["user_id"], cid, "manual", None,
                acquired_at, expiry, None, None,
                f"Acreditación cargada por seed ({'vigente' if status == 'valid' else 'vencida'})",
                None, now,
            )
            count += 1
    print(f"✓ {count} worker_competencies asignadas (mix vigente/vencidas)")


async def main():
    pool = await asyncpg.create_pool(dsn=os.environ["DATABASE_URL"], statement_cache_size=0)
    async with pool.acquire() as conn:
        async with conn.transaction():
            await wipe(conn)
            await update_company(conn)
            areas = await seed_areas(conn)
            roles = await seed_job_roles(conn)
            comps = await seed_competencies(conn)
            acts = await seed_activities(conn, comps)
            doctypes = await seed_doc_types(conn, areas, acts)
            mandantes = await seed_mandantes(conn)
            await seed_contracts(conn, mandantes)
            await seed_standard(conn, mandantes, doctypes, areas, roles, acts)
            workers = await seed_workers(conn, areas, roles, acts)
            await seed_worker_competencies(conn, workers, comps)
    await pool.close()
    print("\n🎉 Río Loa SpA listo con datos ficticios realistas.")
    print("   Admin login: admin@aptivademo.com / admin123")


if __name__ == "__main__":
    asyncio.run(main())
