# Test Credentials

## E-Learning Platform (Supabase PostgreSQL)

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@elearning.com` | `admin123` |
| Demo Student | `demo.alumno@test.com` | `demo123` |

## Database
- Engine: PostgreSQL 17.6 on Supabase
- Project ref: `jnqdgknthzslhbfsmjtq`
- Connection pooler: `aws-1-us-west-2.pooler.supabase.com:6543` (transaction mode)
- Backend connects via `db_adapter.py` (MongoDB-style API over asyncpg)
- RLS enabled with defensive policies (backend uses `postgres` role which bypasses RLS)

## Seed
Run `python3 /app/backend/seed.py` to (idempotently) recreate admin + demo student + 19 predefined roles + branding singleton.
