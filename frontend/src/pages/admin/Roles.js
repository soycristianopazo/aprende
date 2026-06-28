import { useState, useEffect } from 'react';
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
import { Plus, Edit2, Trash2, Loader2, FolderTree, Sparkles, Award } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '../../components/ui/confirm';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const emptyForm = { name: '', description: '', competency_ids: [] };

const Roles = () => {
  const [activities, setActivities] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const confirm = useConfirm();

  const fetchAll = async () => {
    try {
      const [a, c] = await Promise.all([
        fetch(`${API}/activities`, { headers }),
        fetch(`${API}/competencies`, { headers }),
      ]);
      if (a.ok) setActivities(await a.json());
      if (c.ok) setCompetencies(await c.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const compNameById = competencies.reduce((acc, c) => { acc[c.competency_id] = c.name; return acc; }, {});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        competency_ids: form.competency_ids,
      };
      const url = editing ? `${API}/activities/${editing.activity_id}` : `${API}/activities`;
      const method = editing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error((await r.json()).detail || 'Error');
      toast.success(editing ? 'Actividad actualizada' : 'Actividad creada');
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      fetchAll();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (a) => {
    setEditing(a);
    setForm({
      name: a.name,
      description: a.description || '',
      competency_ids: a.competency_ids || [],
    });
    setDialogOpen(true);
  };

  const toggleCompetency = (id) => {
    setForm((f) => ({
      ...f,
      competency_ids: f.competency_ids.includes(id)
        ? f.competency_ids.filter((x) => x !== id)
        : [...f.competency_ids, id],
    }));
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: '¿Eliminar actividad?',
      description: 'Los trabajadores asignados perderán esta etiqueta.',
      confirmText: 'Eliminar', destructive: true,
    });
    if (!ok) return;
    const r = await fetch(`${API}/activities/${id}`, { method: 'DELETE', headers });
    if (r.ok) { toast.success('Actividad eliminada'); fetchAll(); }
    else toast.error('No se pudo eliminar');
  };

  const handleInitPredefined = async () => {
    const ok = await confirm({
      title: 'Crear actividades predefinidas',
      description: 'Se crearán las 19 actividades predefinidas (Trabajo en altura, Soldador, etc.).',
      confirmText: 'Crear',
    });
    if (!ok) return;
    const r = await fetch(`${API}/activities/predefined/init`, { method: 'POST', headers });
    if (r.ok) {
      const data = await r.json();
      toast.success(data.message || 'Actividades inicializadas');
      fetchAll();
    } else {
      toast.error('Error');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Actividades</h1>
          <p className="text-sm text-slate-500">Catálogo de actividades laborales. Asigna las competencias que cada actividad requiere.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleInitPredefined}>
            <Sparkles className="w-4 h-4 mr-2" /> Cargar predefinidas
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700" data-testid="new-activity-btn"><Plus className="w-4 h-4 mr-2" /> Nueva</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? 'Editar actividad' : 'Nueva actividad'}</DialogTitle>
                <DialogDescription>Define el nombre y las competencias requeridas.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <Label>Nombre</Label>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="activity-name-input" />
                </div>
                <div>
                  <Label>Descripción (opcional)</Label>
                  <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div>
                  <Label>Competencias requeridas ({form.competency_ids.length} seleccionada(s))</Label>
                  {competencies.length === 0 ? (
                    <p className="text-xs text-slate-400 mt-1">
                      Aún no hay competencias. Créalas en &quot;Competencias&quot;.
                    </p>
                  ) : (
                    <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto p-2 space-y-1 mt-1">
                      {competencies.map((c) => (
                        <label key={c.competency_id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer">
                          <Checkbox
                            checked={form.competency_ids.includes(c.competency_id)}
                            onCheckedChange={() => toggleCompetency(c.competency_id)}
                            data-testid={`activity-comp-${c.competency_id}`}
                          />
                          <span className="text-sm text-slate-700">{c.name}</span>
                          {c.validity_months ? (
                            <span className="text-xs text-slate-400 ml-auto">{c.validity_months}m</span>
                          ) : null}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700" data-testid="activity-submit-btn">
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {editing ? 'Guardar' : 'Crear'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{activities.length} actividad(es) configurada(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">
              Aún no hay actividades. Crea la primera o carga las predefinidas.
            </p>
          ) : (
            <div className="divide-y divide-slate-200">
              {activities.map((a) => (
                <div key={a.activity_id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <FolderTree className="w-4 h-4 text-blue-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{a.name}</p>
                      {a.description && <p className="text-xs text-slate-500 line-clamp-2">{a.description}</p>}
                      {(a.competency_ids || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(a.competency_ids || []).map((cid) => (
                            <Badge key={cid} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 gap-1">
                              <Award className="w-2.5 h-2.5" />
                              {compNameById[cid] || cid}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(a)} data-testid={`edit-activity-${a.activity_id}`}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(a.activity_id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Roles;
