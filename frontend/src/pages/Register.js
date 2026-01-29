import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { BookOpen, Mail, Lock, User, Building, CreditCard, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [branding, setBranding] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    rut: '',
    company: '',
    role_id: ''
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
        role_id: formData.role_id || null,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4 py-12">
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
                <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <span className="font-bold text-2xl text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  E-Learning
                </span>
              </div>
            )}
          </Link>
        </div>

        <Card className="border-slate-200 shadow-xl shadow-orange-500/5" data-testid="register-card">
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
                    className="pl-10 border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
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
                    className="pl-10 border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
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
                    className="pl-10 border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
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
                    className="pl-10 border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    data-testid="company-input"
                  />
                </div>
              </div>

              {roles.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-slate-700">
                    Rol (opcional)
                  </Label>
                  <Select
                    value={formData.role_id}
                    onValueChange={(value) => setFormData({ ...formData, role_id: value })}
                  >
                    <SelectTrigger className="border-slate-200 focus:border-orange-500" data-testid="role-select">
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.role_id} value={role.role_id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    className="pl-10 border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
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
                    className="pl-10 border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    data-testid="confirm-password-input"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
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
              <Link to="/login" className="text-orange-600 hover:text-orange-700 font-medium">
                Inicia sesión
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500 mt-6">
          <Link to="/" className="hover:text-orange-600">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
