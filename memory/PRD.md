# Aptiva — PRD

## Problem Statement
Aptiva es una plataforma multi-empresa (multi-tenant) para **Gestión de Competencias, Capacitaciones y Storage de Trabajadores**. Su propósito es asegurar que cada trabajador cuente con la documentación, salud compatible, competencias y conocimiento de los riesgos y controles necesarios, de manera que ante un accidente, auditoría o fiscalización, la empresa cuente con los respaldos para blindarse de responsabilidades civiles y penales según la legislación.

Vendor / dueño del producto: **DoSoft**.

## User Personas
1. **SuperAdmin** (global, DoSoft): Crea y administra empresas y sus administradores iniciales. Acceso transversal a métricas globales.
2. **Admin de Empresa**: Gestiona su empresa (trabajadores, áreas, actividades, tipos de documento, expedientes/storage, cursos, evaluaciones, certificados, reportes, branding).
3. **Trabajador**: Accede a su "Ruta Aptiva" (capacitaciones auto-asignadas según su área/actividad/competencias) y a sus constancias.

## Core Requirements
- Multi-tenant por `company_id` (toda tabla operativa scopeada).
- Autenticación email/contraseña con 3 roles (SuperAdmin, Admin, Trabajador).
- Storage de Trabajadores (expediente digital): contratos, exámenes pre-ocupacionales, certificados de salud, licencias, con fechas de vencimiento.
- Matriz de Competencias por empresa (catálogo, asignación a actividades, adquisición vía curso o subida manual con vencimiento).
- **Ruta Aptiva**: capacitaciones que el trabajador ve automáticamente según su área, actividad y competencias requeridas.
- Evaluaciones con scoring automático.
- Certificados/Constancias PDF verificables con código.
- Reportes exportables CSV/Excel.
- Branding por empresa (logo, banner, colores).
- Importación CSV de trabajadores.

## Technical Stack
- **Frontend**: React + Tailwind + Shadcn UI
- **Backend**: FastAPI (Python)
- **DB**: Supabase PostgreSQL (vía asyncpg)
- **Storage**: Supabase Storage (proxied por backend en `/api/files/...`)
- **PDF**: ReportLab
- **Auth**: JWT + (Emergent) Google OAuth

## Architecture
```
/app/
├── backend/
│   ├── server.py             # Endpoints legacy adaptados a multi-tenant
│   ├── routes_v2.py          # SuperAdmin, Companies, Users multi-tenant, Areas, DocumentTypes, WorkerDocuments, UsersImport
│   ├── init_schema_v2.sql    # Esquema PostgreSQL multi-tenant
│   ├── storage_client.py     # Wrapper Supabase Storage
│   └── seed.py               # Seed idempotente
└── frontend/src/
    ├── App.js
    ├── contexts/AuthContext.js
    ├── layouts/{SuperAdminLayout, AdminLayout, StudentLayout}.js
    └── pages/{Landing, Login, Register, AuthCallback, VerifyCertificate}
        + superadmin/{Dashboard, Companies}
        + admin/{Dashboard, Users, UsersImport, Areas, Roles, Courses, CourseEdit, Evaluations, DocumentTypes, WorkerDocuments, Certificates, Reports, Branding}
        + student/{Dashboard, Course, Evaluation, Certificates}
```

## DB Schema (multi-tenant)
- `companies`: {id, name, rut, is_active}
- `users`: {id, company_id, email, is_super_admin, is_admin, area_ids, activity_ids}
- `areas`: {id, company_id, name}
- `activities`: {id, company_id, name}
- `document_types`: {id, company_id, name, requires_expiry}
- `worker_documents`: {id, company_id, user_id, document_type_id, files (JSONB)}
- `courses`, `evaluations`, `certificates`: scopeadas por `company_id`.

## Brand & Copy (Fase 2 — completed 2026-02)
- Title HTML: "Aptiva — Competencias, Capacitaciones y Storage de Trabajadores"
- Tagline: "Gestión de Competencias, Capacitaciones y Storage"
- Hero: "Blinda a tu empresa con trabajadores **competentes y respaldados**"
- "Ruta Aptiva" = nombre branded del plan de capacitación autogestionado del trabajador.
- "Mis Cursos" → "Mi Ruta Aptiva"; "Mis Certificados" (trabajador) → "Mis Constancias".
- Footers: "© <year> DoSoft · Aptiva — Gestión de Competencias, Capacitaciones y Storage".

## What's Been Implemented (CHANGELOG)
### 2026-02 — Landing v2 (Evidencia Digital)
- [x] Landing reescrita con nueva narrativa "Cada trabajador competente. Cada requisito respaldado.": hero + 7 dimensiones de requerimientos (Cargo/Área/Actividad/Proyecto/Riesgos/Legal/Procedimientos), control total (5 items), verificación en terreno (5 checks), anticípate al incumplimiento (3 cards Vigente/Por vencer/Vencido), sección oscura "Protege a tu organización" (6 puntos legales + 3 métricas 100%/Multi-empresa/24/7), CTA y footer.
- [x] Title HTML + meta description + OG actualizados a "Evidencia Digital".
- [x] Smoke test visual confirmado (7 cards requirements, 5 control, 5 field-checks, 6 legal-proofs renderizados).

### 2026-02 — F6 (Mapa de Calor de Cumplimiento)
- [x] Backend: `GET /api/compliance/heatmap` (admin) que entrega `activities`, `competencies`, `cells` (actividad × competencia × {acquired, expired, pending, percentage}), `summary` (avg %, críticas, en verde, total trabajadores) y `generated_at`.
- [x] Backend: `GET /api/compliance/heatmap/export` que devuelve CSV "Listo para auditoría" (UTF-8 BOM, `;` separador, Empresa/RUT/Generado headers + matriz + Resumen, filename `aptiva_cumplimiento_YYYYMMDD_HHMM.csv`).
- [x] Frontend `/admin/compliance`: 4 tarjetas resumen (% promedio, trabajadores, celdas verdes, celdas críticas), matriz heatmap con color-coding (rojo <50, ámbar 50-79, verde ≥80, gris sin trabajadores), tooltips por celda, botón "Exportar CSV" y leyenda.
- [x] Sidebar Admin con nuevo item "Cumplimiento" (icono Flame) justo después de Dashboard.
- [x] Tests: 10/10 backend pytest + 10/10 frontend Playwright passing (`/app/backend/tests/test_f6_compliance_heatmap.py`).

### 2026-02 — Fase 5 (Motor "Ruta Aptiva")
- [x] `/api/student/progress` ahora es competency-driven: para cada trabajador calcula `required_competencies` (desde sus actividades), `acquired_active` y `acquired_expired` (desde worker_competencies), `missing_competencies` (incluye vigentes y vencidas).
- [x] Filtro de cursos: solo se devuelven los que (a) son generales (sin `grants_competency_ids`), (b) otorgan al menos una competencia faltante, o (c) ya están completados (se mantienen como historial).
- [x] Legacy fallback: si las actividades del trabajador no tienen `competency_ids`, se muestran todos los cursos por área/actividad (sin regresión para empresas legacy).
- [x] Frontend Dashboard: nuevo widget "Tu Ruta Aptiva" que muestra X/Y competencias acreditadas + badges de las pendientes/vencidas, solo visible cuando `required_competencies_total > 0`.
- [x] Tests: 6/6 backend pytest passing (`/app/backend/tests/test_f5_ruta_aptiva.py`). Frontend widget validado por testing agent.

### 2026-02 — Fase 4 (Módulo Competencias)
- [x] DB migration aditiva: tabla `competencies`, tabla `worker_competencies`, columnas `activities.competency_ids[]` y `courses.grants_competency_ids[]` (ver `/app/backend/migration_f4_competencies.sql`).
- [x] Backend: CRUD `/api/competencies`, linkage activity↔competency vía `PUT /api/activities/{id}`, `POST /api/worker-competencies/{user_id}/upload` (multipart con archivo opcional + expiry auto-calculado), `GET /api/worker-competencies/{user_id}`, `DELETE /api/worker-competencies/{id}`, `GET /api/my-competencies` (unión requeridas+adquiridas).
- [x] Hook auto-grant: al aprobar evaluación de un curso con `grants_competency_ids`, se crea/actualiza la `worker_competency` con `source='course'` y expiry calculado desde `validity_months`.
- [x] Frontend Admin: páginas `/admin/competencies` (CRUD), `/admin/worker-competencies` (matriz por trabajador con upload + badges), edición de actividades con multi-select de competencias, edición de cursos con sección "Competencias que otorga".
- [x] Frontend Trabajador: `/student/my-competencies` con tarjetas resumen y badges de estado (Vigente/Por vencer/Vencida/Pendiente).
- [x] Nav actualizado: Admin sidebar incluye Competencias + Matriz Competencias. Student nav: Mi Ruta Aptiva · Mis Competencias · Mi Expediente · Mis Constancias.
- [x] Tests: 6/6 backend pytest passing (`/app/backend/tests/test_f4_competencies.py`). Frontend smoke verificado por testing agent.

### 2026-02 — F3.4 (Worker storage view)
- [x] Endpoint `/api/my-documents` ya existía y devuelve tipos requeridos + archivos subidos del trabajador (scoped por área/actividad).
- [x] Nueva página `/student/my-documents` ("Mi Expediente") con:
  - Tarjetas resumen (Vigentes / Por vencer / Vencidos / Pendientes).
  - Listado por tipo de documento con estado (Pendiente / Vigente / Por vencer / Vencido).
  - Descarga directa de cada archivo (proxy `/api/files/...`).
  - Empty-state explicando que el admin es quien sube los documentos.
- [x] Nav del trabajador ahora muestra: Mi Ruta Aptiva · Mi Expediente · Mis Constancias.
- [x] Smoke test manual confirmado con `trabajador@aptivademo.com` (4 docs, badges correctos, descarga 302 → Supabase signed URL).

### 2026-02 — Fase 2 (Textos / Brand)
- [x] Landing rediseñada con propuesta de valor de blindaje legal.
- [x] Login/Register descripciones alineadas a Aptiva.
- [x] Layouts (Super/Admin/Student) headers y footers actualizados.
- [x] Student Dashboard heading "Mi Ruta Aptiva" + empty-state.
- [x] Student Certificates heading "Mis Constancias".
- [x] meta description + OG tags + title HTML.
- [x] Verificado por testing agent: 25/25 (100%).

### Previo — Fases 1 + 3 (multi-tenant + UI admin)
- [x] Migración MongoDB → Supabase PostgreSQL.
- [x] Storage local → Supabase Storage (proxy backend).
- [x] Backend multi-tenant scoping vía `get_current_company_id()`.
- [x] SuperAdmin Dashboard + Companies CRUD.
- [x] Admin UI: Areas, DocumentTypes, WorkerDocuments, UsersImport.
- [x] Branding: paleta azul, favicon, logo Aptiva.

## Test Credentials (ver /app/memory/test_credentials.md)
| Rol | Email | Password |
|---|---|---|
| SuperAdmin | `superadmin@aptiva.com` | `superadmin123` |
| Admin Aptiva Demo | `admin@aptivademo.com` | `admin123` |
| Trabajador Aptiva Demo | `trabajador@aptivademo.com` | `trabajador123` |

## Prioritized Backlog

### P0 — Próximo
- **Seed con curso+evaluación que otorgue competencia** para validar auto-grant end-to-end y poder hacer demos sin configuración previa.

### P1
- Alertas por email (documentos/competencias por vencer).
- Refactor backend (`server.py` + `routes_v2.py` → `/app/backend/routes/`).

### P2 — Backlog
- **Fase 4 — Módulo Competencias**:
  - Catálogo de competencias por empresa.
  - Asignación de competencias a actividades.
  - Adquisición vía curso (al aprobar un curso, marca competencia) o subida manual por admin (con fecha de vencimiento).
  - Alertas de vencimiento próximo.
- **Fase 5 — Ruta Aptiva inteligente**: motor que combina área + actividad + competencias requeridas para construir la ruta del trabajador automáticamente.

### P2 — Mejoras
- Notificaciones por email (documentos/competencias por vencer).
- Refactor backend: consolidar `server.py` + `routes_v2.py` en `/app/backend/routes/`.
- Dashboard SuperAdmin: corregir fetch de stats globales (404/error observado en testing).
- Verificar 404s de favicon/logo en `/login` (assets con `?v=3` cache-bust).
- Eliminar/restringir Register público (en multi-tenant no debería existir auto-registro).
- Multi-idioma (es/en/pt).

### Known Issues (no bloqueantes)
- `pages/admin/Branding.js` aún tiene textos genéricos "la plataforma" — pendientes de pulir.
- SuperAdmin Dashboard: stats endpoint produce `Failed to fetch` (no crítico, no bloquea F4).

## Next Tasks
1. **F3.4** Vista trabajador de sus documentos.
2. **Fase 4** Módulo Competencias.
3. Refactor backend en `/app/backend/routes/`.
