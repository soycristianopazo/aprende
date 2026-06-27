import { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Loader2, Award, AlertTriangle, Clock, CheckCircle2, FileWarning, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const isExpired = (d) => d && new Date(d) < new Date();
const isExpiringSoon = (d) => {
  if (!d) return false;
  const days = (new Date(d) - new Date()) / (1000 * 60 * 60 * 24);
  return days > 0 && days <= 30;
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-CL') : '—');

const getStatus = (wc) => {
  if (!wc) return { label: 'Pendiente', tone: 'pending' };
  if (wc.expiry_date && isExpired(wc.expiry_date)) return { label: 'Vencida', tone: 'expired' };
  if (wc.expiry_date && isExpiringSoon(wc.expiry_date)) return { label: 'Por vencer', tone: 'warning' };
  return { label: 'Vigente', tone: 'ok' };
};

const StatusBadge = ({ status }) => {
  const map = {
    pending: { className: 'bg-slate-100 text-slate-600 border-slate-200', icon: FileWarning },
    expired: { className: 'bg-red-50 text-red-700 border-red-200', icon: AlertTriangle },
    warning: { className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    ok: { className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  };
  const cfg = map[status.tone] || map.pending;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`${cfg.className} gap-1`} data-testid={`status-${status.tone}`}>
      <Icon className="w-3 h-3" />
      {status.label}
    </Badge>
  );
};

const MyCompetencies = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const r = await fetch(`${API}/my-competencies`, { headers });
        if (!r.ok) throw new Error('No se pudieron cargar tus competencias');
        setItems(await r.json());
      } catch (e) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  const counts = items.reduce(
    (acc, it) => {
      const s = getStatus(it.worker_competency);
      acc[s.tone] = (acc[s.tone] || 0) + 1;
      return acc;
    },
    { ok: 0, warning: 0, expired: 0, pending: 0 }
  );

  return (
    <div className="space-y-6" data-testid="student-my-competencies">
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Mis Competencias
        </h1>
        <p className="text-slate-600 mt-1">
          Las competencias acreditadas por la empresa según tu actividad. Se actualizan cuando apruebas un curso o tu administrador las registra manualmente.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">Vigentes</div><div className="text-2xl font-bold text-emerald-700">{counts.ok}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">Por vencer</div><div className="text-2xl font-bold text-amber-700">{counts.warning}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">Vencidas</div><div className="text-2xl font-bold text-red-700">{counts.expired}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">Pendientes</div><div className="text-2xl font-bold text-slate-700">{counts.pending}</div></CardContent></Card>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-500">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium">No hay competencias requeridas para ti todavía.</p>
            <p className="text-xs text-slate-400 mt-1">
              Tus competencias se determinan según las actividades asignadas. Contacta a tu administrador si crees que falta algo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" data-testid="competencies-list">
          {items.map((it) => {
            const wc = it.worker_competency;
            const status = getStatus(wc);
            return (
              <Card key={it.competency.competency_id} data-testid={`comp-${it.competency.competency_id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Award className="w-5 h-5 text-blue-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-slate-900">{it.competency.name}</p>
                        {it.competency.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{it.competency.description}</p>
                        )}
                        {wc ? (
                          <div className="flex items-center gap-3 text-xs mt-2 flex-wrap">
                            <span className="text-slate-500">Adquirida: {fmtDate(wc.acquired_at)}</span>
                            {wc.expiry_date && (
                              <span className={isExpired(wc.expiry_date) ? 'text-red-700' : isExpiringSoon(wc.expiry_date) ? 'text-amber-700' : 'text-slate-500'}>
                                Vence: {fmtDate(wc.expiry_date)}
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {wc.source === 'course' ? 'Acreditada por curso' : 'Acreditada manualmente'}
                            </Badge>
                            {wc.file_url && (
                              <a href={`${BACKEND_URL}${wc.file_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline inline-flex items-center gap-1" data-testid={`comp-evidence-${it.competency.competency_id}`}>
                                <ExternalLink className="w-3 h-3" /> Ver respaldo
                              </a>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 mt-2">
                            Aún no acreditada. {it.competency.validity_months ? `Vigencia: ${it.competency.validity_months} mes(es).` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={status} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyCompetencies;
