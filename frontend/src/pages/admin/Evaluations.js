import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import { ClipboardCheck, Plus, Edit, Trash2, Loader2, HelpCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminEvaluations = () => {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [existingEvaluation, setExistingEvaluation] = useState(null);
  const [questions, setQuestions] = useState([
    { text: '', options: ['', '', ''], correct_index: 0 }
  ]);
  const [minScore, setMinScore] = useState(70);
  const [maxAttempts, setMaxAttempts] = useState(3);

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
        // Check which courses have evaluations
        const coursesWithEval = await Promise.all(
          data.map(async (course) => {
            try {
              const evalResponse = await fetch(`${API}/evaluations/course/${course.course_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              course.hasEvaluation = evalResponse.ok;
              if (evalResponse.ok) {
                course.evaluation = await evalResponse.json();
              }
            } catch {
              course.hasEvaluation = false;
            }
            return course;
          })
        );
        setCourses(coursesWithEval);
      }
    } catch (error) {
      toast.error('Error al cargar cursos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = async (course) => {
    setSelectedCourse(course);
    
    if (course.hasEvaluation && course.evaluation) {
      setExistingEvaluation(course.evaluation);
      setQuestions(course.evaluation.questions);
      setMinScore(course.evaluation.min_score);
      setMaxAttempts(course.evaluation.max_attempts);
    } else {
      setExistingEvaluation(null);
      setQuestions([{ text: '', options: ['', '', ''], correct_index: 0 }]);
      setMinScore(70);
      setMaxAttempts(3);
    }
    
    setDialogOpen(true);
  };

  const addQuestion = () => {
    setQuestions([...questions, { text: '', options: ['', '', ''], correct_index: 0 }]);
  };

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const handleSubmit = async () => {
    // Validate
    for (const q of questions) {
      if (!q.text.trim()) {
        toast.error('Todas las preguntas deben tener un enunciado');
        return;
      }
      if (q.options.some(o => !o.trim())) {
        toast.error('Todas las opciones deben tener texto');
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      
      if (existingEvaluation) {
        // Update
        const response = await fetch(`${API}/evaluations/${existingEvaluation.evaluation_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            questions,
            min_score: minScore,
            max_attempts: maxAttempts
          })
        });

        if (response.ok) {
          toast.success('Evaluación actualizada');
        } else {
          const error = await response.json();
          toast.error(error.detail || 'Error al actualizar');
          return;
        }
      } else {
        // Create
        const response = await fetch(`${API}/evaluations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            course_id: selectedCourse.course_id,
            questions,
            min_score: minScore,
            max_attempts: maxAttempts
          })
        });

        if (response.ok) {
          toast.success('Evaluación creada');
        } else {
          const error = await response.json();
          toast.error(error.detail || 'Error al crear');
          return;
        }
      }

      setDialogOpen(false);
      fetchCourses();
    } catch (error) {
      toast.error('Error de conexión');
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
    <div className="space-y-6" data-testid="admin-evaluations">
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Evaluaciones
        </h1>
        <p className="text-slate-600 mt-1">Configura las evaluaciones de cada curso</p>
      </div>

      {/* Courses Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead>Estado Evaluación</TableHead>
                <TableHead>Preguntas</TableHead>
                <TableHead>Aprobación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    No hay cursos creados
                  </TableCell>
                </TableRow>
              ) : (
                courses.map((course) => (
                  <TableRow key={course.course_id} data-testid={`eval-row-${course.course_id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{course.name}</p>
                        <p className="text-sm text-slate-500">{course.hours}h - {course.training_type}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={course.hasEvaluation ? 'bg-green-500' : 'bg-slate-400'}>
                        {course.hasEvaluation ? 'Configurada' : 'Sin evaluación'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {course.evaluation?.questions?.length || 0} preguntas
                    </TableCell>
                    <TableCell>
                      {course.evaluation?.min_score || '-'}%
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(course)}
                        data-testid={`config-eval-${course.course_id}`}
                      >
                        {course.hasEvaluation ? (
                          <>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Crear
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Evaluation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {existingEvaluation ? 'Editar' : 'Crear'} Evaluación
            </DialogTitle>
            <DialogDescription>
              {selectedCourse?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Config */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Puntaje mínimo de aprobación (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={minScore}
                  onChange={(e) => setMinScore(parseInt(e.target.value))}
                  data-testid="eval-min-score"
                />
              </div>
              <div className="space-y-2">
                <Label>Máximo de intentos</Label>
                <Input
                  type="number"
                  min="1"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(parseInt(e.target.value))}
                  data-testid="eval-max-attempts"
                />
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg">Preguntas</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addQuestion}
                  data-testid="add-question-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Pregunta
                </Button>
              </div>

              {questions.map((question, qIndex) => (
                <Card key={qIndex} className="border-slate-200" data-testid={`question-card-${qIndex}`}>
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-700 font-semibold">{qIndex + 1}</span>
                        </div>
                        <Label>Pregunta {qIndex + 1}</Label>
                      </div>
                      {questions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeQuestion(qIndex)}
                          data-testid={`remove-question-${qIndex}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>

                    <Input
                      placeholder="Enunciado de la pregunta..."
                      value={question.text}
                      onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                      data-testid={`question-text-${qIndex}`}
                    />

                    <div className="space-y-2">
                      <Label className="text-sm text-slate-600">Alternativas</Label>
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${qIndex}`}
                            checked={question.correct_index === oIndex}
                            onChange={() => updateQuestion(qIndex, 'correct_index', oIndex)}
                            className="w-4 h-4 text-blue-600"
                            data-testid={`option-radio-${qIndex}-${oIndex}`}
                          />
                          <Input
                            placeholder={`Alternativa ${oIndex + 1}`}
                            value={option}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            className="flex-1"
                            data-testid={`option-text-${qIndex}-${oIndex}`}
                          />
                        </div>
                      ))}
                      <p className="text-xs text-slate-400 mt-1">
                        Selecciona el radio de la respuesta correcta
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleSubmit}
              data-testid="save-evaluation-btn"
            >
              {existingEvaluation ? 'Actualizar' : 'Crear'} Evaluación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEvaluations;
