import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Calendar, Activity, FileText, Settings, ChevronRight, Plus, Edit, Save,
  ArrowLeft, Clock, Heart, Brain, Dna, Trash2, Eye, ChevronDown, ChevronUp,
  Search, Filter, RefreshCw
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
  const [consultationSearch, setConsultationSearch] = useState('');
  const [expandedConsultation, setExpandedConsultation] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      checkSession();
    }
  }, [id]);

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

      await fetchPatientData();
    } catch (err) {
      console.error('Session check error:', err);
      navigate('/auth');
    }
  };

  const fetchPatientData = async () => {
    if (!id) return;
    
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

      // Fetch pathological history using maybeSingle()
      const { data: pathologicalData, error: pathologicalError } = await supabase
        .from('pathological_histories')
        .select('*')
        .eq('patient_id', id)
        .maybeSingle();

      if (pathologicalError) throw pathologicalError;
      setPathologicalHistory(pathologicalData || {
        id: undefined,
        patient_id: id,
        chronic_diseases: [],
        current_treatments: [],
        surgeries: [],
        fractures: [],
        previous_hospitalizations: [],
        substance_use: {},
        created_at: null,
        updated_at: null
      });

      // Fetch non-pathological history using maybeSingle()
      const { data: nonPathologicalData, error: nonPathologicalError } = await supabase
        .from('non_pathological_histories')
        .select('*')
        .eq('patient_id', id)
        .maybeSingle();

      if (nonPathologicalError) throw nonPathologicalError;
      setNonPathologicalHistory(nonPathologicalData || {
        id: undefined,
        patient_id: id,
        handedness: null,
        religion: null,
        marital_status: null,
        education_level: null,
        diet: null,
        personal_hygiene: null,
        vaccination_history: [],
        created_at: null,
        updated_at: null
      });

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
    if (!patient || !id) return;
    
    try {
      setLoading(true);
      setError(null);

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
      await fetchPatientData();
    } catch (error: any) {
      console.error('Error saving changes:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHereditaryBackground = async (background: Omit<HereditaryBackground, 'id' | 'created_at' | 'updated_at'>) => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from('hereditary_backgrounds')
        .insert({
          ...background,
          patient_id: id
        });

      if (error) throw error;
      await fetchPatientData();
    } catch (error: any) {
      console.error('Error adding hereditary background:', error);
      setError(error.message);
    }
  };

  const filteredConsultations = consultations.filter(consultation =>
    consultation.diagnosis?.toLowerCase().includes(consultationSearch.toLowerCase()) ||
    consultation.current_condition?.toLowerCase().includes(consultationSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Paciente no encontrado'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-blue-400 hover:underline"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>Volver</span>
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">{patient.full_name}</h2>
            <p className="text-sm text-gray-400">Expediente #{patient.id.slice(0, 8)}</p>
          </div>

          <ul className="space-y-2">
            <li>
              <button 
                onClick={() => setSeccionActiva('paciente')}
                className={`flex items-center w-full p-3 rounded-lg transition-colors ${
                  seccionActiva === 'paciente' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <User className="h-5 w-5 mr-3" />
                <span>Información Personal</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setSeccionActiva('patologicos')}
                className={`flex items-center w-full p-3 rounded-lg transition-colors ${
                  seccionActiva === 'patologicos' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Heart className="h-5 w-5 mr-3" />
                <span>Antecedentes Patológicos</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setSeccionActiva('no-patologicos')}
                className={`flex items-center w-full p-3 rounded-lg transition-colors ${
                  seccionActiva === 'no-patologicos' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Brain className="h-5 w-5 mr-3" />
                <span>Antecedentes No Patológicos</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setSeccionActiva('heredofamiliares')}
                className={`flex items-center w-full p-3 rounded-lg transition-colors ${
                  seccionActiva === 'heredofamiliares' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Dna className="h-5 w-5 mr-3" />
                <span>Antecedentes Heredofamiliares</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setSeccionActiva('consultas')}
                className={`flex items-center w-full p-3 rounded-lg transition-colors ${
                  seccionActiva === 'consultas' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Clock className="h-5 w-5 mr-3" />
                <span>Consultas</span>
                <span className="ml-auto bg-gray-600 text-gray-200 text-xs rounded-full px-2 py-1">
                  {consultations.length}
                </span>
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <header className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Expediente Médico
            </h1>
            <p className="text-gray-400">
              Última actualización: {format(new Date(patient.updated_at || patient.created_at), "d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>

          <div className="flex gap-2">
            {seccionActiva === 'consultas' ? (
              <button
                onClick={() => setShowConsultationForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center hover:bg-blue-700 transition-colors shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Consulta
              </button>
            ) : modoEdicion ? (
              <>
                <button
                  onClick={() => setModoEdicion(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center hover:bg-green-700 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setModoEdicion(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center hover:bg-blue-700 transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </button>
            )}
          </div>
        </header>

        <main className="p-6">
          {seccionActiva === 'paciente' && (
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-6 text-white">Información Personal</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300">Nombre completo</label>
                    <input
                      type="text"
                      value={patient.full_name}
                      onChange={(e) => setPatient({ ...patient, full_name: e.target.value })}
                      readOnly={!modoEdicion}
                      className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300">Fecha de nacimiento</label>
                    <input
                      type="date"
                      value={patient.birth_date}
                      onChange={(e) => setPatient({ ...patient, birth_date: e.target.value })}
                      readOnly={!modoEdicion}
                      className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300">Género</label>
                    <select
                      value={patient.gender}
                      onChange={(e) => setPatient({ ...patient, gender: e.target.value })}
                      disabled={!modoEdicion}
                      className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    >
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300">Ciudad de Nacimiento</label>
                    <input
                      type="text"
                      value={patient.city_of_birth || ''}
                      onChange={(e) => setPatient({ ...patient, city_of_birth: e.target.value })}
                      readOnly={!modoEdicion}
                      className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300">Email</label>
                    <input
                      type="email"
                      value={patient.email || ''}
                      onChange={(e) => setPatient({ ...patient, email: e.target.value })}
                      readOnly={!modoEdicion}
                      className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300">Teléfono</label>
                    <input
                      type="tel"
                      value={patient.phone || ''}
                      onChange={(e) => setPatient({ ...patient, phone: e.target.value })}
                      readOnly={!modoEdicion}
                      className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300">Ciudad de Residencia</label>
                    <input
                      type="text"
                      value={patient.city_of_residence || ''}
                      onChange={(e) => setPatient({ ...patient, city_of_residence: e.target.value })}
                      readOnly={!modoEdicion}
                      className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300">Número de Seguro Social</label>
                    <input
                      type="text"
                      value={patient.social_security_number || ''}
                      onChange={(e) => setPatient({ ...patient, social_security_number: e.target.value })}
                      readOnly={!modoEdicion}
                      className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300">Dirección</label>
                    <textarea
                      value={patient.address || ''}
                      onChange={(e) => setPatient({ ...patient, address: e.target.value })}
                      readOnly={!modoEdicion}
                      rows={3}
                      className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {seccionActiva === 'patologicos' && (
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-6 text-white">Antecedentes Patológicos</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Enfermedades Crónicas
                  </label>
                  <input
                    type="text"
                    value={pathologicalHistory?.chronic_diseases?.join(', ') || ''}
                    onChange={(e) => setPathologicalHistory(prev => ({
                      ...prev!,
                      chronic_diseases: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    }))}
                    readOnly={!modoEdicion}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    placeholder="Separar con comas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tratamientos Actuales
                  </label>
                  <input
                    type="text"
                    value={pathologicalHistory?.current_treatments?.join(', ') || ''}
                    onChange={(e) => setPathologicalHistory(prev => ({
                      ...prev!,
                      current_treatments: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    }))}
                    readOnly={!modoEdicion}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    placeholder="Separar con comas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cirugías
                  </label>
                  <input
                    type="text"
                    value={pathologicalHistory?.surgeries?.join(', ') || ''}
                    onChange={(e) => setPathologicalHistory(prev => ({
                      ...prev!,
                      surgeries: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    }))}
                    readOnly={!modoEdicion}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    placeholder="Separar con comas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fracturas
                  </label>
                  <input
                    type="text"
                    value={pathologicalHistory?.fractures?.join(', ') || ''}
                    onChange={(e) => setPathologicalHistory(prev => ({
                      ...prev!,
                      fractures: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    }))}
                    readOnly={!modoEdicion}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    placeholder="Separar con comas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Hospitalizaciones Previas
                  </label>
                  <input
                    type="text"
                    value={pathologicalHistory?.previous_hospitalizations?.join(', ') || ''}
                    onChange={(e) => setPathologicalHistory(prev => ({
                      ...prev!,
                      previous_hospitalizations: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    }))}
                    readOnly={!modoEdicion}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    placeholder="Separar con comas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Uso de Sustancias
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {['alcohol', 'tabaco', 'drogas'].map(substance => (
                      <div key={substance}>
                        <label className="block text-sm font-medium text-gray-400 capitalize">
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
                          className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
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
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-6 text-white">Antecedentes No Patológicos</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300">Lateralidad</label>
                    <select
                      value={nonPathologicalHistory?.handedness || ''}
                      onChange={(e) => setNonPathologicalHistory(prev => ({
                        ...prev!,
                        handedness: e.target.value
                      }))}
                      disabled={!modoEdicion}
                      className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    >
                      <option value="">Seleccionar</option>
                      <option value="diestro">Diestro</option>
                      <option value="zurdo">Zurdo</option>
                      <option value="ambidiestro">Ambidiestro</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300">Religión</label>
                    <input
                      type="text"
                      value={nonPathologicalHistory?.religion || ''}
                      onChange={(e) => setNonPathologicalHistory(prev => ({
                        ...prev!,
                        religion: e.target.value
                      }))}
                      readOnly={!modoEdicion}
                      className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300">Estado Civil</label>
                    <select
                      value={nonPathologicalHistory?.marital_status || ''}
                      onChange={(e) => setNonPathologicalHistory(prev => ({
                        ...prev!,
                        marital_status: e.target.value
                      }))}
                      disabled={!modoEdicion}
                      className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
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
                    <label className="block text-sm font-medium text-gray-300">Escolaridad</label>
                    <select
                      value={nonPathologicalHistory?.education_level || ''}
                      onChange={(e) => setNonPathologicalHistory(prev => ({
                        ...prev!,
                        education_level: e.target.value
                      }))}
                      disabled={!modoEdicion}
                      className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
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
                    <label className="block text-sm font-medium text-gray-300">Dieta</label>
                    <textarea
                      value={nonPathologicalHistory?.diet || ''}
                      onChange={(e) => setNonPathologicalHistory(prev => ({
                        ...prev!,
                        diet: e.target.value
                      }))}
                      readOnly={!modoEdicion}
                      rows={3}
                      className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300">Higiene Personal</label>
                    <textarea
                      value={nonPathologicalHistory?.personal_hygiene || ''}
                      onChange={(e) => setNonPathologicalHistory(prev => ({
                        ...prev!,
                        personal_hygiene: e.target.value
                      }))}
                      readOnly={!modoEdicion}
                      rows={3}
                      className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Historial de Vacunación
                  </label>
                  <input
                    type="text"
                    value={nonPathologicalHistory?.vaccination_history?.join(',') || ''}
                    onChange={(e) => setNonPathologicalHistory(prev => ({
                      ...prev!,
                      vaccination_history: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    }))}
                    readOnly={!modoEdicion}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    placeholder="Separar con comas"
                  />
                </div>
              </div>
            </div>
          )}

          {seccionActiva === 'heredofamiliares' && (
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-6 text-white">Antecedentes Heredofamiliares</h2>
              
              <div className="space-y-6">
                {hereditaryBackgrounds.map((background, index) => (
                  <div key={background.id} className="border-b border-gray-600 pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-white">
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
                              await fetchPatientData();
                            } catch (error) {
                              console.error('Error deleting background:', error);
                            }
                          }}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-gray-300">{background.condition}</p>
                    {background.notes && (
                      <p className="text-sm text-gray-400 mt-1">{background.notes}</p>
                    )}
                  </div>
                ))}

                {modoEdicion && (
                  <div className="border-t border-gray-600 pt-6">
                    <h3 className="font-medium text-white mb-4">Agregar Antecedente</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300">
                          Parentesco
                        </label>
                        <input
                          type="text"
                          id="new-relationship"
                          className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300">
                          Condición
                        </label>
                        <input
                          type="text"
                          id="new-condition"
                          className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-300">
                          Notas
                        </label>
                        <textarea
                          id="new-notes"
                          rows={2}
                          className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                        />
                      </div>
                      <div className="col-span-2">
                        <button
                          onClick={() => {
                            const relationship = (document.getElementById('new-relationship') as HTMLInputElement).value;
                            const condition = (document.getElementById('new-condition') as HTMLInputElement).value;
                            const notes = (document.getElementById('new-notes') as HTMLTextAreaElement).value;
                            
                            if (relationship && condition && id) {
                              handleAddHereditaryBackground({
                                patient_id: id,
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
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
              {/* Header with search and filters */}
              <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">Historial de Consultas</h2>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Buscar por diagnóstico..."
                        value={consultationSearch}
                        onChange={(e) => setConsultationSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={() => fetchPatientData()}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                      title="Actualizar"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Consultas Table */}
                {filteredConsultations.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-600">
                          <th className="text-left py-3 px-4 text-gray-300 font-medium">Fecha</th>
                          <th className="text-left py-3 px-4 text-gray-300 font-medium">Hora</th>
                          <th className="text-left py-3 px-4 text-gray-300 font-medium">Diagnóstico</th>
                          <th className="text-left py-3 px-4 text-gray-300 font-medium">Estado</th>
                          <th className="text-center py-3 px-4 text-gray-300 font-medium">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredConsultations.map((consultation) => (
                          <React.Fragment key={consultation.id}>
                            <tr className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                              <td className="py-3 px-4 text-white">
                                {format(new Date(consultation.created_at), "dd/MM/yyyy", { locale: es })}
                              </td>
                              <td className="py-3 px-4 text-gray-300">
                                {format(new Date(consultation.created_at), "HH:mm", { locale: es })}
                              </td>
                              <td className="py-3 px-4 text-white">
                                <div className="max-w-xs truncate">
                                  {consultation.diagnosis}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Completada
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => setExpandedConsultation(
                                    expandedConsultation === consultation.id ? null : consultation.id
                                  )}
                                  className="p-1 text-gray-400 hover:text-white transition-colors"
                                  title="Ver detalles"
                                >
                                  {expandedConsultation === consultation.id ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </button>
                              </td>
                            </tr>
                            {expandedConsultation === consultation.id && (
                              <tr>
                                <td colSpan={5} className="px-4 py-6 bg-gray-750">
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-medium text-white mb-2">Padecimiento Actual</h4>
                                      <p className="text-gray-300 text-sm">{consultation.current_condition}</p>
                                    </div>

                                    <div>
                                      <h4 className="font-medium text-white mb-2">Signos Vitales</h4>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {Object.entries(consultation.vital_signs as any || {}).map(([key, value]) => (
                                          <div key={key} className="bg-gray-700 rounded p-3">
                                            <dt className="text-xs text-gray-400 uppercase tracking-wide">{key.replace('_', ' ')}</dt>
                                            <dd className="text-sm font-medium text-white mt-1">{value as string}</dd>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {consultation.physical_examination && (
                                      <div>
                                        <h4 className="font-medium text-white mb-2">Exploración Física</h4>
                                        <div className="bg-gray-700 rounded p-4">
                                          <p className="text-gray-300 text-sm">Examen físico realizado</p>
                                        </div>
                                      </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <h4 className="font-medium text-white mb-2">Pronóstico</h4>
                                        <p className="text-gray-300 text-sm bg-gray-700 rounded p-3">{consultation.prognosis}</p>
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-white mb-2">Tratamiento</h4>
                                        <p className="text-gray-300 text-sm bg-gray-700 rounded p-3">{consultation.treatment}</p>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="mx-auto h-12 w-12 text-gray-500" />
                    <h3 className="mt-2 text-sm font-medium text-white">No hay consultas</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      {consultationSearch ? 
                        'No se encontraron consultas que coincidan con tu búsqueda.' :
                        'Comienza creando una nueva consulta para este paciente.'
                      }
                    </p>
                    {!consultationSearch && (
                      <div className="mt-6">
                        <button
                          onClick={() => setShowConsultationForm(true)}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Nueva Consulta
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Consultation Form Modal */}
      {showConsultationForm && userProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-6xl max-h-[95vh] overflow-y-auto">
            <ConsultationForm
              patientId={id!}
              doctorId={userProfile.id}
              onClose={() => setShowConsultationForm(false)}
              onSave={() => {
                setShowConsultationForm(false);
                fetchPatientData();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}