import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { BookOpen, Mail, Lock, User, Building, CreditCard, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [branding, setBranding] = useState(null);
  const [rolesExpanded, setRolesExpanded] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    rut: '',
    company: '',
    role_ids: []
  });

  useEffect(() => {
    fetchRoles();
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

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API}/roles`);
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const toggleRole = (roleId) => {
    setFormData(prev => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter(id => id !== roleId)
        : [...prev.role_ids, roleId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const userData = {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        rut: formData.rut,
        company: formData.company || null,
        role_ids: formData.role_ids,
        is_admin: false
      };

      await register(userData);
      toast.success('¡Registro exitoso!');
      navigate('/student');
    } catch (error) {
      toast.error(error.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  const selectedRoleNames = formData.role_ids
    .map(id => roles.find(r => r.role_id === id)?.name)
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center justify-center">
            {branding?.banner_logo_url ? (
              <img 
                src={`${BACKEND_URL}${branding.banner_logo_url}`} 
                alt="Logo" 
                className="h-14 max-w-[200px] object-contain"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <span className="font-bold text-2xl text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  E-Learning
                </span>
              </div>
            )}
          </Link>
        </div>

        <Card className="border-slate-200 shadow-xl shadow-blue-600/5" data-testid="register-card">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Crear Cuenta
            </CardTitle>
            <CardDescription className="text-slate-600">
              Registra tus datos para comenzar
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-slate-700">
                  Nombre completo *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="full_name"
                    type="text"
                    placeholder="Juan Pérez"
                    className="pl-10 border-slate-200 focus:border-blue-600 focus:ring-blue-600/20"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    data-testid="fullname-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rut" className="text-slate-700">
                  RUT *
                </Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="rut"
                    type="text"
                    placeholder="12345678-9"
                    className="pl-10 border-slate-200 focus:border-blue-600 focus:ring-blue-600/20"
                    value={formData.rut}
                    onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                    required
                    data-testid="rut-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">
                  Correo electrónico *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    className="pl-10 border-slate-200 focus:border-blue-600 focus:ring-blue-600/20"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    data-testid="email-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company" className="text-slate-700">
                  Empresa (opcional)
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="company"
                    type="text"
                    placeholder="Mi Empresa S.A."
                    className="pl-10 border-slate-200 focus:border-blue-600 focus:ring-blue-600/20"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    data-testid="company-input"
                  />
                </div>
              </div>

              {roles.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-slate-700">
                    Rol/Actividad (opcional)
                  </Label>
                  <div className="border border-slate-200 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setRolesExpanded(!rolesExpanded)}
                      className="w-full px-3 py-2 flex items-center justify-between text-left text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
                    >
                      <span>
                        {formData.role_ids.length > 0 
                          ? `${formData.role_ids.length} rol(es) seleccionado(s)`
                          : 'Seleccionar roles/actividades'}
                      </span>
                      {rolesExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    
                    {rolesExpanded && (
                      <div className="border-t border-slate-200 max-h-48 overflow-y-auto p-2 space-y-1">
                        {roles.map((role) => (
                          <div key={role.role_id} className="flex items-center space-x-2 p-2 rounded hover:bg-slate-50">
                            <Checkbox
                              id={`reg-${role.role_id}`}
                              checked={formData.role_ids.includes(role.role_id)}
                              onCheckedChange={() => toggleRole(role.role_id)}
                              data-testid={`role-checkbox-${role.role_id}`}
                            />
                            <label
                              htmlFor={`reg-${role.role_id}`}
                              className="text-sm text-slate-700 cursor-pointer flex-1"
                            >
                              {role.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedRoleNames.length > 0 && (
                    <p className="text-xs text-blue-700">
                      Seleccionados: {selectedRoleNames.slice(0, 2).join(', ')}
                      {selectedRoleNames.length > 2 && ` +${selectedRoleNames.length - 2} más`}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">
                  Contraseña *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 border-slate-200 focus:border-blue-600 focus:ring-blue-600/20"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    data-testid="password-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-700">
                  Confirmar contraseña *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 border-slate-200 focus:border-blue-600 focus:ring-blue-600/20"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    data-testid="confirm-password-input"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
                data-testid="register-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  'Crear Cuenta'
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-600 mt-6">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-blue-700 hover:text-blue-800 font-medium">
                Inicia sesión
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500 mt-6">
          <Link to="/" className="hover:text-blue-700">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
