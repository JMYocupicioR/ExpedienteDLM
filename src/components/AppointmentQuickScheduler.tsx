import React, { useState } from 'react';
import { Calendar, Clock, Plus, X } from 'lucide-react';
import { format, addDays, addWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from './ui/button';
import AppointmentForm from './AppointmentForm';
import { CreateAppointmentData } from '../lib/services/appointment-service';
import { useAuth } from '../hooks/useAuth';

interface AppointmentQuickSchedulerProps {
  patientId: string;
  patientName: string;
  onScheduled?: (appointmentData: CreateAppointmentData) => void;
  className?: string;
}

const quickTimeSlots = [
  '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'
];

const quickDateOptions = [
  { label: 'Mañana', value: () => addDays(new Date(), 1) },
  { label: 'En 3 días', value: () => addDays(new Date(), 3) },
  { label: 'Próxima semana', value: () => addWeeks(new Date(), 1) },
  { label: 'En 2 semanas', value: () => addWeeks(new Date(), 2) },
];

export default function AppointmentQuickScheduler({
  patientId,
  patientName,
  onScheduled,
  className = ''
}: AppointmentQuickSchedulerProps) {
  const { user } = useAuth();
  const [showScheduler, setShowScheduler] = useState(false);
  const [showFullForm, setShowFullForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');

  const handleQuickSchedule = (date: Date, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setShowFullForm(true);
    setShowScheduler(false);
  };

  const handleFormSubmit = async (data: CreateAppointmentData) => {
    // Esta función se manejará por el AppointmentForm
    onScheduled?.(data);
  };

  if (!user?.id) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Botón principal */}
      <Button
        variant="outline"
        size="default"
        onClick={() => setShowScheduler(!showScheduler)}
        className="border-green-400 text-green-400 hover:bg-green-400 hover:text-gray-900"
      >
        <Calendar className="h-4 w-4 mr-2" />
        Agendar Próxima Cita
      </Button>

      {/* Panel de opciones rápidas */}
      {showScheduler && (
        <div className="absolute top-full mt-2 left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 p-4 min-w-[320px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium">Agendar para {patientName}</h3>
            <button
              onClick={() => setShowScheduler(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-gray-400 text-sm">Opciones rápidas:</p>
            
            {quickDateOptions.map((dateOption, index) => (
              <div key={index} className="border-b border-gray-700 pb-3 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm font-medium">
                    {dateOption.label}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {format(dateOption.value(), "EEE d 'de' MMM", { locale: es })}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {quickTimeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => handleQuickSchedule(dateOption.value(), time)}
                      className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-cyan-600 hover:text-white transition-colors"
                    >
                      <Clock className="h-3 w-3 inline mr-1" />
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-2">
              <Button
                variant="outline"
                size="default"
                onClick={() => {
                  setShowFullForm(true);
                  setShowScheduler(false);
                }}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Más Opciones
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Formulario completo */}
      {showFullForm && (
        <AppointmentForm
          isOpen={showFullForm}
          onClose={() => {
            setShowFullForm(false);
            setSelectedDate(null);
            setSelectedTime('');
          }}
          onSubmit={handleFormSubmit}
          doctorId={user.id}
          selectedDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
          selectedTime={selectedTime}
          preSelectedPatient={{ id: patientId, full_name: patientName }}
        />
      )}
    </div>
  );
}
