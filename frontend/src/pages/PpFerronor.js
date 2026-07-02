/**
 * Propuesta técnica y económica — Ferronor.
 * Ruta pública: /pp-ferronor (sin autenticación).
 * Diseño paginado A4 (210mm × 297mm). Cada bloque `.pdf-page` corresponde a una hoja del PDF.
 * Export PDF: window.print() con `@page size: A4; margin: 0`.
 */
import { Button } from '../components/ui/button';
import {
  Download, Building2, ShieldCheck, Bell, Award, BarChart3, Layers, CheckCircle2,
  Sparkles, Users, GraduationCap, FileCheck, Rocket, Zap, LineChart, Globe,
  AlertTriangle, XCircle, MinusCircle,
} from 'lucide-react';

// ==========================================================================
// Reusable UI atoms
// ==========================================================================

const AptivaLogo = ({ dark = false, size = 'md' }) => {
  const sizeCls = size === 'lg' ? 'h-16 sm:h-20' : size === 'sm' ? 'h-8' : 'h-10';
  return (
    <img
      src="/aptiva-logo.png"
      alt="Aptiva — Competencias"
      className={`${sizeCls} w-auto object-contain ${dark ? '' : 'brightness-0 invert'}`}
    />
  );
};

const CheckLine = ({ children }) => (
  <li className="flex items-start gap-2">
    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-600 shrink-0" />
    <span className="text-[12px] text-slate-700 leading-snug">{children}</span>
  </li>
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
    <div className={`rounded-lg border p-3.5 bg-gradient-to-b to-white ${toneMap[tone]}`}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-white shadow-sm border border-slate-100 flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-[13px] font-bold text-slate-900 leading-tight">{title}</p>
      </div>
      <p className="mt-2 text-[11.5px] text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
};

const StepCard = ({ n, title, desc }) => (
  <div className="relative rounded-lg border border-slate-200 bg-white p-4">
    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm absolute -top-3 -left-3 shadow-md">
      {n}
    </div>
    <h4 className="mt-1 text-slate-900 font-bold text-sm">{title}</h4>
    <p className="mt-1.5 text-[11.5px] text-slate-600 leading-relaxed">{desc}</p>
  </div>
);

const Page = ({ children, className = '', bleed = false, testId }) => (
  <div
    className={`pdf-page relative ${bleed ? 'pdf-page-bleed' : ''} ${className}`}
    data-testid={testId}
  >
    {children}
  </div>
);

const PageHeader = ({ page, total = 8 }) => (
  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
    <AptivaLogo size="sm" dark />
    <div className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-semibold">
      Propuesta Ferronor · {String(page).padStart(2, '0')} / {String(total).padStart(2, '0')}
    </div>
  </div>
);

const PageFooter = () => (
  <div className="absolute bottom-[10mm] left-[12mm] right-[12mm] pt-2 border-t border-slate-200 flex justify-between items-center text-[8.5px] text-slate-400 uppercase tracking-[0.15em]">
    <span>Aptiva · producto de <strong className="text-slate-600">DoSoft</strong> — Spin-Off de Legav</span>
    <span>dosoft.cl</span>
  </div>
);

const PageTitle = ({ eyebrow, title, subtitle }) => (
  <div className="mt-4">
    {eyebrow && <p className="text-[10px] uppercase tracking-[0.2em] text-blue-700 font-semibold mb-1">{eyebrow}</p>}
    <h2 className="text-[22px] font-bold text-slate-900 leading-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>{title}</h2>
    {subtitle && <p className="mt-2 text-[12.5px] text-slate-600 leading-relaxed text-justify">{subtitle}</p>}
  </div>
);

// ==========================================================================
// Mock matrix (visual only, no real data)
// ==========================================================================

const STATUS_META = {
  valid:        { label: 'Vigente',      short: 'OK',    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  warning:      { label: 'Por vencer',   short: '≤30d',  cls: 'bg-amber-100 text-amber-800 border-amber-200',        icon: AlertTriangle },
  expired:      { label: 'Vencida',      short: 'VEN',   cls: 'bg-red-100 text-red-700 border-red-200',              icon: XCircle },
  missing:      { label: 'Falta',        short: 'FALTA', cls: 'bg-rose-100 text-rose-700 border-rose-200',           icon: XCircle },
  not_required: { label: 'No aplica',    short: '—',     cls: 'bg-slate-50 text-slate-400 border-slate-100',         icon: MinusCircle },
};

const MOCK_COMPETENCIES = [
  { id: 'lic', name: 'Licencia Maq.' },
  { id: 'psi', name: 'Psicosens.' },
  { id: 'reg', name: 'Reg. Tráfico' },
  { id: 'def', name: 'Manejo Defensivo' },
  { id: 'ric', name: 'Riesgos Crít.' },
  { id: 'alt', name: 'Trab. Altura' },
  { id: 'mer', name: 'MERCPER' },
];

const MOCK_WORKERS = [
  { rut: '14.234.567-8', name: 'Cristián Riquelme',   role: 'Maquinista Cat. A',        pct: 71,  cells: ['valid','expired','valid','valid','valid','not_required','valid'] },
  { rut: '15.345.678-9', name: 'Rodrigo Bahamondes',  role: 'Maquinista Cat. A',        pct: 64,  cells: ['valid','valid','warning','warning','missing','not_required','not_required'] },
  { rut: '17.456.789-0', name: 'Ana Céspedes',        role: 'Ayudante de Maquinista',   pct: 40,  cells: ['missing','not_required','valid','not_required','missing','not_required','not_required'] },
  { rut: '13.567.890-1', name: 'Jorge Contreras',     role: 'Jefe de Tren',             pct: 85,  cells: ['not_required','not_required','valid','valid','expired','valid','not_required'] },
  { rut: '16.678.901-2', name: 'Patricia Alarcón',    role: 'Despachador CTC',          pct: 92,  cells: ['not_required','valid','valid','not_required','valid','not_required','not_required'] },
  { rut: '14.901.234-5', name: 'Miguel Fuentealba',   role: 'Mecánico de Vía',          pct: 58,  cells: ['not_required','not_required','not_required','not_required','expired','warning','not_required'] },
  { rut: '15.012.345-6', name: 'Ricardo Núñez',       role: 'Soldador Aluminotérmico',  pct: 100, cells: ['not_required','not_required','not_required','not_required','not_required','valid','not_required'] },
  { rut: '13.345.109-0', name: 'Ximena Torres',       role: 'Prevencionista',           pct: 95,  cells: ['not_required','not_required','valid','not_required','valid','valid','valid'] },
];

const MatrixMock = () => (
  <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden">
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-slate-50">
          <th className="text-left px-3 py-2 text-[10.5px] font-bold text-slate-700 border-b border-slate-200 w-[40%]">Trabajador</th>
          {MOCK_COMPETENCIES.map((c) => (
            <th key={c.id} className="text-center px-1 py-2 text-[9.5px] font-bold text-slate-700 border-b border-slate-200">
              {c.name}
            </th>
          ))}
          <th className="text-center px-2 py-2 text-[10px] font-bold text-slate-700 border-b border-slate-200 bg-slate-100">%</th>
        </tr>
      </thead>
      <tbody>
        {MOCK_WORKERS.map((w) => (
          <tr key={w.rut} className="border-b border-slate-100">
            <td className="px-3 py-1.5">
              <p className="text-[11px] font-semibold text-slate-900 leading-tight">{w.name}</p>
              <p className="text-[9px] text-slate-500 font-mono">{w.rut} · {w.role}</p>
            </td>
            {w.cells.map((status, i) => {
              const meta = STATUS_META[status];
              return (
                <td key={i} className="text-center px-1 py-1">
                  <div className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded border text-[9px] font-semibold ${meta.cls}`}>
                    {meta.short}
                  </div>
                </td>
              );
            })}
            <td className={`text-center px-2 py-1.5 font-bold text-[11px] bg-slate-50 ${w.pct >= 80 ? 'text-emerald-600' : w.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {w.pct}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const MatrixLegend = () => (
  <div className="mt-4 flex flex-wrap gap-2">
    {Object.entries(STATUS_META).map(([k, m]) => (
      <div key={k} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] ${m.cls}`}>
        <m.icon className="w-3 h-3" /> {m.label}
      </div>
    ))}
  </div>
);

// ==========================================================================
// Main component
// ==========================================================================

const PpFerronor = () => {
  const handlePrint = () => window.print();
  const today = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="pdf-container" data-testid="pp-ferronor-page">
      <style>{`
        @page { size: A4; margin: 0; }
        .pdf-page {
          width: 210mm;
          height: 297mm;
          padding: 12mm 12mm 18mm 12mm;
          box-sizing: border-box;
          background: white;
          page-break-after: always;
          break-after: page;
          overflow: hidden;
          position: relative;
        }
        .pdf-page.pdf-page-bleed { padding: 0; }
        @media screen {
          .pdf-container { background: linear-gradient(180deg, #E2E8F0, #F1F5F9); padding: 40px 12px 60px; min-height: 100vh; }
          .pdf-page { margin: 0 auto 28px; box-shadow: 0 20px 60px -20px rgba(15,23,42,0.35); border-radius: 4px; }
        }
        @media print {
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .pdf-container { background: white !important; padding: 0 !important; }
          .pdf-page { margin: 0 !important; box-shadow: none !important; border-radius: 0 !important; page-break-after: always; break-after: page; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .pdf-page:last-of-type { page-break-after: auto; break-after: auto; }
        }
      `}</style>

      {/* Sticky action bar (hidden on print) */}
      <div className="no-print sticky top-4 z-40 max-w-[210mm] mx-auto mb-6 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full shadow-lg flex items-center justify-between px-5 py-2">
        <div className="text-xs text-slate-500 tracking-wider uppercase font-semibold">Vista PDF · 8 páginas</div>
        <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full" data-testid="pp-export-pdf-btn">
          <Download className="w-4 h-4 mr-2" /> Exportar a PDF
        </Button>
      </div>

      {/* =========================================================
          PAGE 1 — COVER (full bleed dark)
          ========================================================= */}
      <Page bleed testId="page-cover">
        <div className="w-full h-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white relative overflow-hidden px-[14mm] py-[14mm]">
          {/* Vector blobs (SVG — vectorial, no raster) */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 210 297" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <radialGradient id="ppBlobBlue" cx="15%" cy="15%" r="45%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="ppBlobEmerald" cx="85%" cy="85%" r="50%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="210" height="297" fill="url(#ppBlobBlue)" />
            <rect width="210" height="297" fill="url(#ppBlobEmerald)" />
          </svg>
          <div className="relative flex flex-col h-full">
            {/* Top */}
            <div className="flex items-center justify-between">
              <AptivaLogo size="lg" />
              <p className="text-white/60 text-[10px] uppercase tracking-[0.3em]">Confidencial</p>
            </div>

            {/* Middle */}
            <div className="flex-1 flex flex-col justify-center py-6">
              <p className="text-blue-300 text-xs uppercase tracking-[0.3em] font-semibold">Propuesta técnica y económica</p>
              <h1 className="mt-4 text-[60px] font-black leading-[1.02]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Aptiva para<br /><span className="text-blue-300">Ferronor</span>
              </h1>
              <p className="mt-5 text-slate-300 text-base max-w-[140mm] leading-relaxed">
                Plataforma digital para gestionar competencias, capacitaciones y evidencia
                documental de sus trabajadores — lista para auditorías, sin planillas dispersas
                y sin sorpresas de vencimiento.
              </p>
              <p className="mt-5 inline-flex items-center gap-2 text-xs text-white/80 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 self-start">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                Un producto de <strong className="text-white ml-0.5">DoSoft</strong>
                <span className="text-white/50">·</span>
                <span className="text-white/70">Spin-Off de Legav</span>
              </p>
            </div>

            {/* Bottom info cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { k: 'Dirigido a', v: 'Javier López · Eduardo Catrifol', sub: 'Ferronor' },
                { k: 'Fecha', v: today, sub: 'Vigencia 30 días' },
                { k: 'Preparado por', v: 'DoSoft SpA', sub: 'Spin-Off de Legav' },
              ].map((c) => (
                <div key={c.k} className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <p className="text-white/50 text-[9px] uppercase tracking-[0.2em] font-semibold">{c.k}</p>
                  <p className="text-white font-bold text-[13px] mt-1.5 leading-tight">{c.v}</p>
                  <p className="text-white/60 text-[10px] mt-0.5">{c.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Page>

      {/* =========================================================
          PAGE 2 — RESUMEN + PROBLEMA
          ========================================================= */}
      <Page testId="page-resumen">
        <PageHeader page={2} />
        <PageTitle eyebrow="Resumen ejecutivo"
          title="Cero papel. Cero planillas dispersas. Cero sorpresas en auditoría."
          subtitle="Aptiva centraliza todo el ciclo de vida de la evidencia laboral: cursos, certificados, exámenes médicos, licencias y capacitaciones — con alertas antes de que un vencimiento se convierta en una detención de faena." />

        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="rounded-xl border border-slate-200 p-4 bg-gradient-to-b from-blue-50 to-white">
            <p className="text-3xl font-black text-blue-700 leading-none">95%</p>
            <p className="mt-1.5 text-[12px] text-slate-700 font-semibold">Menos tiempo administrativo</p>
            <p className="text-[10px] text-slate-500 mt-0.5">vs. gestión manual dispersa.</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 bg-gradient-to-b from-emerald-50 to-white">
            <p className="text-3xl font-black text-emerald-700 leading-none">100%</p>
            <p className="mt-1.5 text-[12px] text-slate-700 font-semibold">Trazabilidad para auditorías</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Fecha, autor y vigencia.</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 bg-gradient-to-b from-amber-50 to-white">
            <p className="text-3xl font-black text-amber-700 leading-none">0</p>
            <p className="mt-1.5 text-[12px] text-slate-700 font-semibold">Vencimientos sin aviso</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Alertas a 90 · 30 · 0 días.</p>
          </div>
        </div>

        <PageTitle eyebrow="El problema"
          title="Hoy gestionar la evidencia documental cuesta más de lo que se ve."
          subtitle="En operaciones ferroviarias la evidencia legal de los trabajadores está dispersa: documentos en un archivador, certificados en el mail del prevencionista, licencias en el celular del maquinista. El resultado: alertas que llegan tarde, auditorías que se resuelven a última hora y trabajadores que realizan sus labores sin la habilitación vigente." />

        <div className="grid grid-cols-2 gap-2.5 mt-4">
          {[
            { t: 'Vencimientos silenciosos', d: 'Licencias, cursos y exámenes médicos que caducan sin previo aviso y detienen operaciones.' },
            { t: 'Auditorías reactivas', d: 'Cuando llega el auditor, se corre a juntar carpetas y correos. Riesgo de multa o cierre.' },
            { t: 'Duplicación y errores', d: 'Un mismo curso registrado varias veces con distintas fechas. Nadie sabe cuál es la vigente.' },
            { t: 'Sin visibilidad ejecutiva', d: 'La gerencia no tiene un tablero real. Se decide sobre percepción, no sobre datos.' },
          ].map((p) => (
            <div key={p.t} className="rounded-lg border border-red-100 bg-red-50/60 p-3">
              <p className="text-red-800 font-bold text-[12px]">{p.t}</p>
              <p className="text-red-700/80 text-[11px] mt-1 leading-relaxed">{p.d}</p>
            </div>
          ))}
        </div>
        <PageFooter />
      </Page>

      {/* =========================================================
          PAGE 3 — SOLUCIÓN + CÓMO FUNCIONA
          ========================================================= */}
      <Page testId="page-solucion">
        <PageHeader page={3} />
        <PageTitle eyebrow="La solución"
          title="Aptiva: la evidencia digital operativa de sus trabajadores."
          subtitle="Cada trabajador tiene su expediente digital. Cada admin ve el cumplimiento en tiempo real. Cada auditor recibe evidencia trazable en 1 click." />

        <div className="grid grid-cols-3 gap-2.5 mt-4">
          <FeatureCard icon={Users} tone="blue" title="Perfil del trabajador"
            desc="Cada trabajador ingresa a su perfil, completa capacitaciones según su cargo y sube su evidencia. Ve qué le falta y qué está por vencer." />
          <FeatureCard icon={Bell} tone="amber" title="Alertas de vencimiento"
            desc="Notificaciones automáticas por email y en el sistema a 90, 30 y 0 días. Nadie sube a faena con licencia vencida." />
          <FeatureCard icon={BarChart3} tone="violet" title="Matriz de cumplimiento"
            desc="Vista cruzada Trabajadores × Competencias con estado por celda. Exportable a Excel." />
          <FeatureCard icon={Award} tone="emerald" title="Certificados autogenerados"
            desc="Al aprobar un curso, Aptiva emite un certificado con código de verificación público. Descargable en PDF." />
          <FeatureCard icon={LineChart} tone="rose" title="Dashboard en tiempo real"
            desc="Gerencia y HSE ven cumplimiento global, distribución por cargo, top y bottom trabajadores y radar por competencia." />
          <FeatureCard icon={Layers} tone="slate" title="Estructura organizacional propia"
            desc="Ferronor define sus áreas, gerencias, cargos y actividades. Cada trabajador queda en su contexto operativo." />
        </div>

        <PageTitle eyebrow="Cómo funciona"
          title="En 4 pasos, todo su capital humano queda digitalizado."
          subtitle="Implementación en 2–3 semanas, sin cambios en su ERP." />

        <div className="grid grid-cols-4 gap-4 mt-6 px-3">
          <StepCard n="1" title="Onboarding"
            desc="Cargamos áreas, actividades, cargos, competencias y trabajadores directamente desde archivos Excel." />
          <StepCard n="2" title="Activación"
            desc="Cada trabajador recibe su usuario y contraseña inicial. Ingresa a su perfil desde cualquier dispositivo." />
          <StepCard n="3" title="Operación diaria"
            desc="Se carga la evidencia. El Admin gestiona cursos y expedientes. Sistema calcula el cumplimiento automáticamente." />
          <StepCard n="4" title="Auditoría & KPIs"
            desc="Dashboard ejecutivo, reportes exportables, matriz de cumplimiento y alertas. Todo con fecha y autor." />
        </div>
        <PageFooter />
      </Page>

      {/* =========================================================
          PAGE 4 — MATRIZ DE VENCIMIENTOS (hero visual)
          ========================================================= */}
      <Page testId="page-matriz">
        <PageHeader page={4} />
        <PageTitle eyebrow="Visual · Matriz de cumplimiento"
          title="Un solo vistazo. Todos sus trabajadores, todas sus competencias."
          subtitle="Ejemplo real del reporte que Ferronor tendrá disponible desde el día 1. Cada celda muestra el estado (Vigente / Por vencer / Vencida / Falta / No aplica). La columna final indica el % de cumplimiento del trabajador, calculado sobre las competencias que le corresponden por cargo y actividad." />

        <MatrixMock />
        <MatrixLegend />

        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
            <p className="text-emerald-800 font-bold text-[13px]">Verde = Vigente</p>
            <p className="text-emerald-700/80 text-[11px] mt-1 leading-relaxed">La habilitación está al día. Sin acción requerida.</p>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-amber-800 font-bold text-[13px]">Ámbar = Por vencer</p>
            <p className="text-amber-700/80 text-[11px] mt-1 leading-relaxed">Vence en 30 días o menos. Se dispara alerta automática.</p>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-red-800 font-bold text-[13px]">Rojo = Vencida / Falta</p>
            <p className="text-red-700/80 text-[11px] mt-1 leading-relaxed">Requiere acción inmediata. El trabajador no debe operar sin ella.</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-slate-900 text-white p-4 flex items-center gap-4">
          <BarChart3 className="w-8 h-8 text-blue-300 shrink-0" />
          <div>
            <p className="text-[13px] font-bold">Exportable en 1 click a Excel y PDF</p>
            <p className="text-white/70 text-[11px] leading-relaxed mt-0.5">La misma matriz puede filtrarse por Gerencia, Área, Cargo o Actividad para focalizar planes de capacitación.</p>
          </div>
        </div>
        <PageFooter />
      </Page>

      {/* =========================================================
          PAGE 5 — FUNCIONALIDADES PRINCIPALES
          ========================================================= */}
      <Page testId="page-funcionalidades">
        <PageHeader page={5} />
        <PageTitle eyebrow="Funcionalidades principales"
          title="Todo lo que necesita para dejar las planillas dispersas en la historia." />

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-5">
          {[
            { icon: Users, title: 'Gestión de personas', items: [
              'Trabajadores con RUT, cargo, áreas y actividades asignadas.',
              'Mantenedor de cargos (Maquinista, Rigger, Prevencionista, etc.).',
              'Carga masiva por Excel con validación previa.',
              'Reseteo de contraseñas a un click.',
            ]},
            { icon: GraduationCap, title: 'Capacitaciones y competencias', items: [
              'Catálogo de cursos con evaluaciones online.',
              'Competencias otorgadas automáticamente al aprobar curso.',
              'Vigencia configurable (12, 24, 36 meses).',
              'Registro manual con archivo de respaldo cuando el curso es externo.',
            ]},
            { icon: FileCheck, title: 'Expediente digital', items: [
              'Contratos, cédulas, licencias, exámenes médicos.',
              'Tipos de documento configurables por área/actividad.',
              'Historial completo con fecha, autor y vigencia.',
              'Descarga directa desde el perfil del trabajador.',
            ]},
            { icon: ShieldCheck, title: 'Cumplimiento y estándares', items: [
              'Estándar de acreditación configurable a la medida de Ferronor.',
              'Scope granular: por área, cargo o actividad.',
              'Match automático documento ↔ ítem del estándar.',
              'Certificados autogenerados con código de verificación.',
            ]},
            { icon: Bell, title: 'Alertas y notificaciones', items: [
              'Notificaciones a 90, 30 y 0 días del vencimiento.',
              'Panel centralizado de alertas con severidad.',
              'Email y notificación in-app.',
              'Export a Excel para reuniones semanales.',
            ]},
            { icon: BarChart3, title: 'Reportería', items: [
              'Dashboard ejecutivo con 6+ gráficos en tiempo real.',
              'Matriz Trabajadores × Competencias.',
              'Heatmap Actividades × Competencias.',
              'Exportación a Excel y PDF de todos los reportes.',
            ]},
          ].map((g) => (
            <div key={g.title}>
              <h4 className="text-[13px] font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <g.icon className="w-4 h-4 text-blue-600" /> {g.title}
              </h4>
              <ul className="space-y-1.5">
                {g.items.map((it) => <CheckLine key={it}>{it}</CheckLine>)}
              </ul>
            </div>
          ))}
        </div>
        <PageFooter />
      </Page>

      {/* =========================================================
          PAGE 6 — BENEFICIOS + ARQUITECTURA
          ========================================================= */}
      <Page testId="page-beneficios">
        <PageHeader page={6} />
        <PageTitle eyebrow="Beneficios directos para Ferronor"
          title="Por qué esto justifica su inversión en el mes 1." />

        <div className="grid grid-cols-2 gap-2.5 mt-4">
          {[
            { i: Zap, t: 'Cero paralización por vencimientos', d: 'La operación no se detiene porque un maquinista tenía la licencia vencida.' },
            { i: Sparkles, t: 'Auditorías más rápidas', d: 'Auditor pide evidencia → un click, un PDF. Sin correos, sin carpetas físicas.' },
            { i: Rocket, t: 'Escalable con Ferronor', d: 'Hoy 50 trabajadores, mañana 500 sin cambio de plataforma ni de precio.' },
            { i: Building2, t: 'Datos por Gerencia y Área', d: 'Filtra el cumplimiento por Gerencia, Área o Cargo para focalizar planes de acción.' },
            { i: ShieldCheck, t: 'Reduce riesgo laboral y legal', d: 'Trazabilidad completa: fecha, autor, adjunto, vigencia. Prueba en tribunales.' },
            { i: LineChart, t: 'Gerencia con datos, no anécdotas', d: 'Tablero de KPIs actualizado 24/7 desde cualquier dispositivo.' },
          ].map((b) => (
            <div key={b.t} className="flex gap-2.5 rounded-lg border border-slate-200 p-3 bg-white">
              <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0">
                <b.i className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-slate-900">{b.t}</p>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{b.d}</p>
              </div>
            </div>
          ))}
        </div>

        <PageTitle eyebrow="Arquitectura"
          title="Diseñado para crecer con Ferronor." />

        <div className="grid grid-cols-3 gap-2.5 mt-4">
          {[
            { t: 'Entorno dedicado', d: 'Espacio propio, datos privados y estándar configurado a la medida.' },
            { t: 'Cloud escalable', d: 'Soporta 10 o 10.000 trabajadores sin cambio de plataforma.' },
            { t: 'API abierta', d: 'Integración futura con ERP, RRHH y control de acceso a faena.' },
            { t: 'Seguridad', d: 'Contraseñas hashadas, JWT, SSL/TLS, control por rol.' },
            { t: 'Backup diario', d: 'Respaldo automático en la nube. Recuperación punto-en-tiempo.' },
            { t: 'Mobile-ready', d: 'Interfaz responsiva. Trabajadores acceden desde el teléfono en faena.' },
          ].map((c) => (
            <div key={c.t} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <p className="text-[12px] font-bold text-slate-900">{c.t}</p>
              <p className="text-[10.5px] text-slate-600 mt-1 leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
        <PageFooter />
      </Page>

      {/* =========================================================
          PAGE 7 — INVERSIÓN
          ========================================================= */}
      <Page testId="page-inversion">
        <PageHeader page={7} />
        <PageTitle eyebrow="Inversión"
          title="Precio simple. Cero implementación."
          subtitle="Un valor mensual fijo con todos los módulos incluidos. Sin cargos ocultos, sin costos por implementación." />

        <div className="grid grid-cols-3 gap-2.5 mt-6">
          {/* Setup */}
          <div className="rounded-xl border-2 border-emerald-300 bg-gradient-to-b from-emerald-50 to-white p-3.5 relative">
            <span className="absolute -top-2 left-3 bg-emerald-600 text-white text-[8.5px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Sin costo</span>
            <p className="text-[9.5px] uppercase tracking-widest text-emerald-700 font-semibold mt-1">Implementación</p>
            <p className="text-[26px] font-black text-slate-900 mt-1.5 leading-none">$0</p>
            <p className="text-[9.5px] text-slate-500 mt-0.5">Pesos chilenos</p>
            <ul className="mt-3 space-y-1">
              <CheckLine>Configuración inicial y parametrización</CheckLine>
              <CheckLine>Carga de trabajadores</CheckLine>
              <CheckLine>Onboarding y capacitación admin</CheckLine>
              <CheckLine>Puesta en producción</CheckLine>
            </ul>
          </div>

          {/* Mensual — highlighted */}
          <div className="rounded-xl border-2 border-blue-600 bg-gradient-to-b from-blue-50 to-white p-3.5 relative shadow-lg">
            <span className="absolute -top-2 left-3 bg-blue-600 text-white text-[8.5px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Plan</span>
            <p className="text-[9.5px] uppercase tracking-widest text-blue-700 font-semibold mt-1">Licencia mensual</p>
            <p className="text-[24px] font-black text-slate-900 mt-1.5 leading-none tabular-nums whitespace-nowrap">$1.150.000</p>
            <p className="text-[9.5px] text-slate-500 mt-0.5">CLP + IVA · mensual · todo incluido</p>
            <ul className="mt-3 space-y-1">
              <CheckLine>Trabajadores <strong>ilimitados</strong></CheckLine>
              <CheckLine>Todos los módulos activos</CheckLine>
              <CheckLine>Certificados autogenerados</CheckLine>
              <CheckLine>Dashboard, matriz, notificaciones</CheckLine>
              <CheckLine>Soporte técnico y actualizaciones</CheckLine>
              <CheckLine>Backup diario + SSL/TLS</CheckLine>
            </ul>
          </div>

          {/* Extras */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <p className="text-[9.5px] uppercase tracking-widest text-slate-500 font-semibold mt-1">Servicios adicionales</p>
            <p className="text-[26px] font-black text-slate-900 mt-1.5 leading-none">Opcional</p>
            <p className="text-[9.5px] text-slate-500 mt-0.5">Bajo cotización específica</p>
            <ul className="mt-3 space-y-1">
              <CheckLine>Módulo de Evaluación de trabajadores</CheckLine>
              <CheckLine>Módulo Hoja de Vida del trabajador</CheckLine>
              <CheckLine>Módulo de Comunicaciones internas</CheckLine>
              <CheckLine>Elaboración de Cursos a medida</CheckLine>
              <CheckLine>Integración con ERP / RRHH</CheckLine>
              <CheckLine>Personalización de reportes</CheckLine>
            </ul>
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-slate-900 text-white p-4 grid grid-cols-3 gap-4">
          <div>
            <p className="text-[11px] font-bold">Compromiso mínimo</p>
            <p className="text-white/70 text-[10px] mt-0.5">12 meses · facturación mensual · sin cargo por inicio</p>
          </div>
          <div>
            <p className="text-[11px] font-bold">Vigencia de la propuesta</p>
            <p className="text-white/70 text-[10px] mt-0.5">30 días corridos desde la emisión</p>
          </div>
          <div>
            <p className="text-[11px] font-bold">Forma de pago</p>
            <p className="text-white/70 text-[10px] mt-0.5">Transferencia electrónica</p>
          </div>
        </div>
        <PageFooter />
      </Page>

      {/* =========================================================
          PAGE 8 — ROADMAP + CIERRE
          ========================================================= */}
      <Page testId="page-cierre">
        <PageHeader page={8} />
        <PageTitle eyebrow="Puesta en marcha"
          title="De la firma al primer reporte en 15 días hábiles." />

        <div className="grid grid-cols-3 gap-4 mt-5">
          <div className="rounded-lg border-l-4 border-blue-600 bg-slate-50 p-4">
            <p className="text-[10px] uppercase tracking-widest text-blue-700 font-bold">Semana 1</p>
            <p className="text-[13px] text-slate-900 font-bold mt-1">Levantamiento</p>
            <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">Reunión kick-off. Definición de áreas, actividades, cargos y competencias específicas de Ferronor. Recopilación de datos.</p>
          </div>
          <div className="rounded-lg border-l-4 border-blue-600 bg-slate-50 p-4">
            <p className="text-[10px] uppercase tracking-widest text-blue-700 font-bold">Semana 2</p>
            <p className="text-[13px] text-slate-900 font-bold mt-1">Configuración & Carga</p>
            <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">Parametrización de la plataforma. Carga masiva de trabajadores y estándares. Capacitación del equipo administrador.</p>
          </div>
          <div className="rounded-lg border-l-4 border-blue-600 bg-slate-50 p-4">
            <p className="text-[10px] uppercase tracking-widest text-blue-700 font-bold">Semana 3</p>
            <p className="text-[13px] text-slate-900 font-bold mt-1">Marcha blanca</p>
            <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">Puesta en producción con soporte diario. Ajustes finos. Primer dashboard operativo.</p>
          </div>
        </div>

        <PageTitle eyebrow="Siguiente paso"
          title="¿Cuándo empezamos?"
          subtitle="Quedamos atentos para revisar juntos el detalle de la propuesta y si procede, coordinar la implementación en Ferronor." />

        <div className="mt-5 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6">
          <div className="grid grid-cols-2 gap-6 items-center">
            <div>
              <h3 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Dejemos las planillas dispersas atrás.
              </h3>
              <p className="mt-2 text-blue-100 text-[12px] leading-relaxed">
                Aptiva puede estar operativo en Ferronor en 15 días. Sin costo de implementación,
                con un valor fijo mensual y todos los módulos incluidos.
              </p>
            </div>
            <div className="rounded-lg bg-white/10 border border-white/20 p-4">
              <p className="text-[10px] uppercase tracking-widest text-blue-200 font-semibold">Propuesta dirigida a</p>
              <ul className="mt-3 space-y-2.5">
                <li className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-[11px]">JL</div>
                  <div>
                    <p className="text-white font-bold text-[12px]">Javier López</p>
                    <p className="text-blue-200 text-[10px]">Ferronor</p>
                  </div>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-[11px]">EC</div>
                  <div>
                    <p className="text-white font-bold text-[12px]">Eduardo Catrifol</p>
                    <p className="text-blue-200 text-[10px]">Ferronor</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom brand footer */}
        <div className="absolute bottom-[12mm] left-[12mm] right-[12mm] pt-4 border-t border-slate-200 flex items-center justify-between">
          <AptivaLogo size="sm" dark />
          <p className="text-[9px] text-slate-500 text-center flex-1 mx-4">
            Aptiva es un producto de <strong className="text-slate-700">DoSoft</strong> · Spin-Off de Legav ·{' '}
            <span className="text-slate-600 inline-flex items-center gap-1"><Globe className="w-2.5 h-2.5" /> dosoft.cl</span>
          </p>
          <p className="text-[8px] text-slate-400">Confidencial · {today}</p>
        </div>
      </Page>

    </div>
  );
};

export default PpFerronor;
