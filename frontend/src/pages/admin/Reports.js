import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { BarChart3, Download, Users, Award, Clock, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminReports = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [usersReport, setUsersReport] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [statsRes, usersRes] = await Promise.all([
        fetch(`${API}/reports/summary`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API}/reports/users`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsersReport(await usersRes.json());
    } catch (error) {
      toast.error('Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  const exportUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/reports/export/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reporte_usuarios.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Reporte exportado');
      }
    } catch (error) {
      toast.error('Error al exportar');
    }
  };

  const exportCertificates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/reports/export/certificates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reporte_certificados.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Reporte exportado');
      }
    } catch (error) {
      toast.error('Error al exportar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const certData = [
    { name: 'Válidos', value: stats?.valid_certificates || 0 },
    { name: 'Vencidos', value: stats?.expired_certificates || 0 },
  ];

  const COLORS = ['#10B981', '#F59E0B'];

  // Group users by hours trained
  const hoursDistribution = [
    { range: '0-10h', count: usersReport.filter(u => u.total_hours_trained <= 10).length },
    { range: '11-20h', count: usersReport.filter(u => u.total_hours_trained > 10 && u.total_hours_trained <= 20).length },
    { range: '21-50h', count: usersReport.filter(u => u.total_hours_trained > 20 && u.total_hours_trained <= 50).length },
    { range: '+50h', count: usersReport.filter(u => u.total_hours_trained > 50).length },
  ];

  return (
    <div className="space-y-6" data-testid="admin-reports">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Reportes
          </h1>
          <p className="text-slate-600 mt-1">Estadísticas y exportación de datos</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={exportUsers}
            data-testid="export-users-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Usuarios
          </Button>
          <Button
            variant="outline"
            onClick={exportCertificates}
            data-testid="export-certs-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Certificados
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Alumnos</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.total_users || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Certificados Emitidos</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.total_certificates || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <Award className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Cursos Completados</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.total_completions || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Horas Capacitadas</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.total_hours_trained || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by Role */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Alumnos por Rol</CardTitle>
            <CardDescription>Distribución de usuarios según su rol asignado</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.users_by_role && stats.users_by_role.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.users_by_role}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="role" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} name="Usuarios" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                No hay datos disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {/* Certificates Status */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Estado de Certificados</CardTitle>
            <CardDescription>Certificados válidos vs vencidos</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.total_certificates > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={certData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {certData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                No hay certificados emitidos
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hours Distribution */}
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader>
            <CardTitle>Distribución de Horas Capacitadas</CardTitle>
            <CardDescription>Cantidad de usuarios según horas de capacitación acumuladas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hoursDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="range" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} name="Usuarios" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Users Table */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Top 10 Alumnos por Horas Capacitadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">#</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Alumno</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Empresa</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Rol</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Certificados</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Horas</th>
                </tr>
              </thead>
              <tbody>
                {usersReport
                  .sort((a, b) => b.total_hours_trained - a.total_hours_trained)
                  .slice(0, 10)
                  .map((user, index) => (
                    <tr key={user.user_id} className="border-b border-slate-100">
                      <td className="py-3 px-4">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                          index < 3 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-slate-900">{user.full_name || user.name}</p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{user.company || '-'}</td>
                      <td className="py-3 px-4 text-slate-600">{user.role_name}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">{user.certificates_count}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-blue-600">{user.total_hours_trained}h</span>
                      </td>
                    </tr>
                  ))}
                {usersReport.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No hay datos de usuarios
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReports;
