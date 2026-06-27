import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { 
  BookOpen, LayoutDashboard, Users, FolderTree, GraduationCap, 
  ClipboardCheck, Award, BarChart3, Palette, LogOut, Menu, X, ChevronRight,
  Building, FileText, FolderOpen, Upload, ShieldCheck
} from 'lucide-react';
import { useState } from 'react';
import { useBranding } from '../hooks/useBranding';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const branding = useBranding();

  const menuItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/admin/users', icon: Users, label: 'Trabajadores' },
    { path: '/admin/users-import', icon: Upload, label: 'Importar Trabajadores' },
    { path: '/admin/areas', icon: Building, label: 'Áreas' },
    { path: '/admin/roles', icon: FolderTree, label: 'Actividades' },
    { path: '/admin/competencies', icon: ShieldCheck, label: 'Competencias' },
    { path: '/admin/worker-competencies', icon: Award, label: 'Matriz Competencias' },
    { path: '/admin/courses', icon: GraduationCap, label: 'Cursos' },
    { path: '/admin/evaluations', icon: ClipboardCheck, label: 'Evaluaciones' },
    { path: '/admin/document-types', icon: FileText, label: 'Tipos de Documentos' },
    { path: '/admin/worker-documents', icon: FolderOpen, label: 'Expedientes' },
    { path: '/admin/certificates', icon: Award, label: 'Certificados' },
    { path: '/admin/reports', icon: BarChart3, label: 'Reportes' },
    { path: '/admin/branding', icon: Palette, label: 'Branding' },
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-2 border-b border-slate-200 relative">
            <Link to="/admin" className="flex items-center justify-center w-full">
              {branding?.banner_logo_url ? (
                <img 
                  src={`${BACKEND_URL}${branding.banner_logo_url}`} 
                  alt="Logo" 
                  className="h-14 max-w-[230px] w-auto object-contain"
                />
              ) : (
                <img
                  src="/aptiva-logo.png"
                  alt="Aptiva"
                  className="h-14 max-w-[230px] w-auto object-contain"
                />
              )}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden absolute right-2"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const active = isActive(item.path, item.exact);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                      ${active 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }
                    `}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  >
                    <item.icon className={`w-5 h-5 ${active ? 'text-blue-600' : ''}`} />
                    <span className="font-medium">{item.label}</span>
                    {active && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* User Info */}
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-700 font-semibold">
                  {(user?.full_name || user?.name || 'A')[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">
                  {user?.full_name || user?.name || 'Admin'}
                </p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="flex items-center justify-between h-full px-4 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              data-testid="mobile-menu-btn"
            >
              <Menu className="w-6 h-6" />
            </Button>
            <div className="flex items-center gap-2 lg:hidden">
              <span className="text-sm font-medium text-slate-600">Panel Aptiva — Administración</span>
            </div>
            <div className="hidden lg:block">
              <span className="text-sm text-slate-500">Panel Aptiva — Administración</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 hidden sm:inline">
                Bienvenido, {user?.full_name || user?.name || 'Administrador'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white px-4 lg:px-8 py-4">
          <p className="text-center text-xs text-slate-500">
            © {new Date().getFullYear()} DoSoft · Aptiva — Gestión de Competencias, Capacitaciones y Storage
          </p>
        </footer>
      </div>
    </div>
  );
};

export default AdminLayout;
