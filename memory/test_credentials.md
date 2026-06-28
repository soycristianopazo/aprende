# Test Credentials

## Aptiva Platform (Multi-tenant, Supabase PostgreSQL)

### Admin
| Rol | Email | Password | Empresa |
|---|---|---|---|
| **SuperAdmin** (global) | `superadmin@aptiva.com` | `superadmin123` | — |
| **Admin** Río Loa SpA | `admin@aptivademo.com` | `admin123` | Río Loa SpA (contratista) |

### Trabajadores Río Loa SpA
> Contraseña inicial = **primeros 5 dígitos del RUT** (sin puntos ni guion).

| Email | RUT | Cargo | Contraseña |
|---|---|---|---|
| `jsoto@rioloaspa.cl` | 17.234.567-8 | Soldador Calificado | `17234` |
| `mpinto@rioloaspa.cl` | 16.345.678-9 | Prevencionista de Riesgos | `16345` |
| `pramirez@rioloaspa.cl` | 18.456.789-0 | Eléctrico Industrial | `18456` |
| `cmunoz@rioloaspa.cl` | 15.567.890-1 | Supervisor de Terreno | `15567` |
| `dvargas@rioloaspa.cl` | 19.678.901-2 | Operador Equipo Pesado | `19678` |
| `fcastillo@rioloaspa.cl` | 17.789.012-3 | Mecánico | `17789` |
| `respinoza@rioloaspa.cl` | 18.890.123-4 | Rigger | `18890` |
| `creyes@rioloaspa.cl` | 16.901.234-5 | Soldador Calificado | `16901` |

> El admin puede restablecer la contraseña de cualquier trabajador desde `/admin/users` → botón **Configurar** → **Restablecer**.

## Multi-tenant
- `companies` es la raíz multi-tenant. Cada tabla tiene `company_id`.
- SuperAdmin crea empresas y un admin para cada una.
- Admin gestiona trabajadores/cargos/áreas/actividades/cursos/documentos de su empresa.
- Trabajadores solo ven datos de su empresa.

## Seed
- `python3 /app/backend/seed.py` (idempotent, demo genérico).
- `python3 /app/backend/seed_rio_loa.py` (wipe + seed realista de Río Loa SpA, contraseñas = primeros 5 dígitos del RUT).
