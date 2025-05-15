import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Calendar, Activity, FileText, Settings, ChevronRight, Plus, Edit, Save,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface Patient {
  id: string;
  full_name: string;
  birth_date: string;
  gender: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

interface MedicalRecord {
  id: string;
  patient_id: string;
  medical_history: string | null;
  allergies: string[] | null;
  medications: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Attachment {
  id: string;
  medical_record_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  created_at: string;
}

const PatientRecord = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [seccionActiva, setSeccionActiva] = useState('paciente');
  const [modoEdicion, setModoEdicion] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecord | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // Fetch medical record
      const { data: recordData, error: recordError } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', id)
        .single();

      if (recordError && recordError.code !== 'PGRST116') throw recordError;
      setMedicalRecord(recordData);

      // Fetch attachments
      if (recordData) {
        const { data: attachmentsData, error: attachmentsError } = await supabase
          .from('attachments')
          .select('*')
          .eq('medical_record_id', recordData.id);

        if (attachmentsError) throw attachmentsError;
        setAttachments(attachmentsData || []);
      }

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

      // Update patient data
      const { error: updateError } = await supabase
        .from('patients')
        .update({
          full_name: patient?.full_name,
          email: patient?.email,
          phone: patient?.phone,
          address: patient?.address,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Update medical record if it exists
      if (medicalRecord) {
        const { error: recordError } = await supabase
          .from('medical_records')
          .update({
            medical_history: medicalRecord.medical_history,
            allergies: medicalRecord.allergies,
            medications: medicalRecord.medications,
            notes: medicalRecord.notes,
          })
          .eq('id', medicalRecord.id);

        if (recordError) throw recordError;
      }

      setModoEdicion(false);
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
                onClick={() => setSeccionActiva('historial')}
                className={`flex items-center w-full p-3 rounded-lg ${
                  seccionActiva === 'historial' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
                }`}
              >
                <FileText className="h-5 w-5 mr-3" />
                <span>Historial Médico</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setSeccionActiva('documentos')}
                className={`flex items-center w-full p-3 rounded-lg ${
                  seccionActiva === 'documentos' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
                }`}
              >
                <FileText className="h-5 w-5 mr-3" />
                <span>Documentos</span>
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
                </div>
              </div>
            </div>
          )}

          {seccionActiva === 'historial' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-6">Historial Médico</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Historia Clínica</label>
                  <textarea
                    value={medicalRecord?.medical_history || ''}
                    onChange={(e) => setMedicalRecord(prev => prev ? { ...prev, medical_history: e.target.value } : null)}
                    readOnly={!modoEdicion}
                    rows={6}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alergias</label>
                  <input
                    type="text"
                    value={medicalRecord?.allergies?.join(', ') || ''}
                    onChange={(e) => setMedicalRecord(prev => prev ? { ...prev, allergies: e.target.value.split(',').map(s => s.trim()) } : null)}
                    readOnly={!modoEdicion}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Separar con comas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Medicamentos Actuales</label>
                  <input
                    type="text"
                    value={medicalRecord?.medications?.join(', ') || ''}
                    onChange={(e) => setMedicalRecord(prev => prev ? { ...prev, medications: e.target.value.split(',').map(s => s.trim()) } : null)}
                    readOnly={!modoEdicion}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Separar con comas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notas Adicionales</label>
                  <textarea
                    value={medicalRecord?.notes || ''}
                    onChange={(e) => setMedicalRecord(prev => prev ? { ...prev, notes: e.target.value } : null)}
                    readOnly={!modoEdicion}
                    rows={4}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {seccionActiva === 'documentos' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-6">Documentos</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <FileText className="h-5 w-5 text-blue-600 mr-2" />
                      <h3 className="font-medium">{attachment.file_name}</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">
                      {format(new Date(attachment.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                    <a
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Ver documento
                    </a>
                  </div>
                ))}

                {modoEdicion && (
                  <div className="border border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center">
                    <button className="text-blue-600 flex flex-col items-center">
                      <Plus className="h-6 w-6 mb-2" />
                      <span>Subir nuevo documento</span>
                    </button>
                  </div>
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