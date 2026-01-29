import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, PlayCircle, FileText, Clock, Award, CheckCircle, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StudentCourse = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [hasEvaluation, setHasEvaluation] = useState(false);

  useEffect(() => {
    fetchCourse();
    checkEvaluation();
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
      } else {
        toast.error('Curso no encontrado');
        navigate('/student');
      }
    } catch (error) {
      toast.error('Error al cargar curso');
    } finally {
      setLoading(false);
    }
  };

  const checkEvaluation = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/evaluations/course/${courseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setHasEvaluation(response.ok);
    } catch (error) {
      setHasEvaluation(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="space-y-6" data-testid="student-course">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/student')}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </div>

      {/* Course Info */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <Badge variant="secondary" className="bg-white/20 text-white mb-3 capitalize">
              {course.training_type}
            </Badge>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {course.name}
            </h1>
            <p className="text-orange-100 max-w-2xl">{course.description}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-orange-100">
              <Clock className="w-5 h-5" />
              <span className="text-xl font-semibold">{course.hours} horas</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video */}
          {course.video_url && (
            <Card className="border-slate-200 overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-orange-500" />
                  Video del Curso
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="aspect-video bg-slate-900">
                  <iframe
                    src={course.video_url}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title={course.name}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {!course.video_url && (
            <Card className="border-slate-200">
              <CardContent className="py-12 text-center">
                <PlayCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Este curso no tiene video asociado</p>
              </CardContent>
            </Card>
          )}

          {/* Material */}
          {course.material_url && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  Material de Apoyo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Material del curso</p>
                      <p className="text-sm text-slate-500">PDF</p>
                    </div>
                  </div>
                  <a
                    href={`${BACKEND_URL}${course.material_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <Button variant="outline" data-testid="download-material-btn">
                      Descargar PDF
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Evaluation CTA */}
          <Card className="border-slate-200 border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-orange-500" />
                Evaluación
              </CardTitle>
              <CardDescription>
                Completa la evaluación para obtener tu certificado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasEvaluation ? (
                <Link to={`/student/evaluation/${courseId}`}>
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" data-testid="start-evaluation-btn">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Rendir Evaluación
                  </Button>
                </Link>
              ) : (
                <div className="text-center py-4">
                  <p className="text-slate-500 text-sm">
                    Este curso aún no tiene evaluación configurada
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Course Details */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Detalles del Curso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Duración</span>
                <span className="font-medium text-slate-900">{course.hours} horas</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Tipo</span>
                <Badge variant="outline" className="capitalize">{course.training_type}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Vigencia</span>
                <span className="font-medium text-slate-900">
                  {Math.round(course.validity_hours / 24 / 30)} meses
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentCourse;
