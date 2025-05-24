import React, { useState, useEffect, Fragment, ChangeEvent, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, Menu, Transition } from '@headlessui/react';
import { 
  Users, Search, UserPlus, Eye, Edit, 
  FileText, Calendar, AlertCircle, LogOut,
  Settings, Printer, Trash2, Pill, Stethoscope,
  ChevronLeft, ChevronRight, Filter, SortAsc, SortDesc,
  RefreshCw, X, CheckCircle, Clock, Bell
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import SettingsModal from '../components/SettingsModal';

// Types
type Patient = {
  id: string;
  full_name: string;
  birth_date: string;
  email: string;
  phone: string;
  address?: string;
  gender: 'masculino' | 'femenino' | 'otro';
  created_at: string;
  updated_at?: string;
};

type Consultation = {
  id: string;
  patient_id: string;
  created_at: string;
  diagnosis: string;
};

type NewPatientForm = {
  full_name: string;
  birth_date: string;
  gender: 'masculino' | 'femenino' | 'otro';
  email?: string;
  phone?: string;
  address?: string;
};

type UserProfile = {
  id: string;
  role: string;
  full_name: string | null;
  license_number?: string;
  phone?: string;
  schedule?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
    start_time: string;
    end_time: string;
  };
};

type SortField = 'full_name' | 'birth_date' | 'created_at' | 'email';
type SortDirection = 'asc' | 'desc';

type SearchFilters = {
  term: string;
  gender: string;
  dateFrom: string;
  dateTo: string;
};

type DashboardStats = {
  totalPatients: number;
  totalConsultations: number;
  activeRecords: number;
  todayConsultations: number;
  monthlyGrowth: number;
};

type NotificationType = 'success' | 'error' | 'warning' | 'info';
type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
};

// Pagination constants
const ITEMS_PER_PAGE = 10;

export default function Dashboard() {
  // States
  const [patients, setPatients] = useState<Patient[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    totalConsultations: 0,
    activeRecords: 0,
    todayConsultations: 0,
    monthlyGrowth: 0
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // UI States
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Form and data states
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Search and pagination
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    term: '',
    gender: '',
    dateFrom: '',
    dateTo: ''
  });
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<NewPatientForm>();

  // ✅ NUEVO: Memoized filtered and sorted patients
  const sortedAndFilteredPatients = useMemo(() => {
    let filtered = patients.filter(patient => {
      const matchesTerm = !searchFilters.term || 
        patient.full_name.toLowerCase().includes(searchFilters.term.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchFilters.term.toLowerCase()) ||
        patient.phone?.includes(searchFilters.term) ||
        patient.id.includes(searchFilters.term);
      
      const matchesGender = !searchFilters.gender || patient.gender === searchFilters.gender;
      
      const matchesDateFrom = !searchFilters.dateFrom || 
        new Date(patient.created_at) >= new Date(searchFilters.dateFrom);
      
      const matchesDateTo = !searchFilters.dateTo || 
        new Date(patient.created_at) <= new Date(searchFilters.dateTo + 'T23:59:59');

      return matchesTerm && matchesGender && matchesDateFrom && matchesDateTo;
    });

    // Sort patients
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      if (sortField === 'birth_date' || sortField === 'created_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [patients, searchFilters, sortField, sortDirection]);

  // ✅ NUEVO: Pagination logic
  const paginatedPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedAndFilteredPatients.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedAndFilteredPatients, currentPage]);

  const totalPages = Math.ceil(sortedAndFilteredPatients.length / ITEMS_PER_PAGE);

  // ✅ NUEVO: Calculate dynamic stats
  const calculateStats = useCallback((patients: Patient[], consultations: Consultation[]) => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const todayConsultations = consultations.filter(c => 
      new Date(c.created_at) >= startOfToday
    ).length;

    const thisMonthPatients = patients.filter(p => 
      new Date(p.created_at) >= startOfMonth
    ).length;

    const lastMonthPatients = patients.filter(p => {
      const date = new Date(p.created_at);
      return date >= startOfLastMonth && date <= endOfLastMonth;
    }).length;

    const monthlyGrowth = lastMonthPatients > 0 
      ? ((thisMonthPatients - lastMonthPatients) / lastMonthPatients) * 100 
      : thisMonthPatients > 0 ? 100 : 0;

    return {
      totalPatients: patients.length,
      totalConsultations: consultations.length,
      activeRecords: patients.length,
      todayConsultations,
      monthlyGrowth: Math.round(monthlyGrowth * 10) / 10
    };
  }, []);

  // ✅ NUEVO: Notification system
  const addNotification = useCallback((type: NotificationType, title: string, message: string) => {
    const notification: Notification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: new Date(),
      read: false
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep only 10 notifications
    
    // Auto-remove after 5 seconds for success messages
    if (type === 'success') {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    }
  }, []);

  // ✅ MEJORADO: Session check with retry logic
  const checkSession = useCallback(async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      if (!session) {
        navigate('/auth');
        return;
      }

      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // If profile exists, use it
      if (profile) {
        setUserProfile(profile);
      } else {
        // Only create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            email: session.user.email,
            role: 'doctor',
            full_name: session.user.email?.split('@')[0] || 'Usuario'
          })
          .select('*')
          .single();

        if (createError) throw createError;
        setUserProfile(newProfile);
      }

      // Check role permissions
      const currentProfile = profile || userProfile;
      if (currentProfile && !['administrator', 'doctor'].includes(currentProfile.role)) {
        throw new Error('No tienes permisos para acceder a esta sección');
      }

      await fetchData();
      setRetryCount(0); // Reset retry count on success
      
    } catch (error: any) {
      console.error('Session check error:', error);
      setError(error.message);
      
      if (retryCount < 3 && !error.message.includes('permisos')) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          checkSession();
        }, 2000 * (retryCount + 1)); // Exponential backoff
      } else {
        setTimeout(() => navigate('/auth'), 3000);
      }
    }
  }, [navigate, retryCount, userProfile]);

  // ✅ NUEVO: Fetch all data with better error handling
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch patients and consultations in parallel
      const [patientsResult, consultationsResult] = await Promise.all([
        supabase.from('patients').select('*').order('created_at', { ascending: false }),
        supabase.from('consultations').select('id, patient_id, created_at, diagnosis').order('created_at', { ascending: false })
      ]);

      if (patientsResult.error) {
        if (patientsResult.error.code === '42501') {
          throw new Error('No tienes permisos para ver pacientes');
        } else {
          throw new Error('Error al cargar los pacientes');
        }
      }

      if (consultationsResult.error) {
        console.warn('Error loading consultations:', consultationsResult.error);
        // Don't throw for consultations, just log
      }

      const patients = patientsResult.data || [];
      const consultations = consultationsResult.data || [];

      setPatients(patients);
      setConsultations(consultations);
      setStats(calculateStats(patients, consultations));
      setLastRefresh(new Date());
      
      // Reset current page if needed
      const newTotalPages = Math.ceil(patients.length / ITEMS_PER_PAGE);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(1);
      }

    } catch (err: any) {
      setError(err.message);
      console.error('Error:', err);
      addNotification('error', 'Error de carga', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [calculateStats, currentPage, addNotification]);

  // ✅ MEJORADO: Manual refresh with notification
  const handleRefresh = useCallback(() => {
    fetchData();
    addNotification('info', 'Actualizando', 'Recargando datos...');
  }, [fetchData, addNotification]);

  // ✅ MEJORADO: Handle sign out
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/auth');
    } catch (error: any) {
      setError(error.message);
      addNotification('error', 'Error', 'No se pudo cerrar sesión');
    }
  };

  // ✅ MEJORADO: Create patient with better validation
  const onNewPatient = async (data: NewPatientForm) => {
    try {
      setIsLoading(true);
      setError(null);

      // Client-side validation
      if (new Date(data.birth_date) > new Date()) {
        throw new Error('La fecha de nacimiento no puede ser futura');
      }

      const age = new Date().getFullYear() - new Date(data.birth_date).getFullYear();
      if (age > 120) {
        throw new Error('La edad no puede ser mayor a 120 años');
      }

      const { error: insertError } = await supabase
        .from('patients')
        .insert([data]);

      if (insertError) {
        if (insertError.code === '42501') {
          throw new Error('No tienes permisos para crear pacientes');
        } else if (insertError.code === '23505') {
          throw new Error('Ya existe un paciente con ese email o teléfono');
        } else {
          throw new Error('Error al crear el paciente');
        }
      }

      await fetchData();
      setIsNewPatientOpen(false);
      reset();
      addNotification('success', 'Paciente creado', `${data.full_name} ha sido agregado exitosamente`);
      
    } catch (err: any) {
      setError(err.message);
      addNotification('error', 'Error al crear paciente', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ MEJORADO: Delete patient with confirmation
  const handleDeletePatient = async (patientId: string) => {
    try {
      setIsDeleting(true);
      setError(null);

      const patientName = patients.find(p => p.id === patientId)?.full_name || 'el paciente';

      const { error: deleteError } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (deleteError) {
        if (deleteError.code === '42501') {
          throw new Error('No tienes permisos para eliminar pacientes');
        } else if (deleteError.code === '23503') {
          throw new Error('No se puede eliminar: el paciente tiene consultas registradas');
        } else {
          throw new Error('Error al eliminar el paciente');
        }
      }

      await fetchData();
      setPatientToDelete(null);
      addNotification('success', 'Paciente eliminado', `${patientName} ha sido eliminado correctamente`);
      
    } catch (err: any) {
      setError(err.message);
      addNotification('error', 'Error al eliminar', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // ✅ NUEVO: Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // ✅ NUEVO: Clear filters
  const clearFilters = () => {
    setSearchFilters({
      term: '',
      gender: '',
      dateFrom: '',
      dateTo: ''
    });
    setCurrentPage(1);
  };

  // ✅ NUEVO: Mark notification as read
  const markNotificationAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  // Initialize
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // ✅ NUEVO: Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchData]);

  // Update filtered patients when dependencies change
  useEffect(() => {
    setFilteredPatients(sortedAndFilteredPatients);
  }, [sortedAndFilteredPatients]);

  // ✅ NUEVO: Handle prescription navigation
  const handlePrintPrescription = (patientId: string) => {
    navigate(`/recetas?paciente=${patientId}`);
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Navigation */}
      <nav className="bg-gray-900/90 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="responsive-container">
          <div className="flex justify-between items-center h-16 lg:h-18">
            <div className="flex items-center">
              <Stethoscope className="h-7 w-7 sm:h-8 sm:w-8 text-cyan-400" />
              <span className="ml-2 text-lg sm:text-xl font-bold text-white">Expediente DLM</span>
            </div>
            {userProfile && (
              <div className="flex items-center space-x-2 sm:space-x-4">
                <span className="hidden md:block text-xs sm:text-sm text-gray-300 truncate max-w-32 lg:max-w-none">
                  {userProfile.full_name || 'Usuario'} ({userProfile.role})
                </span>
                
                {/* ✅ NUEVO: Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-gray-400 hover:text-white transition-colors relative"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </button>
                  
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                      <div className="p-3 border-b border-gray-700">
                        <h3 className="text-sm font-medium text-white">Notificaciones</h3>
                      </div>
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 text-sm">
                          No hay notificaciones
                        </div>
                      ) : (
                        <div className="py-2">
                          {notifications.map(notification => (
                            <div
                              key={notification.id}
                              className={`px-4 py-3 border-b border-gray-700 hover:bg-gray-750 cursor-pointer ${
                                !notification.read ? 'bg-blue-900/20' : ''
                              }`}
                              onClick={() => markNotificationAsRead(notification.id)}
                            >
                              <div className="flex items-start space-x-3">
                                <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                                  notification.type === 'success' ? 'bg-green-500' :
                                  notification.type === 'error' ? 'bg-red-500' :
                                  notification.type === 'warning' ? 'bg-yellow-500' :
                                  'bg-blue-500'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white">{notification.title}</p>
                                  <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {format(notification.timestamp, 'HH:mm', { locale: es })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="inline-flex items-center px-2 py-2 sm:px-3 sm:py-2 border border-gray-600 text-xs sm:text-sm leading-4 font-medium rounded-md text-gray-300 hover:text-white hover:border-cyan-400 transition-all touch-target"
                >
                  <Settings className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Configuración</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center px-2 py-2 sm:px-3 sm:py-2 border border-red-600 text-xs sm:text-sm leading-4 font-medium rounded-md text-red-400 hover:text-white hover:bg-red-600 transition-all touch-target"
                >
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="responsive-container py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
              Sistema de Gestión de Pacientes
            </h1>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>Gestiona y supervisa los expedientes médicos</span>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>Última actualización: {format(lastRefresh, 'HH:mm', { locale: es })}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:space-x-3">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-300 bg-gray-800/50 hover:bg-gray-700 hover:border-cyan-400 transition-all touch-button"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="truncate">Actualizar</span>
            </button>
            <button
              onClick={() => navigate('/recetas')}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-300 bg-gray-800/50 hover:bg-gray-700 hover:border-cyan-400 transition-all touch-button"
            >
              <Pill className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="truncate">Gestión de Recetas</span>
            </button>
            <button
              onClick={() => setIsNewPatientOpen(true)}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-all touch-button"
              disabled={isLoading}
            >
              <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Nuevo Paciente
            </button>
          </div>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="mb-4 bg-red-900/50 border border-red-700 text-red-300 px-3 sm:px-4 py-3 rounded-lg flex items-start sm:items-center text-sm">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0 mt-0.5 sm:mt-0" />
            <span className="break-words">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 bg-green-900/50 border border-green-700 text-green-300 px-3 sm:px-4 py-3 rounded-lg flex items-start sm:items-center text-sm">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0 mt-0.5 sm:mt-0" />
            <span className="break-words">{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-auto text-green-400 hover:text-green-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ✅ MEJORADO: Stats Cards con datos dinámicos */}
        <div className="responsive-grid mb-6 sm:mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 sm:p-6 hover:border-cyan-400/50 transition-all desktop-hover">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />
                </div>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <dt className="text-xs sm:text-sm font-medium text-gray-400 truncate">
                  Total Pacientes
                </dt>
                <dd className="text-xl sm:text-2xl font-bold text-white">
                  {stats.totalPatients}
                </dd>
                {stats.monthlyGrowth !== 0 && (
                  <p className={`text-xs ${stats.monthlyGrowth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.monthlyGrowth > 0 ? '+' : ''}{stats.monthlyGrowth}% este mes
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 sm:p-6 hover:border-cyan-400/50 transition-all desktop-hover">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
                </div>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <dt className="text-xs sm:text-sm font-medium text-gray-400 truncate">
                  Total Consultas
                </dt>
                <dd className="text-xl sm:text-2xl font-bold text-white">
                  {stats.totalConsultations}
                </dd>
                <p className="text-xs text-gray-400">
                  Hoy: {stats.todayConsultations}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 sm:p-6 hover:border-cyan-400/50 transition-all desktop-hover">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
                </div>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <dt className="text-xs sm:text-sm font-medium text-gray-400 truncate">
                  Expedientes Activos
                </dt>
                <dd className="text-xl sm:text-2xl font-bold text-white">
                  {stats.activeRecords}
                </dd>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ NUEVO: Advanced Search and Filters */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 sm:p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <h2 className="text-lg sm:text-xl font-semibold text-white">
              Lista de Pacientes
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              {/* Search */}
              <div className="relative flex-1 sm:min-w-80">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email, teléfono o ID..."
                  className="w-full pl-8 sm:pl-10 pr-4 py-2 sm:py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all text-sm sm:text-base"
                  value={searchFilters.term}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, term: e.target.value }))}
                />
              </div>
              
              {/* Filter Toggle */}
              <button
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className={`inline-flex items-center px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                  isFiltersOpen ? 'border-cyan-400 text-cyan-300 bg-cyan-400/10' : 'border-gray-600 text-gray-300 hover:text-white'
                }`}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </button>
            </div>
          </div>

          {/* ✅ NUEVO: Advanced Filters */}
          {isFiltersOpen && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Género</label>
                  <select
                    value={searchFilters.gender}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  >
                    <option value="">Todos</option>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Fecha desde</label>
                  <input
                    type="date"
                    value={searchFilters.dateFrom}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Fecha hasta</label>
                  <input
                    type="date"
                    value={searchFilters.dateTo}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          )}

          {/* ✅ NUEVO: Results summary */}
          <div className="mt-4 flex justify-between items-center text-sm text-gray-400">
            <span>
              Mostrando {paginatedPatients.length} de {sortedAndFilteredPatients.length} pacientes
              {searchFilters.term && ` (filtrado de ${patients.length} total)`}
            </span>
          </div>
        </div>

        {/* ✅ MEJORADO: Patients List with pagination */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 sm:p-6">
          {isLoading ? (
            <div className="responsive-loading">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-4"></div>
                <p className="text-sm text-gray-400">Cargando pacientes...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              {/* Desktop Table View */}
              <table className="hidden sm:table min-w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('full_name')}
                        className="flex items-center text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-white transition-colors"
                      >
                        Nombre
                        {sortField === 'full_name' && (
                          sortDirection === 'asc' ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('birth_date')}
                        className="flex items-center text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-white transition-colors"
                      >
                        Fecha de Nacimiento
                        {sortField === 'birth_date' && (
                          sortDirection === 'asc' ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('created_at')}
                        className="flex items-center text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-white transition-colors"
                      >
                        Fecha de Registro
                        {sortField === 'created_at' && (
                          sortDirection === 'asc' ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {paginatedPatients.map((patient: Patient) => (
                    <tr key={patient.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">
                          {patient.full_name}
                        </div>
                        <div className="text-xs text-gray-400 capitalize">
                          {patient.gender}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {format(new Date(patient.birth_date), 'dd/MM/yyyy')}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date().getFullYear() - new Date(patient.birth_date).getFullYear()} años
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{patient.email || 'N/A'}</div>
                        <div className="text-sm text-gray-400">{patient.phone || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {format(new Date(patient.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-3">
                          <button
                            onClick={() => navigate(`/expediente/${patient.id}`)}
                            className="text-cyan-400 hover:text-cyan-300 transition-colors"
                            title="Ver expediente"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <Menu as="div" className="relative inline-block text-left">
                            <Menu.Button className="text-gray-400 hover:text-white transition-colors">
                              <Edit className="h-5 w-5" />
                            </Menu.Button>
                            <Transition
                              as={Fragment}
                              enter="transition ease-out duration-100"
                              enterFrom="transform opacity-0 scale-95"
                              enterTo="transform opacity-100 scale-100"
                              leave="transition ease-in duration-75"
                              leaveFrom="transform opacity-100 scale-100"
                              leaveTo="transform opacity-0 scale-95"
                            >
                              <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-600 rounded-lg bg-gray-800 shadow-xl border border-gray-700 focus:outline-none">
                                <div className="px-1 py-1">
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        onClick={() => handlePrintPrescription(patient.id)}
                                        className={`${
                                          active ? 'bg-cyan-600 text-white' : 'text-gray-300'
                                        } group flex w-full items-center rounded-md px-2 py-2 text-sm transition-colors`}
                                      >
                                        <Printer className="mr-2 h-5 w-5" />
                                        Imprimir Receta
                                      </button>
                                    )}
                                  </Menu.Item>
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        onClick={() => setPatientToDelete(patient.id)}
                                        className={`${
                                          active ? 'bg-red-600 text-white' : 'text-red-400'
                                        } group flex w-full items-center rounded-md px-2 py-2 text-sm transition-colors`}
                                      >
                                        <Trash2 className="mr-2 h-5 w-5" />
                                        Eliminar Paciente
                                      </button>
                                    )}
                                  </Menu.Item>
                                </div>
                              </Menu.Items>
                            </Transition>
                          </Menu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-4">
                {paginatedPatients.map((patient: Patient) => (
                  <div key={patient.id} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-white text-base">{patient.full_name}</h3>
                        <p className="text-sm text-gray-300 mt-1 capitalize">
                          {patient.gender} • {format(new Date(patient.birth_date), 'dd/MM/yyyy')}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigate(`/expediente/${patient.id}`)}
                          className="p-2 text-cyan-400 hover:text-cyan-300 transition-colors touch-target"
                          title="Ver expediente"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <Menu as="div" className="relative">
                          <Menu.Button className="p-2 text-gray-400 hover:text-white transition-colors touch-target">
                            <Edit className="h-5 w-5" />
                          </Menu.Button>
                          <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                          >
                            <Menu.Items className="absolute right-0 top-full mt-2 w-48 origin-top-right rounded-lg bg-gray-800 shadow-xl border border-gray-700 focus:outline-none z-10">
                              <div className="p-1">
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => handlePrintPrescription(patient.id)}
                                      className={`${
                                        active ? 'bg-cyan-600 text-white' : 'text-gray-300'
                                      } group flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors`}
                                    >
                                      <Printer className="mr-2 h-4 w-4" />
                                      Imprimir Receta
                                    </button>
                                  )}
                                </Menu.Item>
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => setPatientToDelete(patient.id)}
                                      className={`${
                                        active ? 'bg-red-600 text-white' : 'text-red-400'
                                      } group flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors`}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar Paciente
                                    </button>
                                  )}
                                </Menu.Item>
                              </div>
                            </Menu.Items>
                          </Transition>
                        </Menu>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Email:</span>
                        <span className="text-gray-300 truncate ml-2">{patient.email || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Teléfono:</span>
                        <span className="text-gray-300">{patient.phone || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Registrado:</span>
                        <span className="text-gray-300">
                          {format(new Date(patient.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Empty state */}
              {paginatedPatients.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">
                    {sortedAndFilteredPatients.length === 0 ? 'No hay pacientes registrados' : 'No se encontraron pacientes'}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {sortedAndFilteredPatients.length === 0 ? 'Comienza agregando tu primer paciente' : 'Intenta cambiar los filtros de búsqueda'}
                  </p>
                </div>
              )}

              {/* ✅ NUEVO: Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between border-t border-gray-700 pt-4">
                  <div className="text-sm text-gray-400">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      if (totalPages <= 5) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 text-sm rounded transition-colors ${
                              currentPage === page
                                ? 'bg-cyan-600 text-white'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      }
                      return null;
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Patient Modal */}
      <Transition appear show={isNewPatientOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsNewPatientOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-xl bg-gray-800 border border-gray-700 p-4 sm:p-6 text-left align-middle shadow-xl transition-all mobile-modal">
                  <Dialog.Title as="h3" className="text-lg sm:text-xl font-medium leading-6 text-white mb-4 sm:mb-6">
                    Agregar Nuevo Paciente
                  </Dialog.Title>
                  
                  <form onSubmit={handleSubmit(onNewPatient)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Nombre completo *
                      </label>
                      <input
                        {...register('full_name', { 
                          required: 'El nombre es requerido',
                          minLength: { value: 2, message: 'Mínimo 2 caracteres' },
                          maxLength: { value: 100, message: 'Máximo 100 caracteres' }
                        })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all text-sm sm:text-base"
                        placeholder="Nombre completo del paciente"
                      />
                      {errors.full_name && (
                        <p className="mt-1 text-sm text-red-400">{errors.full_name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Fecha de nacimiento *
                      </label>
                      <input
                        {...register('birth_date', { 
                          required: 'La fecha de nacimiento es requerida',
                          validate: {
                            notFuture: value => new Date(value) <= new Date() || 'La fecha no puede ser futura',
                            validAge: value => {
                              const age = new Date().getFullYear() - new Date(value).getFullYear();
                              return age <= 120 || 'Edad no válida';
                            }
                          }
                        })}
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all text-sm sm:text-base"
                      />
                      {errors.birth_date && (
                        <p className="mt-1 text-sm text-red-400">{errors.birth_date.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Género *
                      </label>
                      <select
                        {...register('gender', { required: 'El género es requerido' })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all text-sm sm:text-base"
                      >
                        <option value="">Seleccionar género</option>
                        <option value="masculino">Masculino</option>
                        <option value="femenino">Femenino</option>
                        <option value="otro">Otro</option>
                      </select>
                      {errors.gender && (
                        <p className="mt-1 text-sm text-red-400">{errors.gender.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        {...register('email', {
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Email inválido'
                          }
                        })}
                        type="email"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all text-sm sm:text-base"
                        placeholder="correo@ejemplo.com"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Teléfono
                      </label>
                      <input
                        {...register('phone', {
                          pattern: {
                            value: /^[\d\s\-\(\)\+]+$/,
                            message: 'Formato de teléfono inválido'
                          }
                        })}
                        type="tel"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all text-sm sm:text-base"
                        placeholder="(555) 123-4567"
                      />
                      {errors.phone && (
                        <p className="mt-1 text-sm text-red-400">{errors.phone.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Dirección
                      </label>
                      <textarea
                        {...register('address', {
                          maxLength: { value: 500, message: 'Máximo 500 caracteres' }
                        })}
                        rows={3}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all resize-none text-sm sm:text-base"
                        placeholder="Dirección completa del paciente"
                      />
                      {errors.address && (
                        <p className="mt-1 text-sm text-red-400">{errors.address.message}</p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsNewPatientOpen(false)}
                        className="w-full sm:w-auto px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base touch-button"
                        disabled={isLoading}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50 text-sm sm:text-base touch-button flex items-center justify-center"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                            Guardando...
                          </>
                        ) : (
                          'Guardar Paciente'
                        )}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Confirmation Modal */}
      <Transition appear show={!!patientToDelete} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setPatientToDelete(null)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-gray-800 border border-gray-700 p-4 sm:p-6 text-left align-middle shadow-xl transition-all mobile-modal">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white mb-4">
                    Confirmar Eliminación
                  </Dialog.Title>
                  
                  <div className="mb-6">
                    <p className="text-gray-300 text-sm sm:text-base">
                      ¿Estás seguro de que deseas eliminar este paciente? Esta acción no se puede deshacer y se eliminarán todos sus datos relacionados.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setPatientToDelete(null)}
                      className="w-full sm:w-auto px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base touch-button"
                      disabled={isDeleting}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => patientToDelete && handleDeletePatient(patientToDelete)}
                      disabled={isDeleting}
                      className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm sm:text-base touch-button flex items-center justify-center"
                    >
                      {isDeleting ? (
                        <>
                          <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                          Eliminando...
                        </>
                      ) : (
                        'Eliminar'
                      )}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          userProfile={userProfile}
          onUpdate={setUserProfile}
        />
      )}
    </div>
  );
}