import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Label } from '../../components/ui/label';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, XCircle, Award, AlertTriangle, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StudentEvaluation = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [course, setCourse] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [courseRes, evalRes] = await Promise.all([
        fetch(`${API}/courses/${courseId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API}/evaluations/course/${courseId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (courseRes.ok) {
        setCourse(await courseRes.json());
      }

      if (evalRes.ok) {
        const evalData = await evalRes.json();
        setEvaluation(evalData);
        // Initialize answers
        const initialAnswers = {};
        evalData.questions.forEach((_, index) => {
          initialAnswers[index] = null;
        });
        setAnswers(initialAnswers);
      } else {
        toast.error('Evaluación no encontrada');
        navigate(`/student/course/${courseId}`);
      }
    } catch (error) {
      toast.error('Error al cargar evaluación');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionIndex, optionIndex) => {
    setAnswers({ ...answers, [questionIndex]: optionIndex });
  };

  const handleSubmit = async () => {
    // Check all questions answered
    const unanswered = Object.values(answers).filter(a => a === null).length;
    if (unanswered > 0) {
      toast.error(`Debes responder todas las preguntas (${unanswered} sin responder)`);
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/evaluations/${evaluation.evaluation_id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          answers: Object.values(answers)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        
        if (data.passed) {
          toast.success('¡Felicitaciones! Has aprobado la evaluación');
        } else {
          toast.error('No alcanzaste el puntaje mínimo');
        }
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Error al enviar evaluación');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!evaluation) {
    return null;
  }

  // Result View
  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6" data-testid="evaluation-result">
        <Card className={`border-2 ${result.passed ? 'border-green-200' : 'border-amber-200'}`}>
          <CardContent className="pt-8 pb-8 text-center">
            {result.passed ? (
              <>
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-green-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  ¡Aprobado!
                </h2>
                <p className="text-green-700 mb-4">
                  Has completado exitosamente la evaluación
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-10 h-10 text-amber-500" />
                </div>
                <h2 className="text-2xl font-bold text-amber-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  No Aprobado
                </h2>
                <p className="text-amber-700 mb-4">
                  No alcanzaste el puntaje mínimo requerido
                </p>
              </>
            )}

            <div className="bg-slate-50 rounded-xl p-6 mb-6">
              <div className="text-4xl font-bold text-slate-900 mb-1">
                {result.score}%
              </div>
              <p className="text-slate-500">Tu puntaje</p>
              <p className="text-sm text-slate-400 mt-2">
                Mínimo requerido: {evaluation.min_score}%
              </p>
            </div>

            {result.passed && result.certificate && (
              <div className="bg-green-50 rounded-xl p-4 mb-6 text-left">
                <div className="flex items-center gap-3">
                  <Award className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="font-semibold text-green-900">Certificado Generado</p>
                    <p className="text-sm text-green-700">
                      Código: <code className="bg-green-100 px-2 py-0.5 rounded">{result.certificate.verification_code}</code>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!result.passed && result.attempts_remaining > 0 && (
              <div className="bg-amber-50 rounded-xl p-4 mb-6 text-left">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                  <div>
                    <p className="font-medium text-amber-900">
                      Te quedan {result.attempts_remaining} intento(s)
                    </p>
                    <p className="text-sm text-amber-700">
                      Puedes volver a intentarlo
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => navigate('/student')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a Mis Cursos
              </Button>
              {result.passed ? (
                <Button
                  className="bg-green-500 hover:bg-green-600"
                  onClick={() => navigate('/student/certificates')}
                >
                  <Award className="w-4 h-4 mr-2" />
                  Ver Certificados
                </Button>
              ) : result.attempts_remaining > 0 ? (
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setResult(null);
                    setCurrentQuestion(0);
                    const initialAnswers = {};
                    evaluation.questions.forEach((_, index) => {
                      initialAnswers[index] = null;
                    });
                    setAnswers(initialAnswers);
                  }}
                >
                  Intentar de Nuevo
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalQuestions = evaluation.questions.length;
  const answeredCount = Object.values(answers).filter(a => a !== null).length;
  const progressPercent = (answeredCount / totalQuestions) * 100;
  const question = evaluation.questions[currentQuestion];

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="student-evaluation">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(`/student/course/${courseId}`)}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Curso
        </Button>
        <Badge variant="outline">
          {answeredCount} de {totalQuestions} respondidas
        </Badge>
      </div>

      {/* Course Info */}
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">{course?.name}</h2>
              <p className="text-sm text-slate-500">
                Puntaje mínimo: {evaluation.min_score}% • Intentos: {evaluation.max_attempts}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-sm text-slate-600 mb-2">
          <span>Progreso de la evaluación</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Question Navigation */}
      <div className="flex flex-wrap gap-2">
        {evaluation.questions.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentQuestion(index)}
            className={`w-10 h-10 rounded-lg font-medium transition-colors ${
              currentQuestion === index
                ? 'bg-blue-600 text-white'
                : answers[index] !== null
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            data-testid={`question-nav-${index}`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Question Card */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
              {currentQuestion + 1}
            </span>
            Pregunta {currentQuestion + 1} de {totalQuestions}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-lg text-slate-900">{question.text}</p>

          <RadioGroup
            value={answers[currentQuestion]?.toString() || ''}
            onValueChange={(value) => handleAnswer(currentQuestion, parseInt(value))}
          >
            <div className="space-y-3">
              {question.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center space-x-3">
                  <RadioGroupItem
                    value={optionIndex.toString()}
                    id={`option-${optionIndex}`}
                    className="border-slate-300 text-blue-600"
                    data-testid={`option-${currentQuestion}-${optionIndex}`}
                  />
                  <Label
                    htmlFor={`option-${optionIndex}`}
                    className="flex-1 cursor-pointer text-slate-700 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
              data-testid="prev-question-btn"
            >
              Anterior
            </Button>
            
            {currentQuestion === totalQuestions - 1 ? (
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleSubmit}
                disabled={submitting}
                data-testid="submit-evaluation-btn"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Enviar Evaluación
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentQuestion(Math.min(totalQuestions - 1, currentQuestion + 1))}
                data-testid="next-question-btn"
              >
                Siguiente
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentEvaluation;
