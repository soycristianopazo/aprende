import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import { Loader2, Upload, FolderOpen, FileText, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { useConfirm } from '../../components/ui/confirm';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WorkerDocuments = () => {
  const [workers, setWorkers] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [wdocs, setWdocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFor, setUploadFor] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadExpiry, setUploadExpiry] = useState('');
  const [uploading, setUploading] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const confirm = useConfirm();
  const jheaders = { ...headers, 'Content-Type': 'application/json' };

  const fetchInit = async () => {
    const [u, d] = await Promise.all([
      fetch(`${API}/users`, { headers }),
      fetch(`${API}/document-types`, { headers }),
    ]);
    if (u.ok) setWorkers((await u.json()).filter((u) => !u.is_admin));
    if (d.ok) setDocTypes(await d.json());
    setLoading(false);
  };

  useEffect(() => { fetchInit(); }, []);

  const loadWorkerDocs = async (worker) => {
    setSelectedWorker(worker);
    const r = await fetch(`${API}/worker-documents/${worker.user_id}`, { headers });
    if (r.ok) setWdocs(await r.json());
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadFor) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('document_type_id', uploadFor.document_type_id);
      fd.append('file', uploadFile);
      if (uploadExpiry) fd.append('expiry_date', uploadExpiry);
      const r = await fetch(`${API}/worker-documents/${selectedWorker.user_id}/upload`, { method: 'POST', headers, body: fd });
      if (!r.ok) throw new Error('Upload error');
      toast.success('Archivo subido');
      setUploadOpen(false); setUploadFile(null); setUploadExpiry('');
      loadWorkerDocs(selectedWorker);
    } catch (err) { toast.error(err.message); }
    finally { setUploading(false); }
  };

  const handleDeleteFile = async (wdId, fileIdx) => {
    const ok = await confirm({ title: '¿Eliminar este archivo?', confirmText: 'Eliminar', destructive: true });
    if (!ok) return;
    const r = await fetch(`${API}/worker-documents/${wdId}/files/${fileIdx}`, { method: 'DELETE', headers });
    if (r.ok) { toast.success('Archivo eliminado'); loadWorkerDocs(selectedWorker); }
    else toast.error('Error');
  };

  const wdocsByType = wdocs.reduce((acc, w) => { acc[w.document_type_id] = w; return acc; }, {});

  const isExpired = (dateStr) => dateStr && new Date(dateStr) < new Date();
  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (d - now) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30;
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Expedientes de Trabajadores</h1>
        <p className="text-sm text-slate-500">Sube y administra los documentos personales de cada trabajador.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Worker list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Trabajadores ({workers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[600px] overflow-y-auto">
            {workers.length === 0 ? <p className="text-sm text-slate-500 p-4">Sin trabajadores.</p> : (
              <div className="divide-y divide-slate-100">
                {workers.map((w) => (
                  <button
                    key={w.user_id}
                    onClick={() => loadWorkerDocs(w)}
                    className={`w-full text-left p-3 hover:bg-slate-50 ${selectedWorker?.user_id === w.user_id ? 'bg-blue-50' : ''}`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{w.full_name}</p>
                    <p className="text-xs text-slate-500">{w.rut || w.email}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document grid for selected worker */}
        <div>
          {!selectedWorker ? (
            <Card>
              <CardContent className="py-16 text-center text-slate-500">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">Selecciona un trabajador para ver su expediente.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{selectedWorker.full_name}</h2>
                  <p className="text-xs text-slate-500">{selectedWorker.email}</p>
                </div>
              </div>
              {docTypes.map((dt) => {
                const wd = wdocsByType[dt.document_type_id];
                const files = wd?.files || [];
                return (
                  <Card key={dt.document_type_id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-blue-700 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900">{dt.name}</p>
                            <p className="text-xs text-slate-500">{files.length} archivo(s)</p>
                            {files.map((f, idx) => (
                              <div key={idx} className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                                <a href={`${BACKEND_URL}${f.file_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                                  <ExternalLink className="w-3 h-3" />
                                  {f.original_name || `Archivo ${idx + 1}`}
                                </a>
                                {f.expiry_date && (
                                  isExpired(f.expiry_date) ? <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Vencido</Badge> :
                                  isExpiringSoon(f.expiry_date) ? <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">Por vencer</Badge> :
                                  <span className="text-slate-400">vence {new Date(f.expiry_date).toLocaleDateString('es-CL')}</span>
                                )}
                                <button onClick={() => handleDeleteFile(wd.worker_document_id, idx)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => { setUploadFor(dt); setUploadOpen(true); }}>
                          <Upload className="w-3 h-3 mr-1" /> Subir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {docTypes.length === 0 && (
                <Card><CardContent className="py-10 text-center text-sm text-slate-500">No hay tipos de documento configurados. Crea algunos en "Tipos de Documentos".</CardContent></Card>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Subir archivo</DialogTitle>
            <DialogDescription>{uploadFor?.name} para {selectedWorker?.full_name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-3">
            <div><Label>Archivo</Label><Input type="file" required onChange={(e) => setUploadFile(e.target.files[0])} /></div>
            {uploadFor?.requires_expiry && (
              <div><Label>Fecha de vencimiento</Label><Input type="date" value={uploadExpiry} onChange={(e) => setUploadExpiry(e.target.value)} /></div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={uploading} className="bg-blue-600 hover:bg-blue-700">
                {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Subir
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkerDocuments;
