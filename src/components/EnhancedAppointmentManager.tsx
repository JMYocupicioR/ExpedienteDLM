import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CalendarDays,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  Edit,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle,
  Calendar as CalendarIcon,
  Video,
  Stethoscope
} from 'lucide-react';
import { useGoogleCalendarAppointments } from '@/hooks/useGoogleCalendarAppointments';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { EnhancedAppointment, CreateAppointmentPayload } from '@/lib/database.types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import AppointmentForm from './AppointmentForm';
import GoogleCalendarIntegration from './GoogleCalendarIntegration';

// Configure moment locale
moment.locale('es');
const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: EnhancedAppointment;
}

interface EnhancedAppointmentManagerProps {
  className?: string;
}

export default function EnhancedAppointmentManager({ className }: EnhancedAppointmentManagerProps) {
  const { user } = useAuth();
  const {
    // State
    isCalendarConnected,
    isSyncing,
    error: calendarError,

    // Operations
    createAppointment,
    updateAppointment,
    deleteAppointment,
    syncWithGoogleCalendar
  } = useGoogleCalendarAppointments();

  const [appointments, setAppointments] = useState<EnhancedAppointment[]>([]);
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<EnhancedAppointment | null>(null);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showGoogleIntegration, setShowGoogleIntegration] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load appointments from database
  const loadAppointments = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // This would typically use a proper appointment service
      // For now, we'll use a placeholder
      const mockAppointments: EnhancedAppointment[] = [
        {
          id: '1',
          doctor_id: user.id,
          patient_id: 'patient-1',
          clinic_id: null,
          title: 'Consulta General - Dr. Martinez',
          description: 'Consulta de rutina',
          appointment_date: format(new Date(), 'yyyy-MM-dd'),
          appointment_time: '10:00:00',
          duration: 30,
          status: 'scheduled',
          type: 'consultation',
          location: 'Consultorio 1',
          room_number: '101',
          notes: 'Paciente nuevo',
          google_calendar_event_id: null,
          google_calendar_sync_enabled: false,
          google_calendar_last_sync: null,
          reminder_sent: false,
          reminder_sent_at: null,
          confirmation_required: true,
          confirmed_at: null,
          consultation_id: null,
          prescription_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          patient: {
            id: 'patient-1',
            name: 'Juan Pérez',
            email: 'juan.perez@email.com',
            phone: '+52 55 1234 5678',
            birth_date: '1985-05-15',
            gender: 'male',
            address: 'Calle Principal 123',
            emergency_contact: 'María Pérez - 55 8765 4321',
            blood_type: 'O+',
            allergies: 'Ninguna',
            medical_history: 'Hipertensión controlada',
            current_medications: 'Losartán 50mg',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
      ];

      setAppointments(mockAppointments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading appointments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [user?.id]);

  // Convert appointments to calendar events
  const calendarEvents: CalendarEvent[] = appointments.map(appointment => {
    const startDateTime = parseISO(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const endDateTime = new Date(startDateTime.getTime() + appointment.duration * 60000);

    return {
      id: appointment.id,
      title: `${appointment.title} - ${appointment.patient?.name}`,
      start: startDateTime,
      end: endDateTime,
      resource: appointment
    };
  });

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedAppointment(event.resource);
    setShowAppointmentDialog(true);
  };

  const handleSelectSlot = ({ start }: { start: Date; end: Date }) => {
    setSelectedAppointment(null);
    setIsEditing(false);
    setShowFormDialog(true);
  };

  const handleCreateAppointment = async (data: CreateAppointmentPayload) => {
    try {
      const newAppointment = await createAppointment(data);
      await loadAppointments();
      setShowFormDialog(false);
    } catch (error) {
      console.error('Error creating appointment:', error);
    }
  };

  const handleUpdateAppointment = async (data: Partial<CreateAppointmentPayload>) => {
    if (!selectedAppointment) return;

    try {
      const updatedAppointment = await updateAppointment(selectedAppointment.id, data);
      await loadAppointments();
      setShowFormDialog(false);
      setShowAppointmentDialog(false);
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    try {
      await deleteAppointment(appointmentId);
      await loadAppointments();
      setShowAppointmentDialog(false);
    } catch (error) {
      console.error('Error deleting appointment:', error);
    }
  };

  const handleSyncWithGoogle = async () => {
    if (!isCalendarConnected) {
      setShowGoogleIntegration(true);
      return;
    }

    try {
      await syncWithGoogleCalendar();
      await loadAppointments();
    } catch (error) {
      console.error('Error syncing with Google Calendar:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'confirmed_by_patient':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled_by_clinic':
      case 'cancelled_by_patient':
        return 'bg-red-100 text-red-800';
      case 'no_show':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'consultation':
        return <Stethoscope className="h-4 w-4" />;
      case 'telemedicine':
        return <Video className="h-4 w-4" />;
      case 'emergency':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <CalendarIcon className="h-4 w-4" />;
    }
  };

  // Custom calendar event styling
  const eventStyleGetter = (event: CalendarEvent) => {
    const appointment = event.resource;
    let backgroundColor = '#3174ad';

    switch (appointment.status) {
      case 'confirmed':
      case 'confirmed_by_patient':
        backgroundColor = '#10b981';
        break;
      case 'scheduled':
        backgroundColor = '#3b82f6';
        break;
      case 'in_progress':
        backgroundColor = '#f59e0b';
        break;
      case 'completed':
        backgroundColor = '#6b7280';
        break;
      case 'cancelled_by_clinic':
      case 'cancelled_by_patient':
        backgroundColor = '#ef4444';
        break;
      case 'no_show':
        backgroundColor = '#f97316';
        break;
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <CalendarDays className="h-8 w-8 animate-pulse mx-auto mb-2" />
            <p>Cargando agenda...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Agenda de Citas
            </CardTitle>
            <div className="flex gap-2">
              {isCalendarConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncWithGoogle}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin mr-1" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      Sincronizar Google
                    </>
                  )}
                </Button>
              )}
              <Button size="sm" onClick={() => setShowGoogleIntegration(true)}>
                Configurar Google Calendar
              </Button>
              <Button onClick={() => setShowFormDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Nueva Cita
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {(error || calendarError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || calendarError}</AlertDescription>
        </Alert>
      )}

      {/* Calendar */}
      <Card>
        <CardContent className="p-6">
          <div style={{ height: '600px' }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              eventPropGetter={eventStyleGetter}
              messages={{
                next: 'Siguiente',
                previous: 'Anterior',
                today: 'Hoy',
                month: 'Mes',
                week: 'Semana',
                day: 'Día',
                agenda: 'Agenda',
                date: 'Fecha',
                time: 'Hora',
                event: 'Evento',
                noEventsInRange: 'No hay citas en este rango de fechas',
                showMore: (total) => `+ Ver ${total} más`
              }}
              formats={{
                timeGutterFormat: 'HH:mm',
                eventTimeRangeFormat: ({ start, end }) =>
                  `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
                agendaTimeRangeFormat: ({ start, end }) =>
                  `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
                dayHeaderFormat: (date) => moment(date).format('dddd, DD [de] MMMM'),
                monthHeaderFormat: (date) => moment(date).format('MMMM YYYY')
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appointment Details Dialog */}
      <Dialog open={showAppointmentDialog} onOpenChange={setShowAppointmentDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la Cita</DialogTitle>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{selectedAppointment.title}</h3>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(selectedAppointment.type)}
                    <Badge className={getStatusColor(selectedAppointment.status)}>
                      {selectedAppointment.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {format(parseISO(selectedAppointment.appointment_date), 'dd/MM/yyyy', { locale: es })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {selectedAppointment.appointment_time} ({selectedAppointment.duration} min)
                    </span>
                  </div>
                  {selectedAppointment.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{selectedAppointment.location}</span>
                    </div>
                  )}
                  {selectedAppointment.room_number && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Consultorio {selectedAppointment.room_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Patient Info */}
              {selectedAppointment.patient && (
                <div className="space-y-2">
                  <h4 className="font-medium">Información del Paciente</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{selectedAppointment.patient.name}</span>
                    </div>
                    {selectedAppointment.patient.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{selectedAppointment.patient.email}</span>
                      </div>
                    )}
                    {selectedAppointment.patient.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{selectedAppointment.patient.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description & Notes */}
              {(selectedAppointment.description || selectedAppointment.notes) && (
                <div className="space-y-2">
                  <h4 className="font-medium">Notas</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {selectedAppointment.description && (
                      <p className="text-sm mb-2">{selectedAppointment.description}</p>
                    )}
                    {selectedAppointment.notes && (
                      <p className="text-sm text-gray-600">{selectedAppointment.notes}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Google Calendar Status */}
              {selectedAppointment.google_calendar_sync_enabled && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    Sincronizado con Google Calendar
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(true);
                    setShowFormDialog(true);
                    setShowAppointmentDialog(false);
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteAppointment(selectedAppointment.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Appointment Form Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Cita' : 'Nueva Cita'}
            </DialogTitle>
          </DialogHeader>

          <AppointmentForm
            appointment={isEditing ? selectedAppointment : undefined}
            onSubmit={isEditing ? handleUpdateAppointment : handleCreateAppointment}
            onCancel={() => setShowFormDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Google Calendar Integration Dialog */}
      <Dialog open={showGoogleIntegration} onOpenChange={setShowGoogleIntegration}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuración de Google Calendar</DialogTitle>
          </DialogHeader>

          <GoogleCalendarIntegration />
        </DialogContent>
      </Dialog>
    </div>
  );
}