import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Upload, Loader2, CheckCircle, XCircle, FileWarning, Download } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CSV_TEMPLATE = `email,password,full_name,rut,area_names,activity_names
bulk1@miempresa.com,test123,Juan Pérez,11111111-1,Operaciones Mina,Trabajo en Altura
bulk2@miempresa.com,test123,María López,22222222-2,Mantenimiento,Conducción;Soldadura
`;

const UsersImport = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(`${API}/users/bulk-import`, { method: 'POST', headers, body: fd });
      if (!r.ok) throw new Error('Error en importación');
      const data = await r.json();
      setResult(data);
      toast.success(`Importados: ${data.summary.created} | Omitidos: ${data.summary.skipped} | Errores: ${data.summary.errors}`);
    } catch (err) { toast.error(err.message); }
    finally { setUploading(false); }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_trabajadores.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Importar trabajadores (CSV)</h1>
        <p className="text-sm text-slate-500">Sube un archivo CSV con tus trabajadores. Las áreas y actividades deben existir previamente.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Formato esperado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">Columnas (en este orden, con encabezado):</p>
          <code className="block p-3 rounded bg-slate-900 text-blue-300 text-xs font-mono">
            email,password,full_name,rut,area_names,activity_names
          </code>
          <ul className="text-xs text-slate-600 list-disc pl-5 space-y-1">
            <li><strong>area_names</strong> y <strong>activity_names</strong> se separan con <code>;</code> si hay varias.</li>
            <li>Los nombres deben coincidir exactamente con áreas/actividades ya creadas (mayúsculas/minúsculas no importan).</li>
            <li>Si un usuario ya existe (mismo email), se omite.</li>
          </ul>
          <Button variant="outline" onClick={downloadTemplate}><Download className="w-4 h-4 mr-2" />Descargar plantilla</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Subir archivo</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label>Archivo CSV</Label>
              <Input type="file" accept=".csv" required onChange={(e) => setFile(e.target.files[0])} />
            </div>
            <Button type="submit" disabled={uploading || !file} className="bg-blue-600 hover:bg-blue-700">
              {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</> : <><Upload className="w-4 h-4 mr-2" /> Importar</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado de la importación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700">
                <CheckCircle className="w-5 h-5" /><p className="text-xs mt-1">Creados</p>
                <p className="text-xl font-bold">{result.summary.created}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 text-amber-700">
                <FileWarning className="w-5 h-5" /><p className="text-xs mt-1">Omitidos</p>
                <p className="text-xl font-bold">{result.summary.skipped}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 text-red-700">
                <XCircle className="w-5 h-5" /><p className="text-xs mt-1">Errores</p>
                <p className="text-xl font-bold">{result.summary.errors}</p>
              </div>
            </div>
            {result.errors?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-700 mb-2">Errores:</p>
                <ul className="text-xs space-y-1">
                  {result.errors.map((e, i) => <li key={i} className="text-red-600">Fila {e.row}: {e.error}</li>)}
                </ul>
              </div>
            )}
            {result.skipped?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-2">Omitidos:</p>
                <ul className="text-xs space-y-1">
                  {result.skipped.map((s, i) => <li key={i} className="text-amber-700">Fila {s.row} ({s.email}): {s.reason}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UsersImport;
