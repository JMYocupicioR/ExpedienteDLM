import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  User, Calendar, Activity, FileText, Settings, ChevronRight, Plus, Edit, Save,
  ArrowLeft, Clock, Heart, Brain, Dna, Trash2, Eye, ChevronDown, ChevronUp,
  Search, Filter, RefreshCw, FileDown, Printer, FileText as FileTextIcon,
  Phone, Mail, MapPin, CheckCircle, Pill
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getPatientById, updatePatient } from '@/features/patients/services/patientService';
import { useSimpleClinic } from '@/hooks/useSimpleClinic';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { validateAndSanitizeArray } from '@/lib/validation';
import ConsultationForm from '@/components/ConsultationForm';
import ConsultationDetails from '@/components/ConsultationDetails';
import ConsultationModal from '@/components/ConsultationModal';
import AppointmentQuickScheduler from '@/components/AppointmentQuickScheduler';
import StudiesSection from '@/components/StudiesSection';
import AuditTrailViewer from '@/components/AuditTrailViewer';
import { appointmentService, Appointment } from '@/lib/services/appointment-service';
import PatientPrescriptionHistory from '@/components/PatientPrescriptionHistory';
import type { Database } from '@/lib/database.types';

type Patient = Database['public']['Tables']['patients']['Row'];
type Consultation = Database['public']['Tables']['consultations']['Row'];
type PathologicalHistory = Database['public']['Tables']['pathological_histories']['Row'];
type NonPathologicalHistory = Database['public']['Tables']['non_pathological_histories']['Row'];
type HereditaryBackground = Database['public']['Tables']['hereditary_backgrounds']['Row'];

export default function PatientRecord() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Hook simple para obtener clínica activa
  const { activeClinic, loading: clinicLoading, error: clinicError } = useSimpleClinic();
  
  console.log('PatientRecord - activeClinic:', activeClinic?.name || 'null');
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
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  useEffect(() => {
    if (id && !clinicLoading) {
      checkSession();
    }
  }, [id, clinicLoading]);

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
      // Error log removed for security;
      navigate('/auth');
    }
  };

  const fetchPatientData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);

      // Fetch patient data using service layer for better security
      const patientData = await getPatientById(id, activeClinic?.id);
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

      // Cargar citas del paciente si tenemos userProfile
      if (userProfile?.id) {
        await loadPatientAppointments(id, userProfile.id);
      }

    } catch (error: any) {
      // Error log removed for security;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientAppointments = async (patientId: string, doctorId: string) => {
    try {
      setLoadingAppointments(true);
      
      // Obtener citas desde hoy hasta los próximos 30 días
      const today = new Date();
      const nextMonth = addDays(today, 30);
      
      const appointments = await appointmentService.getAppointments({
        patient_id: patientId,
        doctor_id: doctorId,
        date_from: format(today, 'yyyy-MM-dd'),
        date_to: format(nextMonth, 'yyyy-MM-dd'),
      });

      // Ordenar por fecha y hora
      const sortedAppointments = appointments.sort((a, b) => {
        const dateTimeA = new Date(`${a.appointment_date}T${a.appointment_time}`);
        const dateTimeB = new Date(`${b.appointment_date}T${b.appointment_time}`);
        return dateTimeA.getTime() - dateTimeB.getTime();
      });

      setPatientAppointments(sortedAppointments);
    } catch (error) {
      // Error log removed for security;
    } finally {
      setLoadingAppointments(false);
    }
  };

  const getAppointmentDateLabel = (date: string) => {
    const appointmentDate = new Date(date);
    if (isToday(appointmentDate)) {
      return 'Hoy';
    } else if (isTomorrow(appointmentDate)) {
      return 'Mañana';
    } else {
      return format(appointmentDate, "EEE d 'de' MMM", { locale: es });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-600 text-blue-100';
      case 'confirmed':
        return 'bg-green-600 text-green-100';
      case 'in_progress':
        return 'bg-yellow-600 text-yellow-100';
      case 'completed':
        return 'bg-gray-600 text-gray-100';
      case 'cancelled':
        return 'bg-red-600 text-red-100';
      default:
        return 'bg-gray-600 text-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Programada';
      case 'confirmed':
        return 'Confirmada';
      case 'in_progress':
        return 'En Progreso';
      case 'completed':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      case 'no_show':
        return 'No Asistió';
      default:
        return status;
    }
  };

  const handleAppointmentScheduled = async () => {
    // Recargar citas después de programar una nueva
    if (id && userProfile?.id) {
      await loadPatientAppointments(id, userProfile.id);
    }
  };

  // Cargar citas cuando userProfile esté disponible
  useEffect(() => {
    if (userProfile?.id && id && !loadingAppointments) {
      loadPatientAppointments(id, userProfile.id);
    }
  }, [userProfile?.id, id]);

  const handleSave = async () => {
    if (!patient || !id) return;
    
    try {
      setLoading(true);
      setError(null);

      // Update patient info
      // Update patient using service layer for better security and validation
      await updatePatient(id, {
        full_name: patient.full_name,
        email: patient.email,
        phone: patient.phone,
        address: patient.address,
        city_of_birth: patient.city_of_birth,
        city_of_residence: patient.city_of_residence,
        social_security_number: patient.social_security_number
      }, activeClinic?.id || '');

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
      // Error log removed for security;
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
      // Error log removed for security;
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

  if (loading || clinicLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">
            {clinicLoading ? 'Cargando información de clínica...' : 'Cargando expediente del paciente...'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !patient || clinicError || (!clinicLoading && !activeClinic)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">
            {error || clinicError || (!activeClinic ? 'No estás asociado a ninguna clínica' : 'Paciente no encontrado')}
          </p>
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
    <div className="flex h-screen" style={{ background: 'var(--app-bg-solid)', color: 'var(--text-primary)' }}>
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-700 flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
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
            <h2 className="text-base font-semibold text-white leading-tight">{patient.full_name}</h2>
            <p className="text-xs text-gray-400">Expediente #{patient.id.slice(0, 8)}</p>
          </div>

          <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Secciones</div>
          <ul className="space-y-2">
            <li>
              <button 
                onClick={() => setSeccionActiva('paciente')}
                className={`flex items-start gap-3 w-full p-3 rounded-lg transition-colors ${
                  seccionActiva === 'paciente' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <User className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-left leading-snug">Información Personal</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setSeccionActiva('patologicos')}
                className={`flex items-start gap-3 w-full p-3 rounded-lg transition-colors ${
                  seccionActiva === 'patologicos' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Heart className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-left leading-snug">Antecedentes Patológicos</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setSeccionActiva('no-patologicos')}
                className={`flex items-start gap-3 w-full p-3 rounded-lg transition-colors ${
                  seccionActiva === 'no-patologicos' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Brain className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-left leading-snug">Antecedentes No Patológicos</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setSeccionActiva('heredofamiliares')}
                className={`flex items-start gap-3 w-full p-3 rounded-lg transition-colors ${
                  seccionActiva === 'heredofamiliares' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Dna className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-left leading-snug">Antecedentes Heredofamiliares</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setSeccionActiva('estudios')}
                className={`flex items-start gap-3 w-full p-3 rounded-lg transition-colors ${
                  seccionActiva === 'estudios' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <FileText className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-left leading-snug">Estudios</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setSeccionActiva('consultas')}
                className={`flex items-start gap-3 w-full p-3 rounded-lg transition-colors ${
                  seccionActiva === 'consultas' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Clock className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-left leading-snug">Consultas</span>
                <span className="ml-auto bg-gray-600 text-gray-200 text-xs rounded-full px-2 py-1">
                  {consultations.length}
                </span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setSeccionActiva('recetas')}
                className={`flex items-start gap-3 w-full p-3 rounded-lg transition-colors ${
                  seccionActiva === 'recetas' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Pill className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-left leading-snug">Historial de Recetas</span>
              </button>
            </li>
            
            <li>
              <button 
                onClick={() => setSeccionActiva('citas')}
                className={`flex items-center w-full p-3 rounded-lg transition-colors ${
                  seccionActiva === 'citas' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Calendar className="h-5 w-5 mr-3" />
                <span>Citas Médicas</span>
                {patientAppointments.filter(apt => ['scheduled', 'confirmed'].includes(apt.status)).length > 0 && (
                  <span className="ml-auto bg-cyan-500 text-white text-xs rounded-full px-2 py-1">
                    {patientAppointments.filter(apt => ['scheduled', 'confirmed'].includes(apt.status)).length}
                  </span>
                )}
              </button>
            </li>
            
            <li>
              <button 
                onClick={() => setSeccionActiva('auditoria')}
                className={`flex items-start gap-3 w-full p-3 rounded-lg transition-colors ${
                  seccionActiva === 'auditoria' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Settings className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-left leading-snug">Auditoría</span>
                <span className="ml-auto bg-orange-500 text-white text-xs rounded-full px-2 py-1">
                  NOM-024
                </span>
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <header className="p-4 border-b border-gray-700 flex justify-between items-center" style={{ background: 'var(--bg-secondary)' }}>
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

        <main className="p-6 max-w-7xl mx-auto">
          {seccionActiva === 'paciente' && (
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-6 text-white">Información Personal</h2>
              {modoEdicion ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300">Nombre completo</label>
                      <input
                        type="text"
                        value={patient.full_name}
                        onChange={(e) => setPatient({ ...patient, full_name: e.target.value })}
                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300">Fecha de nacimiento</label>
                      <input
                        type="date"
                        value={patient.birth_date}
                        onChange={(e) => setPatient({ ...patient, birth_date: e.target.value })}
                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300">Género</label>
                      <select
                        value={patient.gender}
                        onChange={(e) => setPatient({ ...patient, gender: e.target.value })}
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
                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300">Teléfono</label>
                      <input
                        type="tel"
                        value={patient.phone || ''}
                        onChange={(e) => setPatient({ ...patient, phone: e.target.value })}
                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300">Ciudad de Residencia</label>
                      <input
                        type="text"
                        value={patient.city_of_residence || ''}
                        onChange={(e) => setPatient({ ...patient, city_of_residence: e.target.value })}
                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300">Número de Seguro Social</label>
                      <input
                        type="text"
                        value={patient.social_security_number || ''}
                        onChange={(e) => setPatient({ ...patient, social_security_number: e.target.value })}
                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300">Dirección</label>
                      <textarea
                        value={patient.address || ''}
                        onChange={(e) => setPatient({ ...patient, address: e.target.value })}
                        rows={3}
                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <dt className="text-xs uppercase tracking-wide text-gray-400">Nombre completo</dt>
                    <dd className="text-white font-medium">{patient.full_name}</dd>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <dt className="text-xs uppercase tracking-wide text-gray-400">Fecha de nacimiento</dt>
                    <dd className="text-white font-medium">{format(new Date(patient.birth_date), 'dd/MM/yyyy')}</dd>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <dt className="text-xs uppercase tracking-wide text-gray-400">Género</dt>
                    <dd className="text-white font-medium capitalize">{patient.gender}</dd>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <dt className="text-xs uppercase tracking-wide text-gray-400">Ciudad de Nacimiento</dt>
                    <dd className="text-white font-medium">{patient.city_of_birth || 'No especificado'}</dd>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <dt className="text-xs uppercase tracking-wide text-gray-400">Email</dt>
                    <dd className="text-white font-medium">{patient.email || 'No especificado'}</dd>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <dt className="text-xs uppercase tracking-wide text-gray-400">Teléfono</dt>
                    <dd className="text-white font-medium">{patient.phone || 'No especificado'}</dd>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <dt className="text-xs uppercase tracking-wide text-gray-400">Ciudad de Residencia</dt>
                    <dd className="text-white font-medium">{patient.city_of_residence || 'No especificado'}</dd>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4 md:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-gray-400">Dirección</dt>
                    <dd className="text-white font-medium whitespace-pre-wrap">{patient.address || 'No especificado'}</dd>
                  </div>
                </dl>
              )}
            </div>
          )}

          {seccionActiva === 'patologicos' && (
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700 text-left">
              <h2 className="text-xl font-bold mb-6 text-white text-left">Antecedentes Patológicos</h2>
              
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
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700 text-left">
              <h2 className="text-xl font-bold mb-6 text-white text-left">Antecedentes No Patológicos</h2>
              
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
                    onChange={(e) => {
                      const { sanitizedArray, errors } = validateAndSanitizeArray(e.target.value, 'vaccination_history');
                      if (errors.length > 0) {
                        // Warning log removed for security;
                        // Show toast or alert for validation errors
                      }
                      setNonPathologicalHistory(prev => ({
                        ...prev!,
                        vaccination_history: sanitizedArray
                      }));
                    }}
                    readOnly={!modoEdicion}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    placeholder="Separar con comas (máx. 50 elementos, 80 chars c/u)"
                  />
                </div>
              </div>
            </div>
          )}

          {seccionActiva === 'heredofamiliares' && (
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700 text-left">
              <h2 className="text-xl font-bold mb-6 text-white text-left">Antecedentes Heredofamiliares</h2>
              
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
                                  // Error log removed for security;
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

          {seccionActiva === 'recetas' && patient && (
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
              <PatientPrescriptionHistory
                patientId={patient.id}
                patientName={patient.full_name}
                className="text-white"
                showActions={true}
                compact={false}
              />
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
                            <tr className="border-b border-gray-700 hover:bg-gray-700 transition-colors">
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
                                <td colSpan={5} className="px-4 py-6 bg-gray-700">
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
          {seccionActiva === 'estudios' && patient && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">Estudios</h2>
                  <button
                    onClick={() => fetchPatientData()}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="Actualizar"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
                <StudiesSection patientId={patient.id} doctorId={userProfile?.id || null} />
              </div>
            </div>
          )}

          {/* Sección de Citas Médicas */}
          {seccionActiva === 'citas' && (
            <div className="space-y-6">
              {/* Header de citas */}
              <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <Calendar className="h-6 w-6 mr-2 text-cyan-400" />
                    Citas Médicas
                  </h2>
                  {patient && userProfile && (
                    <AppointmentQuickScheduler
                      patientId={patient.id}
                      patientName={patient.full_name}
                      onScheduled={handleAppointmentScheduled}
                      className="hidden sm:block"
                    />
                  )}
                </div>

                {/* Stats de citas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Calendar className="h-4 w-4 text-white" />
                      </div>
                      <div className="ml-3">
                        <p className="text-gray-400 text-sm">Total</p>
                        <p className="text-white font-semibold">{patientAppointments.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                      <div className="ml-3">
                        <p className="text-gray-400 text-sm">Próximas</p>
                        <p className="text-white font-semibold">
                          {patientAppointments.filter(apt => ['scheduled', 'confirmed'].includes(apt.status)).length}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-500 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                      <div className="ml-3">
                        <p className="text-gray-400 text-sm">Completadas</p>
                        <p className="text-white font-semibold">
                          {patientAppointments.filter(apt => apt.status === 'completed').length}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-orange-500 rounded-lg">
                        <Activity className="h-4 w-4 text-white" />
                      </div>
                      <div className="ml-3">
                        <p className="text-gray-400 text-sm">Este Mes</p>
                        <p className="text-white font-semibold">
                          {patientAppointments.filter(apt => {
                            const aptDate = new Date(apt.appointment_date);
                            const now = new Date();
                            return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear();
                          }).length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Agendador para móvil */}
                {patient && userProfile && (
                  <div className="block sm:hidden mb-4">
                    <AppointmentQuickScheduler
                      patientId={patient.id}
                      patientName={patient.full_name}
                      onScheduled={handleAppointmentScheduled}
                    />
                  </div>
                )}
              </div>

              {/* Lista de citas */}
              <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700">
                <div className="p-6">
                  {loadingAppointments ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                    </div>
                  ) : patientAppointments.length > 0 ? (
                    <div className="space-y-4">
                      {patientAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="p-4 bg-gray-700 rounded-lg border-l-4 border-cyan-400 hover:bg-gray-650 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-white font-medium text-lg">{appointment.title}</h3>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                                  {getStatusLabel(appointment.status)}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-2 text-cyan-400" />
                                  <span className="font-medium">{getAppointmentDateLabel(appointment.appointment_date)}</span>
                                  <span className="mx-2">•</span>
                                  <span>{appointment.appointment_time}</span>
                                  <span className="mx-2">•</span>
                                  <span>{appointment.duration} min</span>
                                </div>

                                {appointment.location && (
                                  <div className="flex items-center">
                                    <MapPin className="h-4 w-4 mr-2 text-cyan-400" />
                                    <span>{appointment.location}</span>
                                  </div>
                                )}
                              </div>

                              {appointment.description && (
                                <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                                  {appointment.description}
                                </p>
                              )}

                              {appointment.notes && (
                                <div className="mt-3 p-3 bg-gray-600 rounded-lg">
                                  <div className="flex items-start">
                                    <FileText className="h-4 w-4 mr-2 text-yellow-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-gray-300 text-sm">{appointment.notes}</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col space-y-2 ml-4">
                              <button
                                onClick={() => navigate('/citas')}
                                className="px-3 py-2 text-cyan-400 hover:text-cyan-300 text-sm flex items-center"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver en Calendario
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Calendar className="mx-auto h-12 w-12 text-gray-500" />
                      <h3 className="mt-2 text-sm font-medium text-white">No hay citas programadas</h3>
                      <p className="mt-1 text-sm text-gray-400">
                        Programa la primera cita médica para este paciente.
                      </p>
                      {patient && userProfile && (
                        <div className="mt-6">
                          <AppointmentQuickScheduler
                            patientId={patient.id}
                            patientName={patient.full_name}
                            onScheduled={handleAppointmentScheduled}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sección de Auditoría */}
          {seccionActiva === 'auditoria' && patient && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center">
                      <Settings className="h-6 w-6 mr-2 text-orange-400" />
                      Bitácora de Auditoría
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                      Historial inmutable de cambios - Cumplimiento NOM-024-SSA3-2013
                    </p>
                  </div>
                </div>
                
                <AuditTrailViewer 
                  patientId={patient.id}
                  className="mt-6"
                />
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
              patientName={patient?.full_name}
              onClose={() => setShowConsultationForm(false)}
              onSave={async (consultationData: any) => {
                try {
                  const { data, error } = await supabase
                    .from('consultations')
                    .insert(consultationData)
                    .select('id')
                    .single();
                  if (error) throw error;
                  // No cerrar automáticamente: permitir agregar escalas
                  await fetchPatientData();
                  return data.id as string;
                } catch (e) {
                  // Error log removed for security;
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
