import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import { Switch } from '../../components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Plus, Edit2, Trash2, Loader2, FileText, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const empty = { name: '', description: '', requires_expiry: false, area_ids: [], activity_ids: [] };

const DocumentTypes = () => {
  const [docTypes, setDocTypes] = useState([]);
  const [areas, setAreas] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchAll = async () => {
    const [d, a, act] = await Promise.all([
      fetch(`${API}/document-types`, { headers }),
      fetch(`${API}/areas`, { headers }),
      fetch(`${API}/activities`, { headers }),
    ]);
    if (d.ok) setDocTypes(await d.json());
    if (a.ok) setAreas(await a.json());
    if (act.ok) setActivities(await act.json());
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const toggleArr = (key, id) => setForm((prev) => ({
    ...prev,
    [key]: prev[key].includes(id) ? prev[key].filter((x) => x !== id) : [...prev[key], id],
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editing ? `${API}/document-types/${editing.document_type_id}` : `${API}/document-types`;
      const method = editing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers, body: JSON.stringify(form) });
      if (!r.ok) throw new Error((await r.json()).detail || 'Error');
      toast.success(editing ? 'Tipo actualizado' : 'Tipo creado');
      setDialogOpen(false); setEditing(null); setForm(empty);
      fetchAll();
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleEdit = (d) => {
    setEditing(d);
    setForm({
      name: d.name, description: d.description || '',
      requires_expiry: !!d.requires_expiry,
      area_ids: d.area_ids || [], activity_ids: d.activity_ids || [],
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar tipo de documento? Los expedientes ya cargados se borrarán.')) return;
    const r = await fetch(`${API}/document-types/${id}`, { method: 'DELETE', headers });
    if (r.ok) { toast.success('Eliminado'); fetchAll(); }
    else toast.error('Error');
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tipos de Documento</h1>
          <p className="text-sm text-slate-500">Define qué documentos solicitará tu empresa a sus trabajadores.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm(empty); } }}>
          <DialogTrigger asChild><Button className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" /> Nuevo tipo</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar tipo de documento' : 'Nuevo tipo de documento'}</DialogTitle>
              <DialogDescription>Si asignas áreas o actividades, este documento solo será requerido a los trabajadores que coincidan.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Nombre del documento</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ej. Certificado de altura" /></div>
              <div><Label>Descripción (opcional)</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-slate-600" />
                  <Label className="text-sm">Requiere fecha de vencimiento</Label>
                </div>
                <Switch checked={form.requires_expiry} onCheckedChange={(v) => setForm({ ...form, requires_expiry: v })} />
              </div>
              <div>
                <Label className="text-sm font-semibold">Áreas asociadas (opcional)</Label>
                <p className="text-xs text-slate-500 mb-2">Si no seleccionas ninguna, aplica a TODOS los trabajadores de la empresa.</p>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border rounded">
                  {areas.length === 0 && <p className="col-span-2 text-xs text-slate-400">Sin áreas. Crea primero algunas en "Áreas".</p>}
                  {areas.map((a) => (
                    <label key={a.area_id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={form.area_ids.includes(a.area_id)} onCheckedChange={() => toggleArr('area_ids', a.area_id)} />
                      <span>{a.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold">Actividades asociadas (opcional)</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border rounded">
                  {activities.length === 0 && <p className="col-span-2 text-xs text-slate-400">Sin actividades.</p>}
                  {activities.map((a) => (
                    <label key={a.activity_id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={form.activity_ids.includes(a.activity_id)} onCheckedChange={() => toggleArr('activity_ids', a.activity_id)} />
                      <span>{a.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {editing ? 'Guardar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">{docTypes.length} tipo(s) configurado(s)</CardTitle></CardHeader>
        <CardContent>
          {docTypes.length === 0 ? <p className="text-sm text-slate-500 text-center py-6">Aún no hay tipos de documento.</p> : (
            <div className="divide-y divide-slate-200">
              {docTypes.map((d) => {
                const ar = areas.filter((a) => (d.area_ids || []).includes(a.area_id));
                const ac = activities.filter((a) => (d.activity_ids || []).includes(a.activity_id));
                return (
                  <div key={d.document_type_id} className="py-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><FileText className="w-4 h-4 text-blue-700" /></div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900">{d.name}</p>
                          {d.requires_expiry && <Badge variant="outline" className="text-xs"><CalendarClock className="w-3 h-3 mr-1" />Con vencimiento</Badge>}
                        </div>
                        {d.description && <p className="text-xs text-slate-500 mt-0.5">{d.description}</p>}
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {ar.length === 0 && ac.length === 0 && <Badge variant="secondary" className="text-xs">Aplica a todos</Badge>}
                          {ar.map((a) => <Badge key={a.area_id} variant="secondary" className="text-xs">{a.name}</Badge>)}
                          {ac.map((a) => <Badge key={a.activity_id} variant="outline" className="text-xs">{a.name}</Badge>)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(d)}><Edit2 className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(d.document_type_id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentTypes;
