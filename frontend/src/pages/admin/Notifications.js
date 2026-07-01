import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import {
  Bell, Search, Loader2, RefreshCw, AlertTriangle, XCircle, CalendarClock,
  FileText, GraduationCap, Download, CheckCircle2, Info,
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SEVERITY_META = {
  expired:  { label: 'Vencido',      cls: 'bg-red-100 text-red-700 border-red-200',       icon: XCircle,       dot: 'bg-red-500' },
  critical: { label: 'Crítico ≤30d', cls: 'bg-rose-100 text-rose-700 border-rose-200',    icon: AlertTriangle, dot: 'bg-rose-500' },
  warning:  { label: 'Próximo ≤90d', cls: 'bg-amber-100 text-amber-800 border-amber-200', icon: CalendarClock, dot: 'bg-amber-500' },
  info:     { label: 'Vigente',      cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2, dot: 'bg-emerald-500' },
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso.slice(0, 10); }
};

const fmtDays = (d) => {
  if (d === null || d === undefined) return '—';
  if (d === 0) return 'hoy';
  if (d < 0) return `hace ${Math.abs(d)}d`;
  return `en ${d}d`;
};

const AdminNotifications = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('all');
  const [kind, setKind] = useState('all');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/notifications?horizon_days=90`, { headers });
      if (!r.ok) throw new Error('Error al cargar notificaciones');
      setData(await r.json());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = search.trim().toLowerCase();
    return data.notifications.filter((n) => {
      if (severity !== 'all' && n.severity !== severity) return false;
      if (kind !== 'all' && n.kind !== kind) return false;
      if s && !(`${n.user_name} ${n.user_rut} ${n.item_name} ${n.user_role_name || ''} ${n.user_email || ''}`).toLowerCase().includes(s)) return false;
      return true;
    });
  }, [data, search, severity, kind]);

  const handleExport = () => {
    if (!data) return;
    const rows = [
      ['Severidad', 'Tipo', 'Trabajador', 'RUT', 'Cargo', 'Ítem', 'Vencimiento', 'Días'],
      ...data.notifications.map((n) => [
        SEVERITY_META[n.severity]?.label || n.severity,
        n.kind_label,
        n.user_name,
        n.user_rut,
        n.user_role_name || '',
        n.item_name,
        fmtDate(n.expiry_date),
        n.days_remaining,
      ]),
    ];
    const csv = '\ufeff' + rows.map((r) => r.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aptiva_notificaciones_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exportado');
  };

  if (loading || !data) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  const s = data.summary;

  return (
    <div className="space-y-6" data-testid="admin-notifications">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-blue-700 font-semibold">
            <Bell className="w-3.5 h-3.5" /> Alertas
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Notificaciones de Vencimiento
          </h1>
          <p className="text-slate-600 mt-1 text-sm">
            Capacitaciones y documentos vencidos o próximos a vencer en los siguientes 90 días.
            Fecha generación: {fmtDate(s.generated_at)}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAll} data-testid="notif-refresh-btn">
            <RefreshCw className="w-4 h-4 mr-2" /> Actualizar
          </Button>
          <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="notif-export-btn">
            <Download className="w-4 h-4 mr-2" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Total alertas" value={s.total}             icon={Bell}          tone="slate"   testId="notif-kpi-total" onClick={() => setSeverity('all')} />
        <Kpi label="Vencidos"      value={s.expired}           icon={XCircle}       tone="red"     testId="notif-kpi-expired"  onClick={() => setSeverity('expired')} />
        <Kpi label="Crítico ≤30d"  value={s.critical}          icon={AlertTriangle} tone="rose"    testId="notif-kpi-critical" onClick={() => setSeverity('critical')} />
        <Kpi label="Próximo ≤90d"  value={s.warning}           icon={CalendarClock} tone="amber"   testId="notif-kpi-warning"  onClick={() => setSeverity('warning')} />
        <Kpi label="Trabajadores"  value={s.workers_affected}  icon={Info}          tone="blue"    testId="notif-kpi-workers" />
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="pt-4 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-8 h-9"
                placeholder="Buscar por trabajador, RUT o ítem…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="notif-search"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              ['all',      'Todos'],
              ['expired',  'Vencidos'],
              ['critical', 'Crítico'],
              ['warning',  'Próximos'],
            ].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSeverity(k)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition ${
                  severity === k
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                data-testid={`notif-sev-${k}`}
              >{label}</button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {[
              ['all',        'Todos', null],
              ['competency', 'Capacitaciones', GraduationCap],
              ['document',   'Documentos', FileText],
            ].map(([k, label, Icon]) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition inline-flex items-center gap-1.5 ${
                  kind === k
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                data-testid={`notif-kind-${k}`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />} {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
              <p className="font-medium">No hay alertas que coincidan con los filtros.</p>
              <p className="text-xs text-slate-400 mt-1">Todo bajo control 👌</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Severidad</TableHead>
                  <TableHead>Trabajador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ítem</TableHead>
                  <TableHead className="text-right">Vencimiento</TableHead>
                  <TableHead className="text-right w-24">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((n) => {
                  const meta = SEVERITY_META[n.severity];
                  const Icon = meta.icon;
                  const KindIcon = n.kind === 'competency' ? GraduationCap : FileText;
                  return (
                    <TableRow key={n.id} data-testid={`notif-row-${n.id}`}>
                      <TableCell>
                        <Badge variant="outline" className={`inline-flex items-center gap-1 ${meta.cls}`}>
                          <Icon className="w-3 h-3" /> {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-900 text-sm leading-tight">{n.user_name}</p>
                        <p className="text-xs text-slate-500 font-mono">{n.user_rut || '—'}{n.user_role_name && <span className="text-slate-400"> · {n.user_role_name}</span>}</p>
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                          <KindIcon className="w-3.5 h-3.5" /> {n.kind_label}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-800">{n.item_name}</TableCell>
                      <TableCell className="text-right text-sm text-slate-700 tabular-nums">
                        {fmtDate(n.expiry_date)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`text-xs font-semibold ${n.severity === 'expired' || n.severity === 'critical' ? 'text-red-600' : n.severity === 'warning' ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {fmtDays(n.days_remaining)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-slate-200">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Cómo interpretar</p>
          <div className="flex flex-wrap gap-3 text-xs">
            {Object.entries(SEVERITY_META).map(([k, m]) => (
              <div key={k} className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md border ${m.cls}`}>
                <m.icon className="w-3.5 h-3.5" /> {m.label}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            Las capacitaciones vienen de <code>worker_competencies</code>. Los documentos vienen de <code>worker_documents.files[].expiry_date</code>.
            Si un mismo documento tiene varias cargas se toma la de mayor fecha de vencimiento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const Kpi = ({ label, value, icon: Icon, tone, testId, onClick }) => {
  const toneMap = {
    slate: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    red: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
  };
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition ${toneMap[tone]} ${onClick ? 'cursor-pointer' : ''}`}
      data-testid={testId}
    >
      <div className="flex items-center justify-between">
        <Icon className="w-4 h-4 opacity-80" />
        <span className="text-2xl font-bold leading-none tabular-nums">{value}</span>
      </div>
      <p className="text-[11px] uppercase tracking-wider mt-2 opacity-80">{label}</p>
    </Component>
  );
};

export default AdminNotifications;
