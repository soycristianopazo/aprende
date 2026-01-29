import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import { GraduationCap, Plus, Search, Edit, Trash2, Loader2, PlayCircle, Eye, EyeOff, Clock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminCourses = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hours: 8,
    validity_hours: 8760,
    training_type: 'e-learning',
    video_url: '',
    status: 'draft'
  });

  useEffect(() => {
    fetchCourses();
  }, []);

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
      toast.error('Error al cargar cursos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API}/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Curso creado');
        fetchCourses();
        setDialogOpen(false);
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Error al crear curso');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  const handleDelete = async (courseId) => {
    if (!window.confirm('¿Estás seguro de eliminar este curso?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/courses/${courseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Curso eliminado');
        fetchCourses();
      } else {
        toast.error('Error al eliminar curso');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  const toggleStatus = async (course) => {
    try {
      const token = localStorage.getItem('token');
      const newStatus = course.status === 'published' ? 'draft' : 'published';
      
      const response = await fetch(`${API}/courses/${course.course_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast.success(`Curso ${newStatus === 'published' ? 'publicado' : 'despublicado'}`);
        fetchCourses();
      }
    } catch (error) {
      toast.error('Error al cambiar estado');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      hours: 8,
      validity_hours: 8760,
      training_type: 'e-learning',
      video_url: '',
      status: 'draft'
    });
  };

  const filteredCourses = courses.filter(course => {
    const search = searchTerm.toLowerCase();
    return course.name?.toLowerCase().includes(search) ||
           course.description?.toLowerCase().includes(search);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-courses">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Cursos
          </h1>
          <p className="text-slate-600 mt-1">Gestiona los cursos de capacitación</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" data-testid="add-course-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Curso
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo Curso</DialogTitle>
              <DialogDescription>
                Crea un nuevo curso de capacitación
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del Curso *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Seguridad Industrial"
                  required
                  data-testid="course-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del curso..."
                  rows={3}
                  required
                  data-testid="course-description-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Horas de capacitación *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: parseInt(e.target.value) })}
                    required
                    data-testid="course-hours-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vigencia (horas)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.validity_hours}
                    onChange={(e) => setFormData({ ...formData, validity_hours: parseInt(e.target.value) })}
                    data-testid="course-validity-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tipo de capacitación</Label>
                <Select
                  value={formData.training_type}
                  onValueChange={(value) => setFormData({ ...formData, training_type: value })}
                >
                  <SelectTrigger data-testid="course-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="e-learning">E-Learning</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="mixta">Mixta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>URL del Video (Vimeo)</Label>
                <Input
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://player.vimeo.com/video/..."
                  data-testid="course-video-input"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600" data-testid="course-submit-btn">
                  Crear Curso
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="border-slate-200">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar cursos..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="search-courses-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Courses Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    No se encontraron cursos
                  </TableCell>
                </TableRow>
              ) : (
                filteredCourses.map((course) => (
                  <TableRow key={course.course_id} data-testid={`course-row-${course.course_id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                          <PlayCircle className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{course.name}</p>
                          <p className="text-sm text-slate-500 line-clamp-1">{course.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {course.training_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-600">
                        <Clock className="w-4 h-4" />
                        {course.hours}h
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={course.status === 'published' ? 'bg-green-500' : 'bg-slate-400'}>
                        {course.status === 'published' ? 'Publicado' : 'Borrador'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleStatus(course)}
                          title={course.status === 'published' ? 'Despublicar' : 'Publicar'}
                          data-testid={`toggle-course-${course.course_id}`}
                        >
                          {course.status === 'published' ? (
                            <EyeOff className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Eye className="w-4 h-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/admin/courses/${course.course_id}/edit`)}
                          data-testid={`edit-course-${course.course_id}`}
                        >
                          <Edit className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(course.course_id)}
                          data-testid={`delete-course-${course.course_id}`}
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

export default AdminCourses;
