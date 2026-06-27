import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import {
  Building2, Users, LayoutDashboard, LogOut, Menu, X,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/superadmin', icon: LayoutDashboard, label: 'Resumen Global' },
  { to: '/superadmin/companies', icon: Building2, label: 'Empresas' },
];

const SuperAdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform lg:translate-x-0 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-2 border-b border-slate-200">
            <img src="/aptiva-logo.png" alt="Aptiva" className="h-14 max-w-[230px] w-auto object-contain" />
          </div>

          {/* Nav */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
              const active = location.pathname === to || (to !== '/superadmin' && location.pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User card */}
          <div className="px-4 py-4 border-t border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                {(user?.full_name || 'S')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user?.full_name || 'Super Admin'}</p>
                <p className="text-xs text-blue-700 font-semibold">SUPERADMIN</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start gap-2"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between h-16 px-4 lg:px-8 bg-white border-b border-slate-200">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
            <Menu className="w-6 h-6 text-slate-700" />
          </button>
          <div className="hidden lg:flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-700" />
            <h1 className="text-lg font-semibold text-slate-900">Panel SuperAdmin</h1>
          </div>
          <div className="w-6 lg:hidden" />
        </header>

        <main className="p-4 lg:p-8 flex-1">
          <Outlet />
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 lg:px-8 py-4">
          <p className="text-center text-xs text-slate-500">© {new Date().getFullYear()} DoSoft · Aptiva — Gestión de Competencias, Capacitaciones y Storage</p>
        </footer>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
