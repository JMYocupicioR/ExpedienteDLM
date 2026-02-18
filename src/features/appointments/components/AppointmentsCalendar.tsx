import React, { useCallback, useEffect, useRef, useState } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  User, 
  MapPin, 
  Edit, 
  Trash2,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  CheckCircle,
  Eye,
  Plus as PlusIcon
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday, 
  addMonths, 
  subMonths,
  getDay,
  startOfWeek,
  endOfWeek,
  addDays
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import AppointmentForm from '@/components/AppointmentForm';
import ValidationNotification, { useValidationNotifications } from '@/components/ValidationNotification';
import { 
  EnhancedAppointment, 
  CreateAppointmentPayload, 
  UpdateAppointmentPayload,
  AppointmentStatus
} from '@/lib/database.types';
import useEnhancedAppointments from '@/features/appointments/hooks/useEnhancedAppointments';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useClinic } from '@/features/clinic/context/ClinicContext';
import { useIsAssistant } from '@/hooks/useIsAssistant';
import { isAdminDisplayRole } from '@/lib/roles';
import { supabase } from '@/lib/supabase';

interface AppointmentsCalendarProps {
  preselectedStaffId?: string;
  onAppointmentSelect?: (appointment: EnhancedAppointment) => void;
  onNavigateToPatient?: (patientId: string) => void;
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-600 border-blue-500',
  confirmed: 'bg-green-500 border-green-400',
  confirmed_by_patient: 'bg-green-600 border-green-500',
  in_progress: 'bg-yellow-600 border-yellow-500',
  completed: 'bg-gray-600 border-gray-500',
  cancelled_by_clinic: 'bg-red-600 border-red-500',
  cancelled_by_patient: 'bg-orange-600 border-orange-500',
  no_show: 'bg-red-700 border-red-600',
};

const statusLabels: Record<string, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  confirmed_by_patient: 'Confirmada por Paciente',
  in_progress: 'En Progreso',
  completed: 'Completada',
  cancelled_by_clinic: 'Cancelada por Clínica',
  cancelled_by_patient: 'Cancelada por Paciente',
  no_show: 'No Asistió',
};

const typeLabels = {
  consultation: 'Consulta',
  teleconsultation: 'Teleconsulta',
  follow_up: 'Seguimiento',
  check_up: 'Chequeo',
  procedure: 'Procedimiento',
  emergency: 'Emergencia',
};

// No necesitamos mock patients aquí ya que PatientSelector maneja los datos

interface ClinicStaffItem {
  staff_id: string;
  full_name: string;
  email: string | null;
  role_in_clinic: string;
}

export default function AppointmentsCalendar({ 
  preselectedStaffId,
  onAppointmentSelect,
  onNavigateToPatient 
}: AppointmentsCalendarProps) {
  const { user, profile } = useAuth();
  const { activeClinic, userClinics } = useClinic();
  const { isAssistant } = useIsAssistant();
  const { messages, addError, addSuccess, removeMessage } = useValidationNotifications();

  const activeClinicMember = activeClinic
    ? userClinics.find(m => m.clinic_id === activeClinic.id)
    : null;
  const canScheduleForOthers =
    isAssistant || (activeClinicMember ? isAdminDisplayRole(activeClinicMember.role) : false);

  const [filterDoctorId, setFilterDoctorId] = useState<string | null>(preselectedStaffId ?? null);
  const [clinicStaff, setClinicStaff] = useState<ClinicStaffItem[]>([]);

  const effectiveDoctorId = canScheduleForOthers
    ? filterDoctorId || undefined
    : preselectedStaffId || user?.id;
  const effectiveClinicId = activeClinic?.id ?? profile?.clinic_id ?? undefined;
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<EnhancedAppointment | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  
  // Anti-loop protection
  const loadCountRef = useRef(0);
  const lastLoadTimeRef = useRef(0);
  
  // Fetch clinic staff for doctor filter when assistant/admin
  const fetchClinicStaff = useCallback(async () => {
    if (!effectiveClinicId || !canScheduleForOthers) return;
    try {
      const { data, error } = await supabase.rpc('get_clinic_staff_for_scheduling', {
        p_clinic_id: effectiveClinicId,
      });
      if (error) throw error;
      setClinicStaff((data as ClinicStaffItem[]) || []);
    } catch {
      setClinicStaff([]);
    }
  }, [effectiveClinicId, canScheduleForOthers]);

  useEffect(() => {
    if (canScheduleForOthers && effectiveClinicId) {
      fetchClinicStaff();
    }
  }, [canScheduleForOthers, effectiveClinicId, fetchClinicStaff]);

  useEffect(() => {
    if (preselectedStaffId) {
      setFilterDoctorId(preselectedStaffId);
    }
  }, [preselectedStaffId]);

  // Usar el hook personalizado para manejar citas
  const {
    appointments,
    loading,
    error,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    loadAppointments,
    getAppointmentsByDate,
    getStats
  } = useEnhancedAppointments({
    autoLoad: true,
    filters: {
      ...(effectiveDoctorId && { doctor_id: effectiveDoctorId }),
      clinic_id: effectiveClinicId,
    }
  });

  // Obtener citas del día seleccionado
  const todayAppointments = getAppointmentsByDate(format(selectedDate, 'yyyy-MM-dd'))
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

  // Loading state component
  const LoadingState = () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-3 text-gray-600">Cargando agenda...</span>
    </div>
  );

  // Empty state component
  const EmptyState = () => (
    <div className="text-center py-12">
      <div className="mx-auto h-12 w-12 text-gray-400">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="mt-2 text-sm font-medium text-gray-900">No hay citas programadas</h3>
      <p className="mt-1 text-sm text-gray-500">Comienza creando tu primera cita médica.</p>
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowAppointmentForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nueva Cita
        </button>
      </div>
    </div>
  );

  // Error state component
  const ErrorState = () => (
    <div className="text-center py-12">
      <div className="mx-auto h-12 w-12 text-red-400">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="mt-2 text-sm font-medium text-gray-900">Error al cargar la agenda</h3>
      <p className="mt-1 text-sm text-gray-500">{error}</p>
      <div className="mt-6 space-x-3">
        <button
          type="button"
          onClick={() => loadAppointments()}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Reintentar
        </button>
        <button
          type="button"
          onClick={() => window.open('/diagnostico-citas', '_blank')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Diagnóstico del Sistema
        </button>
      </div>
      <div className="mt-4 text-xs text-gray-400">
        Si el problema persiste, use el diagnóstico para identificar la causa
      </div>
    </div>
  );

  // Recargar cuando cambia el mes - con protección anti-bucle
  useEffect(() => {
    if (effectiveClinicId) {
      const now = Date.now();
      
      // Prevenir bucles infinitos
      if (now - lastLoadTimeRef.current < 1000) {
        loadCountRef.current++;
        if (loadCountRef.current > 3) {
          console.error('Infinite loop detected in appointments loading, stopping');
          return;
        }
      } else {
        loadCountRef.current = 0;
      }
      
      lastLoadTimeRef.current = now;

      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      // Debounce para evitar múltiples llamadas
      const timeoutId = setTimeout(() => {
        loadAppointments({
          ...(effectiveDoctorId && { doctor_id: effectiveDoctorId }),
          clinic_id: effectiveClinicId,
          date_from: format(monthStart, 'yyyy-MM-dd'),
          date_to: format(monthEnd, 'yyyy-MM-dd'),
        });
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [currentDate, effectiveDoctorId, effectiveClinicId]);

  const handleCreateAppointment = async (data: CreateAppointmentPayload) => {
    try {
      await createAppointment(data);
      addSuccess('Éxito', 'Cita creada correctamente');
      setShowAppointmentForm(false);
      setSelectedTimeSlot('');
    } catch (error) {
      // Error log removed for security;
      addError('Error', error instanceof Error ? error.message : 'No se pudo crear la cita');
      throw error;
    }
  };

  const handleUpdateAppointment = async (data: UpdateAppointmentPayload) => {
    if (!editingAppointment) return;

    try {
      await updateAppointment(editingAppointment.id, data);
      addSuccess('Éxito', 'Cita actualizada correctamente');
      setEditingAppointment(null);
      setShowAppointmentForm(false);
    } catch (error) {
      // Error log removed for security;
      addError('Error', error instanceof Error ? error.message : 'No se pudo actualizar la cita');
      throw error;
    }
  };

  const handleCancelAppointment = async (appointmentId: string, cancelledBy: 'clinic' | 'patient' = 'clinic') => {
    if (!confirm('¿Está seguro que desea cancelar esta cita?')) return;

    try {
      await cancelAppointment(appointmentId, cancelledBy);
      addSuccess('Éxito', 'Cita cancelada correctamente');
    } catch (error) {
      // Error log removed for security;
      addError('Error', error instanceof Error ? error.message : 'No se pudo cancelar la cita');
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: AppointmentStatus) => {
    try {
      await updateAppointment(appointmentId, { status: newStatus });
      addSuccess('Éxito', 'Estado de la cita actualizado correctamente');
    } catch (error) {
      // Error log removed for security;
      addError('Error', error instanceof Error ? error.message : 'No se pudo actualizar el estado');
    }
  };

  const handleEditAppointment = (appointment: EnhancedAppointment) => {
    setEditingAppointment(appointment);
    setShowAppointmentForm(true);
  };

  const handleNewAppointment = (date?: Date, time?: string) => {
    if (!effectiveClinicId) {
      addError('Error', 'Complete su perfil o seleccione una clínica.');
      return;
    }

    if (!effectiveDoctorId && !canScheduleForOthers) {
      addError('Error', 'Usuario no autenticado o no hay profesional seleccionado.');
      return;
    }

    setEditingAppointment(null);
    setSelectedDate(date || selectedDate);
    setSelectedTimeSlot(time || '');
    setShowAppointmentForm(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  // Generar días del calendario
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Lunes
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  const getAppointmentsForDay = (date: Date): EnhancedAppointment[] => {
    return appointments.filter(apt => isSameDay(new Date(apt.appointment_date), date));
  };

  const getDayStatus = (date: Date): string => {
    const dayAppointments = getAppointmentsForDay(date);
    if (dayAppointments.length === 0) return '';
    
    const hasConfirmed = dayAppointments.some(apt => apt.status === 'confirmed');
    const hasScheduled = dayAppointments.some(apt => apt.status === 'scheduled');
    const hasInProgress = dayAppointments.some(apt => apt.status === 'in_progress');
    
    if (hasInProgress) return 'ring-2 ring-yellow-400';
    if (hasConfirmed) return 'ring-2 ring-green-400';
    if (hasScheduled) return 'ring-2 ring-blue-400';
    
    return '';
  };

  // Handle different states
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg">
            <LoadingState />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg">
            <ErrorState />
          </div>
        </div>
      </div>
    );
  }

  // Don't show EmptyState immediately - show calendar even with no appointments
  // EmptyState will be shown in the sidebar when no appointments for selected date

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Notifications */}
      <ValidationNotification 
        messages={messages} 
        onDismiss={removeMessage}
        position="top-right"
      />

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendario Principal */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700">
              {/* Header del Calendario */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <div>
                  <h1 className="text-2xl font-bold text-white flex items-center">
                    <Calendar className="h-6 w-6 mr-2 text-cyan-400" />
                    Calendario de Citas
                  </h1>
                  <p className="text-gray-400 text-sm mt-1">
                    {format(currentDate, "MMMM 'de' yyyy", { locale: es })}
                  </p>
                  {canScheduleForOthers && clinicStaff.length > 0 && (
                    <div className="mt-2">
                      <label className="text-xs text-gray-400 mr-2">Ver agenda de:</label>
                      <select
                        value={filterDoctorId ?? '__all__'}
                        onChange={e =>
                          setFilterDoctorId(e.target.value === '__all__' ? null : e.target.value)
                        }
                        className="mt-1 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      >
                        <option value="__all__">Todos los profesionales</option>
                        {clinicStaff.map(s => (
                          <option key={s.staff_id} value={s.staff_id}>
                            {s.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {/* Debug Info */}
                  {import.meta.env.DEV && (
                    <div className="text-xs text-yellow-400 mt-1">
                      User: {user?.id ? '✅' : '❌'} | 
                      Clinic: {profile?.clinic_id ? '✅' : '❌'} | 
                      Modal: {showAppointmentForm ? '✅' : '❌'}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => navigateMonth('prev')}
                    className="p-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => setCurrentDate(new Date())}
                  >
                    Hoy
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => navigateMonth('next')}
                    className="p-2"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      console.log('🔧 Button clicked - Nueva Cita');
                      handleNewAppointment();
                    }}
                    className="ml-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Cita
                  </Button>
                </div>
              </div>

              {/* Días de la semana */}
              <div className="grid grid-cols-7 border-b border-gray-700">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                  <div key={day} className="p-3 text-center text-sm font-medium text-gray-400 border-r border-gray-700 last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              {/* Días del calendario */}
              <div className="grid grid-cols-7">
                {calendarDays.map((date) => {
                  const dayAppointments = getAppointmentsForDay(date);
                  const isCurrentMonth = isSameMonth(date, currentDate);
                  const isSelected = isSameDay(date, selectedDate);
                  const isCurrentDay = isToday(date);

                  return (
                    <div
                      key={date.toISOString()}
                      onClick={() => handleDateClick(date)}
                      className={`
                        min-h-[100px] p-2 border-r border-b border-gray-700 last:border-r-0 cursor-pointer
                        transition-all hover:bg-gray-700
                        ${!isCurrentMonth ? 'bg-gray-850 text-gray-500' : 'bg-gray-800 text-white'}
                        ${isSelected ? 'bg-cyan-900 ring-2 ring-cyan-400' : ''}
                        ${isCurrentDay ? 'bg-blue-900' : ''}
                        ${getDayStatus(date)}
                      `}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${isCurrentDay ? 'text-blue-200' : ''}`}>
                          {format(date, 'd')}
                        </span>
                        {dayAppointments.length > 0 && (
                          <span className="bg-cyan-500 text-white text-xs rounded-full px-1 min-w-[18px] h-[18px] flex items-center justify-center">
                            {dayAppointments.length}
                          </span>
                        )}
                      </div>

                      {/* Citas del día (máximo 3 visibles) */}
                      <div className="space-y-1">
                        {dayAppointments.slice(0, 3).map((appointment) => (
                          <div
                            key={appointment.id}
                            className={`text-xs p-1 rounded truncate border-l-2 ${statusColors[appointment.status]}`}
                            title={`${appointment.appointment_time} - ${appointment.title} (${appointment.patient?.full_name})`}
                          >
                            <div className="font-medium">{appointment.appointment_time}</div>
                            <div className="opacity-90 truncate">{appointment.title}</div>
                          </div>
                        ))}
                        {dayAppointments.length > 3 && (
                          <div className="text-xs text-gray-400 text-center">
                            +{dayAppointments.length - 3} más
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Panel Lateral - Citas del Día */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-cyan-400" />
                  {format(selectedDate, "d 'de' MMMM", { locale: es })}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {isToday(selectedDate) ? 'Hoy' : format(selectedDate, 'EEEE', { locale: es })}
                  {todayAppointments.length > 0 && ` • ${todayAppointments.length} cita${todayAppointments.length > 1 ? 's' : ''}`}
                </p>
              </div>

              <div className="p-6">
                {todayAppointments.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 mb-4">No hay citas programadas</p>
                    <Button
                      onClick={() => handleNewAppointment(selectedDate)}
                      size="default"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Programar Cita
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {todayAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="bg-gray-700 rounded-lg p-4 border-l-4 border-cyan-400 hover:bg-gray-650 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-medium text-white mb-1">
                              {appointment.title}
                            </h3>
                            <div className="flex items-center text-sm text-gray-300 mb-1">
                              <Clock className="h-3 w-3 mr-1" />
                              {appointment.appointment_time} ({appointment.duration} min)
                            </div>
                            <div className="flex items-center text-sm text-gray-300 mb-2">
                              <User className="h-3 w-3 mr-1" />
                              {appointment.patient?.full_name}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => onAppointmentSelect?.(appointment)}
                              className="p-1 text-gray-400 hover:text-cyan-400"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditAppointment(appointment)}
                              className="p-1 text-gray-400 hover:text-blue-400"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleCancelAppointment(appointment.id, 'clinic')}
                              className="p-1 text-gray-400 hover:text-red-400"
                              title="Cancelar Cita"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Estado con dropdown para cambio rápido */}
                        <div className="relative group">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 ${statusColors[appointment.status]}`}>
                            {appointment.status === 'scheduled' && <Clock className="h-3 w-3 mr-1" />}
                            {appointment.status === 'confirmed_by_patient' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {appointment.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {appointment.status.includes('cancelled') && <AlertCircle className="h-3 w-3 mr-1" />}
                            {statusLabels[appointment.status]}
                          </div>
                          
                          {/* Dropdown de estados */}
                          <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 min-w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                            <div className="p-1">
                              {Object.entries(statusLabels).map(([status, label]) => (
                                <button
                                  key={status}
                                  onClick={() => handleStatusChange(appointment.id, status as AppointmentStatus)}
                                  className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-gray-700 transition-colors ${
                                    appointment.status === status ? 'bg-gray-700 text-cyan-400' : 'text-gray-300'
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Información adicional */}
                        {appointment.location && (
                          <div className="flex items-center text-xs text-gray-400 mt-2">
                            <MapPin className="h-3 w-3 mr-1" />
                            {appointment.location}
                          </div>
                        )}

                        {appointment.patient?.phone && (
                          <div className="flex items-center text-xs text-gray-400 mt-1">
                            <Phone className="h-3 w-3 mr-1" />
                            {appointment.patient.phone}
                          </div>
                        )}

                        {appointment.notes && (
                          <div className="flex items-start text-xs text-gray-400 mt-2">
                            <FileText className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{appointment.notes}</span>
                          </div>
                        )}

                        {/* Botones de acción rápida */}
                        <div className="flex space-x-2 mt-3">
                          {appointment.patient?.phone && (
                            <a
                              href={`tel:${appointment.patient.phone}`}
                              className="flex items-center text-xs text-green-400 hover:text-green-300"
                            >
                              <Phone className="h-3 w-3 mr-1" />
                              Llamar
                            </a>
                          )}
                          {appointment.patient?.email && (
                            <a
                              href={`mailto:${appointment.patient.email}`}
                              className="flex items-center text-xs text-blue-400 hover:text-blue-300"
                            >
                              <Mail className="h-3 w-3 mr-1" />
                              Email
                            </a>
                          )}
                          {onNavigateToPatient && (
                            <button
                              onClick={() => onNavigateToPatient(appointment.patient_id)}
                              className="flex items-center text-xs text-cyan-400 hover:text-cyan-300"
                            >
                              <User className="h-3 w-3 mr-1" />
                              Expediente
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Botón para agregar nueva cita en el día seleccionado */}
                    <Button
                      onClick={() => handleNewAppointment(selectedDate)}
                      variant="outline"
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nueva Cita para este Día
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Formulario de Cita */}
      {showAppointmentForm && (
        <>
          {effectiveClinicId &&
          (effectiveDoctorId ||
            (canScheduleForOthers && (clinicStaff.length > 0 || editingAppointment))) ? (
            <AppointmentForm
              isOpen={showAppointmentForm}
              onClose={() => {
                setShowAppointmentForm(false);
                setEditingAppointment(null);
                setSelectedTimeSlot('');
              }}
              onSubmit={editingAppointment ? handleUpdateAppointment : handleCreateAppointment}
              appointment={editingAppointment}
              doctorId={
                editingAppointment?.doctor_id ??
                effectiveDoctorId ??
                (clinicStaff.length > 0 ? clinicStaff[0].staff_id : user?.id ?? '')
              }
              clinicId={effectiveClinicId}
              allowDoctorSelection={canScheduleForOthers}
              selectedDate={format(selectedDate, 'yyyy-MM-dd')}
              selectedTime={selectedTimeSlot}
            />
          ) : (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  No se puede abrir el formulario
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {!effectiveClinicId
                    ? 'Seleccione una clínica.'
                    : 'Seleccione un profesional o complete su perfil.'}
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAppointmentForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cerrar
                  </button>
                  {!user?.id && (
                    <button
                      onClick={() => window.location.href = '/auth'}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Iniciar Sesión
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
