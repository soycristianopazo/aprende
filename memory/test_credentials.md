# Test Credentials

## Aptiva Platform (Multi-tenant, Supabase PostgreSQL)

### Admin
| Rol | Email | Password | Empresa |
|---|---|---|---|
| **SuperAdmin** (global) | `superadmin@aptiva.com` | `superadmin123` | — |
| **Admin** Río Loa SpA | `admin@aptivademo.com` | `admin123` | Río Loa SpA (contratista) |
| **Admin** FCAB | `copazo@fcab.cl` | `fcab123` | FCAB (mandante) |

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

### Trabajadores FCAB (Mandante ferroviario)
> Contraseña inicial = **primeros 5 dígitos del RUT** (sin puntos ni guion).

| Email | RUT | Cargo | Password |
|---|---|---|---|
| `criquelme@fcab.cl` | 14.234.567-8 | Maquinista Categoría A | `14234` |
| `rbahamondes@fcab.cl` | 15.345.678-9 | Maquinista Categoría A | `15345` |
| `acespedes@fcab.cl` | 17.456.789-0 | Ayudante de Maquinista | `17456` |
| `jcontreras@fcab.cl` | 13.567.890-1 | Jefe de Tren | `13567` |
| `palarcon@fcab.cl` | 16.678.901-2 | Despachador CTC | `16678` |
| `lmolina@fcab.cl` | 18.789.012-3 | Cambiador / Guardaagujas | `18789` |
| `srojas@fcab.cl` | 12.890.123-4 | Supervisor de Tráfico | `12890` |
| `mfuentealba@fcab.cl` | 14.901.234-5 | Mecánico de Vía | `14901` |
| `rnunez@fcab.cl` | 15.012.345-6 | Soldador Aluminotérmico | `15012` |
| `cvergara@fcab.cl` | 19.123.456-7 | Electricista Ferroviario | `19123` |
| `amardones@fcab.cl` | 17.234.008-9 | Mecánico Locomotora | `17234` |
| `xtorres@fcab.cl` | 13.345.109-0 | Prevencionista de Riesgos | `13345` |

## Multi-tenant
- `companies` es la raíz multi-tenant. Cada tabla tiene `company_id`.
- SuperAdmin crea empresas y un admin para cada una.
- Admin gestiona trabajadores/cargos/áreas/actividades/cursos/documentos de su empresa.
- Trabajadores solo ven datos de su empresa.

## Seed
- `python3 /app/backend/seed.py` (idempotent, demo genérico).
- `python3 /app/backend/seed_rio_loa.py` (wipe + seed realista de Río Loa SpA, contraseñas = primeros 5 dígitos del RUT).
