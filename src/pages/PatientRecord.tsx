import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Calendar, Activity, FileText, Settings, ChevronRight, Plus, Edit, Save,
  ArrowLeft, Clock, Heart, Brain, Dna, Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ConsultationForm from '../components/ConsultationForm';
import type { Database } from '../lib/database.types';

type Patient = Database['public']['Tables']['patients']['Row'];
type Consultation = Database['public']['Tables']['consultations']['Row'];
type PathologicalHistory = Database['public']['Tables']['pathological_histories']['Row'];
type NonPathologicalHistory = Database['public']['Tables']['non_pathological_histories']['Row'];
type HereditaryBackground = Database['public']['Tables']['hereditary_backgrounds']['Row'];

export default function PatientRecord() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [seccionActiva, setSeccionActiva] = useState('paciente');
  const [modoEdicion, setModoEdicion] = useState(false);
  const [showConsultationForm, setShowConsultationForm] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [pathologicalHistory, setPathologicalHistory] = useState<PathologicalHistory | null>(null);
  const [nonPathologicalHistory, setNonPathologicalHistory] = useState<NonPathologicalHistory | null>(null);
  const [hereditaryBackgrounds, setHereditaryBackgrounds] = useState<HereditaryBackground[]>([]);
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

      // Fetch pathological history
      const { data: pathologicalData, error: pathologicalError } = await supabase
        .from('pathological_histories')
        .select('*')
        .eq('patient_id', id)
        .single();

      if (pathologicalError && pathologicalError.code !== 'PGRST116') throw pathologicalError;
      setPathologicalHistory(pathologicalData);

      // Fetch non-pathological history
      const { data: nonPathologicalData, error: nonPathologicalError } = await supabase
        .from('non_pathological_histories')
        .select('*')
        .eq('patient_id', id)
        .single();

      if (nonPathologicalError && nonPathologicalError.code !== 'PGRST116') throw nonPathologicalError;
      setNonPathologicalHistory(nonPathologicalData);

      // Fetch hereditary backgrounds
      const { data: hereditaryData, error: hereditaryError } = await supabase
        .from('hereditary_backgrounds')
        .select('*')
        .eq('patient_id', id);

      if (hereditaryError) throw hereditaryError;
      setHereditaryBackgrounds(hereditaryData || []);

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

      // Update patient info
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

      // Update pathological history
      if (pathologicalHistory) {
        const { error: pathologicalError } = await supabase
          .from('pathological_histories')
          .upsert({
            ...pathologicalHistory,
            patient_id: id
          });

        if (pathologicalError) throw pathologicalError;
      }

      // Update non-pathological history
      if (nonPathologicalHistory) {
        const { error: nonPathologicalError } = await supabase
          .from('non_pathological_histories')
          .upsert({
            ...nonPathologicalHistory,
            patient_id: id
          });

        if (nonPathologicalError) throw nonPathologicalError;
      }

      setModoEdicion(false);
      fetchPatientData();
    } catch (error: any) {
      console.error('Error saving changes:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHereditaryBackground = async (background: Omit<HereditaryBackground, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('hereditary_backgrounds')
        .insert({
          ...background,
          patient_id: id
        });

      if (error) throw error;
      fetchPatientData();
    } catch (error: any) {
      console.error('Error adding hereditary background:', error);
      setError(error.message);
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
                onClick={() => setSeccionActiva('patologicos')}
                className={`flex items-center w-full p-3 rounded-lg ${
                  seccionActiva === 'patologicos' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
                }`}
              >
                <Heart className="h-5 w-5 mr-3" />
                <span>Antecedentes Patológicos</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setSeccionActiva('no-patologicos')}
                className={`flex items-center w-full p-3 rounded-lg ${
                  seccionActiva === 'no-patologicos' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
                }`}
              >
                <Brain className="h-5 w-5 mr-3" />
                <span>Antecedentes No Patológicos</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setSeccionActiva('heredofamiliares')}
                className={`flex items-center w-full p-3 rounded-lg ${
                  seccionActiva === 'heredofamiliares' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
                }`}
              >
                <Dna className="h-5 w-5 mr-3" />
                <span>Antecedentes Heredofamiliares</span>
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

          {seccionActiva === 'patologicos' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-6">Antecedentes Patológicos</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enfermedades Crónicas
                  </label>
                  <input
                    type="text"
                    value={pathologicalHistory?.chronic_diseases?.join(', ') || ''}
                    onChange={(e) => setPathologicalHistory(prev => ({
                      ...prev!,
                      chronic_diseases: e.target.value.split(',').map(s => s.trim())
                    }))}
                    readOnly={!modoEdicion}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Separar con comas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tratamientos Actuales
                  </label>
                  <input
                    type="text"
                    value={pathologicalHistory?.current_treatments?.join(', ') || ''}
                    onChange={(e) => setPathologicalHistory(prev => ({
                      ...prev!,
                      current_treatments: e.target.value.split(',').map(s => s.trim())
                    }))}
                    readOnly={!modoEdicion}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Separar con comas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cirugías
                  </label>
                  <input
                    type="text"
                    value={pathologicalHistory?.surgeries?.join(', ') || ''}
                    onChange={(e) => setPathologicalHistory(prev => ({
                      ...prev!,
                      surgeries: e.target.value.split(',').map(s => s.trim())
                    }))}
                    readOnly={!modoEdicion}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Separar con comas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fracturas
                  </label>
                  <input
                    type="text"
                    value={pathologicalHistory?.fractures?.join(', ') || ''}
                    onChange={(e) => setPathologicalHistory(prev => ({
                      ...prev!,
                      fractures: e.target.value.split(',').map(s => s.trim())
                    }))}
                    readOnly={!modoEdicion}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Separar con comas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hospitalizaciones Previas
                  </label>
                  <input
                    type="text"
                    value={pathologicalHistory?.previous_hospitalizations?.join(', ') || ''}
                    onChange={(e) => setPathologicalHistory(prev => ({
                      ...prev!,
                      previous_hospitalizations: e.target.value.split(',').map(s => s.trim())
                    }))}
                    readOnly={!modoEdicion}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Separar con comas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Uso de Sustancias
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {['alcohol', 'tabaco', 'drogas'].map(substance => (
                      <div key={substance}>
                        <label className="block text-sm font-medium text-gray-700 capitalize">
                          {substance}
                        </label>
                        <select
                          value={pathologicalHistory?.substance_use?.[substance] || 'no'}
                          onChange={(e) => setPathologicalHistory(prev => ({
                            ...prev!,
                            substance_use: {
                              ...prev?.substance_use,
                              [substance]: e.target.value
                            }
                          }))}
                          disabled={!modoEdicion}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="no">No</option>
                          <option value="ocasional">Ocasional</option>
                          <option value="frecuente">Frecuente</option>
                          <option value="diario">Diario</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {seccionActiva === 'no-patologicos' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-6">Antecedentes No Patológicos</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Lateralidad</label>
                    <select
                      value={nonPathologicalHistory?.handedness || ''}
                      onChange={(e) => setNonPathologicalHistory(prev => ({
                        ...prev!,
                        handedness: e.target.value
                      }))}
                      disabled={!modoEdicion}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar</option>
                      <option value="diestro">Diestro</option>
                      <option value="zurdo">Zurdo</option>
                      <option value="ambidiestro">Ambidiestro</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Religión</label>
                    <input
                      type="text"
                      value={nonPathologicalHistory?.religion || ''}
                      onChange={(e) => setNonPathologicalHistory(prev => ({
                        ...prev!,
                        religion: e.target.value
                      }))}
                      readOnly={!modoEdicion}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Estado Civil</label>
                    <select
                      value={nonPathologicalHistory?.marital_status || ''}
                      onChange={(e) => setNonPathologicalHistory(prev => ({
                        ...prev!,
                        marital_status: e.target.value
                      }))}
                      disabled={!modoEdicion}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar</option>
                      <option value="soltero">Soltero(a)</option>
                      <option value="casado">Casado(a)</option>
                      <option value="divorciado">Divorciado(a)</option>
                      <option value="viudo">Viudo(a)</option>
                      <option value="union_libre">Unión Libre</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Escolaridad</label>
                    <select
                      value={nonPathologicalHistory?.education_level || ''}
                      onChange={(e) => setNonPathologicalHistory(prev => ({
                        ...prev!,
                        education_level: e.target.value
                      }))}
                      disabled={!modoEdicion}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar</option>
                      <option value="ninguna">Ninguna</option>
                      <option value="primaria">Primaria</option>
                      <option value="secundaria">Secundaria</option>
                      <option value="preparatoria">Preparatoria</option>
                      <option value="universidad">Universidad</option>
                      <option value="posgrado">Posgrado</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Dieta</label>
                    <textarea
                      value={nonPathologicalHistory?.diet || ''}
                      onChange={(e) => setNonPathologicalHistory(prev => ({
                        ...prev!,
                        diet: e.target.value
                      }))}
                      readOnly={!modoEdicion}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Higiene Personal</label>
                    <textarea
                      value={nonPathologicalHistory?.personal_hygiene || ''}
                      onChange={(e) => setNonPathologicalHistory(prev => ({
                        ...prev!,
                        personal_hygiene: e.target.value
                      }))}
                      readOnly={!modoEdicion}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Historial de Vacunación
                  </label>
                  <input
                    type="text"
                    value={nonPathologicalHistory?.vaccination_history?.join(',') || ''}
                    onChange={(e) => setNonPathologicalHistory(prev => ({
                      
                      ...prev!,
                      vaccination_history: e.target.value.split(',').map(s => s.trim())
                    }))}
                    readOnly={!modoEdicion}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Separar con comas"
                  />
                </div>
              </div>
            </div>
          )}

          {seccionActiva === 'heredofamiliares' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-6">Antecedentes Heredofamiliares</h2>
              
              <div className="space-y-6">
                {hereditaryBackgrounds.map((background, index) => (
                  <div key={background.id} className="border-b pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">
                        {background.relationship}
                      </h3>
                      {modoEdicion && (
                        <button
                          onClick={async () => {
                            try {
                              await supabase
                                .from('hereditary_backgrounds')
                                .delete()
                                .eq('id', background.id);
                              fetchPatientData();
                            } catch (error) {
                              console.error('Error deleting background:', error);
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-gray-600">{background.condition}</p>
                    {background.notes && (
                      <p className="text-sm text-gray-500 mt-1">{background.notes}</p>
                    )}
                  </div>
                ))}

                {modoEdicion && (
                  <div className="border-t pt-6">
                    <h3 className="font-medium text-gray-900 mb-4">Agregar Antecedente</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Parentesco
                        </label>
                        <input
                          type="text"
                          id="new-relationship"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Condición
                        </label>
                        <input
                          type="text"
                          id="new-condition"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Notas
                        </label>
                        <textarea
                          id="new-notes"
                          rows={2}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <button
                          onClick={() => {
                            const relationship = (document.getElementById('new-relationship') as HTMLInputElement).value;
                            const condition = (document.getElementById('new-condition') as HTMLInputElement).value;
                            const notes = (document.getElementById('new-notes') as HTMLTextAreaElement).value;
                            
                            if (relationship && condition) {
                              handleAddHereditaryBackground({
                                patient_id: id!,
                                relationship,
                                condition,
                                notes: notes || null
                              });
                              
                              // Clear inputs
                              (document.getElementById('new-relationship') as HTMLInputElement).value = '';
                              (document.getElementById('new-condition') as HTMLInputElement).value = '';
                              (document.getElementById('new-notes') as HTMLTextAreaElement).value = '';
                            }
                          }}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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