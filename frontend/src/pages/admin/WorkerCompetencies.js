import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import { Badge } from '../../components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Loader2, Award, Upload, Trash2, CheckCircle2, AlertTriangle, Clock, FileWarning, FileText, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '../../components/ui/confirm';

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
    <Badge variant="outline" className={`${cfg.className} gap-1`}>
      <Icon className="w-3 h-3" />
      {status.label}
    </Badge>
  );
};

const WorkerCompetencies = () => {
  const [workers, setWorkers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [wcs, setWcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCompetencyId, setUploadCompetencyId] = useState('');
  const [uploadExpiry, setUploadExpiry] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const confirm = useConfirm();

  useEffect(() => {
    const init = async () => {
      const [u, a, c] = await Promise.all([
        fetch(`${API}/users`, { headers }),
        fetch(`${API}/activities`, { headers }),
        fetch(`${API}/competencies`, { headers }),
      ]);
      if (u.ok) setWorkers((await u.json()).filter((x) => !x.is_admin));
      if (a.ok) setActivities(await a.json());
      if (c.ok) setCompetencies(await c.json());
      setLoading(false);
    };
    init();
  }, []);

  const loadWorkerCompetencies = async (worker) => {
    setSelectedWorker(worker);
    const r = await fetch(`${API}/worker-competencies/${worker.user_id}`, { headers });
    if (r.ok) setWcs(await r.json());
  };

  const wcByComp = useMemo(() => wcs.reduce((acc, w) => { acc[w.competency_id] = w; return acc; }, {}), [wcs]);

  // Required competencies = union of competency_ids across the worker's activities
  const requiredCompetencyIds = useMemo(() => {
    if (!selectedWorker) return new Set();
    const acts = activities.filter((a) => (selectedWorker.activity_ids || []).includes(a.activity_id));
    const ids = new Set();
    acts.forEach((a) => (a.competency_ids || []).forEach((id) => ids.add(id)));
    return ids;
  }, [selectedWorker, activities]);

  // Show required + any extra already acquired
  const visibleCompetencies = useMemo(() => {
    const ids = new Set(requiredCompetencyIds);
    Object.keys(wcByComp).forEach((id) => ids.add(id));
    return competencies.filter((c) => ids.has(c.competency_id));
  }, [competencies, requiredCompetencyIds, wcByComp]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadCompetencyId) {
      toast.error('Selecciona una competencia');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('competency_id', uploadCompetencyId);
      if (uploadExpiry) fd.append('expiry_date', uploadExpiry);
      if (uploadNotes) fd.append('notes', uploadNotes);
      if (uploadFile) fd.append('file', uploadFile);
      const r = await fetch(`${API}/worker-competencies/${selectedWorker.user_id}/upload`, {
        method: 'POST',
        headers,
        body: fd,
      });
      if (!r.ok) throw new Error((await r.json()).detail || 'Error');
      toast.success('Competencia registrada');
      setUploadOpen(false);
      setUploadCompetencyId(''); setUploadExpiry(''); setUploadFile(null); setUploadNotes('');
      loadWorkerCompetencies(selectedWorker);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: '¿Eliminar este registro de competencia?', confirmText: 'Eliminar', destructive: true });
    if (!ok) return;
    const r = await fetch(`${API}/worker-competencies/${id}`, { method: 'DELETE', headers });
    if (r.ok) { toast.success('Registro eliminado'); loadWorkerCompetencies(selectedWorker); }
    else toast.error('Error');
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6" data-testid="admin-worker-competencies">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Matriz de Competencias</h1>
        <p className="text-sm text-slate-500">Visualiza y registra manualmente las competencias acreditadas de cada trabajador.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Worker list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Trabajadores ({workers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[600px] overflow-y-auto">
            {workers.length === 0 ? <p className="text-sm text-slate-500 p-4">Sin trabajadores.</p> : (
              <div className="divide-y divide-slate-100">
                {workers.map((w) => (
                  <button
                    key={w.user_id}
                    onClick={() => loadWorkerCompetencies(w)}
                    className={`w-full text-left p-3 hover:bg-slate-50 ${selectedWorker?.user_id === w.user_id ? 'bg-blue-50' : ''}`}
                    data-testid={`worker-row-${w.user_id}`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{w.full_name}</p>
                    <p className="text-xs text-slate-500">{w.rut || w.email}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Matrix for selected worker */}
        <div>
          {!selectedWorker ? (
            <Card>
              <CardContent className="py-16 text-center text-slate-500">
                <Award className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">Selecciona un trabajador para ver sus competencias.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{selectedWorker.full_name}</h2>
                  <p className="text-xs text-slate-500">{selectedWorker.email}</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setUploadOpen(true)} data-testid="grant-competency-btn">
                  <Upload className="w-4 h-4 mr-2" /> Registrar competencia
                </Button>
              </div>

              {visibleCompetencies.length === 0 && competencies.length === 0 && (
                <Card><CardContent className="py-10 text-center text-sm text-slate-500">No hay competencias en el catálogo. Crea algunas en &quot;Competencias&quot;.</CardContent></Card>
              )}
              {visibleCompetencies.length === 0 && competencies.length > 0 && (
                <Card><CardContent className="py-10 text-center text-sm text-slate-500">Este trabajador no tiene competencias requeridas (revisa las actividades asignadas) ni registros previos. Puedes registrarle una usando el botón superior.</CardContent></Card>
              )}

              {visibleCompetencies.map((c) => {
                const wc = wcByComp[c.competency_id];
                const status = getStatus(wc);
                const isRequired = requiredCompetencyIds.has(c.competency_id);
                return (
                  <Card key={c.competency_id} data-testid={`comp-row-${c.competency_id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Award className="w-5 h-5 text-blue-700" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                              {isRequired && <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Requerida</Badge>}
                            </div>
                            {c.description && <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>}
                            {wc && (
                              <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                                <span>Adquirida: {fmtDate(wc.acquired_at)}</span>
                                {wc.expiry_date && <span>Vence: {fmtDate(wc.expiry_date)}</span>}
                                <Badge variant="outline" className="text-xs">
                                  {wc.source === 'course' ? 'Por curso' : 'Manual'}
                                </Badge>
                                {wc.file_url && (
                                  <a href={`${BACKEND_URL}${wc.file_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline inline-flex items-center gap-1">
                                    <ExternalLink className="w-3 h-3" /> {wc.original_name || 'Archivo'}
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={status} />
                          {wc && (
                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(wc.worker_competency_id)} data-testid={`delete-wc-${wc.worker_competency_id}`}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar competencia</DialogTitle>
            <DialogDescription>Acredita manualmente una competencia para {selectedWorker?.full_name}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-3">
            <div>
              <Label>Competencia *</Label>
              <Select value={uploadCompetencyId} onValueChange={setUploadCompetencyId}>
                <SelectTrigger data-testid="select-competency"><SelectValue placeholder="Selecciona una competencia" /></SelectTrigger>
                <SelectContent>
                  {competencies.map((c) => (
                    <SelectItem key={c.competency_id} value={c.competency_id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha de vencimiento (opcional)</Label>
              <Input type="date" value={uploadExpiry} onChange={(e) => setUploadExpiry(e.target.value)} />
              <p className="text-xs text-slate-400 mt-1">Si la competencia tiene vigencia definida y dejas esto vacío, se calculará automáticamente.</p>
            </div>
            <div>
              <Label>Archivo de respaldo (opcional)</Label>
              <Input type="file" onChange={(e) => setUploadFile(e.target.files[0])} />
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea rows={2} value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={uploading} className="bg-blue-600 hover:bg-blue-700" data-testid="submit-grant-competency">
                {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Registrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkerCompetencies;
