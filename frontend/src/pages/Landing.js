import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
  CheckCircle2, ArrowRight, ShieldCheck, ShieldAlert, Bell, Award,
  Briefcase, Building2, HardHat, FolderKanban, AlertTriangle, Scale, BookOpen,
  FileText, IdCard, ClipboardCheck, FolderArchive, Smartphone, Gavel, BarChart3,
  ListChecks, Layers,
} from 'lucide-react';
import { useBranding } from '../hooks/useBranding';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Landing = () => {
  const branding = useBranding();

  const benefits = [
    'Competencias verificadas por cargo, rol y actividad',
    'Matriz automática de requerimientos legales y organizacionales',
    'Alertas inteligentes de vencimientos y recertificaciones',
    'Evidencia digital para auditorías, investigaciones e inspecciones',
  ];

  const requirementDimensions = [
    { icon: Briefcase, title: 'Cargo o función', text: 'El rol que ocupa cada persona define qué necesita acreditar.' },
    { icon: Building2, title: 'Área de trabajo', text: 'Mantenimiento, operación, administración — cada área tiene sus propios requisitos.' },
    { icon: HardHat, title: 'Actividad crítica', text: 'Altura, espacios confinados, izaje, energías peligrosas: alto riesgo, alta exigencia.' },
    { icon: FolderKanban, title: 'Proyecto o contrato', text: 'Cada mandante exige condiciones distintas. Aptiva las gestiona en paralelo.' },
    { icon: AlertTriangle, title: 'Riesgos presentes', text: 'La identificación de peligros se traduce en controles documentados.' },
    { icon: Scale, title: 'Exigencias legales', text: 'Cumplimiento normativo automático: SUSESO, Mutual, DS-594, DS-40, DS-132 y más.' },
    { icon: BookOpen, title: 'Procedimientos internos', text: 'Tus propios estándares también son parte del checklist.' },
  ];

  const controlItems = [
    { icon: Award, label: 'Certificados de capacitación' },
    { icon: ShieldCheck, label: 'Competencias laborales' },
    { icon: IdCard, label: 'Licencias y autorizaciones' },
    { icon: FileText, label: 'Documentación obligatoria' },
    { icon: FolderArchive, label: 'Evidencias y respaldos digitales' },
  ];

  const fieldVerification = [
    'Está autorizado para realizar la tarea.',
    'Tiene salud compatible vigente.',
    'Posee las competencias requeridas.',
    'Cuenta con todas sus capacitaciones al día.',
    'Mantiene su documentación vigente.',
  ];

  const legalProofs = [
    'Verificó las competencias del trabajador.',
    'Controló la vigencia de sus autorizaciones.',
    'Aseguró la salud compatible.',
    'Gestionó las capacitaciones obligatorias.',
    'Comunicó los riesgos y controles aplicables.',
    'Mantuvo trazabilidad completa del cumplimiento.',
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-200" data-testid="landing-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              {branding?.banner_logo_url ? (
                <img src={`${BACKEND_URL}${branding.banner_logo_url}`} alt="Aptiva" className="h-10 max-w-[180px] object-contain" />
              ) : (
                <img src="/aptiva-logo.png" alt="Aptiva" className="h-10 max-w-[180px] object-contain" />
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

      {/* Hero */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-up">
              <span
                className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6"
                data-testid="hero-badge"
              >
                Gestión de Competencias, Capacitaciones y Evidencia Digital
              </span>
              <h1
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight mb-6 leading-[1.05]"
                style={{ fontFamily: 'Manrope, sans-serif' }}
                data-testid="hero-title"
              >
                Cada trabajador <span className="text-blue-600">competente</span>.
                <br />
                Cada requisito <span className="text-blue-600">respaldado</span>.
              </h1>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed" data-testid="hero-subtitle">
                Aptiva centraliza la gestión de competencias, capacitaciones, aptitudes médicas y documentación
                obligatoria para asegurar que cada trabajador esté habilitado <span className="font-semibold text-slate-800">antes</span>{' '}
                de realizar una tarea.
              </p>
              <p className="text-base text-slate-600 mb-8 leading-relaxed">
                Detecta automáticamente las brechas de cumplimiento, alerta vencimientos y entrega evidencia digital
                para auditorías, fiscalizaciones e investigaciones de incidentes — reduciendo la exposición legal
                de tu empresa.
              </p>
              <ul className="space-y-2 mb-8">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-700" data-testid={`hero-bullet-${i}`}>
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
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
                alt="Trabajadores en faena con evidencia digital al día"
                className="relative rounded-3xl shadow-2xl shadow-blue-600/10 object-cover w-full h-[460px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section: Más que un software de capacitaciones */}
      <section className="py-20 bg-white" data-testid="section-requirements">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Diferencia clave</span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Mucho más que un software de capacitaciones.
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Aptiva identifica automáticamente qué requisitos debe cumplir cada trabajador para que reciba{' '}
              <span className="font-semibold text-slate-800">únicamente</span> las capacitaciones, evaluaciones y
              documentos que realmente necesita.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {requirementDimensions.map((d, i) => (
              <Card
                key={i}
                className="bg-white border border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all duration-300"
                data-testid={`requirement-${i}`}
              >
                <CardContent className="p-6">
                  <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                    <d.icon className="w-5 h-5 text-blue-700" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {d.title}
                  </h3>
                  <p className="text-sm text-slate-600">{d.text}</p>
                </CardContent>
              </Card>
            ))}
            <div className="hidden lg:block"></div>
          </div>
        </div>
      </section>

      {/* Section: Control total */}
      <section className="py-20 bg-slate-50" data-testid="section-control">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
            <div>
              <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Un solo lugar</span>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Control total del cumplimiento.
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                Mantén en un solo lugar toda la información crítica de tus trabajadores. Sin planillas paralelas,
                sin carpetas físicas, sin sorpresas el día de la auditoría.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                <Layers className="w-4 h-4" />
                Centralización · Trazabilidad · Vigencia
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {controlItems.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-4 hover:border-blue-300 hover:shadow-sm transition-all"
                  data-testid={`control-${i}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <c.icon className="w-5 h-5 text-blue-700" />
                  </div>
                  <span className="text-sm font-medium text-slate-800">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section: Verificación en terreno */}
      <section className="py-20 bg-white" data-testid="section-field">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tl from-blue-600/15 to-blue-600/0 rounded-3xl transform -rotate-3"></div>
                <img
                  src="https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=900&q=80"
                  alt="Supervisor verificando habilitación desde tablet en faena"
                  className="relative rounded-3xl shadow-xl shadow-blue-600/10 object-cover w-full h-[460px]"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 mb-3">
                <Smartphone className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Mobile-ready</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Verificación en terreno, en segundos.
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                Antes de ejecutar un trabajo, supervisores o inspectores pueden verificar desde cualquier
                dispositivo si un trabajador:
              </p>
              <ul className="space-y-3 mb-6">
                {fieldVerification.map((t, i) => (
                  <li key={i} className="flex items-start gap-3" data-testid={`field-check-${i}`}>
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    </div>
                    <span className="text-slate-700">{t}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-slate-500 italic">
                Todo respaldado con evidencia digital y trazabilidad completa.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Anticípate al incumplimiento */}
      <section className="py-20 bg-gradient-to-br from-amber-50 via-white to-blue-50" data-testid="section-anticipate">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 mb-6">
            <Bell className="w-7 h-7 text-amber-700" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Anticípate al incumplimiento.
          </h2>
          <p className="text-lg text-slate-700 max-w-2xl mx-auto mb-3">
            No esperes una auditoría o un accidente.
          </p>
          <p className="text-base text-slate-600 max-w-3xl mx-auto leading-relaxed mb-8">
            Aptiva genera alertas automáticas antes del vencimiento de certificados, licencias, exámenes médicos
            y cualquier documento crítico, permitiendo planificar renovaciones y mantener la continuidad operacional.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="alert-card-0">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-3 mx-auto">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
              </div>
              <p className="text-sm font-semibold text-slate-900 mb-1">Vigente</p>
              <p className="text-xs text-slate-500">Visibilidad y tranquilidad operativa.</p>
            </div>
            <div className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm" data-testid="alert-card-1">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3 mx-auto">
                <Bell className="w-5 h-5 text-amber-700" />
              </div>
              <p className="text-sm font-semibold text-slate-900 mb-1">Por vencer</p>
              <p className="text-xs text-slate-500">Alerta proactiva antes del vencimiento.</p>
            </div>
            <div className="bg-white rounded-xl border border-red-200 p-5" data-testid="alert-card-2">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-3 mx-auto">
                <ShieldAlert className="w-5 h-5 text-red-700" />
              </div>
              <p className="text-sm font-semibold text-slate-900 mb-1">Vencido</p>
              <p className="text-xs text-slate-500">Bloqueo inmediato hasta regularizar.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Protección legal */}
      <section className="py-20 bg-slate-900 text-white" data-testid="section-legal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-12 items-start">
            <div>
              <div className="inline-flex items-center gap-2 mb-3">
                <Gavel className="w-4 h-4 text-blue-300" />
                <span className="text-sm font-semibold text-blue-300 uppercase tracking-wide">Blindaje legal</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Protege a tu organización.
              </h2>
              <p className="text-lg text-slate-300 leading-relaxed mb-6">
                En caso de una auditoría, fiscalización o investigación de un incidente, Aptiva proporciona la
                evidencia documental que demuestra que la empresa actuó con diligencia.
              </p>
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex items-start gap-3">
                <ClipboardCheck className="w-5 h-5 text-blue-300 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-300">
                  Reduce la exposición a <span className="font-semibold text-white">responsabilidades civiles,
                  laborales y penales</span> mediante una gestión documentada y verificable.
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-300 uppercase tracking-wide mb-4">
                Aptiva demuestra que la empresa:
              </p>
              <ul className="space-y-3">
                {legalProofs.map((t, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 bg-slate-800/40 border border-slate-700 hover:border-blue-500/60 rounded-xl px-4 py-3 transition-colors"
                    data-testid={`legal-proof-${i}`}
                  >
                    <ListChecks className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-200">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 border-t border-slate-800">
            <div className="text-center" data-testid="metric-0">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 mb-3">
                <BarChart3 className="w-5 h-5 text-blue-300" />
              </div>
              <p className="text-2xl font-bold">100%</p>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Trazabilidad</p>
            </div>
            <div className="text-center" data-testid="metric-1">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 mb-3">
                <Layers className="w-5 h-5 text-blue-300" />
              </div>
              <p className="text-2xl font-bold">Multi-empresa</p>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Holdings y contratistas</p>
            </div>
            <div className="text-center" data-testid="metric-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 mb-3">
                <Smartphone className="w-5 h-5 text-blue-300" />
              </div>
              <p className="text-2xl font-bold">24/7</p>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Acceso desde terreno</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Conoce Aptiva en una demo de 20 minutos.
          </h2>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            Te mostramos cómo centralizamos competencias, capacitaciones y evidencia digital para que cada
            trabajador esté siempre habilitado y tu empresa siempre respaldada.
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
      <footer className="py-12 bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {branding?.banner_logo_url ? (
                <img src={`${BACKEND_URL}${branding.banner_logo_url}`} alt="Aptiva" className="h-8 max-w-[140px] object-contain brightness-0 invert" />
              ) : (
                <img src="/aptiva-logo.png" alt="Aptiva" className="h-8 max-w-[140px] object-contain brightness-0 invert" />
              )}
            </div>
            <p className="text-slate-400 text-sm text-center md:text-right">
              © {new Date().getFullYear()} DoSoft · Aptiva — Gestión de Competencias, Capacitaciones y Evidencia Digital
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
