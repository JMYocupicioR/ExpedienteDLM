import { useNavigate } from 'react-router-dom';
import { usePatientAuth } from '@/context/PatientAuthContext';
import { appointmentService } from '@/lib/services/appointment-service';
import { publicDoctorService } from '@/lib/services/publicDoctorService';
import { Calendar, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

type PublicAppointmentBookingProps = {
  doctorId: string;
  doctorName: string;
  clinicId: string | null;
  onSuccess?: () => void;
};

const DAYS_AHEAD = 14;
const today = () => new Date().toISOString().slice(0, 10);

export default function PublicAppointmentBooking({
  doctorId,
  doctorName,
  clinicId,
  onSuccess,
}: PublicAppointmentBookingProps) {
  const navigate = useNavigate();
  const { user, profile } = usePatientAuth();
  const [selectedDate, setSelectedDate] = useState<string>(today());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateOptions = Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  useEffect(() => {
    if (!doctorId || !selectedDate) return;
    setLoadingSlots(true);
    setError(null);
    publicDoctorService
      .getDoctorAvailableSlots(doctorId, selectedDate)
      .then(setSlots)
      .catch((err) => {
        setError(err.message || 'Error al cargar horarios');
        setSlots([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [doctorId, selectedDate]);

  if (!user || !profile) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h3 className="font-semibold text-slate-200">Agendar cita</h3>
        <p className="mt-2 text-sm text-slate-400">
          Inicia sesión para ver los horarios disponibles y agendar tu cita con {doctorName}.
        </p>
        <button
          onClick={() => navigate('/auth', { state: { from: `/medicos/${doctorId}` } })}
          className="mt-4 w-full rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          Iniciar sesión
        </button>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!selectedTime || !profile) return;
    setSubmitting(true);
    setError(null);
    try {
      await appointmentService.createPatientBooking({
        doctor_id: doctorId,
        patient_id: profile.id,
        clinic_id: clinicId,
        appointment_date: selectedDate,
        appointment_time: selectedTime.length === 5 ? `${selectedTime}:00` : selectedTime,
        type: 'consultation',
        title: `Consulta con ${doctorName}`,
      });
      setSelectedTime('');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agendar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h3 className="font-semibold text-slate-200">Agendar cita</h3>
      <p className="mt-1 text-sm text-slate-400">
        Selecciona fecha y hora disponibles para tu consulta.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
            <Calendar className="h-4 w-4" />
            Fecha
          </label>
          <select
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedTime('');
            }}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200"
          >
            {dateOptions.map((d) => (
              <option key={d} value={d}>
                {new Date(d + 'T12:00:00').toLocaleDateString('es-MX', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
            <Clock className="h-4 w-4" />
            Hora
          </label>
          {loadingSlots ? (
            <p className="text-sm text-slate-500">Cargando horarios...</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-slate-500">No hay horarios disponibles este día.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedTime(slot)}
                  className={`rounded-md border px-3 py-2 text-sm transition ${
                    selectedTime === slot
                      ? 'border-cyan-500 bg-cyan-600/20 text-cyan-400'
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!selectedTime || submitting}
          className="w-full rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Agendando...' : 'Confirmar cita'}
        </button>
      </div>
    </div>
  );
}
