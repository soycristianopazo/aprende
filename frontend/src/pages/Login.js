import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import { BookOpen, Mail, Lock, Loader2 } from 'lucide-react';
import { useBranding } from '../hooks/useBranding';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Login = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const branding = useBranding();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(formData.email, formData.password);
      toast.success('¡Bienvenido!');
      
      if (user.is_super_admin) {
        navigate('/superadmin');
      } else if (user.is_admin) {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    } catch (error) {
      toast.error(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    loginWithGoogle();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
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
              <img
                src="/aptiva-logo.png"
                alt="Aptiva"
                className="h-14 max-w-[200px] object-contain"
              />
            )}
          </Link>
        </div>

        <Card className="border-slate-200 shadow-xl shadow-blue-600/5" data-testid="login-card">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Iniciar Sesión
            </CardTitle>
            <CardDescription className="text-slate-600">
              Accede a tu panel Aptiva para gestionar competencias, capacitaciones y expedientes.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Google Login */}
            <Button
              type="button"
              variant="outline"
              className="w-full border-slate-200 hover:border-blue-600 hover:bg-blue-50 mb-6"
              onClick={handleGoogleLogin}
              data-testid="google-login-btn"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
            </Button>

            <div className="relative mb-6">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-slate-400">
                o con email
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">
                  Correo electrónico
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
                <Label htmlFor="password" className="text-slate-700">
                  Contraseña
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

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
                data-testid="login-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-600 mt-6">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-blue-700 hover:text-blue-800 font-medium">
                Regístrate aquí
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500 mt-6">
          <Link to="/" className="hover:text-blue-700">
            ← Volver al inicio
          </Link>
        </p>

        <p className="text-center text-xs text-slate-400 mt-4">
          © {new Date().getFullYear()} DoSoft · Aptiva
        </p>
      </div>
    </div>
  );
};

export default Login;
