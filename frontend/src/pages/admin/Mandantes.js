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
  Plus, Edit2, Trash2, Loader2, Building2, FileSignature, Users as UsersIcon, ChevronDown, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-CL') : '—');

const Mandantes = () => {
  const [mandantes, setMandantes] = useState([]);
  const [contractsByMandante, setContractsByMandante] = useState({});
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  // Mandante dialog
  const [mandanteDialog, setMandanteDialog] = useState(false);
  const [editingMandante, setEditingMandante] = useState(null);
  const [mForm, setMForm] = useState({ name: '', rut: '', contact_email: '', contact_phone: '', address: '', notes: '' });

  // Contract dialog
  const [contractDialog, setContractDialog] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [targetMandanteId, setTargetMandanteId] = useState(null);
  const [cForm, setCForm] = useState({
    contract_number: '', glosa: '', start_date: '', end_date: '',
    status: 'active', notes: '', worker_ids: [],
  });

  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const refresh = async () => {
    const [m, w] = await Promise.all([
      fetch(`${API}/mandantes`, { headers }).then((r) => r.json()),
      fetch(`${API}/users`, { headers }).then((r) => r.json()),
    ]);
    setMandantes(m);
    setWorkers((w || []).filter((u) => !u.is_admin));
    // Fetch contracts grouped by mandante
    const grouped = {};
    if (m.length) {
      const all = await fetch(`${API}/contracts`, { headers }).then((r) => r.json());
      for (const c of all) {
        if (!grouped[c.mandante_id]) grouped[c.mandante_id] = [];
        grouped[c.mandante_id].push(c);
      }
    }
    setContractsByMandante(grouped);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const submitMandante = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = Object.fromEntries(Object.entries(mForm).map(([k, v]) => [k, v?.trim ? v.trim() : v]));
      const url = editingMandante ? `${API}/mandantes/${editingMandante.mandante_id}` : `${API}/mandantes`;
      const method = editingMandante ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error((await r.json()).detail || 'Error');
      toast.success(editingMandante ? 'Mandante actualizado' : 'Mandante creado');
      setMandanteDialog(false);
      setEditingMandante(null);
      setMForm({ name: '', rut: '', contact_email: '', contact_phone: '', address: '', notes: '' });
      refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitContract = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        mandante_id: targetMandanteId,
        contract_number: cForm.contract_number.trim(),
        glosa: cForm.glosa || null,
        start_date: cForm.start_date ? new Date(cForm.start_date).toISOString() : null,
        end_date: cForm.end_date ? new Date(cForm.end_date).toISOString() : null,
        status: cForm.status,
        notes: cForm.notes || null,
        worker_ids: cForm.worker_ids,
      };
      const url = editingContract ? `${API}/contracts/${editingContract.contract_id}` : `${API}/contracts`;
      const method = editingContract ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error((await r.json()).detail || 'Error');
      toast.success(editingContract ? 'Contrato actualizado' : 'Contrato creado');
      setContractDialog(false);
      setEditingContract(null);
      setCForm({ contract_number: '', glosa: '', start_date: '', end_date: '', status: 'active', notes: '', worker_ids: [] });
      refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMandante = async (id) => {
    if (!window.confirm('¿Eliminar mandante? Se eliminarán también sus contratos.')) return;
    const r = await fetch(`${API}/mandantes/${id}`, { method: 'DELETE', headers });
    if (r.ok) { toast.success('Mandante eliminado'); refresh(); } else toast.error('Error');
  };

  const deleteContract = async (id) => {
    if (!window.confirm('¿Eliminar contrato?')) return;
    const r = await fetch(`${API}/contracts/${id}`, { method: 'DELETE', headers });
    if (r.ok) { toast.success('Contrato eliminado'); refresh(); } else toast.error('Error');
  };

  const openNewContract = (mandanteId) => {
    setTargetMandanteId(mandanteId);
    setEditingContract(null);
    setCForm({ contract_number: '', glosa: '', start_date: '', end_date: '', status: 'active', notes: '', worker_ids: [] });
    setContractDialog(true);
  };

  const openEditContract = (c) => {
    setTargetMandanteId(c.mandante_id);
    setEditingContract(c);
    setCForm({
      contract_number: c.contract_number || '',
      glosa: c.glosa || '',
      start_date: c.start_date ? c.start_date.slice(0, 10) : '',
      end_date: c.end_date ? c.end_date.slice(0, 10) : '',
      status: c.status || 'active',
      notes: c.notes || '',
      worker_ids: c.worker_ids || [],
    });
    setContractDialog(true);
  };

  const workerNameById = useMemo(
    () => workers.reduce((acc, w) => { acc[w.user_id] = w.full_name || w.email; return acc; }, {}),
    [workers]
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6" data-testid="admin-mandantes">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mandantes y Contratos</h1>
          <p className="text-sm text-slate-500">Tus empresas mandantes y los contratos comerciales que tienes con cada una.</p>
        </div>
        <Dialog open={mandanteDialog} onOpenChange={(o) => { setMandanteDialog(o); if (!o) { setEditingMandante(null); setMForm({ name: '', rut: '', contact_email: '', contact_phone: '', address: '', notes: '' }); } }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" data-testid="new-mandante-btn"><Plus className="w-4 h-4 mr-2" /> Nuevo mandante</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMandante ? 'Editar mandante' : 'Nuevo mandante'}</DialogTitle>
              <DialogDescription>Datos comerciales del mandante.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submitMandante} className="space-y-3">
              <div><Label>Nombre *</Label><Input required value={mForm.name} onChange={(e) => setMForm({ ...mForm, name: e.target.value })} data-testid="mandante-name-input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>RUT</Label><Input value={mForm.rut} onChange={(e) => setMForm({ ...mForm, rut: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={mForm.contact_email} onChange={(e) => setMForm({ ...mForm, contact_email: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Teléfono</Label><Input value={mForm.contact_phone} onChange={(e) => setMForm({ ...mForm, contact_phone: e.target.value })} /></div>
                <div><Label>Dirección</Label><Input value={mForm.address} onChange={(e) => setMForm({ ...mForm, address: e.target.value })} /></div>
              </div>
              <div><Label>Notas</Label><Textarea rows={2} value={mForm.notes} onChange={(e) => setMForm({ ...mForm, notes: e.target.value })} /></div>
              <DialogFooter>
                <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700" data-testid="mandante-submit-btn">
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {editingMandante ? 'Guardar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {mandantes.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-sm text-slate-500">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-medium">Aún no tienes mandantes registrados.</p>
          <p className="text-xs text-slate-400 mt-1">Empieza creando tu primer mandante (Codelco, BHP, Enap, etc.).</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3" data-testid="mandantes-list">
          {mandantes.map((m) => {
            const contracts = contractsByMandante[m.mandante_id] || [];
            const isOpen = expanded === m.mandante_id;
            return (
              <Card key={m.mandante_id} data-testid={`mandante-${m.mandante_id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : m.mandante_id)}
                      className="flex items-start gap-3 flex-1 min-w-0 text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-blue-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">{m.name}</CardTitle>
                        <p className="text-xs text-slate-500">{m.rut || 'Sin RUT'} {m.contact_email && `· ${m.contact_email}`}</p>
                        <p className="text-xs text-blue-700 mt-1 flex items-center gap-1">
                          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          {contracts.length} contrato(s)
                        </p>
                      </div>
                    </button>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => { setEditingMandante(m); setMForm({ name: m.name || '', rut: m.rut || '', contact_email: m.contact_email || '', contact_phone: m.contact_phone || '', address: m.address || '', notes: m.notes || '' }); setMandanteDialog(true); }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => deleteMandante(m.mandante_id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isOpen && (
                  <CardContent className="border-t border-slate-100 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">Contratos</p>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => openNewContract(m.mandante_id)} data-testid={`new-contract-${m.mandante_id}`}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Nuevo contrato
                      </Button>
                    </div>
                    {contracts.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-6">Sin contratos para este mandante.</p>
                    ) : (
                      <div className="space-y-2">
                        {contracts.map((c) => (
                          <div key={c.contract_id} className="border border-slate-200 rounded-lg p-3 flex items-start justify-between gap-3" data-testid={`contract-${c.contract_id}`}>
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                <FileSignature className="w-4 h-4 text-blue-700" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  N° {c.contract_number}
                                  <Badge variant="outline" className={`ml-2 text-xs ${
                                    c.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    c.status === 'finished' ? 'bg-slate-100 text-slate-600' :
                                    'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}>
                                    {c.status === 'active' ? 'Vigente' : c.status === 'finished' ? 'Finalizado' : 'En pausa'}
                                  </Badge>
                                </p>
                                {c.glosa && <p className="text-xs text-slate-600 mt-0.5">{c.glosa}</p>}
                                <p className="text-xs text-slate-400 mt-1">
                                  {fmtDate(c.start_date)} → {fmtDate(c.end_date)}
                                </p>
                                {(c.worker_ids || []).length > 0 && (
                                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                                    <UsersIcon className="w-3 h-3 text-slate-400" />
                                    {(c.worker_ids || []).slice(0, 6).map((wid) => (
                                      <Badge key={wid} variant="outline" className="text-[10px]">{workerNameById[wid] || wid}</Badge>
                                    ))}
                                    {(c.worker_ids || []).length > 6 && (
                                      <span className="text-xs text-slate-400">+{c.worker_ids.length - 6}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <Button size="sm" variant="outline" onClick={() => openEditContract(c)} data-testid={`edit-contract-${c.contract_id}`}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => deleteContract(c.contract_id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Contract dialog */}
      <Dialog open={contractDialog} onOpenChange={(o) => { setContractDialog(o); if (!o) { setEditingContract(null); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingContract ? 'Editar contrato' : 'Nuevo contrato'}</DialogTitle>
            <DialogDescription>Define los datos del contrato y asigna a los trabajadores que participan.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitContract} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>N° de contrato *</Label><Input required value={cForm.contract_number} onChange={(e) => setCForm({ ...cForm, contract_number: e.target.value })} data-testid="contract-number-input" /></div>
              <div>
                <Label>Estado</Label>
                <select
                  value={cForm.status}
                  onChange={(e) => setCForm({ ...cForm, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
                  data-testid="contract-status-select"
                >
                  <option value="active">Vigente</option>
                  <option value="finished">Finalizado</option>
                  <option value="on_hold">En pausa</option>
                </select>
              </div>
            </div>
            <div><Label>Glosa</Label><Input value={cForm.glosa} onChange={(e) => setCForm({ ...cForm, glosa: e.target.value })} placeholder="Servicios de mantenimiento eléctrico" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Fecha inicio</Label><Input type="date" value={cForm.start_date} onChange={(e) => setCForm({ ...cForm, start_date: e.target.value })} /></div>
              <div><Label>Fecha término</Label><Input type="date" value={cForm.end_date} onChange={(e) => setCForm({ ...cForm, end_date: e.target.value })} /></div>
            </div>
            <div>
              <Label>Trabajadores asignados ({cForm.worker_ids.length})</Label>
              {workers.length === 0 ? (
                <p className="text-xs text-slate-400 mt-1">No hay trabajadores aún. Crea trabajadores en &quot;Trabajadores&quot;.</p>
              ) : (
                <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto p-2 space-y-1 mt-1">
                  {workers.map((w) => (
                    <label key={w.user_id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer">
                      <Checkbox
                        checked={cForm.worker_ids.includes(w.user_id)}
                        onCheckedChange={() => setCForm({
                          ...cForm,
                          worker_ids: cForm.worker_ids.includes(w.user_id)
                            ? cForm.worker_ids.filter((x) => x !== w.user_id)
                            : [...cForm.worker_ids, w.user_id],
                        })}
                        data-testid={`contract-worker-${w.user_id}`}
                      />
                      <span className="text-sm text-slate-700">{w.full_name || w.email}</span>
                      <span className="text-xs text-slate-400 ml-auto">{w.rut || ''}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div><Label>Notas</Label><Textarea rows={2} value={cForm.notes} onChange={(e) => setCForm({ ...cForm, notes: e.target.value })} /></div>
            <DialogFooter>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700" data-testid="contract-submit-btn">
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {editingContract ? 'Guardar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Mandantes;
