import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Building2, Users, BookOpen, Award, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const [cRes, sRes] = await Promise.all([
          fetch(`${API}/superadmin/companies`, { headers }),
          fetch(`${API}/reports/summary`, { headers }),
        ]);
        if (cRes.ok) setCompanies(await cRes.json());
        if (sRes.ok) setStats(await sRes.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const cards = [
    { label: 'Empresas', value: companies.length, icon: Building2, color: 'bg-blue-50 text-blue-700' },
    { label: 'Empresas activas', value: companies.filter((c) => c.is_active).length, icon: Building2, color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Total usuarios (global)', value: stats?.total_users || 0, icon: Users, color: 'bg-indigo-50 text-indigo-700' },
    { label: 'Total cursos (global)', value: stats?.total_courses || 0, icon: BookOpen, color: 'bg-violet-50 text-violet-700' },
    { label: 'Certificados emitidos', value: stats?.total_certificates || 0, icon: Award, color: 'bg-amber-50 text-amber-700' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Resumen Global</h1>
        <p className="text-sm text-slate-500">Vista consolidada de todas las empresas de Aptiva.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{c.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{c.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.color}`}>
                  <c.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Empresas registradas</CardTitle>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no hay empresas. Crea la primera desde el menú Empresas.</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {companies.map((c) => (
                <div key={c.company_id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.contact_email || 'Sin email'} · {c.rut || 'Sin RUT'}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {c.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;
