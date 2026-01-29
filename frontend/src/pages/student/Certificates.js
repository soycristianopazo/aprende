import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Award, Download, Calendar, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

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
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="student-certificates">
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Mis Certificados
        </h1>
        <p className="text-slate-600 mt-1">
          Descarga tus certificados de capacitación
        </p>
      </div>

      {certificates.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Aún no tienes certificados</p>
            <p className="text-sm text-slate-400 mt-1">
              Completa cursos y aprueba las evaluaciones para obtener certificados
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => {
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
      )}
    </div>
  );
};

export default StudentCertificates;
