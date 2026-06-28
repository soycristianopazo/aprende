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
  DialogHeader, DialogTitle, DialogTrigger,
} from '../../components/ui/dialog';
import {
  Plus, Edit2, Trash2, Loader2, Briefcase, Users as UsersIcon,
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const emptyForm = { name: '', description: '', worker_ids: [] };

const Gerencias = () => {
  const [gerencias, setGerencias] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const refresh = async () => {
    const [g, w] = await Promise.all([
      fetch(`${API}/gerencias`, { headers }).then((r) => r.json()),
      fetch(`${API}/users`, { headers }).then((r) => r.json()),
    ]);
    setGerencias(g);
    setWorkers((w || []).filter((u) => !u.is_admin));
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const workerNameById = useMemo(
    () => workers.reduce((acc, w) => { acc[w.user_id] = w.full_name || w.email; return acc; }, {}),
    [workers]
  );

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || null,
        worker_ids: form.worker_ids,
      };
      const url = editing ? `${API}/gerencias/${editing.gerencia_id}` : `${API}/gerencias`;
      const method = editing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error((await r.json()).detail || 'Error');
      toast.success(editing ? 'Gerencia actualizada' : 'Gerencia creada');
      setDialog(false);
      setEditing(null);
      setForm(emptyForm);
      refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('¿Eliminar esta gerencia?')) return;
    const r = await fetch(`${API}/gerencias/${id}`, { method: 'DELETE', headers });
    if (r.ok) { toast.success('Gerencia eliminada'); refresh(); } else toast.error('Error');
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6" data-testid="admin-gerencias">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gerencias</h1>
          <p className="text-sm text-slate-500">Gerencias internas de tu empresa mandante y los trabajadores que pertenecen a cada una.</p>
        </div>
        <Dialog open={dialog} onOpenChange={(o) => { setDialog(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" data-testid="new-gerencia-btn"><Plus className="w-4 h-4 mr-2" /> Nueva gerencia</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar gerencia' : 'Nueva gerencia'}</DialogTitle>
              <DialogDescription>Define la gerencia y asigna a los trabajadores que pertenecen a ella.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div><Label>Nombre *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Gerencia de Operaciones" data-testid="gerencia-name-input" /></div>
              <div><Label>Descripción</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div>
                <Label>Trabajadores asignados ({form.worker_ids.length})</Label>
                {workers.length === 0 ? (
                  <p className="text-xs text-slate-400 mt-1">No hay trabajadores aún. Crea trabajadores en &quot;Trabajadores&quot;.</p>
                ) : (
                  <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto p-2 space-y-1 mt-1">
                    {workers.map((w) => (
                      <label key={w.user_id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer">
                        <Checkbox
                          checked={form.worker_ids.includes(w.user_id)}
                          onCheckedChange={() => setForm({
                            ...form,
                            worker_ids: form.worker_ids.includes(w.user_id)
                              ? form.worker_ids.filter((x) => x !== w.user_id)
                              : [...form.worker_ids, w.user_id],
                          })}
                          data-testid={`gerencia-worker-${w.user_id}`}
                        />
                        <span className="text-sm text-slate-700">{w.full_name || w.email}</span>
                        <span className="text-xs text-slate-400 ml-auto">{w.rut || ''}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700" data-testid="gerencia-submit-btn">
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {editing ? 'Guardar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {gerencias.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-sm text-slate-500">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-medium">Aún no tienes gerencias.</p>
          <p className="text-xs text-slate-400 mt-1">Crea la primera para organizar a tu fuerza laboral por estructura interna.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="gerencias-list">
          {gerencias.map((g) => (
            <Card key={g.gerencia_id} data-testid={`gerencia-${g.gerencia_id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Briefcase className="w-5 h-5 text-blue-700" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base">{g.name}</CardTitle>
                      {g.description && <p className="text-xs text-slate-500">{g.description}</p>}
                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                        <UsersIcon className="w-3 h-3" />
                        {(g.worker_ids || []).length} trabajador(es)
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => { setEditing(g); setForm({ name: g.name || '', description: g.description || '', worker_ids: g.worker_ids || [] }); setDialog(true); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => remove(g.gerencia_id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {(g.worker_ids || []).length > 0 && (
                <CardContent className="pt-0 border-t border-slate-100">
                  <div className="flex flex-wrap gap-1.5 pt-3">
                    {g.worker_ids.slice(0, 12).map((wid) => (
                      <Badge key={wid} variant="outline" className="text-[11px]">{workerNameById[wid] || wid}</Badge>
                    ))}
                    {g.worker_ids.length > 12 && (
                      <span className="text-xs text-slate-400">+{g.worker_ids.length - 12} más</span>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gerencias;
