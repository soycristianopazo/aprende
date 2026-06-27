import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '../../components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2, Building } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Areas = () => {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchAreas = async () => {
    const r = await fetch(`${API}/areas`, { headers });
    if (r.ok) setAreas(await r.json());
    setLoading(false);
  };

  useEffect(() => { fetchAreas(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editing ? `${API}/areas/${editing.area_id}` : `${API}/areas`;
      const method = editing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers, body: JSON.stringify(form) });
      if (!r.ok) throw new Error((await r.json()).detail || 'Error');
      toast.success(editing ? 'Área actualizada' : 'Área creada');
      setDialogOpen(false); setEditing(null); setForm({ name: '', description: '' });
      fetchAreas();
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleEdit = (a) => { setEditing(a); setForm({ name: a.name, description: a.description || '' }); setDialogOpen(true); };
  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar área?')) return;
    const r = await fetch(`${API}/areas/${id}`, { method: 'DELETE', headers });
    if (r.ok) { toast.success('Eliminada'); fetchAreas(); }
    else toast.error('Error');
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Áreas</h1>
          <p className="text-sm text-slate-500">Áreas operativas de tu empresa (ej. "Operaciones Mina", "Mantenimiento").</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm({ name: '', description: '' }); } }}>
          <DialogTrigger asChild><Button className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" /> Nueva área</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar área' : 'Nueva área'}</DialogTitle>
              <DialogDescription>Áreas son agrupaciones operativas usadas para asignar cursos y documentos automáticamente.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><Label>Nombre</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Descripción</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
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
        <CardHeader className="pb-3"><CardTitle className="text-base">{areas.length} área(s)</CardTitle></CardHeader>
        <CardContent>
          {areas.length === 0 ? <p className="text-sm text-slate-500 text-center py-6">Aún no hay áreas configuradas.</p> : (
            <div className="divide-y divide-slate-200">
              {areas.map((a) => (
                <div key={a.area_id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><Building className="w-4 h-4 text-blue-700" /></div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{a.name}</p>
                      {a.description && <p className="text-xs text-slate-500 line-clamp-2">{a.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(a)}><Edit2 className="w-4 h-4" /></Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(a.area_id)}><Trash2 className="w-4 h-4" /></Button>
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

export default Areas;
