import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Loader2, ShieldCheck, AlertTriangle, Download, TrendingUp, Users, Award,
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const pctTone = (pct, total) => {
  if (total === 0) return { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Sin trabajadores' };
  if (pct >= 80) return { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'OK' };
  if (pct >= 50) return { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Atención' };
  return { bg: 'bg-red-100', text: 'text-red-800', label: 'Crítico' };
};

const Compliance = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchHeatmap = async () => {
      try {
        const r = await fetch(`${API}/compliance/heatmap`, { headers });
        if (!r.ok) throw new Error('No se pudo cargar la matriz de cumplimiento');
        setData(await r.json());
      } catch (e) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHeatmap();
  }, []);

  const cellMap = useMemo(() => {
    const m = new Map();
    (data?.cells || []).forEach((c) => {
      m.set(`${c.activity_id}__${c.competency_id}`, c);
    });
    return m;
  }, [data]);

  // Determine columns: only competencies that appear in at least one activity row
  const visibleCompetencies = useMemo(() => {
    if (!data) return [];
    const ids = new Set((data.cells || []).map((c) => c.competency_id));
    return (data.competencies || []).filter((c) => ids.has(c.competency_id));
  }, [data]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const r = await fetch(`${API}/compliance/heatmap/export`, { headers });
      if (!r.ok) throw new Error('Error al exportar');
      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const cd = r.headers.get('Content-Disposition') || '';
      const m = cd.match(/filename="([^"]+)"/);
      a.href = url;
      a.download = m ? m[1] : 'aptiva_cumplimiento.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Reporte descargado');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  const s = data?.summary || { total_cells: 0, average_compliance: 0, critical_count: 0, green_count: 0, total_workers: 0 };

  return (
    <div className="space-y-6" data-testid="admin-compliance">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mapa de Calor de Cumplimiento</h1>
          <p className="text-sm text-slate-500">
            Estado real de cumplimiento por actividad y competencia. Listo para auditorías SUSESO, Mutual o fiscalizaciones.
          </p>
        </div>
        <Button
          onClick={handleDownload}
          disabled={downloading || s.total_cells === 0}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="export-csv-btn"
        >
          {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Exportar CSV
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card data-testid="summary-avg">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <div className="text-xs text-slate-500">Cumplimiento promedio</div>
            </div>
            <div className="text-3xl font-bold text-slate-900">{s.average_compliance}%</div>
          </CardContent>
        </Card>
        <Card data-testid="summary-workers">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <div className="text-xs text-slate-500">Trabajadores</div>
            </div>
            <div className="text-3xl font-bold text-slate-900">{s.total_workers}</div>
          </CardContent>
        </Card>
        <Card data-testid="summary-green">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <div className="text-xs text-slate-500">Celdas en verde (≥80%)</div>
            </div>
            <div className="text-3xl font-bold text-emerald-700">{s.green_count}</div>
          </CardContent>
        </Card>
        <Card data-testid="summary-critical">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <div className="text-xs text-slate-500">Celdas críticas (&lt;50%)</div>
            </div>
            <div className="text-3xl font-bold text-red-700">{s.critical_count}</div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            Matriz Actividad × Competencia
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(data?.activities?.length || 0) === 0 || visibleCompetencies.length === 0 ? (
            <div className="py-14 text-center text-sm text-slate-500">
              <p className="font-medium text-slate-700">Aún no hay matriz para mostrar.</p>
              <p className="mt-1 text-xs">
                Asigna competencias a tus actividades en <span className="font-medium">Actividades</span> para que aparezcan aquí.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto" data-testid="heatmap-table-wrap">
              <table className="w-full border-separate border-spacing-1 p-3">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-white z-10 text-left text-xs font-semibold text-slate-600 px-3 py-2 align-bottom min-w-[180px]">
                      Actividad
                    </th>
                    {visibleCompetencies.map((c) => (
                      <th
                        key={c.competency_id}
                        className="text-xs font-semibold text-slate-600 px-2 py-2 align-bottom"
                        style={{ minWidth: 130 }}
                        data-testid={`heatmap-col-${c.competency_id}`}
                      >
                        <div className="truncate" title={c.name}>{c.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.activities.map((a) => (
                    <tr key={a.activity_id} data-testid={`heatmap-row-${a.activity_id}`}>
                      <td className="sticky left-0 bg-white z-10 text-sm font-medium text-slate-800 px-3 py-2 align-middle">
                        {a.name}
                      </td>
                      {visibleCompetencies.map((c) => {
                        const cell = cellMap.get(`${a.activity_id}__${c.competency_id}`);
                        if (!cell) {
                          return (
                            <td
                              key={c.competency_id}
                              className="bg-slate-50 text-center text-xs text-slate-300 py-3 rounded"
                              data-testid={`heatmap-cell-${a.activity_id}-${c.competency_id}-na`}
                            >
                              —
                            </td>
                          );
                        }
                        const tone = pctTone(cell.percentage, cell.total_workers);
                        return (
                          <td
                            key={c.competency_id}
                            className={`${tone.bg} ${tone.text} text-center py-2 rounded transition-shadow hover:shadow-md cursor-help`}
                            title={`${cell.acquired}/${cell.total_workers} acreditados · ${cell.expired} vencidos · ${cell.pending} pendientes`}
                            data-testid={`heatmap-cell-${a.activity_id}-${c.competency_id}`}
                          >
                            <div className="text-lg font-bold leading-tight">{cell.percentage}%</div>
                            <div className="text-[10px] opacity-80">
                              {cell.acquired}/{cell.total_workers}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <span className="font-medium text-slate-700">Leyenda:</span>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200">OK (≥80%)</Badge>
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Atención (50-79%)</Badge>
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Crítico (&lt;50%)</Badge>
            <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200">Sin trabajadores</Badge>
            <span className="ml-auto text-[11px] text-slate-400">
              Generado: {data?.generated_at ? new Date(data.generated_at).toLocaleString('es-CL') : ''}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Compliance;
