import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { BookOpen, Award, Clock, PlayCircle, CheckCircle, Loader2, ArrowRight, Lock, AlertCircle, FolderTree, ChevronRight } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StudentDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(null);
  const [roadmapOpen, setRoadmapOpen] = useState(false);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/student/progress`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProgress(data);
      }
    } catch (error) {
      toast.error('Error al cargar progreso');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="student-dashboard">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
          ¡Hola, {user?.full_name || user?.name || 'Estudiante'}!
        </h1>
        <p className="text-blue-100 mb-6">
          {progress?.role_names ? `Rol/Actividad: ${progress.role_names}` : 'Continúa tu formación y obtén tus certificados'}
        </p>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold">{progress?.completed_courses || 0}</p>
            <p className="text-blue-200 text-sm">Completados</p>
          </div>
          <div className="w-px h-12 bg-blue-400"></div>
          <div className="text-center">
            <p className="text-3xl font-bold">{progress?.total_courses || 0}</p>
            <p className="text-blue-200 text-sm">Total Cursos</p>
          </div>
          <div className="w-px h-12 bg-blue-400"></div>
          <div className="text-center">
            <p className="text-3xl font-bold">{progress?.completion_percentage || 0}%</p>
            <p className="text-blue-200 text-sm">Progreso</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {progress?.total_courses > 0 && (
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Progreso de la Malla Curricular</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">
                  {progress?.completed_courses} de {progress?.total_courses} cursos
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setRoadmapOpen(true)}
                  className="text-blue-700 border-blue-200 hover:bg-blue-50"
                  data-testid="view-roadmap-btn"
                >
                  <FolderTree className="w-4 h-4 mr-2" />
                  Ver Ruta de Aprendizaje
                </Button>
              </div>
            </div>
            <Progress value={progress?.completion_percentage || 0} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Roadmap Modal */}
      <Dialog open={roadmapOpen} onOpenChange={setRoadmapOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-blue-600" />
              Tu Ruta de Aprendizaje
            </DialogTitle>
            <DialogDescription>
              {progress?.role_names && `Malla curricular para: ${progress.role_names}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative py-4">
            {progress?.courses?.map((item, index) => (
              <div key={item.course.course_id} className="relative pl-10 pb-8 last:pb-0">
                {/* Timeline Line */}
                {index < progress.courses.length - 1 && (
                  <div className={`absolute left-[18px] top-10 bottom-0 w-0.5 ${
                    item.is_completed ? 'bg-green-300' : item.is_locked ? 'bg-slate-200' : 'bg-blue-200'
                  }`}></div>
                )}
                
                {/* Timeline Dot */}
                <div className={`absolute left-0 top-1 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-md ${
                  item.is_completed 
                    ? 'bg-green-500 text-white' 
                    : item.is_locked 
                      ? 'bg-slate-300 text-slate-600' 
                      : 'bg-blue-600 text-white'
                }`}>
                  {item.is_completed ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : item.is_locked ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    item.order
                  )}
                </div>
                
                {/* Course Card */}
                <Card className={`border-2 transition-all ${
                  item.is_completed 
                    ? 'border-green-200 bg-green-50/50' 
                    : item.is_locked 
                      ? 'border-slate-200 bg-slate-50 opacity-75' 
                      : 'border-blue-200 bg-white hover:shadow-md'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-semibold ${item.is_locked ? 'text-slate-500' : 'text-slate-900'}`}>
                            {item.course.name}
                          </h4>
                          {item.is_completed && (
                            <Badge className="bg-green-500">Completado</Badge>
                          )}
                          {item.is_locked && (
                            <Badge variant="secondary" className="bg-slate-200">Bloqueado</Badge>
                          )}
                          {!item.is_completed && !item.is_locked && (
                            <Badge className="bg-blue-600">Disponible</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{item.course.description}</p>
                        
                        <div className="flex items-center gap-3 mt-3">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {item.course.hours}h
                          </Badge>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {item.course.training_type}
                          </Badge>
                        </div>
                        
                        {/* Missing Prerequisites Warning */}
                        {item.is_locked && item.missing_prerequisites?.length > 0 && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm font-medium text-amber-700 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              Debes completar primero:
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {item.missing_prerequisites.map(prereq => (
                                <Badge key={prereq.course_id} className="bg-amber-100 text-amber-700 text-xs">
                                  {prereq.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Courses Grid */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Mi Ruta Aptiva
        </h2>
        
        {!progress?.courses || progress.courses.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Aún no tienes capacitaciones asignadas en tu ruta</p>
              <p className="text-sm text-slate-400 mt-1">
                Tu ruta se construye automáticamente según tu área, actividad y competencias. Contacta al administrador si crees que falta algo.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {progress.courses.map((item) => (
              <Card 
                key={item.course.course_id} 
                className={`border-slate-200 transition-all duration-300 ${
                  item.is_completed 
                    ? 'border-green-200 bg-green-50/30 hover:shadow-lg' 
                    : item.is_locked 
                      ? 'border-slate-200 bg-slate-50 opacity-80' 
                      : 'hover:shadow-lg'
                }`}
                data-testid={`course-card-${item.course.course_id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center relative">
                      {item.is_completed ? (
                        <div className="w-full h-full rounded-xl bg-green-100 flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        </div>
                      ) : item.is_locked ? (
                        <div className="w-full h-full rounded-xl bg-slate-200 flex items-center justify-center">
                          <Lock className="w-5 h-5 text-slate-500" />
                        </div>
                      ) : (
                        <div className="w-full h-full rounded-xl bg-blue-100 flex items-center justify-center">
                          <PlayCircle className="w-6 h-6 text-blue-600" />
                        </div>
                      )}
                      {/* Order Badge */}
                      <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                        item.is_completed ? 'bg-green-500 text-white' : item.is_locked ? 'bg-slate-400 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {item.order}
                      </div>
                    </div>
                    <Badge className={
                      item.is_completed 
                        ? 'bg-green-500' 
                        : item.is_locked 
                          ? 'bg-slate-400' 
                          : 'bg-blue-600'
                    }>
                      {item.is_completed ? 'Completado' : item.is_locked ? 'Bloqueado' : 'Disponible'}
                    </Badge>
                  </div>
                  <CardTitle className={`text-lg mt-3 ${item.is_locked ? 'text-slate-500' : ''}`}>
                    {item.course.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {item.course.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {item.course.hours}h
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {item.course.training_type}
                    </Badge>
                  </div>
                  
                  {/* Locked Course Message */}
                  {item.is_locked && item.missing_prerequisites?.length > 0 && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-medium text-amber-700 flex items-center gap-1 mb-1">
                        <AlertCircle className="w-3 h-3" />
                        Completa primero:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {item.missing_prerequisites.map(prereq => (
                          <Badge key={prereq.course_id} className="bg-amber-100 text-amber-700 text-xs">
                            {prereq.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {item.is_completed && item.certificate ? (
                    <div className="space-y-2">
                      <Link to="/student/certificates">
                        <Button variant="outline" className="w-full border-green-200 text-green-600 hover:bg-green-50">
                          <Award className="w-4 h-4 mr-2" />
                          Ver Certificado
                        </Button>
                      </Link>
                    </div>
                  ) : item.is_locked ? (
                    <Button className="w-full bg-slate-300 text-slate-600 cursor-not-allowed" disabled>
                      <Lock className="w-4 h-4 mr-2" />
                      Curso Bloqueado
                    </Button>
                  ) : (
                    <Link to={`/student/course/${item.course.course_id}`}>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        Iniciar Curso
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
