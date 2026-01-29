import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { BookOpen, Users, Award, BarChart3, CheckCircle, PlayCircle, ArrowRight } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Landing = () => {
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

  const features = [
    {
      icon: BookOpen,
      title: "Cursos Estructurados",
      description: "Mallas curriculares personalizadas por rol con contenido multimedia de alta calidad."
    },
    {
      icon: PlayCircle,
      title: "Contenido Multimedia",
      description: "Videos profesionales y material de apoyo en PDF para un aprendizaje completo."
    },
    {
      icon: CheckCircle,
      title: "Evaluaciones Inteligentes",
      description: "Pruebas automatizadas con retroalimentación inmediata y múltiples intentos."
    },
    {
      icon: Award,
      title: "Certificados Verificables",
      description: "Certificados PDF con código único de verificación y vigencia configurable."
    },
    {
      icon: Users,
      title: "Gestión de Usuarios",
      description: "Administración completa de alumnos, roles y mallas curriculares."
    },
    {
      icon: BarChart3,
      title: "Reportes Detallados",
      description: "Estadísticas completas exportables a Excel/CSV para toma de decisiones."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 relative">
            {/* Left - Empty for balance */}
            <div className="w-32 hidden md:block"></div>
            
            {/* Center - Logo */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
              {branding?.banner_logo_url ? (
                <img 
                  src={`${BACKEND_URL}${branding.banner_logo_url}`} 
                  alt="Logo" 
                  className="h-10 max-w-[180px] object-contain"
                />
              ) : (
                <>
                  <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-bold text-xl text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    E-Learning
                  </span>
                </>
              )}
            </div>
            
            {/* Right - Buttons */}
            <div className="flex items-center gap-4">
              <Link to="/verify/demo">
                <Button variant="ghost" className="text-slate-600 hover:text-orange-600 hidden md:inline-flex" data-testid="verify-cert-btn">
                  Verificar Certificado
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="border-slate-200 hover:border-orange-500 hover:text-orange-600" data-testid="login-btn">
                  Iniciar Sesión
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white hidden sm:inline-flex" data-testid="register-btn">
                  Registrarse
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-orange-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-up">
              <span className="inline-block px-4 py-1.5 rounded-full bg-orange-100 text-orange-600 text-sm font-medium mb-6">
                Plataforma de Capacitación E-Learning
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Capacita a tu equipo de forma{' '}
                <span className="text-orange-500">eficiente</span>
              </h1>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Gestiona cursos, evaluaciones y certificaciones de manera automatizada. 
                Mallas curriculares por rol, contenido multimedia y reportes detallados.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 gap-2" data-testid="hero-register-btn">
                    Comenzar Ahora
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="border-slate-200 hover:border-orange-500" data-testid="hero-login-btn">
                    Ya tengo cuenta
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative animate-slide-up stagger-2">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-orange-500/5 rounded-3xl transform rotate-3"></div>
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80"
                alt="Team learning"
                className="relative rounded-3xl shadow-2xl shadow-orange-500/10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Todo lo que necesitas para capacitar
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Una plataforma completa para gestionar la formación de tu equipo de principio a fin.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all duration-300 card-hover"
                data-testid={`feature-card-${index}`}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {feature.title}
                  </h3>
                  <p className="text-slate-600">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "100%", label: "Digital" },
              { value: "24/7", label: "Disponible" },
              { value: "PDF", label: "Certificados" },
              { value: "CSV", label: "Exportable" }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-orange-500 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {stat.value}
                </div>
                <div className="text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-orange-500 to-orange-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
            ¿Listo para comenzar?
          </h2>
          <p className="text-lg text-orange-100 mb-8">
            Registra tu cuenta y comienza a capacitar a tu equipo hoy mismo.
          </p>
          <Link to="/register">
            <Button size="lg" variant="secondary" className="bg-white text-orange-600 hover:bg-orange-50 shadow-lg gap-2" data-testid="cta-register-btn">
              Crear Cuenta Gratis
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {branding?.banner_logo_url ? (
                <img 
                  src={`${BACKEND_URL}${branding.banner_logo_url}`} 
                  alt="Logo" 
                  className="h-8 max-w-[140px] object-contain brightness-0 invert"
                />
              ) : (
                <>
                  <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    E-Learning Platform
                  </span>
                </>
              )}
            </div>
            <p className="text-slate-400 text-sm">
              © {new Date().getFullYear()} E-Learning Platform. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
