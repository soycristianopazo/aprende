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

## Technical Stack
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **PDF Generation**: ReportLab
- **Auth**: JWT + Emergent Google OAuth

## What's Been Implemented (2024-12-XX)
### Backend (/app/backend/server.py)
- [x] Auth: register, login, Google OAuth, logout
- [x] Users: CRUD, search by RUT
- [x] Roles: CRUD with course assignment
- [x] Courses: CRUD, material upload
- [x] Evaluations: CRUD, submit with scoring
- [x] Certificates: generation, verification, PDF download
- [x] Branding: logo, signature, colors
- [x] Reports: summary, user reports, CSV export

### Frontend Pages
- [x] Landing page
- [x] Login/Register
- [x] Admin Dashboard with charts
- [x] Admin Users management
- [x] Admin Roles & Curriculum
- [x] Admin Courses management
- [x] Admin Evaluations builder
- [x] Admin Certificates history
- [x] Admin Reports with export
- [x] Admin Branding config
- [x] Student Dashboard
- [x] Student Course viewer
- [x] Student Evaluation flow
- [x] Student Certificates
- [x] Certificate verification (public)

## Prioritized Backlog
### P0 (Critical) - ✅ Done
- Auth system
- Course management
- Evaluation system
- Certificate generation

### P1 (Important) - ✅ Done
- Branding configuration
- Reports and export

### P2 (Nice to Have)
- Email notifications
- Advanced analytics
- Multi-language support
- Bulk user import

## Test Credentials
- Admin: admin@elearning.com / admin123
- Student: estudiante@test.com / test123

## Next Tasks
1. Add email notifications on certificate generation
2. Implement bulk user import via CSV
3. Add more detailed analytics dashboard
4. Support for course prerequisites
