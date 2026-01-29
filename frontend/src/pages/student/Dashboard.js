import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';
import { BookOpen, Award, Clock, PlayCircle, CheckCircle, Loader2, ArrowRight } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StudentDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(null);

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
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="student-dashboard">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
          ¡Hola, {user?.full_name || user?.name || 'Estudiante'}!
        </h1>
        <p className="text-orange-100 mb-6">
          Continúa tu formación y obtén tus certificados
        </p>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold">{progress?.completed_courses || 0}</p>
            <p className="text-orange-200 text-sm">Completados</p>
          </div>
          <div className="w-px h-12 bg-orange-400"></div>
          <div className="text-center">
            <p className="text-3xl font-bold">{progress?.total_courses || 0}</p>
            <p className="text-orange-200 text-sm">Total Cursos</p>
          </div>
          <div className="w-px h-12 bg-orange-400"></div>
          <div className="text-center">
            <p className="text-3xl font-bold">{progress?.completion_percentage || 0}%</p>
            <p className="text-orange-200 text-sm">Progreso</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {progress?.total_courses > 0 && (
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Progreso de la Malla Curricular</span>
              <span className="text-sm text-slate-500">
                {progress?.completed_courses} de {progress?.total_courses} cursos
              </span>
            </div>
            <Progress value={progress?.completion_percentage || 0} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Courses Grid */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Mis Cursos
        </h2>
        
        {!progress?.courses || progress.courses.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No tienes cursos asignados</p>
              <p className="text-sm text-slate-400 mt-1">
                Contacta al administrador para que te asigne un rol con cursos
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {progress.courses.map(({ course, is_completed, certificate }) => (
              <Card 
                key={course.course_id} 
                className={`border-slate-200 hover:shadow-lg transition-all duration-300 ${is_completed ? 'border-green-200 bg-green-50/30' : ''}`}
                data-testid={`course-card-${course.course_id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                      {is_completed ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : (
                        <PlayCircle className="w-6 h-6 text-orange-500" />
                      )}
                    </div>
                    <Badge className={is_completed ? 'bg-green-500' : 'bg-orange-500'}>
                      {is_completed ? 'Completado' : 'Pendiente'}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{course.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {course.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {course.hours}h
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {course.training_type}
                    </Badge>
                  </div>
                  
                  {is_completed && certificate ? (
                    <div className="space-y-2">
                      <Link to="/student/certificates">
                        <Button variant="outline" className="w-full border-green-200 text-green-600 hover:bg-green-50">
                          <Award className="w-4 h-4 mr-2" />
                          Ver Certificado
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <Link to={`/student/course/${course.course_id}`}>
                      <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
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
