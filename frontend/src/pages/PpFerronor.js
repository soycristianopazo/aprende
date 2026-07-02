/**
 * Propuesta técnica y económica pública — Ferronor.
 * Ruta pública: /pp-ferronor  (sin autenticación)
 * Export PDF: botón que dispara window.print(); CSS @media print oculta la barra superior.
 */
import { Button } from '../components/ui/button';
import {
  Download, Building2, ShieldCheck, Bell, Award, BarChart3, Layers, CheckCircle2,
  ArrowRight, Sparkles, Users, GraduationCap, FileCheck, Rocket, Zap, LineChart,
  Globe,
} from 'lucide-react';

const AptivaLogo = ({ dark = false, size = 'md' }) => {
  const sizeCls = size === 'lg' ? 'h-16 sm:h-20' : size === 'sm' ? 'h-10' : 'h-12 sm:h-14';
  return (
    <img
      src="/aptiva-logo.png"
      alt="Aptiva — Evidencia Digital"
      className={`${sizeCls} w-auto object-contain ${dark ? '' : 'brightness-0 invert'}`}
    />
  );
};

const Section = ({ id, eyebrow, title, subtitle, children, className = '', titleClassName = '' }) => (
  <section id={id} className={`scroll-mt-20 ${className}`} data-testid={`section-${id}`}>
    {eyebrow && (
      <p className="text-[11px] uppercase tracking-[0.2em] text-blue-700 font-semibold mb-2">{eyebrow}</p>
    )}
    <h2 className={`text-3xl sm:text-4xl font-bold text-slate-900 leading-tight ${titleClassName}`} style={{ fontFamily: 'Manrope, sans-serif' }}>
      {title}
    </h2>
    {subtitle && <p className="mt-4 text-slate-600 text-base leading-relaxed text-justify">{subtitle}</p>}
    <div className="mt-8">{children}</div>
  </section>
);

const FeatureCard = ({ icon: Icon, title, desc, tone = 'blue' }) => {
  const toneMap = {
    blue: 'from-blue-50 border-blue-100 text-blue-700',
    emerald: 'from-emerald-50 border-emerald-100 text-emerald-700',
    amber: 'from-amber-50 border-amber-100 text-amber-700',
    violet: 'from-violet-50 border-violet-100 text-violet-700',
    rose: 'from-rose-50 border-rose-100 text-rose-700',
    slate: 'from-slate-50 border-slate-100 text-slate-700',
  };
  return (
    <div className={`rounded-xl border p-5 bg-gradient-to-b to-white ${toneMap[tone]}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white shadow-sm border border-slate-100 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-sm font-bold text-slate-900">{title}</p>
      </div>
      <p className="mt-3 text-sm text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
};

const StepCard = ({ n, title, desc }) => (
  <div className="relative rounded-2xl border border-slate-200 bg-white p-6">
    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base absolute -top-4 -left-4 shadow-lg">
      {n}
    </div>
    <h4 className="mt-2 text-slate-900 font-bold">{title}</h4>
    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{desc}</p>
  </div>
);

const CheckLine = ({ children }) => (
  <li className="flex items-start gap-2.5">
    <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
    <span className="text-sm text-slate-700 leading-relaxed">{children}</span>
  </li>
);

const PpFerronor = () => {
  const handlePrint = () => window.print();
  const today = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-white" data-testid="pp-ferronor-page">
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          .no-print { display: none !important; }
          .print-page-break { page-break-before: always; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Sticky action bar (hidden on print) */}
      <div className="no-print sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="text-xs text-slate-500 tracking-wider uppercase font-semibold">Propuesta · Ferronor · {today}</div>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="pp-export-pdf-btn">
            <Download className="w-4 h-4 mr-2" /> Exportar a PDF
          </Button>
        </div>
      </div>

      {/* === HERO (portada) === */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #3B82F6 0, transparent 40%), radial-gradient(circle at 80% 80%, #10B981 0, transparent 45%)" }} />
        <div className="max-w-6xl mx-auto px-6 py-16 sm:py-20 relative">
          <div className="flex items-center justify-between">
            <AptivaLogo size="lg" />
            <p className="text-white/60 text-xs uppercase tracking-widest">Confidencial</p>
          </div>

          <div className="mt-14 sm:mt-20">
            <p className="text-blue-300 text-sm uppercase tracking-[0.25em] font-semibold">Propuesta técnica y económica</p>
            <h1 className="mt-4 text-4xl sm:text-6xl font-black leading-[1.05]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Aptiva para <br /><span className="text-blue-300">Ferronor</span>
            </h1>
            <p className="mt-6 text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed">
              Plataforma digital para gestionar competencias, capacitaciones y evidencia digital de sus trabajadores —
              lista para auditorías, sin planillas dispersas y sin sorpresas de vencimiento.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-xs text-white/70 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              Un producto de <strong className="text-white ml-0.5">DoSoft</strong>
              <span className="text-white/50">·</span>
              <span className="text-white/70">Spin-Off de Legav</span>
            </p>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
              {[
                { k: 'Dirigido a', v: 'Javier López · Eduardo Catrifol', sub: 'Ferronor' },
                { k: 'Fecha', v: today, sub: 'Vigencia 30 días' },
                { k: 'Preparado por', v: 'DoSoft SpA', sub: 'Spin-Off de Legav' },
              ].map((c) => (
                <div key={c.k} className="rounded-xl bg-white/5 border border-white/10 p-4">
                  <p className="text-white/50 text-[10px] uppercase tracking-widest font-semibold">{c.k}</p>
                  <p className="text-white font-bold text-sm mt-1.5 leading-tight">{c.v}</p>
                  <p className="text-white/60 text-xs mt-1">{c.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* === CONTENIDO === */}
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-20">

        {/* Resumen ejecutivo */}
        <Section id="resumen" eyebrow="Resumen ejecutivo"
          title="Cero papel. Cero planillas dispersas. Cero sorpresas en auditoría."
          subtitle="Aptiva centraliza todo el ciclo de vida de la evidencia laboral: cursos, certificados, exámenes médicos, licencias y capacitaciones — con alertas antes de que un vencimiento se convierta en una detención de faena."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 p-6 bg-gradient-to-b from-blue-50 to-white">
              <p className="text-4xl font-black text-blue-700 leading-none">95%</p>
              <p className="mt-2 text-sm text-slate-700 font-semibold">Menos tiempo administrativo</p>
              <p className="mt-1 text-xs text-slate-500">vs. gestión manual con planillas dispersas y carpetas físicas.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-6 bg-gradient-to-b from-emerald-50 to-white">
              <p className="text-4xl font-black text-emerald-700 leading-none">100%</p>
              <p className="mt-2 text-sm text-slate-700 font-semibold">Trazabilidad para auditorías</p>
              <p className="mt-1 text-xs text-slate-500">Evidencia con fecha, autor y vigencia.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-6 bg-gradient-to-b from-amber-50 to-white">
              <p className="text-4xl font-black text-amber-700 leading-none">0</p>
              <p className="mt-2 text-sm text-slate-700 font-semibold">Vencimientos sin aviso</p>
              <p className="mt-1 text-xs text-slate-500">Alertas automáticas a 90 · 30 · 0 días.</p>
            </div>
          </div>
        </Section>

        {/* Problema */}
        <Section id="problema" eyebrow="El problema"
          title="Hoy gestionar la evidencia Documental cuesta más de lo que se ve."
          titleClassName="text-2xl sm:text-3xl md:text-[28px] lg:text-[32px] xl:text-4xl md:whitespace-nowrap"
          subtitle="En operaciones ferroviarias la evidencia legal de los trabajadores está dispersa: Documentos en un archivador, certificados en el mail del prevencionista, licencias en el celular del maquinista. El resultado: alertas que llegan tarde, auditorías que se resuelven a última hora y trabajadores que realizan sus labores sin la habilitación vigente.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { t: 'Vencimientos silenciosos', d: 'Licencias, cursos y exámenes médicos que caducan sin previo aviso y detienen operaciones.' },
              { t: 'Auditorías reactivas', d: 'Cuando llega el auditor, se corre a juntar carpetas y correos. Riesgo de multa o cierre.' },
              { t: 'Duplicación y errores', d: 'Un mismo curso registrado 3 veces con distintas fechas. Nadie sabe cuál es la vigente.' },
              { t: 'Sin visibilidad ejecutiva', d: 'La gerencia no tiene un tablero real. Se decide sobre percepción, no sobre datos.' },
            ].map((p) => (
              <div key={p.t} className="rounded-xl border border-red-100 bg-red-50/50 p-5">
                <p className="text-red-800 font-bold text-sm">{p.t}</p>
                <p className="text-red-700/80 text-sm mt-1.5 leading-relaxed">{p.d}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Solución */}
        <Section id="solucion" eyebrow="La solución"
          title="Aptiva: la evidencia digital operativa de sus trabajadores."
          subtitle="Cada trabajador tiene su expediente digital. Cada admin ve el cumplimiento en tiempo real. Cada auditor recibe evidencia trazable en 1 click.">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard icon={Users} tone="blue" title="Perfil del trabajador"
              desc="Cada trabajador ingresa a su perfil personal, completa las capacitaciones asignadas según su cargo/actividad y sube su evidencia. Aptiva le muestra qué le falta y qué está por vencer." />
            <FeatureCard icon={Bell} tone="amber" title="Alertas de vencimiento"
              desc="Notificaciones automáticas por email y en el sistema a 90, 30 y 0 días. Nadie sube a faena con licencia vencida." />
            <FeatureCard icon={BarChart3} tone="violet" title="Matriz de cumplimiento"
              desc="Vista cruzada Trabajadores × Competencias con estado por celda (vigente / por vencer / vencida / falta / no aplica). Exportable a Excel." />
            <FeatureCard icon={Award} tone="emerald" title="Certificados autogenerados"
              desc="Al aprobar un curso, Aptiva emite un certificado con código de verificación público. Descargable en PDF y verificable por QR." />
            <FeatureCard icon={LineChart} tone="rose" title="Dashboard en tiempo real"
              desc="Gerencia y HSE ven cumplimiento global, distribución por cargo, top y bottom trabajadores, radar de cobertura por competencia y vencimientos próximos." />
            <FeatureCard icon={Layers} tone="slate" title="Estructura organizacional propia"
              desc="Ferronor define sus áreas, gerencias, cargos y actividades. Cada trabajador queda ubicado en su contexto operativo, con los requerimientos que corresponden a su función." />
          </div>
        </Section>

        {/* Cómo funciona */}
        <Section id="funcionamiento" eyebrow="Cómo funciona"
          title="En 4 pasos, todo su capital humano queda digitalizado."
          subtitle="Implementación en 2-3 semanas, sin cambios en su ERP.">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-8">
            <StepCard n="1" title="Onboarding"
              desc="Cargamos áreas, actividades, cargos, competencias y trabajadores directamente desde archivos Excel. En 2 días queda parametrizado." />
            <StepCard n="2" title="Activación"
              desc="Cada trabajador recibe su usuario y contraseña inicial. Ingresa a su perfil desde cualquier dispositivo." />
            <StepCard n="3" title="Operación diaria"
              desc="Se carga la evidencia. El Admin gestiona cursos, capacitaciones y expedientes. Sistema calcula el cumplimiento automáticamente." />
            <StepCard n="4" title="Auditoría & KPIs"
              desc="Dashboard ejecutivo, reportes exportables, matriz de cumplimiento y alertas. Todo trazable, todo con fecha y autor." />
          </div>
        </Section>

        {/* Funcionalidades principales */}
        <Section id="funcionalidades" eyebrow="Funcionalidades principales"
          title="Todo lo que necesita para dejar las planillas dispersas en la historia.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" /> Gestión de personas
              </h4>
              <ul className="space-y-2">
                <CheckLine>Trabajadores con RUT, cargo, áreas y actividades asignadas.</CheckLine>
                <CheckLine>Mantenedor de cargos (Maquinista, Rigger, Prevencionista, etc.).</CheckLine>
                <CheckLine>Carga masiva por Excel con validación previa.</CheckLine>
                <CheckLine>Reseteo de contraseñas a un click.</CheckLine>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600" /> Capacitaciones y competencias
              </h4>
              <ul className="space-y-2">
                <CheckLine>Catálogo de cursos con evaluaciones online.</CheckLine>
                <CheckLine>Competencias otorgadas automáticamente al aprobar curso.</CheckLine>
                <CheckLine>Vigencia configurable (12, 24, 36 meses).</CheckLine>
                <CheckLine>Registro manual con archivo de respaldo cuando el curso es externo.</CheckLine>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-600" /> Expediente digital
              </h4>
              <ul className="space-y-2">
                <CheckLine>Contratos, cédulas, licencias, exámenes médicos.</CheckLine>
                <CheckLine>Tipos de documento configurables por área/actividad.</CheckLine>
                <CheckLine>Historial completo con fecha, autor y vigencia.</CheckLine>
                <CheckLine>Descarga directa desde el perfil del trabajador.</CheckLine>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> Cumplimiento y estándares
              </h4>
              <ul className="space-y-2">
                <CheckLine>Estándar de acreditación configurable a la medida de Ferronor.</CheckLine>
                <CheckLine>Scope granular: por área, cargo o actividad.</CheckLine>
                <CheckLine>Match automático documento ↔ ítem del estándar.</CheckLine>
                <CheckLine>Certificados autogenerados con código de verificación.</CheckLine>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600" /> Alertas y notificaciones
              </h4>
              <ul className="space-y-2">
                <CheckLine>Notificaciones a 90, 30 y 0 días del vencimiento.</CheckLine>
                <CheckLine>Panel centralizado de alertas con severidad.</CheckLine>
                <CheckLine>Email y notificación in-app.</CheckLine>
                <CheckLine>Export a Excel para reuniones semanales.</CheckLine>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" /> Reportería
              </h4>
              <ul className="space-y-2">
                <CheckLine>Dashboard ejecutivo con 6+ gráficos en tiempo real.</CheckLine>
                <CheckLine>Matriz Trabajadores × Competencias.</CheckLine>
                <CheckLine>Heatmap Actividades × Competencias.</CheckLine>
                <CheckLine>Exportación a Excel y PDF de todos los reportes.</CheckLine>
              </ul>
            </div>
          </div>
        </Section>

        {/* Beneficios */}
        <Section id="beneficios" eyebrow="Beneficios directos para Ferronor"
          title="Por qué esto justifica su inversión en el mes 1.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { i: Zap, t: 'Cero paralización por vencimientos', d: 'La operación no se detiene porque un maquinista tenía la licencia vencida.' },
              { i: Sparkles, t: 'Auditorías más rápidas', d: 'Auditor pide evidencia → un click, un PDF. Sin correos, sin carpetas físicas.' },
              { i: Rocket, t: 'Escalable con Ferronor', d: 'Diseñada por Gerencia y Rol: hoy 50 trabajadores, mañana 500 sin cambio de plataforma ni de precio.' },
              { i: Building2, t: 'Datos por Gerencia y Área', d: 'Filtra el cumplimiento por Gerencia, Área o Cargo para focalizar planes de acción específicos.' },
              { i: ShieldCheck, t: 'Reduce riesgo laboral y legal', d: 'Trazabilidad completa: fecha, autor, adjunto, vigencia. Prueba en tribunales.' },
              { i: LineChart, t: 'Gerencia con datos, no anécdotas', d: 'Tablero de KPIs actualizado 24/7 accesible desde cualquier dispositivo.' },
            ].map((b) => (
              <div key={b.t} className="flex gap-4 rounded-xl border border-slate-200 p-5 bg-white hover:shadow-md transition">
                <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <b.i className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{b.t}</p>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{b.d}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Escalabilidad */}
        <Section id="escalabilidad" eyebrow="Arquitectura"
          title="Diseñado para crecer con Ferronor.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 p-5 bg-slate-50">
              <p className="text-sm font-bold text-slate-900">Entorno dedicado</p>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">Ferronor cuenta con su propio espacio, datos privados y estándar configurado a la medida — con control total sobre su información.</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-5 bg-slate-50">
              <p className="text-sm font-bold text-slate-900">Cloud escalable</p>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">Infraestructura elástica: soporta 10 o 10.000 trabajadores sin cambio de plataforma.</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-5 bg-slate-50">
              <p className="text-sm font-bold text-slate-900">API abierta</p>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">Integración futura con ERP, sistemas de RRHH y control de acceso a faena.</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-5 bg-slate-50">
              <p className="text-sm font-bold text-slate-900">Seguridad</p>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">Contraseñas hashadas (bcrypt), JWT, SSL/TLS, control por rol y por empresa.</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-5 bg-slate-50">
              <p className="text-sm font-bold text-slate-900">Backup diario</p>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">Respaldo automático en la nube, con recuperación punto-en-tiempo.</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-5 bg-slate-50">
              <p className="text-sm font-bold text-slate-900">Mobile-ready</p>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">Interfaz responsiva. Trabajadores acceden desde el teléfono en faena.</p>
            </div>
          </div>
        </Section>

        {/* INVERSIÓN */}
        <Section id="inversion" eyebrow="Inversión"
          title="Precio simple. Cero implementación."
          className="print-page-break">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Setup */}
            <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-b from-emerald-50 to-white p-6 relative">
              <span className="absolute -top-3 left-6 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Sin costo</span>
              <p className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Implementación</p>
              <p className="text-5xl font-black text-slate-900 mt-3 leading-none">$0</p>
              <p className="text-xs text-slate-500 mt-1">Pesos chilenos</p>
              <ul className="mt-4 space-y-2">
                <CheckLine>Configuración inicial y parametrización</CheckLine>
                <CheckLine>Carga de trabajadores</CheckLine>
                <CheckLine>Onboarding y capacitación admin</CheckLine>
                <CheckLine>Puesta en producción</CheckLine>
              </ul>
            </div>

            {/* Mensual — highlighted */}
            <div className="rounded-2xl border-2 border-blue-600 bg-gradient-to-b from-blue-50 to-white p-6 relative shadow-xl md:scale-[1.04]">
              <span className="absolute -top-3 left-6 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Plan recomendado</span>
              <p className="text-xs uppercase tracking-widest text-blue-700 font-semibold">Licencia mensual</p>
              <p className="text-5xl font-black text-slate-900 mt-3 leading-none tabular-nums">$1.150.000</p>
              <p className="text-xs text-slate-500 mt-1">CLP + IVA · mensual · todo incluido</p>
              <ul className="mt-4 space-y-2">
                <CheckLine>Trabajadores <strong>ilimitados</strong></CheckLine>
                <CheckLine>Todos los módulos activos</CheckLine>
                <CheckLine>Certificados autogenerados</CheckLine>
                <CheckLine>Dashboard, matriz, notificaciones</CheckLine>
                <CheckLine>Soporte técnico y actualizaciones</CheckLine>
                <CheckLine>Backup diario + SSL/TLS</CheckLine>
              </ul>
            </div>

            {/* Extras */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Servicios adicionales</p>
              <p className="text-5xl font-black text-slate-900 mt-3 leading-none">Opcional</p>
              <p className="text-xs text-slate-500 mt-1">Bajo cotización específica</p>
              <ul className="mt-4 space-y-2">
                <CheckLine>Módulo de Evaluación de trabajadores</CheckLine>
                <CheckLine>Módulo Hoja de Vida del trabajador</CheckLine>
                <CheckLine>Módulo de Comunicaciones internas</CheckLine>
                <CheckLine>Elaboración de Cursos a medida</CheckLine>
                <CheckLine>Integración con ERP / RRHH</CheckLine>
                <CheckLine>Personalización de reportes</CheckLine>
              </ul>
            </div>
          </div>

          <div className="mt-8 rounded-xl bg-slate-900 text-white p-6 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-bold">Compromiso mínimo</p>
              <p className="text-white/70 text-xs mt-1">12 meses · facturación mensual · sin cargo por inicio</p>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Vigencia de la propuesta</p>
              <p className="text-white/70 text-xs mt-1">30 días corridos desde la emisión</p>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Forma de pago</p>
              <p className="text-white/70 text-xs mt-1">Transferencia electrónica</p>
            </div>
          </div>
        </Section>

        {/* Roadmap de implementación */}
        <Section id="implementacion" eyebrow="Puesta en marcha"
          title="De la firma al primer reporte en 15 días hábiles.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="rounded-xl border-l-4 border-blue-600 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-widest text-blue-700 font-bold">Semana 1</p>
              <p className="text-sm text-slate-900 font-bold mt-1.5">Levantamiento</p>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">Reunión kick-off. Definición de áreas, actividades, cargos y competencias específicas de Ferronor. Recopilación de datos.</p>
            </div>
            <div className="rounded-xl border-l-4 border-blue-600 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-widest text-blue-700 font-bold">Semana 2</p>
              <p className="text-sm text-slate-900 font-bold mt-1.5">Configuración & Carga</p>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">Parametrización de la plataforma. Carga masiva de trabajadores y estándares. Capacitación del equipo administrador.</p>
            </div>
            <div className="rounded-xl border-l-4 border-blue-600 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-widest text-blue-700 font-bold">Semana 3</p>
              <p className="text-sm text-slate-900 font-bold mt-1.5">Marcha blanca</p>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">Puesta en producción con soporte diario. Ajustes finos. Primer dashboard operativo.</p>
            </div>
          </div>
        </Section>

        {/* Cierre / CTA */}
        <Section id="cierre" eyebrow="Siguiente paso"
          title="¿Cuándo empezamos?"
          subtitle="Reserve una llamada de 30 minutos para revisar juntos el detalle y coordinar la implementación en Ferronor.">
          <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white p-8 sm:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Dejemos las planillas dispersas atrás.
                </h3>
                <p className="mt-3 text-blue-100 text-sm leading-relaxed">
                  Aptiva puede estar operativo en Ferronor en 15 días. Sin costo de implementación,
                  con un valor fijo mensual y todos los módulos incluidos. Solo falta que digan &laquo;sí&raquo;.
                </p>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/20 p-6">
                <p className="text-xs uppercase tracking-widest text-blue-200 font-semibold">Propuesta dirigida a</p>
                <ul className="mt-4 space-y-3">
                  <li className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">JL</div>
                    <div>
                      <p className="text-white font-bold text-sm">Javier López</p>
                      <p className="text-blue-200 text-xs">Ferronor</p>
                    </div>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">EC</div>
                    <div>
                      <p className="text-white font-bold text-sm">Eduardo Catrifol</p>
                      <p className="text-blue-200 text-xs">Ferronor</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Section>

      </div>

      {/* Footer */}
      <footer className="bg-slate-950 text-white py-10 mt-20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <AptivaLogo />
          <p className="text-white/60 text-xs text-center">
            Aptiva es un producto de <strong className="text-white">DoSoft</strong> · Spin-Off de Legav ·{' '}
            <a href="https://www.dosoft.cl" className="underline hover:text-white transition">
              <Globe className="w-3 h-3 inline mr-0.5" /> dosoft.cl
            </a>
          </p>
          <p className="text-white/40 text-[10px]">Propuesta confidencial · {today}</p>
        </div>
      </footer>

      {/* Floating export FAB (mobile) */}
      <button
        onClick={handlePrint}
        aria-label="Exportar a PDF"
        className="no-print fixed bottom-6 right-6 md:hidden bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl px-4 py-3 flex items-center gap-2 font-semibold text-sm"
        data-testid="pp-export-pdf-fab"
      >
        <Download className="w-4 h-4" /> PDF
      </button>
    </div>
  );
};

export default PpFerronor;
