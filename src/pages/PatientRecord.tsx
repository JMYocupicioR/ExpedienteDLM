import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Calendar, Activity, FileText, Settings, ChevronRight, Plus, Edit, Save,
  ArrowLeft, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Patient {
  id: string;
  full_name: string;
  birth_date: string;
  gender: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city_of_birth: string | null;
  city_of_residence: string | null;
  social_security_number: string | null;
  created_at: string;
  updated_at: string | null;
}

interface HereditaryBackground {
  id: string;
  patient_id: string;
  relationship: string;
  condition: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PathologicalHistory {
  id: string;
  patient_id: string;
  chronic_diseases: string[];
  current_treatments: string[];
  surgeries: string[];
  fractures: string[];
  previous_hospitalizations: string[];
  substance_use: {
    tobacco: { current: boolean; frequency?: string; };
    alcohol: { current: boolean; frequency?: string; };
    drugs: { current: boolean; substances?: string[]; };
  };
  created_at: string;
  updated_at: string;
}

interface NonPathologicalHistory {
  id: string;
  patient_id: string;
  handedness: string;
  religion: string;
  marital_status: string;
  education_level: string;
  diet: string;
  personal_hygiene: string;
  vaccination_history: string[];
  created_at: string;
  updated_at: string;
}

interface Consultation {
  id: string;
  patient_id: string;
  doctor_id: string;
  current_condition: string;
  vital_signs: {
    temperature: number;
    heart_rate: number;
    blood_pressure: string;
    respiratory_rate: number;
    oxygen_saturation: number;
    weight: number;
    height: number;
  };
  physical_examination: Record<string, any>;
  diagnosis: string;
  prognosis: string;
  treatment: string;
  created_at: string;
  updated_at: string;
}

interface PhysicalExamTemplate {
  id: string;
  doctor_id: string;
  name: string;
  fields: Record<string, any>;
  created_at: string;
  updated_at: string;
}

const PatientRecord = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [seccionActiva, setSeccionActiva] = useState('paciente');
  const [modoEdicion, setModoEdicion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [patient, setPatient] = useState<Patient | null>(null);
  const [hereditaryBackgrounds, setHereditaryBackgrounds] = useState<HereditaryBackground[]>([]);
  const [pathologicalHistory, setPathologicalHistory] = useState<PathologicalHistory | null>(null);
  const [nonPathologicalHistory, setNonPathologicalHistory] = useState<NonPathologicalHistory | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [examTemplates, setExamTemplates] = useState<PhysicalExamTemplate[]>([]);
  const [newConsultation, setNewConsultation] = useState<Partial<Consultation> | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    fetchPatientData();
  }, [id]);

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

      // Fetch hereditary backgrounds
      const { data: hereditaryData, error: hereditaryError } = await supabase
        .from('hereditary_backgrounds')
        .select('*')
        .eq('patient_id', id);

      if (hereditaryError) throw hereditaryError;
      setHereditaryBackgrounds(hereditaryData || []);

      // Fetch pathological history
      const { data: pathologicalData, error: pathologicalError } = await supabase
        .from('pathological_histories')
        .select('*')
        .eq('patient_id', id)
        .maybeSingle();

      if (pathologicalError && pathologicalError.code !== 'PGRST116') throw pathologicalError;
      setPathologicalHistory(pathologicalData);

      // Fetch non-pathological history
      const { data: nonPathologicalData, error: nonPathologicalError } = await supabase
        .from('non_pathological_histories')
        .select('*')
        .eq('patient_id', id)
        .maybeSingle();

      if (nonPathologicalError && nonPathologicalError.code !== 'PGRST116') throw nonPathologicalError;
      setNonPathologicalHistory(nonPathologicalData);

      // Fetch consultations
      const { data: consultationsData, error: consultationsError } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false });

      if (consultationsError) throw consultationsError;
      setConsultations(consultationsData || []);

      // Fetch exam templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('physical_exam_templates')
        .select('*')
        .order('name');

      if (templatesError) throw templatesError;
      setExamTemplates(templatesData || []);

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

      // Update patient data
      const { error: updateError } = await supabase
        .from('patients')
        .update({
          full_name: patient.full_name,
          email: patient.email,
          phone: patient.phone,
          address: patient.address,
          city_of_birth: patient.city_of_birth,
          city_of_residence: patient.city_of_residence,
          social_security_number: patient.social_security_number,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Update or create pathological history
      if (pathologicalHistory) {
        const { error: pathologicalError } = await supabase
          .from('pathological_histories')
          .upsert({
            ...pathologicalHistory,
            patient_id: id,
          });

        if (pathologicalError) throw pathologicalError;
      }

      // Update or create non-pathological history
      if (nonPathologicalHistory) {
        const { error: nonPathologicalError } = await supabase
          .from('non_pathological_histories')
          .upsert({
            ...nonPathologicalHistory,
            patient_id: id,
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

  const handleNewConsultation = async () => {
    try {
      if (!newConsultation || !selectedTemplate) {
        setError('Por favor complete todos los campos requeridos');
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No user session found');

      // Format the consultation data
      const consultationData = {
        patient_id: id,
        doctor_id: userData.user.id,
        current_condition: newConsultation.current_condition || '',
        vital_signs: newConsultation.vital_signs || {
          temperature: 0,
          heart_rate: 0,
          blood_pressure: '',
          respiratory_rate: 0,
          oxygen_saturation: 0,
          weight: 0,
          height: 0
        },
        physical_examination: newConsultation.physical_examination || {},
        diagnosis: newConsultation.diagnosis || '',
        prognosis: newConsultation.prognosis || '',
        treatment: newConsultation.treatment || ''
      };

      const { data: consultation, error } = await supabase
        .from('consultations')
        .insert(consultationData)
        .select()
        .single();

      if (error) throw error;

      // Update the consultations list
      setConsultations(prev => [consultation, ...prev]);
      setNewConsultation(null);
      setSelectedTemplate(null);
      
    } catch (error: any) {
      console.error('Error creating consultation:', error);
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
                <span>Ficha de Identificación</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setSeccionActiva('heredofamiliar')}
                className={`flex items-center w-full p-3 rounded-lg ${
                  seccionActiva === 'heredofamiliar' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
                }`}
              >
                <FileText className="h-5 w-5 mr-3" />
                <span>Antecedentes Heredofamiliares</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setSeccionActiva('patologicos')}
                className={`flex items-center w-full p-3 rounded-lg ${
                  seccionActiva === 'patologicos' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
                }`}
              >
                <Activity className="h-5 w-5 mr-3" />
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
                <FileText className="h-5 w-5 mr-3" />
                <span>Antecedentes No Patológicos</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setSeccionActiva('consultas')}
                className={`flex items-center w-full p-3 rounded-lg ${
                  seccionActiva === 'consultas' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
                }`}
              >
                <Calendar className="h-5 w-5 mr-3" />
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
            {modoEdicion ? (
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
              <h2 className="text-xl font-bold mb-6">Ficha de Identificación</h2>
              
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
                    <label className="block text-sm font-medium text-gray-700">Ciudad de nacimiento</label>
                    <input
                      type="text"
                      value={patient.city_of_birth || ''}
                      onChange={(e) => setPatient({ ...patient, city_of_birth: e.target.value })}
                      readOnly={!modoEdicion}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Ciudad de residencia</label>
                    <input
                      type="text"
                      value={patient.city_of_residence || ''}
                      onChange={(e) => setPatient({ ...patient, city_of_residence: e.target.value })}
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
                    <label className="block text-sm font-medium text-gray-700">Dirección</label>
                    <textarea
                      value={patient.address || ''}
                      onChange={(e) => setPatient({ ...patient, address: e.target.value })}
                      readOnly={!modoEdicion}
                      rows={3}
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
                </div>
              </div>
            </div>
          )}

          {seccionActiva === 'heredofamiliar' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Antecedentes Heredofamiliares</h2>
                {modoEdicion && (
                  <button
                    onClick={() => {
                      setHereditaryBackgrounds([
                        ...hereditaryBackgrounds,
                        {
                          id: '',
                          patient_id: id || '',
                          relationship: '',
                          condition: '',
                          notes: '',
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                        },
                      ]);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Antecedente
                  </button>
                )}
              </div>

              {hereditaryBackgrounds.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No hay antecedentes heredofamiliares registrados
                </p>
              ) : (
                <div className="space-y-4">
                  {hereditaryBackgrounds.map((background, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Parentesco</label>
                          <input
                            type="text"
                            value={background.relationship}
                            onChange={(e) => {
                              const newBackgrounds = [...hereditaryBackgrounds];
                              newBackgrounds[index].relationship = e.target.value;
                              setHereditaryBackgrounds(newBackgrounds);
                            }}
                            readOnly={!modoEdicion}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Padecimiento</label>
                          <input
                            type="text"
                            value={background.condition}
                            onChange={(e) => {
                              const newBackgrounds = [...hereditaryBackgrounds];
                              newBackgrounds[index].condition = e.target.value;
                              setHereditaryBackgrounds(newBackgrounds);
                            }}
                            readOnly={!modoEdicion}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">Notas</label>
                        <textarea
                          value={background.notes || ''}
                          onChange={(e) => {
                            const newBackgrounds = [...hereditaryBackgrounds];
                            newBackgrounds[index].notes = e.target.value;
                            setHereditaryBackgrounds(newBackgrounds);
                          }}
                          readOnly={!modoEdicion}
                          rows={2}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {seccionActiva === 'patologicos' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-6">Antecedentes Patológicos</h2>

              {!pathologicalHistory && !modoEdicion ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No hay antecedentes patológicos registrados</p>
                  <button
                    onClick={() => {
                      setModoEdicion(true);
                      setPathologicalHistory({
                        id: '',
                        patient_id: id || '',
                        chronic_diseases: [],
                        current_treatments: [],
                        surgeries: [],
                        fractures: [],
                        previous_hospitalizations: [],
                        substance_use: {
                          tobacco: { current: false },
                          alcohol: { current: false },
                          drugs: { current: false },
                        },
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      });
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center mx-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Antecedentes Patológicos
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enfermedades Crónicas
                    </label>
                    <input
                      type="text"
                      value={pathologicalHistory?.chronic_diseases?.join(', ') || ''}
                      onChange={(e) => setPathologicalHistory(prev => prev ? {
                        ...prev,
                        chronic_diseases: e.target.value.split(',').map(s => s.trim()),
                      } : null)}
                      readOnly={!modoEdicion}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                      onChange={(e) => setPathologicalHistory(prev => prev ? {
                        ...prev,
                        current_treatments: e.target.value.split(',').map(s => s.trim()),
                      } : null)}
                      readOnly={!modoEdicion}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                      onChange={(e) => setPathologicalHistory(prev => prev ? {
                        ...prev,
                        surgeries: e.target.value.split(',').map(s => s.trim()),
                      } : null)}
                      readOnly={!modoEdicion}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                      onChange={(e) => setPathologicalHistory(prev => prev ? {
                        ...prev,
                        fractures: e.target.value.split(',').map(s => s.trim()),
                      } : null)}
                      readOnly={!modoEdicion}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                      onChange={(e) => setPathologicalHistory(prev => prev ? {
                        ...prev,
                        previous_hospitalizations: e.target.value.split(',').map(s => s.trim()),
                      } : null)}
                      readOnly={!modoEdicion}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Separar con comas"
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Toxicomanías</h3>
                    
                    <div className="space-y-4">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <label className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            checked={pathologicalHistory?.substance_use.tobacco.current || false}
                            onChange={(e) => setPathologicalHistory(prev => prev ? {
                              ...prev,
                              substance_use: {
                                ...prev.substance_use,
                                tobacco: {
                                  ...prev.substance_use.tobacco,
                                  current: e.target.checked,
                                },
                              },
                            } : null)}
                            disabled={!modoEdicion}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2">Tabaquismo</span>
                        </label>
                        {pathologicalHistory?.substance_use.tobacco.current && (
                          <input
                            type="text"
                            value={pathologicalHistory?.substance_use.tobacco.frequency || ''}
                            onChange={(e) => setPathologicalHistory(prev => prev ? {
                              ...prev,
                              substance_use: {
                                ...prev.substance_use,
                                tobacco: {
                                  ...prev.substance_use.tobacco,
                                  frequency: e.target.value,
                                },
                              },
                            } : null)}
                            readOnly={!modoEdicion}
                            placeholder="Frecuencia"
                            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        )}
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <label className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            checked={pathologicalHistory?.substance_use.alcohol.current || false}
                            onChange={(e) => setPathologicalHistory(prev => prev ? {
                              ...prev,
                              substance_use: {
                                ...prev.substance_use,
                                alcohol: {
                                  ...prev.substance_use.alcohol,
                                  current: e.target.checked,
                                },
                              },
                            } : null)}
                            disabled={!modoEdicion}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2">Alcoholismo</span>
                        </label>
                        {pathologicalHistory?.substance_use.alcohol.current && (
                          <input
                            type="text"
                            value={pathologicalHistory?.substance_use.alcohol.frequency || ''}
                            onChange={(e) => setPathologicalHistory(prev => prev ? {
                              ...prev,
                              substance_use: {
                                ...prev.substance_use,
                                alcohol: {
                                  ...prev.substance_use.alcohol,
                                  frequency: e.target.value,
                                },
                              },
                            } : null)}
                            readOnly={!modoEdicion}
                            placeholder="Frecuencia"
                            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        )}
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <label className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            checked={pathologicalHistory?.substance_use.drugs.current || false}
                            onChange={(e) => setPathologicalHistory(prev => prev ? {
                              ...prev,
                              substance_use: {
                                ...prev.substance_use,
                                drugs: {
                                  ...prev.substance_use.drugs,
                                  current: e.target.checked,
                                },
                              },
                            } : null)}
                            disabled={!modoEdicion}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2">Otras Sustancias</span>
                        </label>
                        {pathologicalHistory?.substance_use.drugs.current && (
                          <input
                            type="text"
                            value={pathologicalHistory?.substance_use.drugs.substances?.join(', ') || ''}
                            onChange={(e) => setPathologicalHistory(prev => prev ? {
                              ...prev,
                              substance_use: {
                                ...prev.substance_use,
                                drugs: {
                                  ...prev.substance_use.drugs,
                                  substances: e.target.value.split(',').map(s => s.trim()),
                                },
                              },
                            } : null)}
                            readOnly={!modoEdicion}
                            placeholder="Sustancias (separar con comas)"
                            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {seccionActiva === 'no-patologicos' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-6">Antecedentes No Patológicos</h2>

              {!nonPathologicalHistory && !modoEdicion ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No hay antecedentes no patológicos registrados</p>
                  <button
                    onClick={() => {
                      setModoEdicion(true);
                      setNonPathologicalHistory({
                        id: '',
                        patient_id: id || '',
                        handedness: '',
                        religion: '',
                        marital_status: '',
                        education_level: '',
                        diet: '',
                        personal_hygiene: '',
                        vaccination_history: [],
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      });
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center mx-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Antecedentes No Patológicos
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Lateralidad</label>
                      <select
                        value={nonPathologicalHistory?.handedness || ''}
                        onChange={(e) => setNonPathologicalHistory(prev => prev ? {
                          ...prev,
                          handedness: e.target.value,
                        } : null)}
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
                        onChange={(e) => setNonPathologicalHistory(prev => prev ? {
                          ...prev,
                          religion: e.target.value,
                        } : null)}
                        readOnly={!modoEdicion}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Estado Civil</label>
                      <select
                        value={nonPathologicalHistory?.marital_status || ''}
                        onChange={(e) => setNonPathologicalHistory(prev => prev ? {
                          ...prev,
                          marital_status: e.target.value,
                        } : null)}
                        disabled={!modoEdicion}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar</option>
                        <option value="soltero">Soltero/a</option>
                        <option value="casado">Casado/a</option>
                        <option value="divorciado">Divorciado/a</option>
                        <option value="viudo">Viudo/a</option>
                        <option value="union_libre">Unión Libre</option>
                      </select>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Escolaridad</label>
                      <input
                        type="text"
                        value={nonPathologicalHistory?.education_level || ''}
                        onChange={(e) => setNonPathologicalHistory(prev => prev ? {
                          ...prev,
                          education_level: e.target.value,
                        } : null)}
                        readOnly={!modoEdicion}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Alimentación</label>
                      <textarea
                        value={nonPathologicalHistory?.diet || ''}
                        onChange={(e) => setNonPathologicalHistory(prev => prev ? {
                          ...prev,
                          diet: e.target.value,
                        } : null)}
                        readOnly={!modoEdicion}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Higiene Personal</label>
                      <textarea
                        value={nonPathologicalHistory?.personal_hygiene || ''}
                        onChange={(e) => setNonPathologicalHistory(prev => prev ? {
                          ...prev,
                          personal_hygiene: e.target.value,
                        } : null)}
                        readOnly={!modoEdicion}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Historial de Vacunación</label>
                      <input
                        type="text"
                        value={nonPathologicalHistory?.vaccination_history?.join(', ') || ''}
                        onChange={(e) => setNonPathologicalHistory(prev => prev ? {
                          ...prev,
                          vaccination_history: e.target.value.split(',').map(s => s.trim()),
                        } : null)}
                        readOnly={!modoEdicion}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Separar con comas"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {seccionActiva === 'consultas' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Consultas</h2>
                <button
                  onClick={() => setNewConsultation({
                    current_condition: '',
                    vital_signs: {
                      temperature: 0,
                      heart_rate: 0,
                      blood_pressure: '',
                      respiratory_rate: 0,
                      oxygen_saturation: 0,
                      weight: 0,
                      height: 0,
                    },
                    physical_examination: {},
                    diagnosis: '',
                    prognosis: '',
                    treatment: '',
                  })}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Consulta
                </button>
              </div>

              {newConsultation && (
                <div className="mb-8 border border-blue-200 rounded-lg p-6 bg-blue-50">
                  <h3 className="text-lg font-semibold mb-4">Nueva Consulta</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Padecimiento Actual
                      </label>
                      <textarea
                        value={newConsultation.current_condition || ''}
                        onChange={(e) => setNewConsultation({
                          ...newConsultation,
                          current_condition: e.target.value,
                        })}
                        rows={4}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Signos Vitales</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600">Temperatura (°C)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={newConsultation.vital_signs?.temperature || ''}
                            onChange={(e) => setNewConsultation({
                              ...newConsultation,
                              vital_signs: {
                                ...newConsultation.vital_signs,
                                temperature: parseFloat(e.target.value),
                              },
                            })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600">Frecuencia Cardíaca</label>
                          <input
                            type="number"
                            value={newConsultation.vital_signs?.heart_rate || ''}
                            onChange={(e) => setNewConsultation({
                              ...newConsultation,
                              vital_signs: {
                                ...newConsultation.vital_signs,
                                heart_rate: parseInt(e.target.value),
                              },
                            })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600">Presión Arterial</label>
                          <input
                            type="text"
                            value={newConsultation.vital_signs?.blood_pressure || ''}
                            onChange={(e) => setNewConsultation({
                              ...newConsultation,
                              vital_signs: {
                                ...newConsultation.vital_signs,
                                blood_pressure: e.target.value,
                              },
                            })}
                            placeholder="120/80"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600">Frecuencia Respiratoria</label>
                          <input
                            type="number"
                            value={newConsultation.vital_signs?.respiratory_rate || ''}
                            onChange={(e) => setNewConsultation({
                              ...newConsultation,
                              vital_signs: {
                                ...newConsultation.vital_signs,
                                respiratory_rate: parseInt(e.target.value),
                              },
                            })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600">Saturación O2 (%)</label>
                          <input
                            type="number"
                            value={newConsultation.vital_signs?.oxygen_saturation || ''}
                            onChange={(e) => setNewConsultation({
                              ...newConsultation,
                              vital_signs: {
                                ...newConsultation.vital_signs,
                                oxygen_saturation: parseInt(e.target.value),
                              },
                            })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600">Peso (kg)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={newConsultation.vital_signs?.weight || ''}
                            onChange={(e) => setNewConsultation({
                              ...newConsultation,
                              vital_signs: {
                                ...newConsultation.vital_signs,
                                weight: parseFloat(e.target.value),
                              },
                            })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600">Altura (cm)</label>
                          <input
                            type="number"
                            value={newConsultation.vital_signs?.height || ''}
                            onChange={(e) => setNewConsultation({
                              ...newConsultation,
                              vital_signs: {
                                ...newConsultation.vital_signs,
                                height: parseInt(e.target.value),
                              },
                            })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Exploración Física</h4>
                      <div className="mb-4">
                        <label className="block text-sm text-gray-600">Seleccionar Plantilla</label>
                        <select
                          value={selectedTemplate || ''}
                          onChange={(e) => {
                            setSelectedTemplate(e.target.value);
                            const template = examTemplates.find(t => t.id === e.target.value);
                            if (template) {
                              setNewConsultation({
                                ...newConsultation,
                                physical_examination: template.fields,
                              });
                            }
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="">Seleccionar plantilla</option>
                          {examTemplates.map(template => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedTemplate && (
                        <div className="space-y-4">
                          {Object.entries(newConsultation.physical_examination || {}).map(([key, value]) => (
                            <div key={key}>
                              <label className="block text-sm text-gray-600">{key}</label>
                              <textarea
                                value={value as string}
                                onChange={(e) => setNewConsultation({
                                  ...newConsultation,
                                  physical_examination: {
                                    ...newConsultation.physical_examination,
                                    [key]: e.target.value,
                                  },
                                })}
                                rows={2}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Diagnóstico
                      </label>
                      <textarea
                        value={newConsultation.diagnosis || ''}
                        onChange={(e) => setNewConsultation({
                          ...newConsultation,
                          diagnosis: e.target.value,
                        })}
                        rows={3}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pronóstico
                      </label>
                      <textarea
                        value={newConsultation.prognosis || ''}
                        onChange={(e) => setNewConsultation({
                          ...newConsultation,
                          prognosis: e.target.value,
                        })}
                        rows={2}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tratamiento
                      </label>
                      <textarea
                        value={newConsultation.treatment || ''}
                        onChange={(e) => setNewConsultation({
                          ...newConsultation,
                          treatment: e.target.value,
                        })}
                        rows={4}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setNewConsultation(null)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-900"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleNewConsultation}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Consulta
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {consultations.map((consultation) => (
                  <div key={consultation.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          Consulta del {format(new Date(consultation.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {format(new Date(consultation.created_at), "HH:mm", { locale: es })} hrs
                        </p>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800">
                        Imprimir
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-700">Padecimiento Actual</h4>
                        <p className="mt-1 text-gray-600">{consultation.current_condition}</p>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-700">Signos Vitales</h4>
                        <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Temperatura</p>
                            <p className="text-gray-600">{consultation.vital_signs.temperature}°C</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Frecuencia Cardíaca</p>
                            <p className="text-gray-600">{consultation.vital_signs.heart_rate} bpm</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Presión Arterial</p>
                            <p className="text-gray-600">{consultation.vital_signs.blood_pressure}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Frecuencia Respiratoria</p>
                            <p className="text-gray-600">{consultation.vital_signs.respiratory_rate} rpm</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Saturación O2</p>
                            <p className="text-gray-600">{consultation.vital_signs.oxygen_saturation}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Peso</p>
                            <p className="text-gray-600">{consultation.vital_signs.weight} kg</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Altura</p>
                            <p className="text-gray-600">{consultation.vital_signs.height} cm</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-700">Exploración Física</h4>
                        <div className="mt-1 space-y-2">
                          {Object.entries(consultation.physical_examination).map(([key, value]) => (
                            <div key={key}>
                              <p className="text-sm text-gray-500">{key}</p>
                              <p className="text-gray-600">{value as string}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-700">Diagnóstico</h4>
                        <p className="mt-1 text-gray-600">{consultation.diagnosis}</p>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-700">Pronóstico</h4>
                        <p className="mt-1 text-gray-600">{consultation.prognosis}</p>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-700">Tratamiento</h4>
                        <p className="mt-1 text-gray-600">{consultation.treatment}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {consultations.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No hay consultas registradas
                  </p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default PatientRecord;