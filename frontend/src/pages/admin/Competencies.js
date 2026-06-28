import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '../../components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2, Award, Infinity as InfinityIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '../../components/ui/confirm';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const emptyForm = { name: '', description: '', validity_months: '' };

const Competencies = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const confirm = useConfirm();

  const fetchItems = async () => {
    try {
      const r = await fetch(`${API}/competencies`, { headers });
      if (r.ok) setItems(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description || '',
      validity_months: c.validity_months ? String(c.validity_months) : '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        validity_months: form.validity_months ? parseInt(form.validity_months, 10) : null,
      };
      const url = editing ? `${API}/competencies/${editing.competency_id}` : `${API}/competencies`;
      const method = editing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error((await r.json()).detail || 'Error');
      toast.success(editing ? 'Competencia actualizada' : 'Competencia creada');
      setDialogOpen(false);
      fetchItems();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: '¿Eliminar competencia?',
      description: 'Se removerán también los registros asociados de los trabajadores.',
      confirmText: 'Eliminar', destructive: true,
    });
    if (!ok) return;
    const r = await fetch(`${API}/competencies/${id}`, { method: 'DELETE', headers });
    if (r.ok) { toast.success('Competencia eliminada'); fetchItems(); }
    else toast.error('No se pudo eliminar');
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6" data-testid="admin-competencies">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Competencias</h1>
          <p className="text-sm text-slate-500">Catálogo de competencias requeridas en tu empresa. Asígnalas a actividades para que sean obligatorias.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={openCreate} data-testid="new-competency-btn">
              <Plus className="w-4 h-4 mr-2" /> Nueva competencia
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar competencia' : 'Nueva competencia'}</DialogTitle>
              <DialogDescription>Define una competencia y su vigencia (en meses).</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label>Nombre *</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="competency-name-input" />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>Vigencia (meses) — vacío = sin vencimiento</Label>
                <Input type="number" min="0" placeholder="24" value={form.validity_months} onChange={(e) => setForm({ ...form, validity_months: e.target.value })} data-testid="competency-validity-input" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700" data-testid="competency-submit-btn">
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editing ? 'Guardar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{items.length} competencia(s) configurada(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              Aún no hay competencias. Crea la primera para empezar a estructurar tu matriz.
            </p>
          ) : (
            <div className="divide-y divide-slate-200">
              {items.map((c) => (
                <div key={c.competency_id} className="py-3 flex items-center justify-between gap-3" data-testid={`competency-row-${c.competency_id}`}>
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Award className="w-4 h-4 text-blue-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
                      {c.description && <p className="text-xs text-slate-500 line-clamp-2">{c.description}</p>}
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        {c.validity_months ? (
                          <>Vigencia: {c.validity_months} mes(es)</>
                        ) : (
                          <><InfinityIcon className="w-3 h-3" /> Sin vencimiento</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openEdit(c)} data-testid={`edit-competency-${c.competency_id}`}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(c.competency_id)} data-testid={`delete-competency-${c.competency_id}`}>
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

export default Competencies;
