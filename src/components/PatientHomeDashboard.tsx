import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  FileText,
  Shield,
  Stethoscope,
  User,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface PatientHomeDashboardProps {
  user: { id: string; email?: string } | null;
  profile: { full_name?: string | null; role?: string } | null;
}

interface DoctorInfo {
  full_name: string | null;
  specialty: string | null;
  email: string | null;
  phone: string | null;
}

interface PatientRecord {
  id: string;
  full_name: string | null;
  birth_date: string | null;
  gender: string | null;
  phone: string | null;
  primary_doctor_id: string;
}

interface UpcomingAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  title: string | null;
  status: string;
}

export default function PatientHomeDashboard({ user, profile }: PatientHomeDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
  const [patientRecord, setPatientRecord] = useState<PatientRecord | null>(null);
  const [appointments, setAppointments] = useState<UpcomingAppointment[]>([]);
  const [consultationCount, setConsultationCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      loadPatientData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadPatientData = async () => {
    try {
      setLoading(true);

      // 1. Fetch patient record(s) linked to this user account
      // Use .limit(1) instead of .maybeSingle() to avoid null when multiple records exist
      const { data: patients, error: patientError } = await supabase
        .from('patients')
        .select('id, full_name, birth_date, gender, phone, primary_doctor_id, clinic_id')
        .eq('patient_user_id', user!.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (patientError) {
        console.error('Error fetching patient record:', patientError);
      }

      // Prefer the patient record that has a primary_doctor_id set
      let patient = patients && patients.length > 0
        ? (patients.find(p => p.primary_doctor_id) || patients[0])
        : null;

      // Fallback: if we found records but none has a doctor, search by email
      if (patient && !patient.primary_doctor_id && user!.email) {
        const { data: emailPatients } = await supabase
          .from('patients')
          .select('id, full_name, birth_date, gender, phone, primary_doctor_id, clinic_id')
          .eq('email', user!.email)
          .not('primary_doctor_id', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (emailPatients && emailPatients.length > 0) {
          patient = emailPatients[0];
          // Also link this record for future queries
          await supabase
            .from('patients')
            .update({ patient_user_id: user!.id })
            .eq('id', patient.id);
        }
      }

      if (patient) {
        setPatientRecord(patient);

        let doctorId = patient.primary_doctor_id;

        // Fallback: if primary_doctor_id is missing, look up via patient_registration_tokens
        if (!doctorId) {
          const { data: tokenData } = await supabase
            .from('patient_registration_tokens')
            .select('doctor_id')
            .eq('assigned_patient_id', patient.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (tokenData && tokenData.length > 0 && tokenData[0].doctor_id) {
            doctorId = tokenData[0].doctor_id;
            // Also fix the patient record for future queries
            await supabase
              .from('patients')
              .update({ primary_doctor_id: doctorId })
              .eq('id', patient.id);
          }
        }

        // 2. Fetch the associated doctor's info
        if (doctorId) {
          const { data: doctor } = await supabase
            .from('profiles')
            .select('full_name, specialty, email, phone')
            .eq('id', doctorId)
            .maybeSingle();

          if (doctor) {
            setDoctorInfo(doctor);
          }
        }

        // 3. Fetch upcoming appointments
        const today = new Date().toISOString().split('T')[0];
        const { data: appts } = await supabase
          .from('appointments')
          .select('id, appointment_date, appointment_time, title, status')
          .eq('patient_id', patient.id)
          .gte('appointment_date', today)
          .in('status', ['scheduled', 'confirmed', 'confirmed_by_patient'])
          .order('appointment_date', { ascending: true })
          .limit(5);

        if (appts) {
          setAppointments(appts);
        }

        // 4. Get consultation count
        const { count } = await supabase
          .from('consultations')
          .select('id', { count: 'exact', head: true })
          .eq('patient_id', patient.id);

        setConsultationCount(count || 0);
      }
    } catch {
      // Silently handle errors
    } finally {
      setLoading(false);
    }
  };

  const patientName = profile?.full_name || patientRecord?.full_name || 'Paciente';
  const firstName = patientName.split(' ')[0];

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  if (loading) {
    return (
      <div className='min-h-[60vh] flex items-center justify-center'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400'></div>
      </div>
    );
  }

  return (
    <main className='w-full max-w-4xl mx-auto space-y-6 pb-8'>
      {/* Welcome Section */}
      <section className='section'>
        <div className='bg-gradient-to-br from-gray-800 via-gray-800 to-cyan-900/30 rounded-2xl border border-gray-700 p-6 lg:p-8'>
          <div className='flex items-start gap-5'>
            <div className='h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-cyan-500/20 flex-shrink-0'>
              {patientName.charAt(0).toUpperCase()}
            </div>
            <div className='flex-1'>
              <p className='text-gray-400 text-sm'>{greeting},</p>
              <h1 className='text-2xl lg:text-3xl font-bold text-white mt-1'>
                {firstName}
              </h1>
              <p className='text-gray-400 text-sm mt-1'>
                Bienvenido a tu panel de paciente
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Doctor Info Card */}
      <section className='section'>
        <div className='bg-gray-800 rounded-xl border border-gray-700 p-5 lg:p-6'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center'>
              <Stethoscope className='h-5 w-5 text-blue-400' />
            </div>
            <h2 className='text-lg font-semibold text-white'>Tu Médico</h2>
          </div>

          {doctorInfo ? (
            <div className='flex items-center gap-4 bg-gray-750 rounded-lg p-4 border border-gray-700/50'>
              <div className='h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md flex-shrink-0'>
                {(doctorInfo.full_name || 'D').charAt(0).toUpperCase()}
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-white font-semibold text-lg truncate'>
                  Dr. {doctorInfo.full_name || 'No disponible'}
                </p>
                {doctorInfo.specialty && (
                  <p className='text-cyan-400 text-sm mt-0.5'>{doctorInfo.specialty}</p>
                )}
                {doctorInfo.phone && (
                  <p className='text-gray-400 text-xs mt-1'>Tel: {doctorInfo.phone}</p>
                )}
              </div>
              <div className='bg-green-500/10 text-green-400 text-xs px-3 py-1.5 rounded-full border border-green-500/20 flex items-center gap-1.5 flex-shrink-0'>
                <div className='h-1.5 w-1.5 rounded-full bg-green-400' />
                Activo
              </div>
            </div>
          ) : (
            <div className='bg-gray-750 rounded-lg p-4 border border-gray-700/50 text-center'>
              <p className='text-gray-400 text-sm'>
                {patientRecord
                  ? 'No se pudo obtener la información del doctor'
                  : 'Tu cuenta aún no está vinculada a un expediente médico'}
              </p>
              <p className='text-gray-500 text-xs mt-1'>
                Contacta a tu médico para más información
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Quick Stats */}
      <section className='section'>
        <div className='grid grid-cols-2 sm:grid-cols-3 gap-4'>
          <Link
            to='/appointments'
            className='bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-cyan-500/40 transition-all group'
          >
            <div className='flex items-center justify-between mb-2'>
              <Calendar className='h-5 w-5 text-cyan-400' />
              <span className='text-2xl font-bold text-white'>{appointments.length}</span>
            </div>
            <p className='text-xs text-gray-400'>Citas próximas</p>
            <ChevronRight className='h-4 w-4 text-gray-600 group-hover:text-cyan-400 transition-colors mt-1' />
          </Link>

          <Link
            to='/medical-history'
            className='bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-blue-500/40 transition-all group'
          >
            <div className='flex items-center justify-between mb-2'>
              <FileText className='h-5 w-5 text-blue-400' />
              <span className='text-2xl font-bold text-white'>{consultationCount}</span>
            </div>
            <p className='text-xs text-gray-400'>Consultas</p>
            <ChevronRight className='h-4 w-4 text-gray-600 group-hover:text-blue-400 transition-colors mt-1' />
          </Link>

          <Link
            to='/privacy-dashboard'
            className='bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-purple-500/40 transition-all group'
          >
            <div className='flex items-center justify-between mb-2'>
              <Shield className='h-5 w-5 text-purple-400' />
              <span className='text-lg font-semibold text-purple-400'>ARCO</span>
            </div>
            <p className='text-xs text-gray-400'>Derechos de privacidad</p>
            <ChevronRight className='h-4 w-4 text-gray-600 group-hover:text-purple-400 transition-colors mt-1' />
          </Link>
        </div>
      </section>

      {/* Upcoming Appointments */}
      {appointments.length > 0 && (
        <section className='section'>
          <div className='bg-gray-800 rounded-xl border border-gray-700'>
            <div className='flex items-center justify-between p-5 border-b border-gray-700'>
              <div className='flex items-center gap-2'>
                <Clock className='h-5 w-5 text-cyan-400' />
                <h2 className='text-lg font-semibold text-white'>Próximas Citas</h2>
              </div>
              <Link
                to='/appointments'
                className='text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1'
              >
                Ver todas <ChevronRight className='h-3.5 w-3.5' />
              </Link>
            </div>
            <div className='divide-y divide-gray-700/50'>
              {appointments.map((apt) => {
                const aptDate = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
                const isValid = !isNaN(aptDate.getTime());
                return (
                  <div
                    key={apt.id}
                    className='p-4 hover:bg-gray-750 transition-colors'
                  >
                    <div className='flex items-center gap-4'>
                      <div className='h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0'>
                        <Calendar className='h-5 w-5 text-cyan-400' />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-white text-sm font-medium truncate'>
                          {apt.title || 'Cita médica'}
                        </p>
                        <p className='text-gray-400 text-xs mt-0.5'>
                          {isValid
                            ? format(aptDate, "EEEE d 'de' MMMM", { locale: es })
                            : apt.appointment_date}{' '}
                          a las {apt.appointment_time}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                        apt.status === 'confirmed' || apt.status === 'confirmed_by_patient'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {apt.status === 'confirmed' || apt.status === 'confirmed_by_patient'
                          ? 'Confirmada'
                          : 'Programada'}
                      </span>
                    </div>
                    {isValid && (
                      <p className='text-gray-500 text-xs mt-2 ml-14'>
                        {formatDistanceToNow(aptDate, { addSuffix: true, locale: es })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Quick Navigation */}
      <section className='section'>
        <h2 className='text-lg font-semibold text-white mb-4 flex items-center gap-2'>
          <Activity className='h-5 w-5 text-gray-400' />
          Acceso Rápido
        </h2>
        <div className='grid grid-cols-2 gap-3'>
          {[
            { href: '/profile', label: 'Mi Perfil', icon: User, color: 'text-cyan-400', border: 'hover:border-cyan-500/40' },
            { href: '/appointments', label: 'Mis Citas', icon: Calendar, color: 'text-blue-400', border: 'hover:border-blue-500/40' },
            { href: '/medical-history', label: 'Mi Historial', icon: FileText, color: 'text-emerald-400', border: 'hover:border-emerald-500/40' },
            { href: '/privacy-dashboard', label: 'Privacidad', icon: Shield, color: 'text-purple-400', border: 'hover:border-purple-500/40' },
          ].map((nav) => {
            const NavIcon = nav.icon;
            return (
              <Link
                key={nav.href}
                to={nav.href}
                className={`flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-800/50 p-4 text-left text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition-all group ${nav.border}`}
              >
                <div className='h-10 w-10 rounded-lg bg-gray-700/50 flex items-center justify-center group-hover:bg-gray-700 transition-colors'>
                  <NavIcon className={`h-5 w-5 ${nav.color}`} />
                </div>
                <span className='font-medium'>{nav.label}</span>
                <ChevronRight className='h-4 w-4 text-gray-600 ml-auto group-hover:text-white transition-colors' />
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
