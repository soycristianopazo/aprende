#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================
user_problem_statement: |
  Migrate the e-learning platform's database from MongoDB to a relational database
  using Supabase (PostgreSQL). Keep the custom JWT auth and the existing API
  contracts. Backend should connect via the Supabase transaction pooler.

backend:
  - task: "Supabase PostgreSQL migration via MongoDB-compatible adapter"
    implemented: true
    working: true
    file: "backend/db_adapter.py, backend/server.py, backend/init_schema.sql, backend/rls_policies.sql, backend/seed.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Migrated DB from MongoDB (motor) to Supabase PostgreSQL. Added init_schema.sql with 9 tables
          (users, roles, courses, evaluations, evaluation_attempts, course_completions, certificates,
          branding, user_sessions) using TEXT[] arrays and JSONB for nested data. Added rls_policies.sql
          enabling RLS with defensive policies (public read for verification + published courses + branding;
          deny all else). Backend connects as `postgres` role which bypasses RLS. Created db_adapter.py
          that mimics motor API (find_one/find/insert_one/update_one/delete_one/count_documents/aggregate)
          backed by asyncpg with statement_cache_size=0 for transaction pooler compatibility.
          server.py only changed in 3 spots (imports, db init, aggregate replaced with SQL JOIN over
          unnest(role_ids)). Seeded admin@elearning.com/admin123 + demo.alumno@test.com/demo123 + 19
          predefined roles. Smoke-tested via curl: /api/, /api/auth/login (admin+student), /api/auth/me,
          /api/roles (19), /api/users (2), /api/reports/summary, /api/branding, POST /api/courses — all OK.
      - working: false
        agent: "testing"
        comment: |
          Comprehensive end-to-end testing completed (31/32 tests passed = 96.9% success rate).
          
          ✅ WORKING FEATURES:
          1. Auth: Login with admin@elearning.com/admin123 and demo.alumno@test.com/demo123 - WORKING
          2. GET /api/auth/me - returns user info correctly - WORKING
          3. GET /api/roles - returns exactly 19 predefined roles - WORKING
          4. POST /api/users with role_ids[] array - TEXT[] array stored and retrieved correctly - WORKING
          5. Users CRUD (GET/PUT/DELETE) - all operations working - WORKING
          6. GET /api/users/search/rut/{rut} - RUT search working with certificates and completions - WORKING
          7. Courses CRUD with prerequisites TEXT[] array - all operations working - WORKING
          8. POST /api/evaluations with JSONB questions - questions stored and retrieved correctly - WORKING
          9. POST /api/evaluations/{id}/submit - scoring calculation 100% accurate - WORKING
          10. GET/PUT /api/branding - singleton update working correctly - WORKING
          11. GET /api/reports/summary - users_by_role aggregation with UNNEST working - WORKING
          12. GET /api/reports/users - detailed report working - WORKING
          13. GET /api/reports/export/users - CSV export working with UTF-8 BOM - WORKING
          14. GET /api/certificates/verify/{code} - public verification endpoint working - WORKING
          15. Datetime handling - PG datetime correctly converted to ISO strings - WORKING
          16. TEXT[] arrays (role_ids, prerequisites, course_ids) - all working correctly - WORKING
          17. JSONB columns (questions, answers, courses_detail) - all working correctly - WORKING
          
          ❌ CRITICAL ISSUE - Schema Incomplete:
          - Auto-certificate issuance FAILS with 500 error: "column certificate_type does not exist"
          - The certificates table schema in init_schema.sql is missing several columns that server.py expects:
            * certificate_type (TEXT) - used to distinguish "role_completion" vs single course certs
            * user_rut (TEXT) - schema has "rut" but code uses "user_rut"
            * user_company (TEXT) - code tries to insert this field
            * total_hours (INTEGER) - schema has "hours" but code uses "total_hours"
            * average_score (INTEGER) - missing from schema
            * course_id (TEXT) - for legacy single-course certificates
            * course_name (TEXT) - for legacy single-course certificates
            * score (INTEGER) - for legacy single-course certificates
            * training_type (TEXT) - for legacy single-course certificates
          
          The schema must be updated to include these columns for auto-certificate issuance to work.
          All other PostgreSQL migration features are working correctly.
      - working: true
        agent: "testing"
        comment: |
          ✅ AUTO-CERTIFICATE ISSUANCE RE-TEST COMPLETED - ALL TESTS PASSED (13/13 = 100%)
          
          User added missing columns to certificates table via ALTER TABLE in Supabase:
          - certificate_type TEXT
          - user_rut TEXT
          - user_company TEXT
          - total_hours INTEGER
          - average_score INTEGER
          - course_id TEXT
          - course_name TEXT
          - score INTEGER
          - training_type TEXT
          
          Comprehensive end-to-end test of auto-certificate issuance flow:
          ✅ 1. Admin login (admin@elearning.com/admin123) - WORKING
          ✅ 2. Create role with 1 course - WORKING
          ✅ 3. Create course - WORKING
          ✅ 4. Assign course to role - WORKING
          ✅ 5. Get demo student user (demo.alumno@test.com) - WORKING
          ✅ 6. Assign role to student - WORKING
          ✅ 7. Create evaluation for course - WORKING
          ✅ 8. Student login - WORKING
          ✅ 9. Submit evaluation with correct answers - WORKING
          ✅ 10. Certificate auto-issued with all required fields:
                 - certificate_type: "role_completion"
                 - certificate_id, verification_code
                 - user_id, role_ids, role_names
                 - user_name, user_rut, user_company
                 - total_hours: 10, average_score: 100%
                 - courses_detail: [1 course with score, hours, training_type]
                 - issued_at, expires_at, is_valid
          ✅ 11. GET /api/certificates returns the certificate - WORKING
          ✅ 12. GET /api/certificates/verify/{code} public verification - WORKING
          ✅ 13. GET /api/reports/summary certificate count incremented (0 → 1) - WORKING
          
          🎉 MIGRATION COMPLETE - All PostgreSQL features working including auto-certificate issuance!

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 2
  run_ui: false

test_plan:
  current_focus:
    - "Supabase PostgreSQL migration via MongoDB-compatible adapter"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Migración completa de MongoDB -> Supabase PostgreSQL terminada.
      Por favor probar end-to-end:
        1. Auth: register/login (admin@elearning.com/admin123 + demo.alumno@test.com/demo123), /me, logout.
        2. Users CRUD (admin only) + búsqueda por RUT.
        3. Roles CRUD (deberían existir 19 roles predefinidos).
        4. Courses CRUD con prerequisites (TEXT[] en PG).
        5. Evaluations CRUD + submit con scoring (questions stored in JSONB).
        6. Course completions y emisión automática de certificado cuando se completan todos los cursos del rol.
        7. Branding GET/PUT (singleton: id='default').
        8. Reports: /api/reports/summary, /api/reports/users (incluye CSV export).
        9. Certificate verification público por código.
      No tocar la subida de archivos a Supabase Storage todavía (pendiente de keys del usuario);
      por ahora los uploads siguen a disco local en /app/backend/uploads/.
  - agent: "testing"
    message: |
      Testing completed with 96.9% success rate (31/32 tests passed).
      
      CRITICAL ISSUE FOUND: Auto-certificate issuance fails with 500 error due to incomplete schema.
      The certificates table in init_schema.sql is missing these columns that server.py tries to insert:
        - certificate_type TEXT (to distinguish role_completion vs single course)
        - user_rut TEXT (code uses this, schema has "rut")
        - user_company TEXT
        - total_hours INTEGER (code uses this, schema has "hours")
        - average_score INTEGER
        - course_id TEXT (for legacy single-course certs)
        - course_name TEXT (for legacy single-course certs)
        - score INTEGER (for legacy single-course certs)
        - training_type TEXT (for legacy single-course certs)
      
      All other PostgreSQL features working perfectly:
      ✅ TEXT[] arrays (role_ids, prerequisites, course_ids)
      ✅ JSONB columns (questions, answers, courses_detail)
      ✅ Datetime ISO string conversion
      ✅ users_by_role aggregation with UNNEST
      ✅ All CRUD operations
      ✅ CSV exports
      ✅ RUT search
      ✅ 19 predefined roles
      
      Please update init_schema.sql to add the missing columns to certificates table.
  - agent: "user"
    message: |
      Added missing columns to certificates table via ALTER TABLE in Supabase:
      - certificate_type TEXT
      - user_rut TEXT
      - user_company TEXT
      - total_hours INTEGER
      - average_score INTEGER
      - course_id TEXT
      - course_name TEXT
      - score INTEGER
      - training_type TEXT
      
      Also updated /app/backend/init_schema.sql to reflect these changes.
      Please re-test ONLY the auto-certificate issuance flow.
  - agent: "testing"
    message: |
      ✅ RE-TEST COMPLETE - AUTO-CERTIFICATE ISSUANCE WORKING (13/13 tests passed = 100%)
      
      The schema fix resolved the issue. Comprehensive end-to-end test confirmed:
      - Certificate auto-issued when student completes all courses in their role
      - All required fields present (certificate_type, user_rut, user_company, total_hours, average_score, courses_detail)
      - GET /api/certificates returns the certificate correctly
      - GET /api/certificates/verify/{code} public verification working
      - GET /api/reports/summary certificate count incremented correctly
      
      🎉 MIGRATION COMPLETE - All PostgreSQL features including auto-certificate issuance are working!
