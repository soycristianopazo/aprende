-- ============================================================
-- Aptiva F4 — Competencias (additive migration, no data loss)
-- ============================================================

-- 1. Competencies catalog per company
CREATE TABLE IF NOT EXISTS competencies (
    competency_id     TEXT PRIMARY KEY,
    company_id        TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    description       TEXT,
    validity_months   INTEGER,  -- NULL = sin vencimiento
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, name)
);
CREATE INDEX IF NOT EXISTS idx_competencies_company ON competencies(company_id);

-- 2. Activities: required competency_ids
ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS competency_ids TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_activities_competencies ON activities USING GIN(competency_ids);

-- 3. Courses: competencies that the course grants upon completion
ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS grants_competency_ids TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_courses_grants ON courses USING GIN(grants_competency_ids);

-- 4. Worker competencies (per user x competency, one current row)
CREATE TABLE IF NOT EXISTS worker_competencies (
    worker_competency_id TEXT PRIMARY KEY,
    company_id           TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    user_id              TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    competency_id        TEXT NOT NULL REFERENCES competencies(competency_id) ON DELETE CASCADE,
    source               TEXT NOT NULL DEFAULT 'manual',  -- 'manual' | 'course'
    source_course_id     TEXT,
    acquired_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expiry_date          TIMESTAMPTZ,
    file_url             TEXT,
    original_name        TEXT,
    notes                TEXT,
    uploaded_by          TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, competency_id)
);
CREATE INDEX IF NOT EXISTS idx_workercomps_company ON worker_competencies(company_id);
CREATE INDEX IF NOT EXISTS idx_workercomps_user ON worker_competencies(user_id);
CREATE INDEX IF NOT EXISTS idx_workercomps_competency ON worker_competencies(competency_id);
CREATE INDEX IF NOT EXISTS idx_workercomps_expiry ON worker_competencies(expiry_date);
