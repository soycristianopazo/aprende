import { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '../../components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import { Briefcase, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const JobRoles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/job-roles`, { headers });
      if (r.ok) setRoles(await r.json());
    } catch (err) {
      toast.error('Error al cargar cargos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoles(); }, []);

  const resetForm = () => { setEditing(null); setForm({ name: '', description: '' }); };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editing ? `${API}/job-roles/${editing.role_id}` : `${API}/job-roles`;
      const method = editing ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method, headers,
        body: JSON.stringify({ name: form.name.trim(), description: form.description || null }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || 'Error');
      }
      toast.success(editing ? 'Cargo actualizado' : 'Cargo creado');
      setDialogOpen(false);
      resetForm();
      fetchRoles();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (role) => {
    setEditing(role);
    setForm({ name: role.name, description: role.description || '' });
    setDialogOpen(true);
  };

  const remove = async (role) => {
    if (!window.confirm(`¿Eliminar el cargo "${role.name}"? Los trabajadores asignados quedarán sin cargo.`)) return;
    const r = await fetch(`${API}/job-roles/${role.role_id}`, { method: 'DELETE', headers });
    if (r.ok) { toast.success('Cargo eliminado'); fetchRoles(); }
    else toast.error('Error al eliminar');
  };

  return (
    <div className="space-y-6" data-testid="admin-job-roles">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Cargos</h1>
          <p className="text-slate-600 mt-1">Mantenedor de cargos laborales (Soldador, Eléctrico, Rigger, etc.) que se asignan a tus trabajadores.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="new-jobrole-btn">
              <Plus className="w-4 h-4 mr-2" /> Nuevo Cargo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Cargo' : 'Nuevo Cargo'}</DialogTitle>
              <DialogDescription>Define el cargo laboral. Ejemplos: Soldador, Eléctrico, Rigger, Operador, Supervisor.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label>Nombre del cargo *</Label>
                <Input
                  required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Soldador"
                  data-testid="jobrole-name-input"
                />
              </div>
              <div>
                <Label>Descripción (opcional)</Label>
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700" data-testid="jobrole-submit-btn">
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {editing ? 'Guardar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : roles.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-medium">Aún no hay cargos definidos.</p>
              <p className="text-xs text-slate-400 mt-1">Crea el primer cargo (Soldador, Eléctrico, Rigger...) para empezar a clasificar a tus trabajadores.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((r) => (
                  <TableRow key={r.role_id} data-testid={`jobrole-row-${r.role_id}`}>
                    <TableCell className="font-medium text-slate-900">{r.name}</TableCell>
                    <TableCell className="text-sm text-slate-600">{r.description || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => startEdit(r)} data-testid={`edit-jobrole-${r.role_id}`}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => remove(r)} data-testid={`delete-jobrole-${r.role_id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JobRoles;
