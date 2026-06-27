# Test Credentials

## Aptiva Platform (Multi-tenant, Supabase PostgreSQL)

| Rol | Email | Password | Empresa |
|---|---|---|---|
| **SuperAdmin** (global) | `superadmin@aptiva.com` | `superadmin123` | — |
| **Admin** Aptiva Demo | `admin@aptivademo.com` | `admin123` | Aptiva Demo |
| **Trabajador** Aptiva Demo | `trabajador@aptivademo.com` | `trabajador123` | Aptiva Demo |

## Multi-tenant
- `companies` es la raíz multi-tenant. Cada tabla tiene `company_id`.
- SuperAdmin crea empresas y un admin para cada una.
- Admin gestiona usuarios/áreas/actividades/cursos/documentos de su empresa.
- Trabajadores solo ven datos de su empresa.

## Seed
Run `python3 /app/backend/seed.py` (idempotent):
- 1 SuperAdmin global
- 1 empresa demo "Aptiva Demo" + admin + trabajador
- 3 áreas: Operaciones Mina, Mantenimiento, Administración
- 3 actividades: Trabajo en Altura, Conducción, Soldadura
- 4 tipos de documento (Contrato, Examen Pre-ocupacional, Certificado Altura, Licencia Conducir)
