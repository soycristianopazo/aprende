import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import { FolderTree, Plus, Edit, Trash2, Loader2, BookOpen } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminRoles = () => {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [courses, setCourses] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    course_ids: []
  });

  useEffect(() => {
    fetchRoles();
    fetchCourses();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API}/roles`);
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      toast.error('Error al cargar roles');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/courses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCourses(data);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const url = editingRole 
        ? `${API}/roles/${editingRole.role_id}` 
        : `${API}/roles`;
      
      const response = await fetch(url, {
        method: editingRole ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingRole ? 'Rol actualizado' : 'Rol creado');
        fetchRoles();
        setDialogOpen(false);
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Error al guardar rol');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      course_ids: role.course_ids || []
    });
    setDialogOpen(true);
  };

  const handleDelete = async (roleId) => {
    if (!window.confirm('¿Estás seguro de eliminar este rol?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/roles/${roleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Rol eliminado');
        fetchRoles();
      } else {
        toast.error('Error al eliminar rol');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  const resetForm = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      course_ids: []
    });
  };

  const toggleCourse = (courseId) => {
    setFormData(prev => ({
      ...prev,
      course_ids: prev.course_ids.includes(courseId)
        ? prev.course_ids.filter(id => id !== courseId)
        : [...prev.course_ids, courseId]
    }));
  };

  const getCourseName = (courseId) => {
    const course = courses.find(c => c.course_id === courseId);
    return course?.name || courseId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-roles">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Roles y Mallas Curriculares
          </h1>
          <p className="text-slate-600 mt-1">Define roles y asigna cursos obligatorios</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" data-testid="add-role-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Rol
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingRole ? 'Editar Rol' : 'Nuevo Rol'}</DialogTitle>
              <DialogDescription>
                Define el rol y selecciona los cursos de la malla curricular
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del Rol *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Operador, Supervisor"
                  required
                  data-testid="role-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del rol..."
                  rows={3}
                  data-testid="role-description-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Malla Curricular (Cursos obligatorios)</Label>
                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                  {courses.length === 0 ? (
                    <p className="text-sm text-slate-500">No hay cursos disponibles</p>
                  ) : (
                    courses.map((course) => (
                      <div key={course.course_id} className="flex items-center space-x-2">
                        <Checkbox
                          id={course.course_id}
                          checked={formData.course_ids.includes(course.course_id)}
                          onCheckedChange={() => toggleCourse(course.course_id)}
                          data-testid={`course-checkbox-${course.course_id}`}
                        />
                        <label
                          htmlFor={course.course_id}
                          className="text-sm text-slate-700 cursor-pointer flex-1"
                        >
                          {course.name}
                          <span className="text-slate-400 ml-2">({course.hours}h)</span>
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600" data-testid="role-submit-btn">
                  {editingRole ? 'Actualizar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.length === 0 ? (
          <Card className="col-span-full border-slate-200">
            <CardContent className="py-12 text-center">
              <FolderTree className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No hay roles definidos</p>
              <p className="text-sm text-slate-400 mt-1">Crea el primer rol para comenzar</p>
            </CardContent>
          </Card>
        ) : (
          roles.map((role) => (
            <Card key={role.role_id} className="border-slate-200 hover:shadow-md transition-shadow" data-testid={`role-card-${role.role_id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                    {role.description && (
                      <CardDescription className="mt-1">{role.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(role)}
                      data-testid={`edit-role-${role.role_id}`}
                    >
                      <Edit className="w-4 h-4 text-slate-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(role.role_id)}
                      data-testid={`delete-role-${role.role_id}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Malla Curricular ({role.course_ids?.length || 0} cursos)
                  </p>
                  {role.course_ids && role.course_ids.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {role.course_ids.map((courseId) => (
                        <Badge key={courseId} variant="secondary" className="text-xs">
                          {getCourseName(courseId)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Sin cursos asignados</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminRoles;
