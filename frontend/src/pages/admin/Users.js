import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import { Users, Plus, Search, Edit, Trash2, Loader2, UserCheck, UserX, RefreshCw } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminUsers = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    rut: '',
    company: '',
    activity_ids: []
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.filter(u => !u.is_admin));
      }
    } catch (error) {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API}/activities`);
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const initPredefinedRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/activities/predefined/init`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        fetchRoles();
      }
    } catch (error) {
      toast.error('Error al inicializar roles');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      if (editingUser) {
        const response = await fetch(`${API}/users/${editingUser.user_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            full_name: formData.full_name,
            company: formData.company || null,
            activity_ids: formData.activity_ids,
            is_active: true
          })
        });

        if (response.ok) {
          toast.success('Usuario actualizado');
          fetchUsers();
        } else {
          const error = await response.json();
          toast.error(error.detail || 'Error al actualizar');
        }
      } else {
        const response = await fetch(`${API}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            is_admin: false
          })
        });

        if (response.ok) {
          toast.success('Usuario creado');
          fetchUsers();
        } else {
          const error = await response.json();
          toast.error(error.detail || 'Error al crear usuario');
        }
      }

      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    // Support both old role_id and new role_ids
    let userRoleIds = user.activity_ids || [];
    if (!userRoleIds.length && user.role_id) {
      userRoleIds = [user.role_id];
    }
    
    setFormData({
      email: user.email,
      password: '',
      full_name: user.full_name || user.name || '',
      rut: user.rut || '',
      company: user.company || '',
      activity_ids: userRoleIds
    });
    setDialogOpen(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Usuario eliminado');
        fetchUsers();
      } else {
        toast.error('Error al eliminar usuario');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  const toggleStatus = async (user) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/users/${user.user_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !user.is_active })
      });

      if (response.ok) {
        toast.success(`Usuario ${user.is_active ? 'desactivado' : 'activado'}`);
        fetchUsers();
      }
    } catch (error) {
      toast.error('Error al cambiar estado');
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      rut: '',
      company: '',
      activity_ids: []
    });
  };

  const toggleRole = (roleId) => {
    setFormData(prev => ({
      ...prev,
      activity_ids: prev.activity_ids.includes(roleId)
        ? prev.activity_ids.filter(id => id !== roleId)
        : [...prev.activity_ids, roleId]
    }));
  };

  const getRoleNames = (user) => {
    // Support both old role_id and new role_ids
    let userRoleIds = user.activity_ids || [];
    if (!userRoleIds.length && user.role_id) {
      userRoleIds = [user.role_id];
    }
    
    if (!userRoleIds.length) return 'Sin rol/actividad';
    
    return userRoleIds
      .map(id => roles.find(r => r.role_id === id)?.name || id)
      .join(', ');
  };

  const filteredUsers = users.filter(user => {
    const search = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(search) ||
      user.name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.rut?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-users">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Usuarios
          </h1>
          <p className="text-slate-600 mt-1">Gestiona los alumnos de la plataforma</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={initPredefinedRoles}
            className="text-blue-700 border-blue-200 hover:bg-blue-50"
            data-testid="init-roles-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Inicializar Roles
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="add-user-btn">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
                <DialogDescription>
                  {editingUser ? 'Actualiza los datos del usuario' : 'Ingresa los datos del nuevo usuario'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre completo *</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    data-testid="user-fullname-input"
                  />
                </div>
                {!editingUser && (
                  <>
                    <div className="space-y-2">
                      <Label>RUT *</Label>
                      <Input
                        value={formData.rut}
                        onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                        placeholder="12345678-9"
                        required
                        data-testid="user-rut-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        data-testid="user-email-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Contraseña *</Label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        data-testid="user-password-input"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Input
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    data-testid="user-company-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Roles/Actividades</Label>
                  <p className="text-xs text-slate-500 mb-2">Selecciona uno o más roles/actividades</p>
                  <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-2 bg-slate-50">
                    {roles.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">
                        No hay roles disponibles. Haz clic en "Inicializar Roles" para crear los roles predefinidos.
                      </p>
                    ) : (
                      roles.map((role) => (
                        <div key={role.activity_id} className="flex items-center space-x-2 p-2 rounded hover:bg-white">
                          <Checkbox
                            id={role.activity_id}
                            checked={formData.activity_ids.includes(role.activity_id)}
                            onCheckedChange={() => toggleRole(role.activity_id)}
                            data-testid={`role-checkbox-${role.activity_id}`}
                          />
                          <label
                            htmlFor={role.activity_id}
                            className="text-sm text-slate-700 cursor-pointer flex-1"
                          >
                            {role.name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  {formData.activity_ids.length > 0 && (
                    <p className="text-xs text-blue-700 mt-1">
                      {formData.activity_ids.length} rol(es)/actividad(es) seleccionado(s)
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="user-submit-btn">
                    {editingUser ? 'Actualizar' : 'Crear'}
                  </Button>
                </DialogFooter>
              </form>
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
              placeholder="Buscar por nombre, email o RUT..."
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
                <TableHead>Usuario</TableHead>
                <TableHead>RUT</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Rol/Actividad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No se encontraron usuarios
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.user_id} data-testid={`user-row-${user.user_id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{user.full_name || user.name}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{user.rut || '-'}</TableCell>
                    <TableCell>{user.company || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {getRoleNames(user).split(', ').map((name, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs text-slate-600">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={user.is_active !== false ? 'bg-green-500' : 'bg-slate-400'}
                      >
                        {user.is_active !== false ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleStatus(user)}
                          title={user.is_active !== false ? 'Desactivar' : 'Activar'}
                          data-testid={`toggle-user-${user.user_id}`}
                        >
                          {user.is_active !== false ? (
                            <UserX className="w-4 h-4 text-amber-500" />
                          ) : (
                            <UserCheck className="w-4 h-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(user)}
                          data-testid={`edit-user-${user.user_id}`}
                        >
                          <Edit className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(user.user_id)}
                          data-testid={`delete-user-${user.user_id}`}
                        >
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
    </div>
  );
};

export default AdminUsers;
