import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { BookOpen, Search, CheckCircle, XCircle, Award, Calendar, Clock, User, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VerifyCertificate = () => {
  const { code } = useParams();
  const [searchCode, setSearchCode] = useState(code === 'demo' ? '' : code || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    fetchBranding();
    if (code && code !== 'demo') {
      handleVerify();
    }
  }, [code]);

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

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    
    if (!searchCode.trim()) {
      toast.error('Ingresa un código de verificación');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${API}/certificates/verify/${searchCode.trim()}`);
      
      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else if (response.status === 404) {
        setResult({ notFound: true });
      } else {
        toast.error('Error al verificar el certificado');
      }
    } catch (error) {
      console.error('Verify error:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center justify-center">
              {branding?.banner_logo_url ? (
                <img 
                  src={`${BACKEND_URL}${branding.banner_logo_url}`} 
                  alt="Logo" 
                  className="h-10 max-w-[160px] object-contain"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-bold text-xl text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    E-Learning
                  </span>
                </div>
              )}
            </Link>
            <Link to="/login">
              <Button variant="outline" className="border-slate-200 hover:border-orange-500" data-testid="login-btn">
                Iniciar Sesión
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Verificar Certificado
          </h1>
          <p className="text-slate-600">
            Ingresa el código único para verificar la autenticidad del certificado
          </p>
        </div>

        {/* Search Form */}
        <Card className="border-slate-200 shadow-lg mb-8" data-testid="verify-card">
          <CardContent className="pt-6">
            <form onSubmit={handleVerify} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Ej: ABC12345"
                  className="pl-10 border-slate-200 focus:border-orange-500 focus:ring-orange-500/20 uppercase"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  data-testid="verify-code-input"
                />
              </div>
              <Button 
                type="submit" 
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={loading}
                data-testid="verify-submit-btn"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Verificar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Result */}
        {result && (
          <div className="animate-slide-up">
            {result.notFound ? (
              <Card className="border-red-200 bg-red-50" data-testid="verify-not-found">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-red-900">Certificado no encontrado</h3>
                      <p className="text-red-700 text-sm">
                        El código ingresado no corresponde a ningún certificado válido.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className={`border-2 ${result.is_valid ? 'border-green-200' : 'border-amber-200'}`} data-testid="verify-result">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      {result.is_valid ? (
                        <>
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <span className="text-green-900">Certificado Válido</span>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-amber-600" />
                          </div>
                          <span className="text-amber-900">
                            {result.expired ? 'Certificado Vencido' : 'Certificado Inválido'}
                          </span>
                        </>
                      )}
                    </CardTitle>
                    <Badge variant={result.is_valid ? 'default' : 'secondary'} className={result.is_valid ? 'bg-green-500' : 'bg-amber-500'}>
                      {result.certificate?.verification_code}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-slate-600">
                        <User className="w-5 h-5" />
                        <div>
                          <p className="text-xs text-slate-400">Alumno</p>
                          <p className="font-medium text-slate-900">{result.certificate?.user_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600">
                        <Award className="w-5 h-5" />
                        <div>
                          <p className="text-xs text-slate-400">RUT</p>
                          <p className="font-medium text-slate-900">{result.certificate?.user_rut || 'No especificado'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600">
                        <BookOpen className="w-5 h-5" />
                        <div>
                          <p className="text-xs text-slate-400">Curso</p>
                          <p className="font-medium text-slate-900">{result.certificate?.course_name}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-slate-600">
                        <Clock className="w-5 h-5" />
                        <div>
                          <p className="text-xs text-slate-400">Horas capacitadas</p>
                          <p className="font-medium text-slate-900">{result.certificate?.hours} horas</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600">
                        <Calendar className="w-5 h-5" />
                        <div>
                          <p className="text-xs text-slate-400">Fecha de emisión</p>
                          <p className="font-medium text-slate-900">{formatDate(result.certificate?.issued_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600">
                        <Calendar className="w-5 h-5" />
                        <div>
                          <p className="text-xs text-slate-400">Vigencia hasta</p>
                          <p className="font-medium text-slate-900">{formatDate(result.certificate?.expires_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyCertificate;
