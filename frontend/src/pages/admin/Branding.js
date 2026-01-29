import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Palette, Upload, Save, Loader2, Image, FileSignature } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminBranding = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({ logo: false, signature: false, footer: false });
  const [branding, setBranding] = useState({
    logo_url: null,
    signature_url: null,
    footer_image_url: null,
    primary_color: '#F97316',
    secondary_color: '#F1F5F9',
    footer_text: ''
  });

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      const response = await fetch(`${API}/branding`);
      if (response.ok) {
        const data = await response.json();
        setBranding({
          logo_url: data.logo_url || null,
          signature_url: data.signature_url || null,
          footer_image_url: data.footer_image_url || null,
          primary_color: data.primary_color || '#F97316',
          secondary_color: data.secondary_color || '#F1F5F9',
          footer_text: data.footer_text || ''
        });
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveColors = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/branding`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
          footer_text: branding.footer_text
        })
      });

      if (response.ok) {
        toast.success('Configuración guardada');
      } else {
        toast.error('Error al guardar');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (type, file) => {
    if (!file) return;

    setUploading({ ...uploading, [type]: true });
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/branding/${type}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        toast.success('Imagen subida correctamente');
        fetchBranding();
      } else {
        toast.error('Error al subir imagen');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setUploading({ ...uploading, [type]: false });
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
    <div className="space-y-6" data-testid="admin-branding">
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Branding
        </h1>
        <p className="text-slate-600 mt-1">Personaliza la apariencia de la plataforma y certificados</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5 text-orange-500" />
              Logo de la Plataforma
            </CardTitle>
            <CardDescription>
              Se mostrará en el header y en los certificados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {branding.logo_url && (
              <div className="p-4 bg-slate-50 rounded-lg flex items-center justify-center">
                <img
                  src={`${BACKEND_URL}${branding.logo_url}`}
                  alt="Logo"
                  className="max-h-20 object-contain"
                />
              </div>
            )}
            <div>
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-orange-300 transition-colors">
                  {uploading.logo ? (
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">Subir Logo</p>
                      <p className="text-xs text-slate-400">PNG o JPG recomendado</p>
                    </>
                  )}
                </div>
              </Label>
              <input
                id="logo-upload"
                type="file"
                accept=".png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => handleUpload('logo', e.target.files?.[0])}
                data-testid="upload-logo-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Signature */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-orange-500" />
              Firma Institucional
            </CardTitle>
            <CardDescription>
              Firma que aparecerá en los certificados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {branding.signature_url && (
              <div className="p-4 bg-slate-50 rounded-lg flex items-center justify-center">
                <img
                  src={`${BACKEND_URL}${branding.signature_url}`}
                  alt="Firma"
                  className="max-h-16 object-contain"
                />
              </div>
            )}
            <div>
              <Label htmlFor="signature-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-orange-300 transition-colors">
                  {uploading.signature ? (
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">Subir Firma</p>
                      <p className="text-xs text-slate-400">PNG con fondo transparente</p>
                    </>
                  )}
                </div>
              </Label>
              <input
                id="signature-upload"
                type="file"
                accept=".png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => handleUpload('signature', e.target.files?.[0])}
                data-testid="upload-signature-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Footer Image */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5 text-orange-500" />
              Imagen de Pie (Certificado)
            </CardTitle>
            <CardDescription>
              Imagen adicional para el pie del certificado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {branding.footer_image_url && (
              <div className="p-4 bg-slate-50 rounded-lg flex items-center justify-center">
                <img
                  src={`${BACKEND_URL}${branding.footer_image_url}`}
                  alt="Footer"
                  className="max-h-16 object-contain"
                />
              </div>
            )}
            <div>
              <Label htmlFor="footer-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-orange-300 transition-colors">
                  {uploading.footer ? (
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">Subir Imagen</p>
                      <p className="text-xs text-slate-400">PNG o JPG</p>
                    </>
                  )}
                </div>
              </Label>
              <input
                id="footer-upload"
                type="file"
                accept=".png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => handleUpload('footer', e.target.files?.[0])}
                data-testid="upload-footer-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-orange-500" />
              Colores de la Plataforma
            </CardTitle>
            <CardDescription>
              Define los colores principales de la marca
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Color Principal</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={branding.primary_color}
                    onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                    className="w-12 h-10 rounded border border-slate-200 cursor-pointer"
                    data-testid="primary-color-input"
                  />
                  <Input
                    value={branding.primary_color}
                    onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Color Secundario</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={branding.secondary_color}
                    onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                    className="w-12 h-10 rounded border border-slate-200 cursor-pointer"
                    data-testid="secondary-color-input"
                  />
                  <Input
                    value={branding.secondary_color}
                    onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <Button 
              onClick={handleSaveColors}
              className="bg-orange-500 hover:bg-orange-600 w-full"
              disabled={saving}
              data-testid="save-branding-btn"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Configuración
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Vista Previa del Certificado</CardTitle>
          <CardDescription>Así se verá el certificado con la configuración actual</CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="border-4 p-8 rounded-lg bg-white max-w-2xl mx-auto"
            style={{ borderColor: branding.primary_color }}
          >
            {/* Logo */}
            {branding.logo_url && (
              <div className="text-center mb-6">
                <img
                  src={`${BACKEND_URL}${branding.logo_url}`}
                  alt="Logo"
                  className="h-16 object-contain mx-auto"
                />
              </div>
            )}
            
            {/* Título */}
            <div className="text-center mb-4">
              <h2 
                className="text-3xl font-bold mb-4"
                style={{ color: branding.primary_color }}
              >
                CERTIFICADO
              </h2>
              <div 
                className="w-32 h-1 mx-auto rounded"
                style={{ backgroundColor: branding.primary_color }}
              />
            </div>
            
            {/* Texto de otorgamiento */}
            <div className="text-center mt-6 space-y-4">
              <p className="text-slate-600">
                SE OTORGA EL PRESENTE CERTIFICADO DE ASISTENCIA Y APROBACIÓN A:
              </p>
              <p className="text-2xl font-bold text-slate-900">JUAN PÉREZ GONZÁLEZ</p>
              <p className="text-slate-500">RUT: 12.345.678-9</p>
              
              <p className="text-slate-600 mt-6">Por haber completado de manera satisfactoria el curso:</p>
              <p 
                className="text-xl font-bold"
                style={{ color: branding.primary_color }}
              >
                SEGURIDAD INDUSTRIAL
              </p>
              
              <p className="text-slate-600 mt-4">
                Con un total de <span className="font-semibold">8 horas</span> cronológicas. (E-LEARNING)
              </p>
              
              <p className="text-slate-600">
                Certificación válida hasta el <span className="font-semibold">viernes 15 de enero de 2026</span>.
              </p>
              
              <p className="text-sm text-slate-400 mt-2">
                Emitido el 15 de enero de 2025.
              </p>
            </div>
            
            {/* Firma */}
            <div className="mt-8 text-center">
              {branding.signature_url && (
                <img
                  src={`${BACKEND_URL}${branding.signature_url}`}
                  alt="Firma"
                  className="h-16 object-contain mx-auto mb-2"
                />
              )}
              <p className="text-slate-500">_______________________________</p>
              <p className="text-xs text-slate-400 mt-1">Firma Autorizada</p>
            </div>
            
            {/* Línea decorativa */}
            <div className="mt-6">
              <div 
                className="w-32 h-1 mx-auto rounded"
                style={{ backgroundColor: branding.primary_color }}
              />
            </div>
            
            {/* Código de verificación */}
            <div className="mt-4 text-center">
              <p className="text-xs text-slate-400">Código de verificación:</p>
              <p className="font-mono font-bold text-slate-700 text-lg">ABC12345</p>
              <p className="text-xs text-slate-400">Verifique este certificado en la plataforma</p>
            </div>
            
            {/* Footer */}
            {branding.footer_image_url && (
              <div className="mt-6">
                <img
                  src={`${BACKEND_URL}${branding.footer_image_url}`}
                  alt="Footer"
                  className="max-h-12 object-contain mx-auto"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBranding;
