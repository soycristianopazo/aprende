import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import {
  Users, BookOpen, Award, TrendingUp, TrendingDown, ShieldCheck, AlertTriangle,
  CalendarClock, Loader2, XCircle, CheckCircle2, ArrowUpRight, GraduationCap, Building2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie, Legend,
  AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STATUS_COLORS = {
  valid: '#10B981',      // emerald
  warning: '#F59E0B',    // amber
  expired: '#EF4444',    // red
  missing: '#E11D48',    // rose
  not_required: '#CBD5E1', // slate
};

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [matrix, setMatrix] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [heatmap, setHeatmap] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [s, m, c, h] = await Promise.all([
        fetch(`${API}/reports/summary`, { headers }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API}/reports/worker-competency-matrix`, { headers }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API}/certificates`, { headers }).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API}/compliance/heatmap`, { headers }).then((r) => (r.ok ? r.json() : null)),
      ]);
      setSummary(s);
      setMatrix(m);
      setCertificates(c || []);
      setHeatmap(h);
    } catch (err) {
      toast.error('Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Derived data from the matrix (single source of truth for compliance)
  const donutData = useMemo(() => {
    if (!matrix) return [];
    const s = matrix.summary;
    // Always show all four categories in the legend for consistent color coding across tenants.
    return [
      { name: 'Vigentes',   value: s.valid,   key: 'valid' },
      { name: 'Por vencer', value: s.warning, key: 'warning' },
      { name: 'Vencidas',   value: s.expired, key: 'expired' },
      { name: 'Faltantes',  value: s.missing, key: 'missing' },
    ];
  }, [matrix]);

  const complianceByRole = useMemo(() => {
    if (!matrix) return [];
    const buckets = {};
    for (const w of matrix.workers) {
      const key = w.role_name || 'Sin cargo';
      if (!buckets[key]) buckets[key] = { role: key, sum: 0, n: 0 };
      if (w.compliance_pct !== null && w.compliance_pct !== undefined) {
        buckets[key].sum += w.compliance_pct;
        buckets[key].n += 1;
      }
    }
    return Object.values(buckets)
      .map((b) => ({ role: b.role, pct: b.n ? Math.round(b.sum / b.n) : 0, workers: b.n }))
      .sort((a, b) => a.pct - b.pct);
  }, [matrix]);

  const topWorkers = useMemo(() => {
    if (!matrix) return { top: [], bottom: [] };
    const sorted = [...matrix.workers].filter((w) => w.compliance_pct !== null && w.compliance_pct !== undefined)
      .sort((a, b) => b.compliance_pct - a.compliance_pct);
    return {
      top: sorted.slice(0, 5).map((w) => ({ name: (w.full_name || '').split(' ').slice(0, 2).join(' '), pct: w.compliance_pct })),
      bottom: sorted.slice(-5).reverse().map((w) => ({ name: (w.full_name || '').split(' ').slice(0, 2).join(' '), pct: w.compliance_pct })),
    };
  }, [matrix]);

  const expirationsByMonth = useMemo(() => {
    if (!matrix) return [];
    const now = new Date();
    const buckets = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });
      buckets[key] = { month: key, count: 0 };
    }
    for (const cell of matrix.cells) {
      if (!cell.expiry_date || (cell.status !== 'valid' && cell.status !== 'warning')) continue;
      const d = new Date(cell.expiry_date);
      const monthsAhead = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
      if (monthsAhead < 0 || monthsAhead > 5) continue;
      const key = d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });
      if (buckets[key]) buckets[key].count += 1;
    }
    return Object.values(buckets);
  }, [matrix]);

  const complianceRadar = useMemo(() => {
    if (!matrix) return [];
    // Percentage of workers whose compliance is >= threshold, per competency
    const cellsByComp = {};
    for (const c of matrix.cells) {
      if (!cellsByComp[c.competency_id]) cellsByComp[c.competency_id] = { total: 0, ok: 0 };
      if (c.status === 'valid' || c.status === 'warning') cellsByComp[c.competency_id].ok += 1;
      if (c.status !== 'not_required') cellsByComp[c.competency_id].total += 1;
    }
    return matrix.competencies.map((c) => {
      const b = cellsByComp[c.competency_id] || { total: 0, ok: 0 };
      const short = (c.name || '').split(' ').slice(0, 3).join(' ');
      return { competency: short.length > 22 ? short.slice(0, 22) + '…' : short, pct: b.total ? Math.round((b.ok / b.total) * 100) : 0 };
    }).slice(0, 7);
  }, [matrix]);

  const expiringSoon = useMemo(() => {
    if (!matrix) return [];
    const now = new Date();
    const soon = new Date(now.getTime() + 60 * 24 * 3600 * 1000);
    const workersById = Object.fromEntries(matrix.workers.map((w) => [w.user_id, w]));
    const compById = Object.fromEntries(matrix.competencies.map((c) => [c.competency_id, c]));
    return matrix.cells
      .filter((c) => c.expiry_date && (c.status === 'valid' || c.status === 'warning' || c.status === 'expired'))
      .map((c) => ({ ...c, expiryDt: new Date(c.expiry_date) }))
      .filter((c) => c.expiryDt <= soon)
      .sort((a, b) => a.expiryDt - b.expiryDt)
      .slice(0, 8)
      .map((c) => ({
        worker: workersById[c.user_id]?.full_name || '?',
        rut: workersById[c.user_id]?.rut || '',
        competency: compById[c.competency_id]?.name || '',
        expiry: c.expiryDt,
        status: c.status,
      }));
  }, [matrix]);

  const atRiskWorkers = useMemo(() => {
    if (!matrix) return [];
    return matrix.workers
      .filter((w) => w.compliance_pct !== null && w.compliance_pct < 60)
      .sort((a, b) => a.compliance_pct - b.compliance_pct)
      .slice(0, 6);
  }, [matrix]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  const s = summary || {};
  const m = matrix?.summary || { average_compliance: 0, valid: 0, warning: 0, expired: 0, missing: 0, total_workers: 0 };
  const validCerts = certificates.filter((c) => c.is_valid !== false).length;

  return (
    <div className="space-y-8" data-testid="admin-dashboard">
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Dashboard</h1>
        <p className="text-slate-600 mt-1">
          Vista global de cumplimiento, competencias y capacitaciones de tu empresa en Aptiva.
        </p>
      </div>

      {/* Hero KPI band */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpi
          testId="kpi-compliance"
          label="Cumplimiento global"
          value={`${m.average_compliance}%`}
          tone={m.average_compliance >= 80 ? 'emerald' : m.average_compliance >= 50 ? 'amber' : 'red'}
          icon={ShieldCheck}
          hint={`${m.valid + m.warning} de ${m.valid + m.warning + m.expired + m.missing} requeridas`}
        />
        <HeroKpi testId="kpi-workers" label="Trabajadores" value={m.total_workers} icon={Users} tone="blue"
          hint={`${s.active_users || 0} activos`} />
        <HeroKpi testId="kpi-valid-certs" label="Acreditaciones vigentes" value={validCerts || m.valid} icon={Award} tone="violet"
          hint={validCerts ? `${certificates.length} certificados emitidos` : `${m.valid} competencias válidas`} />
        <HeroKpi testId="kpi-warnings" label="Alertas activas" value={m.expired + m.warning + m.missing} icon={AlertTriangle} tone="rose"
          hint={`${m.expired} vencidas · ${m.missing} faltantes`} />
      </div>

      {/* Row 1: Donut + Compliance by role */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-slate-200 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="w-4 h-4 text-blue-600" /> Estado de competencias</CardTitle>
            <CardDescription>Distribución de todas las celdas requeridas del set trabajador × competencia.</CardDescription>
          </CardHeader>
          <CardContent>
            {donutData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={donutData} innerRadius={55} outerRadius={90} paddingAngle={3}
                    dataKey="value" nameKey="name" labelLine={false}
                    label={({ value, percent }) => (value > 0 ? `${value}` : '')}
                  >
                    {donutData.map((d) => (
                      <Cell key={d.key} fill={STATUS_COLORS[d.key]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }} formatter={(v) => [v, 'Celdas']} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart text="Sin datos de matriz" />}
          </CardContent>
        </Card>

        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="w-4 h-4 text-blue-600" /> Cumplimiento por cargo</CardTitle>
            <CardDescription>% promedio de cumplimiento agrupado por Cargo (menor a mayor).</CardDescription>
          </CardHeader>
          <CardContent>
            {complianceByRole.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={complianceByRole} layout="vertical" margin={{ left: 10, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="#64748B" fontSize={11} />
                  <YAxis type="category" dataKey="role" stroke="#334155" fontSize={11} width={150} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }}
                    formatter={(v, _n, p) => [`${v}% (${p.payload.workers} trabajadores)`, 'Cumplimiento']}
                  />
                  <Bar dataKey="pct" radius={[0, 6, 6, 0]}>
                    {complianceByRole.map((r, i) => (
                      <Cell key={i} fill={r.pct >= 80 ? '#10B981' : r.pct >= 50 ? '#F59E0B' : '#EF4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart text="Sin cargos asignados" />}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Expirations trend + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="w-4 h-4 text-blue-600" /> Vencimientos próximos 6 meses</CardTitle>
            <CardDescription>Cantidad de competencias que expiran cada mes (planifica capacitaciones).</CardDescription>
          </CardHeader>
          <CardContent>
            {expirationsByMonth.some((e) => e.count > 0) ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={expirationsByMonth}>
                  <defs>
                    <linearGradient id="grad-exp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }} formatter={(v) => [v, 'Vencimientos']} />
                  <Area type="monotone" dataKey="count" stroke="#F59E0B" strokeWidth={2} fill="url(#grad-exp)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart text="No hay vencimientos en los próximos 6 meses" />}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><GraduationCap className="w-4 h-4 text-blue-600" /> Cobertura por competencia</CardTitle>
            <CardDescription>% de trabajadores que la requieren y la tienen vigente (top 7).</CardDescription>
          </CardHeader>
          <CardContent>
            {complianceRadar.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={complianceRadar}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="competency" tick={{ fill: '#334155', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 10 }} />
                  <Radar name="Cobertura %" dataKey="pct" stroke="#2563EB" fill="#2563EB" fillOpacity={0.35} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }} formatter={(v) => [`${v}%`, 'Cobertura']} />
                </RadarChart>
              </ResponsiveContainer>
            ) : <EmptyChart text="Sin competencias" />}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Top + Bottom workers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopBottomCard title="Mejor cumplimiento" icon={CheckCircle2} tone="emerald" data={topWorkers.top} arrow="up" />
        <TopBottomCard title="Requieren atención" icon={TrendingDown} tone="red" data={topWorkers.bottom} arrow="down" />
      </div>

      {/* Row 4: Alerts panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="w-4 h-4 text-amber-600" /> Vencimientos en 60 días</CardTitle>
            <CardDescription>Certificaciones que expiran pronto o ya vencieron.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {expiringSoon.length ? (
              <ul className="divide-y divide-slate-100" data-testid="expiring-soon-list">
                {expiringSoon.map((e, i) => (
                  <li key={i} className="px-6 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{e.worker}</p>
                      <p className="text-xs text-slate-500 truncate">{e.competency}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-500 font-mono">{e.rut}</p>
                      <Badge variant="outline" className={
                        e.status === 'expired'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : e.status === 'warning'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                      }>
                        {e.status === 'expired' ? 'Vencida' : e.expiry.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-sm text-center text-slate-400">Sin vencimientos próximos.</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="w-4 h-4 text-red-600" /> Trabajadores en riesgo</CardTitle>
            <CardDescription>Cumplimiento menor a 60% — prioridad de capacitación.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {atRiskWorkers.length ? (
              <ul className="divide-y divide-slate-100" data-testid="at-risk-list">
                {atRiskWorkers.map((w) => (
                  <li key={w.user_id} className="px-6 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{w.full_name}</p>
                      <p className="text-xs text-slate-500">{w.role_name || 'Sin cargo'} · {w.rut}</p>
                    </div>
                    <div className="w-24 text-right shrink-0">
                      <div className="text-sm font-bold text-red-600">{w.compliance_pct}%</div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-red-500" style={{ width: `${w.compliance_pct}%` }} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-sm text-center text-slate-400">Todos los trabajadores sobre el 60%.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary strip */}
      <Card className="border-slate-200">
        <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatMini icon={BookOpen}   label="Cursos publicados"    value={s.published_courses || 0} />
          <StatMini icon={CheckCircle2} label="Cursos completados" value={s.total_completions || 0} />
          <StatMini icon={Award}      label="Total certificados"    value={s.total_certificates || 0} />
          <StatMini icon={Building2}  label="Actividades activas"   value={heatmap?.activities?.length || 0} />
        </CardContent>
      </Card>
    </div>
  );
};

// ---------- helpers ----------

const HeroKpi = ({ testId, label, value, hint, icon: Icon, tone }) => {
  const toneMap = {
    emerald: 'from-emerald-50 to-white text-emerald-700 border-emerald-100',
    amber:   'from-amber-50 to-white text-amber-700 border-amber-100',
    red:     'from-red-50 to-white text-red-700 border-red-100',
    blue:    'from-blue-50 to-white text-blue-700 border-blue-100',
    violet:  'from-violet-50 to-white text-violet-700 border-violet-100',
    rose:    'from-rose-50 to-white text-rose-700 border-rose-100',
  };
  return (
    <div className={`rounded-2xl border p-5 bg-gradient-to-b ${toneMap[tone]}`} data-testid={testId}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider font-semibold opacity-80">{label}</div>
        <Icon className="w-4 h-4 opacity-70" />
      </div>
      <div className="text-4xl font-bold text-slate-900 mt-3 leading-none tabular-nums">{value}</div>
      {hint && <div className="text-[11px] mt-2 opacity-75">{hint}</div>}
    </div>
  );
};

const StatMini = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center">
      <Icon className="w-4 h-4 text-slate-500" />
    </div>
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-bold text-slate-900 tabular-nums">{value}</p>
    </div>
  </div>
);

const TopBottomCard = ({ title, icon: Icon, tone, data, arrow }) => {
  const toneMap = {
    emerald: 'text-emerald-600',
    red: 'text-red-600',
  };
  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 text-base ${toneMap[tone]}`}>
          <Icon className="w-4 h-4" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} stroke="#64748B" fontSize={11} />
              <YAxis type="category" dataKey="name" stroke="#334155" fontSize={11} width={140} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }} formatter={(v) => [`${v}%`, 'Cumplimiento']} />
              <Bar dataKey="pct" fill={tone === 'emerald' ? '#10B981' : '#EF4444'} radius={[0, 6, 6, 0]}>
                {data.map((d, i) => (
                  <Cell key={i} fill={tone === 'emerald' ? '#10B981' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyChart text="Sin datos" />}
        {arrow === 'up' && data[0] && (
          <div className="mt-2 text-xs text-emerald-700 inline-flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> {data[0].name} lidera con {data[0].pct}%
          </div>
        )}
        {arrow === 'down' && data[0] && (
          <div className="mt-2 text-xs text-red-700 inline-flex items-center gap-1">
            <XCircle className="w-3 h-3" /> {data[0].name} con {data[0].pct}% requiere plan de acción
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const EmptyChart = ({ text }) => (
  <div className="h-64 flex items-center justify-center text-slate-400 text-sm">{text}</div>
);

export default AdminDashboard;
