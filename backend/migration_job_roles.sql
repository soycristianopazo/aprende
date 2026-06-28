-- Aptiva — Cargos / Roles laborales + Scope en estándar mandante

-- 1. Tabla de cargos (Soldador, Eléctrico, Rigger, etc.)
CREATE TABLE IF NOT EXISTS job_roles (
    role_id      TEXT PRIMARY KEY,
    company_id   TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    description  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, name)
);
CREATE INDEX IF NOT EXISTS idx_job_roles_company ON job_roles(company_id);

-- 2. Usuarios: agregar role_id (cargo)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role_id TEXT;

-- 3. Standard items: scope opcional por área, cargo, actividad
ALTER TABLE mandante_standard_items
    ADD COLUMN IF NOT EXISTS area_id     TEXT,
    ADD COLUMN IF NOT EXISTS role_id     TEXT,
    ADD COLUMN IF NOT EXISTS activity_id TEXT;
