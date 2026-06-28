import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Loader2, Save, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const emptyForm = {
  name: '',
  business_name: '',
  rut: '',
  industry: '',
  company_type: '',
  contact_email: '',
  contact_phone: '',
  website: '',
  address: '',
  city: '',
  country: '',
  legal_representative: '',
  legal_representative_rut: '',
};

const Field = ({ label, value, onChange, type = 'text', placeholder, testid }) => (
  <div>
    <Label className="text-xs text-slate-500">{label}</Label>
    <Input type={type} value={value || ''} onChange={onChange} placeholder={placeholder} data-testid={testid} />
  </div>
);

const Company = () => {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const r = await fetch(`${API}/company`, { headers });
        if (!r.ok) throw new Error('No se pudo cargar la empresa');
        const c = await r.json();
        setForm({ ...emptyForm, ...c });
      } catch (e) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      toast.error('El nombre comercial es obligatorio');
      return;
    }
    setSaving(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([k]) => Object.keys(emptyForm).includes(k))
      );
      const r = await fetch(`${API}/company`, { method: 'PUT', headers, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error((await r.json()).detail || 'Error al guardar');
      const c = await r.json();
      setForm({ ...emptyForm, ...c });
      toast.success('Información de la empresa actualizada');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-4xl space-y-6" data-testid="admin-company">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mi Empresa</h1>
            <p className="text-sm text-slate-500">Información comercial y legal de tu organización. Estos datos aparecen en certificados y reportes de cumplimiento.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Identidad */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Identidad</CardTitle>
            <CardDescription>Cómo se identifica tu empresa.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre comercial *" value={form.name} onChange={update('name')} placeholder="Ej: Aptiva Demo" testid="company-name" />
            <Field label="Razón social" value={form.business_name} onChange={update('business_name')} placeholder="Ej: Aptiva Demo SpA" testid="company-business-name" />
            <Field label="RUT" value={form.rut} onChange={update('rut')} placeholder="76.000.000-1" testid="company-rut" />
            <Field label="Industria / Rubro" value={form.industry} onChange={update('industry')} placeholder="Minería, construcción, energía..." testid="company-industry" />
            <div className="md:col-span-2">
              <Label className="text-xs text-slate-500">Tipo de empresa</Label>
              <div className="flex items-center gap-2 mt-1.5" data-testid="company-type-display">
                {form.company_type === 'contratista' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-sm font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Contratista
                  </span>
                )}
                {form.company_type === 'mandante' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-sm font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                    Mandante
                  </span>
                )}
                {!form.company_type && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-sm">
                    Sin definir
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Definido por el SuperAdmin. {form.company_type === 'contratista'
                  ? 'Puedes registrar mandantes y contratos comerciales.'
                  : form.company_type === 'mandante'
                  ? 'Puedes registrar gerencias internas.'
                  : 'Contacta al SuperAdmin para clasificar tu empresa.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contacto */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contacto</CardTitle>
            <CardDescription>Canales para coordinaciones formales.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Email de contacto" type="email" value={form.contact_email} onChange={update('contact_email')} placeholder="contacto@empresa.cl" testid="company-email" />
            <Field label="Teléfono" value={form.contact_phone} onChange={update('contact_phone')} placeholder="+56 2 2345 6789" testid="company-phone" />
            <Field label="Sitio web" value={form.website} onChange={update('website')} placeholder="https://www.empresa.cl" testid="company-website" />
          </CardContent>
        </Card>

        {/* Domicilio */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Domicilio</CardTitle>
            <CardDescription>Dirección operativa o legal principal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-slate-500">Dirección</Label>
              <Textarea
                rows={2}
                value={form.address || ''}
                onChange={update('address')}
                placeholder="Av. Apoquindo 1234, Of. 56"
                data-testid="company-address"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Ciudad" value={form.city} onChange={update('city')} placeholder="Santiago" testid="company-city" />
              <Field label="País" value={form.country} onChange={update('country')} placeholder="Chile" testid="company-country" />
            </div>
          </CardContent>
        </Card>

        {/* Representante legal */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Representante legal</CardTitle>
            <CardDescription>Persona responsable ante fiscalizaciones y auditorías.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre completo" value={form.legal_representative} onChange={update('legal_representative')} placeholder="Juan Pérez" testid="company-rep-name" />
            <Field label="RUT" value={form.legal_representative_rut} onChange={update('legal_representative_rut')} placeholder="15.123.456-7" testid="company-rep-rut" />
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700" data-testid="company-save-btn">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar cambios
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Company;
