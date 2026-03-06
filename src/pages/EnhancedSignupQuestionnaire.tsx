import { Clinic, EnhancedRegistrationData, MedicalSpecialty } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  Building,
  Calendar,
  CheckCircle,
  Heart,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Shield,
  Stethoscope,
  User,
  UserCheck,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function EnhancedSignupQuestionnaire() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRetryCleanup, setShowRetryCleanup] = useState(false);

  // Constantes para fecha de nacimiento
  const months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  // Data states
  const [specialties, setSpecialties] = useState<MedicalSpecialty[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [filteredSpecialties, setFilteredSpecialties] = useState<MedicalSpecialty[]>([]);
  const [filteredClinics, setFilteredClinics] = useState<Clinic[]>([]);
  const [specialtySearch, setSpecialtySearch] = useState('');
  const [clinicSearch, setClinicSearch] = useState('');
  const [isSpecialtyDropdownOpen, setIsSpecialtyDropdownOpen] = useState(false);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(false);
  const [useBackupSpecialties, setUseBackupSpecialties] = useState(false);
  // Eliminado emailCheckLoading y emailExists - ya se verifica en Auth.tsx

  // Estado para validación en tiempo real
  const [fieldValidation, setFieldValidation] = useState<{
    [key: string]: { isValid: boolean; message: string }
  }>({});

  // Obtener email del estado de navegación o sessionStorage
  const initialEmail = location.state?.email || '';
  const fromRegistration = location.state?.fromRegistration || false;
  const fromOAuth = location.state?.fromOAuth || false;
  const oauthData = location.state?.oauthData || null;

  // Recuperar datos pendientes de sessionStorage
  const pendingRegistration = sessionStorage.getItem('pendingRegistration');
  const pendingData = pendingRegistration ? JSON.parse(pendingRegistration) : null;

  // Recuperar datos de OAuth si existen
  const oauthRegistration = sessionStorage.getItem('oauthRegistration');
  const oauthSessionData = oauthRegistration ? JSON.parse(oauthRegistration) : null;

  const [formData, setFormData] = useState<EnhancedRegistrationData>({
    personalInfo: {
      fullName: oauthData?.fullName || oauthSessionData?.fullName || '',
      email: initialEmail || pendingData?.email || oauthSessionData?.email || '',
      phone: '',
      birthDate: '',
      gender: '',
      address: '',
    },
    accountInfo: {
      role: 'doctor',
      password: pendingData?.password || '',
      confirmPassword: pendingData?.password || '',
    },
    professionalInfo: {
      licenseNumber: '',
      specialtyId: '',
      experience: '',
      institution: '',
      employeeId: '',
    },
    clinicInfo: {
      clinicId: '',
      isNewClinic: false,
      clinicData: {
        name: '',
        type: 'clinic',
        address: '',
        phone: '',
        email: '',
      },
    },
    patientInfo: {
      primaryDoctorId: '',
      insuranceInfo: {},
      emergencyContact: {},
    },
    additionalInfo: {
      workSchedule: '',
      preferences: {},
      notes: '',
    },
  });

  // Funciones auxiliares para fecha de nacimiento
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear - 100; year <= currentYear - 18; year++) {
      years.push(year);
    }
    return years.reverse();
  };

  const generateDayOptions = () => {
    const selectedMonth = getBirthDatePart('month');
    const selectedYear = getBirthDatePart('year');

    if (!selectedMonth || !selectedYear) {
      return Array.from({ length: 31 }, (_, i) => i + 1);
    }

    const month = parseInt(selectedMonth) - 1;
    const year = parseInt(selectedYear);

    // Obtener el último día del mes
    const lastDay = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: lastDay }, (_, i) => i + 1);
  };

  const getBirthDatePart = (part: 'day' | 'month' | 'year') => {
    if (!formData.personalInfo.birthDate) return '';

    const date = new Date(formData.personalInfo.birthDate);
    if (isNaN(date.getTime())) return '';

    switch (part) {
      case 'day':
        return date.getDate().toString().padStart(2, '0');
      case 'month':
        return (date.getMonth() + 1).toString().padStart(2, '0');
      case 'year':
        return date.getFullYear().toString();
      default:
        return '';
    }
  };

  const updateBirthDate = (part: 'day' | 'month' | 'year', value: string) => {
    const currentDate = formData.personalInfo.birthDate
      ? new Date(formData.personalInfo.birthDate)
      : new Date();

    if (isNaN(currentDate.getTime())) {
      currentDate.setFullYear(new Date().getFullYear() - 25); // Año por defecto
    }

    switch (part) {
      case 'day':
        currentDate.setDate(parseInt(value) || 1);
        break;
      case 'month':
        currentDate.setMonth(parseInt(value) - 1 || 0);
        // Al cambiar mes, ajustar día si es necesario
        const maxDays = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0
        ).getDate();
        if (currentDate.getDate() > maxDays) {
          currentDate.setDate(maxDays);
        }
        break;
      case 'year':
        currentDate.setFullYear(parseInt(value) || new Date().getFullYear() - 25);
        // Al cambiar año, verificar si es año bisiesto para febrero
        if (currentDate.getMonth() === 1) {
          // Febrero
          const maxDays = new Date(currentDate.getFullYear(), 2, 0).getDate();
          if (currentDate.getDate() > maxDays) {
            currentDate.setDate(maxDays);
          }
        }
        break;
    }

    const newDateString = currentDate.toISOString().split('T')[0];
    updateFormData('personalInfo', 'birthDate', newDateString);
    
    // Validar fecha en tiempo real
    handleFieldValidation('birthDate', newDateString);
  };

  const formatBirthDateForDisplay = (dateString: string) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day} de ${month} de ${year}`;
  };

  const isValidAge = (dateString: string) => {
    if (!dateString) return false;

    const birthDate = new Date(dateString);
    if (isNaN(birthDate.getTime())) return false;

    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18;
    }

    return age >= 18;
  };

  const getStep1Progress = () => {
    let completed = 0;
    const total = 4;

    if (formData.personalInfo.fullName.trim()) completed++;
    if (formData.personalInfo.email.trim()) completed++;
    if (formData.personalInfo.phone.trim()) completed++;
    if (formData.personalInfo.birthDate && isValidAge(formData.personalInfo.birthDate)) completed++;

    return Math.round((completed / total) * 100);
  };

  const loadInitialData = useCallback(async () => {
    // Especialidades de respaldo ampliadas en caso de que la BD no esté disponible
    // USANDO UUIDs VÁLIDOS PARA EVITAR ERRORES DE BASE DE DATOS
    const backupSpecialties: MedicalSpecialty[] = [
      // MÉDICAS
      {
        id: '688ae40b-3d31-4e49-89d4-cc4f4f4e1293', // UUID válido de tu BD
        name: 'Medicina General',
        category: 'medical',
        description: 'Atención médica integral y preventiva',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'b2c3d4e5-f6g7-8901-bcde-f12345678901',
        name: 'Cardiología',
        category: 'medical',
        description: 'Enfermedades cardiovasculares y del corazón',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'c3d4e5f6-g7h8-9012-cdef-123456789012',
        name: 'Pediatría',
        category: 'medical',
        description: 'Medicina pediátrica integral (0-18 años)',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'd4e5f6g7-h8i9-0123-def1-234567890123',
        name: 'Neurología',
        category: 'medical',
        description: 'Enfermedades del sistema nervioso central y periférico',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'e5f6g7h8-i9j0-1234-ef12-345678901234',
        name: 'Dermatología',
        category: 'medical',
        description: 'Enfermedades de la piel, pelo y uñas',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'f6g7h8i9-j0k1-2345-f123-456789012345',
        name: 'Medicina Interna',
        category: 'medical',
        description: 'Medicina interna de adultos',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'g7h8i9j0-k1l2-3456-1234-567890123456',
        name: 'Endocrinología',
        category: 'medical',
        description: 'Enfermedades endocrinas y metabólicas',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'h8i9j0k1-l2m3-4567-2345-678901234567',
        name: 'Gastroenterología',
        category: 'medical',
        description: 'Enfermedades digestivas',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'i9j0k1l2-m3n4-5678-3456-789012345678',
        name: 'Neumología',
        category: 'medical',
        description: 'Enfermedades respiratorias',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'j0k1l2m3-n4o5-6789-4567-890123456789',
        name: 'Reumatología',
        category: 'medical',
        description: 'Enfermedades reumáticas y autoinmunes',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'k1l2m3n4-o5p6-7890-5678-901234567890',
        name: 'Oncología',
        category: 'medical',
        description: 'Tratamiento del cáncer',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'l2m3n4o5-p6q7-8901-6789-012345678901',
        name: 'Psiquiatría',
        category: 'medical',
        description: 'Salud mental y trastornos psiquiátricos',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'm3n4o5p6-q7r8-9012-7890-123456789012',
        name: 'Anestesiología',
        category: 'medical',
        description: 'Medicina perioperatoria y anestesia',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'n4o5p6q7-r8s9-0123-8901-234567890123',
        name: 'Medicina de Urgencias',
        category: 'medical',
        description: 'Medicina de emergencias y urgencias',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'o5p6q7r8-s9t0-1234-9012-345678901234',
        name: 'Alergología e Inmunología',
        category: 'medical',
        description: 'Alergias e inmunodeficiencias',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'p6q7r8s9-t0u1-2345-0123-456789012345',
        name: 'Hematología',
        category: 'medical',
        description: 'Enfermedades de la sangre',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'q7r8s9t0-u1v2-3456-1234-567890123456',
        name: 'Infectología',
        category: 'medical',
        description: 'Enfermedades infecciosas',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'r8s9t0u1-v2w3-4567-2345-678901234567',
        name: 'Medicina del Deporte',
        category: 'medical',
        description: 'Medicina deportiva y ejercicio',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 's9t0u1v2-w3x4-5678-3456-789012345678',
        name: 'Medicina Familiar',
        category: 'medical',
        description: 'Atención integral familiar',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 't0u1v2w3-x4y5-6789-4567-890123456789',
        name: 'Genética Médica',
        category: 'medical',
        description: 'Enfermedades genéticas',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },

      // QUIRÚRGICAS
      {
        id: 'u1v2w3x4-y5z6-7890-5678-901234567890',
        name: 'Cirugía General',
        category: 'surgical',
        description: 'Cirugía general y abdominal',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'v2w3x4y5-z6a7-8901-6789-012345678901',
        name: 'Ginecología y Obstetricia',
        category: 'surgical',
        description: 'Salud femenina y reproductiva',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'w3x4y5z6-a7b8-9012-7890-123456789012',
        name: 'Ortopedia y Traumatología',
        category: 'surgical',
        description: 'Cirugía de huesos y articulaciones',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'x4y5z6a7-b8c9-0123-8901-234567890123',
        name: 'Oftalmología',
        category: 'surgical',
        description: 'Cirugía ocular y oftalmológica',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'y5z6a7b8-c9d0-1234-9012-345678901234',
        name: 'Urología',
        category: 'surgical',
        description: 'Cirugía urológica',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'z6a7b8c9-d0e1-2345-0123-456789012345',
        name: 'Neurocirugía',
        category: 'surgical',
        description: 'Cirugía del sistema nervioso',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'a7b8c9d0-e1f2-3456-1234-567890123456',
        name: 'Cirugía Cardiovascular',
        category: 'surgical',
        description: 'Cirugía del corazón',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'b8c9d0e1-f2g3-4567-2345-678901234567',
        name: 'Cirugía Torácica',
        category: 'surgical',
        description: 'Cirugía del tórax',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'c9d0e1f2-g3h4-5678-3456-789012345678',
        name: 'Cirugía Plástica',
        category: 'surgical',
        description: 'Cirugía estética y reconstructiva',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'd0e1f2g3-h4i5-6789-4567-890123456789',
        name: 'Otorrinolaringología',
        category: 'surgical',
        description: 'Cirugía de oído, nariz y garganta',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },

      // DIAGNÓSTICAS
      {
        id: 'e1f2g3h4-i5j6-7890-5678-901234567890',
        name: 'Radiología',
        category: 'diagnostic',
        description: 'Diagnóstico por imágenes',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'f2g3h4i5-j6k7-8901-6789-012345678901',
        name: 'Patología',
        category: 'diagnostic',
        description: 'Diagnóstico anatomopatológico',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'g3h4i5j6-k7l8-9012-7890-123456789012',
        name: 'Medicina Nuclear',
        category: 'diagnostic',
        description: 'Diagnóstico y tratamiento nuclear',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'h4i5j6k7-l8m9-0123-8901-234567890123',
        name: 'Laboratorio Clínico',
        category: 'diagnostic',
        description: 'Análisis clínicos',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'i5j6k7l8-m9n0-1234-9012-345678901234',
        name: 'Radiología Intervencionista',
        category: 'diagnostic',
        description: 'Procedimientos radiológicos',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },

      // TERAPIAS
      {
        id: 'j6k7l8m9-n0o1-2345-0123-456789012345',
        name: 'Fisioterapia',
        category: 'therapy',
        description: 'Terapia física y rehabilitación',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'k7l8m9n0-o1p2-3456-1234-567890123456',
        name: 'Terapia Respiratoria',
        category: 'therapy',
        description: 'Terapia respiratoria',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'l8m9n0o1-p2q3-4567-2345-678901234567',
        name: 'Psicología Clínica',
        category: 'therapy',
        description: 'Terapia psicológica',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'm9n0o1p2-q3r4-5678-3456-789012345678',
        name: 'Nutrición Clínica',
        category: 'therapy',
        description: 'Terapia nutricional',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'n0o1p2q3-r4s5-6789-4567-890123456789',
        name: 'Terapia Ocupacional',
        category: 'therapy',
        description: 'Terapia ocupacional',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },

      // ENFERMERÍA
      {
        id: 'o1p2q3r4-s5t6-7890-5678-901234567890',
        name: 'Enfermería General',
        category: 'nursing',
        description: 'Cuidados de enfermería general',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'p2q3r4s5-t6u7-8901-6789-012345678901',
        name: 'Enfermería Especializada',
        category: 'nursing',
        description: 'Cuidados especializados',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'q3r4s5t6-u7v8-9012-7890-123456789012',
        name: 'Enfermería de Urgencias',
        category: 'nursing',
        description: 'Cuidados en emergencias',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'r4s5t6u7-v8w9-0123-8901-234567890123',
        name: 'Enfermería Quirúrgica',
        category: 'nursing',
        description: 'Cuidados perioperatorios',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 's5t6u7v8-w9x0-1234-9012-345678901234',
        name: 'Enfermería Oncológica',
        category: 'nursing',
        description: 'Cuidados oncológicos',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },

      // ODONTOLOGÍA
      {
        id: 't6u7v8w9-x0y1-2345-0123-456789012345',
        name: 'Odontología General',
        category: 'medical',
        description: 'Atención dental general',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'u7v8w9x0-y1z2-3456-1234-567890123456',
        name: 'Ortodoncia',
        category: 'medical',
        description: 'Corrección dental',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'v8w9x0y1-z2a3-4567-2345-678901234567',
        name: 'Endodoncia',
        category: 'medical',
        description: 'Tratamiento de conductos',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'w9x0y1z2-a3b4-5678-3456-789012345678',
        name: 'Periodoncia',
        category: 'medical',
        description: 'Tratamiento de encías',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'x0y1z2a3-b4c5-6789-4567-890123456789',
        name: 'Cirugía Oral',
        category: 'surgical',
        description: 'Cirugía oral y maxilofacial',
        requires_license: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },

      // ADMINISTRACIÓN
      {
        id: 'y1z2a3b4-c5d6-7890-5678-901234567890',
        name: 'Administración Hospitalaria',
        category: 'administration',
        description: 'Gestión hospitalaria',
        requires_license: false,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'z2a3b4c5-d6e7-8901-6789-012345678901',
        name: 'Gestión de Calidad',
        category: 'administration',
        description: 'Control de calidad médica',
        requires_license: false,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'a3b4c5d6-e7f8-9012-7890-123456789012',
        name: 'Facturación Médica',
        category: 'administration',
        description: 'Facturación y seguros',
        requires_license: false,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'b4c5d6e7-f8g9-0123-8901-234567890123',
        name: 'Gestión de Riesgos Sanitarios',
        category: 'administration',
        description: 'Gestión de riesgos en salud',
        requires_license: false,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'c5d6e7f8-g9h0-1234-9012-345678901234',
        name: 'Gestión de Tecnología Sanitaria',
        category: 'administration',
        description: 'Tecnología médica',
        requires_license: false,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ];

    setSpecialtiesLoading(true);
    try {
      // Load medical specialties
      // Sensitive log removed for security;
      const { data: specialtiesData, error: specialtiesError } = await supabase
        .from('medical_specialties')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (specialtiesError) {
        // Error log removed for security;
        // Sensitive log removed for security;
        setSpecialties(backupSpecialties);
        setUseBackupSpecialties(true);
      } else if (!specialtiesData || specialtiesData.length === 0) {
        // Sensitive log removed for security;
        setSpecialties(backupSpecialties);
        setUseBackupSpecialties(true);
      } else {
        // Sensitive log removed for security;
        console.log(
          '📋 Lista de especialidades:',
          specialtiesData.map(s => s.name)
        );

        // Combinar especialidades de BD con las de respaldo para mayor cobertura
        const combinedSpecialties = [...specialtiesData];

        // Agregar especialidades de respaldo que no estén en BD
        backupSpecialties.forEach(backupSpec => {
          const exists = combinedSpecialties.some(
            dbSpec => dbSpec.name.toLowerCase() === backupSpec.name.toLowerCase()
          );
          if (!exists) {
            combinedSpecialties.push(backupSpec);
          }
        });

        // Ordenar por nombre
        combinedSpecialties.sort((a, b) => a.name.localeCompare(b.name));

        // Sensitive log removed for security;
        setSpecialties(combinedSpecialties);
        setUseBackupSpecialties(false);
      }

      // Load existing clinics
      const { data: clinicsData, error: clinicsError } = await supabase
        .from('clinics')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (clinicsError) {
        // Error log removed for security;
      } else {
        setClinics(clinicsData || []);
      }
    } catch (err) {
      // Error log removed for security;
      // Sensitive log removed for security;
      // TODO: Corregir UUIDs en backupSpecialties
      // setSpecialties(backupSpecialties);
      // setUseBackupSpecialties(true);
      setError('Error cargando especialidades. Por favor, verifica tu conexión.');
    } finally {
      setSpecialtiesLoading(false);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    // Sensitive log removed for security;
    // Sensitive log removed for security;
    // Sensitive log removed for security;
    loadInitialData();
  }, [loadInitialData, initialEmail, fromRegistration]);

  // Filter specialties when search changes
  useEffect(() => {
    console.log(
      '🔍 Filtrando especialidades. Búsqueda:',
      specialtySearch,
      'Total disponibles:',
      specialties.length
    );
    if (specialtySearch.trim() === '') {
      setFilteredSpecialties(specialties);
      // Sensitive log removed for security;
    } else {
      const filtered = specialties.filter(
        specialty =>
          specialty.name.toLowerCase().includes(specialtySearch.toLowerCase()) ||
          specialty.category.toLowerCase().includes(specialtySearch.toLowerCase())
      );
      setFilteredSpecialties(filtered);
      console.log(
        '🔎 Especialidades filtradas:',
        filtered.length,
        'para búsqueda:',
        specialtySearch
      );
    }
  }, [specialtySearch, specialties]);

  // Filter clinics when search changes
  useEffect(() => {
    if (clinicSearch.trim() === '') {
      setFilteredClinics(clinics);
    } else {
      setFilteredClinics(
        clinics.filter(
          clinic =>
            clinic.name.toLowerCase().includes(clinicSearch.toLowerCase()) ||
            clinic.type.toLowerCase().includes(clinicSearch.toLowerCase())
        )
      );
    }
  }, [clinicSearch, clinics]);

  // Función checkEmailExists eliminada - la verificación se hace en Auth.tsx

  // useEffects de verificación de email eliminados - ya se verifica en Auth.tsx
  useEffect(() => {
    if (initialEmail && fromRegistration) {
      // Sensitive log removed for security;
      // Sensitive log removed for security;
    }
  }, [initialEmail, fromRegistration]);

  const updateFormData = <K extends keyof EnhancedRegistrationData>(
    section: K,
    field: keyof EnhancedRegistrationData[K],
    value: string | boolean | Record<string, unknown> | undefined
  ) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
    setError(null);
    setShowRetryCleanup(false);
  };

  const handleRetryCleanup = async () => {
    try {
      setLoading(true);
      setError(null);
      // Sensitive log removed for security;

      const email = formData.personalInfo.email;
      if (!email) {
        setError('No se encontró el email para limpiar');
        return;
      }

      // Intentar eliminar perfiles incompletos
      const { error: cleanupError } = await supabase
        .from('profiles')
        .delete()
        .eq('email', email.toLowerCase().trim())
        .or('profile_completed.is.null,profile_completed.eq.false,full_name.is.null,full_name.eq.');

      if (cleanupError) {
        // Error log removed for security;
        setError('Error al limpiar registros previos. Por favor, contacta a soporte.');
        return;
      }

      // Sensitive log removed for security;
      setError('Limpieza completada. Puedes intentar completar el registro nuevamente.');
      setShowRetryCleanup(false);
    } catch (err) {
      // Error log removed for security;
      setError('Error inesperado durante la limpieza');
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Información personal
        if (!formData.personalInfo.fullName.trim()) {
          setError('El nombre completo es requerido');
          return false;
        }
        if (!formData.personalInfo.email.trim()) {
          setError('El correo electrónico es requerido');
          return false;
        }
        // Email ya verificado en Auth.tsx - no necesitamos verificar aquí
        if (!formData.personalInfo.phone.trim()) {
          setError('El teléfono es requerido');
          return false;
        }
        if (!formData.personalInfo.birthDate) {
          setError('La fecha de nacimiento es requerida');
          return false;
        }
        if (!isValidAge(formData.personalInfo.birthDate)) {
          setError('Debes ser mayor de 18 años para registrarte');
          return false;
        }
        return true;

      case 2: // Selección de rol
        if (!formData.accountInfo.role) {
          setError('Debe seleccionar un tipo de cuenta');
          return false;
        }
        // Validar que el rol seleccionado esté habilitado
        {
          const selectedRole = roleOptions.find(role => role.value === formData.accountInfo.role);
          if (!selectedRole?.enabled) {
            setError('El tipo de cuenta seleccionado no está disponible actualmente');
            return false;
          }
        }
        return true;

      case 3: // Información profesional
        if (formData.accountInfo.role !== 'patient') {
          if (!formData.professionalInfo?.licenseNumber?.trim()) {
            setError('La cédula/licencia profesional es requerida');
            return false;
          }
          if (formData.accountInfo.role === 'doctor' && !formData.professionalInfo?.specialtyId) {
            setError('La especialidad es requerida para doctores');
            return false;
          }
        }
        return true;

      case 4: // Información de clínica
        if (formData.accountInfo.role !== 'patient') {
          if (formData.clinicInfo?.isNewClinic) {
            if (!formData.clinicInfo.clinicData?.name?.trim()) {
              setError('El nombre de la clínica es requerido');
              return false;
            }
          } else {
            if (!formData.clinicInfo?.clinicId) {
              setError('Debe seleccionar una clínica existente o crear una nueva');
              return false;
            }
          }
        }
        return true;

      case 5: // Información adicional (opcional)
        return true;

      default:
        return true;
    }
  };

  // Funciones de validación en tiempo real
  const validateField = (fieldName: string, value: string, fieldType?: string): { isValid: boolean; message: string } => {
    switch (fieldName) {
      case 'fullName':
        if (!value.trim()) return { isValid: false, message: 'El nombre es requerido' };
        if (value.trim().length < 2) return { isValid: false, message: 'Nombre muy corto' };
        if (!/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/.test(value)) return { isValid: false, message: 'Solo letras y espacios' };
        return { isValid: true, message: 'Nombre válido' };

      case 'email':
        if (!value.trim()) return { isValid: false, message: 'El email es requerido' };
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return { isValid: false, message: 'Formato de email inválido' };
        return { isValid: true, message: 'Email válido' };

      case 'phone':
        if (!value.trim()) return { isValid: false, message: 'El teléfono es requerido' };
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) return { isValid: false, message: 'Formato de teléfono inválido' };
        return { isValid: true, message: 'Teléfono válido' };

      case 'birthDate':
        if (!value) return { isValid: false, message: 'La fecha es requerida' };
        if (!isValidAge(value)) return { isValid: false, message: 'Debe ser mayor de 18 años' };
        return { isValid: true, message: 'Fecha válida' };

      case 'licenseNumber':
        if (!value.trim()) return { isValid: false, message: 'La cédula es requerida' };
        if (value.trim().length < 4) return { isValid: false, message: 'Cédula muy corta' };
        return { isValid: true, message: 'Cédula válida' };

      default:
        return { isValid: true, message: '' };
    }
  };

  const handleFieldValidation = (fieldName: string, value: string, fieldType?: string) => {
    const validation = validateField(fieldName, value, fieldType);
    setFieldValidation(prev => ({
      ...prev,
      [fieldName]: validation
    }));
  };

  const handleNextStep = () => {
    // Simplificado - la verificación de email ya se hizo en Auth.tsx
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleCompleteRegistration = async () => {
    try {
      setLoading(true);
      setError(null);

      // Sensitive log removed for security;

      // NUEVO FLUJO: Manejar tanto usuarios OAuth como registro tradicional

      let userId: string;

      // Verificar si es un usuario OAuth
      if (oauthSessionData) {
        // Sensitive log removed for security;
        userId = oauthSessionData.userId;

        // Actualizar el perfil existente con información completa
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.personalInfo.fullName,
            phone: formData.personalInfo.phone,
            role: formData.accountInfo.role,
            profile_completed: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (updateError) {
          // Error log removed for security;
          throw new Error('Error al actualizar el perfil');
        }

        // Limpiar datos OAuth temporales
        sessionStorage.removeItem('oauthRegistration');
      } else {
        // Flujo tradicional: crear usuario con email/contraseña
        const pendingRegistrationStr = sessionStorage.getItem('pendingRegistration');
        // DEBUG: Ver qué datos tenemos
        // Sensitive log removed for security;
        // Sensitive log removed for security;
        // Sensitive log removed for security;
        // Sensitive log removed for security;
        
        if (!pendingRegistrationStr && !formData.accountInfo.password && !initialEmail) {
          throw new Error(
            'No se encontraron los datos de registro. Por favor, inicia el proceso nuevamente desde Auth.'
          );
        }

        let registrationData: { email?: string; password?: string; timestamp?: number } = {};
        if (pendingRegistrationStr) {
          registrationData = JSON.parse(pendingRegistrationStr);
        } else {
          // Fallback: usar datos del formulario si están disponibles
          // Sensitive log removed for security;
          registrationData = {
            email: initialEmail || formData.personalInfo.email,
            password: formData.accountInfo.password || 'temp123456', // Password temporal
            timestamp: Date.now(),
          };
        }

        // Verificar que los datos no sean muy antiguos (máx 30 minutos)
        const maxAge = 30 * 60 * 1000; // 30 minutos en milisegundos
        if (Date.now() - registrationData.timestamp > maxAge) {
          sessionStorage.removeItem('pendingRegistration');
          throw new Error(
            'La sesión de registro ha expirado (máx 30 min). Por favor, inicia el proceso nuevamente desde Auth.'
          );
        }

        console.log(
          '✅ Datos de registro válidos, edad:',
          Math.round((Date.now() - registrationData.timestamp) / 60000),
          'minutos'
        );

        const email = formData.personalInfo.email || registrationData.email;
        const password = registrationData.password;

        if (!password) {
          throw new Error(
            'No se encontró la contraseña. Por favor, inicia el proceso nuevamente desde Auth.'
          );
        }

        // Sensitive log removed for security;

        // VERIFICACIÓN FINAL INTELIGENTE: Verificar y limpiar si es necesario
        // Sensitive log removed for security;

        // Primero verificar en profiles
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from('profiles')
          .select('id, profile_completed, full_name, created_at')
          .eq('email', email.toLowerCase().trim())
          .maybeSingle();

        if (profileCheckError && profileCheckError.code !== 'PGRST116') {
          // Error log removed for security;
          throw new Error('Error al verificar la disponibilidad del email');
        }

        if (existingProfile) {
          // Sensitive log removed for security;

          // Si el perfil está incompleto, intentar limpiarlo
          if (!existingProfile.profile_completed || !existingProfile.full_name) {
            // Sensitive log removed for security;

            try {
              // Eliminar el perfil incompleto (esto debería eliminar el usuario en auth.users también por CASCADE)
              const { error: deleteError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', existingProfile.id);

              if (deleteError) {
                // Error log removed for security;
                throw new Error(
                  'Email ya registrado con registro incompleto. Por favor, contacta a soporte.'
                );
              }

              // Sensitive log removed for security;
            } catch (cleanupError) {
              // Error log removed for security;
              throw new Error(
                'Este correo tiene un registro previo incompleto. Por favor, contacta a soporte para resolverlo.'
              );
            }
          } else {
            // Perfil completo, definitivamente ya registrado
            // Error log removed for security;
            throw new Error(
              'Este correo electrónico ya está registrado con un perfil completo. Por favor, inicia sesión en lugar de registrarte.'
            );
          }
        }

        // Sensitive log removed for security;

        // Recuperar token de hCaptcha guardado en el primer paso del registro
        const pending = sessionStorage.getItem('pendingRegistration');
        let captchaToken: string | undefined = undefined;
        if (pending) {
          try {
            const parsed = JSON.parse(pending);
            if (typeof parsed?.hcaptchaToken === 'string') {
              captchaToken = parsed.hcaptchaToken;
            }
          } catch {}
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            // TODO: captchaToken deshabilitado temporalmente
            // captchaToken,
            data: {
              full_name: formData.personalInfo.fullName,
              role: formData.accountInfo.role,
              phone: formData.personalInfo.phone,
              profile_completed: true,
            },
          },
        });

        if (authError) {
          // Error log removed for security;
          // Error log removed for security;
          // Error log removed for security;

          // Manejo específico de errores de email ya registrado
          if (
            authError.message?.includes('already registered') ||
            authError.message?.includes('User already registered') ||
            authError.message?.includes('email address is already in use') ||
            authError.message?.includes('User with this email already exists') ||
            authError.status === 422
          ) {
            // Si es error de email ya registrado, intentar una limpieza más profunda
            // Sensitive log removed for security;

            try {
              // Intentar eliminar cualquier registro huérfano
              const { error: cleanupError } = await supabase
                .from('profiles')
                .delete()
                .eq('email', email.toLowerCase().trim())
                .is('profile_completed', null);

              if (!cleanupError) {
                // Sensitive log removed for security;
                throw new Error(
                  'Se encontró un registro previo incompleto que fue eliminado. Por favor, intenta registrarte nuevamente.'
                );
              }
            } catch {
              // Si falla la limpieza, continuar con el error original
            }

            throw new Error(
              'Este correo electrónico ya está registrado. Si acabas de intentar registrarte, espera un momento e intenta nuevamente. Si el problema persiste, inicia sesión en lugar de registrarte.'
            );
          }

          throw new Error(authError.message || 'Error al crear la cuenta');
        }

        if (!authData?.user) {
          throw new Error('No se pudo crear el usuario');
        }

        userId = authData.user.id;
        // Sensitive log removed for security;

        // Limpiar datos temporales
        sessionStorage.removeItem('pendingRegistration');
      }

      // 2. Crear o seleccionar clínica si no es paciente
      let clinicId: string | null = null;
      if (formData.accountInfo.role !== 'patient') {
        if (formData.clinicInfo?.isNewClinic) {
          // Crear nueva clínica
          const { data: newClinic, error: clinicError } = await supabase
            .from('clinics')
            .insert({
              name: formData.clinicInfo.clinicData!.name,
              type: formData.clinicInfo.clinicData!.type,
              address: formData.clinicInfo.clinicData!.address,
              phone: formData.clinicInfo.clinicData!.phone,
              email: formData.clinicInfo.clinicData!.email,
              director_name: formData.personalInfo.fullName,
              director_license: formData.professionalInfo?.licenseNumber,
            })
            .select()
            .single();

          if (clinicError) throw clinicError;
          clinicId = newClinic.id;
        } else {
          clinicId = formData.clinicInfo?.clinicId || null;
        }
      }

      // 3. Crear perfil de usuario usando el service role o RPC
      const profileData = {
        id: userId,
        email: formData.personalInfo.email,
        role: formData.accountInfo.role,
        full_name: formData.personalInfo.fullName,
        phone: formData.personalInfo.phone,
        license_number: formData.professionalInfo?.licenseNumber,
        specialty_id: formData.professionalInfo?.specialtyId || '688ae40b-3d31-4e49-89d4-cc4f4f4e1293', // Default: Administración Hospitalaria
        employee_id: formData.professionalInfo?.employeeId,
        clinic_id: clinicId,
        profile_completed: true,
        is_active: formData.accountInfo.role !== 'doctor',
        additional_info: {
          birth_date: formData.personalInfo.birthDate,
          gender: formData.personalInfo.gender,
          address: formData.personalInfo.address,
          experience: formData.professionalInfo?.experience,
          work_schedule: formData.additionalInfo?.workSchedule,
          notes: formData.additionalInfo?.notes,
        },
      };

      // Crear o actualizar perfil de usuario usando upsert
      // Sensitive log removed for security;
      const { error: profileError } = await supabase.from('profiles').upsert(profileData, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });

      if (profileError) {
        // Error log removed for security;
        throw new Error(`Error al actualizar perfil: ${profileError.message}`);
      } else {
        // Sensitive log removed for security;
      }

      // 4. Si es paciente, crear registro en tabla patients
      if (formData.accountInfo.role === 'patient') {
        const patientData = {
          full_name: formData.personalInfo.fullName,
          birth_date: formData.personalInfo.birthDate || '1900-01-01',
          gender: formData.personalInfo.gender || 'no_especificado',
          email: formData.personalInfo.email,
          phone: formData.personalInfo.phone,
          address: formData.personalInfo.address,
          patient_user_id: userId,
          insurance_info: formData.patientInfo?.insuranceInfo || {},
          emergency_contact: formData.patientInfo?.emergencyContact || {},
          is_active: true,
        };

        const normalizedEmail = (formData.personalInfo.email || '').trim().toLowerCase();
        const { data: existingByUser } = await supabase
          .from('patients')
          .select('id')
          .eq('patient_user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingByUser?.id) {
          const { error: patientUpdateError } = await supabase
            .from('patients')
            .update({
              ...patientData,
              email: normalizedEmail || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingByUser.id);
          if (patientUpdateError) throw patientUpdateError;
        } else if (normalizedEmail) {
          const { data: candidatesByEmail } = await supabase
            .from('patients')
            .select('id, patient_user_id')
            .eq('email', normalizedEmail)
            .order('created_at', { ascending: false })
            .limit(5);

          const reusable = (candidatesByEmail || []).find((row) => !row.patient_user_id);
          if (reusable?.id) {
            const { error: attachError } = await supabase
              .from('patients')
              .update({
                ...patientData,
                email: normalizedEmail,
                patient_user_id: userId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', reusable.id);
            if (attachError) throw attachError;
          } else {
            const { error: patientError } = await supabase
              .from('patients')
              .insert({
                ...patientData,
                email: normalizedEmail,
              });
            if (patientError) throw patientError;
          }
        } else {
          const { error: patientError } = await supabase.from('patients').insert(patientData);
          if (patientError) throw patientError;
        }
      }

      // 5. Crear relación clínica-usuario si corresponde
      if (clinicId && formData.accountInfo.role !== 'patient') {
        const roleInClinic = formData.accountInfo.role === 'admin_staff' ? 'admin_staff' : 'doctor';
        const { error: relationError } = await supabase.from('clinic_user_relationships').insert({
          clinic_id: clinicId,
          user_id: userId,
          role_in_clinic: roleInClinic,
          status: 'pending', // Siempre pendiente por defecto
          is_active: true,
        });

        if (relationError) throw relationError;

        // Mostrar mensaje informativo sobre la aprobación
        console.log(
          '📋 Solicitud de unión enviada. Esperando aprobación del administrador de la clínica.'
        );
      }

      // Sensitive log removed for security;

      // Mostrar mensaje de éxito
      setError(null);

      // Registro completado exitosamente
      // Sensitive log removed for security;

      // Redirigir al dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err: unknown) {
      // Error log removed for security;

      // Mejorar mensajes de error específicos
      if (err instanceof Error) {
        const errorMsg = err.message.toLowerCase();

        if (
          errorMsg.includes('already registered') ||
          errorMsg.includes('ya está registrado') ||
          errorMsg.includes('email address is already in use') ||
          errorMsg.includes('email ya está registrado')
        ) {
          setError(
            'Este correo electrónico ya está registrado. Si acabas de intentar registrarte, puede haber un registro previo incompleto.'
          );
          setShowRetryCleanup(true);
        } else if (errorMsg.includes('invalid') && errorMsg.includes('password')) {
          setError('La contraseña debe tener al menos 6 caracteres');
        } else if (errorMsg.includes('email') && errorMsg.includes('valid')) {
          setError('Por favor, ingresa un correo electrónico válido');
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          setError('Error de conexión. Por favor, verifica tu internet e intenta nuevamente');
        } else if (errorMsg.includes('rate limit')) {
          setError(
            'Demasiados intentos. Por favor, espera unos minutos antes de intentar nuevamente'
          );
        } else if (errorMsg.includes('password') && errorMsg.includes('should be')) {
          setError('La contraseña debe tener al menos 6 caracteres');
        } else if (errorMsg.includes('session') && errorMsg.includes('expir')) {
          setError('La sesión de registro ha expirado. Por favor, inicia el proceso nuevamente.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Error inesperado al completar el registro. Por favor, intenta nuevamente');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = (step: number): string => {
    switch (step) {
      case 1:
        return 'Información Personal';
      case 2:
        return 'Tipo de Cuenta';
      case 3:
        return 'Información Profesional';
      case 4:
        return 'Clínica/Institución';
      case 5:
        return 'Información Adicional';
      case 6:
        return 'Confirmación y Finalizar';
      default:
        return 'Registro';
    }
  };

  const getStepDescription = (step: number): string => {
    switch (step) {
      case 1:
        return 'Datos personales y de contacto';
      case 2:
        return 'Seleccionar tipo de cuenta profesional';
      case 3:
        return 'Licencias y especialidades médicas';
      case 4:
        return 'Afiliación institucional';
      case 5:
        return 'Horarios y preferencias';
      case 6:
        return 'Revisar y completar registro';
      default:
        return '';
    }
  };

  const roleOptions = useMemo(
    () => [
      {
        value: 'doctor',
        label: 'Doctor/Médico',
        icon: Stethoscope,
        description: 'Médico certificado con acceso completo a pacientes',
        color: 'from-blue-500 to-cyan-600',
        enabled: true,
      },
      {
        value: 'health_staff',
        label: 'Personal de Salud',
        icon: UserCheck,
        description: 'Enfermería, fisioterapia, dentistas, etc. (Próximamente disponible)',
        color: 'from-green-500 to-emerald-600',
        enabled: false,
      },
      {
        value: 'admin_staff',
        label: 'Personal Administrativo',
        icon: Building,
        description: 'Administradores de clínica y personal de gestión',
        color: 'from-purple-500 to-indigo-600',
        enabled: true,
      },
      {
        value: 'patient',
        label: 'Paciente',
        icon: Heart,
        description:
          'Usuario paciente con acceso a su información médica (Próximamente disponible)',
        color: 'from-pink-500 to-rose-600',
        enabled: false,
      },
    ],
    []
  );

  // Verificar y resetear rol si está deshabilitado
  useEffect(() => {
    if (formData.accountInfo.role) {
      const selectedRole = roleOptions.find(role => role.value === formData.accountInfo.role);
      if (!selectedRole?.enabled) {
        // Sensitive log removed for security;
        setFormData(prev => ({
          ...prev,
          accountInfo: {
            ...prev.accountInfo,
            role: 'doctor', // Valor por defecto a doctor
          },
        }));
      }
    }
  }, [formData.accountInfo.role, roleOptions]);

  const experienceOptions = [
    { value: '0-1', label: 'Recién graduado (0-1 año)' },
    { value: '1-3', label: '1-3 años' },
    { value: '3-5', label: '3-5 años' },
    { value: '5-10', label: '5-10 años' },
    { value: '10-15', label: '10-15 años' },
    { value: '15-20', label: '15-20 años' },
    { value: '20+', label: 'Más de 20 años' },
  ];

  const workScheduleOptions = [
    { value: 'morning', label: 'Turno matutino (6:00 - 14:00)' },
    { value: 'afternoon', label: 'Turno vespertino (14:00 - 22:00)' },
    { value: 'night', label: 'Turno nocturno (22:00 - 6:00)' },
    { value: 'mixed', label: 'Turnos rotativos' },
    { value: 'flexible', label: 'Horario flexible' },
    { value: 'on-call', label: 'Disponibilidad 24/7' },
  ];

  const totalSteps = formData.accountInfo.role === 'patient' ? 5 : 6; // Pacientes tienen un paso menos

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4'>
      <div className='w-full max-w-4xl bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700 overflow-hidden'>
        {/* Header */}
        <div className='bg-gradient-to-r from-cyan-600 to-blue-700 px-8 py-6'>
          <div className='flex items-center justify-between'>
            <div>
              <div className='flex items-center mb-2'>
                <Stethoscope className='h-8 w-8 text-white mr-3' />
                <h1 className='text-2xl font-bold text-white'>Registro Completo</h1>
              </div>
              <p className='text-cyan-100'>
                Paso {currentStep} de {totalSteps}: {getStepTitle(currentStep)}
              </p>
              <p className='text-cyan-200 text-sm mt-1'>{getStepDescription(currentStep)}</p>
              {/* Mostrar email del usuario */}
              {formData.personalInfo.email && (
                <div className='flex items-center mt-3 px-3 py-1 bg-white/10 rounded-full'>
                  <Mail className='h-4 w-4 text-cyan-200 mr-2' />
                  <span className='text-cyan-100 text-sm font-medium'>
                    {formData.personalInfo.email}
                  </span>
                </div>
              )}
            </div>
            <div className='text-right'>
              <div className='text-white/80 text-sm'>Sistema:</div>
              <div className='text-white font-medium'>ExpedienteDLM</div>
              {location.state?.fromRegistration && (
                <div className='text-cyan-200 text-xs mt-1'>✨ Registro iniciado</div>
              )}
            </div>
          </div>

          {/* Enhanced Progress Bar */}
          <div className='mt-6'>
            {/* Percentage and Progress Info */}
            <div className='flex justify-between items-center mb-3'>
              <span className='text-cyan-100 text-sm font-medium'>
                Progreso del registro
              </span>
              <span className='text-white font-semibold bg-white/10 px-3 py-1 rounded-full text-sm'>
                {Math.round((currentStep / totalSteps) * 100)}% completado
              </span>
            </div>
            
            {/* Step Indicators */}
            <div className='flex justify-between mb-3'>
              {Array.from({ length: totalSteps }, (_, i) => (
                <div key={i + 1} className='flex flex-col items-center'>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                      i + 1 < currentStep 
                        ? 'bg-green-500 text-white shadow-lg scale-110' 
                        : i + 1 === currentStep
                        ? 'bg-white text-cyan-600 shadow-lg scale-110 ring-2 ring-white/30'
                        : 'bg-cyan-700 text-cyan-200'
                    }`}
                  >
                    {i + 1 < currentStep ? (
                      <CheckCircle className='h-5 w-5' />
                    ) : i + 1 === currentStep ? (
                      <div className='w-2 h-2 bg-cyan-600 rounded-full animate-pulse'></div>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={`text-xs mt-1 transition-colors duration-300 ${
                    i + 1 <= currentStep ? 'text-white font-medium' : 'text-cyan-300'
                  }`}>
                    {i + 1 === 1 && 'Personal'}
                    {i + 1 === 2 && 'Profesional'}
                    {i + 1 === 3 && 'Clínica'}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Progress Bar */}
            <div className='h-3 bg-cyan-700/50 rounded-full overflow-hidden'>
              <div
                className='h-full bg-gradient-to-r from-cyan-400 to-white rounded-full transition-all duration-500 ease-out shadow-sm'
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
            
            {/* Step Description */}
            <div className='mt-3 text-center'>
              <p className='text-cyan-100 text-sm'>
                {currentStep === 1 && '📝 Información personal básica'}
                {currentStep === 2 && '👨‍⚕️ Datos profesionales médicos'}
                {currentStep === 3 && '🏥 Configuración de clínica'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className='p-8'>
          {error && (
            <div className='mb-6 bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg'>
              <div className='flex items-start'>
                <AlertCircle className='h-5 w-5 mr-3 flex-shrink-0 mt-0.5' />
                <div className='flex-1'>
                  <p>{error}</p>
                  {showRetryCleanup && (
                    <div className='mt-3 flex flex-col sm:flex-row gap-2'>
                      <button
                        onClick={handleRetryCleanup}
                        disabled={loading}
                        className='flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                      >
                        {loading ? (
                          <>
                            <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                            Limpiando...
                          </>
                        ) : (
                          <>🧹 Limpiar registros previos</>
                        )}
                      </button>
                      <button
                        onClick={() => navigate('/auth')}
                        className='flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors'
                      >
                        ↩️ Volver a iniciar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mensaje especial para usuarios OAuth */}
          {fromOAuth && (
            <div className='mb-6 bg-green-900/30 border border-green-700 rounded-lg p-4 animate-fadeInUp'>
              <div className='flex items-start'>
                <CheckCircle className='h-5 w-5 text-green-400 mr-3 flex-shrink-0 mt-0.5' />
                <div className='flex-1'>
                  <h3 className='text-green-300 font-semibold mb-2'>
                    ¡Autenticación con Google exitosa!
                  </h3>
                  <p className='text-green-200 text-sm mb-2'>
                    Tu cuenta ha sido verificada correctamente. Ahora necesitamos completar tu perfil 
                    médico para personalizar tu experiencia en ExpedienteDLM.
                  </p>
                  <div className='text-green-100 text-xs bg-green-800/30 rounded p-2'>
                    <strong>✓ Email verificado:</strong> {formData.personalInfo.email}<br/>
                    <strong>✓ Nombre obtenido:</strong> {formData.personalInfo.fullName || 'Por completar'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className='space-y-6 animate-fadeInUp'>
              {/* Indicador de progreso del paso 1 */}
              <div className='bg-gray-800 rounded-lg p-4 animate-fadeInUp animate-delay-100'>
                <div className='flex items-center justify-between mb-3'>
                  <h3 className='text-lg font-medium text-white'>Información Personal</h3>
                  <span className='text-sm text-gray-400'>{getStep1Progress()}% completado</span>
                </div>
                <div className='w-full bg-gray-700 rounded-full h-2'>
                  <div
                    className='bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full transition-all duration-300'
                    style={{ width: `${getStep1Progress()}%` }}
                  ></div>
                </div>
                <div className='mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs'>
                  <div
                    className={`flex items-center ${formData.personalInfo.fullName.trim() ? 'text-green-400' : 'text-gray-500'}`}
                  >
                    <CheckCircle className='h-3 w-3 mr-1' />
                    Nombre
                  </div>
                  <div
                    className={`flex items-center ${formData.personalInfo.email.trim() ? 'text-green-400' : 'text-gray-500'}`}
                  >
                    <CheckCircle className='h-3 w-3 mr-1' />
                    Email
                  </div>
                  <div
                    className={`flex items-center ${formData.personalInfo.phone.trim() ? 'text-green-400' : 'text-gray-500'}`}
                  >
                    <CheckCircle className='h-3 w-3 mr-1' />
                    Teléfono
                  </div>
                  <div
                    className={`flex items-center ${formData.personalInfo.birthDate && isValidAge(formData.personalInfo.birthDate) ? 'text-green-400' : 'text-gray-500'}`}
                  >
                    <CheckCircle className='h-3 w-3 mr-1' />
                    Fecha
                  </div>
                </div>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeInUp animate-delay-200'>
                <div className='animate-fadeInLeft animate-delay-300'>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>
                    Nombre completo *
                  </label>
                  <div className='relative'>
                    <input
                      type='text'
                      value={formData.personalInfo.fullName}
                      onChange={e => {
                        const value = e.target.value;
                        updateFormData('personalInfo', 'fullName', value);
                        handleFieldValidation('fullName', value);
                      }}
                      className={`w-full px-4 py-3 border rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 transition-all duration-200 ${
                        fieldValidation.fullName
                          ? fieldValidation.fullName.isValid
                            ? 'bg-gray-700 border-green-500 focus:ring-green-400 focus:border-green-400'
                            : 'bg-gray-700 border-red-500 focus:ring-red-400 focus:border-red-400'
                          : 'bg-gray-700 border-gray-600 focus:ring-cyan-400 focus:border-cyan-400'
                      }`}
                      placeholder='Dr. Juan Pérez García'
                      required
                    />
                    <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                      {fieldValidation.fullName ? (
                        fieldValidation.fullName.isValid ? (
                          <CheckCircle className='h-5 w-5 text-green-400' />
                        ) : (
                          <AlertCircle className='h-5 w-5 text-red-400' />
                        )
                      ) : (
                        <User className='h-5 w-5 text-gray-400' />
                      )}
                    </div>
                  </div>
                  {fieldValidation.fullName && (
                    <p className={`text-xs mt-1 transition-colors duration-200 ${
                      fieldValidation.fullName.isValid ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {fieldValidation.fullName.message}
                    </p>
                  )}
                </div>

                <div className='animate-fadeInRight animate-delay-300'>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>
                    Correo electrónico *
                  </label>
                  <div className='relative'>
                    <input
                      type='email'
                      value={formData.personalInfo.email}
                      onChange={e => {
                        const value = e.target.value;
                        updateFormData('personalInfo', 'email', value);
                        if (!initialEmail) {
                          handleFieldValidation('email', value);
                        }
                      }}
                      className={`w-full px-4 py-3 border rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 transition-all duration-200 ${
                        initialEmail
                          ? 'bg-gray-600/50 border-green-500 cursor-not-allowed focus:ring-green-400 focus:border-green-400'
                          : fieldValidation.email
                          ? fieldValidation.email.isValid
                            ? 'bg-gray-700 border-green-500 focus:ring-green-400 focus:border-green-400'
                            : 'bg-gray-700 border-red-500 focus:ring-red-400 focus:border-red-400'
                          : 'bg-gray-700 border-gray-600 focus:ring-cyan-400 focus:border-cyan-400'
                      }`}
                      placeholder='correo@ejemplo.com'
                      required
                      readOnly={!!initialEmail}
                      disabled={!!initialEmail}
                    />
                    <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                      {initialEmail ? (
                        <CheckCircle className='h-5 w-5 text-green-400' />
                      ) : fieldValidation.email ? (
                        fieldValidation.email.isValid ? (
                          <CheckCircle className='h-5 w-5 text-green-400' />
                        ) : (
                          <AlertCircle className='h-5 w-5 text-red-400' />
                        )
                      ) : (
                        <Mail className='h-5 w-5 text-gray-400' />
                      )}
                    </div>
                  </div>
                  {!initialEmail && fieldValidation.email && (
                    <p className={`text-xs mt-1 transition-colors duration-200 ${
                      fieldValidation.email.isValid ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {fieldValidation.email.message}
                    </p>
                  )}

                  {/* Mensaje para email pre-verificado */}
                  {initialEmail && (
                    <p className='text-xs text-cyan-400 mt-1'>
                      ✅ Email verificado desde el registro
                    </p>
                  )}
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Teléfono *</label>
                  <div className='relative'>
                    <input
                      type='tel'
                      value={formData.personalInfo.phone}
                      onChange={e => {
                        const value = e.target.value;
                        updateFormData('personalInfo', 'phone', value);
                        handleFieldValidation('phone', value);
                      }}
                      className={`w-full px-4 py-3 border rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 transition-all duration-200 ${
                        fieldValidation.phone
                          ? fieldValidation.phone.isValid
                            ? 'bg-gray-700 border-green-500 focus:ring-green-400 focus:border-green-400'
                            : 'bg-gray-700 border-red-500 focus:ring-red-400 focus:border-red-400'
                          : 'bg-gray-700 border-gray-600 focus:ring-cyan-400 focus:border-cyan-400'
                      }`}
                      placeholder='+52 555 123 4567'
                      required
                    />
                    <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                      {fieldValidation.phone ? (
                        fieldValidation.phone.isValid ? (
                          <CheckCircle className='h-5 w-5 text-green-400' />
                        ) : (
                          <AlertCircle className='h-5 w-5 text-red-400' />
                        )
                      ) : (
                        <Phone className='h-5 w-5 text-gray-400' />
                      )}
                    </div>
                  </div>
                  {fieldValidation.phone && (
                    <p className={`text-xs mt-1 transition-colors duration-200 ${
                      fieldValidation.phone.isValid ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {fieldValidation.phone.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className='text-sm font-medium text-gray-300 mb-2 flex items-center justify-between'>
                    <div className='flex items-center'>
                      <span>Fecha de nacimiento *</span>
                      <div className='ml-2 relative group'>
                        <div className='w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center cursor-help'>
                          <span className='text-xs text-gray-300'>?</span>
                        </div>
                        <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10'>
                          Selecciona tu fecha de nacimiento. Debes ser mayor de 18 años.
                          <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800'></div>
                        </div>
                      </div>
                    </div>
                    {formData.personalInfo.birthDate &&
                      isValidAge(formData.personalInfo.birthDate) && (
                        <span className='text-xs bg-green-600 text-white px-2 py-1 rounded-full'>
                          ✓ Completado
                        </span>
                      )}
                  </label>
                  <div className={`grid grid-cols-3 gap-3 p-3 rounded-lg border transition-all duration-200 ${
                    fieldValidation.birthDate
                      ? fieldValidation.birthDate.isValid
                        ? 'border-green-500 bg-green-500/5'
                        : 'border-red-500 bg-red-500/5'
                      : 'border-gray-600 bg-transparent'
                  }`}>
                    {/* Día */}
                    <div className='relative'>
                      <label className='block text-xs text-gray-400 mb-1'>Día</label>
                      <select
                        value={getBirthDatePart('day')}
                        onChange={e => updateBirthDate('day', e.target.value)}
                        className='w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-center'
                      >
                        <option value=''>--</option>
                        {generateDayOptions().map(day => (
                          <option key={day} value={day.toString().padStart(2, '0')}>
                            {day.toString().padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Mes */}
                    <div className='relative'>
                      <label className='block text-xs text-gray-400 mb-1'>Mes</label>
                      <select
                        value={getBirthDatePart('month')}
                        onChange={e => updateBirthDate('month', e.target.value)}
                        className='w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-center'
                      >
                        <option value=''>--</option>
                        {months.map((month, index) => (
                          <option key={index} value={(index + 1).toString().padStart(2, '0')}>
                            {month}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Año */}
                    <div className='relative'>
                      <label className='block text-xs text-gray-400 mb-1'>Año</label>
                      <select
                        value={getBirthDatePart('year')}
                        onChange={e => updateBirthDate('year', e.target.value)}
                        className='w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-center'
                      >
                        <option value=''>----</option>
                        {generateYearOptions().map(year => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Mostrar fecha formateada */}
                  {formData.personalInfo.birthDate && (
                    <div className='mt-2 text-sm text-gray-400 flex items-center'>
                      <Calendar className='h-4 w-4 mr-2' />
                      Fecha seleccionada:{' '}
                      {formatBirthDateForDisplay(formData.personalInfo.birthDate)}
                    </div>
                  )}

                  {/* Validación en tiempo real */}
                  {fieldValidation.birthDate && (
                    <div className={`mt-2 text-sm flex items-center transition-colors duration-200 ${
                      fieldValidation.birthDate.isValid ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {fieldValidation.birthDate.isValid ? (
                        <CheckCircle className='h-4 w-4 mr-2' />
                      ) : (
                        <AlertCircle className='h-4 w-4 mr-2' />
                      )}
                      {fieldValidation.birthDate.message}
                    </div>
                  )}

                  {/* Validación de edad */}
                  {formData.personalInfo.birthDate &&
                    !isValidAge(formData.personalInfo.birthDate) && (
                      <div className='mt-2 text-sm text-red-400 flex items-center'>
                        <AlertCircle className='h-4 w-4 mr-2' />
                        Debes ser mayor de 18 años para registrarte
                      </div>
                    )}

                  {/* Indicador de completado */}
                  {formData.personalInfo.birthDate &&
                    isValidAge(formData.personalInfo.birthDate) && (
                      <div className='mt-2 text-sm text-green-400 flex items-center'>
                        <CheckCircle className='h-4 w-4 mr-2' />
                        Fecha válida ✓
                      </div>
                    )}
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Género</label>
                  <select
                    value={formData.personalInfo.gender}
                    onChange={e => updateFormData('personalInfo', 'gender', e.target.value)}
                    className='w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent'
                  >
                    <option value=''>Seleccionar género</option>
                    <option value='masculino'>Masculino</option>
                    <option value='femenino'>Femenino</option>
                    <option value='otro'>Otro</option>
                    <option value='no_especificado'>Prefiero no especificar</option>
                  </select>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Dirección</label>
                  <div className='relative'>
                    <input
                      type='text'
                      value={formData.personalInfo.address}
                      onChange={e => updateFormData('personalInfo', 'address', e.target.value)}
                      className='w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent'
                      placeholder='Calle, Número, Colonia, Ciudad'
                    />
                    <MapPin className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Role Selection */}
          {currentStep === 2 && (
            <div className='space-y-6 animate-fadeInUp'>
              {initialEmail && (
                <div className='bg-green-900/30 border border-green-700 rounded-lg p-4'>
                  <div className='flex items-center'>
                    <CheckCircle className='h-5 w-5 text-green-400 mr-3 flex-shrink-0' />
                    <div>
                      <p className='text-green-300 font-medium'>Credenciales verificadas</p>
                      <p className='text-green-200 text-sm mt-1'>
                        Tu email <span className='font-mono'>{initialEmail}</span> y contraseña
                        están listos. Ahora selecciona tu tipo de cuenta profesional.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-4'>
                  Tipo de cuenta *
                </label>
                <div className='mb-4 p-4 bg-blue-900/30 border border-blue-700 rounded-lg'>
                  <div className='flex items-start'>
                    <div className='flex-shrink-0'>
                      <div className='w-5 h-5 bg-blue-400 rounded-full flex items-center justify-center'>
                        <span className='text-blue-900 text-xs font-bold'>ℹ</span>
                      </div>
                    </div>
                    <div className='ml-3'>
                      <p className='text-blue-300 text-sm font-medium mb-1'>
                        Tipos de cuenta disponibles
                      </p>
                      <p className='text-blue-200 text-xs'>
                        Actualmente solo pueden registrarse <strong>Doctores/Médicos</strong> y{' '}
                        <strong>Personal Administrativo</strong>. Los otros tipos de cuenta estarán
                        disponibles próximamente.
                      </p>
                    </div>
                  </div>
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {roleOptions.map(role => {
                    const Icon = role.icon;
                    const isSelected = formData.accountInfo.role === role.value;
                    const isDisabled = !role.enabled;

                    return (
                      <button
                        key={role.value}
                        type='button'
                        onClick={() => {
                          if (role.enabled) {
                            updateFormData('accountInfo', 'role', role.value);
                          }
                        }}
                        disabled={isDisabled}
                        className={`p-6 rounded-lg border text-left transition-all relative ${
                          isDisabled
                            ? 'border-gray-700 bg-gray-800/30 cursor-not-allowed opacity-50'
                            : isSelected
                              ? 'border-cyan-400 bg-cyan-900/30'
                              : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 cursor-pointer'
                        }`}
                      >
                        {isDisabled && (
                          <div className='absolute top-2 right-2'>
                            <div className='bg-gray-600 text-gray-300 text-xs px-2 py-1 rounded-full'>
                              Próximamente
                            </div>
                          </div>
                        )}
                        <div
                          className={`w-12 h-12 rounded-lg bg-gradient-to-r ${role.color} flex items-center justify-center mb-3 ${
                            isDisabled ? 'opacity-50' : ''
                          }`}
                        >
                          <Icon className='h-6 w-6 text-white' />
                        </div>
                        <div
                          className={`font-medium mb-1 ${
                            isDisabled ? 'text-gray-500' : 'text-white'
                          }`}
                        >
                          {role.label}
                        </div>
                        <div
                          className={`text-sm ${isDisabled ? 'text-gray-600' : 'text-gray-400'}`}
                        >
                          {role.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className='bg-blue-900/30 border border-blue-700 rounded-lg p-4'>
                <div className='flex items-center'>
                  <Shield className='h-5 w-5 text-blue-400 mr-3' />
                  <div>
                    <p className='text-blue-300 font-medium'>Perfil profesional seguro</p>
                    <p className='text-blue-200 text-sm mt-1'>
                      Tu información estará protegida según estándares de seguridad médica y HIPAA.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Professional Information (Skip for patients) */}
          {currentStep === 3 && formData.accountInfo.role !== 'patient' && (
            <div className='space-y-6 animate-fadeInUp'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>
                    Cédula/Licencia profesional *
                  </label>
                  <div className='relative'>
                    <input
                      type='text'
                      value={formData.professionalInfo?.licenseNumber || ''}
                      onChange={e =>
                        updateFormData('professionalInfo', 'licenseNumber', e.target.value)
                      }
                      className='w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent'
                      placeholder='Ej: 12345678'
                      required
                    />
                    <Award className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' />
                  </div>
                </div>

                {formData.accountInfo.role === 'doctor' && (
                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-2'>
                      Especialidad médica *
                      {useBackupSpecialties && (
                        <span className='ml-2 text-xs text-yellow-400'>(datos locales)</span>
                      )}
                    </label>

                    {/* Información de especialidades disponibles */}
                    {specialties.length > 0 && (
                      <div className='mb-3 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg'>
                        <div className='flex items-center justify-between text-sm'>
                          <span className='text-blue-300'>
                            📋 <strong>{specialties.length}</strong> especialidades disponibles
                          </span>
                          <span className='text-blue-200 text-xs'>
                            {Object.entries(
                              specialties.reduce(
                                (acc, spec) => {
                                  acc[spec.category] = (acc[spec.category] || 0) + 1;
                                  return acc;
                                },
                                {} as Record<string, number>
                              )
                            )
                              .map(([cat, count]) => `${cat}: ${count}`)
                              .join(' | ')}
                          </span>
                        </div>
                      </div>
                    )}

                    {specialtiesLoading && (
                      <div className='flex items-center justify-center py-8'>
                        <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400'></div>
                        <span className='ml-2 text-gray-400'>Cargando especialidades...</span>
                      </div>
                    )}

                    {!specialtiesLoading && formData.professionalInfo?.specialtyId && (
                      <div className='mb-2 px-3 py-2 bg-green-900/30 border border-green-700 rounded-lg text-green-300 text-sm'>
                        ✅ Especialidad seleccionada:{' '}
                        {
                          specialties.find(s => s.id === formData.professionalInfo?.specialtyId)
                            ?.name
                        }
                        <button
                          type='button'
                          onClick={() => {
                            updateFormData('professionalInfo', 'specialtyId', '');
                            setSpecialtySearch('');
                            setIsSpecialtyDropdownOpen(true);
                          }}
                          className='ml-2 text-green-400 hover:text-green-300'
                        >
                          (cambiar)
                        </button>
                      </div>
                    )}

                    {!specialtiesLoading && !formData.professionalInfo?.specialtyId && (
                      <div className='relative'>
                        <input
                          type='text'
                          value={specialtySearch}
                          onChange={e => {
                            setSpecialtySearch(e.target.value);
                            setIsSpecialtyDropdownOpen(true);
                          }}
                          onFocus={() => {
                            setIsSpecialtyDropdownOpen(true);
                            if (!specialtySearch && filteredSpecialties.length === 0) {
                              setFilteredSpecialties(specialties);
                            }
                          }}
                          className='w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent'
                          placeholder={
                            specialties.length > 0
                              ? `Buscar entre ${specialties.length} especialidades... (ej: cardiología, medicina, cirugía)`
                              : 'No hay especialidades disponibles'
                          }
                          disabled={specialties.length === 0}
                        />
                        <Search className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' />

                        {/* Indicador de búsqueda */}
                        {specialtySearch && (
                          <div className='absolute right-12 top-1/2 transform -translate-y-1/2 text-xs text-gray-500'>
                            {filteredSpecialties.length} resultados
                          </div>
                        )}

                        {/* Botón para ver todas */}
                        {!specialtySearch && (
                          <button
                            type='button'
                            onClick={() => {
                              setFilteredSpecialties(specialties);
                              setIsSpecialtyDropdownOpen(true);
                            }}
                            className='absolute right-12 top-1/2 transform -translate-y-1/2 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-900/30 px-2 py-1 rounded'
                          >
                            Ver todas
                          </button>
                        )}
                      </div>
                    )}

                    {isSpecialtyDropdownOpen && filteredSpecialties.length > 0 && (
                      <div className='relative'>
                        <div className='absolute top-2 left-0 right-0 max-h-64 overflow-y-auto bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-50'>
                          {/* Header del dropdown */}
                          <div className='sticky top-0 bg-gray-800 px-4 py-2 border-b border-gray-600'>
                            <div className='text-xs text-gray-400 font-medium'>
                              {filteredSpecialties.length} especialidades encontradas
                            </div>
                          </div>

                          {/* Lista de especialidades */}
                          {filteredSpecialties.map(specialty => (
                            <button
                              key={specialty.id}
                              type='button'
                              onMouseDown={e => {
                                e.preventDefault();
                                updateFormData('professionalInfo', 'specialtyId', specialty.id);
                                setSpecialtySearch('');
                                setIsSpecialtyDropdownOpen(false);
                              }}
                              className='w-full text-left px-4 py-3 hover:bg-gray-600 text-white border-b border-gray-600 last:border-b-0 transition-colors'
                            >
                              <div className='flex items-center justify-between'>
                                <div className='flex-1'>
                                  <div className='font-medium text-white'>{specialty.name}</div>
                                  <div className='text-sm text-gray-400 capitalize'>
                                    {specialty.category} • {specialty.description}
                                  </div>
                                </div>
                                <div className='ml-2 text-xs text-gray-500 bg-gray-600 px-2 py-1 rounded'>
                                  {specialty.requires_license ? 'Licencia' : 'Sin licencia'}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                        <div
                          className='fixed inset-0 z-40'
                          onClick={() => setIsSpecialtyDropdownOpen(false)}
                        ></div>
                      </div>
                    )}

                    {isSpecialtyDropdownOpen &&
                      filteredSpecialties.length === 0 &&
                      specialtySearch && (
                        <div className='mt-2 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 text-sm'>
                          No se encontraron especialidades que coincidan con "{specialtySearch}"
                        </div>
                      )}

                    {specialties.length === 0 && !specialtiesLoading && (
                      <div className='mt-2 px-4 py-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm'>
                        ⚠️ No se pudieron cargar las especialidades. Por favor, contacta a soporte.
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>
                    Años de experiencia
                  </label>
                  <select
                    value={formData.professionalInfo?.experience || ''}
                    onChange={e => updateFormData('professionalInfo', 'experience', e.target.value)}
                    className='w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent'
                  >
                    <option value=''>Seleccionar experiencia</option>
                    {experienceOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>
                    Número de empleado
                  </label>
                  <input
                    type='text'
                    value={formData.professionalInfo?.employeeId || ''}
                    onChange={e => updateFormData('professionalInfo', 'employeeId', e.target.value)}
                    className='w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent'
                    placeholder='Número interno de empleado'
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 for Patients: Additional Information */}
          {currentStep === 3 && formData.accountInfo.role === 'patient' && (
            <div className='space-y-6 animate-fadeInUp'>
              <div className='bg-pink-900/30 border border-pink-700 rounded-lg p-6'>
                <h3 className='text-lg font-semibold text-pink-300 mb-4'>
                  Información del Paciente
                </h3>

                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-2'>
                      Información de seguro médico
                    </label>
                    <textarea
                      value={JSON.stringify(formData.patientInfo?.insuranceInfo || {})}
                      onChange={e => {
                        try {
                          const parsed = JSON.parse(e.target.value || '{}');
                          updateFormData('patientInfo', 'insuranceInfo', parsed);
                        } catch {
                          // Ignorar errores de parsing mientras se escribe
                        }
                      }}
                      className='w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent'
                      placeholder='{"proveedor": "IMSS", "numero": "12345", "vigencia": "2024-12-31"}'
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-2'>
                      Contacto de emergencia
                    </label>
                    <textarea
                      value={JSON.stringify(formData.patientInfo?.emergencyContact || {})}
                      onChange={e => {
                        try {
                          const parsed = JSON.parse(e.target.value || '{}');
                          updateFormData('patientInfo', 'emergencyContact', parsed);
                        } catch {
                          // Ignorar errores de parsing mientras se escribe
                        }
                      }}
                      className='w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent'
                      placeholder='{"nombre": "María Pérez", "telefono": "+52 555 987 6543", "relacion": "Madre"}'
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Clinic Information (Skip for patients) */}
          {currentStep === 4 && formData.accountInfo.role !== 'patient' && (
            <div className='space-y-6'>
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-4'>
                  Clínica/Institución *
                </label>

                <div className='flex gap-4 mb-6'>
                  <button
                    type='button'
                    onClick={() => updateFormData('clinicInfo', 'isNewClinic', false)}
                    className={`flex-1 p-4 rounded-lg border text-center transition-all ${
                      !formData.clinicInfo?.isNewClinic
                        ? 'border-cyan-400 bg-cyan-900/30 text-cyan-300'
                        : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <Building className='h-6 w-6 mx-auto mb-2' />
                    <div className='font-medium'>Clínica Existente</div>
                    <div className='text-xs opacity-80'>Unirse a una clínica registrada</div>
                  </button>

                  <button
                    type='button'
                    onClick={() => updateFormData('clinicInfo', 'isNewClinic', true)}
                    className={`flex-1 p-4 rounded-lg border text-center transition-all ${
                      formData.clinicInfo?.isNewClinic
                        ? 'border-cyan-400 bg-cyan-900/30 text-cyan-300'
                        : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <Plus className='h-6 w-6 mx-auto mb-2' />
                    <div className='font-medium'>Nueva Clínica</div>
                    <div className='text-xs opacity-80'>Registrar una nueva institución</div>
                  </button>
                </div>

                {!formData.clinicInfo?.isNewClinic ? (
                  <div>
                    <div className='relative mb-4'>
                      <input
                        type='text'
                        value={clinicSearch}
                        onChange={e => setClinicSearch(e.target.value)}
                        className='w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent'
                        placeholder='Buscar clínica...'
                      />
                      <Search className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' />
                    </div>

                    <div className='max-h-64 overflow-y-auto bg-gray-700 border border-gray-600 rounded-lg'>
                      {filteredClinics.map(clinic => (
                        <button
                          key={clinic.id}
                          type='button'
                          onClick={() => updateFormData('clinicInfo', 'clinicId', clinic.id)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-600 border-b border-gray-600 last:border-b-0 ${
                            formData.clinicInfo?.clinicId === clinic.id ? 'bg-cyan-900/30' : ''
                          }`}
                        >
                          <div className='font-medium text-white'>{clinic.name}</div>
                          <div className='text-sm text-gray-400 capitalize'>{clinic.type}</div>
                          {clinic.address && (
                            <div className='text-xs text-gray-500'>{clinic.address}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-300 mb-2'>
                        Nombre de la clínica *
                      </label>
                      <input
                        type='text'
                        value={formData.clinicInfo?.clinicData?.name || ''}
                        onChange={e =>
                          updateFormData('clinicInfo', 'clinicData', {
                            ...formData.clinicInfo?.clinicData,
                            name: e.target.value,
                          })
                        }
                        className='w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent'
                        placeholder='Hospital General de México'
                        required
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-300 mb-2'>
                        Tipo de institución *
                      </label>
                      <select
                        value={formData.clinicInfo?.clinicData?.type || 'clinic'}
                        onChange={e =>
                          updateFormData('clinicInfo', 'clinicData', {
                            ...formData.clinicInfo?.clinicData,
                            type: e.target.value as
                              | 'hospital'
                              | 'clinic'
                              | 'private_practice'
                              | 'other',
                          })
                        }
                        className='w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent'
                      >
                        <option value='clinic'>Clínica</option>
                        <option value='hospital'>Hospital</option>
                        <option value='private_practice'>Consultorio Privado</option>
                        <option value='other'>Otro</option>
                      </select>
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-300 mb-2'>
                        Dirección
                      </label>
                      <input
                        type='text'
                        value={formData.clinicInfo?.clinicData?.address || ''}
                        onChange={e =>
                          updateFormData('clinicInfo', 'clinicData', {
                            ...formData.clinicInfo?.clinicData,
                            address: e.target.value,
                          })
                        }
                        className='w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent'
                        placeholder='Dirección completa'
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-300 mb-2'>
                        Teléfono de la clínica
                      </label>
                      <input
                        type='tel'
                        value={formData.clinicInfo?.clinicData?.phone || ''}
                        onChange={e =>
                          updateFormData('clinicInfo', 'clinicData', {
                            ...formData.clinicInfo?.clinicData,
                            phone: e.target.value,
                          })
                        }
                        className='w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent'
                        placeholder='+52 555 000 0000'
                      />
                    </div>

                    <div className='md:col-span-2'>
                      <label className='block text-sm font-medium text-gray-300 mb-2'>
                        Email de la clínica
                      </label>
                      <input
                        type='email'
                        value={formData.clinicInfo?.clinicData?.email || ''}
                        onChange={e =>
                          updateFormData('clinicInfo', 'clinicData', {
                            ...formData.clinicInfo?.clinicData,
                            email: e.target.value,
                          })
                        }
                        className='w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent'
                        placeholder='contacto@clinica.com'
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Additional Information */}
          {((currentStep === 5 && formData.accountInfo.role !== 'patient') ||
            (currentStep === 4 && formData.accountInfo.role === 'patient')) && (
            <div className='space-y-6'>
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>
                  Horario de trabajo preferido
                </label>
                <div className='space-y-2'>
                  {workScheduleOptions.map(option => (
                    <label
                      key={option.value}
                      className='flex items-center space-x-3 cursor-pointer'
                    >
                      <input
                        type='radio'
                        name='workSchedule'
                        value={option.value}
                        checked={formData.additionalInfo?.workSchedule === option.value}
                        onChange={e =>
                          updateFormData('additionalInfo', 'workSchedule', e.target.value)
                        }
                        className='w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500'
                      />
                      <span className='text-gray-300'>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>
                  Notas adicionales
                </label>
                <textarea
                  value={formData.additionalInfo?.notes || ''}
                  onChange={e => updateFormData('additionalInfo', 'notes', e.target.value)}
                  rows={4}
                  className='w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent'
                  placeholder='Cualquier información adicional que consideres relevante (subespecialidades, certificaciones, preferencias, etc.)'
                />
              </div>
            </div>
          )}

          {/* Step 6: Confirmation (Step 5 for patients) */}
          {((currentStep === 6 && formData.accountInfo.role !== 'patient') ||
            (currentStep === 5 && formData.accountInfo.role === 'patient')) && (
            <div className='space-y-6'>
              <div className='bg-gray-700/50 rounded-lg p-6'>
                <h3 className='text-lg font-semibold text-white mb-4'>
                  Confirmar información de registro
                </h3>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
                  <div>
                    <span className='text-gray-400'>Nombre:</span>
                    <span className='text-white ml-2'>{formData.personalInfo.fullName}</span>
                  </div>
                  <div>
                    <span className='text-gray-400'>Email:</span>
                    <span className='text-white ml-2'>{formData.personalInfo.email}</span>
                  </div>
                  <div>
                    <span className='text-gray-400'>Tipo de cuenta:</span>
                    <span className='text-white ml-2 capitalize'>
                      {roleOptions.find(r => r.value === formData.accountInfo.role)?.label}
                    </span>
                  </div>
                  <div>
                    <span className='text-gray-400'>Teléfono:</span>
                    <span className='text-white ml-2'>{formData.personalInfo.phone}</span>
                  </div>
                  {formData.professionalInfo?.licenseNumber && (
                    <div>
                      <span className='text-gray-400'>Licencia:</span>
                      <span className='text-white ml-2'>
                        {formData.professionalInfo.licenseNumber}
                      </span>
                    </div>
                  )}
                  {formData.professionalInfo?.specialtyId && (
                    <div>
                      <span className='text-gray-400'>Especialidad:</span>
                      <span className='text-white ml-2'>
                        {
                          specialties.find(s => s.id === formData.professionalInfo?.specialtyId)
                            ?.name
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className='bg-green-900/30 border border-green-700 rounded-lg p-4'>
                <div className='flex items-center'>
                  <CheckCircle className='h-5 w-5 text-green-400 mr-3 flex-shrink-0' />
                  <div>
                    <p className='text-green-300 font-medium'>Listo para completar registro</p>
                    <p className='text-green-200 text-sm mt-1'>
                      Al registrarte, aceptas nuestros términos y condiciones de uso del sistema
                      médico.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className='flex justify-between mt-8 pt-6 border-t border-gray-700'>
            <div>
              {currentStep > 1 && (
                <button
                  type='button'
                  onClick={handlePreviousStep}
                  className='btn-secondary flex items-center px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 hover:border-gray-500 transition-all duration-300 transform hover:scale-105'
                >
                  <ArrowLeft className='h-4 w-4 mr-2 transition-transform duration-200 group-hover:-translate-x-1' />
                  Anterior
                </button>
              )}
            </div>

            <div>
              {currentStep < totalSteps ? (
                <button
                  type='button'
                  onClick={handleNextStep}
                  disabled={loading}
                  className={`btn-primary group flex items-center px-6 py-3 rounded-lg transition-all duration-300 transform ${
                    loading
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed scale-100'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 hover:scale-105 hover:shadow-lg'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      Siguiente
                      <ArrowRight className='h-4 w-4 ml-2 transition-transform duration-200 group-hover:translate-x-1' />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type='button'
                  onClick={handleCompleteRegistration}
                  disabled={loading}
                  className='btn-primary group flex items-center px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-xl'
                >
                  {loading ? (
                    <>
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                      Completando registro...
                    </>
                  ) : (
                    <>
                      <CheckCircle className='h-4 w-4 mr-2' />
                      Completar Registro
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Helper Text */}
          <div className='mt-6 text-center space-y-2'>
            <p className='text-gray-400 text-sm'>
              ¿Necesitas ayuda? Contacta a soporte en
              <span className='text-cyan-400 ml-1'>soporte@deepluxmed.com</span>
            </p>
            {initialEmail && (
              <button
                type='button'
                onClick={() => navigate('/auth')}
                className='text-xs text-gray-500 hover:text-cyan-400 transition-colors'
              >
                ¿Quieres usar un email diferente? Volver al inicio
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
