import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Award, Download, Calendar, Clock, CheckCircle, XCircle, Loader2, FolderTree, FileCheck } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StudentCertificates = () => {
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/certificates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCertificates(data);
      }
    } catch (error) {
      toast.error('Error al cargar certificados');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (certId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/certificates/${certId}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado_${certId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Certificado descargado');
      } else {
        toast.error('Error al descargar certificado');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const isExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // Separar certificados por tipo
  const roleCertificates = certificates.filter(c => c.certificate_type === 'role_completion');
  const courseCertificates = certificates.filter(c => c.certificate_type !== 'role_completion');

  return (
    <div className="space-y-6" data-testid="student-certificates">
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Mis Constancias
        </h1>
        <p className="text-slate-600 mt-1">
          Descarga las constancias y certificados de tus capacitaciones acreditadas.
        </p>
      </div>

      {certificates.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Aún no tienes certificados</p>
            <p className="text-sm text-slate-400 mt-1">
              Completa todos los cursos de tu malla curricular para obtener tu certificado
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Certificados de Rol (Malla completa) */}
          {roleCertificates.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-blue-600" />
                Certificados de Malla Curricular
              </h2>
              <div className="grid grid-cols-1 gap-6">
                {roleCertificates.map((cert) => {
                  const expired = isExpired(cert.expires_at);
                  
                  return (
                    <Card 
                      key={cert.certificate_id} 
                      className={`border-2 ${expired ? 'border-amber-300 bg-amber-50/30' : 'border-green-300 bg-green-50/30'}`}
                      data-testid={`cert-card-${cert.certificate_id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-14 h-14 rounded-xl ${expired ? 'bg-amber-100' : 'bg-green-100'} flex items-center justify-center`}>
                              {expired ? (
                                <XCircle className="w-7 h-7 text-amber-500" />
                              ) : (
                                <Award className="w-7 h-7 text-green-500" />
                              )}
                            </div>
                            <div>
                              <CardTitle className="text-xl">
                                Rol/Actividad: {cert.role_names || cert.role_name}
                              </CardTitle>
                              <CardDescription>
                                Código: <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">{cert.verification_code}</code>
                              </CardDescription>
                            </div>
                          </div>
                          <Badge className={`text-sm px-3 py-1 ${expired ? 'bg-amber-500' : 'bg-green-500'}`}>
                            {expired ? 'Vencido' : 'Válido'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Detalle de cursos */}
                        {cert.courses_detail && cert.courses_detail.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-slate-700 mb-2">Cursos completados:</h4>
                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                  <tr>
                                    <th className="text-left py-2 px-3 font-medium text-slate-600">Curso</th>
                                    <th className="text-center py-2 px-3 font-medium text-slate-600">Horas</th>
                                    <th className="text-center py-2 px-3 font-medium text-slate-600">Aprobación</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cert.courses_detail.map((course, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 last:border-0">
                                      <td className="py-2 px-3 text-slate-700">{course.course_name}</td>
                                      <td className="py-2 px-3 text-center text-slate-600">{course.hours}h</td>
                                      <td className="py-2 px-3 text-center">
                                        <span className={`font-medium ${course.score >= 80 ? 'text-green-600' : 'text-blue-700'}`}>
                                          {course.score}%
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="bg-slate-50 border-t border-slate-200">
                                  <tr>
                                    <td className="py-2 px-3 font-medium text-slate-700">Total</td>
                                    <td className="py-2 px-3 text-center font-medium text-slate-700">{cert.total_hours}h</td>
                                    <td className="py-2 px-3 text-center font-medium text-green-600">{cert.average_score}%</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="w-4 h-4" />
                            <span>Emitido: {formatDate(cert.issued_at)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="w-4 h-4" />
                            <span>Vigencia: {formatDate(cert.expires_at)}</span>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleDownload(cert.certificate_id)}
                          className={`w-full ${expired ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'}`}
                          data-testid={`download-cert-${cert.certificate_id}`}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Descargar Certificado PDF
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Certificados individuales (legacy) */}
          {courseCertificates.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-slate-500" />
                Certificados de Cursos Individuales
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courseCertificates.map((cert) => {
                  const expired = isExpired(cert.expires_at);
                  
                  return (
                    <Card 
                      key={cert.certificate_id} 
                      className={`border-slate-200 ${expired ? 'border-amber-200 bg-amber-50/30' : 'border-green-200 bg-green-50/30'}`}
                      data-testid={`cert-card-${cert.certificate_id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl ${expired ? 'bg-amber-100' : 'bg-green-100'} flex items-center justify-center`}>
                              {expired ? (
                                <XCircle className="w-6 h-6 text-amber-500" />
                              ) : (
                                <CheckCircle className="w-6 h-6 text-green-500" />
                              )}
                            </div>
                            <div>
                              <CardTitle className="text-lg">{cert.course_name}</CardTitle>
                              <CardDescription>
                                Código: <code className="text-xs bg-slate-100 px-1 rounded">{cert.verification_code}</code>
                              </CardDescription>
                            </div>
                          </div>
                          <Badge className={expired ? 'bg-amber-500' : 'bg-green-500'}>
                            {expired ? 'Vencido' : 'Válido'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock className="w-4 h-4" />
                            <span>{cert.hours} horas</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Badge variant="outline" className="capitalize text-xs">
                              {cert.training_type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="w-4 h-4" />
                            <span>Emitido: {formatDate(cert.issued_at)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="w-4 h-4" />
                            <span>Vigencia: {formatDate(cert.expires_at)}</span>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleDownload(cert.certificate_id)}
                          className={`w-full ${expired ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'}`}
                          data-testid={`download-cert-${cert.certificate_id}`}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Descargar PDF
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentCertificates;
