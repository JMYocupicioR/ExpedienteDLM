import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  FileText, 
  Pill, 
  Activity, 
  Calendar, 
  Settings, 
  LogOut,
  Plus,
  Search,
  Bell,
  ArrowRight,
  Clock,
  AlertTriangle,
  TrendingUp,
  User,
  Phone,
  Mail
} from 'lucide-react';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../components/ui/button';
import Logo from '../components/Logo';
import NewPatientForm from '../components/NewPatientForm';
import { appointmentService, Appointment } from '../lib/services/appointment-service';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [quickSearchResults, setQuickSearchResults] = useState<any[]>([]);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [realStats, setRealStats] = useState({
    patients: 0,
    consultations: 0,
    prescriptions: 0,
    todayConsultations: 0,
    todayAppointments: 0,
    upcomingAppointments: 0
  });
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user) {
          await loadDashboardData();
          await loadUpcomingAppointments(user.id);
        }
      } catch (error) {
        console.error('Error getting user:', error);
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, []);

  useEffect(() => {
    if (searchTerm.length > 2) {
      performQuickSearch();
    } else {
      setQuickSearchResults([]);
      setShowQuickSearch(false);
    }
  }, [searchTerm]);

  const loadDashboardData = async () => {
    try {
      // Cargar estadísticas reales
      const [patientsResult, consultationsResult, prescriptionsResult, recentPatientsResult] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact' }),
        supabase.from('consultations').select('id', { count: 'exact' }),
        supabase.from('prescriptions').select('id', { count: 'exact' }),
        supabase.from('patients')
          .select('id, full_name, phone, email, created_at')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      // Consultas de hoy
      const today = new Date().toISOString().split('T')[0];
      const todayConsultationsResult = await supabase
        .from('consultations')
        .select('id', { count: 'exact' })
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      setRealStats({
        patients: patientsResult.count || 0,
        consultations: consultationsResult.count || 0,
        prescriptions: prescriptionsResult.count || 0,
        todayConsultations: todayConsultationsResult.count || 0,
        todayAppointments: 0, // Se actualizará en loadUpcomingAppointments
        upcomingAppointments: 0 // Se actualizará en loadUpcomingAppointments
      });

      setRecentPatients(recentPatientsResult.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const loadUpcomingAppointments = async (userId: string) => {
    try {
      setLoadingAppointments(true);
      
      // Obtener citas desde hoy hasta los próximos 7 días
      const today = new Date();
      const nextWeek = addDays(today, 7);
      
      const appointments = await appointmentService.getAppointmentsByDateRange(
        format(today, 'yyyy-MM-dd'),
        format(nextWeek, 'yyyy-MM-dd'),
        userId
      );

      // Filtrar solo citas pendientes y confirmadas
      const filteredAppointments = appointments
        .filter(apt => ['scheduled', 'confirmed'].includes(apt.status))
        .sort((a, b) => {
          const dateTimeA = new Date(`${a.appointment_date}T${a.appointment_time}`);
          const dateTimeB = new Date(`${b.appointment_date}T${b.appointment_time}`);
          return dateTimeA.getTime() - dateTimeB.getTime();
        })
        .slice(0, 5); // Mostrar solo las próximas 5 citas

      setUpcomingAppointments(filteredAppointments);

      // Actualizar estadísticas
      const todayAppointments = appointments.filter(apt => 
        isToday(new Date(apt.appointment_date)) && ['scheduled', 'confirmed'].includes(apt.status)
      ).length;

      setRealStats(prev => ({
        ...prev,
        todayAppointments,
        upcomingAppointments: filteredAppointments.length
      }));

    } catch (error) {
      console.error('Error loading upcoming appointments:', error);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const performQuickSearch = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name, phone, email')
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .limit(5);

      if (error) throw error;
      setQuickSearchResults(data || []);
      setShowQuickSearch(true);
    } catch (error) {
      console.error('Error in quick search:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getAppointmentDateLabel = (date: string) => {
    const appointmentDate = new Date(date);
    if (isToday(appointmentDate)) {
      return 'Hoy';
    } else if (isTomorrow(appointmentDate)) {
      return 'Mañana';
    } else {
      return format(appointmentDate, "EEE d 'de' MMM", { locale: es });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-600 text-blue-100';
      case 'confirmed':
        return 'bg-green-600 text-green-100';
      case 'in_progress':
        return 'bg-yellow-600 text-yellow-100';
      case 'completed':
        return 'bg-gray-600 text-gray-100';
      case 'cancelled':
        return 'bg-red-600 text-red-100';
      default:
        return 'bg-gray-600 text-gray-100';
    }
  };

  const handleNewPatientCreated = (newPatient: any) => {
    // Recargar datos del dashboard para actualizar estadísticas
    loadDashboardData();
    
    // Opcional: Navegar al expediente del nuevo paciente
    navigate(`/expediente/${newPatient.id}`);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Programada';
      case 'confirmed':
        return 'Confirmada';
      case 'in_progress':
        return 'En Progreso';
      case 'completed':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      case 'no_show':
        return 'No Asistió';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Logo />
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-300 hover:text-white p-2">
                <Bell className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-gray-300 text-sm">{user?.email}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="text-gray-300 border-gray-600 hover:bg-gray-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-3xl font-bold text-white mb-2">
                Bienvenido, {user?.email}
              </h1>
              <p className="text-gray-400">
                Panel de control de Expediente DLM
              </p>
            </div>
            
            {/* Quick Search */}
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Búsqueda rápida de pacientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              />
              
              {/* Quick Search Results */}
              {showQuickSearch && quickSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                  {quickSearchResults.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => {
                        navigate(`/expediente/${patient.id}`);
                        setShowQuickSearch(false);
                        setSearchTerm('');
                      }}
                      className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{patient.full_name}</p>
                          <p className="text-gray-400 text-sm">{patient.email || patient.phone}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-cyan-400" />
                      </div>
                    </div>
                  ))}
                  <div className="p-3 bg-gray-750 border-t border-gray-700">
                    <button
                      onClick={() => {
                        navigate('/patients');
                        setShowQuickSearch(false);
                        setSearchTerm('');
                      }}
                      className="text-cyan-400 text-sm hover:text-cyan-300 flex items-center"
                    >
                      Ver todos los pacientes
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* No Results */}
              {showQuickSearch && quickSearchResults.length === 0 && searchTerm.length > 2 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 p-3">
                  <p className="text-gray-400 text-sm">No se encontraron pacientes</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Link to="/patients" className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-cyan-400 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-blue-500 rounded-lg group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-400 text-sm">Total Pacientes</p>
                  <p className="text-2xl font-bold text-white">{realStats.patients.toLocaleString()}</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-cyan-400 transition-colors" />
            </div>
          </Link>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-green-500 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-gray-400 text-sm">Consultas Totales</p>
                <p className="text-2xl font-bold text-white">{realStats.consultations.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
                  <span className="text-green-400 text-xs">Activo</span>
                </div>
              </div>
            </div>
          </div>
          
          <Link to="/recetas" className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-cyan-400 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-purple-500 rounded-lg group-hover:scale-110 transition-transform">
                  <Pill className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-400 text-sm">Recetas Emitidas</p>
                  <p className="text-2xl font-bold text-white">{realStats.prescriptions.toLocaleString()}</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-cyan-400 transition-colors" />
            </div>
          </Link>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-gray-400 text-sm">Consultas Hoy</p>
                <p className="text-2xl font-bold text-white">{realStats.todayConsultations}</p>
                {realStats.todayConsultations > 0 && (
                  <div className="flex items-center mt-1">
                    <Activity className="h-3 w-3 text-cyan-400 mr-1" />
                    <span className="text-cyan-400 text-xs">En progreso</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <Link to="/citas" className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-cyan-400 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-teal-500 rounded-lg group-hover:scale-110 transition-transform">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-400 text-sm">Citas Hoy</p>
                  <p className="text-2xl font-bold text-white">{realStats.todayAppointments}</p>
                  <div className="flex items-center mt-1">
                    <Clock className="h-3 w-3 text-teal-400 mr-1" />
                    <span className="text-teal-400 text-xs">{realStats.upcomingAppointments} próximas</span>
                  </div>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-cyan-400 transition-colors" />
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Acciones Rápidas</h2>
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => setShowNewPatientForm(true)}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Paciente
              </Button>
              <Button asChild variant="outline" className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-gray-900">
                <Link to="/recetas">
                  <Pill className="h-4 w-4 mr-2" />
                  Nueva Receta
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-green-400 text-green-400 hover:bg-green-400 hover:text-gray-900">
                <Link to="/plantillas">
                  <FileText className="h-4 w-4 mr-2" />
                  Plantillas
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-orange-400 text-orange-400 hover:bg-orange-400 hover:text-gray-900">
                <Link to="/citas">
                  <Calendar className="h-4 w-4 mr-2" />
                  Citas Médicas
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-gray-900">
                <Link to="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Configuración
                </Link>
              </Button>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-cyan-400" />
                Próximas Citas
              </h2>
              <Link to="/citas" className="text-cyan-400 text-sm hover:text-cyan-300 flex items-center">
                Ver calendario
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            
            <div className="space-y-4">
              {loadingAppointments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                </div>
              ) : upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((appointment) => (
                  <div 
                    key={appointment.id}
                    onClick={() => navigate('/citas')}
                    className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors group border-l-4 border-cyan-400"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-white font-medium">{appointment.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                            {getStatusLabel(appointment.status)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-300 mb-2">
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {getAppointmentDateLabel(appointment.appointment_date)} - {appointment.appointment_time}
                          </div>
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {appointment.patient?.full_name}
                          </div>
                        </div>

                        {appointment.patient && (
                          <div className="flex items-center space-x-4 text-xs text-gray-400">
                            {appointment.patient.phone && (
                              <div className="flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                {appointment.patient.phone}
                              </div>
                            )}
                            {appointment.patient.email && (
                              <div className="flex items-center">
                                <Mail className="h-3 w-3 mr-1" />
                                {appointment.patient.email}
                              </div>
                            )}
                          </div>
                        )}

                        {appointment.notes && (
                          <p className="text-gray-400 text-xs mt-2 line-clamp-2">
                            {appointment.notes}
                          </p>
                        )}
                      </div>
                      
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-cyan-400 transition-colors ml-2 flex-shrink-0" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm mb-4">No tienes citas programadas</p>
                  <Button asChild className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
                    <Link to="/citas">
                      <Plus className="h-4 w-4 mr-2" />
                      Programar Primera Cita
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Mini vista de pacientes recientes */}
            {recentPatients.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-300">Pacientes Recientes</h3>
                  <Link to="/patients" className="text-cyan-400 text-xs hover:text-cyan-300">
                    Ver todos
                  </Link>
                </div>
                <div className="flex space-x-2">
                  {recentPatients.slice(0, 4).map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => navigate(`/expediente/${patient.id}`)}
                      className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                      title={patient.full_name}
                    >
                      <span className="text-white font-semibold text-xs">
                        {patient.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </span>
                    </div>
                  ))}
                  {recentPatients.length > 4 && (
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-gray-300 text-xs">+{recentPatients.length - 4}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Actividad Reciente</h2>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Últimas 24 horas</span>
              <Activity className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          <div className="space-y-3">
            {upcomingAppointments.length > 0 && (
              <div className="flex items-center text-gray-300">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mr-3"></div>
                <span>Cita programada con {upcomingAppointments[0].patient?.full_name}</span>
                <span className="ml-auto text-gray-500 text-sm">
                  {getAppointmentDateLabel(upcomingAppointments[0].appointment_date)}
                </span>
              </div>
            )}
            
            {recentPatients.length > 0 && (
              <div className="flex items-center text-gray-300">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                <span>Nuevo expediente creado para {recentPatients[0].full_name}</span>
                <span className="ml-auto text-gray-500 text-sm">
                  {new Date(recentPatients[0].created_at).toLocaleDateString('es-ES', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            )}
            
            <div className="flex items-center text-gray-300">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
              <span>Sistema de citas médicas activado</span>
              <span className="ml-auto text-gray-500 text-sm">Hoy</span>
            </div>
            
            <div className="flex items-center text-gray-300">
              <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
              <span>Selector de pacientes mejorado</span>
              <span className="ml-auto text-gray-500 text-sm">Hoy</span>
            </div>
            
            {realStats.todayConsultations > 0 && (
              <div className="flex items-center text-gray-300">
                <div className="w-2 h-2 bg-orange-400 rounded-full mr-3"></div>
                <span>{realStats.todayConsultations} consulta{realStats.todayConsultations > 1 ? 's' : ''} realizada{realStats.todayConsultations > 1 ? 's' : ''} hoy</span>
                <span className="ml-auto text-gray-500 text-sm">Hoy</span>
              </div>
            )}
          </div>
          
          {upcomingAppointments.length === 0 && recentPatients.length === 0 && (
            <div className="text-center py-6">
              <Activity className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No hay actividad reciente</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Nuevo Paciente */}
      <NewPatientForm
        isOpen={showNewPatientForm}
        onClose={() => setShowNewPatientForm(false)}
        onSave={handleNewPatientCreated}
      />
    </div>
  );
};

export default Dashboard;