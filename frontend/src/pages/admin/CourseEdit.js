import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Save, Upload, Loader2, Video, FileText } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminCourseEdit = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [course, setCourse] = useState(null);
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
    fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/courses/${courseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCourse(data);
        setFormData({
          name: data.name || '',
          description: data.description || '',
          hours: data.hours || 8,
          validity_hours: data.validity_hours || 8760,
          training_type: data.training_type || 'e-learning',
          video_url: data.video_url || '',
          status: data.status || 'draft'
        });
      } else {
        toast.error('Curso no encontrado');
        navigate('/admin/courses');
      }
    } catch (error) {
      toast.error('Error al cargar curso');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Curso actualizado');
        fetchCourse();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Error al actualizar');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadMaterial = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')) {
      toast.error('Solo se permiten archivos PDF');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/courses/${courseId}/material`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        toast.success('Material subido correctamente');
        fetchCourse();
      } else {
        toast.error('Error al subir material');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-course-edit">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/courses')}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Editar Curso
          </h1>
          <p className="text-slate-600 mt-1">{course?.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Información del Curso</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del Curso *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="edit-course-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    required
                    data-testid="edit-course-description"
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
                      data-testid="edit-course-hours"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vigencia (horas)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.validity_hours}
                      onChange={(e) => setFormData({ ...formData, validity_hours: parseInt(e.target.value) })}
                      data-testid="edit-course-validity"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de capacitación</Label>
                    <Select
                      value={formData.training_type}
                      onValueChange={(value) => setFormData({ ...formData, training_type: value })}
                    >
                      <SelectTrigger data-testid="edit-course-type">
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
                    <Label>Estado</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger data-testid="edit-course-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Borrador</SelectItem>
                        <SelectItem value="published">Publicado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="bg-orange-500 hover:bg-orange-600"
                  disabled={saving}
                  data-testid="save-course-btn"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Content */}
        <div className="space-y-6">
          {/* Video */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5 text-orange-500" />
                Video del Curso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL de Vimeo</Label>
                <Input
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://player.vimeo.com/video/..."
                  data-testid="edit-course-video"
                />
              </div>
              {formData.video_url && (
                <div className="aspect-video rounded-lg overflow-hidden bg-slate-100">
                  <iframe
                    src={formData.video_url}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Material */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                Material de Apoyo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {course?.material_url ? (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-red-500" />
                      <span className="text-sm text-slate-600">Material PDF</span>
                    </div>
                    <a
                      href={`${BACKEND_URL}${course.material_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                    >
                      Ver PDF
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No hay material subido</p>
              )}
              <div>
                <Label htmlFor="material-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-orange-300 transition-colors">
                    {uploading ? (
                      <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-600">Subir PDF</p>
                        <p className="text-xs text-slate-400">Solo archivos PDF</p>
                      </>
                    )}
                  </div>
                </Label>
                <input
                  id="material-upload"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleUploadMaterial}
                  data-testid="upload-material-input"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminCourseEdit;
