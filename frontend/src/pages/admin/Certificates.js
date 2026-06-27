import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import { Award, Search, Download, RefreshCw, Loader2, CheckCircle, XCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminCertificates = () => {
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [rutSearch, setRutSearch] = useState('');
  const [rutResult, setRutResult] = useState(null);

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

  const searchByRut = async () => {
    if (!rutSearch.trim()) {
      toast.error('Ingresa un RUT');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/users/search/rut/${rutSearch.trim()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRutResult(data);
      } else if (response.status === 404) {
        toast.error('Usuario no encontrado');
        setRutResult(null);
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  const handleRegenerate = async (certId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/certificates/${certId}/regenerate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Certificado regenerado');
        fetchCertificates();
      } else {
        toast.error('Error al regenerar certificado');
      }
    } catch (error) {
      toast.error('Error de conexión');
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

  const filteredCertificates = certificates.filter(cert => {
    const search = searchTerm.toLowerCase();
    return cert.user_name?.toLowerCase().includes(search) ||
           cert.course_name?.toLowerCase().includes(search) ||
           cert.verification_code?.toLowerCase().includes(search) ||
           cert.user_rut?.toLowerCase().includes(search);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-certificates">
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Certificados
        </h1>
        <p className="text-slate-600 mt-1">Historial de certificados emitidos</p>
      </div>

      {/* Search by RUT */}
      <Card className="border-slate-200 border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Buscar por RUT
          </CardTitle>
          <CardDescription>
            Consulta el historial de cursos de un trabajador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Ingresa el RUT (ej: 12345678-9)"
              value={rutSearch}
              onChange={(e) => setRutSearch(e.target.value)}
              className="max-w-sm"
              data-testid="rut-search-input"
            />
            <Button 
              onClick={searchByRut}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="rut-search-btn"
            >
              Buscar
            </Button>
          </div>

          {rutResult && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200" data-testid="rut-result">
              <div className="mb-4">
                <h4 className="font-semibold text-slate-900">{rutResult.user.full_name || rutResult.user.name}</h4>
                <p className="text-sm text-slate-500">{rutResult.user.email}</p>
                <p className="text-sm text-slate-500">RUT: {rutResult.user.rut}</p>
              </div>
              <h5 className="font-medium text-slate-700 mb-2">Certificados ({rutResult.certificates?.length || 0})</h5>
              {rutResult.certificates?.length > 0 ? (
                <div className="space-y-2">
                  {rutResult.certificates.map((cert) => (
                    <div key={cert.certificate_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{cert.course_name}</p>
                        <p className="text-sm text-slate-500">
                          Emitido: {formatDate(cert.issued_at)} - Vigencia: {formatDate(cert.expires_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={isExpired(cert.expires_at) ? 'bg-amber-500' : 'bg-green-500'}>
                          {isExpired(cert.expires_at) ? 'Vencido' : 'Válido'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(cert.certificate_id)}
                        >
                          <Download className="w-4 h-4 text-blue-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">Sin certificados</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* General Search */}
      <Card className="border-slate-200">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, curso, código o RUT..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="search-certificates-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Certificates Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Alumno</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Emitido</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCertificates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No se encontraron certificados
                  </TableCell>
                </TableRow>
              ) : (
                filteredCertificates.map((cert) => (
                  <TableRow key={cert.certificate_id} data-testid={`cert-row-${cert.certificate_id}`}>
                    <TableCell>
                      <code className="text-sm bg-slate-100 px-2 py-1 rounded">
                        {cert.verification_code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{cert.user_name}</p>
                        <p className="text-sm text-slate-500">{cert.user_rut}</p>
                      </div>
                    </TableCell>
                    <TableCell>{cert.course_name}</TableCell>
                    <TableCell>{formatDate(cert.issued_at)}</TableCell>
                    <TableCell>{formatDate(cert.expires_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {isExpired(cert.expires_at) ? (
                          <>
                            <XCircle className="w-4 h-4 text-amber-500" />
                            <Badge className="bg-amber-500">Vencido</Badge>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <Badge className="bg-green-500">Válido</Badge>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(cert.certificate_id)}
                          title="Descargar PDF"
                          data-testid={`download-cert-${cert.certificate_id}`}
                        >
                          <Download className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRegenerate(cert.certificate_id)}
                          title="Regenerar certificado"
                          data-testid={`regenerate-cert-${cert.certificate_id}`}
                        >
                          <RefreshCw className="w-4 h-4 text-blue-600" />
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

export default AdminCertificates;
