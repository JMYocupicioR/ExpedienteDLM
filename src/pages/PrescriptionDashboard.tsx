import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, FileText, Search, User, Printer, Download, Eye, Clock, AlertTriangle,
  Activity, QrCode, Save, Shield, History, Wifi, WifiOff, CheckCircle, AlertCircle, Loader2,
  Palette
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import QRCode from 'qrcode';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import VisualPrescriptionEditor from '../components/VisualPrescriptionEditor';
import { renderTemplateElement, TemplateElement } from '../components/VisualPrescriptionRenderer';
// ===== NUEVAS IMPORTACIONES PARA SISTEMA CENTRALIZADO =====
import { 
  validateMedication, 
  checkDrugInteractions, 
  calculatePrescriptionExpiry,
  MEDICATION_CONSTRAINTS,
  SYSTEM_LIMITS
} from '../lib/medicalConfig';
import { validateJSONBSchema } from '../lib/validation';
import { useValidation } from '../hooks/useValidation';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Prescription {
  id: string;
  patient_id: string;
  patient_name?: string;
  medications: Medication[];
  diagnosis: string;
  notes: string;
  created_at: string;
  expires_at: string;
  status: 'active' | 'expired' | 'dispensed';
  doctor_signature?: string;
  prescription_style?: any;
  patients?: {
    full_name: string;
  };
}

interface Patient {
  id: string;
  full_name: string;
}

export default function PrescriptionDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'new' | 'visual' | 'history'>('dashboard');
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'dispensed'>('all');
  const [filterDate, setFilterDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [prescriptionHistory, setPrescriptionHistory] = useState<Prescription[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [prescriptionTemplate, setPrescriptionTemplate] = useState<any>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);

  useEffect(() => {
    fetchPrescriptions();
    fetchPatients();
    fetchPrescriptionTemplate();
    
    // Verificar si hay un paciente preseleccionado en la URL
    const pacienteId = searchParams.get('paciente');
    if (pacienteId) {
      setSelectedPatientId(pacienteId);
      setActiveTab('new');
    }
  }, [searchParams]);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name')
        .order('full_name');

      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const fetchPrescriptions = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          id,
          patient_id,
          medications,
          diagnosis,
          notes,
          status,
          created_at,
          expires_at,
          prescription_style,
          patients (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedPrescriptions = data?.map(p => ({
        ...p,
        patient_name: p.patients?.full_name || 'Desconocido'
      })) || [];
      
      setPrescriptions(formattedPrescriptions);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las recetas');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrescriptionHistory = async (patientId: string) => {
    if (!patientId) return;
    
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          patients (
            full_name
          )
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      const formattedHistory = data?.map(p => ({
        ...p,
        patient_name: p.patients?.full_name || 'Desconocido'
      })) || [];
      
      setPrescriptionHistory(formattedHistory);
    } catch (err) {
      console.error('Error fetching prescription history:', err);
    }
  };

  const fetchPrescriptionTemplate = async () => {
    try {
      setIsLoadingTemplate(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('prescription_templates')
        .select('style_definition')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // Ignore 'no rows found'
        throw error;
      }

      if (data) {
        setPrescriptionTemplate(data.style_definition);
      }
    } catch (err: any) {
      console.error('Error fetching prescription template:', err.message);
      setError('No se pudo cargar la plantilla de receta.');
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  const handleSavePrescriptionTemplate = async (styleDefinition: any) => {
    try {
      setSaveStatus('saving');
      setSaveMessage('Guardando plantilla...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('prescription_templates')
        .upsert(
          { user_id: user.id, style_definition: styleDefinition, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
        .select()
        .single();
      
      if (error) throw error;

      setPrescriptionTemplate(data.style_definition);
      setSaveStatus('success');
      setSaveMessage('Plantilla guardada exitosamente.');
      setTimeout(() => setActiveTab('dashboard'), 1500);
    } catch (err: any) {
      console.error('Error saving template:', err.message);
      setSaveStatus('error');
      setSaveMessage('Error al guardar la plantilla.');
    }
  };

  // ===== NUEVA VALIDACIÓN ROBUSTA USANDO SISTEMA CENTRALIZADO =====
  const { validateCompleteForm, validateMedicationsField } = useValidation();

  const validatePrescriptionRobust = (prescriptionData: any) => {
    // Usar el sistema de validación centralizado
    const validation = validateCompleteForm(prescriptionData, 'prescription', {
      patientAllergies: [], // Se pasaría desde props o estado
      doctorSpecialty: 'medicina_general' // Se obtendría del perfil del doctor
    });

    if (!validation.isValid) {
      throw new Error(validation.errors.join('; '));
    }

    // Validaciones adicionales específicas
    if (!prescriptionData.patient_id) {
      throw new Error('Debe seleccionar un paciente');
    }
    if (!prescriptionData.diagnosis) {
      throw new Error('Debe ingresar un diagnóstico');
    }

    // Validar medicamentos usando el nuevo sistema
    if (!prescriptionData.medications?.length || prescriptionData.medications.every((m: any) => !m.name)) {
      throw new Error('Debe agregar al menos un medicamento con nombre');
    }

    // Verificar límite máximo
    if (prescriptionData.medications.length > SYSTEM_LIMITS.MAX_MEDICATIONS_PER_PRESCRIPTION) {
      throw new Error(`Máximo ${SYSTEM_LIMITS.MAX_MEDICATIONS_PER_PRESCRIPTION} medicamentos permitidos por receta`);
    }

    // Validar cada medicamento con el sistema centralizado
    const medicationsValidation = validateMedicationsField(prescriptionData.medications);
    if (!medicationsValidation.isValid) {
      throw new Error(`Errores en medicamentos: ${medicationsValidation.errors.join('; ')}`);
    }

    // Mostrar advertencias si las hay (no bloquear, solo informar)
    if (medicationsValidation.warnings.length > 0) {
      console.warn('Advertencias de medicamentos:', medicationsValidation.warnings);
      // Aquí podrías mostrar un toast o modal con las advertencias
    }
  };
  
  const checkPermissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuario no autenticado.');
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
  
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw new Error('Error al verificar permisos.');
    }
      
    if (!profile || (profile.role !== 'doctor' && profile.role !== 'administrator')) {
      throw new Error('No tiene permisos para crear recetas');
    }
    return user.id; // Return user_id to be used as doctor_id
  };

  const handleNewPrescription = async (prescriptionData: any) => {
    setSaveStatus('saving');
    setSaveMessage('Guardando receta...');
    setError(null);

    try {
      setIsLoading(true);
      
      const doctorId = await checkPermissions();
      validatePrescriptionRobust(prescriptionData); // Usar nueva validación

      // Verificar que el paciente existe
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('id', prescriptionData.patient_id)
        .single();
        
      if (patientError || !patient) {
        console.error('Patient fetch error:', patientError);
        throw new Error('Paciente no encontrado o error al verificar paciente.');
      }
      
      const { data, error: insertError } = await supabase
        .from('prescriptions')
        .insert({
          ...prescriptionData,
          doctor_id: doctorId, 
          status: 'active'
        })
        .select();

      if (insertError) throw insertError;

      // Si hay consulta activa, asociar la receta
      const consultationId = searchParams.get('consulta');
      if (consultationId && data?.[0]?.id) {
        const { error: consultationPrescriptionError } = await supabase
          .from('consultation_prescriptions')
          .insert({
            consultation_id: consultationId,
            prescription_id: data[0].id
          });
        if (consultationPrescriptionError) {
          console.error('Error al asociar receta con consulta:', consultationPrescriptionError.message);
          // Decide if this should be a critical error or just a warning
          setSaveMessage('Receta creada, pero hubo un problema al asociarla con la consulta.');
        }
      }

      await fetchPrescriptions();
      setActiveTab('dashboard');
      
      setSaveStatus('success');
      setSaveMessage('Receta creada exitosamente');
      // alert('Receta creada exitosamente'); // Replaced with saveMessage
    } catch (err: any) {
      console.error('Error detallado al crear la receta:', err);
      setError(err.message || 'Error al crear la receta');
      setSaveStatus('error');
      setSaveMessage(err.message || 'Error al crear la receta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPrescription = (prescription: Prescription) => {
    // Por ahora, mostrar los detalles en un alert
    // En el futuro, implementar un modal
    const details = `
    Paciente: ${prescription.patient_name}
    Diagnóstico: ${prescription.diagnosis}
    
    Medicamentos:
    ${prescription.medications.map(m => 
      `- ${m.name} ${m.dosage}
      Frecuencia: ${m.frequency} por ${m.duration}
      ${m.instructions ? `Instrucciones: ${m.instructions}` : ''}`
    ).join('\n')}
    
    ${prescription.notes ? `Notas: ${prescription.notes}` : ''}
    
    Fecha: ${format(new Date(prescription.created_at), 'dd/MM/yyyy HH:mm')}
    Estado: ${prescription.status}
    `;
    
    alert(details);
  };

  const handlePrintPrescription = async (prescription: Prescription) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const { data: { user } } = await supabase.auth.getUser();
    let userPrescriptionStyle = {} as any; // Default to an empty object
    if (user) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('prescription_style')
        .eq('id', user.id)
        .single();
      if (profileError) {
        console.error("Error fetching prescription_style:", profileError);
      } else {
        userPrescriptionStyle = profileData?.prescription_style || {};
      }
    }

    // Si hay plantilla visual, renderizar usando los elementos
    if (userPrescriptionStyle.visualTemplate && userPrescriptionStyle.visualTemplate.elements) {
      const container = document.createElement('div');
      container.style.position = 'relative';
      container.style.width = (userPrescriptionStyle.visualTemplate.canvasSettings?.canvasSize?.width || 794) + 'px';
      container.style.height = (userPrescriptionStyle.visualTemplate.canvasSettings?.canvasSize?.height || 1123) + 'px';
      container.style.background = userPrescriptionStyle.visualTemplate.canvasSettings?.backgroundColor || '#fff';
      if (userPrescriptionStyle.visualTemplate.canvasSettings?.backgroundImage) {
        container.style.backgroundImage = `url(${userPrescriptionStyle.visualTemplate.canvasSettings.backgroundImage})`;
        container.style.backgroundSize = 'cover';
      }

      const elementsToRender = userPrescriptionStyle.visualTemplate.elements
        .filter((el: TemplateElement) => el.isVisible)
        .sort((a: TemplateElement, b: TemplateElement) => a.zIndex - b.zIndex);

      for (const element of elementsToRender) {
        const elDiv = document.createElement('div');
        elDiv.style.position = 'absolute';
        elDiv.style.left = element.position.x + 'px';
        elDiv.style.top = element.position.y + 'px';
        elDiv.style.width = element.size.width + 'px';
        elDiv.style.height = element.size.height + 'px';
        elDiv.style.fontSize = (element.style.fontSize || 14) + 'px';
        elDiv.style.fontFamily = element.style.fontFamily || 'Arial';
        elDiv.style.color = element.style.color || '#000';
        elDiv.style.fontWeight = element.style.fontWeight || 'normal';
        elDiv.style.fontStyle = element.style.fontStyle || 'normal';
        elDiv.style.textDecoration = element.style.textDecoration || 'none';
        elDiv.style.textAlign = element.style.textAlign || 'left';
        elDiv.style.lineHeight = element.style.lineHeight ? String(element.style.lineHeight) : '1.5';
        elDiv.style.zIndex = String(element.zIndex);
        elDiv.style.background = element.backgroundColor || 'transparent';
        elDiv.style.overflow = 'hidden';
        elDiv.style.whiteSpace = 'pre-wrap';

        let content = element.content;
        if (content) {
          content = content.replace(/\[NOMBRE DEL PACIENTE\]/g, prescription.patient_name || '')
            .replace(/\[FECHA\]/g, format(new Date(prescription.created_at), 'dd/MM/yyyy'))
            .replace(/\[DIAGNÓSTICO\]/g, prescription.diagnosis || '')
            .replace(/\[NOTAS E INSTRUCCIONES ESPECIALES\]/g, prescription.notes || '')
            .replace(/\[NOMBRE DEL MÉDICO\]/g, userPrescriptionStyle.doctorFullName || '')
            .replace(/\[ESPECIALIDAD\]/g, userPrescriptionStyle.doctorSpecialty || '')
            .replace(/\[NÚMERO\]/g, userPrescriptionStyle.doctorLicense || '')
            .replace(/\[NOMBRE DE LA CLÍNICA\]/g, userPrescriptionStyle.clinicName || '')
            .replace(/\[DIRECCIÓN\]/g, userPrescriptionStyle.clinicAddress || '')
            .replace(/\[TELÉFONO\]/g, userPrescriptionStyle.clinicPhone || '')
            .replace(/\[EMAIL\]/g, userPrescriptionStyle.clinicEmail || '');

          if (content.includes('[MEDICAMENTO]')) {
            let meds = '';
            prescription.medications.forEach((med, idx) => {
              meds += `${idx + 1}. ${med.name} - ${med.dosage}\n   Frecuencia: ${med.frequency}\n   Duración: ${med.duration}\n   Instrucciones: ${med.instructions || ''}\n`;
            });
            content = content.replace(/\[MEDICAMENTO\][^\[]*/g, meds);
          }
        }
        elDiv.textContent = content;

        if (element.type === 'qr') {
          const img = document.createElement('img');
          img.style.width = '100%';
          img.style.height = '100%';
          img.alt = 'QR Code';
          img.src = await QRCode.toDataURL(JSON.stringify({ id: prescription.id, patient: prescription.patient_name }), { width: 100, margin: 1 });
          elDiv.textContent = '';
          elDiv.appendChild(img);
        }
        container.appendChild(elDiv);
      }

      printWindow.document.write(`<!DOCTYPE html><html><head><title>Receta Médica</title><style>body{margin:0;padding:0;} .canvas{position:relative;}</style></head><body><div class="canvas">${container.innerHTML}</div></body></html>`);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
      return;
    }

    // Fallback al diseño por defecto si no hay plantilla visual
    const style = {
      fontFamily: userPrescriptionStyle.fontFamily || 'Arial, sans-serif',
      primaryColor: userPrescriptionStyle.primaryColor || '#0066cc',
      secondaryColor: userPrescriptionStyle.secondaryColor || '#333',
      fontSize: userPrescriptionStyle.fontSize === 'small' ? '12px' :
                userPrescriptionStyle.fontSize === 'large' ? '16px' :
                userPrescriptionStyle.fontSize === 'extraLarge' ? '18px' : '14px',
      lineHeight: userPrescriptionStyle.spacing === 'compact' ? '1.3' :
                  userPrescriptionStyle.spacing === 'relaxed' ? '1.7' : '1.5',
      headerStyle: userPrescriptionStyle.headerStyle || 'modern',
      clinicName: userPrescriptionStyle.clinicName || 'Nombre de su Clínica',
      clinicAddress: userPrescriptionStyle.clinicAddress || 'Dirección de la Clínica, Ciudad',
      clinicPhone: userPrescriptionStyle.clinicPhone || '(000) 000-0000',
      clinicEmail: userPrescriptionStyle.clinicEmail || 'email@clinica.com',
      doctorFullName: userPrescriptionStyle.doctorFullName || 'Dr. Nombre Apellido',
      doctorLicense: userPrescriptionStyle.doctorLicense || 'Céd. Prof. XXXXXXX',
      doctorSpecialty: userPrescriptionStyle.doctorSpecialty || 'Medicina General',
      doctorContact: userPrescriptionStyle.doctorContact || '(000) 000-0000',
      titlePrescription: userPrescriptionStyle.titlePrescription || 'RECETA MÉDICA',
      titlePatientInfo: userPrescriptionStyle.titlePatientInfo || 'Información del Paciente',
      titleDiagnosis: userPrescriptionStyle.titleDiagnosis || 'Diagnóstico',
      titleMedications: userPrescriptionStyle.titleMedications || 'Prescripción Médica',
      titleNotes: userPrescriptionStyle.titleNotes || 'Indicaciones Adicionales',
      titleSignature: userPrescriptionStyle.titleSignature || 'Firma del Médico',
      titleValidity: userPrescriptionStyle.titleValidity || 'Validez de la Receta',
      showLogo: userPrescriptionStyle.showLogo !== undefined ? userPrescriptionStyle.showLogo : true,
      logoPosition: userPrescriptionStyle.logoPosition || 'left',
      includeQR: userPrescriptionStyle.includeQR !== undefined ? userPrescriptionStyle.includeQR : true,
      paperSize: userPrescriptionStyle.paperSize || 'letter',
      margins: userPrescriptionStyle.margins || 'normal',
      includeWatermark: userPrescriptionStyle.includeWatermark !== undefined ? userPrescriptionStyle.includeWatermark : false,
    };

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receta Médica - ${prescription.patient_name}</title>
        <style>
          body { 
            font-family: ${style.fontFamily}; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
            color: ${style.secondaryColor};
            font-size: ${style.fontSize};
            line-height: ${style.lineHeight};
            ${style.margins === 'narrow' ? 'padding: 10px;' : style.margins === 'wide' ? 'padding: 30px;' : 'padding: 20px;'}
            ${style.paperSize === 'a4' ? 'width: 210mm; min-height: 297mm;' : style.paperSize === 'legal' ? 'width: 216mm; min-height: 356mm;' : 'width: 216mm; min-height: 279mm;'}
          }
          .header { 
            text-align: ${style.headerStyle === 'classic' ? 'center' : 'left'}; 
            border-bottom: 2px solid ${style.primaryColor}; 
            padding-bottom: 20px; 
            margin-bottom: 20px; 
          }
          .header h1 { color: ${style.primaryColor}; margin-bottom: 10px; font-size: 1.8em; }
          .doctor-info { font-size: 0.9em; color: ${style.secondaryColor}; }
          .clinic-info { text-align: center; margin-bottom: 20px; padding: 10px; border: 1px solid #eee; border-radius: 5px; font-size: 0.9em; }
          .patient-info { margin-bottom: 20px; background: #f5f5f5; padding: 15px; border-radius: 5px; }
          .medications { margin-bottom: 30px; }
          .medication-item { margin-bottom: 15px; padding: 15px; border-left: 4px solid ${style.primaryColor}; background: #f9f9f9; border-radius: 0 5px 5px 0; }
          .medication-name { font-weight: bold; color: ${style.primaryColor}; font-size: 1.1em; }
          .medication-details { margin-top: 5px; color: #555; }
          .diagnosis-section, .notes-section { background: #eef7ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .section-title { color: ${style.primaryColor}; font-weight: bold; margin-bottom: 8px; font-size: 1.2em; }
          .footer { margin-top: 50px; text-align: center; }
          .signature-line { border-top: 1px solid ${style.secondaryColor}; width: 200px; margin: 40px auto 10px; }
          .validity { margin-top: 30px; text-align: center; font-size: 0.8em; color: #666; }
          .logo-container { ${style.logoPosition === 'left' ? 'float: left; margin-right: 15px;' : 'float: right; margin-left: 15px;'} width: 60px; height: 60px; background: ${style.secondaryColor}; color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; border-radius: 4px; }
          .qr-code-container { text-align: center; margin-top: 20px; }
          .qr-code-container img { width: 100px; height: 100px; }
          @media print {
            @page {
              size: ${style.paperSize === 'a4' ? 'A4' : style.paperSize === 'legal' ? 'Legal' : 'Letter'};
              margin: ${style.margins === 'narrow' ? '0.5in' : style.margins === 'wide' ? '1.5in' : '1in'};
            }
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${style.showLogo ? `<div class="logo-container" style="${style.logoPosition === 'center' ? 'text-align: center; float: none; margin-bottom: 10px;' : (style.logoPosition === 'left' ? 'float: left; margin-right: 15px;' : 'float: right; margin-left: 15px;')}">LOGO</div>` : ''}
          <h1>${style.titlePrescription}</h1>
          <div class="doctor-info">
            <p><strong>${style.doctorFullName}</strong></p>
            <p>${style.doctorSpecialty}</p>
            <p>Cédula Profesional: ${style.doctorLicense}</p>
            <p>Contacto: ${style.doctorContact}</p>
          </div>
          <div style="clear: both;"></div>
        </div>
        <div class="clinic-info">
          <p><strong>${style.clinicName}</strong></p>
          <p>${style.clinicAddress}</p>
          <p>Tel: ${style.clinicPhone} | Email: ${style.clinicEmail}</p>
        </div>
        <div class="patient-info">
          <h3 class="section-title">${style.titlePatientInfo}</h3>
          <p><strong>Paciente:</strong> ${prescription.patient_name}</p>
          <p><strong>Fecha:</strong> ${format(new Date(prescription.created_at), 'dd/MM/yyyy', { locale: es })}</p>
          <p><strong>Hora:</strong> ${format(new Date(prescription.created_at), 'HH:mm')}</p>
        </div>
        <div class="diagnosis-section">
          <h3 class="section-title">${style.titleDiagnosis}</h3>
          <p>${prescription.diagnosis}</p>
        </div>
        <div class="medications">
          <h3 class="section-title">${style.titleMedications}</h3>
          ${prescription.medications.map((med, index) => `
            <div class="medication-item">
              <div class="medication-name">${index + 1}. ${med.name} - ${med.dosage}</div>
              <div class="medication-details">
                <p><strong>Frecuencia:</strong> ${med.frequency}</p>
                <p><strong>Duración:</strong> ${med.duration}</p>
                ${med.instructions ? `<p><strong>Instrucciones:</strong> ${med.instructions}</p>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
        ${prescription.notes ? `
          <div class="notes-section">
            <h3 class="section-title">${style.titleNotes}</h3>
            <p>${prescription.notes}</p>
          </div>
        ` : ''}
        <div class="footer">
          <div class="signature-line"></div>
          <p>${style.titleSignature}</p>
        </div>
        ${style.includeQR ? `
          <div class="qr-code-container">
            <img src="${await QRCode.toDataURL(JSON.stringify({ id: prescription.id, patient: prescription.patient_name }), { width: 100, margin: 1 })}" alt="QR Code" />
          </div>
        ` : ''}
        <div class="validity">
          <p>${style.titleValidity}: Esta receta tiene una validez de 30 días a partir de su emisión.</p>
          <p>Válida hasta: ${format(new Date(prescription.expires_at), 'dd/MM/yyyy')}</p>
          <p>ID: ${prescription.id}</p>
        </div>
        ${style.includeWatermark ? `
          <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); opacity: 0.1; font-size: 5em; color: ${style.primaryColor}; font-weight: bold; pointer-events: none; z-index: -1; text-align: center; width: 100%;">
            ${style.clinicName || "CLÍNICA"}
          </div>
        ` : ''}
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleDownloadPrescription = async (prescription: Prescription) => {
    // Crear un objeto con la información formateada
    const prescriptionData = {
      id: prescription.id,
      fecha_emision: format(new Date(prescription.created_at), 'dd/MM/yyyy HH:mm'),
      fecha_vencimiento: format(new Date(prescription.expires_at), 'dd/MM/yyyy'),
      paciente: prescription.patient_name,
      diagnostico: prescription.diagnosis,
      medicamentos: prescription.medications,
      notas: prescription.notes,
      estado: prescription.status,
      medico: {
        nombre: 'Dr. Juan Médico',
        cedula: '12345678',
        especialidad: 'Medicina General'
      }
    };
    
    const dataStr = JSON.stringify(prescriptionData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `receta_${prescription.patient_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Filtrar prescripciones
  const filteredPrescriptions = prescriptions.filter((prescription) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' || 
                         prescription.patient_name?.toLowerCase().includes(searchLower) ||
                         prescription.diagnosis?.toLowerCase().includes(searchLower) ||
                         prescription.medications?.some(med => 
                           med.name?.toLowerCase().includes(searchLower)
                         );
    const matchesStatus = filterStatus === 'all' || prescription.status === filterStatus;
    const matchesDate = !filterDate || prescription.created_at.includes(filterDate);
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calcular estadísticas
  const stats = {
    active: prescriptions.filter(p => p.status === 'active').length,
    expired: prescriptions.filter(p => p.status === 'expired').length,
    dispensed: prescriptions.filter(p => p.status === 'dispensed').length,
    total: prescriptions.length,
    expiringSoon: prescriptions.filter(p => {
      if (p.status !== 'active') return false;
      const expiryDate = new Date(p.expires_at);
      const today = new Date();
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7 && diffDays > 0;
    }).length
  };

  // Actualizar paciente seleccionado cuando cambie
  useEffect(() => {
    if (selectedPatientId) {
      const patient = patients.find(p => p.id === selectedPatientId);
      setSelectedPatientName(patient?.full_name || '');
      fetchPrescriptionHistory(selectedPatientId);
    }
  }, [selectedPatientId, patients]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
      {/* Header */}
      <div className="dark-card border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-100">Dashboard de Recetas Médicas</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center px-4 py-2 dark-button-secondary"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dark-card border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'dashboard'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Activity className="h-5 w-5 mr-2" />
              Panel Principal
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'new'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Plus className="h-5 w-5 mr-2" />
              Nueva Receta
            </button>
            <button
              onClick={() => setActiveTab('visual')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'visual'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Palette className="h-5 w-5 mr-2" />
              Editor Visual
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'history'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <FileText className="h-5 w-5 mr-2" />
              Historial Completo
            </button>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          </div>
        )}

        {/* Panel Principal */}
        {activeTab === 'dashboard' && !isLoading && (
          <div className="space-y-6">
            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="dark-card p-5">
                <div className="flex items-center">
                  <FileText className="h-6 w-6 text-cyan-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-400">Total</p>
                    <p className="text-2xl font-semibold text-gray-100">{stats.total}</p>
                  </div>
                </div>
              </div>
              <div className="dark-card p-5">
                <div className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-green-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-400">Activas</p>
                    <p className="text-2xl font-semibold text-gray-100">{stats.active}</p>
                  </div>
                </div>
              </div>
              <div className="dark-card p-5">
                <div className="flex items-center">
                  <Clock className="h-6 w-6 text-yellow-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-400">Por Vencer</p>
                    <p className="text-2xl font-semibold text-gray-100">{stats.expiringSoon}</p>
                  </div>
                </div>
              </div>
              <div className="dark-card p-5">
                <div className="flex items-center">
                  <AlertTriangle className="h-6 w-6 text-red-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-400">Vencidas</p>
                    <p className="text-2xl font-semibold text-gray-100">{stats.expired}</p>
                  </div>
                </div>
              </div>
              <div className="dark-card p-5">
                <div className="flex items-center">
                  <Shield className="h-6 w-6 text-purple-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-400">Dispensadas</p>
                    <p className="text-2xl font-semibold text-gray-100">{stats.dispensed}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Alertas */}
            {stats.expiringSoon > 0 && (
              <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-300">
                      Recetas por Vencer
                    </h3>
                    <p className="mt-1 text-sm text-yellow-200">
                      Tienes {stats.expiringSoon} receta(s) que vencerán en los próximos 7 días.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Recetas Recientes */}
            <div className="dark-card">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-100">
                    Últimas Recetas Emitidas
                  </h3>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="inline-flex items-center px-3 py-1.5 dark-button-primary text-sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Nueva Receta
                  </button>
                </div>
                
                {prescriptions.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No hay recetas registradas aún</p>
                    <button
                      onClick={() => setActiveTab('new')}
                      className="mt-3 text-cyan-400 hover:text-cyan-300"
                    >
                      Crear primera receta
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-800/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                            Paciente
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                            Diagnóstico
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                            Medicamentos
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                            Fecha
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                            Estado
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {prescriptions.slice(0, 5).map((prescription) => (
                          <tr key={prescription.id} className="hover:bg-gray-800/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <User className="h-5 w-5 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-200">{prescription.patient_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {prescription.diagnosis}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-300">
                              <span className="text-cyan-400">{prescription.medications.length}</span> medicamento(s)
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {format(new Date(prescription.created_at), "dd/MM/yyyy")}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                prescription.status === 'active' ? 'bg-green-900 text-green-300' :
                                prescription.status === 'expired' ? 'bg-red-900 text-red-300' :
                                'bg-yellow-900 text-yellow-300'
                              }`}>
                                {prescription.status === 'active' ? 'Activa' :
                                 prescription.status === 'expired' ? 'Vencida' : 'Dispensada'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex space-x-2">
                                <button 
                                  onClick={() => handleViewPrescription(prescription)}
                                  className="text-cyan-400 hover:text-cyan-300"
                                  title="Ver detalles"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => handlePrintPrescription(prescription)}
                                  className="text-gray-400 hover:text-gray-300"
                                  title="Imprimir"
                                >
                                  <Printer className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => handleDownloadPrescription(prescription)}
                                  className="text-green-400 hover:text-green-300"
                                  title="Descargar"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Nueva Receta */}
        {activeTab === 'new' && (
          <EnhancedPrescriptionForm
            patientId={selectedPatientId}
            patientName={selectedPatientName}
            onSave={handleNewPrescription}
            previousPrescriptions={prescriptionHistory}
            patients={patients}
            onPatientChange={setSelectedPatientId}
            saveStatus={saveStatus}
            saveMessage={saveMessage}
          />
        )}

        {/* Editor Visual */}
        {activeTab === 'visual' && (
          <>
            {isLoadingTemplate ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                <p className="ml-4 text-gray-300">Cargando plantilla...</p>
              </div>
            ) : (
              <div className="fixed inset-0 z-50">
                <VisualPrescriptionEditor
                  patientId={selectedPatientId || 'preview'}
                  patientName={selectedPatientName || 'Vista Previa'}
                  onSave={handleSavePrescriptionTemplate}
                  onClose={() => setActiveTab('dashboard')}
                  existingTemplate={prescriptionTemplate}
                />
              </div>
            )}
          </>
        )}

        {/* Historial Completo */}
        {activeTab === 'history' && !isLoading && (
          <div className="dark-card">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-medium text-gray-100">
                  Historial Completo de Recetas
                </h3>
                
                {/* Filtros */}
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar..."
                      className="pl-10 pr-4 py-2 dark-input"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="dark-input"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="active">Activas</option>
                    <option value="expired">Vencidas</option>
                    <option value="dispensed">Dispensadas</option>
                  </select>
                  
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="dark-input"
                  />
                </div>
              </div>
              
              {filteredPrescriptions.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No se encontraron recetas con los filtros aplicados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Paciente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Diagnóstico
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Medicamentos
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Fecha Emisión
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Vencimiento
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredPrescriptions.map((prescription) => (
                        <tr key={prescription.id} className="hover:bg-gray-800/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                            {prescription.id.substring(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-200">{prescription.patient_name}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300">
                            <div className="max-w-xs truncate" title={prescription.diagnosis}>
                              {prescription.diagnosis}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300">
                            <div className="max-w-xs truncate" title={prescription.medications.map(m => m.name).join(', ')}>
                              {prescription.medications.map(m => m.name).join(', ')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {format(new Date(prescription.created_at), "dd/MM/yyyy HH:mm")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {format(new Date(prescription.expires_at), "dd/MM/yyyy")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              prescription.status === 'active' ? 'bg-green-900 text-green-300' :
                              prescription.status === 'expired' ? 'bg-red-900 text-red-300' :
                              'bg-yellow-900 text-yellow-300'
                            }`}>
                              {prescription.status === 'active' ? 'Activa' :
                               prescription.status === 'expired' ? 'Vencida' : 'Dispensada'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => handleViewPrescription(prescription)}
                                className="text-cyan-400 hover:text-cyan-300 transition-colors"
                                title="Ver detalles"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handlePrintPrescription(prescription)}
                                className="text-gray-400 hover:text-gray-300 transition-colors"
                                title="Imprimir"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleDownloadPrescription(prescription)}
                                className="text-green-400 hover:text-green-300 transition-colors"
                                title="Descargar"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente del formulario mejorado
interface EnhancedPrescriptionFormProps {
  patientId: string;
  patientName: string;
  onSave: (prescription: any) => void;
  previousPrescriptions?: any[];
  patients?: Patient[];
  onPatientChange?: (patientId: string) => void;
  saveStatus?: 'idle' | 'saving' | 'success' | 'error';
  saveMessage?: string;
}

// ===== MEDICAMENTOS COMUNES USANDO CONFIGURACIÓN CENTRALIZADA =====
const commonMedications = Object.keys(MEDICATION_CONSTRAINTS).map(name => {
  const constraint = MEDICATION_CONSTRAINTS[name];
  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    dosages: [`${constraint.minDosage}mg`, `${constraint.maxDosage}mg`],
    frequencies: constraint.allowedFrequencies.map(freq => 
      freq.charAt(0).toUpperCase() + freq.slice(1)
    ),
    maxDuration: constraint.maxDurationDays,
    controlled: constraint.controlledSubstance || false,
    requiresSpecialist: constraint.requiresSpecialist || false,
    // Información adicional para autocompletado inteligente
    category: name.includes('amoxicilina') || name.includes('ciprofloxacino') ? 'antibiótico' :
             name.includes('ibuprofeno') || name.includes('paracetamol') ? 'analgésico' :
             name.includes('losartan') || name.includes('atorvastatina') ? 'cardiovascular' :
             name.includes('tramadol') ? 'controlado' : 'general'
  };
});

// Verificador de interacciones medicamentosas (simulado)
const drugInteractions: { [key: string]: string[] } = {
  'Warfarina': ['Aspirina', 'Ibuprofeno', 'Amoxicilina'],
  'Metformina': ['Alcohol', 'Contrastes yodados'],
  'Losartán': ['Potasio', 'Espironolactona'],
  'Atorvastatina': ['Gemfibrozilo', 'Eritromicina']
};

function EnhancedPrescriptionForm({ 
  patientId, 
  patientName, 
  onSave,
  previousPrescriptions = [],
  patients = [],
  onPatientChange,
  saveStatus = 'idle',
  saveMessage = ''
}: EnhancedPrescriptionFormProps) {
  const navigate = useNavigate();
  const [medications, setMedications] = useState<Medication[]>([{
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: ''
  }]);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [drugAlerts, setDrugAlerts] = useState<string[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Detectar estado de conexión
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Generar código QR
  useEffect(() => {
    const generateQR = async () => {
      const prescriptionData = {
        id: Date.now().toString(),
        patient: patientName,
        date: new Date().toISOString(),
        medications: medications.filter(m => m.name),
        doctor: 'Dr. Juan Médico'
      };

      try {
        const url = await QRCode.toDataURL(JSON.stringify(prescriptionData), {
          width: 150,
          margin: 1
        });
        setQrCodeUrl(url);
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    };

    if (medications.some(m => m.name)) {
      generateQR();
    }
  }, [medications, patientName]);

  // ===== VERIFICACIÓN DE INTERACCIONES USANDO SISTEMA CENTRALIZADO =====
  useEffect(() => {
    const alerts: string[] = [];
    
    // Obtener nombres de medicamentos válidos
    const medicationNames = medications
      .filter(med => med.name && med.name.trim())
      .map(med => med.name.trim());
    
    if (medicationNames.length >= 2) {
      // Usar función centralizada de verificación de interacciones
      const interactions = checkDrugInteractions(medicationNames);
      interactions.forEach(interaction => {
        alerts.push(`⚠️ ${interaction}`);
      });
    }

    // Validaciones adicionales de medicamentos individuales
    medications.forEach((med, index) => {
      if (!med.name || !med.dosage || !med.frequency || !med.duration) return;

      // Extraer dosificación numérica para validación
      const dosageMatch = med.dosage.match(/(\d+(?:\.\d+)?)/);
      const dosageNum = dosageMatch ? parseFloat(dosageMatch[1]) : 0;
      
      // Extraer duración numérica
      const durationMatch = med.duration.match(/(\d+)/);
      const durationNum = durationMatch ? parseInt(durationMatch[1]) : 0;

      // Validar medicamento usando configuración centralizada
      const validation = validateMedication(med.name.toLowerCase(), dosageNum, med.frequency.toLowerCase(), durationNum);
      
      if (!validation.isValid) {
        validation.errors.forEach(error => {
          alerts.push(`❌ ${med.name}: ${error}`);
        });
      }

      validation.warnings.forEach(warning => {
        alerts.push(`⚠️ ${med.name}: ${warning}`);
      });
    });

    // Verificar límite máximo de medicamentos
    if (medications.filter(m => m.name).length > SYSTEM_LIMITS.MAX_MEDICATIONS_PER_PRESCRIPTION) {
      alerts.push(`❌ Excede el límite máximo de ${SYSTEM_LIMITS.MAX_MEDICATIONS_PER_PRESCRIPTION} medicamentos por receta`);
    }
    
    setDrugAlerts(Array.from(new Set(alerts)));
  }, [medications]);

  // Autocompletado de medicamentos
  const handleMedicationNameChange = (index: number, value: string) => {
    const updatedMeds = [...medications];
    updatedMeds[index].name = value;
    setMedications(updatedMeds);

    if (value.length > 2) {
      const filtered = commonMedications.filter(med => 
        med.name.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setActiveSuggestionIndex(index);
    } else {
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
    }
  };

  // Seleccionar sugerencia
  const selectSuggestion = (suggestion: any, index: number) => {
    const updatedMeds = [...medications];
    updatedMeds[index].name = suggestion.name;
    if (suggestion.dosages.length > 0) {
      updatedMeds[index].dosage = suggestion.dosages[0];
    }
    if (suggestion.frequencies.length > 0) {
      updatedMeds[index].frequency = suggestion.frequencies[0];
    }
    setMedications(updatedMeds);
    setSuggestions([]);
    setActiveSuggestionIndex(-1);
  };

  // Agregar medicamento
  const addMedication = () => {
    setMedications([...medications, {
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: ''
    }]);
  };

  // Eliminar medicamento
  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  // Actualizar medicamento
  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const updatedMeds = [...medications];
    updatedMeds[index][field] = value;
    setMedications(updatedMeds);
  };

  // Firma digital - Iniciar dibujo
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  // Firma digital - Dibujar
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  // Firma digital - Terminar dibujo
  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL());
    }
  };

  // Limpiar firma
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  // Guardar receta
  const handleSave = () => {
    const prescriptionData = {
      patient_id: patientId,
      medications: medications.filter(m => m.name),
      diagnosis,
      notes,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    // Si está offline, guardar en localStorage
    if (isOffline) {
      const offlinePrescriptions = JSON.parse(localStorage.getItem('offline_prescriptions') || '[]');
      offlinePrescriptions.push(prescriptionData);
      localStorage.setItem('offline_prescriptions', JSON.stringify(offlinePrescriptions));
    }

    onSave(prescriptionData);
  };

  // Imprimir receta
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Indicador de estado offline */}
      {isOffline && (
        <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-3 flex items-center">
          <WifiOff className="h-5 w-5 text-yellow-400 mr-2" />
          <span className="text-yellow-300 text-sm">Modo offline: Las recetas se guardarán localmente</span>
        </div>
      )}

      {/* Save status message */}
      {saveMessage && (
        <div 
          className={`p-3 rounded-md text-sm 
            ${saveStatus === 'success' ? 'bg-green-900/30 border border-green-500 text-green-300' : ''}
            ${saveStatus === 'error' ? 'bg-red-900/30 border border-red-500 text-red-300' : ''}
            ${saveStatus === 'saving' ? 'bg-blue-900/30 border border-blue-500 text-blue-300' : ''}
          `}
        >
          {saveMessage}
        </div>
      )}

      {/* Selector de paciente */}
      <div className="dark-card p-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Paciente <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-3">
          <select
            value={patientId}
            onChange={(e) => onPatientChange && onPatientChange(e.target.value)}
            className="flex-1 dark-input"
            required
          >
            <option value="">Seleccione un paciente</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.full_name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => navigate('/patients?action=new')}
            className="px-4 py-2 dark-button-secondary text-sm"
            title="Registrar nuevo paciente"
          >
            + Nuevo
          </button>
        </div>
        {!patientId && (
          <p className="mt-1 text-xs text-yellow-400">Debe seleccionar un paciente para continuar</p>
        )}
      </div>

      {/* Alertas de interacciones medicamentosas */}
      {drugAlerts.length > 0 && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
            <div>
              <h4 className="text-red-300 font-medium mb-2">Alertas de Interacciones</h4>
              <ul className="text-red-200 text-sm space-y-1">
                {drugAlerts.map((alert, index) => (
                  <li key={index}>{alert}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Historial de recetas anteriores */}
      {previousPrescriptions.length > 0 && (
        <div className="dark-card p-4">
          <div className="flex items-center mb-3">
            <History className="h-5 w-5 text-cyan-400 mr-2" />
            <h3 className="text-gray-100 font-medium">Recetas Anteriores del Paciente</h3>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
            {previousPrescriptions.slice(0, 3).map((rx, index) => (
              <div key={index} className="text-sm text-gray-300 bg-gray-800/30 p-2 rounded">
                <span className="text-gray-400">{format(new Date(rx.created_at), 'dd/MM/yyyy')}</span>
                <span className="mx-2">•</span>
                <span>{rx.diagnosis}</span>
                <button 
                  className="ml-2 text-cyan-400 hover:text-cyan-300"
                  onClick={() => {
                    setDiagnosis(rx.diagnosis);
                    setNotes(rx.notes);
                    setMedications(rx.medications);
                  }}
                >
                  Usar como base
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulario principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna izquierda - Formulario */}
        <div className="space-y-4">
          {/* Diagnóstico */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Diagnóstico <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full dark-input"
              placeholder="Ingrese el diagnóstico"
              required
            />
          </div>

          {/* Medicamentos */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Medicamentos <span className="text-red-400">*</span></label>
            {medications.map((medication, index) => (
              <div key={index} className="relative mb-4 p-4 border border-gray-700 rounded-lg bg-gray-800/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={medication.name}
                      onChange={(e) => handleMedicationNameChange(index, e.target.value)}
                      className="w-full dark-input"
                      placeholder="Nombre del medicamento"
                      required
                    />
                    {/* Sugerencias de autocompletado */}
                    {suggestions.length > 0 && activeSuggestionIndex === index && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectSuggestion(suggestion, index)}
                            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-cyan-400"
                          >
                            {suggestion.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <input
                    type="text"
                    value={medication.dosage}
                    onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                    className="w-full dark-input"
                    placeholder="Dosis (ej. 500mg)"
                    required
                  />
                  
                  <input
                    type="text"
                    value={medication.frequency}
                    onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                    className="w-full dark-input"
                    placeholder="Frecuencia"
                    required
                  />
                  
                  <input
                    type="text"
                    value={medication.duration}
                    onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                    className="w-full dark-input"
                    placeholder="Duración"
                    required
                  />
                  
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={medication.instructions}
                      onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                      className="w-full dark-input"
                      placeholder="Instrucciones especiales"
                    />
                  </div>
                </div>
                
                {medications.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMedication(index)}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-300"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            
            <button
              type="button"
              onClick={addMedication}
              className="w-full py-2 border-2 border-dashed border-gray-600 text-gray-400 hover:border-cyan-400 hover:text-cyan-400 rounded-lg transition-colors"
            >
              + Agregar otro medicamento
            </button>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notas adicionales</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full dark-input"
              placeholder="Recomendaciones adicionales"
            />
          </div>

          {/* Firma digital */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Firma Digital</label>
            <div className="border border-gray-700 rounded-lg p-2 bg-gray-800/30">
              <canvas
                ref={canvasRef}
                width={300}
                height={100}
                className="w-full bg-gray-900 rounded cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <button
                type="button"
                onClick={clearSignature}
                className="mt-2 text-sm text-gray-400 hover:text-gray-300"
              >
                Limpiar firma
              </button>
            </div>
          </div>
        </div>

        {/* Columna derecha - Vista previa */}
        <div className="lg:sticky lg:top-4">
          <div className="dark-card p-6 print-friendly" id="prescription-preview">
            <div className="text-center mb-4 pb-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-gray-100 mb-2">RECETA MÉDICA</h2>
              <p className="text-sm text-gray-400">Dr. Juan Médico</p>
              <p className="text-xs text-gray-500">CED. PROF. 12345678</p>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <span className="text-gray-400">Paciente:</span>
                <span className="ml-2 text-gray-200">{patientName || 'Por seleccionar'}</span>
              </div>
              
              <div>
                <span className="text-gray-400">Fecha:</span>
                <span className="ml-2 text-gray-200">{format(new Date(), 'dd/MM/yyyy', { locale: es })}</span>
              </div>

              {diagnosis && (
                <div>
                  <span className="text-gray-400">Diagnóstico:</span>
                  <span className="ml-2 text-gray-200">{diagnosis}</span>
                </div>
              )}

              {medications.filter(m => m.name).length > 0 && (
                <div>
                  <h3 className="text-gray-300 font-medium mb-2">Medicamentos:</h3>
                  <div className="space-y-2">
                    {medications.filter(m => m.name).map((med, index) => (
                      <div key={index} className="pl-4 border-l-2 border-cyan-400">
                        <div className="font-medium text-gray-200">{med.name} - {med.dosage}</div>
                        <div className="text-gray-400 text-xs">
                          {med.frequency} por {med.duration}
                          {med.instructions && <span className="block">Instrucciones: {med.instructions}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {notes && (
                <div>
                  <h3 className="text-gray-300 font-medium mb-1">Notas:</h3>
                  <p className="text-gray-400 text-xs">{notes}</p>
                </div>
              )}

              <div className="flex justify-between items-end mt-6 pt-4 border-t border-gray-700">
                {signatureData && (
                  <div>
                    <img src={signatureData} alt="Firma" className="h-16" />
                    <p className="text-xs text-gray-500 mt-1">Firma del médico</p>
                  </div>
                )}
                
                {qrCodeUrl && (
                  <div className="text-center">
                    <img src={qrCodeUrl} alt="QR Code" className="h-20 w-20" />
                    <p className="text-xs text-gray-500 mt-1">Código de verificación</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="mt-4 flex space-x-3">
            <button
              onClick={handleSave}
              disabled={!patientId || !diagnosis || medications.filter(m => m.name).length === 0 || saveStatus === 'saving'}
              className={`flex-1 flex items-center justify-center ${
                !patientId || !diagnosis || medications.filter(m => m.name).length === 0 || saveStatus === 'saving'
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'dark-button-primary'
              }`}
              title={
                !patientId ? 'Seleccione un paciente' :
                !diagnosis ? 'Ingrese un diagnóstico' :
                medications.filter(m => m.name).length === 0 ? 'Agregue al menos un medicamento' :
                'Guardar receta'
              }
            >
              {saveStatus === 'saving' ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Guardar</>
              )}
            </button>
            
            <button
              onClick={handlePrint}
              disabled={!patientId || !diagnosis || medications.filter(m => m.name).length === 0}
              className={`flex-1 flex items-center justify-center ${
                !patientId || !diagnosis || medications.filter(m => m.name).length === 0
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'dark-button-secondary'
              }`}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </button>
          </div>

          {/* Indicadores de seguridad */}
          <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center">
              <Shield className="h-3 w-3 mr-1" />
              <span>Receta segura</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              <span>Verificable</span>
            </div>
            {isOffline ? (
              <div className="flex items-center text-yellow-500">
                <WifiOff className="h-3 w-3 mr-1" />
                <span>Offline</span>
              </div>
            ) : (
              <div className="flex items-center text-green-500">
                <Wifi className="h-3 w-3 mr-1" />
                <span>Online</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #prescription-preview, #prescription-preview * {
            visibility: visible;
          }
          #prescription-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 40px !important;
          }
          .dark-card {
            border: none !important;
            box-shadow: none !important;
          }
          .text-gray-100, .text-gray-200, .text-gray-300 {
            color: black !important;
          }
          .text-gray-400, .text-gray-500 {
            color: #666 !important;
          }
          .border-gray-700 {
            border-color: #ccc !important;
          }
          .bg-gray-800\\/30 {
            background: transparent !important;
          }
        }
      `}</style>
    </div>
  );
} 