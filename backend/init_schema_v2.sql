-- ============================================================
-- Aptiva Platform v2 - Multi-tenant Schema (PostgreSQL/Supabase)
-- ============================================================

-- Drop existing tables (clean slate)
DROP TABLE IF EXISTS worker_document_files CASCADE;
DROP TABLE IF EXISTS worker_documents CASCADE;
DROP TABLE IF EXISTS document_types CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS course_completions CASCADE;
DROP TABLE IF EXISTS evaluation_attempts CASCADE;
DROP TABLE IF EXISTS evaluations CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS areas CASCADE;
DROP TABLE IF EXISTS branding CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- ============================================================
-- COMPANIES (multi-tenant root)
-- ============================================================
CREATE TABLE companies (
    company_id        TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    rut               TEXT,
    contact_email     TEXT,
    contact_phone     TEXT,
    address           TEXT,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    -- Branding per company
    primary_color     TEXT DEFAULT '#2563EB',
    secondary_color   TEXT DEFAULT '#3B82F6',
    logo_url          TEXT,
    banner_logo_url   TEXT,
    signature_url     TEXT,
    footer_text       TEXT,
    footer_image_url  TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_companies_active ON companies(is_active);

-- ============================================================
-- USERS (super_admin global OR scoped to a company)
-- ============================================================
CREATE TABLE users (
    user_id           TEXT PRIMARY KEY,
    company_id        TEXT REFERENCES companies(company_id) ON DELETE CASCADE,  -- NULL for super_admin
    email             TEXT UNIQUE NOT NULL,
    password_hash     TEXT,
    full_name         TEXT,
    name              TEXT,
    rut               TEXT,
    company           TEXT,  -- display name (legacy text, kept for compat)
    is_super_admin    BOOLEAN NOT NULL DEFAULT FALSE,
    is_admin          BOOLEAN NOT NULL DEFAULT FALSE,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    area_ids          TEXT[] NOT NULL DEFAULT '{}',
    activity_ids      TEXT[] NOT NULL DEFAULT '{}',
    picture           TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- A RUT is unique within a company (different companies may have same RUT)
    UNIQUE (company_id, rut)
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_is_admin ON users(is_admin);
CREATE INDEX idx_users_is_super_admin ON users(is_super_admin);

-- ============================================================
-- AREAS  (per company - e.g. "Operaciones Mina", "Mantenimiento")
-- ============================================================
CREATE TABLE areas (
    area_id           TEXT PRIMARY KEY,
    company_id        TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    description       TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, name)
);
CREATE INDEX idx_areas_company ON areas(company_id);

-- ============================================================
-- ACTIVITIES  (ex-"roles" - per company - e.g. "Trabajo en altura")
-- ============================================================
CREATE TABLE activities (
    activity_id       TEXT PRIMARY KEY,
    company_id        TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    description       TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, name)
);
CREATE INDEX idx_activities_company ON activities(company_id);

-- ============================================================
-- COURSES  (per company; targeted by area_ids + activity_ids)
-- ============================================================
CREATE TABLE courses (
    course_id         TEXT PRIMARY KEY,
    company_id        TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    description       TEXT,
    hours             INTEGER NOT NULL DEFAULT 0,
    validity_hours    INTEGER NOT NULL DEFAULT 0,
    training_type     TEXT NOT NULL DEFAULT 'e-learning',
    video_url         TEXT,
    material_url      TEXT,
    status            TEXT NOT NULL DEFAULT 'draft',
    area_ids          TEXT[] NOT NULL DEFAULT '{}',
    activity_ids      TEXT[] NOT NULL DEFAULT '{}',
    prerequisites     TEXT[] NOT NULL DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_courses_company ON courses(company_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_areas ON courses USING GIN(area_ids);
CREATE INDEX idx_courses_activities ON courses USING GIN(activity_ids);

-- ============================================================
-- EVALUATIONS
-- ============================================================
CREATE TABLE evaluations (
    evaluation_id     TEXT PRIMARY KEY,
    company_id        TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    course_id         TEXT NOT NULL UNIQUE REFERENCES courses(course_id) ON DELETE CASCADE,
    questions         JSONB NOT NULL DEFAULT '[]'::jsonb,
    min_score         INTEGER NOT NULL DEFAULT 70,
    max_attempts      INTEGER NOT NULL DEFAULT 3,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_evaluations_company ON evaluations(company_id);

-- ============================================================
-- EVALUATION ATTEMPTS
-- ============================================================
CREATE TABLE evaluation_attempts (
    attempt_id        TEXT PRIMARY KEY,
    company_id        TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    evaluation_id     TEXT NOT NULL,
    course_id         TEXT,
    user_id           TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    answers           JSONB NOT NULL DEFAULT '[]'::jsonb,
    score             INTEGER,
    passed            BOOLEAN,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_attempts_company ON evaluation_attempts(company_id);
CREATE INDEX idx_attempts_user ON evaluation_attempts(user_id);

-- ============================================================
-- COURSE COMPLETIONS
-- ============================================================
CREATE TABLE course_completions (
    completion_id     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    company_id        TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    user_id           TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    course_id         TEXT NOT NULL,
    course_name       TEXT,
    score             INTEGER,
    hours             INTEGER,
    training_type     TEXT,
    completed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);
CREATE INDEX idx_completions_company ON course_completions(company_id);
CREATE INDEX idx_completions_user ON course_completions(user_id);

-- ============================================================
-- CERTIFICATES
-- ============================================================
CREATE TABLE certificates (
    certificate_id    TEXT PRIMARY KEY,
    company_id        TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    verification_code TEXT UNIQUE NOT NULL,
    user_id           TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    user_name         TEXT,
    user_rut          TEXT,
    user_company      TEXT,
    rut               TEXT,                       -- legacy alias
    role_id           TEXT,                       -- legacy
    role_name         TEXT,                       -- legacy
    role_ids          TEXT[] NOT NULL DEFAULT '{}',
    role_names        TEXT[] NOT NULL DEFAULT '{}',
    course_id         TEXT,
    course_name       TEXT,
    score             INTEGER,
    training_type     TEXT,
    certificate_type  TEXT DEFAULT 'role_completion',
    course_grades     JSONB NOT NULL DEFAULT '[]'::jsonb,
    courses_detail    JSONB NOT NULL DEFAULT '[]'::jsonb,
    hours             INTEGER NOT NULL DEFAULT 0,
    total_hours       INTEGER NOT NULL DEFAULT 0,
    average_score     INTEGER NOT NULL DEFAULT 0,
    validity_hours    INTEGER NOT NULL DEFAULT 0,
    issued_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at        TIMESTAMPTZ,
    is_valid          BOOLEAN NOT NULL DEFAULT TRUE,
    pdf_url           TEXT
);
CREATE INDEX idx_certs_company ON certificates(company_id);
CREATE INDEX idx_certs_user ON certificates(user_id);
CREATE INDEX idx_certs_code ON certificates(verification_code);

-- ============================================================
-- DOCUMENT TYPES (per-company catalog, dynamic)
-- ============================================================
CREATE TABLE document_types (
    document_type_id  TEXT PRIMARY KEY,
    company_id        TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    description       TEXT,
    requires_expiry   BOOLEAN NOT NULL DEFAULT FALSE,
    area_ids          TEXT[] NOT NULL DEFAULT '{}',
    activity_ids      TEXT[] NOT NULL DEFAULT '{}',
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, name)
);
CREATE INDEX idx_doctypes_company ON document_types(company_id);
CREATE INDEX idx_doctypes_areas ON document_types USING GIN(area_ids);
CREATE INDEX idx_doctypes_activities ON document_types USING GIN(activity_ids);

-- ============================================================
-- WORKER DOCUMENTS (one row per user x document_type)
--   Multiple files attached, each with its own expiry date.
-- ============================================================
CREATE TABLE worker_documents (
    worker_document_id  TEXT PRIMARY KEY,
    company_id          TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    user_id             TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    document_type_id    TEXT NOT NULL REFERENCES document_types(document_type_id) ON DELETE CASCADE,
    files               JSONB NOT NULL DEFAULT '[]'::jsonb,
        -- Each file: { file_url, original_name, expiry_date (ISO or null), uploaded_at, uploaded_by }
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, document_type_id)
);
CREATE INDEX idx_workerdocs_company ON worker_documents(company_id);
CREATE INDEX idx_workerdocs_user ON worker_documents(user_id);
CREATE INDEX idx_workerdocs_doctype ON worker_documents(document_type_id);

-- ============================================================
-- USER SESSIONS  (Google OAuth + custom)
-- ============================================================
CREATE TABLE user_sessions (
    session_token     TEXT PRIMARY KEY,
    user_id           TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    expires_at        TIMESTAMPTZ NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
