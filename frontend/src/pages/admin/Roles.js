import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { FolderTree, Plus, Edit, Trash2, Loader2, BookOpen, GripVertical, Eye, ArrowUp, ArrowDown, Lock, ChevronRight, Clock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminRoles = () => {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [courses, setCourses] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [curriculumDialogOpen, setCurriculumDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [curriculumData, setCurriculumData] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    course_ids: [],
    course_order: []
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

  const fetchCurriculum = async (roleId) => {
    try {
      const response = await fetch(`${API}/roles/${roleId}/curriculum`);
      if (response.ok) {
        const data = await response.json();
        setCurriculumData(data);
      }
    } catch (error) {
      toast.error('Error al cargar malla curricular');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const url = editingRole 
        ? `${API}/roles/${editingRole.role_id}` 
        : `${API}/roles`;
      
      const payload = {
        ...formData,
        course_order: formData.course_order.length > 0 ? formData.course_order : formData.course_ids
      };
      
      const response = await fetch(url, {
        method: editingRole ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
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
      course_ids: role.course_ids || [],
      course_order: role.course_order || role.course_ids || []
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
      course_ids: [],
      course_order: []
    });
  };

  const toggleCourse = (courseId) => {
    setFormData(prev => {
      const newCourseIds = prev.course_ids.includes(courseId)
        ? prev.course_ids.filter(id => id !== courseId)
        : [...prev.course_ids, courseId];
      
      // Update order: add new course at end, remove if unchecked
      let newOrder = prev.course_order.filter(id => newCourseIds.includes(id));
      if (!prev.course_ids.includes(courseId) && newCourseIds.includes(courseId)) {
        newOrder.push(courseId);
      }
      
      return {
        ...prev,
        course_ids: newCourseIds,
        course_order: newOrder
      };
    });
  };

  const moveCourseUp = (index) => {
    if (index === 0) return;
    setFormData(prev => {
      const newOrder = [...prev.course_order];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      return { ...prev, course_order: newOrder };
    });
  };

  const moveCourseDown = (index) => {
    setFormData(prev => {
      if (index === prev.course_order.length - 1) return prev;
      const newOrder = [...prev.course_order];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      return { ...prev, course_order: newOrder };
    });
  };

  const updateCoursePrerequisites = async (courseId, prerequisites) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prerequisites })
      });

      if (response.ok) {
        toast.success('Pre-requisitos actualizados');
        fetchCourses();
        if (selectedRole) {
          fetchCurriculum(selectedRole.role_id);
        }
      } else {
        toast.error('Error al actualizar pre-requisitos');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  const viewCurriculum = (role) => {
    setSelectedRole(role);
    fetchCurriculum(role.role_id);
    setCurriculumDialogOpen(true);
  };

  const getCourseName = (courseId) => {
    const course = courses.find(c => c.course_id === courseId);
    return course?.name || courseId;
  };

  const getCourseHours = (courseId) => {
    const course = courses.find(c => c.course_id === courseId);
    return course?.hours || 0;
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
            Roles/Actividades y Mallas Curriculares
          </h1>
          <p className="text-slate-600 mt-1">Define roles/actividades, asigna cursos y configura pre-requisitos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" data-testid="add-role-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Rol/Actividad
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRole ? 'Editar Rol/Actividad' : 'Nuevo Rol/Actividad'}</DialogTitle>
              <DialogDescription>
                Define el rol/actividad, selecciona cursos y establece el orden de la malla curricular
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción del rol..."
                    data-testid="role-description-input"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Course Selection */}
                <div className="space-y-2">
                  <Label>Seleccionar Cursos</Label>
                  <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-2 bg-slate-50">
                    {courses.length === 0 ? (
                      <p className="text-sm text-slate-500">No hay cursos disponibles</p>
                    ) : (
                      courses.map((course) => (
                        <div key={course.course_id} className="flex items-center space-x-2 p-2 rounded hover:bg-white">
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

                {/* Course Order */}
                <div className="space-y-2">
                  <Label>Orden de la Malla Curricular</Label>
                  <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-1 bg-slate-50">
                    {formData.course_order.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">
                        Selecciona cursos para definir el orden
                      </p>
                    ) : (
                      formData.course_order.map((courseId, index) => (
                        <div 
                          key={courseId} 
                          className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200"
                        >
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="flex-1 text-sm truncate">{getCourseName(courseId)}</span>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => moveCourseUp(index)}
                              disabled={index === 0}
                            >
                              <ArrowUp className="w-3 h-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => moveCourseDown(index)}
                              disabled={index === formData.course_order.length - 1}
                            >
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Usa las flechas para ordenar los cursos según deben completarse
                  </p>
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

      {/* Curriculum View Modal */}
      <Dialog open={curriculumDialogOpen} onOpenChange={setCurriculumDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-orange-500" />
              Malla Curricular: {selectedRole?.name}
            </DialogTitle>
            <DialogDescription>
              Vista de la línea de tiempo y configuración de pre-requisitos
            </DialogDescription>
          </DialogHeader>
          
          {curriculumData && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{curriculumData.curriculum.length}</p>
                  <p className="text-xs text-slate-600">Cursos</p>
                </div>
                <div className="w-px h-10 bg-orange-200"></div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{curriculumData.total_hours}</p>
                  <p className="text-xs text-slate-600">Horas Totales</p>
                </div>
              </div>

              {/* Timeline */}
              <div className="relative">
                {curriculumData.curriculum.map((course, index) => (
                  <div key={course.course_id} className="relative pl-8 pb-6 last:pb-0">
                    {/* Timeline Line */}
                    {index < curriculumData.curriculum.length - 1 && (
                      <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-orange-200"></div>
                    )}
                    
                    {/* Timeline Dot */}
                    <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold shadow-md">
                      {course.order}
                    </div>
                    
                    {/* Course Card */}
                    <Card className="border-slate-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900">{course.name}</h4>
                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{course.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <Badge variant="outline" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {course.hours}h
                              </Badge>
                              <Badge variant="secondary" className="text-xs capitalize">
                                {course.training_type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        {/* Prerequisites Section */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                              <Lock className="w-4 h-4" />
                              Pre-requisitos
                            </span>
                          </div>
                          
                          {course.prerequisite_names.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {course.prerequisite_names.map((name, i) => (
                                <Badge key={i} className="bg-amber-100 text-amber-700 text-xs">
                                  {name}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">Sin pre-requisitos (disponible desde el inicio)</p>
                          )}
                          
                          {/* Prerequisites Selector */}
                          <div className="mt-3">
                            <Label className="text-xs text-slate-500">Configurar pre-requisitos:</Label>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {curriculumData.curriculum
                                .filter(c => c.course_id !== course.course_id && c.order < course.order)
                                .map(prereqCourse => (
                                  <Button
                                    key={prereqCourse.course_id}
                                    type="button"
                                    variant={course.prerequisites.includes(prereqCourse.course_id) ? "default" : "outline"}
                                    size="sm"
                                    className={`text-xs h-7 ${course.prerequisites.includes(prereqCourse.course_id) ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                                    onClick={() => {
                                      const newPrereqs = course.prerequisites.includes(prereqCourse.course_id)
                                        ? course.prerequisites.filter(id => id !== prereqCourse.course_id)
                                        : [...course.prerequisites, prereqCourse.course_id];
                                      updateCoursePrerequisites(course.course_id, newPrereqs);
                                    }}
                                  >
                                    {prereqCourse.name}
                                  </Button>
                                ))}
                              {curriculumData.curriculum.filter(c => c.course_id !== course.course_id && c.order < course.order).length === 0 && (
                                <span className="text-xs text-slate-400">Este es el primer curso</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCurriculumDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                      onClick={() => viewCurriculum(role)}
                      title="Ver Malla Curricular"
                      data-testid={`view-curriculum-${role.role_id}`}
                    >
                      <Eye className="w-4 h-4 text-orange-500" />
                    </Button>
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
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Malla Curricular ({role.course_ids?.length || 0} cursos)
                  </p>
                  
                  {role.course_ids && role.course_ids.length > 0 ? (
                    <div className="space-y-1">
                      {(role.course_order || role.course_ids).slice(0, 3).map((courseId, index) => (
                        <div key={courseId} className="flex items-center gap-2 text-sm">
                          <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </div>
                          <span className="text-slate-600 truncate">{getCourseName(courseId)}</span>
                          <span className="text-slate-400 text-xs">({getCourseHours(courseId)}h)</span>
                        </div>
                      ))}
                      {role.course_ids.length > 3 && (
                        <p className="text-xs text-slate-400 pl-7">
                          + {role.course_ids.length - 3} cursos más
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Sin cursos asignados</p>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => viewCurriculum(role)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Línea de Tiempo
                  </Button>
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
