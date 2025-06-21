import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  User, Calendar, Activity, FileText, Settings, ChevronRight, Plus, Edit, Save,
  ArrowLeft, Clock, Heart, Brain, Dna, Trash2, Eye, ChevronDown, ChevronUp,
  Search, Filter, RefreshCw, FileDown, Printer, FileText as FileTextIcon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ConsultationForm from '../components/ConsultationForm';
import ConsultationDetails from '../components/ConsultationDetails';
import ConsultationModal from '../components/ConsultationModal';
import type { Database } from '../lib/database.types';

type Patient = Database['public']['Tables']['patients']['Row'];
type Consultation = Database['public']['Tables']['consultations']['Row'];
type PathologicalHistory = Database['public']['Tables']['pathological_histories']['Row'];
type NonPathologicalHistory = Database['public']['Tables']['non_pathological_histories']['Row'];
type HereditaryBackground = Database['public']['Tables']['hereditary_backgrounds']['Row'];

export default function PatientRecord() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    if (id) {
      checkSession();
    }
  }, [id]);

  // Detectar parámetro de query para abrir nueva consulta automáticamente
  useEffect(() => {
    if (searchParams.get('nueva-consulta') === 'true' && patient) {
      setShowConsultationForm(true);
      // Limpiar el parámetro de la URL sin recargar la página
      setSearchParams({});
    }
  }, [searchParams, patient, setSearchParams]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.export-menu')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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

  const handleExportMenuToggle = () => {
    setShowExportMenu(!showExportMenu);
  };

  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const handlePrintRecord = () => {
    const printContent = generateFullRecordContent();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Expediente Completo - ${patient?.full_name}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
              h1 { color: #333; text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
              h2 { color: #444; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px; }
              h3 { color: #555; margin-top: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 10px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; font-weight: bold; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .section { margin-bottom: 30px; }
              .header-info { margin-bottom: 20px; background-color: #f8f9fa; padding: 15px; border-radius: 5px; }
              .consultation-item { margin-bottom: 15px; border: 1px solid #ddd; padding: 10px; border-radius: 5px; }
              .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
    setShowExportMenu(false);
  };

  const handleExportRecordTXT = () => {
    const txtContent = generateFullRecordTXTContent();
    const blob = new Blob([txtContent], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expediente_${patient?.full_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleExportRecordPDF = () => {
    const pdfContent = generateFullRecordContent();
    const pdfWindow = window.open('', '_blank');
    if (pdfWindow) {
      pdfWindow.document.write(`
        <html>
          <head>
            <title>Expediente Completo - ${patient?.full_name}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
              h1 { color: #333; text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
              h2 { color: #444; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px; }
              h3 { color: #555; margin-top: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 10px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; font-weight: bold; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .section { margin-bottom: 30px; }
              .header-info { margin-bottom: 20px; background-color: #f8f9fa; padding: 15px; border-radius: 5px; }
              .consultation-item { margin-bottom: 15px; border: 1px solid #ddd; padding: 10px; border-radius: 5px; }
              .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            ${pdfContent}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              }
            </script>
          </body>
        </html>
      `);
      pdfWindow.document.close();
    }
    setShowExportMenu(false);
  };

  const generateFullRecordContent = () => {
    if (!patient) return '';
    
    const currentDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
    
    return `
      <div class="header-info">
        <h1>EXPEDIENTE MÉDICO COMPLETO</h1>
        <div class="two-column">
          <div>
            <p><strong>Paciente:</strong> ${patient.full_name}</p>
            <p><strong>Expediente No.:</strong> ${patient.id.slice(0, 8)}</p>
            <p><strong>Fecha de generación:</strong> ${currentDate}</p>
          </div>
          <div>
            <p><strong>Edad:</strong> ${calculateAge(patient.birth_date)} años</p>
            <p><strong>Género:</strong> ${patient.gender}</p>
            <p><strong>Generado por:</strong> ${userProfile?.full_name}</p>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>📋 INFORMACIÓN PERSONAL</h2>
        <table>
          <tr><th>Campo</th><th>Valor</th></tr>
          <tr><td>Nombre Completo</td><td>${patient.full_name}</td></tr>
          <tr><td>Fecha de Nacimiento</td><td>${format(new Date(patient.birth_date), 'dd/MM/yyyy')}</td></tr>
          <tr><td>Edad</td><td>${calculateAge(patient.birth_date)} años</td></tr>
          <tr><td>Género</td><td>${patient.gender}</td></tr>
          <tr><td>Email</td><td>${patient.email || 'No especificado'}</td></tr>
          <tr><td>Teléfono</td><td>${patient.phone || 'No especificado'}</td></tr>
          <tr><td>Ciudad de Nacimiento</td><td>${patient.city_of_birth || 'No especificado'}</td></tr>
          <tr><td>Ciudad de Residencia</td><td>${patient.city_of_residence || 'No especificado'}</td></tr>
          <tr><td>Número de Seguro Social</td><td>${patient.social_security_number || 'No especificado'}</td></tr>
          <tr><td>Dirección</td><td>${patient.address || 'No especificado'}</td></tr>
        </table>
      </div>

      <div class="section">
        <h2>🏥 ANTECEDENTES PATOLÓGICOS</h2>
        <table>
          <tr><th>Campo</th><th>Información</th></tr>
          <tr><td>Enfermedades Crónicas</td><td>${pathologicalHistory?.chronic_diseases?.join(', ') || 'Ninguna registrada'}</td></tr>
          <tr><td>Tratamientos Actuales</td><td>${pathologicalHistory?.current_treatments?.join(', ') || 'Ninguno registrado'}</td></tr>
          <tr><td>Cirugías</td><td>${pathologicalHistory?.surgeries?.join(', ') || 'Ninguna registrada'}</td></tr>
          <tr><td>Fracturas</td><td>${pathologicalHistory?.fractures?.join(', ') || 'Ninguna registrada'}</td></tr>
          <tr><td>Hospitalizaciones Previas</td><td>${pathologicalHistory?.previous_hospitalizations?.join(', ') || 'Ninguna registrada'}</td></tr>
          <tr><td>Uso de Alcohol</td><td>${pathologicalHistory?.substance_use?.alcohol || 'No especificado'}</td></tr>
          <tr><td>Uso de Tabaco</td><td>${pathologicalHistory?.substance_use?.tabaco || 'No especificado'}</td></tr>
          <tr><td>Uso de Drogas</td><td>${pathologicalHistory?.substance_use?.drogas || 'No especificado'}</td></tr>
        </table>
      </div>

      <div class="section">
        <h2>👤 ANTECEDENTES NO PATOLÓGICOS</h2>
        <table>
          <tr><th>Campo</th><th>Información</th></tr>
          <tr><td>Lateralidad</td><td>${nonPathologicalHistory?.handedness || 'No especificado'}</td></tr>
          <tr><td>Religión</td><td>${nonPathologicalHistory?.religion || 'No especificado'}</td></tr>
          <tr><td>Estado Civil</td><td>${nonPathologicalHistory?.marital_status || 'No especificado'}</td></tr>
          <tr><td>Escolaridad</td><td>${nonPathologicalHistory?.education_level || 'No especificado'}</td></tr>
          <tr><td>Dieta</td><td>${nonPathologicalHistory?.diet || 'No especificado'}</td></tr>
          <tr><td>Higiene Personal</td><td>${nonPathologicalHistory?.personal_hygiene || 'No especificado'}</td></tr>
          <tr><td>Historial de Vacunación</td><td>${nonPathologicalHistory?.vaccination_history?.join(', ') || 'No especificado'}</td></tr>
        </table>
      </div>

      <div class="section">
        <h2>🧬 ANTECEDENTES HEREDOFAMILIARES</h2>
        ${hereditaryBackgrounds.length > 0 ? `
          <table>
            <tr><th>Parentesco</th><th>Condición/Enfermedad</th><th>Notas</th></tr>
            ${hereditaryBackgrounds.map(bg => `
              <tr>
                <td>${bg.relationship}</td>
                <td>${bg.condition}</td>
                <td>${bg.notes || 'Sin notas adicionales'}</td>
              </tr>
            `).join('')}
          </table>
        ` : '<p><em>No hay antecedentes heredofamiliares registrados.</em></p>'}
      </div>

      <div class="section">
        <h2>📝 HISTORIAL DE CONSULTAS (${consultations.length} consultas)</h2>
        ${consultations.length > 0 ? consultations.map(consultation => `
          <div class="consultation-item">
            <h3>Consulta del ${format(new Date(consultation.created_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}</h3>
            <table>
              <tr><td><strong>Diagnóstico:</strong></td><td>${consultation.diagnosis || 'No especificado'}</td></tr>
              <tr><td><strong>Condición Actual:</strong></td><td>${consultation.current_condition || 'No especificado'}</td></tr>
              <tr><td><strong>Tratamiento:</strong></td><td>${consultation.treatment || 'No especificado'}</td></tr>
              <tr><td><strong>Observaciones:</strong></td><td>${consultation.observations || 'Sin observaciones'}</td></tr>
              <tr><td><strong>Próxima Cita:</strong></td><td>${consultation.next_appointment ? format(new Date(consultation.next_appointment), 'dd/MM/yyyy', { locale: es }) : 'No programada'}</td></tr>
            </table>
          </div>
        `).join('') : '<p><em>No hay consultas registradas.</em></p>'}
      </div>
         `;
   };

  const generateFullRecordTXTContent = () => {
    if (!patient) return '';
    
    const currentDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
    
    let content = `EXPEDIENTE MÉDICO COMPLETO\n`;
    content += `${'='.repeat(50)}\n\n`;
    content += `PACIENTE: ${patient.full_name}\n`;
    content += `EXPEDIENTE No.: ${patient.id.slice(0, 8)}\n`;
    content += `FECHA DE GENERACIÓN: ${currentDate}\n`;
    content += `EDAD: ${calculateAge(patient.birth_date)} años\n`;
    content += `GENERADO POR: ${userProfile?.full_name}\n\n`;
    
    // Información Personal
    content += `INFORMACIÓN PERSONAL\n`;
    content += `${'='.repeat(25)}\n`;
    content += `Nombre Completo: ${patient.full_name}\n`;
    content += `Fecha de Nacimiento: ${format(new Date(patient.birth_date), 'dd/MM/yyyy')}\n`;
    content += `Edad: ${calculateAge(patient.birth_date)} años\n`;
    content += `Género: ${patient.gender}\n`;
    content += `Email: ${patient.email || 'No especificado'}\n`;
    content += `Teléfono: ${patient.phone || 'No especificado'}\n`;
    content += `Ciudad de Nacimiento: ${patient.city_of_birth || 'No especificado'}\n`;
    content += `Ciudad de Residencia: ${patient.city_of_residence || 'No especificado'}\n`;
    content += `Número de Seguro Social: ${patient.social_security_number || 'No especificado'}\n`;
    content += `Dirección: ${patient.address || 'No especificado'}\n\n`;
    
    // Antecedentes Patológicos
    content += `ANTECEDENTES PATOLÓGICOS\n`;
    content += `${'='.repeat(25)}\n`;
    content += `Enfermedades Crónicas: ${pathologicalHistory?.chronic_diseases?.join(', ') || 'Ninguna registrada'}\n`;
    content += `Tratamientos Actuales: ${pathologicalHistory?.current_treatments?.join(', ') || 'Ninguno registrado'}\n`;
    content += `Cirugías: ${pathologicalHistory?.surgeries?.join(', ') || 'Ninguna registrada'}\n`;
    content += `Fracturas: ${pathologicalHistory?.fractures?.join(', ') || 'Ninguna registrada'}\n`;
    content += `Hospitalizaciones Previas: ${pathologicalHistory?.previous_hospitalizations?.join(', ') || 'Ninguna registrada'}\n`;
    content += `Uso de Alcohol: ${pathologicalHistory?.substance_use?.alcohol || 'No especificado'}\n`;
    content += `Uso de Tabaco: ${pathologicalHistory?.substance_use?.tabaco || 'No especificado'}\n`;
    content += `Uso de Drogas: ${pathologicalHistory?.substance_use?.drogas || 'No especificado'}\n\n`;
    
    // Antecedentes No Patológicos
    content += `ANTECEDENTES NO PATOLÓGICOS\n`;
    content += `${'='.repeat(28)}\n`;
    content += `Lateralidad: ${nonPathologicalHistory?.handedness || 'No especificado'}\n`;
    content += `Religión: ${nonPathologicalHistory?.religion || 'No especificado'}\n`;
    content += `Estado Civil: ${nonPathologicalHistory?.marital_status || 'No especificado'}\n`;
    content += `Escolaridad: ${nonPathologicalHistory?.education_level || 'No especificado'}\n`;
    content += `Dieta: ${nonPathologicalHistory?.diet || 'No especificado'}\n`;
    content += `Higiene Personal: ${nonPathologicalHistory?.personal_hygiene || 'No especificado'}\n`;
    content += `Historial de Vacunación: ${nonPathologicalHistory?.vaccination_history?.join(', ') || 'No especificado'}\n\n`;
    
    // Antecedentes Heredofamiliares
    content += `ANTECEDENTES HEREDOFAMILIARES\n`;
    content += `${'='.repeat(30)}\n`;
    if (hereditaryBackgrounds.length > 0) {
      hereditaryBackgrounds.forEach((bg, index) => {
        content += `${index + 1}. ${bg.relationship}\n`;
        content += `   - Condición: ${bg.condition}\n`;
        if (bg.notes) {
          content += `   - Notas: ${bg.notes}\n`;
        }
        content += `\n`;
      });
    } else {
      content += `No hay antecedentes heredofamiliares registrados.\n\n`;
    }
    
    // Historial de Consultas
    content += `HISTORIAL DE CONSULTAS (${consultations.length} consultas)\n`;
    content += `${'='.repeat(40)}\n`;
    if (consultations.length > 0) {
      consultations.forEach((consultation, index) => {
        content += `CONSULTA ${index + 1} - ${format(new Date(consultation.created_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}\n`;
        content += `${'-'.repeat(50)}\n`;
        content += `Diagnóstico: ${consultation.diagnosis || 'No especificado'}\n`;
        content += `Condición Actual: ${consultation.current_condition || 'No especificado'}\n`;
        content += `Tratamiento: ${consultation.treatment || 'No especificado'}\n`;
        content += `Observaciones: ${consultation.observations || 'Sin observaciones'}\n`;
        content += `Próxima Cita: ${consultation.next_appointment ? format(new Date(consultation.next_appointment), 'dd/MM/yyyy', { locale: es }) : 'No programada'}\n\n`;
      });
    } else {
      content += `No hay consultas registradas.\n\n`;
    }
    
    content += `\n${'-'.repeat(50)}\n`;
    content += `Fin del Expediente Médico\n`;
    content += `Documento generado automáticamente por Expediente DLM\n`;
    
    return content;
  };

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
            {/* Botón de Exportación - siempre visible */}
            <div className="relative">
              <button
                onClick={handleExportMenuToggle}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                title="Exportar expediente completo"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Exportar
              </button>
              
              {showExportMenu && (
                <div className="export-menu absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-20">
                  <div className="py-1">
                    <button
                      onClick={handlePrintRecord}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      <Printer className="h-4 w-4 mr-3" />
                      Imprimir Expediente Completo
                    </button>
                    <button
                      onClick={handleExportRecordPDF}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      <FileDown className="h-4 w-4 mr-3" />
                      Exportar como PDF
                    </button>
                    <button
                      onClick={handleExportRecordTXT}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      <FileTextIcon className="h-4 w-4 mr-3" />
                      Exportar como TXT
                    </button>
                  </div>
                </div>
              )}
            </div>

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
                {hereditaryBackgrounds.length > 0 ? (
                  <div className="space-y-4">
                    {hereditaryBackgrounds.map((background, index) => (
                      <div key={background.id} className="border border-gray-600 rounded-lg p-4 bg-gray-750">
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
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-750 rounded-lg border border-gray-600">
                    <Dna className="mx-auto h-12 w-12 text-gray-500 mb-3" />
                    <p className="text-gray-400">No hay antecedentes heredofamiliares registrados</p>
                  </div>
                )}

                {/* Formulario siempre visible */}
                <div className="border-t border-gray-600 pt-6">
                  <h3 className="font-medium text-white mb-4">Agregar Nuevo Antecedente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Parentesco *
                      </label>
                      <input
                        type="text"
                        id="new-relationship"
                        placeholder="Ej: Madre, Padre, Hermano..."
                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600 placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Condición o Enfermedad *
                      </label>
                      <input
                        type="text"
                        id="new-condition"
                        placeholder="Ej: Diabetes, Hipertensión..."
                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600 placeholder-gray-400"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Notas Adicionales (Opcional)
                      </label>
                      <textarea
                        id="new-notes"
                        rows={3}
                        placeholder="Información adicional relevante..."
                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600 placeholder-gray-400"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <button
                        onClick={() => {
                          const relationship = (document.getElementById('new-relationship') as HTMLInputElement).value.trim();
                          const condition = (document.getElementById('new-condition') as HTMLInputElement).value.trim();
                          const notes = (document.getElementById('new-notes') as HTMLTextAreaElement).value.trim();
                          
                          if (!relationship || !condition) {
                            setError('Por favor completa los campos obligatorios (Parentesco y Condición)');
                            setTimeout(() => setError(null), 3000);
                            return;
                          }
                          
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
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Antecedente
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">* Campos obligatorios</p>
                </div>
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
                                  <ConsultationDetails consultation={consultation} />
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