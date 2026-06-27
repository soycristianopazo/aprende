import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
  FolderOpen, ShieldCheck, GraduationCap, Layers, Building2, FileBarChart,
  ArrowRight, CheckCircle2
} from 'lucide-react';
import { useBranding } from '../hooks/useBranding';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Landing = () => {
  const branding = useBranding();

  const features = [
    {
      icon: FolderOpen,
      title: "Storage de Trabajadores",
      description: "Expediente digital por trabajador: contratos, exámenes pre-ocupacionales, certificados de salud compatible, licencias y vencimientos."
    },
    {
      icon: Layers,
      title: "Matriz de Competencias",
      description: "Define competencias por área y actividad. Trazabilidad de adquisición, vigencia y vencimientos por trabajador."
    },
    {
      icon: GraduationCap,
      title: "Ruta Aptiva",
      description: "Capacitaciones autogestionadas: cada trabajador ve exactamente las que su área, actividad y competencias requieren — sin asignación manual."
    },
    {
      icon: ShieldCheck,
      title: "Respaldo Legal",
      description: "Ante accidente, auditoría o fiscalización, la empresa cuenta con la documentación lista para blindarse de responsabilidades civiles y penales."
    },
    {
      icon: Building2,
      title: "Multi-empresa",
      description: "Configurable por empresa, área y actividad. Cada organización gestiona su propio universo de trabajadores y documentos."
    },
    {
      icon: FileBarChart,
      title: "Reportes y Constancias",
      description: "Certificados PDF verificables, alertas de vencimiento y reportes exportables a CSV/Excel para fiscalizaciones."
    }
  ];

  const bullets = [
    "Documentación obligatoria al día",
    "Salud compatible verificada",
    "Competencias acreditadas",
    "Conocimiento de riesgos y controles"
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              {branding?.banner_logo_url ? (
                <img
                  src={`${BACKEND_URL}${branding.banner_logo_url}`}
                  alt="Aptiva"
                  className="h-10 max-w-[180px] object-contain"
                />
              ) : (
                <img
                  src="/aptiva-logo.png"
                  alt="Aptiva"
                  className="h-10 max-w-[180px] object-contain"
                />
              )}
            </div>
            <div className="flex items-center gap-4">
              <Link to="/verify/demo">
                <Button variant="ghost" className="text-slate-600 hover:text-blue-700" data-testid="verify-cert-btn">
                  Verificar Constancia
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="border-slate-200 hover:border-blue-600 hover:text-blue-700" data-testid="login-btn">
                  Iniciar Sesión
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-up">
              <span
                className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6"
                data-testid="hero-badge"
              >
                Gestión de Competencias, Capacitaciones y Storage
              </span>
              <h1
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight mb-6"
                style={{ fontFamily: 'Manrope, sans-serif' }}
                data-testid="hero-title"
              >
                Blinda a tu empresa con trabajadores{' '}
                <span className="text-blue-600">competentes y respaldados</span>
              </h1>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed" data-testid="hero-subtitle">
                Aptiva asegura que cada trabajador cuente con la documentación, salud compatible,
                competencias y conocimiento de los riesgos y controles necesarios. Ante un accidente
                o auditoría, tu empresa tiene los respaldos para blindarse de responsabilidades civiles
                y penales según la legislación.
              </p>
              <ul className="space-y-2 mb-8">
                {bullets.map((b, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-700" data-testid={`hero-bullet-${i}`}>
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 gap-2" data-testid="hero-login-btn">
                    Acceder a mi cuenta
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <a href="mailto:contacto@dosoft.cl?subject=Solicitud%20demo%20Aptiva">
                  <Button size="lg" variant="outline" className="border-slate-200 hover:border-blue-600" data-testid="hero-demo-btn">
                    Solicitar demo
                  </Button>
                </a>
              </div>
            </div>
            <div className="relative animate-slide-up stagger-2">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-blue-600/5 rounded-3xl transform rotate-3"></div>
              <img
                src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=900&q=80"
                alt="Equipo de trabajadores en faena"
                className="relative rounded-3xl shadow-2xl shadow-blue-600/10 object-cover w-full h-[420px]"
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
              Una plataforma, un solo respaldo
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Competencias, capacitaciones y expedientes en un mismo lugar. Configurable por empresa,
              área y actividad.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 card-hover"
                data-testid={`feature-card-${index}`}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-blue-600" />
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

      {/* How it works */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Cómo funciona Aptiva
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: '01', t: 'Configura tu empresa', d: 'Define áreas, actividades y las competencias que cada una requiere. Aptiva se adapta a tu estructura.' },
              { n: '02', t: 'Carga a tus trabajadores', d: 'Importa el padrón vía CSV o uno a uno. Sube documentos al expediente digital de cada uno.' },
              { n: '03', t: 'Ruta Aptiva activa', d: 'Cada trabajador ve automáticamente sus capacitaciones obligatorias, vencimientos y constancias.' }
            ].map((step, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200" data-testid={`step-${i}`}>
                <div className="text-blue-600 text-sm font-bold mb-3">{step.n}</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {step.t}
                </h3>
                <p className="text-slate-600">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
            ¿Listo para blindar tu operación?
          </h2>
          <p className="text-lg text-blue-100 mb-8">
            Solicita una demo y conoce cómo Aptiva centraliza competencias, capacitaciones y expedientes
            de tus trabajadores.
          </p>
          <a href="mailto:contacto@dosoft.cl?subject=Solicitud%20demo%20Aptiva">
            <Button size="lg" variant="secondary" className="bg-white text-blue-700 hover:bg-blue-50 shadow-lg gap-2" data-testid="cta-demo-btn">
              Solicitar demo
              <ArrowRight className="w-5 h-5" />
            </Button>
          </a>
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
                  alt="Aptiva"
                  className="h-8 max-w-[140px] object-contain brightness-0 invert"
                />
              ) : (
                <img
                  src="/aptiva-logo.png"
                  alt="Aptiva"
                  className="h-8 max-w-[140px] object-contain brightness-0 invert"
                />
              )}
            </div>
            <p className="text-slate-400 text-sm">
              © {new Date().getFullYear()} DoSoft · Aptiva — Gestión de Competencias, Capacitaciones y Storage
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
