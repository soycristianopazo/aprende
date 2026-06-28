import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import {
  Loader2, Search, Download, CheckCircle2, AlertTriangle, XCircle, MinusCircle,
  GridIcon, Sparkles, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STATUS_META = {
  valid:        { label: 'Vigente',     short: 'OK',    icon: CheckCircle2,  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200',  dot: 'bg-emerald-500' },
  warning:      { label: 'Por vencer',  short: '≤30d',  icon: AlertTriangle, cls: 'bg-amber-100 text-amber-800 border-amber-200',         dot: 'bg-amber-500' },
  expired:      { label: 'Vencida',     short: 'VEN',   icon: XCircle,       cls: 'bg-red-100 text-red-700 border-red-200',               dot: 'bg-red-500' },
  missing:      { label: 'Falta',       short: 'FALTA', icon: XCircle,       cls: 'bg-rose-100 text-rose-700 border-rose-200',            dot: 'bg-rose-500' },
  not_required: { label: 'No aplica',   short: '—',     icon: MinusCircle,   cls: 'bg-slate-50 text-slate-400 border-slate-100',          dot: 'bg-slate-300' },
};

const fmtDate = (iso) => {
  if (!iso) return null;
  try { return new Date(iso).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: '2-digit' }); }
  catch { return iso.slice(0, 10); }
};

const CompetencyMatrix = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [activities, setActivities] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterActivity, setFilterActivity] = useState('');
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [m, a, r, act] = await Promise.all([
        fetch(`${API}/reports/worker-competency-matrix`, { headers }).then((r) => r.json()),
        fetch(`${API}/areas`, { headers }).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API}/job-roles`, { headers }).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API}/activities`, { headers }).then((r) => (r.ok ? r.json() : [])),
      ]);
      setData(m);
      setAreas(a);
      setJobRoles(r);
      setActivities(act);
    } catch {
      toast.error('Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const cellLookup = useMemo(() => {
    if (!data) return new Map();
    const m = new Map();
    for (const c of data.cells) m.set(`${c.user_id}::${c.competency_id}`, c);
    return m;
  }, [data]);

  const filteredWorkers = useMemo(() => {
    if (!data) return [];
    const s = search.trim().toLowerCase();
    return data.workers.filter((w) => {
      if (filterArea && !(w.area_ids || []).includes(filterArea)) return false;
      if (filterRole && w.role_id !== filterRole) return false;
      if (filterActivity && !(w.activity_ids || []).includes(filterActivity)) return false;
      if (s && !(`${w.full_name} ${w.rut} ${w.role_name || ''}`).toLowerCase().includes(s)) return false;
      if (showOnlyIssues) {
        const issues = (w.totals?.expired || 0) + (w.totals?.missing || 0) + (w.totals?.warning || 0);
        if (issues === 0) return false;
      }
      return true;
    });
  }, [data, search, filterArea, filterRole, filterActivity, showOnlyIssues]);

  const handleExport = async () => {
    try {
      const r = await fetch(`${API}/reports/worker-competency-matrix/export`, { headers });
      if (!r.ok) throw new Error('Error');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'matriz_competencias.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Reporte exportado');
    } catch {
      toast.error('Error al exportar');
    }
  };

  if (loading || !data) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  const s = data.summary;

  return (
    <div className="space-y-6" data-testid="competency-matrix-report">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-blue-700 font-semibold">
            <GridIcon className="w-3.5 h-3.5" /> Reporte
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Matriz de Competencias por Trabajador
          </h1>
          <p className="text-slate-600 mt-1 text-sm">
            Vista cruzada Trabajadores × Competencias con estado, vencimientos y faltantes.
            Las celdas se calculan según las actividades asignadas a cada trabajador.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAll} data-testid="matrix-refresh-btn">
            <RefreshCw className="w-4 h-4 mr-2" /> Actualizar
          </Button>
          <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="matrix-export-btn">
            <Download className="w-4 h-4 mr-2" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Trabajadores"     value={s.total_workers}        icon={Sparkles}      tone="slate"  testId="kpi-workers" />
        <KpiCard label="Competencias"     value={s.total_competencies}   icon={GridIcon}      tone="blue"   testId="kpi-competencies" />
        <KpiCard label="Vigentes"         value={s.valid}                icon={CheckCircle2}  tone="emerald" testId="kpi-valid" />
        <KpiCard label="Por vencer"       value={s.warning}              icon={AlertTriangle} tone="amber"  testId="kpi-warning" />
        <KpiCard label="Vencidas"         value={s.expired}              icon={XCircle}       tone="red"    testId="kpi-expired" />
        <KpiCard label="Faltantes"        value={s.missing}              icon={XCircle}       tone="rose"   testId="kpi-missing" />
      </div>

      {/* Compliance bar */}
      <Card className="border-slate-200">
        <CardContent className="pt-4 pb-4 flex items-center gap-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold w-40 shrink-0">Cumplimiento global</div>
          <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full ${s.average_compliance >= 80 ? 'bg-emerald-500' : s.average_compliance >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${s.average_compliance}%` }}
            />
          </div>
          <div className="text-lg font-bold text-slate-900 w-12 text-right" data-testid="kpi-compliance">{s.average_compliance}%</div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="pt-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <Label className="text-[11px] text-slate-500">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-8 h-9"
                placeholder="Nombre, RUT, cargo"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="matrix-search"
              />
            </div>
          </div>
          <div>
            <Label className="text-[11px] text-slate-500">Área</Label>
            <select className="w-full h-9 px-2 rounded-md border border-slate-200 bg-white text-sm" value={filterArea} onChange={(e) => setFilterArea(e.target.value)} data-testid="matrix-filter-area">
              <option value="">Todas</option>
              {areas.map((a) => <option key={a.area_id} value={a.area_id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-[11px] text-slate-500">Cargo</Label>
            <select className="w-full h-9 px-2 rounded-md border border-slate-200 bg-white text-sm" value={filterRole} onChange={(e) => setFilterRole(e.target.value)} data-testid="matrix-filter-role">
              <option value="">Todos</option>
              {jobRoles.map((r) => <option key={r.role_id} value={r.role_id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-[11px] text-slate-500">Actividad</Label>
            <select className="w-full h-9 px-2 rounded-md border border-slate-200 bg-white text-sm" value={filterActivity} onChange={(e) => setFilterActivity(e.target.value)} data-testid="matrix-filter-activity">
              <option value="">Todas</option>
              {activities.map((a) => <option key={a.activity_id} value={a.activity_id}>{a.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 h-9 cursor-pointer" data-testid="matrix-only-issues">
              <input
                type="checkbox"
                checked={showOnlyIssues}
                onChange={(e) => setShowOnlyIssues(e.target.checked)}
                className="w-4 h-4 accent-red-600"
              />
              <span className="text-sm text-slate-700">Solo con problemas</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Matrix */}
      <Card className="border-slate-200">
        <CardContent className="p-0 overflow-auto">
          {filteredWorkers.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">Sin resultados con los filtros actuales.</div>
          ) : (
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="sticky left-0 bg-slate-50 z-10 min-w-[260px] border-r border-slate-200">
                    Trabajador
                  </TableHead>
                  {data.competencies.map((c) => (
                    <TableHead key={c.competency_id} className="text-center min-w-[120px]" title={c.name}>
                      <div className="text-[11px] font-semibold text-slate-700 leading-tight">{c.name}</div>
                      {c.validity_months && (
                        <div className="text-[9px] text-slate-400 mt-0.5">Vigencia {c.validity_months}m</div>
                      )}
                    </TableHead>
                  ))}
                  <TableHead className="text-center min-w-[110px] bg-slate-100 sticky right-0">% Cumplimiento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkers.map((w) => (
                  <TableRow key={w.user_id} data-testid={`matrix-row-${w.user_id}`}>
                    <TableCell className="sticky left-0 bg-white border-r border-slate-200">
                      <div className="font-medium text-slate-900 text-sm leading-tight">{w.full_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{w.rut || '—'}</div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {w.role_name && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">{w.role_name}</Badge>}
                        {w.area_names.slice(0, 2).map((a) => (
                          <Badge key={a} variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px]">{a}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    {data.competencies.map((c) => {
                      const cell = cellLookup.get(`${w.user_id}::${c.competency_id}`);
                      const meta = STATUS_META[cell?.status || 'not_required'];
                      const Icon = meta.icon;
                      const tooltip = (() => {
                        const parts = [meta.label];
                        if (cell?.expiry_date) parts.push(`Vence: ${fmtDate(cell.expiry_date)}`);
                        if (cell?.acquired_at) parts.push(`Adquirida: ${fmtDate(cell.acquired_at)}`);
                        if (cell?.required && (cell?.status === 'missing' || cell?.status === 'expired')) parts.push('REQUERIDA por actividad asignada');
                        return parts.join(' · ');
                      })();
                      return (
                        <TableCell key={c.competency_id} className="text-center align-middle px-1" title={tooltip}>
                          <div
                            className={`mx-auto inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium ${meta.cls}`}
                            data-testid={`matrix-cell-${w.user_id}-${c.competency_id}-${cell?.status || 'na'}`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{meta.short}</span>
                          </div>
                          {cell?.expiry_date && (cell.status === 'valid' || cell.status === 'warning') && (
                            <div className="text-[9px] text-slate-400 mt-0.5">{fmtDate(cell.expiry_date)}</div>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center align-middle bg-slate-50 font-bold sticky right-0">
                      {w.compliance_pct !== null ? (
                        <span className={
                          w.compliance_pct >= 80 ? 'text-emerald-600' :
                          w.compliance_pct >= 50 ? 'text-amber-600' : 'text-red-600'
                        }>{w.compliance_pct}%</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-slate-200">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Leyenda</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(STATUS_META).map(([key, m]) => (
              <div key={key} className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs ${m.cls}`}>
                <m.icon className="w-3.5 h-3.5" /> {m.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const KpiCard = ({ label, value, icon: Icon, tone = 'slate', testId }) => {
  const toneMap = {
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return (
    <div className={`rounded-xl border p-3 ${toneMap[tone]}`} data-testid={testId}>
      <div className="flex items-center justify-between">
        <Icon className="w-4 h-4 opacity-80" />
        <span className="text-2xl font-bold leading-none">{value}</span>
      </div>
      <p className="text-[11px] uppercase tracking-wider mt-2 opacity-80">{label}</p>
    </div>
  );
};

export default CompetencyMatrix;
