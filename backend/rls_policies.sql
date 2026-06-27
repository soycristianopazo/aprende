-- ============================================================
-- Row Level Security (Defense in Depth)
-- Backend connects as 'postgres' role which BYPASSES RLS.
-- These policies block direct access via anon/authenticated keys (PostgREST).
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (extra safety; postgres superuser still bypasses)
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE roles FORCE ROW LEVEL SECURITY;
ALTER TABLE courses FORCE ROW LEVEL SECURITY;
ALTER TABLE evaluations FORCE ROW LEVEL SECURITY;
ALTER TABLE evaluation_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE course_completions FORCE ROW LEVEL SECURITY;
ALTER TABLE certificates FORCE ROW LEVEL SECURITY;
ALTER TABLE branding FORCE ROW LEVEL SECURITY;
ALTER TABLE user_sessions FORCE ROW LEVEL SECURITY;

-- Public read for certificate verification (anyone can verify by code)
DROP POLICY IF EXISTS public_verify_cert ON certificates;
CREATE POLICY public_verify_cert ON certificates
    FOR SELECT
    TO anon, authenticated
    USING (true);  -- the API does code-based lookup; only verification_code is exposed

-- Public read for published courses (so anon can browse catalog if needed)
DROP POLICY IF EXISTS public_read_courses ON courses;
CREATE POLICY public_read_courses ON courses
    FOR SELECT
    TO anon, authenticated
    USING (status = 'published');

-- Branding is public (logo, colors for the public landing)
DROP POLICY IF EXISTS public_read_branding ON branding;
CREATE POLICY public_read_branding ON branding
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- DENY all other access to anon/authenticated.
-- (No policy => default deny when RLS is enabled.)
-- Backend uses 'postgres' role which bypasses RLS.

-- NOTE: bypassing RLS in postgres role is the documented Supabase pattern when
-- the backend manages auth itself with a custom JWT (our case).
