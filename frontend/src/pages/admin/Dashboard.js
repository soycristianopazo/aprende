import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { 
  Users, BookOpen, Award, Clock, TrendingUp, 
  UserCheck, FileCheck, AlertTriangle, Loader2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
    setupAdmin();
  }, []);

  const setupAdmin = async () => {
    try {
      await fetch(`${API}/setup/admin`, { method: 'POST' });
    } catch (error) {
      console.error('Setup error:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/reports/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  const statCards = [
    { 
      title: 'Total Usuarios', 
      value: stats?.total_users || 0, 
      icon: Users, 
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50'
    },
    { 
      title: 'Usuarios Activos', 
      value: stats?.active_users || 0, 
      icon: UserCheck, 
      color: 'bg-green-500',
      bgLight: 'bg-green-50'
    },
    { 
      title: 'Cursos Publicados', 
      value: stats?.published_courses || 0, 
      icon: BookOpen, 
      color: 'bg-orange-500',
      bgLight: 'bg-orange-50'
    },
    { 
      title: 'Certificados Válidos', 
      value: stats?.valid_certificates || 0, 
      icon: Award, 
      color: 'bg-purple-500',
      bgLight: 'bg-purple-50'
    },
    { 
      title: 'Certificados Vencidos', 
      value: stats?.expired_certificates || 0, 
      icon: AlertTriangle, 
      color: 'bg-amber-500',
      bgLight: 'bg-amber-50'
    },
    { 
      title: 'Horas Capacitadas', 
      value: stats?.total_hours_trained || 0, 
      icon: Clock, 
      color: 'bg-teal-500',
      bgLight: 'bg-teal-50'
    },
  ];

  const certData = [
    { name: 'Válidos', value: stats?.valid_certificates || 0 },
    { name: 'Vencidos', value: stats?.expired_certificates || 0 },
  ];

  const COLORS = ['#10B981', '#F59E0B'];

  return (
    <div className="space-y-8 animate-fade-in" data-testid="admin-dashboard">
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Dashboard
        </h1>
        <p className="text-slate-600 mt-1">
          Vista general de la plataforma de capacitación
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {statCards.map((stat, index) => (
          <Card 
            key={index} 
            className="border-slate-200 hover:shadow-md transition-shadow"
            data-testid={`stat-card-${index}`}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.bgLight} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by Role */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Usuarios por Rol
            </CardTitle>
            <CardDescription>Distribución de alumnos según su rol</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.users_by_role && stats.users_by_role.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
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
                  <Bar dataKey="count" fill="#F97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                No hay datos de usuarios por rol
              </div>
            )}
          </CardContent>
        </Card>

        {/* Certificates Status */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-orange-500" />
              Estado de Certificados
            </CardTitle>
            <CardDescription>Certificados válidos vs vencidos</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.total_certificates > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={certData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
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
      </div>

      {/* Quick Stats */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Resumen General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <p className="text-3xl font-bold text-orange-500">{stats?.total_courses || 0}</p>
              <p className="text-sm text-slate-600 mt-1">Total Cursos</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <p className="text-3xl font-bold text-orange-500">{stats?.total_completions || 0}</p>
              <p className="text-sm text-slate-600 mt-1">Cursos Completados</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <p className="text-3xl font-bold text-orange-500">{stats?.total_certificates || 0}</p>
              <p className="text-sm text-slate-600 mt-1">Total Certificados</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <p className="text-3xl font-bold text-orange-500">{stats?.total_hours_trained || 0}</p>
              <p className="text-sm text-slate-600 mt-1">Horas Totales</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
