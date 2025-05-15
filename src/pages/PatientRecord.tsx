import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Calendar, Activity, FileText, Settings, ChevronRight, Plus, Edit, Save,
  ArrowLeft, Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ConsultationForm from '../components/ConsultationForm';
import type { Database } from '../lib/database.types';

type Patient = Database['public']['Tables']['patients']['Row'];
type Consultation = Database['public']['Tables']['consultations']['Row'];

export default function PatientRecord() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [seccionActiva, setSeccionActiva] = useState('paciente');
  const [modoEdicion, setModoEdicion] = useState(false);
  const [showConsultationForm, setShowConsultationForm] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) {
        navigate('/auth');
        return;
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;
      setUserProfile(profile);

      fetchPatientData();
    } catch (err) {
      console.error('Session check error:', err);
      navigate('/auth');
    }
  };

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch patient data
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);

      // Fetch consultations
      const { data: consultationsData, error: consultationsError } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false });

      if (consultationsError) throw consultationsError;
      setConsultations(consultationsData || []);

    } catch (error: any) {
      console.error('Error fetching patient data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!patient) return;

      const { error: updateError } = await supabase
        .from('patients')
        .update({
          full_name: patient.full_name,
          email: patient.email,
          phone: patient.phone,
          address: patient.address,
          city_of_birth: patient.city_of_birth,
          city_of_residence: patient.city_of_residence,
          social_security_number: patient.social_security_number
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setModoEdicion(false);
      fetchPatientData();
    } catch (error: any) {
      console.error('Error saving changes:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Paciente no encontrado'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-blue-600 hover:underline"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>Volver</span>
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">{patient.full_name}</h2>
            <p className="text-sm text-gray-500">Expediente #{patient.id.slice(0, 8)}</p>
          </div>

          <ul className="space-y-2">
            <li>
              <button 
                onClick={() => setSeccionActiva('paciente')}
                className={`flex items-center w-full p-3 rounded-lg ${
                  seccionActiva === 'paciente' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
                }`}
              >
                <User className="h-5 w-5 mr-3" />
                <span>Información Personal</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setSeccionActiva('consultas')}
                className={`flex items-center w-full p-3 rounded-lg ${
                  seccionActiva === 'consultas' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
                }`}
              >
                <Clock className="h-5 w-5 mr-3" />
                <span>Consultas</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <header className="bg-white p-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Expediente Médico
            </h1>
            <p className="text-gray-500">
              Última actualización: {format(new Date(patient.updated_at || patient.created_at), "d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>

          <div className="flex gap-2">
            {seccionActiva === 'consultas' ? (
              <button
                onClick={() => setShowConsultationForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Consulta
              </button>
            ) : modoEdicion ? (
              <>
                <button
                  onClick={() => setModoEdicion(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </button>
              </>
            ) : (
              <button
                onClick={() => setModoEdicion(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </button>
            )}
          </div>
        </header>

        <main className="p-6">
          {seccionActiva === 'paciente' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-6">Información Personal</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Nombre completo</label>
                    <input
                      type="text"
                      value={patient.full_name}
                      onChange={(e) => setPatient({ ...patient, full_name: e.target.value })}
                      readOnly={!modoEdicion}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Fecha de nacimiento</label>
                    <input
                      type="date"
                      value={patient.birth_date}
                      onChange={(e) => setPatient({ ...patient, birth_date: e.target.value })}
                      readOnly={!modoEdicion}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Género</label>
                    <select
                      value={patient.gender}
                      onChange={(e) => setPatient({ ...patient, gender: e.target.value })}
                      disabled={!modoEdicion}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Ciudad de Nacimiento</label>
                    <input
                      type="text"
                      value={patient.city_of_birth || ''}
                      onChange={(e) => setPatient({ ...patient, city_of_birth: e.target.value })}
                      readOnly={!modoEdicion}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={patient.email || ''}
                      onChange={(e) => setPatient({ ...patient, email: e.target.value })}
                      readOnly={!modoEdicion}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                    <input
                      type="tel"
                      value={patient.phone || ''}
                      onChange={(e) => setPatient({ ...patient, phone: e.target.value })}
                      readOnly={!modoEdicion}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Ciudad de Residencia</label>
                    <input
                      type="text"
                      value={patient.city_of_residence || ''}
                      onChange={(e) => setPatient({ ...patient, city_of_residence: e.target.value })}
                      readOnly={!modoEdicion}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Número de Seguro Social</label>
                    <input
                      type="text"
                      value={patient.social_security_number || ''}
                      onChange={(e) => setPatient({ ...patient, social_security_number: e.target.value })}
                      readOnly={!modoEdicion}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Dirección</label>
                    <textarea
                      value={patient.address || ''}
                      onChange={(e) => setPatient({ ...patient, address: e.target.value })}
                      readOnly={!modoEdicion}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {seccionActiva === 'consultas' && (
            <div className="space-y-6">
              {consultations.map((consultation) => (
                <div key={consultation.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Consulta del {format(new Date(consultation.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {format(new Date(consultation.created_at), "HH:mm", { locale: es })} hrs
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900">Padecimiento Actual</h4>
                      <p className="mt-1 text-gray-600">{consultation.current_condition}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900">Signos Vitales</h4>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(consultation.vital_signs as any).map(([key, value]) => (
                          <div key={key}>
                            <dt className="text-sm text-gray-500">{key}</dt>
                            <dd className="text-sm font-medium text-gray-900">{value}</dd>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900">Exploración Física</h4>
                      <div className="mt-2">
                        {Object.entries((consultation.physical_examination as any).values || {}).map(([key, value]) => (
                          <div key={key} className="mb-2">
                            <dt className="text-sm font-medium text-gray-700">{key}</dt>
                            <dd className="mt-1 text-sm text-gray-600">{value as string}</dd>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900">Diagnóstico</h4>
                      <p className="mt-1 text-gray-600">{consultation.diagnosis}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900">Pronóstico</h4>
                      <p className="mt-1 text-gray-600">{consultation.prognosis}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900">Tratamiento</h4>
                      <p className="mt-1 text-gray-600">{consultation.treatment}</p>
                    </div>
                  </div>
                </div>
              ))}

              {consultations.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <Clock className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay consultas</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Comienza creando una nueva consulta para este paciente.
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Consultation Form Modal */}
      {showConsultationForm && userProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <ConsultationForm
              patientId={id!}
              doctorId={userProfile.id}
              onClose={() => setShowConsultationForm(false)}
              onSave={fetchPatientData}
            />
          </div>
        </div>
      )}
    </div>
  );
}