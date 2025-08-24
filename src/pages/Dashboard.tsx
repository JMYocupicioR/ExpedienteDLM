import ClinicStatusCard from '@/components/ClinicStatusCard';
import GenerateInvitationLinkModal from '@/components/GenerateInvitationLinkModal';
import QuickStartModal from '@/components/QuickStartModal';
import { Button } from '@/components/ui/button';
import NewPatientForm from '@/features/patients/components/NewPatientForm';
import { useClinic } from '@/features/clinic/context/ClinicContext';
import { Appointment, appointmentService } from '@/lib/services/appointment-service';
import { supabase } from '@/lib/supabase';
import { addDays, format, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Activity,
  ArrowRight,
  Building2,
  Calendar,
  Clock,
  FileText,
  Mail,
  Phone,
  Pill,
  Plus,
  Search,
  Settings,
  TrendingUp,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ActivityLogViewer from '@/components/Logs/ActivityLogViewer';

const Dashboard = () => {
  const navigate = useNavigate();
  const { activeClinic, userClinics, isLoading: isClinicLoading } = useClinic();
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [quickSearchResults, setQuickSearchResults] = useState<
    Array<{ id: string; full_name: string; phone?: string | null; email?: string | null }>
  >([]);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [realStats, setRealStats] = useState({
    patients: 0,
    consultations: 0,
    prescriptions: 0,
    todayConsultations: 0,
    todayAppointments: 0,
    upcomingAppointments: 0,
  });
  const [recentPatients, setRecentPatients] = useState<
    Array<{
      id: string;
      full_name: string;
      created_at: string;
      phone?: string | null;
      email?: string | null;
      last_consultation?: string;
    }>
  >([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showQuickStartModal, setShowQuickStartModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      try {
        // Guard: no continuar si no existe sesión
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) navigate('/auth');
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;

        setUser(user);
        if (user) {
          // El rol y la clínica ahora vienen de useClinic,
          // pero mantenemos la carga del perfil para otros datos.
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (cancelled) return;
          setUserProfile(profile);

          // La verificación de admin ahora puede usar userClinics
          const currentMembership = userClinics.find(m => m.clinic_id === activeClinic?.id);
          setIsAdmin(currentMembership?.role === 'admin' || profile?.role === 'super_admin');

          if (activeClinic) {
            await loadDashboardData(activeClinic.id);
            await loadUpcomingAppointments(user.id, activeClinic.id);
          }
        }
      } catch (error) {
        console.error('Error getting user:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (!isClinicLoading) {
      bootstrap();
    }
    return () => {
      cancelled = true;
    };
  }, [navigate, isClinicLoading, activeClinic, userClinics]);

  useEffect(() => {
    if (searchTerm.length > 2 && activeClinic) {
      performQuickSearch(activeClinic.id);
    } else {
      setQuickSearchResults([]);
      setShowQuickSearch(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, activeClinic]);

  const loadDashboardData = async (clinicId: string) => {
    try {
      // Cargar estadísticas reales filtradas por clínica
      const [patientsResult, consultationsResult, prescriptionsResult, recentPatientsResult] =
        await Promise.all([
          supabase.from('patients').select('id', { count: 'exact' }).eq('clinic_id', clinicId),
          supabase.from('consultations').select('id', { count: 'exact' }).eq('clinic_id', clinicId),
          supabase.from('prescriptions').select('id', { count: 'exact' }).eq('clinic_id', clinicId),
          supabase
            .from('patients')
            .select(
              `
            id,
            full_name,
            phone,
            email,
            created_at,
            consultations (
              id,
              created_at
            )
          `
            )
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false })
            .limit(isAdmin ? 10 : 5),
        ]);

      // Consultas de hoy
      const today = new Date().toISOString().split('T')[0];
      const todayConsultationsResult = await supabase
        .from('consultations')
        .select('id', { count: 'exact' })
        .eq('clinic_id', clinicId)
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      setRealStats({
        patients: patientsResult.count || 0,
        consultations: consultationsResult.count || 0,
        prescriptions: prescriptionsResult.count || 0,
        todayConsultations: todayConsultationsResult.count || 0,
        todayAppointments: 0, // Se actualizará en loadUpcomingAppointments
        upcomingAppointments: 0, // Se actualizará en loadUpcomingAppointments
      });

      // Procesar pacientes recientes con última consulta
      const processedPatients = (recentPatientsResult.data || []).map(patient => ({
        ...patient,
        last_consultation:
          patient.consultations && patient.consultations.length > 0
            ? patient.consultations.sort(
                (a: any, b: any) =>
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0]?.created_at
            : null,
      }));

      setRecentPatients(processedPatients);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const loadUpcomingAppointments = async (userId: string, clinicId: string) => {
    try {
      setLoadingAppointments(true);

      // Obtener citas desde hoy hasta los próximos 7 días
      const today = new Date();
      const nextWeek = addDays(today, 7);

      const appointments = await appointmentService.getAppointmentsByDateRange(
        format(today, 'yyyy-MM-dd'),
        format(nextWeek, 'yyyy-MM-dd'),
        userId,
        clinicId
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
      const todayAppointments = appointments.filter(
        apt =>
          isToday(new Date(apt.appointment_date)) && ['scheduled', 'confirmed'].includes(apt.status)
      ).length;

      setRealStats(prev => ({
        ...prev,
        todayAppointments,
        upcomingAppointments: filteredAppointments.length,
      }));
    } catch (error) {
      console.error('Error loading upcoming appointments:', error);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const performQuickSearch = async (clinicId: string) => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name, phone, email')
        .eq('clinic_id', clinicId)
        .or(
          `full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
        )
        .limit(5);

      if (error) throw error;
      setQuickSearchResults(
        (data || []).map(
          (d: { id: string; full_name: string; phone?: string | null; email?: string | null }) => ({
            id: d.id,
            full_name: d.full_name,
            phone: d.phone,
            email: d.email,
          })
        )
      );
      setShowQuickSearch(true);
    } catch (error) {
      console.error('Error in quick search:', error);
    }
  };

  // Sign out is now handled in the global Navbar

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

  const handleNewPatientCreated = (newPatient: { id: string }) => {
    // Recargar datos del dashboard para actualizar estadísticas
    if (activeClinic) {
      loadDashboardData(activeClinic.id);
    }

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
      <div className='min-h-screen bg-gray-900 flex items-center justify-center'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400'></div>
      </div>
    );
  }

  return (
    <>
      {/* Main Content - sin padding adicional ya que AppLayout lo maneja */}
      <main className='w-full max-w-none'>
        {/* Removido el padding y margin que causaba espacios extra */}
        {/* Welcome Section */}
        <section className='section'>
          <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
            <div className='flex-1'>
              <h1 className='section-title text-3xl mb-2'>Bienvenido, {user?.email}</h1>
              <p className='section-subtitle'>Panel de control de Expediente DLM</p>
            </div>

            {/* Quick Search */}
            <div className='relative w-full lg:w-[28rem]'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5' />
              <input
                type='text'
                placeholder='Búsqueda rápida de pacientes...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='form-input w-full pl-10'
              />

              {/* Quick Search Results */}
              {showQuickSearch && quickSearchResults.length > 0 && (
                <div className='absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto'>
                  {quickSearchResults.map(patient => (
                    <div
                      key={patient.id}
                      onClick={() => {
                        navigate(`/expediente/${patient.id}`);
                        setShowQuickSearch(false);
                        setSearchTerm('');
                      }}
                      className='p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0'
                    >
                      <div className='flex items-center justify-between'>
                        <div>
                          <p className='text-white font-medium'>{patient.full_name}</p>
                          <p className='text-gray-400 text-sm'>{patient.email || patient.phone}</p>
                        </div>
                        <ArrowRight className='h-4 w-4 text-cyan-400' />
                      </div>
                    </div>
                  ))}
                  <div className='p-3 bg-gray-750 border-t border-gray-700'>
                    <button
                      onClick={() => {
                        navigate('/patients');
                        setShowQuickSearch(false);
                        setSearchTerm('');
                      }}
                      className='text-cyan-400 text-sm hover:text-cyan-300 flex items-center'
                    >
                      Ver todos los pacientes
                      <ArrowRight className='h-3 w-3 ml-1' />
                    </button>
                  </div>
                </div>
              )}

              {/* No Results */}
              {showQuickSearch && quickSearchResults.length === 0 && searchTerm.length > 2 && (
                <div className='absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 p-3'>
                  <p className='text-gray-400 text-sm'>No se encontraron pacientes</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className='section'>
          <div className='stats-grid'>
            <Link to='/patients' className='card group'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center'>
                  <div className='stats-card-icon p-3 bg-blue-500 rounded-xl group-hover:scale-110 transition-transform duration-200'>
                    <Users className='h-6 w-6 text-white' />
                  </div>
                  <div className='ml-4'>
                    <p className='text-gray-400 text-sm font-medium'>Total Pacientes</p>
                    <p className='text-2xl lg:text-3xl font-bold text-white'>
                      {realStats.patients.toLocaleString()}
                    </p>
                  </div>
                </div>
                <ArrowRight className='h-5 w-5 text-gray-400 group-hover:text-cyan-400 transition-colors' />
              </div>
            </Link>

            <div className='card'>
              <div className='flex items-center'>
                <div className='stats-card-icon p-3 bg-green-500 rounded-xl'>
                  <FileText className='h-6 w-6 text-white' />
                </div>
                <div className='ml-4'>
                  <p className='text-gray-400 text-sm font-medium'>Consultas Totales</p>
                  <p className='text-2xl lg:text-3xl font-bold text-white'>
                    {realStats.consultations.toLocaleString()}
                  </p>
                  <div className='flex items-center mt-2'>
                    <TrendingUp className='h-3 w-3 text-green-400 mr-1' />
                    <span className='text-green-400 text-xs font-medium'>Activo</span>
                  </div>
                </div>
              </div>
            </div>

            <Link to='/recetas' className='card group'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center'>
                  <div className='stats-card-icon p-3 bg-purple-500 rounded-xl group-hover:scale-110 transition-transform duration-200'>
                    <Pill className='h-6 w-6 text-white' />
                  </div>
                  <div className='ml-4'>
                    <p className='text-gray-400 text-sm font-medium'>Recetas Emitidas</p>
                    <p className='text-2xl lg:text-3xl font-bold text-white'>
                      {realStats.prescriptions.toLocaleString()}
                    </p>
                  </div>
                </div>
                <ArrowRight className='h-5 w-5 text-gray-400 group-hover:text-cyan-400 transition-colors' />
              </div>
            </Link>

            <div className='card'>
              <div className='flex items-center'>
                <div className='stats-card-icon p-3 bg-orange-500 rounded-xl'>
                  <Clock className='h-6 w-6 text-white' />
                </div>
                <div className='ml-4'>
                  <p className='text-gray-400 text-sm font-medium'>Consultas Hoy</p>
                  <p className='text-2xl lg:text-3xl font-bold text-white'>
                    {realStats.todayConsultations}
                  </p>
                  {realStats.todayConsultations > 0 && (
                    <div className='flex items-center mt-2'>
                      <Activity className='h-3 w-3 text-cyan-400 mr-1' />
                      <span className='text-cyan-400 text-xs font-medium'>En progreso</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Link to='/citas' className='card group'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center'>
                  <div className='stats-card-icon p-3 bg-teal-500 rounded-xl group-hover:scale-110 transition-transform duration-200'>
                    <Calendar className='h-6 w-6 text-white' />
                  </div>
                  <div className='ml-4'>
                    <p className='text-gray-400 text-sm font-medium'>Citas Hoy</p>
                    <p className='text-2xl lg:text-3xl font-bold text-white'>
                      {realStats.todayAppointments}
                    </p>
                    <div className='flex items-center mt-2'>
                      <Clock className='h-3 w-3 text-teal-400 mr-1' />
                      <span className='text-teal-400 text-xs font-medium'>
                        {realStats.upcomingAppointments} próximas
                      </span>
                    </div>
                  </div>
                </div>
                <ArrowRight className='h-5 w-5 text-gray-400 group-hover:text-cyan-400 transition-colors' />
              </div>
            </Link>
          </div>
        </section>

        {/* Clinic Status Section - Ahora controlado por el contexto */}
        <section className='section'>
          <ClinicStatusCard />
        </section>

        {/* Admin Section - Lista de Pacientes */}
        {isAdmin && activeClinic && (
          <section className='section'>
            <div className='card'>
              <div className='flex items-center justify-between mb-6'>
                <h2 className='text-xl lg:text-2xl font-semibold text-white flex items-center'>
                  <UserCheck className='h-6 w-6 mr-3 text-cyan-400' />
                  Pacientes de la Clínica
                </h2>
                <div className='flex items-center space-x-4'>
                  <Link
                    to='/clinic-admin'
                    className='text-cyan-400 text-sm hover:text-cyan-300 flex items-center transition-colors'
                  >
                    <Building2 className='h-4 w-4 mr-1' />
                    Administrar Clínica
                  </Link>
                  <Link
                    to='/patients'
                    className='text-cyan-400 text-sm hover:text-cyan-300 flex items-center transition-colors'
                  >
                    Ver todos los pacientes
                    <ArrowRight className='h-4 w-4 ml-1' />
                  </Link>
                </div>
              </div>

              {/* Lista de pacientes recientes con más detalles */}
              <div className='space-y-3'>
                {recentPatients.length > 0 ? (
                  recentPatients.map(patient => (
                    <div
                      key={patient.id}
                      onClick={() => navigate(`/expediente/${patient.id}`)}
                      className='p-4 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors group'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-4'>
                          <div className='w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center'>
                            <span className='text-white font-semibold text-sm'>
                              {patient.full_name
                                .split(' ')
                                .map(n => n[0])
                                .join('')
                                .substring(0, 2)}
                            </span>
                          </div>
                          <div>
                            <h3 className='text-white font-medium'>{patient.full_name}</h3>
                            <div className='flex items-center space-x-3 text-sm text-gray-400'>
                              {patient.phone && (
                                <div className='flex items-center'>
                                  <Phone className='h-3 w-3 mr-1' />
                                  {patient.phone}
                                </div>
                              )}
                              {patient.email && (
                                <div className='flex items-center'>
                                  <Mail className='h-3 w-3 mr-1' />
                                  {patient.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className='flex items-center space-x-4'>
                          <div className='text-right'>
                            <p className='text-xs text-gray-400'>Última consulta</p>
                            <p className='text-sm text-white'>
                              {patient.last_consultation
                                ? new Date(patient.last_consultation).toLocaleDateString('es-ES', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : 'Sin consultas'}
                            </p>
                          </div>
                          <ArrowRight className='h-5 w-5 text-gray-400 group-hover:text-cyan-400 transition-colors' />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='text-center py-8'>
                    <Users className='h-12 w-12 text-gray-600 mx-auto mb-3' />
                    <p className='text-gray-400 mb-4'>No hay pacientes registrados en tu clínica</p>
                    <Button
                      onClick={() => setShowNewPatientForm(true)}
                      className='bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                    >
                      <Plus className='h-4 w-4 mr-2' />
                      Agregar Primer Paciente
                    </Button>
                  </div>
                )}
              </div>

              {/* Estadísticas rápidas de la clínica */}
              {recentPatients.length > 0 && (
                <div className='mt-6 pt-4 border-t border-gray-700'>
                  <div className='grid grid-cols-3 gap-4 text-center'>
                    <div>
                      <p className='text-2xl font-bold text-white'>{realStats.patients}</p>
                      <p className='text-xs text-gray-400'>Total Pacientes</p>
                    </div>
                    <div>
                      <p className='text-2xl font-bold text-white'>{realStats.consultations}</p>
                      <p className='text-xs text-gray-400'>Consultas Totales</p>
                    </div>
                    <div>
                      <p className='text-2xl font-bold text-white'>
                        {realStats.todayConsultations}
                      </p>
                      <p className='text-xs text-gray-400'>Consultas Hoy</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section className='section'>
          <div className='dashboard-grid content-grid'>
            <div className='card'>
              <h2 className='text-xl lg:text-2xl font-semibold text-white mb-6'>
                Acciones Rápidas
              </h2>
              <div className='grid grid-cols-2 gap-4'>
                <Button
                  onClick={() => setShowQuickStartModal(true)}
                  className='bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                >
                  <Activity className='h-4 w-4 mr-2' />
                  Iniciar Consulta
                </Button>
                <Button
                  onClick={() => setShowNewPatientForm(true)}
                  className='bg-gray-700 hover:bg-gray-600 text-white'
                >
                  <Plus className='h-4 w-4 mr-2' />
                  Nuevo Paciente
                </Button>
                <Button
                  asChild
                  variant='outline'
                  className='border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-gray-900'
                >
                  <Link to='/recetas'>
                    <Pill className='h-4 w-4 mr-2' />
                    Nueva Receta
                  </Link>
                </Button>
                <Button
                  onClick={() => setShowInviteModal(true)}
                  variant='outline'
                  className='border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-gray-900'
                >
                  <Plus className='h-4 w-4 mr-2' />
                  Enlace de Registro
                </Button>
                <Button
                  asChild
                  variant='outline'
                  className='border-green-400 text-green-400 hover:bg-green-400 hover:text-gray-900'
                >
                  <Link to='/plantillas'>
                    <FileText className='h-4 w-4 mr-2' />
                    Plantillas
                  </Link>
                </Button>
                <Button
                  asChild
                  variant='outline'
                  className='border-orange-400 text-orange-400 hover:bg-orange-400 hover:text-gray-900'
                >
                  <Link to='/citas'>
                    <Calendar className='h-4 w-4 mr-2' />
                    Citas Médicas
                  </Link>
                </Button>
                <Button
                  asChild
                  variant='outline'
                  className='border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-gray-900'
                >
                  <Link to='/settings'>
                    <Settings className='h-4 w-4 mr-2' />
                    Configuración
                  </Link>
                </Button>
                {isAdmin && (
                  <Button
                    asChild
                    variant='outline'
                    className='border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-gray-900 col-span-2'
                  >
                    <Link to='/clinic-admin'>
                      <Building2 className='h-4 w-4 mr-2' />
                      Administrar Clínica
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            <div className='card'>
              <div className='flex items-center justify-between mb-6'>
                <h2 className='text-xl lg:text-2xl font-semibold text-white flex items-center'>
                  <Calendar className='h-6 w-6 mr-3 text-cyan-400' />
                  Próximas Citas
                </h2>
                <Link
                  to='/citas'
                  className='text-cyan-400 text-sm hover:text-cyan-300 flex items-center transition-colors'
                >
                  Ver calendario
                  <ArrowRight className='h-4 w-4 ml-1' />
                </Link>
              </div>

              <div className='space-y-4'>
                {loadingAppointments ? (
                  <div className='flex items-center justify-center py-8'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400'></div>
                  </div>
                ) : upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map(appointment => (
                    <div
                      key={appointment.id}
                      onClick={() => navigate('/citas')}
                      className='p-4 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors group border-l-4 border-cyan-400'
                    >
                      <div className='flex items-start justify-between mb-2'>
                        <div className='flex-1'>
                          <div className='flex items-center space-x-2 mb-1'>
                            <h3 className='text-white font-medium'>{appointment.title}</h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}
                            >
                              {getStatusLabel(appointment.status)}
                            </span>
                          </div>

                          <div className='flex items-center space-x-4 text-sm text-gray-300 mb-2'>
                            <div className='flex items-center'>
                              <Clock className='h-3 w-3 mr-1' />
                              {getAppointmentDateLabel(appointment.appointment_date)} -{' '}
                              {appointment.appointment_time}
                            </div>
                            <div className='flex items-center'>
                              <User className='h-3 w-3 mr-1' />
                              {appointment.patient?.full_name}
                            </div>
                          </div>

                          {appointment.patient && (
                            <div className='flex items-center space-x-4 text-xs text-gray-400'>
                              {appointment.patient.phone && (
                                <div className='flex items-center'>
                                  <Phone className='h-3 w-3 mr-1' />
                                  {appointment.patient.phone}
                                </div>
                              )}
                              {appointment.patient.email && (
                                <div className='flex items-center'>
                                  <Mail className='h-3 w-3 mr-1' />
                                  {appointment.patient.email}
                                </div>
                              )}
                            </div>
                          )}

                          {appointment.notes && (
                            <p className='text-gray-400 text-xs mt-2 line-clamp-2'>
                              {appointment.notes}
                            </p>
                          )}
                        </div>

                        <ArrowRight className='h-4 w-4 text-gray-400 group-hover:text-cyan-400 transition-colors ml-2 flex-shrink-0' />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='text-center py-8'>
                    <Calendar className='h-12 w-12 text-gray-600 mx-auto mb-3' />
                    <p className='text-gray-400 text-sm mb-4'>No tienes citas programadas</p>
                    <Button
                      asChild
                      className='bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                    >
                      <Link to='/citas'>
                        <Plus className='h-4 w-4 mr-2' />
                        Programar Primera Cita
                      </Link>
                    </Button>
                  </div>
                )}
              </div>

              {/* Mini vista de pacientes recientes */}
              {recentPatients.length > 0 && (
                <div className='mt-6 pt-4 border-t border-gray-700'>
                  <div className='flex items-center justify-between mb-3'>
                    <h3 className='text-sm font-medium text-gray-300'>Pacientes Recientes</h3>
                    <Link to='/patients' className='text-cyan-400 text-xs hover:text-cyan-300'>
                      Ver todos
                    </Link>
                  </div>
                  <div className='flex space-x-2'>
                    {recentPatients.slice(0, 4).map(patient => (
                      <div
                        key={patient.id}
                        onClick={() => navigate(`/expediente/${patient.id}`)}
                        className='w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform'
                        title={patient.full_name}
                      >
                        <span className='text-white font-semibold text-xs'>
                          {patient.full_name
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .substring(0, 2)}
                        </span>
                      </div>
                    ))}
                    {recentPatients.length > 4 && (
                      <div className='w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center'>
                        <span className='text-gray-300 text-xs'>+{recentPatients.length - 4}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section className='section'>
          <div className='card'>
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-xl lg:text-2xl font-semibold text-white'>Actividad Reciente</h2>
              <div className='flex items-center space-x-2'>
                <span className='text-xs text-gray-400'>Últimas 24 horas</span>
                <Activity className='h-4 w-4 text-gray-400' />
              </div>
            </div>

            <div className='space-y-3'>
              {upcomingAppointments.length > 0 && (
                <div className='flex items-center text-gray-300'>
                  <div className='w-2 h-2 bg-cyan-400 rounded-full mr-3'></div>
                  <span>Cita programada con {upcomingAppointments[0].patient?.full_name}</span>
                  <span className='ml-auto text-gray-500 text-sm'>
                    {getAppointmentDateLabel(upcomingAppointments[0].appointment_date)}
                  </span>
                </div>
              )}

              {recentPatients.length > 0 && (
                <div className='flex items-center text-gray-300'>
                  <div className='w-2 h-2 bg-green-400 rounded-full mr-3'></div>
                  <span>Nuevo expediente creado para {recentPatients[0].full_name}</span>
                  <span className='ml-auto text-gray-500 text-sm'>
                    {new Date(recentPatients[0].created_at).toLocaleDateString('es-ES', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}

              <div className='flex items-center text-gray-300'>
                <div className='w-2 h-2 bg-blue-400 rounded-full mr-3'></div>
                <span>Sistema de citas médicas activado</span>
                <span className='ml-auto text-gray-500 text-sm'>Hoy</span>
              </div>

              <div className='flex items-center text-gray-300'>
                <div className='w-2 h-2 bg-purple-400 rounded-full mr-3'></div>
                <span>Selector de pacientes mejorado</span>
                <span className='ml-auto text-gray-500 text-sm'>Hoy</span>
              </div>

              {realStats.todayConsultations > 0 && (
                <div className='flex items-center text-gray-300'>
                  <div className='w-2 h-2 bg-orange-400 rounded-full mr-3'></div>
                  <span>
                    {realStats.todayConsultations} consulta
                    {realStats.todayConsultations > 1 ? 's' : ''} realizada
                    {realStats.todayConsultations > 1 ? 's' : ''} hoy
                  </span>
                  <span className='ml-auto text-gray-500 text-sm'>Hoy</span>
                </div>
              )}
            </div>

            {upcomingAppointments.length === 0 && recentPatients.length === 0 && (
              <div className='text-center py-6'>
                <Activity className='h-8 w-8 text-gray-600 mx-auto mb-2' />
                <p className='text-gray-400 text-sm'>No hay actividad reciente</p>
              </div>
            )}
          </div>
        </section>

        {/* Visor de Logs de Actividad */}
        <ActivityLogViewer />
      </main>

      {/* Modal de Nuevo Paciente */}
      <NewPatientForm
        isOpen={showNewPatientForm}
        onClose={() => setShowNewPatientForm(false)}
        onSave={handleNewPatientCreated}
      />

      {/* Modal de Inicio Rápido de Consulta */}
      <QuickStartModal
        isOpen={showQuickStartModal}
        onClose={() => setShowQuickStartModal(false)}
        title='Iniciar Nueva Consulta'
        mode='consultation'
      />
      <GenerateInvitationLinkModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </>
  );
};

export default Dashboard;
