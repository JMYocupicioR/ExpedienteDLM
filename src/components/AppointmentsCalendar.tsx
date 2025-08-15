import React, { useState, useEffect } from 'react';
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
  Eye
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
import { Button } from './ui/button';
import AppointmentForm from './AppointmentForm';
import ValidationNotification, { useValidationNotifications } from './ValidationNotification';
import { 
  EnhancedAppointment, 
  CreateAppointmentPayload, 
  UpdateAppointmentPayload,
  AppointmentStatus,
  enhancedAppointmentService 
} from '../lib/services/enhanced-appointment-service';
import useEnhancedAppointments from '../hooks/useEnhancedAppointments';
import { useAuth } from '../hooks/useAuth';

interface AppointmentsCalendarProps {
  onAppointmentSelect?: (appointment: EnhancedAppointment) => void;
  onNavigateToPatient?: (patientId: string) => void;
}

const statusColors = {
  scheduled: 'bg-blue-600 border-blue-500',
  confirmed_by_patient: 'bg-green-600 border-green-500', 
  completed: 'bg-gray-600 border-gray-500',
  cancelled_by_clinic: 'bg-red-600 border-red-500',
  cancelled_by_patient: 'bg-orange-600 border-orange-500',
  no_show: 'bg-red-700 border-red-600',
};

const statusLabels = {
  scheduled: 'Programada',
  confirmed_by_patient: 'Confirmada',
  completed: 'Completada',
  cancelled_by_clinic: 'Cancelada por Clínica',
  cancelled_by_patient: 'Cancelada por Paciente',
  no_show: 'No Asistió',
};

const typeLabels = {
  consultation: 'Consulta',
  follow_up: 'Seguimiento',
  check_up: 'Chequeo',
  procedure: 'Procedimiento',
  emergency: 'Emergencia',
};

// No necesitamos mock patients aquí ya que PatientSelector maneja los datos

export default function AppointmentsCalendar({ 
  onAppointmentSelect,
  onNavigateToPatient 
}: AppointmentsCalendarProps) {
  const { user, profile } = useAuth();
  const { messages, addError, addSuccess, removeMessage } = useValidationNotifications();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<EnhancedAppointment | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  
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
      doctor_id: user?.id,
      clinic_id: profile?.clinic_id,
    }
  });

  // Obtener citas del día seleccionado
  const todayAppointments = getAppointmentsByDate(format(selectedDate, 'yyyy-MM-dd'))
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

  // Recargar cuando cambia el mes
  useEffect(() => {
    if (user?.id && profile?.clinic_id) {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      
      loadAppointments({
        doctor_id: user.id,
        clinic_id: profile.clinic_id,
        date_from: format(monthStart, 'yyyy-MM-dd'),
        date_to: format(monthEnd, 'yyyy-MM-dd'),
      });
    }
  }, [currentDate, user?.id, profile?.clinic_id, loadAppointments]);

  const handleCreateAppointment = async (data: CreateAppointmentPayload) => {
    try {
      await createAppointment(data);
      addSuccess('Éxito', 'Cita creada correctamente');
      setShowAppointmentForm(false);
      setSelectedTimeSlot('');
    } catch (error) {
      console.error('Error creating appointment:', error);
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
      console.error('Error updating appointment:', error);
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
      console.error('Error cancelling appointment:', error);
      addError('Error', error instanceof Error ? error.message : 'No se pudo cancelar la cita');
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: AppointmentStatus) => {
    try {
      await updateAppointment(appointmentId, { status: newStatus });
      addSuccess('Éxito', 'Estado de la cita actualizado correctamente');
    } catch (error) {
      console.error('Error updating appointment status:', error);
      addError('Error', error instanceof Error ? error.message : 'No se pudo actualizar el estado');
    }
  };

  const handleEditAppointment = (appointment: EnhancedAppointment) => {
    setEditingAppointment(appointment);
    setShowAppointmentForm(true);
  };

  const handleNewAppointment = (date?: Date, time?: string) => {
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

  const getAppointmentsForDay = (date: Date): Appointment[] => {
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

  if (loading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

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
                    onClick={() => handleNewAppointment()}
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
      {showAppointmentForm && user?.id && profile?.clinic_id && (
        <AppointmentForm
          isOpen={showAppointmentForm}
          onClose={() => {
            setShowAppointmentForm(false);
            setEditingAppointment(null);
            setSelectedTimeSlot('');
          }}
          onSubmit={editingAppointment ? handleUpdateAppointment : handleCreateAppointment}
          appointment={editingAppointment}
          doctorId={user.id}
          clinicId={profile.clinic_id}
          selectedDate={format(selectedDate, 'yyyy-MM-dd')}
          selectedTime={selectedTimeSlot}
        />
      )}
    </div>
  );
}
