import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";

// Contexts
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AuthCallback from "./pages/AuthCallback";
import VerifyCertificate from "./pages/VerifyCertificate";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminUsersImport from "./pages/admin/UsersImport";
import AdminAreas from "./pages/admin/Areas";
import AdminRoles from "./pages/admin/Roles";
import AdminCourses from "./pages/admin/Courses";
import AdminCourseEdit from "./pages/admin/CourseEdit";
import AdminEvaluations from "./pages/admin/Evaluations";
import AdminDocumentTypes from "./pages/admin/DocumentTypes";
import AdminWorkerDocuments from "./pages/admin/WorkerDocuments";
import AdminCompetencies from "./pages/admin/Competencies";
import AdminWorkerCompetencies from "./pages/admin/WorkerCompetencies";
import AdminCertificates from "./pages/admin/Certificates";
import AdminReports from "./pages/admin/Reports";
import AdminBranding from "./pages/admin/Branding";

// SuperAdmin Pages
import SuperAdminDashboard from "./pages/superadmin/Dashboard";
import SuperAdminCompanies from "./pages/superadmin/Companies";

// Student Pages
import StudentDashboard from "./pages/student/Dashboard";
import StudentCourse from "./pages/student/Course";
import StudentEvaluation from "./pages/student/Evaluation";
import StudentCertificates from "./pages/student/Certificates";
import StudentMyDocuments from "./pages/student/MyDocuments";
import StudentMyCompetencies from "./pages/student/MyCompetencies";

// Layouts
import AdminLayout from "./layouts/AdminLayout";
import StudentLayout from "./layouts/StudentLayout";
import SuperAdminLayout from "./layouts/SuperAdminLayout";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false, requireSuperAdmin = false }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Super admin landing
  if (requireSuperAdmin && !user?.is_super_admin) {
    return <Navigate to={user?.is_admin ? "/admin" : "/student"} replace />;
  }

  if (requireAdmin && !user?.is_admin && !user?.is_super_admin) {
    return <Navigate to="/student" replace />;
  }

  // If user is super_admin and visiting non-superadmin route, send them home
  if (!requireSuperAdmin && user?.is_super_admin && location.pathname !== '/' && !location.pathname.startsWith('/superadmin')) {
    return <Navigate to="/superadmin" replace />;
  }

  if (!requireAdmin && !requireSuperAdmin && user?.is_admin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

// App Router with session_id detection
function AppRouter() {
  const location = useLocation();
  
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  // Check URL fragment for session_id synchronously during render
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify/:code" element={<VerifyCertificate />} />
      
      {/* SuperAdmin Routes */}
      <Route path="/superadmin" element={
        <ProtectedRoute requireSuperAdmin={true}>
          <SuperAdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<SuperAdminDashboard />} />
        <Route path="companies" element={<SuperAdminCompanies />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute requireAdmin={true}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users-import" element={<AdminUsersImport />} />
        <Route path="areas" element={<AdminAreas />} />
        <Route path="roles" element={<AdminRoles />} />
        <Route path="courses" element={<AdminCourses />} />
        <Route path="courses/:courseId/edit" element={<AdminCourseEdit />} />
        <Route path="evaluations" element={<AdminEvaluations />} />
        <Route path="document-types" element={<AdminDocumentTypes />} />
        <Route path="worker-documents" element={<AdminWorkerDocuments />} />
        <Route path="competencies" element={<AdminCompetencies />} />
        <Route path="worker-competencies" element={<AdminWorkerCompetencies />} />
        <Route path="certificates" element={<AdminCertificates />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="branding" element={<AdminBranding />} />
      </Route>
      
      {/* Student Routes */}
      <Route path="/student" element={
        <ProtectedRoute requireAdmin={false}>
          <StudentLayout />
        </ProtectedRoute>
      }>
        <Route index element={<StudentDashboard />} />
        <Route path="course/:courseId" element={<StudentCourse />} />
        <Route path="evaluation/:courseId" element={<StudentEvaluation />} />
        <Route path="certificates" element={<StudentCertificates />} />
        <Route path="my-documents" element={<StudentMyDocuments />} />
        <Route path="my-competencies" element={<StudentMyCompetencies />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
