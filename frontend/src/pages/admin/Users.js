import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '../../components/ui/dialog';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from '../../components/ui/sheet';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import { toast } from 'sonner';
import {
  Plus, Search, Trash2, Loader2, UserCheck, UserX, Settings, Upload, Download,
  CheckCircle, XCircle, FileWarning, KeyRound,
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CSV_TEMPLATE = `email,password,full_name,rut,area_names,activity_names
bulk1@miempresa.com,,Juan Pérez,11.111.111-1,Operaciones Mina,Trabajo en Altura
bulk2@miempresa.com,,María López,22.222.222-2,Mantenimiento,Conducción;Soldadura
`;

const AdminUsers = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Create-user dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', full_name: '', rut: '' });
  const [creating, setCreating] = useState(false);
  const [createdInfo, setCreatedInfo] = useState(null); // {email, initial_password}

  // Configure dialog
  const [configOpen, setConfigOpen] = useState(false);
  const [configUser, setConfigUser] = useState(null);
  const [configForm, setConfigForm] = useState({ full_name: '', role_id: '', area_ids: [], activity_ids: [] });
  const [savingConfig, setSavingConfig] = useState(false);
  const [resetInfo, setResetInfo] = useState(null); // string with new password after reset
  const [resetting, setResetting] = useState(false);

  // Bulk import sheet
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const token = localStorage.getItem('token');
  const authHeaders = { Authorization: `Bearer ${token}` };
  const jsonHeaders = { ...authHeaders, 'Content-Type': 'application/json' };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [u, a, ar, jr] = await Promise.all([
        fetch(`${API}/users`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API}/activities`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API}/areas`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API}/job-roles`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : [])),
      ]);
      setUsers((u || []).filter((x) => !x.is_admin && !x.is_super_admin));
      setActivities(a || []);
      setAreas(ar || []);
      setJobRoles(jr || []);
    } catch {
      toast.error('Error al cargar trabajadores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const cargoNameById = useMemo(
    () => jobRoles.reduce((acc, r) => { acc[r.role_id] = r.name; return acc; }, {}),
    [jobRoles],
  );

  const filteredUsers = users.filter((u) => {
    const s = searchTerm.toLowerCase();
    return (
      (u.full_name || '').toLowerCase().includes(s) ||
      (u.email || '').toLowerCase().includes(s) ||
      (u.rut || '').toLowerCase().includes(s) ||
      (cargoNameById[u.role_id] || '').toLowerCase().includes(s)
    );
  });

  // ----- create -----
  const submitCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const r = await fetch(`${API}/users`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({
          email: createForm.email.trim().toLowerCase(),
          full_name: createForm.full_name.trim(),
          rut: createForm.rut || null,
          is_admin: false,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || 'Error al crear trabajador');
      }
      const data = await r.json();
      setCreatedInfo({ email: data.email, initial_password: data.initial_password });
      toast.success(`Trabajador creado · contraseña inicial: ${data.initial_password}`);
      setCreateForm({ email: '', full_name: '', rut: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  // ----- configure -----
  const openConfig = (u) => {
    setConfigUser(u);
    setConfigForm({
      full_name: u.full_name || '',
      role_id: u.role_id || '',
      area_ids: u.area_ids || [],
      activity_ids: u.activity_ids || [],
    });
    setResetInfo(null);
    setConfigOpen(true);
  };

  const resetPassword = async () => {
    if (!configUser) return;
    if (!window.confirm(`Restablecer la contraseña de ${configUser.full_name} a los primeros 5 dígitos de su RUT?`)) return;
    setResetting(true);
    try {
      const r = await fetch(`${API}/users/${configUser.user_id}/reset-password`, {
        method: 'POST', headers: jsonHeaders, body: JSON.stringify({}),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || 'Error al restablecer');
      }
      const data = await r.json();
      setResetInfo(data.new_password);
      toast.success(`Contraseña restablecida: ${data.new_password}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResetting(false);
    }
  };

  const toggleInList = (key, id) => {
    setConfigForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(id) ? prev[key].filter((x) => x !== id) : [...prev[key], id],
    }));
  };

  const submitConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const r = await fetch(`${API}/users/${configUser.user_id}`, {
        method: 'PUT', headers: jsonHeaders,
        body: JSON.stringify({
          full_name: configForm.full_name,
          role_id: configForm.role_id || null,
          area_ids: configForm.area_ids,
          activity_ids: configForm.activity_ids,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || 'Error al guardar');
      }
      toast.success('Trabajador actualizado');
      setConfigOpen(false);
      setConfigUser(null);
      fetchAll();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  // ----- delete / toggle -----
  const remove = async (u) => {
    if (!window.confirm(`¿Eliminar al trabajador ${u.full_name}?`)) return;
    const r = await fetch(`${API}/users/${u.user_id}`, { method: 'DELETE', headers: authHeaders });
    if (r.ok) { toast.success('Trabajador eliminado'); fetchAll(); }
    else toast.error('Error al eliminar');
  };

  const toggleStatus = async (u) => {
    const r = await fetch(`${API}/users/${u.user_id}`, {
      method: 'PUT', headers: jsonHeaders,
      body: JSON.stringify({ is_active: !u.is_active }),
    });
    if (r.ok) { toast.success(`Trabajador ${u.is_active ? 'desactivado' : 'activado'}`); fetchAll(); }
    else toast.error('Error');
  };

  // ----- bulk import -----
  const submitImport = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const r = await fetch(`${API}/users/bulk-import`, { method: 'POST', headers: authHeaders, body: fd });
      if (!r.ok) throw new Error('Error en importación');
      const data = await r.json();
      setImportResult(data);
      toast.success(`Importados: ${data.summary.created} | Omitidos: ${data.summary.skipped} | Errores: ${data.summary.errors}`);
      fetchAll();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'plantilla_trabajadores.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6" data-testid="admin-users">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Trabajadores</h1>
          <p className="text-slate-600 mt-1">Gestiona los trabajadores de tu empresa y configura cargo, áreas y actividades.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Bulk import sheet */}
          <Sheet open={importOpen} onOpenChange={setImportOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" data-testid="bulk-import-btn">
                <Upload className="w-4 h-4 mr-2" /> Carga Masiva
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Importar trabajadores (CSV)</SheetTitle>
                <SheetDescription>Sube un archivo CSV con tus trabajadores. Las áreas y actividades deben existir previamente.</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Formato esperado</p>
                  <code className="block p-2 rounded bg-slate-900 text-blue-300 text-xs font-mono overflow-x-auto">
                    email,password,full_name,rut,area_names,activity_names
                  </code>
                  <ul className="text-xs text-slate-600 list-disc pl-5 space-y-1 mt-2">
                    <li><strong>area_names</strong> y <strong>activity_names</strong> se separan con <code>;</code>.</li>
                    <li>Los nombres deben coincidir con áreas/actividades ya creadas.</li>
                    <li>Si <strong>password</strong> está vacío, se usa automáticamente los primeros 5 dígitos del RUT.</li>
                    <li>Si un email ya existe, esa fila se omite.</li>
                  </ul>
                  <Button variant="outline" size="sm" onClick={downloadTemplate} className="mt-3" data-testid="download-template-btn">
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Descargar plantilla
                  </Button>
                </div>

                <form onSubmit={submitImport} className="space-y-3">
                  <div>
                    <Label>Archivo CSV</Label>
                    <Input type="file" accept=".csv" required onChange={(e) => setImportFile(e.target.files[0])} data-testid="bulk-import-file" />
                  </div>
                  <Button type="submit" disabled={importing || !importFile} className="bg-blue-600 hover:bg-blue-700 w-full" data-testid="bulk-import-submit">
                    {importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</> : <><Upload className="w-4 h-4 mr-2" /> Importar</>}
                  </Button>
                </form>

                {importResult && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                        <CheckCircle className="w-4 h-4" />
                        <p className="text-[10px] mt-1">Creados</p>
                        <p className="text-lg font-bold">{importResult.summary.created}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
                        <FileWarning className="w-4 h-4" />
                        <p className="text-[10px] mt-1">Omitidos</p>
                        <p className="text-lg font-bold">{importResult.summary.skipped}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-red-50 text-red-700">
                        <XCircle className="w-4 h-4" />
                        <p className="text-[10px] mt-1">Errores</p>
                        <p className="text-lg font-bold">{importResult.summary.errors}</p>
                      </div>
                    </div>
                    {importResult.errors?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-red-700 mb-1">Errores:</p>
                        <ul className="text-xs space-y-0.5 max-h-40 overflow-y-auto">
                          {importResult.errors.map((e, i) => <li key={i} className="text-red-600">Fila {e.row}: {e.error}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Create dialog */}
          <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setCreatedInfo(null); }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="add-user-btn">
                <Plus className="w-4 h-4 mr-2" /> Nuevo Trabajador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo Trabajador</DialogTitle>
                <DialogDescription>Crea al trabajador con sus datos básicos. Luego usa &quot;Configurar&quot; para asignarle cargo, áreas y actividades.</DialogDescription>
              </DialogHeader>

              {createdInfo ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4" data-testid="created-info">
                    <p className="text-sm font-semibold text-emerald-800">Trabajador creado correctamente</p>
                    <p className="text-xs text-emerald-700 mt-1">Comparte estas credenciales con el trabajador:</p>
                    <div className="mt-3 space-y-1 font-mono text-xs">
                      <p><span className="text-slate-500">Email:</span> <span className="text-slate-900">{createdInfo.email}</span></p>
                      <p><span className="text-slate-500">Contraseña inicial:</span> <span className="text-slate-900 font-bold" data-testid="initial-password-value">{createdInfo.initial_password}</span></p>
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-3">El trabajador podrá iniciar sesión con estos datos.</p>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => { setCreatedInfo(null); }} variant="outline">Crear otro</Button>
                    <Button onClick={() => { setCreatedInfo(null); setCreateOpen(false); }} className="bg-blue-600 hover:bg-blue-700">Cerrar</Button>
                  </DialogFooter>
                </div>
              ) : (
                <form onSubmit={submitCreate} className="space-y-3">
                  <div>
                    <Label>Nombre completo *</Label>
                    <Input required value={createForm.full_name} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} data-testid="user-fullname-input" />
                  </div>
                  <div>
                    <Label>RUT *</Label>
                    <Input required placeholder="12.345.678-9" value={createForm.rut} onChange={(e) => setCreateForm({ ...createForm, rut: e.target.value })} data-testid="user-rut-input" />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input required type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} data-testid="user-email-input" />
                  </div>
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                    <p className="font-semibold mb-0.5">Contraseña automática</p>
                    <p className="text-blue-800">La contraseña inicial se asigna automáticamente con los <strong>primeros 5 dígitos del RUT</strong> (sin puntos ni guion). El trabajador podrá cambiarla luego.</p>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={creating} className="bg-blue-600 hover:bg-blue-700" data-testid="user-submit-btn">
                      {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Crear
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card className="border-slate-200">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar por RUT, nombre, email o cargo..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="search-users-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RUT</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                    No hay trabajadores que coincidan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.user_id} data-testid={`user-row-${u.user_id}`}>
                    <TableCell className="font-mono text-sm">{u.rut || '-'}</TableCell>
                    <TableCell>
                      <p className="font-medium text-slate-900">{u.full_name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </TableCell>
                    <TableCell>
                      {u.role_id && cargoNameById[u.role_id] ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{cargoNameById[u.role_id]}</Badge>
                      ) : (
                        <span className="text-xs text-slate-400">Sin cargo</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={u.is_active !== false ? 'bg-green-500' : 'bg-slate-400'}>
                        {u.is_active !== false ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => openConfig(u)} data-testid={`configure-user-${u.user_id}`}>
                          <Settings className="w-3.5 h-3.5 mr-1.5" /> Configurar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleStatus(u)} title={u.is_active !== false ? 'Desactivar' : 'Activar'} data-testid={`toggle-user-${u.user_id}`}>
                          {u.is_active !== false ? <UserX className="w-4 h-4 text-amber-500" /> : <UserCheck className="w-4 h-4 text-green-500" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(u)} data-testid={`delete-user-${u.user_id}`}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Configure dialog */}
      <Dialog open={configOpen} onOpenChange={(o) => { setConfigOpen(o); if (!o) setConfigUser(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Trabajador</DialogTitle>
            <DialogDescription>
              {configUser ? `${configUser.full_name} · RUT ${configUser.rut || '-'}` : ''}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitConfig} className="space-y-4">
            <div>
              <Label>Nombre completo</Label>
              <Input value={configForm.full_name} onChange={(e) => setConfigForm({ ...configForm, full_name: e.target.value })} data-testid="config-fullname-input" />
            </div>

            <div>
              <Label>Cargo (Rol laboral)</Label>
              <select
                value={configForm.role_id}
                onChange={(e) => setConfigForm({ ...configForm, role_id: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
                data-testid="config-cargo-select"
              >
                <option value="">— Sin cargo asignado —</option>
                {jobRoles.map((r) => (
                  <option key={r.role_id} value={r.role_id}>{r.name}</option>
                ))}
              </select>
              {jobRoles.length === 0 && (
                <p className="text-xs text-slate-500 mt-1">No hay cargos creados aún. Ve a <a href="/admin/job-roles" className="text-blue-600 underline">Cargos</a> para crear el primero.</p>
              )}
            </div>

            <div>
              <Label>Áreas</Label>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-1.5 bg-slate-50">
                {areas.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-2">No hay áreas creadas.</p>
                ) : areas.map((a) => (
                  <div key={a.area_id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`area-${a.area_id}`}
                      checked={configForm.area_ids.includes(a.area_id)}
                      onCheckedChange={() => toggleInList('area_ids', a.area_id)}
                      data-testid={`config-area-${a.area_id}`}
                    />
                    <label htmlFor={`area-${a.area_id}`} className="text-sm text-slate-700 cursor-pointer flex-1">{a.name}</label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Actividades</Label>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-1.5 bg-slate-50">
                {activities.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-2">No hay actividades creadas.</p>
                ) : activities.map((act) => (
                  <div key={act.activity_id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`act-${act.activity_id}`}
                      checked={configForm.activity_ids.includes(act.activity_id)}
                      onCheckedChange={() => toggleInList('activity_ids', act.activity_id)}
                      data-testid={`config-activity-${act.activity_id}`}
                    />
                    <label htmlFor={`act-${act.activity_id}`} className="text-sm text-slate-700 cursor-pointer flex-1">{act.name}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" /> Contraseña
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5">Resetea la contraseña a los <strong>primeros 5 dígitos del RUT</strong>.</p>
                  {resetInfo && (
                    <p className="mt-2 text-xs font-mono text-amber-900" data-testid="reset-password-result">
                      Nueva contraseña: <strong>{resetInfo}</strong>
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-amber-300 text-amber-900 hover:bg-amber-100 shrink-0"
                  onClick={resetPassword}
                  disabled={resetting}
                  data-testid="reset-password-btn"
                >
                  {resetting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5 mr-1.5" />}
                  Restablecer
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfigOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={savingConfig} className="bg-blue-600 hover:bg-blue-700" data-testid="config-submit-btn">
                {savingConfig && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
