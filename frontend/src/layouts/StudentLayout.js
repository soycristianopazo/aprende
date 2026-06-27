import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { 
  BookOpen, LayoutDashboard, Award, LogOut, Menu, X, User
} from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StudentLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      const response = await fetch(`${API}/branding`);
      if (response.ok) {
        setBranding(await response.json());
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    }
  };

  const navItems = [
    { path: '/student', label: 'Mis Cursos', exact: true },
    { path: '/student/certificates', label: 'Mis Certificados' },
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
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/student" className="flex items-center gap-2">
              {branding?.banner_logo_url ? (
                <img 
                  src={`${BACKEND_URL}${branding.banner_logo_url}`} 
                  alt="Logo" 
                  className="h-14 max-w-[200px] object-contain"
                />
              ) : (
                <>
                  <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center">
                    <BookOpen className="w-7 h-7 text-white" />
                  </div>
                  <span className="font-bold text-xl text-slate-900 hidden sm:inline" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    E-Learning
                  </span>
                </>
              )}
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active = isActive(item.path, item.exact);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      px-4 py-2 rounded-lg font-medium transition-colors
                      ${active 
                        ? 'bg-orange-50 text-orange-600' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }
                    `}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2" data-testid="user-menu-btn">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                      {user?.picture ? (
                        <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <span className="text-orange-600 font-semibold text-sm">
                          {(user?.full_name || user?.name || 'U')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="hidden sm:inline text-slate-700">
                      {user?.full_name || user?.name || 'Usuario'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="font-medium text-slate-900">{user?.full_name || user?.name}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer" data-testid="logout-menu-item">
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="mobile-menu-btn"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-200">
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const active = isActive(item.path, item.exact);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        px-4 py-2 rounded-lg font-medium transition-colors
                        ${active 
                          ? 'bg-orange-50 text-orange-600' 
                          : 'text-slate-600 hover:bg-slate-50'
                        }
                      `}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default StudentLayout;
