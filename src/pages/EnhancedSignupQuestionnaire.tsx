import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  User, Phone, Award, Building, Stethoscope, ArrowLeft, ArrowRight, 
  CheckCircle, AlertCircle, Shield, Heart, UserCheck, MapPin,
  Calendar, Mail, Lock, Eye, EyeOff, Plus, Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EnhancedRegistrationData, MedicalSpecialty, Clinic } from '../lib/database.types';

export default function EnhancedSignupQuestionnaire() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
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
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailExists, setEmailExists] = useState(false);

  // Obtener email del estado de navegación
  const initialEmail = location.state?.email || '';
  
  const [formData, setFormData] = useState<EnhancedRegistrationData>({
    personalInfo: {
      fullName: '',
      email: initialEmail,
      phone: '',
      birthDate: '',
      gender: '',
      address: ''
    },
    accountInfo: {
      role: 'doctor',
      password: '',
      confirmPassword: ''
    },
    professionalInfo: {
      licenseNumber: '',
      specialtyId: '',
      experience: '',
      institution: '',
      employeeId: ''
    },
    clinicInfo: {
      clinicId: '',
      isNewClinic: false,
      clinicData: {
        name: '',
        type: 'clinic',
        address: '',
        phone: '',
        email: ''
      }
    },
    patientInfo: {
      primaryDoctorId: '',
      insuranceInfo: {},
      emergencyContact: {}
    },
    additionalInfo: {
      workSchedule: '',
      preferences: {},
      notes: ''
    }
  });

  const loadInitialData = useCallback(async () => {
    // Especialidades de respaldo en caso de que la BD no esté disponible
    const backupSpecialties: MedicalSpecialty[] = [
      { id: '1', name: 'Medicina General', category: 'medical', description: 'Atención médica general', requires_license: true, is_active: true, created_at: new Date().toISOString() },
      { id: '2', name: 'Cardiología', category: 'medical', description: 'Enfermedades del corazón', requires_license: true, is_active: true, created_at: new Date().toISOString() },
      { id: '3', name: 'Pediatría', category: 'medical', description: 'Medicina pediátrica', requires_license: true, is_active: true, created_at: new Date().toISOString() },
      { id: '4', name: 'Neurología', category: 'medical', description: 'Enfermedades del sistema nervioso', requires_license: true, is_active: true, created_at: new Date().toISOString() },
      { id: '5', name: 'Dermatología', category: 'medical', description: 'Enfermedades de la piel', requires_license: true, is_active: true, created_at: new Date().toISOString() },
      { id: '6', name: 'Ginecología y Obstetricia', category: 'surgical', description: 'Salud femenina y reproductiva', requires_license: true, is_active: true, created_at: new Date().toISOString() },
      { id: '7', name: 'Traumatología', category: 'surgical', description: 'Cirugía de huesos y articulaciones', requires_license: true, is_active: true, created_at: new Date().toISOString() },
      { id: '8', name: 'Psiquiatría', category: 'medical', description: 'Salud mental', requires_license: true, is_active: true, created_at: new Date().toISOString() },
      { id: '9', name: 'Medicina Interna', category: 'medical', description: 'Medicina interna de adultos', requires_license: true, is_active: true, created_at: new Date().toISOString() },
      { id: '10', name: 'Cirugía General', category: 'surgical', description: 'Cirugía general', requires_license: true, is_active: true, created_at: new Date().toISOString() },
      { id: '11', name: 'Oftalmología', category: 'surgical', description: 'Cirugía ocular', requires_license: true, is_active: true, created_at: new Date().toISOString() },
      { id: '12', name: 'Urología', category: 'surgical', description: 'Cirugía urológica', requires_license: true, is_active: true, created_at: new Date().toISOString() },
      { id: '13', name: 'Endocrinología', category: 'medical', description: 'Enfermedades endocrinas', requires_license: true, is_active: true, created_at: new Date().toISOString() },
      { id: '14', name: 'Gastroenterología', category: 'medical', description: 'Enfermedades digestivas', requires_license: true, is_active: true, created_at: new Date().toISOString() },
      { id: '15', name: 'Neumología', category: 'medical', description: 'Enfermedades respiratorias', requires_license: true, is_active: true, created_at: new Date().toISOString() },
      { id: '16', name: 'Reumatología', category: 'medical', description: 'Enfermedades reumáticas', requires_license: true, is_active: true, created_at: new Date().toISOString() },
      { id: '17', name: 'Oncología', category: 'medical', description: 'Tratamiento del cáncer', requires_license: true, is_active: true, created_at: new Date().toISOString() },
      { id: '18', name: 'Radiología', category: 'diagnostic', description: 'Diagnóstico por imágenes', requires_license: true, is_active: true, created_at: new Date().toISOString() },
      { id: '19', name: 'Anestesiología', category: 'medical', description: 'Medicina perioperatoria', requires_license: true, is_active: true, created_at: new Date().toISOString() },
      { id: '20', name: 'Medicina de Urgencias', category: 'medical', description: 'Medicina de emergencias', requires_license: true, is_active: true, created_at: new Date().toISOString() }
    ];

    setSpecialtiesLoading(true);
    try {
      // Load medical specialties
      console.log('🔍 Cargando especialidades médicas...');
      const { data: specialtiesData, error: specialtiesError } = await supabase
        .from('medical_specialties')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (specialtiesError) {
        console.error('❌ Error al cargar especialidades desde BD:', specialtiesError);
        console.log('🔄 Usando especialidades de respaldo...');
        setSpecialties(backupSpecialties);
        setUseBackupSpecialties(true);
      } else if (!specialtiesData || specialtiesData.length === 0) {
        console.log('⚠️ No se encontraron especialidades en BD, usando respaldo...');
        setSpecialties(backupSpecialties);
        setUseBackupSpecialties(true);
      } else {
        console.log('✅ Especialidades cargadas desde BD:', specialtiesData.length);
        console.log('📋 Lista de especialidades:', specialtiesData.map(s => s.name));
        setSpecialties(specialtiesData);
        setUseBackupSpecialties(false);
      }

      // Load existing clinics
      const { data: clinicsData, error: clinicsError } = await supabase
        .from('clinics')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (clinicsError) {
        console.error('❌ Error al cargar clínicas:', clinicsError);
      } else {
        setClinics(clinicsData || []);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      console.log('🔄 Usando datos de respaldo...');
      setSpecialties(backupSpecialties);
      setUseBackupSpecialties(true);
      setError('Usando datos locales (sin conexión a servidor)');
    } finally {
      setSpecialtiesLoading(false);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Filter specialties when search changes
  useEffect(() => {
    console.log('🔍 Filtrando especialidades. Búsqueda:', specialtySearch, 'Total disponibles:', specialties.length);
    if (specialtySearch.trim() === '') {
      setFilteredSpecialties(specialties);
      console.log('📋 Mostrando todas las especialidades:', specialties.length);
    } else {
      const filtered = specialties.filter(specialty =>
        specialty.name.toLowerCase().includes(specialtySearch.toLowerCase()) ||
        specialty.category.toLowerCase().includes(specialtySearch.toLowerCase())
      );
      setFilteredSpecialties(filtered);
      console.log('🔎 Especialidades filtradas:', filtered.length, 'para búsqueda:', specialtySearch);
    }
  }, [specialtySearch, specialties]);

  // Filter clinics when search changes
  useEffect(() => {
    if (clinicSearch.trim() === '') {
      setFilteredClinics(clinics);
    } else {
      setFilteredClinics(
        clinics.filter(clinic =>
          clinic.name.toLowerCase().includes(clinicSearch.toLowerCase()) ||
          clinic.type.toLowerCase().includes(clinicSearch.toLowerCase())
        )
      );
    }
  }, [clinicSearch, clinics]);

  // Función para verificar si el email ya existe
  const checkEmailExists = useCallback(async (email: string): Promise<boolean> => {
    if (!email || !email.includes('@')) return false;
    
    try {
      setEmailCheckLoading(true);
      
      // Verificar en la tabla profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .single();
      
      if (profileData && !profileError) {
        console.log('📧 Email encontrado en profiles:', email);
        return true;
      }
      
      // También intentamos con signUp para verificar en auth.users
      // Esto fallará si el email ya existe, lo cual es lo que queremos detectar
      try {
        const { error: authError } = await supabase.auth.signUp({
          email: email,
          password: 'temp_check_password_123!@#'
        });
        
        if (authError && (
          authError.message.includes('already') || 
          authError.message.includes('registered') ||
          authError.message.includes('exists') ||
          authError.message.includes('User already')
        )) {
          console.log('📧 Email encontrado en auth.users:', email);
          return true;
        }
      } catch (tempError) {
        console.log('⚠️ Error en verificación auth:', tempError);
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Error verificando email:', error);
      return false;
    } finally {
      setEmailCheckLoading(false);
    }
  }, []);

  // Verificar email cuando cambie y no esté pre-validado
  useEffect(() => {
    if (formData.personalInfo.email && 
        !initialEmail && 
        formData.personalInfo.email !== initialEmail) {
      
      const debounceTimer = setTimeout(async () => {
        const exists = await checkEmailExists(formData.personalInfo.email);
        setEmailExists(exists);
      }, 1000); // Debounce de 1 segundo
      
      return () => clearTimeout(debounceTimer);
    } else {
      setEmailExists(false);
    }
  }, [formData.personalInfo.email, initialEmail, checkEmailExists]);

  const updateFormData = <K extends keyof EnhancedRegistrationData>(
    section: K,
    field: keyof EnhancedRegistrationData[K],
    value: string | boolean | Record<string, unknown> | undefined
  ) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    setError(null);
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
        if (emailExists) {
          setError('Este correo electrónico ya está registrado');
          return false;
        }
        if (!formData.personalInfo.phone.trim()) {
          setError('El teléfono es requerido');
          return false;
        }
        return true;

      case 2: // Información de cuenta y rol
        if (!formData.accountInfo.password) {
          setError('La contraseña es requerida');
          return false;
        }
        if (formData.accountInfo.password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres');
          return false;
        }
        if (formData.accountInfo.password !== formData.accountInfo.confirmPassword) {
          setError('Las contraseñas no coinciden');
          return false;
        }
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

  const handleNextStep = () => {
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

      // 1. Verificación final de email antes de proceder
      console.log('🔍 Verificación final de email antes del registro...');
      const emailAlreadyExists = await checkEmailExists(formData.personalInfo.email);
      if (emailAlreadyExists) {
        setError('Este correo electrónico ya está registrado. Por favor, inicia sesión con tu cuenta existente.');
        return;
      }

      // 2. Crear cuenta de usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.personalInfo.email,
        password: formData.accountInfo.password,
        options: {
          data: {
            full_name: formData.personalInfo.fullName,
            role: formData.accountInfo.role
          } as Record<string, string>
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No se pudo crear el usuario');

      const userId = authData.user.id;

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
              director_license: formData.professionalInfo?.licenseNumber
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
        specialty_id: formData.professionalInfo?.specialtyId,
        employee_id: formData.professionalInfo?.employeeId,
        clinic_id: clinicId,
        profile_completed: true,
        is_active: true,
        additional_info: {
          birth_date: formData.personalInfo.birthDate,
          gender: formData.personalInfo.gender,
          address: formData.personalInfo.address,
          experience: formData.professionalInfo?.experience,
          work_schedule: formData.additionalInfo?.workSchedule,
          notes: formData.additionalInfo?.notes
        }
      };

      // Crear perfil de usuario - manejar errores de RLS
      console.log('📝 Creando perfil de usuario...');
      const { error: profileError } = await supabase
        .from('profiles')
        .insert(profileData);

      if (profileError) {
        console.error('❌ Error al crear perfil:', profileError);
        
        // Si es error de RLS, intentar con una estrategia diferente
        if (profileError.message.includes('row-level security policy')) {
          console.log('⚠️ Error de RLS detectado, intentando estrategia alternativa...');
          
          // Intentar actualizar en lugar de insertar (upsert)
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert(profileData, { onConflict: 'id' });
          
          if (upsertError) {
            console.error('❌ Error en upsert:', upsertError);
            throw new Error(`Error al crear perfil: ${upsertError.message}`);
          } else {
            console.log('✅ Perfil creado usando upsert');
          }
        } else {
          throw new Error(`Error al crear perfil: ${profileError.message}`);
        }
      } else {
        console.log('✅ Perfil creado exitosamente');
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
          is_active: true
        };

        const { error: patientError } = await supabase
          .from('patients')
          .insert(patientData);

        if (patientError) throw patientError;
      }

      // 5. Crear relación clínica-usuario si corresponde
      if (clinicId && formData.accountInfo.role !== 'patient') {
        const { error: relationError } = await supabase
          .from('clinic_user_relationships')
          .insert({
            clinic_id: clinicId,
            user_id: userId,
            role_in_clinic: formData.accountInfo.role as string,
            is_active: true
          });

        if (relationError) throw relationError;
      }

      console.log('✅ Registro completado exitosamente');
      
      // Mostrar mensaje de éxito
      setError(null);
      
      // Redirigir según el estado de confirmación de email
      setTimeout(() => {
        if (authData.user.email_confirmed_at) {
          navigate('/dashboard');
        } else {
          // Mostrar mensaje de confirmación de email
          setError('¡Cuenta creada! Revisa tu correo electrónico para confirmar tu cuenta antes de iniciar sesión.');
          setTimeout(() => navigate('/auth'), 3000);
        }
      }, 1000);

    } catch (err: unknown) {
      console.error('Error durante el registro:', err);
      setError(err instanceof Error ? err.message : 'Error durante el registro');
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = (step: number): string => {
    switch (step) {
      case 1: return 'Información Personal';
      case 2: return 'Configurar Contraseña y Rol';
      case 3: return 'Información Profesional';
      case 4: return 'Clínica/Institución';
      case 5: return 'Información Adicional';
      case 6: return 'Confirmación y Finalizar';
      default: return 'Registro';
    }
  };

  const getStepDescription = (step: number): string => {
    switch (step) {
      case 1: return 'Datos personales y de contacto';
      case 2: return initialEmail ? 'Crear contraseña segura y seleccionar tipo de cuenta' : 'Credenciales de acceso y tipo de cuenta';
      case 3: return 'Licencias y especialidades médicas';
      case 4: return 'Afiliación institucional';
      case 5: return 'Horarios y preferencias';
      case 6: return 'Revisar y completar registro';
      default: return '';
    }
  };

  const roleOptions = useMemo(() => [
    {
      value: 'doctor',
      label: 'Doctor/Médico',
      icon: Stethoscope,
      description: 'Médico certificado con acceso completo a pacientes',
      color: 'from-blue-500 to-cyan-600',
      enabled: true
    },
    {
      value: 'health_staff',
      label: 'Personal de Salud',
      icon: UserCheck,
      description: 'Enfermería, fisioterapia, dentistas, etc. (Próximamente disponible)',
      color: 'from-green-500 to-emerald-600',
      enabled: false
    },
    {
      value: 'admin_staff',
      label: 'Personal Administrativo',
      icon: Building,
      description: 'Administradores de clínica y personal de gestión',
      color: 'from-purple-500 to-indigo-600',
      enabled: true
    },
    {
      value: 'patient',
      label: 'Paciente',
      icon: Heart,
      description: 'Usuario paciente con acceso a su información médica (Próximamente disponible)',
      color: 'from-pink-500 to-rose-600',
      enabled: false
    }
  ], []);

  // Verificar y resetear rol si está deshabilitado
  useEffect(() => {
    if (formData.accountInfo.role) {
      const selectedRole = roleOptions.find(role => role.value === formData.accountInfo.role);
      if (!selectedRole?.enabled) {
        console.log('🔄 Reseteando rol deshabilitado:', formData.accountInfo.role);
        setFormData(prev => ({
          ...prev,
          accountInfo: {
            ...prev.accountInfo,
            role: 'doctor' // Valor por defecto a doctor
          }
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
    { value: '20+', label: 'Más de 20 años' }
  ];

  const workScheduleOptions = [
    { value: 'morning', label: 'Turno matutino (6:00 - 14:00)' },
    { value: 'afternoon', label: 'Turno vespertino (14:00 - 22:00)' },
    { value: 'night', label: 'Turno nocturno (22:00 - 6:00)' },
    { value: 'mixed', label: 'Turnos rotativos' },
    { value: 'flexible', label: 'Horario flexible' },
    { value: 'on-call', label: 'Disponibilidad 24/7' }
  ];

  const totalSteps = formData.accountInfo.role === 'patient' ? 5 : 6; // Pacientes tienen un paso menos

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center mb-2">
                <Stethoscope className="h-8 w-8 text-white mr-3" />
                <h1 className="text-2xl font-bold text-white">Registro Completo</h1>
              </div>
              <p className="text-cyan-100">
                Paso {currentStep} de {totalSteps}: {getStepTitle(currentStep)}
              </p>
              <p className="text-cyan-200 text-sm mt-1">
                {getStepDescription(currentStep)}
              </p>
              {/* Mostrar email del usuario */}
              {formData.personalInfo.email && (
                <div className="flex items-center mt-3 px-3 py-1 bg-white/10 rounded-full">
                  <Mail className="h-4 w-4 text-cyan-200 mr-2" />
                  <span className="text-cyan-100 text-sm font-medium">
                    {formData.personalInfo.email}
                  </span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-white/80 text-sm">Sistema:</div>
              <div className="text-white font-medium">ExpedienteDLM</div>
              {location.state?.fromRegistration && (
                <div className="text-cyan-200 text-xs mt-1">
                  ✨ Registro iniciado
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between mb-2">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i + 1}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    i + 1 <= currentStep
                      ? 'bg-white text-cyan-600'
                      : 'bg-cyan-700 text-cyan-200'
                  }`}
                >
                  {i + 1 < currentStep ? <CheckCircle className="h-4 w-4" /> : i + 1}
                </div>
              ))}
            </div>
            <div className="h-2 bg-cyan-700 rounded-full">
              <div
                className="h-2 bg-white rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {error && (
            <div className="mb-6 bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-300">{error}</p>
                  {(error.includes('ya está registrado') || error.includes('already')) && (
                    <div className="mt-2 pt-2 border-t border-red-700">
                      <p className="text-red-200 text-sm">
                        ¿Ya tienes una cuenta? 
                        <button
                          type="button"
                          onClick={() => navigate('/auth')}
                          className="ml-1 px-2 py-1 bg-red-700 hover:bg-red-600 text-white rounded text-xs transition-colors"
                        >
                          Iniciar Sesión
                        </button>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre completo *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.personalInfo.fullName}
                      onChange={(e) => updateFormData('personalInfo', 'fullName', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                      placeholder="Dr. Juan Pérez García"
                      required
                    />
                    <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Correo electrónico *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={formData.personalInfo.email}
                      onChange={(e) => updateFormData('personalInfo', 'email', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 transition-colors ${
                        initialEmail 
                          ? 'bg-gray-600/50 border-gray-500 cursor-not-allowed focus:ring-gray-500 focus:border-gray-500' 
                          : emailExists
                          ? 'bg-gray-700 border-red-600 focus:ring-red-400 focus:border-red-400'
                          : emailCheckLoading
                          ? 'bg-gray-700 border-yellow-600 focus:ring-yellow-400 focus:border-yellow-400'
                          : 'bg-gray-700 border-gray-600 focus:ring-cyan-400 focus:border-cyan-400'
                      }`}
                      placeholder="correo@ejemplo.com"
                      required
                      readOnly={!!initialEmail}
                      disabled={!!initialEmail}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {emailCheckLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-400"></div>
                      ) : emailExists ? (
                        <AlertCircle className="h-5 w-5 text-red-400" />
                      ) : formData.personalInfo.email && !initialEmail ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <Mail className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                  
                  {/* Estados del email */}
                  {initialEmail && (
                    <p className="text-xs text-cyan-400 mt-1">
                      ✅ Email confirmado desde el paso anterior
                    </p>
                  )}
                  {!initialEmail && emailCheckLoading && (
                    <p className="text-xs text-yellow-400 mt-1">
                      🔍 Verificando disponibilidad del email...
                    </p>
                  )}
                  {!initialEmail && emailExists && (
                    <div className="mt-2 p-3 bg-red-900/30 border border-red-700 rounded-lg">
                      <div className="flex items-start">
                        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-red-300 text-sm font-medium">
                            Este correo ya está registrado
                          </p>
                          <p className="text-red-200 text-xs mt-1">
                            ¿Ya tienes una cuenta? 
                            <button
                              type="button"
                              onClick={() => navigate('/auth')}
                              className="ml-1 underline hover:text-red-100 transition-colors"
                            >
                              Inicia sesión aquí
                            </button>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {!initialEmail && formData.personalInfo.email && !emailExists && !emailCheckLoading && (
                    <p className="text-xs text-green-400 mt-1">
                      ✅ Email disponible
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Teléfono *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={formData.personalInfo.phone}
                      onChange={(e) => updateFormData('personalInfo', 'phone', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                      placeholder="+52 555 123 4567"
                      required
                    />
                    <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fecha de nacimiento
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.personalInfo.birthDate}
                      onChange={(e) => updateFormData('personalInfo', 'birthDate', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Género
                  </label>
                  <select
                    value={formData.personalInfo.gender}
                    onChange={(e) => updateFormData('personalInfo', 'gender', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  >
                    <option value="">Seleccionar género</option>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro</option>
                    <option value="no_especificado">Prefiero no especificar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Dirección
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.personalInfo.address}
                      onChange={(e) => updateFormData('personalInfo', 'address', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                      placeholder="Calle, Número, Colonia, Ciudad"
                    />
                    <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Account Info and Role Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {initialEmail && (
                <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-green-300 font-medium">Email confirmado</p>
                      <p className="text-green-200 text-sm mt-1">
                        Tu dirección de email <span className="font-mono">{initialEmail}</span> está lista. 
                        Ahora configura tu contraseña y selecciona tu tipo de cuenta.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  Tipo de cuenta *
                </label>
                <div className="mb-4 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-5 h-5 bg-blue-400 rounded-full flex items-center justify-center">
                        <span className="text-blue-900 text-xs font-bold">ℹ</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-blue-300 text-sm font-medium mb-1">
                        Tipos de cuenta disponibles
                      </p>
                      <p className="text-blue-200 text-xs">
                        Actualmente solo pueden registrarse <strong>Doctores/Médicos</strong> y <strong>Personal Administrativo</strong>. 
                        Los otros tipos de cuenta estarán disponibles próximamente.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roleOptions.map((role) => {
                    const Icon = role.icon;
                    const isSelected = formData.accountInfo.role === role.value;
                    const isDisabled = !role.enabled;
                    
                    return (
                      <button
                        key={role.value}
                        type="button"
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
                          <div className="absolute top-2 right-2">
                            <div className="bg-gray-600 text-gray-300 text-xs px-2 py-1 rounded-full">
                              Próximamente
                            </div>
                          </div>
                        )}
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${role.color} flex items-center justify-center mb-3 ${
                          isDisabled ? 'opacity-50' : ''
                        }`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className={`font-medium mb-1 ${
                          isDisabled ? 'text-gray-500' : 'text-white'
                        }`}>
                          {role.label}
                        </div>
                        <div className={`text-sm ${
                          isDisabled ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          {role.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.accountInfo.password}
                      onChange={(e) => updateFormData('accountInfo', 'password', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-20 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-400">Mínimo 6 caracteres</p>
                    {formData.accountInfo.password && (
                      <div className="flex items-center text-xs">
                        {formData.accountInfo.password.length >= 8 ? (
                          <span className="text-green-400">✓ Fuerte</span>
                        ) : formData.accountInfo.password.length >= 6 ? (
                          <span className="text-yellow-400">⚠ Moderada</span>
                        ) : (
                          <span className="text-red-400">✗ Débil</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirmar contraseña *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.accountInfo.confirmPassword}
                      onChange={(e) => updateFormData('accountInfo', 'confirmPassword', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-20 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-blue-400 mr-3" />
                  <div>
                    <p className="text-blue-300 font-medium">
                      Seguridad de la cuenta
                    </p>
                    <p className="text-blue-200 text-sm mt-1">
                      Tu contraseña estará encriptada y protegida según estándares de seguridad médica.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Professional Information (Skip for patients) */}
          {currentStep === 3 && formData.accountInfo.role !== 'patient' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cédula/Licencia profesional *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.professionalInfo?.licenseNumber || ''}
                      onChange={(e) => updateFormData('professionalInfo', 'licenseNumber', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                      placeholder="Ej: 12345678"
                      required
                    />
                    <Award className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  </div>
                </div>

                {formData.accountInfo.role === 'doctor' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Especialidad médica *
                      {useBackupSpecialties && (
                        <span className="ml-2 text-xs text-yellow-400">(datos locales)</span>
                      )}
                    </label>
                    
                    {specialtiesLoading && (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
                        <span className="ml-2 text-gray-400">Cargando especialidades...</span>
                      </div>
                    )}
                    
                    {!specialtiesLoading && formData.professionalInfo?.specialtyId && (
                      <div className="mb-2 px-3 py-2 bg-green-900/30 border border-green-700 rounded-lg text-green-300 text-sm">
                        ✅ Especialidad seleccionada: {specialties.find(s => s.id === formData.professionalInfo?.specialtyId)?.name}
                        <button
                          type="button"
                          onClick={() => {
                            updateFormData('professionalInfo', 'specialtyId', '');
                            setSpecialtySearch('');
                            setIsSpecialtyDropdownOpen(true);
                          }}
                          className="ml-2 text-green-400 hover:text-green-300"
                        >
                          (cambiar)
                        </button>
                      </div>
                    )}
                    
                    {!specialtiesLoading && !formData.professionalInfo?.specialtyId && (
                      <div className="relative">
                        <input
                          type="text"
                          value={specialtySearch}
                          onChange={(e) => {
                            setSpecialtySearch(e.target.value);
                            setIsSpecialtyDropdownOpen(true);
                          }}
                          onFocus={() => {
                            setIsSpecialtyDropdownOpen(true);
                            if (!specialtySearch && filteredSpecialties.length === 0) {
                              setFilteredSpecialties(specialties);
                            }
                          }}
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                          placeholder={specialties.length > 0 ? "Buscar especialidad... (ej: cardiología, medicina)" : "No hay especialidades disponibles"}
                          disabled={specialties.length === 0}
                        />
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      </div>
                    )}
                    
                    {isSpecialtyDropdownOpen && filteredSpecialties.length > 0 && (
                      <div className="relative">
                        <div className="absolute top-2 left-0 right-0 max-h-48 overflow-y-auto bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-50">
                          {filteredSpecialties.map((specialty) => (
                            <button
                              key={specialty.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                updateFormData('professionalInfo', 'specialtyId', specialty.id);
                                setSpecialtySearch('');
                                setIsSpecialtyDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-gray-600 text-white border-b border-gray-600 last:border-b-0 transition-colors"
                            >
                              <div className="font-medium">{specialty.name}</div>
                              <div className="text-sm text-gray-400 capitalize">{specialty.category}</div>
                            </button>
                          ))}
                        </div>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setIsSpecialtyDropdownOpen(false)}
                        ></div>
                      </div>
                    )}
                    
                    {isSpecialtyDropdownOpen && filteredSpecialties.length === 0 && specialtySearch && (
                      <div className="mt-2 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 text-sm">
                        No se encontraron especialidades que coincidan con "{specialtySearch}"
                      </div>
                    )}
                    
                    {specialties.length === 0 && !specialtiesLoading && (
                      <div className="mt-2 px-4 py-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                        ⚠️ No se pudieron cargar las especialidades. Por favor, contacta a soporte.
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Años de experiencia
                  </label>
                  <select
                    value={formData.professionalInfo?.experience || ''}
                    onChange={(e) => updateFormData('professionalInfo', 'experience', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  >
                    <option value="">Seleccionar experiencia</option>
                    {experienceOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Número de empleado
                  </label>
                  <input
                    type="text"
                    value={formData.professionalInfo?.employeeId || ''}
                    onChange={(e) => updateFormData('professionalInfo', 'employeeId', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                    placeholder="Número interno de empleado"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 for Patients: Additional Information */}
          {currentStep === 3 && formData.accountInfo.role === 'patient' && (
            <div className="space-y-6">
              <div className="bg-pink-900/30 border border-pink-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-pink-300 mb-4">
                  Información del Paciente
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Información de seguro médico
                    </label>
                    <textarea
                      value={JSON.stringify(formData.patientInfo?.insuranceInfo || {})}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value || '{}');
                          updateFormData('patientInfo', 'insuranceInfo', parsed);
                        } catch {
                          // Ignorar errores de parsing mientras se escribe
                        }
                      }}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                      placeholder='{"proveedor": "IMSS", "numero": "12345", "vigencia": "2024-12-31"}'
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Contacto de emergencia
                    </label>
                    <textarea
                      value={JSON.stringify(formData.patientInfo?.emergencyContact || {})}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value || '{}');
                          updateFormData('patientInfo', 'emergencyContact', parsed);
                        } catch {
                          // Ignorar errores de parsing mientras se escribe
                        }
                      }}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
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
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  Clínica/Institución *
                </label>
                
                <div className="flex gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => updateFormData('clinicInfo', 'isNewClinic', false)}
                    className={`flex-1 p-4 rounded-lg border text-center transition-all ${
                      !formData.clinicInfo?.isNewClinic
                        ? 'border-cyan-400 bg-cyan-900/30 text-cyan-300'
                        : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <Building className="h-6 w-6 mx-auto mb-2" />
                    <div className="font-medium">Clínica Existente</div>
                    <div className="text-xs opacity-80">Unirse a una clínica registrada</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => updateFormData('clinicInfo', 'isNewClinic', true)}
                    className={`flex-1 p-4 rounded-lg border text-center transition-all ${
                      formData.clinicInfo?.isNewClinic
                        ? 'border-cyan-400 bg-cyan-900/30 text-cyan-300'
                        : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <Plus className="h-6 w-6 mx-auto mb-2" />
                    <div className="font-medium">Nueva Clínica</div>
                    <div className="text-xs opacity-80">Registrar una nueva institución</div>
                  </button>
                </div>

                {!formData.clinicInfo?.isNewClinic ? (
                  <div>
                    <div className="relative mb-4">
                      <input
                        type="text"
                        value={clinicSearch}
                        onChange={(e) => setClinicSearch(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                        placeholder="Buscar clínica..."
                      />
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto bg-gray-700 border border-gray-600 rounded-lg">
                      {filteredClinics.map((clinic) => (
                        <button
                          key={clinic.id}
                          type="button"
                          onClick={() => updateFormData('clinicInfo', 'clinicId', clinic.id)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-600 border-b border-gray-600 last:border-b-0 ${
                            formData.clinicInfo?.clinicId === clinic.id ? 'bg-cyan-900/30' : ''
                          }`}
                        >
                          <div className="font-medium text-white">{clinic.name}</div>
                          <div className="text-sm text-gray-400 capitalize">{clinic.type}</div>
                          {clinic.address && (
                            <div className="text-xs text-gray-500">{clinic.address}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Nombre de la clínica *
                      </label>
                      <input
                        type="text"
                        value={formData.clinicInfo?.clinicData?.name || ''}
                        onChange={(e) => updateFormData('clinicInfo', 'clinicData', {
                          ...formData.clinicInfo?.clinicData,
                          name: e.target.value
                        })}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                        placeholder="Hospital General de México"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Tipo de institución *
                      </label>
                      <select
                        value={formData.clinicInfo?.clinicData?.type || 'clinic'}
                        onChange={(e) => updateFormData('clinicInfo', 'clinicData', {
                          ...formData.clinicInfo?.clinicData,
                          type: e.target.value as 'hospital' | 'clinic' | 'private_practice' | 'other'
                        })}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                      >
                        <option value="clinic">Clínica</option>
                        <option value="hospital">Hospital</option>
                        <option value="private_practice">Consultorio Privado</option>
                        <option value="other">Otro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Dirección
                      </label>
                      <input
                        type="text"
                        value={formData.clinicInfo?.clinicData?.address || ''}
                        onChange={(e) => updateFormData('clinicInfo', 'clinicData', {
                          ...formData.clinicInfo?.clinicData,
                          address: e.target.value
                        })}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                        placeholder="Dirección completa"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Teléfono de la clínica
                      </label>
                      <input
                        type="tel"
                        value={formData.clinicInfo?.clinicData?.phone || ''}
                        onChange={(e) => updateFormData('clinicInfo', 'clinicData', {
                          ...formData.clinicInfo?.clinicData,
                          phone: e.target.value
                        })}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                        placeholder="+52 555 000 0000"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email de la clínica
                      </label>
                      <input
                        type="email"
                        value={formData.clinicInfo?.clinicData?.email || ''}
                        onChange={(e) => updateFormData('clinicInfo', 'clinicData', {
                          ...formData.clinicInfo?.clinicData,
                          email: e.target.value
                        })}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                        placeholder="contacto@clinica.com"
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
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Horario de trabajo preferido
                </label>
                <div className="space-y-2">
                  {workScheduleOptions.map((option) => (
                    <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="workSchedule"
                        value={option.value}
                        checked={formData.additionalInfo?.workSchedule === option.value}
                        onChange={(e) => updateFormData('additionalInfo', 'workSchedule', e.target.value)}
                        className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500"
                      />
                      <span className="text-gray-300">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notas adicionales
                </label>
                <textarea
                  value={formData.additionalInfo?.notes || ''}
                  onChange={(e) => updateFormData('additionalInfo', 'notes', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  placeholder="Cualquier información adicional que consideres relevante (subespecialidades, certificaciones, preferencias, etc.)"
                />
              </div>
            </div>
          )}

          {/* Step 6: Confirmation (Step 5 for patients) */}
          {((currentStep === 6 && formData.accountInfo.role !== 'patient') || 
            (currentStep === 5 && formData.accountInfo.role === 'patient')) && (
            <div className="space-y-6">
              <div className="bg-gray-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Confirmar información de registro
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Nombre:</span>
                    <span className="text-white ml-2">{formData.personalInfo.fullName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white ml-2">{formData.personalInfo.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Tipo de cuenta:</span>
                    <span className="text-white ml-2 capitalize">
                      {roleOptions.find(r => r.value === formData.accountInfo.role)?.label}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Teléfono:</span>
                    <span className="text-white ml-2">{formData.personalInfo.phone}</span>
                  </div>
                  {formData.professionalInfo?.licenseNumber && (
                    <div>
                      <span className="text-gray-400">Licencia:</span>
                      <span className="text-white ml-2">{formData.professionalInfo.licenseNumber}</span>
                    </div>
                  )}
                  {formData.professionalInfo?.specialtyId && (
                    <div>
                      <span className="text-gray-400">Especialidad:</span>
                      <span className="text-white ml-2">
                        {specialties.find(s => s.id === formData.professionalInfo?.specialtyId)?.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-green-300 font-medium">
                      Listo para completar registro
                    </p>
                    <p className="text-green-200 text-sm mt-1">
                      Al registrarte, aceptas nuestros términos y condiciones de uso del sistema médico.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-700">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  className="flex items-center px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-all duration-300"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Anterior
                </button>
              )}
            </div>

            <div>
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-300"
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCompleteRegistration}
                  disabled={loading}
                  className="flex items-center px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Completando registro...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Completar Registro
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Helper Text */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-gray-400 text-sm">
              ¿Necesitas ayuda? Contacta a soporte en 
              <span className="text-cyan-400 ml-1">soporte@deepluxmed.com</span>
            </p>
            {initialEmail && (
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="text-xs text-gray-500 hover:text-cyan-400 transition-colors"
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