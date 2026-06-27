import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '../../components/ui/dialog';
import { Building2, Plus, Trash2, UserPlus, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const emptyForm = { name: '', rut: '', contact_email: '', contact_phone: '', address: '', primary_color: '#2563EB', secondary_color: '#3B82F6' };
const emptyAdmin = { email: '', password: '', full_name: '', rut: '' };

const SuperAdminCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [openAdmin, setOpenAdmin] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [adminForm, setAdminForm] = useState(emptyAdmin);
  const [adminTarget, setAdminTarget] = useState(null);
  const [admins, setAdmins] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchCompanies = async () => {
    const r = await fetch(`${API}/superadmin/companies`, { headers });
    if (r.ok) {
      const data = await r.json();
      setCompanies(data);
      // pre-fetch admins for each
      const all = {};
      for (const c of data) {
        const ar = await fetch(`${API}/superadmin/companies/${c.company_id}/admins`, { headers });
        if (ar.ok) all[c.company_id] = await ar.json();
      }
      setAdmins(all);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editing ? `${API}/superadmin/companies/${editing.company_id}` : `${API}/superadmin/companies`;
      const method = editing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers, body: JSON.stringify(form) });
      if (!r.ok) throw new Error((await r.json()).detail || 'Error');
      toast.success(editing ? 'Empresa actualizada' : 'Empresa creada');
      setOpenCreate(false);
      setEditing(null);
      setForm(emptyForm);
      fetchCompanies();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (companyId) => {
    if (!window.confirm('¿Eliminar empresa? Se borrarán TODOS sus datos.')) return;
    const r = await fetch(`${API}/superadmin/companies/${companyId}`, { method: 'DELETE', headers });
    if (r.ok) {
      toast.success('Empresa eliminada');
      fetchCompanies();
    } else {
      toast.error('No se pudo eliminar');
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/superadmin/companies/${adminTarget.company_id}/admin`, {
        method: 'POST', headers, body: JSON.stringify(adminForm),
      });
      if (!r.ok) throw new Error((await r.json()).detail || 'Error');
      toast.success('Admin creado para ' + adminTarget.name);
      setOpenAdmin(false);
      setAdminForm(emptyAdmin);
      setAdminTarget(null);
      fetchCompanies();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name || '', rut: c.rut || '', contact_email: c.contact_email || '',
      contact_phone: c.contact_phone || '', address: c.address || '',
      primary_color: c.primary_color || '#2563EB', secondary_color: c.secondary_color || '#3B82F6',
    });
    setOpenCreate(true);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Empresas</h1>
          <p className="text-sm text-slate-500">Crea y administra las empresas (tenants) de Aptiva.</p>
        </div>
        <Dialog open={openCreate} onOpenChange={(o) => { setOpenCreate(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Nueva empresa</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar empresa' : 'Nueva empresa'}</DialogTitle>
              <DialogDescription>Datos básicos del tenant.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label>Nombre</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>RUT</Label>
                  <Input value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })} />
                </div>
                <div>
                  <Label>Email contacto</Label>
                  <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Teléfono</Label>
                  <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                </div>
                <div>
                  <Label>Dirección</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Color primario</Label>
                  <Input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
                </div>
                <div>
                  <Label>Color secundario</Label>
                  <Input type="color" value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} />
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {companies.map((c) => (
          <Card key={c.company_id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-700" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <p className="text-xs text-slate-500">{c.rut || 'Sin RUT'}</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {c.is_active ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-slate-600">
                <p>{c.contact_email || 'Sin email'}</p>
                <p>{c.contact_phone || 'Sin teléfono'}</p>
              </div>
              <div className="text-xs">
                <p className="font-semibold text-slate-700 mb-1">Admins ({admins[c.company_id]?.length || 0}):</p>
                {(admins[c.company_id] || []).map((a) => (
                  <p key={a.user_id} className="text-slate-600">· {a.email}</p>
                ))}
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                  <Pencil className="w-4 h-4 mr-1" /> Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setAdminTarget(c); setAdminForm(emptyAdmin); setOpenAdmin(true); }}
                >
                  <UserPlus className="w-4 h-4 mr-1" /> +Admin
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(c.company_id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {companies.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-10 text-center text-sm text-slate-500">
              No hay empresas registradas. Crea la primera para empezar.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={openAdmin} onOpenChange={setOpenAdmin}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear admin para {adminTarget?.name}</DialogTitle>
            <DialogDescription>El admin gestionará todos los datos de esta empresa.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAdmin} className="space-y-3">
            <div>
              <Label>Nombre completo</Label>
              <Input required value={adminForm.full_name} onChange={(e) => setAdminForm({ ...adminForm, full_name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" required value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} />
            </div>
            <div>
              <Label>Contraseña</Label>
              <Input type="password" required minLength={6} value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} />
            </div>
            <div>
              <Label>RUT (opcional)</Label>
              <Input value={adminForm.rut} onChange={(e) => setAdminForm({ ...adminForm, rut: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Crear admin
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminCompanies;
