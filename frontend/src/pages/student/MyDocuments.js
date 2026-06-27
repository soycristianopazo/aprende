import { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Loader2, FolderOpen, FileText, Download, AlertTriangle, Clock, CheckCircle2, FileWarning,
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

const getStatus = (files = []) => {
  if (!files.length) return { label: 'Pendiente', tone: 'pending' };
  if (files.some((f) => f.expiry_date && isExpired(f.expiry_date))) {
    return { label: 'Vencido', tone: 'expired' };
  }
  if (files.some((f) => f.expiry_date && isExpiringSoon(f.expiry_date))) {
    return { label: 'Por vencer', tone: 'warning' };
  }
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

const MyDocuments = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const r = await fetch(`${API}/my-documents`, { headers });
        if (!r.ok) throw new Error('No se pudieron cargar tus documentos');
        setItems(await r.json());
      } catch (e) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20" data-testid="my-documents-loading">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const counts = items.reduce(
    (acc, it) => {
      const s = getStatus(it.worker_document?.files);
      acc[s.tone] = (acc[s.tone] || 0) + 1;
      return acc;
    },
    { ok: 0, warning: 0, expired: 0, pending: 0 }
  );

  return (
    <div className="space-y-6" data-testid="student-my-documents">
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Mi Expediente
        </h1>
        <p className="text-slate-600 mt-1">
          Tu documentación obligatoria según tu área y actividad. Descarga tus archivos cuando los necesites.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-slate-200" data-testid="summary-ok">
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">Vigentes</div>
            <div className="text-2xl font-bold text-emerald-700">{counts.ok}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200" data-testid="summary-warning">
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">Por vencer</div>
            <div className="text-2xl font-bold text-amber-700">{counts.warning}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200" data-testid="summary-expired">
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">Vencidos</div>
            <div className="text-2xl font-bold text-red-700">{counts.expired}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200" data-testid="summary-pending">
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">Pendientes</div>
            <div className="text-2xl font-bold text-slate-700">{counts.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center text-slate-500">
            <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium">No hay documentos requeridos para ti todavía.</p>
            <p className="text-xs text-slate-400 mt-1">
              Tu expediente se configura automáticamente según el área y actividad asignadas. Contacta a tu administrador si crees que falta algo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" data-testid="documents-list">
          {items.map((it) => {
            const files = it.worker_document?.files || [];
            const status = getStatus(files);
            return (
              <Card key={it.document_type.document_type_id} className="border-slate-200" data-testid={`doc-${it.document_type.document_type_id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-blue-700" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-slate-900">{it.document_type.name}</p>
                        <p className="text-xs text-slate-500">
                          {files.length} archivo(s)
                          {it.document_type.requires_expiry && ' · requiere fecha de vencimiento'}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={status} />
                  </div>

                  {files.length === 0 ? (
                    <div className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                      Aún no se ha cargado este documento. Tu administrador es quien lo sube por ti.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                      {files.map((f, idx) => {
                        const exp = f.expiry_date
                          ? isExpired(f.expiry_date)
                            ? { className: 'text-red-700', label: `Vencido el ${fmtDate(f.expiry_date)}` }
                            : isExpiringSoon(f.expiry_date)
                            ? { className: 'text-amber-700', label: `Vence el ${fmtDate(f.expiry_date)}` }
                            : { className: 'text-slate-500', label: `Vence el ${fmtDate(f.expiry_date)}` }
                          : null;
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-3 px-3 py-2 bg-white"
                            data-testid={`doc-file-${it.document_type.document_type_id}-${idx}`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-slate-900 truncate">
                                {f.original_name || `Archivo ${idx + 1}`}
                              </p>
                              <div className="flex items-center gap-3 text-xs mt-0.5">
                                {f.uploaded_at && (
                                  <span className="text-slate-400">Subido {fmtDate(f.uploaded_at)}</span>
                                )}
                                {exp && <span className={exp.className}>{exp.label}</span>}
                              </div>
                            </div>
                            <a
                              href={`${BACKEND_URL}${f.file_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 hover:underline whitespace-nowrap"
                              data-testid={`doc-download-${it.document_type.document_type_id}-${idx}`}
                            >
                              <Download className="w-3.5 h-3.5" />
                              Descargar
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyDocuments;
