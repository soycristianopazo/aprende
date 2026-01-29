# E-Learning Platform - PRD

## Problem Statement
Desarrollar una plataforma web autónoma de capacitaciones e-learning que permita gestionar cursos estructurados en mallas curriculares por rol, administrar contenidos multimedia, evaluar conocimientos mediante pruebas con alternativas, emitir certificados automáticos con validez y trazabilidad.

## User Personas
1. **Administrador**: Acceso total - gestión de usuarios, cursos, evaluaciones, certificados, reportes, branding
2. **Alumno**: Acceso a cursos asignados según rol, evaluaciones, descarga de certificados

## Core Requirements (Static)
- Autenticación: Email/contraseña + Google OAuth
- Gestión de usuarios con RUT, empresa, rol
- Mallas curriculares por rol (cursos obligatorios)
- Cursos con videos Vimeo + PDFs descargables
- Evaluaciones múltiple opción configurables
- Certificados PDF automáticos con código de verificación
- Branding configurable (logo, firma, colores)
- Reportes exportables CSV
- **Pre-requisitos de cursos con línea de tiempo visual**

## Technical Stack
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **PDF Generation**: ReportLab
- **Auth**: JWT + Emergent Google OAuth

## What's Been Implemented

### Backend (/app/backend/server.py)
- [x] Auth: register, login, Google OAuth, logout
- [x] Users: CRUD, search by RUT
- [x] Roles: CRUD with course assignment and course_order
- [x] Courses: CRUD, material upload, prerequisites
- [x] Evaluations: CRUD, submit with scoring
- [x] Certificates: generation, verification, PDF download
- [x] Branding: logo, banner logo, signature, colors
- [x] Reports: summary, user reports, CSV export
- [x] **NEW**: GET /api/roles/{role_id}/curriculum - Returns ordered curriculum with prerequisites
- [x] **NEW**: GET /api/student/progress - Returns is_locked and missing_prerequisites

### Frontend Pages
- [x] Landing page (with banner logo)
- [x] Login/Register
- [x] Admin Dashboard with charts
- [x] Admin Users management
- [x] Admin Roles & Curriculum (with timeline modal and prerequisite config)
- [x] Admin Courses management
- [x] Admin Evaluations builder
- [x] Admin Certificates history
- [x] Admin Reports with export
- [x] Admin Branding config (logo certificado, banner logo, firma)
- [x] Student Dashboard (with course ordering and locking)
- [x] Student Course viewer
- [x] Student Evaluation flow
- [x] Student Certificates
- [x] Certificate verification (public)
- [x] **NEW**: Student Roadmap Modal (learning path timeline)

## DB Schema Updates (2025-01-29)
- **courses**: Added `prerequisites: List[str]` (list of course_ids)
- **roles**: Added `course_order: List[str]` (ordered list of course_ids)

## Prioritized Backlog

### P0 (Critical) - ✅ Done
- Auth system
- Course management
- Evaluation system
- Certificate generation
- **Course prerequisites system**

### P1 (Important) - ✅ Done
- Branding configuration
- Reports and export
- Banner logo for all pages

### P2 (Nice to Have)
- Email notifications
- Advanced analytics
- Multi-language support
- Bulk user import
- Course chat feature

### Known Issues
- Google OAuth flow may need verification (reported as failing in iteration_1.json)
- Older courses may lack 'prerequisites' field (migration recommended)

## Test Credentials
- Admin: admin@elearning.com / admin123
- Student: demo.alumno@test.com / demo123

## Test Data
- Role "Operador" (role_b9d0af933ed8) has 3 courses:
  1. Inducción General (no prerequisites) - course_700e34687aed
  2. Seguridad Básica (requires #1) - course_7cba543d9e13
  3. Seguridad Avanzada (requires #1 and #2) - course_e1ba9b6b0c83

## Next Tasks
1. Fix Google OAuth flow (if still broken)
2. Add email notifications on certificate generation
3. Implement bulk user import via CSV
4. Add more detailed analytics dashboard
5. Backend code refactoring (split server.py into modules)
