import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, FileText, Search, User, Printer, Download, Eye, Clock, AlertTriangle,
  Activity, QrCode, Save, Shield, History, Wifi, WifiOff, CheckCircle, AlertCircle, Loader2,
  Palette, X
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import QRCode from 'qrcode';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getOrCreateTemplateForUser, saveTemplateForUser, type PrescriptionTemplateData } from '@/lib/prescriptionTemplates';
import { useDoctorRecipeProfile } from '@/features/prescriptions/hooks/useDoctorRecipeProfile';
import VisualPrescriptionEditor from '@/components/VisualPrescriptionEditor';
import VisualPrescriptionRenderer, { renderTemplateElement, TemplateElement } from '@/components/VisualPrescriptionRenderer';
import PrescriptionPrintService from '@/utils/prescriptionPrint';
import { usePrescriptions } from '@/features/prescriptions/hooks/usePrescriptions';
// ===== NUEVAS IMPORTACIONES PARA SISTEMA CENTRALIZADO =====
import { 
  validateMedication, 
  checkDrugInteractions, 
  calculatePrescriptionExpiry,
} from '@/lib/medicalConfig';
import { validateJSONBSchema } from '@/lib/validation';
import { useValidation } from '@/features/medical-records/hooks/useValidation';
import { SYSTEM_LIMITS } from '@/lib/medicalConfig';
import QuickLayoutSelector from '@/components/QuickLayoutSelector';
import HorizontalPrescriptionTemplates from '@/components/HorizontalPrescriptionTemplates';
import { 
  PrescriptionForm, 
  type PrescriptionFormMedication as Medication,
  type PrescriptionFormPatient as Patient
} from '@/features/prescriptions/components/PrescriptionForm';

interface Prescription {
  id: string;
  patient_id: string;
  patient_name?: string;
  medications: Medication[];
  diagnosis: string;
  notes: string;
  created_at: string;
  expires_at: string;
  status: 'active' | 'expired' | 'dispensed' | 'cancelled';
  doctor_signature?: string;
  visual_layout?: PrescriptionTemplateData;
  patients?: {
    full_name: string;
  };
}

export default function PrescriptionDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'new' | 'visual' | 'history' | 'layouts'>('dashboard');
  const {
    prescriptions: hookPrescriptions,
    refetchPrescriptions,
    getDefaultLayout,
    printSettings,
    createPrescription: createPrescriptionFromHook,
    convertHorizontalTemplate,
    setSelectedLayout,
  } = usePrescriptions({ autoLoad: true });
  const prescriptions = hookPrescriptions as Prescription[];
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'dispensed' | 'cancelled'>('all');
  const [filterDate, setFilterDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [prescriptionHistory, setPrescriptionHistory] = useState<Prescription[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [prescriptionTemplate, setPrescriptionTemplate] = useState<PrescriptionTemplateData | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  // Modal state for viewing prescription details
  const [viewingPrescription, setViewingPrescription] = useState<Prescription | null>(null);

  const { profile: dashboardDoctorProfile, toRenderData: toDoctorRenderData } = useDoctorRecipeProfile();

  const doctorProfileFallback = React.useMemo(() => {
    if (!dashboardDoctorProfile) return null;
    return {
      ...dashboardDoctorProfile,
      clinic: {
        name: dashboardDoctorProfile.clinic_name,
        address: dashboardDoctorProfile.clinic_address,
        phone: dashboardDoctorProfile.clinic_phone,
        email: dashboardDoctorProfile.clinic_email,
      },
    };
  }, [dashboardDoctorProfile]);

  useEffect(() => {
    refetchPrescriptions();
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
      // Error log removed for security;
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
      // Error log removed for security;
    }
  };

  const fetchPrescriptionTemplate = async () => {
    try {
      setIsLoadingTemplate(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tpl = await getOrCreateTemplateForUser(user.id);
      setPrescriptionTemplate(tpl);
    } catch (err: any) {
      // Error log removed for security;
      setError('No se pudo cargar la plantilla de receta.');
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  const handleSavePrescriptionTemplate = async (styleDefinition: PrescriptionTemplateData, newLogoFile?: File) => {
    try {
      setSaveStatus('saving');
      setSaveMessage('Guardando plantilla...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      let logoUrlToSave = prescriptionTemplate?.logo_url || null;

      if (newLogoFile) {
        const fileExt = newLogoFile.name.split('.').pop()?.toLowerCase() || 'png';
        const fileName = `prescription-logo.${fileExt}`;
        const { data: membership } = await supabase
          .from('clinic_user_relationships')
          .select('clinic_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        const clinicId = (membership as { clinic_id?: string } | null)?.clinic_id;
        const filePath = clinicId ? `${clinicId}/${fileName}` : `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('clinic-assets')
          .upload(filePath, newLogoFile, { cacheControl: '3600', upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('clinic-assets').getPublicUrl(filePath);
        logoUrlToSave = urlData.publicUrl;
      }

      const templateWithLogo = { ...styleDefinition, logo_url: logoUrlToSave ?? undefined };
      const normalized = await saveTemplateForUser(user.id, templateWithLogo);
      setPrescriptionTemplate(normalized);
      setSaveStatus('success');
      setSaveMessage('Plantilla guardada exitosamente.');
      setTimeout(() => setActiveTab('dashboard'), 1500);
    } catch (err: any) {
      // Error log removed for security;
      setSaveStatus('error');
      setSaveMessage('Error al guardar la plantilla.');
    }
  };

  // ===== NUEVA VALIDACIÃ“N ROBUSTA USANDO SISTEMA CENTRALIZADO =====
  const { validateCompleteForm, validateMedicationsField } = useValidation();

  const validatePrescriptionRobust = (prescriptionData: {
    patient_id: string;
    medications: Medication[];
    diagnosis: string;
    notes?: string;
    created_at: string;
    expires_at: string;
  }) => {
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
      // Warning log removed for security;
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
      // Error log removed for security;
      throw new Error('Error al verificar permisos.');
    }
      
    if (!profile || (profile.role !== 'doctor' && profile.role !== 'administrator')) {
      throw new Error('No tiene permisos para crear recetas');
    }
    return user.id; // Return user_id to be used as doctor_id
  };

  const handleNewPrescription = async (prescriptionData: {
    patient_id: string;
    medications: Medication[];
    diagnosis: string;
    notes?: string;
    created_at: string;
    expires_at: string;
  }) => {
    setSaveStatus('saving');
    setSaveMessage('Guardando receta...');
    setError(null);

    try {
      setIsLoading(true);
      await checkPermissions();
      validatePrescriptionRobust(prescriptionData);

      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('id', prescriptionData.patient_id)
        .single();
      if (patientError || !patient) {
        throw new Error('Paciente no encontrado o error al verificar paciente.');
      }

      const defaultLayout = getDefaultLayout();
      const consultationId = searchParams.get('consulta') ?? undefined;

      await createPrescriptionFromHook({
        patient_id: prescriptionData.patient_id,
        medications: prescriptionData.medications,
        diagnosis: prescriptionData.diagnosis,
        notes: prescriptionData.notes ?? undefined,
        status: 'active',
        layout_id: defaultLayout?.id,
        consultation_id: consultationId,
      });

      await refetchPrescriptions();
      setActiveTab('dashboard');
      setSaveStatus('success');
      setSaveMessage('Receta creada exitosamente');
    } catch (err: any) {
      setError(err.message || 'Error al crear la receta');
      setSaveStatus('error');
      setSaveMessage(err.message || 'Error al crear la receta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPrescription = (prescription: Prescription) => {
    setViewingPrescription(prescription);
  };

  const handlePrintPrescription = async (prescription: Prescription) => {
    try {
      type LayoutSource = { template_elements: unknown[]; canvas_settings: Record<string, unknown> };
      let layout: LayoutSource | null = getDefaultLayout() as unknown as LayoutSource | null;

      if (prescription.visual_layout) {
        const visualLayout = prescription.visual_layout;
        const cs = (visualLayout.canvas_settings || {}) as Record<string, unknown>;
        layout = {
          template_elements: (visualLayout.template_elements || []).map((el: Record<string, unknown>) => ({
            ...el,
            isLocked: (el.isLocked as boolean) ?? false
          })),
          canvas_settings: {
            backgroundColor: (cs.backgroundColor as string) ?? '#ffffff',
            backgroundImage: (cs.backgroundImage as string | null) ?? null,
            canvasSize: (cs.canvasSize as { width: number; height: number }) ?? { width: 794, height: 1123 },
            pageSize: (cs.pageSize as string) ?? 'A4',
            margin: (cs.margin as string) ?? '20mm',
            showGrid: (cs.showGrid as boolean) ?? false,
            zoom: (cs.zoom as number) ?? 1
          }
        };
      }

      // Fallback to predefined template if none found or empty
      if (!layout || !layout.template_elements?.length) {
        const { data: { user } } = await supabase.auth.getUser();
        const fallbackTemplate = user ? await getOrCreateTemplateForUser(user.id) : null;
        if (fallbackTemplate?.template_elements?.length) {
          const cs = (fallbackTemplate.canvas_settings || {}) as Record<string, unknown>;
          layout = {
            template_elements: (fallbackTemplate.template_elements || []).map((el: Record<string, unknown>) => ({
              ...el,
              isLocked: (el.isLocked as boolean) ?? false
            })),
            canvas_settings: {
              backgroundColor: (cs.backgroundColor as string) ?? '#ffffff',
              backgroundImage: (cs.backgroundImage as string | null) ?? null,
              canvasSize: (cs.canvasSize as { width: number; height: number }) ?? { width: 794, height: 1123 },
              pageSize: (cs.pageSize as string) ?? 'A4',
              margin: (cs.margin as string) ?? '20mm',
              showGrid: (cs.showGrid as boolean) ?? false,
              zoom: (cs.zoom as number) ?? 1
            }
          };
        } else {
          layout = {
            template_elements: [{
              id: 'fallback-header',
              type: 'text',
              position: { x: 50, y: 50 },
              size: { width: 694, height: 60 },
              content: '{{clinicName}}',
              style: { fontSize: 24, fontFamily: 'Arial', color: '#1f2937', fontWeight: 'bold', textAlign: 'center' },
              zIndex: 1,
              isVisible: true,
              isLocked: false
            }, {
              id: 'fallback-doctor',
              type: 'text',
              position: { x: 50, y: 120 },
              size: { width: 400, height: 40 },
              content: 'Dr. {{doctorName}} - Cédula: {{doctorLicense}}',
              style: { fontSize: 14, fontFamily: 'Arial', color: '#374151' },
              zIndex: 1,
              isVisible: true,
              isLocked: false
            }, {
              id: 'fallback-patient',
              type: 'text',
              position: { x: 50, y: 180 },
              size: { width: 694, height: 300 },
              content: 'Paciente: {{patientName}}\nDiagnóstico: {{diagnosis}}\n\n{{medications}}',
              style: { fontSize: 12, fontFamily: 'Arial', color: '#1f2937', lineHeight: 1.8 },
              zIndex: 1,
              isVisible: true,
              isLocked: false
            }],
            canvas_settings: {
              backgroundColor: '#ffffff',
              backgroundImage: null,
              canvasSize: { width: 794, height: 1123 },
              pageSize: 'A4',
              margin: '20mm',
              showGrid: false,
              zoom: 1
            }
          };
        }
      }

      // Ensure layout satisfies PrintLayout (full canvas_settings + isLocked on elements)
      const layoutCs = (layout?.canvas_settings || {}) as Record<string, unknown>;
      const printLayout = {
        template_elements: (layout?.template_elements || []).map((el: Record<string, unknown>) => ({
          ...el,
          isLocked: (el.isLocked as boolean) ?? false
        })),
        canvas_settings: {
          backgroundColor: (layoutCs.backgroundColor as string) ?? '#ffffff',
          backgroundImage: (layoutCs.backgroundImage as string | null) ?? null,
          canvasSize: (layoutCs.canvasSize as { width: number; height: number }) ?? { width: 794, height: 1123 },
          pageSize: (layoutCs.pageSize as string) ?? 'A4',
          margin: (layoutCs.margin as string) ?? '20mm',
          showGrid: (layoutCs.showGrid as boolean) ?? false,
          zoom: (layoutCs.zoom as number) ?? 1
        }
      };

      const doctorData = toDoctorRenderData();
      const prescriptionData = {
        patientName: prescription.patient_name || prescription.patients?.full_name,
        doctorName: doctorData.doctorName ?? dashboardDoctorProfile?.full_name ?? 'Dr.',
        doctorLicense: doctorData.doctorLicense ?? dashboardDoctorProfile?.medical_license ?? '',
        doctorSpecialty: doctorData.doctorSpecialty ?? dashboardDoctorProfile?.specialty ?? '',
        clinicName: doctorData.clinicName ?? dashboardDoctorProfile?.clinic_name ?? '',
        clinicAddress: doctorData.clinicAddress ?? dashboardDoctorProfile?.clinic_address ?? '',
        clinicPhone: doctorData.clinicPhone ?? dashboardDoctorProfile?.clinic_phone ?? '',
        clinicEmail: doctorData.clinicEmail ?? dashboardDoctorProfile?.clinic_email ?? '',
        diagnosis: prescription.diagnosis,
        medications: prescription.medications,
        notes: prescription.notes,
        date: format(new Date(prescription.created_at), 'dd/MM/yyyy', { locale: es }),
        patientAge: '',
        patientWeight: '',
        followUpDate: prescription.expires_at ? format(new Date(prescription.expires_at), 'dd/MM/yyyy') : '',
        prescriptionId: prescription.id
      };

      const printOptions: import('@/utils/prescriptionPrint').PrintOptions = printSettings ? {
        pageSize: (printSettings.page_size ?? printSettings.paperSize) as 'A4' | 'Letter' | 'Legal',
        orientation: (printSettings.page_orientation ?? printSettings.orientation) as 'portrait' | 'landscape',
        margins: (printSettings.page_margins ?? printSettings.pageMargins ?? printSettings.margins) as { top: string; right: string; bottom: string; left: string } | undefined,
        quality: (printSettings.print_quality ?? printSettings.printQuality) as 'draft' | 'normal' | 'high',
        colorMode: (printSettings.color_mode ?? printSettings.colorMode) as 'color' | 'grayscale' | 'blackwhite',
        scaleFactor: printSettings.scale_factor ?? printSettings.scaleFactor ?? 1,
        includeQRCode: printSettings.include_qr_code ?? printSettings.includeQrCode ?? true,
        includeDigitalSignature: printSettings.include_digital_signature ?? printSettings.includeDigitalSignature ?? true,
        watermarkText: printSettings.watermark_text ?? printSettings.watermarkText
      } : {};

      await PrescriptionPrintService.printPrescription(
        printLayout as import('@/utils/prescriptionPrint').PrintLayout,
        prescriptionData,
        printOptions
      );

    } catch (error) {
      console.error('Error printing prescription:', error);
      alert('Error al imprimir la receta. Por favor intente nuevamente.');
    }
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
        nombre: dashboardDoctorProfile?.full_name || 'Dr.',
        cedula: dashboardDoctorProfile?.medical_license || '',
        especialidad: dashboardDoctorProfile?.specialty || ''
      }
    };
    
    const dataStr = JSON.stringify(prescriptionData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `receta_${prescription.patient_name?.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
    
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

  // Calcular estadÃ­sticas
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
            <button
              onClick={() => setActiveTab('layouts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'layouts'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Palette className="h-5 w-5 mr-2" />
              Plantillas
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
              Ã—
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
            {/* EstadÃ­sticas */}
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
                      Tienes {stats.expiringSoon} receta(s) que vencerÃ¡n en los prÃ³ximos 7 dÃ­as.
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
                            DiagnÃ³stico
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
          <PrescriptionForm
            patientId={selectedPatientId}
            patientName={selectedPatientName}
            onSave={handleNewPrescription}
            previousPrescriptions={prescriptionHistory}
            patients={patients}
            onPatientChange={setSelectedPatientId}
            saveStatus={saveStatus}
            saveMessage={saveMessage}
            visualTemplate={prescriptionTemplate}
            onOpenVisualEditor={() => setActiveTab('visual')}
            doctorProfileFallback={doctorProfileFallback}
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
                  patientName={selectedPatientName || 'Vista Previa'}
                  onSave={handleSavePrescriptionTemplate}
                  onClose={() => setActiveTab('dashboard')}
                  existingTemplate={prescriptionTemplate}
                  initialData={{
                    patientName: selectedPatientName || 'Vista Previa',
                    doctorName: doctorProfileFallback?.full_name || 'Dr.',
                    doctorLicense: doctorProfileFallback?.medical_license || '',
                    doctorSpecialty: doctorProfileFallback?.specialty,
                    clinicName: doctorProfileFallback?.clinic_name || doctorProfileFallback?.clinic?.name || '',
                    clinicAddress: doctorProfileFallback?.clinic_address || doctorProfileFallback?.clinic?.address,
                    clinicPhone: doctorProfileFallback?.clinic_phone || doctorProfileFallback?.clinic?.phone,
                    clinicEmail: doctorProfileFallback?.clinic_email || doctorProfileFallback?.clinic?.email,
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* Plantillas y Layouts */}
        {activeTab === 'layouts' && !isLoading && (
          <div className="space-y-6">
            <div className="dark-card">
              <div className="px-4 py-5 sm:p-6">
                <QuickLayoutSelector
                  onLayoutSelect={(option, template) => {
                    if (template) {
                      const unifiedLayout = convertHorizontalTemplate(template);
                      setSelectedLayout(unifiedLayout);
                    }
                    setActiveTab('new');
                  }}
                  onOpenAdvancedEditor={() => setActiveTab('visual')}
                  className="text-white"
                />
              </div>
            </div>
            
            <div className="dark-card">
              <div className="px-4 py-5 sm:p-6">
                <HorizontalPrescriptionTemplates
                  onTemplateSelect={(template) => {
                    const unifiedLayout = convertHorizontalTemplate(template);
                    setSelectedLayout(unifiedLayout);
                    setActiveTab('new');
                  }}
                  showPreview={true}
                  className="text-white"
                />
              </div>
            </div>
          </div>
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
                          DiagnÃ³stico
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Medicamentos
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Fecha EmisiÃ³n
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

      {/* Modal de detalle de prescripciÃ³n */}
      {viewingPrescription && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setViewingPrescription(null)}>
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-gray-100">Detalle de Receta</h2>
              <button onClick={() => setViewingPrescription(null)} className="text-gray-400 hover:text-gray-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-400">Paciente</p>
                  <p className="text-lg text-gray-100 font-medium">{viewingPrescription.patient_name || viewingPrescription.patients?.full_name || 'Sin nombre'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  viewingPrescription.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                  viewingPrescription.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {viewingPrescription.status === 'active' ? 'Activa' : viewingPrescription.status === 'cancelled' ? 'Cancelada' : viewingPrescription.status}
                </span>
              </div>

              {viewingPrescription.diagnosis && (
                <div>
                  <p className="text-sm text-gray-400">DiagnÃ³stico</p>
                  <p className="text-gray-200">{viewingPrescription.diagnosis}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-400 mb-2">Medicamentos</p>
                <div className="space-y-3">
                  {(viewingPrescription.medications || []).map((med: any, idx: number) => (
                    <div key={idx} className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                      <p className="text-gray-100 font-medium">{med.name} <span className="text-cyan-400">{med.dosage}</span></p>
                      <p className="text-sm text-gray-400">
                        {med.frequency} {med.duration ? `por ${med.duration}` : ''}
                      </p>
                      {med.instructions && (
                        <p className="text-sm text-gray-500 mt-1">ðŸ“‹ {med.instructions}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {viewingPrescription.notes && (
                <div>
                  <p className="text-sm text-gray-400">Notas</p>
                  <p className="text-gray-300">{viewingPrescription.notes}</p>
                </div>
              )}

              <div className="flex justify-between text-sm text-gray-400 pt-2 border-t border-gray-700">
                <span>Creada: {format(new Date(viewingPrescription.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
                {viewingPrescription.expires_at && (
                  <span>Vence: {format(new Date(viewingPrescription.expires_at), 'dd/MM/yyyy')}</span>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-700">
              <button
                onClick={() => { handlePrintPrescription(viewingPrescription); setViewingPrescription(null); }}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
              <button
                onClick={() => setViewingPrescription(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

