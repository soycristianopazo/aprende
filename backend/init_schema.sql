-- ============================================================
-- E-Learning Platform - PostgreSQL Schema (Supabase)
-- ============================================================

-- Drop existing (idempotent for re-runs)
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS course_completions CASCADE;
DROP TABLE IF EXISTS evaluation_attempts CASCADE;
DROP TABLE IF EXISTS evaluations CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS branding CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    user_id           TEXT PRIMARY KEY,
    email             TEXT UNIQUE NOT NULL,
    password_hash     TEXT,
    full_name         TEXT,
    name              TEXT,
    rut               TEXT UNIQUE,
    company           TEXT,
    role_id           TEXT,                       -- legacy single role (back-compat)
    role_ids          TEXT[] NOT NULL DEFAULT '{}',
    is_admin          BOOLEAN NOT NULL DEFAULT FALSE,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    picture           TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_rut ON users(rut);
CREATE INDEX idx_users_is_admin ON users(is_admin);
CREATE INDEX idx_users_role_ids ON users USING GIN(role_ids);

-- ============================================================
-- ROLES (curricular paths)
-- ============================================================
CREATE TABLE roles (
    role_id           TEXT PRIMARY KEY,
    name              TEXT UNIQUE NOT NULL,
    description       TEXT,
    course_ids        TEXT[] NOT NULL DEFAULT '{}',
    course_order      TEXT[] NOT NULL DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_roles_name ON roles(name);

-- ============================================================
-- COURSES
-- ============================================================
CREATE TABLE courses (
    course_id         TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    description       TEXT,
    hours             INTEGER NOT NULL DEFAULT 0,
    validity_hours    INTEGER NOT NULL DEFAULT 0,
    training_type     TEXT NOT NULL DEFAULT 'e-learning',
    video_url         TEXT,
    material_url      TEXT,
    status            TEXT NOT NULL DEFAULT 'draft',
    prerequisites     TEXT[] NOT NULL DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_prerequisites ON courses USING GIN(prerequisites);

-- ============================================================
-- EVALUATIONS
-- ============================================================
CREATE TABLE evaluations (
    evaluation_id     TEXT PRIMARY KEY,
    course_id         TEXT NOT NULL UNIQUE REFERENCES courses(course_id) ON DELETE CASCADE,
    questions         JSONB NOT NULL DEFAULT '[]'::jsonb,
    min_score         INTEGER NOT NULL DEFAULT 70,
    max_attempts      INTEGER NOT NULL DEFAULT 3,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_evaluations_course ON evaluations(course_id);

-- ============================================================
-- EVALUATION ATTEMPTS
-- ============================================================
CREATE TABLE evaluation_attempts (
    attempt_id        TEXT PRIMARY KEY,
    evaluation_id     TEXT NOT NULL,
    course_id         TEXT,
    user_id           TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    answers           JSONB NOT NULL DEFAULT '[]'::jsonb,
    score             INTEGER,
    passed            BOOLEAN,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_attempts_user ON evaluation_attempts(user_id);
CREATE INDEX idx_attempts_eval ON evaluation_attempts(evaluation_id);
CREATE INDEX idx_attempts_user_eval ON evaluation_attempts(user_id, evaluation_id);

-- ============================================================
-- COURSE COMPLETIONS
-- ============================================================
CREATE TABLE course_completions (
    completion_id     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id           TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    course_id         TEXT NOT NULL,
    course_name       TEXT,
    score             INTEGER,
    hours             INTEGER,
    training_type     TEXT,
    completed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);
CREATE INDEX idx_completions_user ON course_completions(user_id);
CREATE INDEX idx_completions_course ON course_completions(course_id);

-- ============================================================
-- CERTIFICATES
-- ============================================================
CREATE TABLE certificates (
    certificate_id    TEXT PRIMARY KEY,
    verification_code TEXT UNIQUE NOT NULL,
    user_id           TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    user_name         TEXT,
    rut               TEXT,
    role_id           TEXT,                       -- legacy
    role_name         TEXT,                       -- legacy
    role_ids          TEXT[] NOT NULL DEFAULT '{}',
    role_names        TEXT[] NOT NULL DEFAULT '{}',
    course_grades     JSONB NOT NULL DEFAULT '[]'::jsonb,
    courses_detail    JSONB NOT NULL DEFAULT '[]'::jsonb,
    hours             INTEGER NOT NULL DEFAULT 0,
    validity_hours    INTEGER NOT NULL DEFAULT 0,
    issued_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at        TIMESTAMPTZ,
    is_valid          BOOLEAN NOT NULL DEFAULT TRUE,
    pdf_url           TEXT
);
CREATE INDEX idx_certs_user ON certificates(user_id);
CREATE INDEX idx_certs_code ON certificates(verification_code);
CREATE INDEX idx_certs_valid ON certificates(is_valid);

-- ============================================================
-- BRANDING (singleton-like)
-- ============================================================
CREATE TABLE branding (
    id                TEXT PRIMARY KEY DEFAULT 'default',
    primary_color     TEXT DEFAULT '#1e40af',
    secondary_color   TEXT DEFAULT '#3b82f6',
    footer_text       TEXT,
    logo_url          TEXT,
    banner_logo_url   TEXT,
    signature_url     TEXT,
    footer_image_url  TEXT,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USER SESSIONS (for Google OAuth)
-- ============================================================
CREATE TABLE user_sessions (
    session_token     TEXT PRIMARY KEY,
    user_id           TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    expires_at        TIMESTAMPTZ NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
