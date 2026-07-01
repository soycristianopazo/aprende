"""
Seed realistic fictional data for FCAB (Ferrocarril de Antofagasta a Bolivia, MANDANTE).

- Preserves the existing FCAB company row and its admin (copazo@fcab.cl).
- Wipes all child rows scoped to company_id and repopulates:
  * Company profile (business name, address, colors)
  * 5 Gerencias (Mandantes create Gerencias, not Mandantes/Contracts)
  * 6 Areas · 12 Cargos · 10 Actividades · 13 Competencias · 10 Tipos de Documento
  * 4 Cursos ferroviarios activos
  * 12 Trabajadores con RUT chileno realista, contraseña = primeros 5 dígitos del RUT
  * Worker competencies con mix vigente/vencida para que el heatmap y la matriz muestren datos creíbles

Run:
    python3 /app/backend/seed_fcab.py
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

COMPANY_ID = "company_7e9075208f95"  # FCAB
ADMIN_EMAIL = "copazo@fcab.cl"


def _hash(pwd: str) -> str:
    return bcrypt.hashpw(pwd.encode(), bcrypt.gensalt()).decode()


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _first5(rut: str) -> str:
    digits = "".join(c for c in (rut or "") if c.isdigit())
    return digits[:5] if len(digits) >= 5 else "12345"


async def wipe(conn):
    admin = await conn.fetchrow(
        "SELECT user_id FROM users WHERE company_id=$1 AND email=$2",
        COMPANY_ID, ADMIN_EMAIL,
    )
    if not admin:
        raise RuntimeError(f"Admin {ADMIN_EMAIL} not found in {COMPANY_ID}")
    admin_id = admin["user_id"]
    statements = [
        'DELETE FROM certificates WHERE company_id=$1',
        'DELETE FROM evaluation_attempts WHERE company_id=$1',
        'DELETE FROM course_completions WHERE company_id=$1',
        'DELETE FROM worker_competencies WHERE company_id=$1',
        'DELETE FROM worker_documents WHERE company_id=$1',
        'DELETE FROM mandante_standard_items WHERE company_id=$1',
        'DELETE FROM mandante_standard_categories WHERE company_id=$1',
        'DELETE FROM contracts WHERE company_id=$1',
        'DELETE FROM mandantes WHERE company_id=$1',
        'DELETE FROM gerencias WHERE company_id=$1',
        'DELETE FROM evaluations WHERE company_id=$1',
        'DELETE FROM document_types WHERE company_id=$1',
        'DELETE FROM competencies WHERE company_id=$1',
        'DELETE FROM activities WHERE company_id=$1',
        'DELETE FROM areas WHERE company_id=$1',
        'DELETE FROM courses WHERE company_id=$1',
        'DELETE FROM job_roles WHERE company_id=$1',
    ]
    for sql in statements:
        await conn.execute(sql, COMPANY_ID)
    await conn.execute('DELETE FROM users WHERE company_id=$1 AND user_id<>$2', COMPANY_ID, admin_id)
    print(f"✓ Wiped FCAB child data (kept admin {admin_id})")


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
        "FCAB",
        "Ferrocarril de Antofagasta a Bolivia S.A.",
        "81.148.200-5",
        "contacto@fcab.cl",
        "+56 55 220 6000",
        "Bolívar 255",
        "Antofagasta",
        "Chile",
        "https://www.fcab.cl",
        "Transporte Ferroviario de Carga",
        "Ricardo Cerda Sánchez",
        "10.567.890-K",
        "#B91C1C",  # rojo ferroviario
        "#0F172A",  # azul acero
        "© FCAB — Ferrocarril de Antofagasta a Bolivia",
        "mandante",
    )
    print("✓ FCAB company profile actualizado")


async def seed_gerencias(conn):
    gerencias = [
        ("Gerencia General", "Estrategia general y representación (Cristian Opazo)."),
        ("Gerencia de Operaciones", "Operación de trenes, tráfico y despacho (Ricardo Cerda)."),
        ("Gerencia de Ingeniería y Mantenimiento", "Vía, catenaria, obras civiles (Andrés Villalobos)."),
        ("Gerencia de Material Rodante", "Locomotoras y vagones — talleres (Paula Sepúlveda)."),
        ("Gerencia HSE (Salud, Seguridad y Ambiente)", "Prevención de riesgos, salud ocupacional (María Elena Cortés)."),
    ]
    out = {}
    for name, desc in gerencias:
        gid = _id("ger")
        await conn.execute(
            'INSERT INTO gerencias (gerencia_id, company_id, name, description, worker_ids, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
            gid, COMPANY_ID, name, desc, [], _now(),
        )
        out[name] = gid
    print(f"✓ {len(out)} gerencias")
    return out


async def seed_areas(conn):
    areas = [
        ("Operaciones de Tráfico", "Despacho de trenes, control CTC, señalización."),
        ("Mantenimiento Vía y Estructuras", "Vía férrea, puentes, alcantarillas, catenaria."),
        ("Material Rodante", "Talleres de locomotoras y vagones."),
        ("Talleres Antofagasta", "Taller central mecánico y eléctrico."),
        ("Logística Portuaria", "Interfaz puerto de Antofagasta."),
        ("Seguridad y Prevención", "HSE, prevencionistas, brigada emergencias."),
    ]
    out = {}
    for name, desc in areas:
        aid = _id("area")
        await conn.execute(
            'INSERT INTO areas (area_id, company_id, name, description, created_at) VALUES ($1,$2,$3,$4,$5)',
            aid, COMPANY_ID, name, desc, _now(),
        )
        out[name] = aid
    print(f"✓ {len(out)} áreas")
    return out


async def seed_job_roles(conn):
    roles = [
        ("Maquinista Categoría A", "Operador de locomotoras diesel línea principal."),
        ("Ayudante de Maquinista", "Apoyo en cabina, aprendizaje de conducción."),
        ("Jefe de Tren", "Responsable operativo del convoy en ruta."),
        ("Cambiador / Guardaagujas", "Operación de cambios y desvíos en patio."),
        ("Supervisor de Tráfico", "Control de despacho y regulación de trenes."),
        ("Despachador CTC", "Despacho centralizado desde sala CTC Antofagasta."),
        ("Mecánico de Vía", "Mantención de rieles, durmientes y balasto."),
        ("Soldador Aluminotérmico", "Soldadura de rieles en terreno."),
        ("Electricista Ferroviario", "Catenaria, señalización eléctrica."),
        ("Mecánico Locomotora", "Mantención de locomotoras diésel."),
        ("Prevencionista de Riesgos", "HSE en operaciones y talleres."),
        ("Brigadista de Emergencias", "Respuesta a incidentes y descarrilamientos."),
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


async def seed_competencies(conn):
    comps = [
        ("Licencia Maquinista Categoría A", "Habilitación para operar locomotoras diesel línea principal.", 24),
        ("Reglamento General de Tráfico Ferroviario", "Reglamento operativo FCAB, actualización anual.", 12),
        ("Certificación Cambiador de Vías", "Operación segura de cambios y desvíos.", 24),
        ("Prevención de Descarrilamientos", "Detección de fallas de vía y protocolos.", 12),
        ("Manejo de Materiales Peligrosos (MERCPER)", "NCh 382 / clasificación ONU, transporte cargas peligrosas.", 12),
        ("Soldadura Aluminotérmica de Rieles", "Certificación técnica AWS soldadura de rieles.", 36),
        ("Trabajo en Vías Activas (LOTO ferroviario)", "Bloqueo, señalización y trabajo bajo protección.", 12),
        ("Primeros Auxilios Ferroviarios", "Atención pre-hospitalaria en ruta.", 12),
        ("Manejo Defensivo de Locomotoras", "Conducción segura, factores humanos.", 24),
        ("Inspección No Destructiva de Rieles", "Ultrasonido y partículas magnéticas.", 24),
        ("Examen Psicosensotécnico", "Aptitud psico-sensorial para operación ferroviaria.", 12),
        ("Riesgos Críticos Ferroviarios", "Refresco anual riesgos críticos FCAB.", 12),
        ("Combate de Incendios Locomotora", "Uso de extintores y protocolos en cabina.", 24),
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


async def seed_activities(conn, comp_ids):
    activities = [
        ("Operación de Locomotoras Diesel", "Conducción en línea principal.",
         ["Licencia Maquinista Categoría A", "Reglamento General de Tráfico Ferroviario",
          "Manejo Defensivo de Locomotoras", "Examen Psicosensotécnico", "Riesgos Críticos Ferroviarios"]),
        ("Maniobras en Patio", "Formación de convoy, cambios en playa.",
         ["Certificación Cambiador de Vías", "Reglamento General de Tráfico Ferroviario",
          "Riesgos Críticos Ferroviarios"]),
        ("Soldadura Aluminotérmica", "Soldadura de rieles en terreno.",
         ["Soldadura Aluminotérmica de Rieles", "Trabajo en Vías Activas (LOTO ferroviario)"]),
        ("Inspección de Vía", "Recorridos de inspección, ultrasonido.",
         ["Inspección No Destructiva de Rieles", "Prevención de Descarrilamientos",
          "Trabajo en Vías Activas (LOTO ferroviario)"]),
        ("Mantención Locomotoras", "Taller mecánico locomotoras.",
         ["Combate de Incendios Locomotora", "Riesgos Críticos Ferroviarios"]),
        ("Trabajo en Catenaria y Altura", "Trabajo sobre 1.8m en catenaria/estructuras.",
         ["Trabajo en Vías Activas (LOTO ferroviario)", "Primeros Auxilios Ferroviarios"]),
        ("Conducción Nocturna", "Turnos nocturnos línea principal.",
         ["Licencia Maquinista Categoría A", "Manejo Defensivo de Locomotoras",
          "Examen Psicosensotécnico"]),
        ("Manejo de Cargas Peligrosas", "Ácido sulfúrico, cátodos, concentrados.",
         ["Manejo de Materiales Peligrosos (MERCPER)", "Combate de Incendios Locomotora",
          "Riesgos Críticos Ferroviarios"]),
        ("Despacho CTC", "Control centralizado tráfico.",
         ["Reglamento General de Tráfico Ferroviario", "Examen Psicosensotécnico"]),
        ("Respuesta a Emergencias Ferroviarias", "Descarrilamientos, incendios, derrames.",
         ["Primeros Auxilios Ferroviarios", "Combate de Incendios Locomotora",
          "Riesgos Críticos Ferroviarios"]),
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


async def seed_doc_types(conn, act_ids):
    dts = [
        ("Contrato de Trabajo", "Contrato firmado FCAB.", False, [], []),
        ("Cédula de Identidad", "Copia por ambos lados.", True, [], []),
        ("Licencia Maquinista Ferroviario", "Habilitación oficial DGTM/FCAB.", True,
         [], [act_ids["Operación de Locomotoras Diesel"], act_ids["Conducción Nocturna"]]),
        ("Examen Psicosensotécnico", "Aptitud psico-sensorial vigente.", True,
         [], [act_ids["Operación de Locomotoras Diesel"], act_ids["Despacho CTC"]]),
        ("Examen Pre-ocupacional", "Aptitud médica al cargo.", True, [], []),
        ("Examen Audiometría", "Anual, cargos operativos.", True, [], []),
        ("Examen Visión (Ishihara)", "Discriminación cromática señales.", True,
         [], [act_ids["Operación de Locomotoras Diesel"], act_ids["Despacho CTC"]]),
        ("Certificado MERCPER", "Manejo materiales peligrosos.", True,
         [], [act_ids["Manejo de Cargas Peligrosas"]]),
        ("Inducción HSE FCAB", "Inducción específica al puesto FCAB.", True, [], []),
        ("Certificado de Antecedentes", "Vigencia 30 días.", True, [], []),
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


async def seed_courses(conn, comp_ids):
    """A handful of demo courses."""
    courses = [
        ("Curso Reglamento General de Tráfico Ferroviario 2026",
         "Refresco anual del reglamento operativo. Duración 8 horas.",
         8, comp_ids["Reglamento General de Tráfico Ferroviario"]),
        ("Manejo Defensivo de Locomotoras — Simulador",
         "20 horas en simulador. Prácticas de emergencia.",
         20, comp_ids["Manejo Defensivo de Locomotoras"]),
        ("MERCPER — Manejo de Materiales Peligrosos",
         "Certificación NCh 382. 16 horas presenciales.",
         16, comp_ids["Manejo de Materiales Peligrosos (MERCPER)"]),
        ("Prevención de Descarrilamientos y Riesgos Críticos",
         "Inspección de vía, señales, riesgos críticos FCAB.",
         12, comp_ids["Riesgos Críticos Ferroviarios"]),
    ]
    for name, desc, hours, comp_id in courses:
        await conn.execute(
            'INSERT INTO courses (course_id, company_id, name, description, hours, training_type, status, grants_competency_ids, area_ids, activity_ids, prerequisites, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
            _id("course"), COMPANY_ID, name, desc, hours, "presencial", "published",
            [comp_id], [], [], [], _now(),
        )
    print(f"✓ {len(courses)} cursos ferroviarios activos")


async def seed_workers(conn, area_ids, role_ids, act_ids):
    workers = [
        # (full_name, rut, email, cargo, area, activities)
        ("Cristián Osvaldo Riquelme Muñoz", "14.234.567-8", "criquelme@fcab.cl",
         "Maquinista Categoría A", "Operaciones de Tráfico",
         ["Operación de Locomotoras Diesel", "Conducción Nocturna", "Manejo de Cargas Peligrosas"]),
        ("Rodrigo Ignacio Bahamondes Carvajal", "15.345.678-9", "rbahamondes@fcab.cl",
         "Maquinista Categoría A", "Operaciones de Tráfico",
         ["Operación de Locomotoras Diesel", "Conducción Nocturna"]),
        ("Ana María Céspedes Fuentes", "17.456.789-0", "acespedes@fcab.cl",
         "Ayudante de Maquinista", "Operaciones de Tráfico",
         ["Operación de Locomotoras Diesel", "Maniobras en Patio"]),
        ("Jorge Andrés Contreras Vega", "13.567.890-1", "jcontreras@fcab.cl",
         "Jefe de Tren", "Operaciones de Tráfico",
         ["Operación de Locomotoras Diesel", "Maniobras en Patio", "Respuesta a Emergencias Ferroviarias"]),
        ("Patricia Elena Alarcón Salinas", "16.678.901-2", "palarcon@fcab.cl",
         "Despachador CTC", "Operaciones de Tráfico",
         ["Despacho CTC"]),
        ("Luis Alberto Molina Espinoza", "18.789.012-3", "lmolina@fcab.cl",
         "Cambiador / Guardaagujas", "Operaciones de Tráfico",
         ["Maniobras en Patio"]),
        ("Sergio Enrique Rojas Tapia", "12.890.123-4", "srojas@fcab.cl",
         "Supervisor de Tráfico", "Operaciones de Tráfico",
         ["Despacho CTC", "Maniobras en Patio", "Respuesta a Emergencias Ferroviarias"]),
        ("Miguel Ángel Fuentealba Pérez", "14.901.234-5", "mfuentealba@fcab.cl",
         "Mecánico de Vía", "Mantenimiento Vía y Estructuras",
         ["Inspección de Vía", "Trabajo en Catenaria y Altura"]),
        ("Ricardo Alfonso Núñez Aravena", "15.012.345-6", "rnunez@fcab.cl",
         "Soldador Aluminotérmico", "Mantenimiento Vía y Estructuras",
         ["Soldadura Aluminotérmica", "Inspección de Vía"]),
        ("Camila Andrea Vergara Salinas", "19.123.456-7", "cvergara@fcab.cl",
         "Electricista Ferroviario", "Mantenimiento Vía y Estructuras",
         ["Trabajo en Catenaria y Altura"]),
        ("Álvaro Sebastián Mardones Reyes", "17.234.008-9", "amardones@fcab.cl",
         "Mecánico Locomotora", "Material Rodante",
         ["Mantención Locomotoras"]),
        ("Ximena Beatriz Torres Alfaro", "13.345.109-0", "xtorres@fcab.cl",
         "Prevencionista de Riesgos", "Seguridad y Prevención",
         ["Respuesta a Emergencias Ferroviarias", "Inspección de Vía", "Mantención Locomotoras"]),
    ]
    out = []
    for full_name, rut, email, role_name, area_name, activity_names in workers:
        uid = _id("user")
        aids = [act_ids[a] for a in activity_names]
        pwd = _hash(_first5(rut))
        await conn.execute(
            'INSERT INTO users (user_id, company_id, email, password_hash, full_name, rut, is_super_admin, is_admin, is_active, area_ids, activity_ids, role_id, created_at) VALUES ($1,$2,$3,$4,$5,$6,false,false,true,$7,$8,$9,$10)',
            uid, COMPANY_ID, email, pwd, full_name, rut,
            [area_ids[area_name]], aids, role_ids[role_name], _now(),
        )
        out.append({"user_id": uid, "name": full_name, "role": role_name, "acts": activity_names})
    print(f"✓ {len(out)} trabajadores (contraseña = primeros 5 dígitos del RUT)")
    return out


async def seed_worker_competencies(conn, workers, comp_ids):
    now = _now()
    rules = {
        "Maquinista Categoría A": [
            ("Licencia Maquinista Categoría A", "valid"),
            ("Reglamento General de Tráfico Ferroviario", "valid"),
            ("Manejo Defensivo de Locomotoras", "valid"),
            ("Examen Psicosensotécnico", "expired"),
            ("Riesgos Críticos Ferroviarios", "valid"),
        ],
        "Ayudante de Maquinista": [
            ("Reglamento General de Tráfico Ferroviario", "valid"),
            ("Riesgos Críticos Ferroviarios", "valid"),
        ],
        "Jefe de Tren": [
            ("Reglamento General de Tráfico Ferroviario", "valid"),
            ("Manejo Defensivo de Locomotoras", "valid"),
            ("Primeros Auxilios Ferroviarios", "valid"),
            ("Riesgos Críticos Ferroviarios", "expired"),
        ],
        "Despachador CTC": [
            ("Reglamento General de Tráfico Ferroviario", "valid"),
            ("Examen Psicosensotécnico", "valid"),
        ],
        "Cambiador / Guardaagujas": [
            ("Certificación Cambiador de Vías", "valid"),
            ("Reglamento General de Tráfico Ferroviario", "expired"),
        ],
        "Supervisor de Tráfico": [
            ("Reglamento General de Tráfico Ferroviario", "valid"),
            ("Examen Psicosensotécnico", "valid"),
            ("Riesgos Críticos Ferroviarios", "valid"),
            ("Primeros Auxilios Ferroviarios", "valid"),
        ],
        "Mecánico de Vía": [
            ("Inspección No Destructiva de Rieles", "valid"),
            ("Prevención de Descarrilamientos", "expired"),
            ("Trabajo en Vías Activas (LOTO ferroviario)", "valid"),
        ],
        "Soldador Aluminotérmico": [
            ("Soldadura Aluminotérmica de Rieles", "valid"),
            ("Trabajo en Vías Activas (LOTO ferroviario)", "valid"),
        ],
        "Electricista Ferroviario": [
            ("Trabajo en Vías Activas (LOTO ferroviario)", "valid"),
            ("Primeros Auxilios Ferroviarios", "expired"),
        ],
        "Mecánico Locomotora": [
            ("Combate de Incendios Locomotora", "valid"),
            ("Riesgos Críticos Ferroviarios", "valid"),
        ],
        "Prevencionista de Riesgos": [
            ("Primeros Auxilios Ferroviarios", "valid"),
            ("Combate de Incendios Locomotora", "valid"),
            ("Riesgos Críticos Ferroviarios", "valid"),
            ("Manejo de Materiales Peligrosos (MERCPER)", "valid"),
        ],
    }
    count = 0
    for w in workers:
        for comp_name, status in rules.get(w["role"], []):
            cid = comp_ids.get(comp_name)
            if not cid:
                continue
            acquired_at = now - timedelta(days=180)
            expiry = (now + timedelta(days=200)) if status == "valid" else (now - timedelta(days=30))
            await conn.execute(
                'INSERT INTO worker_competencies (worker_competency_id, company_id, user_id, competency_id, source, source_course_id, acquired_at, expiry_date, file_url, original_name, notes, uploaded_by, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
                _id("wcomp"), COMPANY_ID, w["user_id"], cid, "manual", None,
                acquired_at, expiry, None, None,
                f"Acreditación por seed ({'vigente' if status == 'valid' else 'vencida'})",
                None, now,
            )
            count += 1
    print(f"✓ {count} worker_competencies (mix vigente/vencidas)")


async def main():
    pool = await asyncpg.create_pool(dsn=os.environ["DATABASE_URL"], statement_cache_size=0)
    async with pool.acquire() as conn:
        async with conn.transaction():
            await wipe(conn)
            await update_company(conn)
            await seed_gerencias(conn)
            areas = await seed_areas(conn)
            roles = await seed_job_roles(conn)
            comps = await seed_competencies(conn)
            acts = await seed_activities(conn, comps)
            await seed_doc_types(conn, acts)
            await seed_courses(conn, comps)
            workers = await seed_workers(conn, areas, roles, acts)
            await seed_worker_competencies(conn, workers, comps)
    await pool.close()
    print("\n🚆 FCAB listo con datos ferroviarios realistas.")
    print(f"   Admin: {ADMIN_EMAIL} (contraseña original del SuperAdmin al crear el admin)")
    print("   Trabajadores: contraseña = primeros 5 dígitos del RUT")


if __name__ == "__main__":
    asyncio.run(main())
