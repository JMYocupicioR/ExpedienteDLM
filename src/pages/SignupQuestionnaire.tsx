import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Phone, Award, Building, Users, Stethoscope, ArrowLeft, ArrowRight, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface QuestionnaireData {
  fullName: string;
  role: 'doctor' | 'nurse' | 'administrator';
  specialty: string;
  licenseNumber: string;
  phone: string;
  clinicName: string;
  experience: string;
  workSchedule: string;
  additionalInfo: string;
}

export default function SignupQuestionnaire() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [formData, setFormData] = useState<QuestionnaireData>({
    fullName: '',
    role: 'doctor',
    specialty: '',
    licenseNumber: '',
    phone: '',
    clinicName: '',
    experience: '',
    workSchedule: '',
    additionalInfo: ''
  });

  const medicalSpecialties = [
    'Medicina General',
    'Medicina Interna',
    'Cardiología',
    'Neurología',
    'Pediatría',
    'Ginecología',
    'Oftalmología',
    'Dermatología',
    'Traumatología',
    'Anestesiología',
    'Radiología',
    'Psiquiatría',
    'Urgencias',
    'Cirugía General',
    'Endocrinología',
    'Geriatría',
    'Oncología',
    'Neumología',
    'Urología',
    'Otorrinolaringología',
    'Reumatología',
    'Hematología',
    'Nefrología',
    'Gastroenterología',
    'Infectología'
  ];

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

  // Verificar si el usuario viene del proceso de registro
  useEffect(() => {
    const checkAuthState = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        // Si no hay sesión, redirigir al login
        navigate('/auth');
        return;
      }

      // Verificar si ya tiene perfil completado
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile && profile.full_name) {
        // Si ya tiene perfil, ir al dashboard
        navigate('/dashboard');
        return;
      }

      setUserId(session.user.id);
      setUserEmail(session.user.email || '');
    };

    checkAuthState();
  }, [navigate]);

  const updateFormData = (field: keyof QuestionnaireData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.fullName.trim()) {
          setError('El nombre completo es requerido');
          return false;
        }
        if (!formData.phone.trim()) {
          setError('El teléfono es requerido');
          return false;
        }
        if (!formData.role) {
          setError('Debe seleccionar un rol');
          return false;
        }
        return true;

      case 2:
        if (!formData.licenseNumber.trim()) {
          setError('La cédula/licencia profesional es requerida');
          return false;
        }
        if (formData.role === 'doctor' && !formData.specialty) {
          setError('La especialidad es requerida para doctores');
          return false;
        }
        if (!formData.experience) {
          setError('Debe seleccionar los años de experiencia');
          return false;
        }
        return true;

      case 3:
        // Paso 3 es opcional (información adicional)
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

  const handleCompleteProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!userId) {
        throw new Error('No se encontró información del usuario');
      }

      // Crear el perfil completo
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: userEmail,
          full_name: formData.fullName,
          role: formData.role,
          specialty: formData.role === 'doctor' ? formData.specialty : null,
          license_number: formData.licenseNumber,
          phone: formData.phone,
          schedule: formData.workSchedule ? {
            type: formData.workSchedule,
            notes: formData.additionalInfo
          } : null,
          prescription_style: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        throw new Error(`Error al guardar el perfil: ${profileError.message}`);
      }

      // Redirigir al dashboard
      navigate('/dashboard');
      
    } catch (err: any) {
      console.error('Error completing profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = (step: number): string => {
    switch (step) {
      case 1: return 'Información Personal';
      case 2: return 'Información Profesional';
      case 3: return 'Información Adicional';
      case 4: return 'Confirmación';
      default: return 'Registro';
    }
  };

  const getStepDescription = (step: number): string => {
    switch (step) {
      case 1: return 'Datos básicos de contacto';
      case 2: return 'Credenciales y experiencia médica';
      case 3: return 'Detalles de trabajo y preferencias';
      case 4: return 'Revisar y completar registro';
      default: return '';
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center mb-2">
                <Stethoscope className="h-8 w-8 text-white mr-3" />
                <h1 className="text-2xl font-bold text-white">Completar Registro</h1>
              </div>
              <p className="text-cyan-100">
                Paso {currentStep} de 4: {getStepTitle(currentStep)}
              </p>
              <p className="text-cyan-200 text-sm mt-1">
                {getStepDescription(currentStep)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-white/80 text-sm">Usuario:</div>
              <div className="text-white font-medium">{userEmail}</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between mb-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step <= currentStep
                      ? 'bg-white text-cyan-600'
                      : 'bg-cyan-700 text-cyan-200'
                  }`}
                >
                  {step < currentStep ? <CheckCircle className="h-4 w-4" /> : step}
                </div>
              ))}
            </div>
            <div className="h-2 bg-cyan-700 rounded-full">
              <div
                className="h-2 bg-white rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {error && (
            <div className="mb-6 bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre completo *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => updateFormData('fullName', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                    placeholder="Dr. Juan Pérez García"
                    required
                  />
                  <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Teléfono profesional *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateFormData('phone', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                    placeholder="+52 555 123 4567"
                    required
                  />
                  <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rol profesional *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { value: 'doctor', label: 'Doctor(a)', icon: Stethoscope, description: 'Médico certificado' },
                    { value: 'nurse', label: 'Enfermero(a)', icon: Users, description: 'Personal de enfermería' },
                    { value: 'administrator', label: 'Administrador(a)', icon: Building, description: 'Personal administrativo' }
                  ].map((role) => {
                    const Icon = role.icon;
                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => updateFormData('role', role.value)}
                        className={`p-4 rounded-lg border text-left transition-all ${
                          formData.role === role.value
                            ? 'border-cyan-400 bg-cyan-900/30 text-cyan-300'
                            : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <Icon className="h-6 w-6 mb-2" />
                        <div className="font-medium">{role.label}</div>
                        <div className="text-xs opacity-80">{role.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Professional Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {formData.role === 'doctor' ? 'Cédula profesional *' : 'Número de licencia *'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => updateFormData('licenseNumber', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                    placeholder="Ej: 12345678"
                    required
                  />
                  <Award className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                </div>
              </div>

              {formData.role === 'doctor' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Especialidad médica *
                  </label>
                  <select
                    value={formData.specialty}
                    onChange={(e) => updateFormData('specialty', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                    required
                  >
                    <option value="">Selecciona tu especialidad</option>
                    {medicalSpecialties.map(specialty => (
                      <option key={specialty} value={specialty}>{specialty}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Años de experiencia *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {experienceOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateFormData('experience', option.value)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        formData.experience === option.value
                          ? 'border-cyan-400 bg-cyan-900/30 text-cyan-300'
                          : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium text-sm">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Additional Information */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre de la clínica/institución
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.clinicName}
                    onChange={(e) => updateFormData('clinicName', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                    placeholder="Hospital General, Clínica Santa María, etc."
                  />
                  <Building className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                </div>
              </div>

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
                        checked={formData.workSchedule === option.value}
                        onChange={(e) => updateFormData('workSchedule', e.target.value)}
                        className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500"
                      />
                      <span className="text-gray-300">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Información adicional
                </label>
                <textarea
                  value={formData.additionalInfo}
                  onChange={(e) => updateFormData('additionalInfo', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  placeholder="Cualquier información adicional que consideres relevante (subespecialidades, certificaciones, etc.)"
                />
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-gray-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Confirma tu información
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Nombre:</span>
                    <span className="text-white ml-2">{formData.fullName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white ml-2">{userEmail}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Rol:</span>
                    <span className="text-white ml-2 capitalize">{formData.role}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Teléfono:</span>
                    <span className="text-white ml-2">{formData.phone}</span>
                  </div>
                  {formData.specialty && (
                    <div>
                      <span className="text-gray-400">Especialidad:</span>
                      <span className="text-white ml-2">{formData.specialty}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400">Experiencia:</span>
                    <span className="text-white ml-2">
                      {experienceOptions.find(opt => opt.value === formData.experience)?.label}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Licencia:</span>
                    <span className="text-white ml-2">{formData.licenseNumber}</span>
                  </div>
                  {formData.clinicName && (
                    <div>
                      <span className="text-gray-400">Clínica:</span>
                      <span className="text-white ml-2">{formData.clinicName}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-blue-300 font-medium">
                      Listo para comenzar
                    </p>
                    <p className="text-blue-200 text-sm mt-1">
                      Al completar el registro, tendrás acceso completo al sistema de expedientes médicos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                <p className="text-green-300 text-sm">
                  ✓ Al completar tu perfil, aceptas nuestros términos y condiciones de uso del sistema médico y el manejo de datos según HIPAA.
                </p>
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
              {currentStep < 4 ? (
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
                  onClick={handleCompleteProfile}
                  disabled={loading}
                  className="flex items-center px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Completando...
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
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              ¿Necesitas ayuda? Contacta a soporte en 
              <span className="text-cyan-400 ml-1">soporte@deepluxmed.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}