import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, MapPin, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { format, addMinutes, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from './ui/button';
import { useValidationNotifications } from './ValidationNotification';
import PatientSelector, { Patient } from './PatientSelector';
import { useActivityLog } from '../hooks/useActivityLog';
import { 
  EnhancedAppointment, 
  CreateAppointmentPayload, 
  UpdateAppointmentPayload,
  AppointmentType,
  AppointmentStatus,
  enhancedAppointmentService 
} from '../lib/services/enhanced-appointment-service';

interface AppointmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAppointmentPayload | UpdateAppointmentPayload) => Promise<void>;
  appointment?: EnhancedAppointment | null;
  doctorId: string;
  clinicId: string;
  selectedDate?: string;
  selectedTime?: string;
  patients?: Array<{
    id: string;
    full_name: string;
    phone?: string;
    email?: string;
  }>;
  preSelectedPatient?: {
    id: string;
    full_name: string;
    phone?: string;
    email?: string;
  };
}

interface FormData {
  patient_id: string;
  title: string;
  description: string;
  appointment_date: string;
  appointment_time: string;
  duration: number;
  type: AppointmentType;
  location: string;
  notes: string;
}

const appointmentTypes: Array<{ value: AppointmentType; label: string; description: string }> = [
  { value: 'consultation', label: 'Consulta', description: 'Consulta médica general' },
  { value: 'follow_up', label: 'Seguimiento', description: 'Cita de seguimiento' },
  { value: 'check_up', label: 'Chequeo', description: 'Examen médico preventivo' },
  { value: 'procedure', label: 'Procedimiento', description: 'Procedimiento médico' },
  { value: 'emergency', label: 'Emergencia', description: 'Atención de emergencia' },
];

const durationOptions = [
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1.5 horas' },
  { value: 120, label: '2 horas' },
];

export default function AppointmentForm({
  isOpen,
  onClose,
  onSubmit,
  appointment,
  doctorId,
  clinicId,
  selectedDate,
  selectedTime,
  patients = [],
  preSelectedPatient
}: AppointmentFormProps) {
  const { messages, addError, addSuccess, addWarning, removeMessage } = useValidationNotifications();
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const [formData, setFormData] = useState<FormData>({
    patient_id: '',
    title: '',
    description: '',
    appointment_date: selectedDate || format(startOfToday(), 'yyyy-MM-dd'),
    appointment_time: selectedTime || '09:00',
    duration: 30,
    type: 'consultation',
    location: '',
    notes: '',
  });

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Inicializar formulario cuando se edita una cita
  useEffect(() => {
    if (appointment) {
      setFormData({
        patient_id: appointment.patient_id,
        title: appointment.title,
        description: appointment.description || '',
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        duration: appointment.duration,
        type: appointment.type,
        location: appointment.location || '',
        notes: appointment.notes || '',
      });
      
      // Configurar paciente seleccionado
      if (appointment.patient) {
        setSelectedPatient({
          id: appointment.patient.id,
          full_name: appointment.patient.full_name,
          phone: appointment.patient.phone,
          email: appointment.patient.email,
        });
      }
    } else {
      // Manejar pre-selección de paciente y datos iniciales
      if (preSelectedPatient) {
        setSelectedPatient({
          id: preSelectedPatient.id,
          full_name: preSelectedPatient.full_name,
          phone: preSelectedPatient.phone,
          email: preSelectedPatient.email,
        });
        setFormData(prev => ({
          ...prev,
          patient_id: preSelectedPatient.id,
        }));
      }
      
      if (selectedDate || selectedTime) {
        setFormData(prev => ({
          ...prev,
          appointment_date: selectedDate || prev.appointment_date,
          appointment_time: selectedTime || prev.appointment_time,
        }));
      }
    }
  }, [appointment, selectedDate, selectedTime, preSelectedPatient]);

  // Verificar disponibilidad cuando cambian fecha/hora/duración
  useEffect(() => {
    if (formData.appointment_date && formData.appointment_time && !appointment) {
      checkAvailability();
    }
  }, [formData.appointment_date, formData.appointment_time, formData.duration]);

  const checkAvailability = async () => {
    if (!formData.appointment_date || !formData.appointment_time) return;

    setCheckingAvailability(true);
    try {
      const result = await enhancedAppointmentService.checkAvailability(
        doctorId,
        formData.appointment_date,
        formData.appointment_time,
        formData.duration,
        appointment?.id // Excluir la cita actual si estamos editando
      );
      
      setIsAvailable(result.available);
      
      if (!result.available) {
        const conflictMsg = result.conflictDetails 
          ? `Conflicto con cita existente de ${result.conflictDetails.conflicting_time_range.start} a ${result.conflictDetails.conflicting_time_range.end}`
          : 'Ya existe una cita programada en este horario';
          
        addWarning(
          'Conflicto de Horario',
          `${conflictMsg}. Por favor, seleccione otro horario.`
        );
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      addError('Error', 'No se pudo verificar la disponibilidad del horario');
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-generar título si está vacío
    if (field === 'type' && !formData.title.trim()) {
      const selectedType = appointmentTypes.find(t => t.value === value);
      if (selectedType) {
        setFormData(prev => ({
          ...prev,
          title: selectedType.label
        }));
      }
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData(prev => ({
      ...prev,
      patient_id: patient.id
    }));
  };

  const handleNewPatient = (patient: Patient) => {
    addSuccess('Éxito', `Paciente "${patient.full_name}" creado correctamente`);
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.patient_id.trim()) {
      errors.push('Debe seleccionar un paciente');
    }

    if (!formData.title.trim()) {
      errors.push('El título de la cita es obligatorio');
    }

    if (!formData.appointment_date) {
      errors.push('La fecha de la cita es obligatoria');
    }

    if (!formData.appointment_time) {
      errors.push('La hora de la cita es obligatoria');
    }

    // Validar que la fecha no sea en el pasado
    const appointmentDateTime = new Date(`${formData.appointment_date}T${formData.appointment_time}`);
    if (appointmentDateTime < new Date() && !appointment) {
      errors.push('No se pueden programar citas en fechas pasadas');
    }

    // Verificar disponibilidad (solo para nuevas citas)
    if (!appointment && isAvailable === false) {
      errors.push('El horario seleccionado no está disponible');
    }

    if (errors.length > 0) {
      errors.forEach(error => addError('Error de Validación', error));
      return false;
    }

    return true;
  };

  const { createAppointmentLog } = useActivityLog();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const submitData = {
        doctor_id: doctorId,
        patient_id: formData.patient_id,
        clinic_id: clinicId,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time,
        duration: formData.duration,
        type: formData.type,
        location: formData.location.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      await onSubmit(submitData);
      
      // Registrar en el log de actividad
      if (selectedPatient) {
        await createAppointmentLog(
          formData.patient_id,
          selectedPatient.full_name,
          formData.appointment_date,
          formData.appointment_time,
          appointment ? 'rescheduled' : 'scheduled'
        );
      }

      addSuccess(
        'Éxito',
        appointment ? 'Cita actualizada correctamente' : 'Cita creada correctamente'
      );
      
      // Reset form if creating new appointment
      if (!appointment) {
        setFormData({
          patient_id: '',
          title: '',
          description: '',
          appointment_date: selectedDate || format(startOfToday(), 'yyyy-MM-dd'),
          appointment_time: selectedTime || '09:00',
          duration: 30,
          type: 'consultation',
          location: '',
          notes: '',
        });
        setSelectedPatient(null);
      }
      
      onClose();
    } catch (error) {
      console.error('Error submitting appointment:', error);
      addError(
        'Error',
        appointment ? 'No se pudo actualizar la cita' : 'No se pudo crear la cita'
      );
    } finally {
      setLoading(false);
    }
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 7; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(time);
      }
    }
    return options;
  };

  if (!isOpen) return null;

  const appointmentDateTime = new Date(`${formData.appointment_date}T${formData.appointment_time}`);
  const endTime = addMinutes(appointmentDateTime, formData.duration);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Calendar className="h-6 w-6 mr-2 text-cyan-400" />
            {appointment ? 'Editar Cita' : 'Nueva Cita Médica'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Notifications */}
        {messages.length > 0 && (
          <div className="px-6 py-3 space-y-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-center space-x-2 p-3 rounded-lg ${
                  message.type === 'success' ? 'bg-green-900 border border-green-700' :
                  message.type === 'error' ? 'bg-red-900 border border-red-700' :
                  'bg-yellow-900 border border-yellow-700'
                }`}
              >
                {message.type === 'success' && <CheckCircle className="h-4 w-4 text-green-400" />}
                {message.type === 'error' && <AlertCircle className="h-4 w-4 text-red-400" />}
                {message.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-400" />}
                <span className={`text-sm ${
                  message.type === 'success' ? 'text-green-300' :
                  message.type === 'error' ? 'text-red-300' :
                  'text-yellow-300'
                }`}>
                  <strong>{message.title}:</strong> {message.message}
                </span>
                <button
                  onClick={() => removeMessage(message.id)}
                  className="ml-auto text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Selector de Paciente */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Paciente *
            </label>
            <PatientSelector
              selectedPatientId={formData.patient_id}
              onPatientSelect={handlePatientSelect}
              onNewPatient={handleNewPatient}
              placeholder="Buscar paciente por nombre, teléfono o email..."
            />
          </div>

          {/* Tipo de Cita */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tipo de Cita *
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              required
            >
              {appointmentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Título de la Cita *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Ej. Consulta General, Seguimiento..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              required
            />
          </div>

          {/* Fecha y Hora */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Fecha *
              </label>
              <input
                type="date"
                value={formData.appointment_date}
                onChange={(e) => handleInputChange('appointment_date', e.target.value)}
                min={format(startOfToday(), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Hora *
              </label>
              <select
                value={formData.appointment_time}
                onChange={(e) => handleInputChange('appointment_time', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                required
              >
                {generateTimeOptions().map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Duración
              </label>
              <select
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              >
                {durationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Información de horario */}
          {formData.appointment_date && formData.appointment_time && (
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">
                    {format(appointmentDateTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                  <p className="text-gray-300">
                    {format(appointmentDateTime, 'HH:mm', { locale: es })} - {format(endTime, 'HH:mm', { locale: es })}
                    ({formData.duration} min)
                  </p>
                </div>
                {!appointment && (
                  <div className="flex items-center space-x-2">
                    {checkingAvailability ? (
                      <div className="flex items-center text-yellow-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400 mr-2"></div>
                        Verificando...
                      </div>
                    ) : isAvailable === true ? (
                      <div className="flex items-center text-green-400">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Disponible
                      </div>
                    ) : isAvailable === false ? (
                      <div className="flex items-center text-red-400">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        No disponible
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ubicación */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <MapPin className="h-4 w-4 inline mr-1" />
              Ubicación
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Ej. Consultorio 1, Sala de Procedimientos..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descripción detallada de la cita..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <FileText className="h-4 w-4 inline mr-1" />
              Notas Adicionales
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Notas internas, recordatorios, instrucciones especiales..."
              rows={2}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || (!appointment && isAvailable === false)}
              className="min-w-[120px]"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {appointment ? 'Actualizando...' : 'Creando...'}
                </div>
              ) : (
                appointment ? 'Actualizar Cita' : 'Crear Cita'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
