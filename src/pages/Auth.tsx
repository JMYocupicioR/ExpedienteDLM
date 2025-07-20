import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, AlertCircle, Stethoscope, Phone, Award, Users, Building } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  role: 'doctor' | 'nurse' | 'administrator';
  specialty: string;
  licenseNumber: string;
  phone: string;
  clinicName: string;
  experience: string;
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupStep, setSignupStep] = useState(1);
  const [signupData, setSignupData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'doctor',
    specialty: '',
    licenseNumber: '',
    phone: '',
    clinicName: '',
    experience: ''
  });
  const navigate = useNavigate();

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
    'Otorrinolaringología'
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.message === 'Invalid login credentials') {
        setError('Credenciales inválidas');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignupStepSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (signupStep === 1) {
      // Validar paso 1
      if (!signupData.email || !signupData.password || !signupData.confirmPassword || !signupData.fullName) {
        setError('Todos los campos son requeridos');
        return;
      }
      
      if (signupData.password !== signupData.confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }
      
      if (signupData.password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return;
      }
      
      setSignupStep(2);
    } else if (signupStep === 2) {
      // Validar paso 2
      if (!signupData.phone || !signupData.licenseNumber) {
        setError('Todos los campos son requeridos');
        return;
      }
      
      if (signupData.role === 'doctor' && !signupData.specialty) {
        setError('La especialidad es requerida para doctores');
        return;
      }
      
      setSignupStep(3);
    } else {
      // Paso 3 - Crear cuenta
      await handleCompleteSignup();
    }
  };

  const handleCompleteSignup = async () => {
    try {
      setLoading(true);
      setError(null);

      // Crear usuario en auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
      });

      if (signUpError) {
        if (signUpError.message?.includes('User already registered')) {
          setError('Este correo ya está registrado. Por favor inicia sesión.');
          setIsLogin(true);
          setSignupStep(1);
          return;
        }
        throw signUpError;
      }
      
      if (!authData.user) {
        throw new Error('No se pudo crear el usuario');
      }

      // Crear perfil del usuario
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: signupData.email,
          full_name: signupData.fullName,
          role: signupData.role,
          specialty: signupData.role === 'doctor' ? signupData.specialty : null,
          license_number: signupData.licenseNumber,
          phone: signupData.phone,
          prescription_style: {}
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // El usuario ya fue creado, pero el perfil falló
        throw new Error('Usuario creado pero hubo un error al guardar el perfil. Contacte al administrador.');
      }

      // Signup exitoso
      if (authData.session) {
        navigate('/dashboard');
      } else {
        setError('Registro exitoso. Revisa tu email para confirmar tu cuenta.');
        setIsLogin(true);
        setSignupStep(1);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSignupData = (field: keyof SignupFormData, value: string) => {
    setSignupData(prev => ({ ...prev, [field]: value }));
  };

  const handleBackStep = () => {
    if (signupStep > 1) {
      setSignupStep(signupStep - 1);
      setError(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-transparent to-blue-900/20"></div>
      
      <div className="relative w-full max-w-5xl h-auto bg-gray-800/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        <div className="flex flex-col md:flex-row w-full h-full">
          {/* Login Form */}
          <div className={`w-full md:w-1/2 transition-all duration-500 ease-in-out p-8 ${isLogin ? 'block' : 'hidden'}`}>
            <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-6">
              <div className="text-center mb-8">
                <Stethoscope className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2">Iniciar Sesión</h1>
                <p className="text-gray-400">Accede a Expediente DLM</p>
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg flex items-center text-sm mb-4">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="email-login" className="block text-sm font-medium text-gray-300 mb-2">Correo electrónico</label>
                  <div className="relative">
                    <input
                      id="email-login"
                      type="email"
                      name="email"
                      placeholder="ejemplo@deepluxmed.com"
                      required
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                    />
                    <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  </div>
                </div>

                <div>
                  <label htmlFor="password-login" className="block text-sm font-medium text-gray-300 mb-2">Contraseña</label>
                  <div className="relative">
                    <input
                      id="password-login"
                      type="password"
                      name="password"
                      placeholder="••••••••"
                      required
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                    />
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="text-right">
                <a href="#" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>
            </form>
          </div>

          {/* Register Form */}
          <div className={`w-full md:w-1/2 transition-all duration-500 ease-in-out p-8 ${isLogin ? 'hidden' : 'block'}`}>
            <form onSubmit={handleSignupStepSubmit} className="w-full max-w-md mx-auto space-y-6">
              <div className="text-center mb-8">
                <Stethoscope className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2">
                  {signupStep === 1 ? 'Crear Cuenta' : 
                   signupStep === 2 ? 'Información Profesional' : 
                   'Información Adicional'}
                </h1>
                <p className="text-gray-400">
                  {signupStep === 1 ? 'Únete a DeepLuxMed' : 
                   signupStep === 2 ? 'Detalles médicos' : 
                   'Información de la clínica'}
                </p>
                
                {/* Progress indicator */}
                <div className="flex justify-center mt-4 space-x-2">
                  <div className={`w-3 h-3 rounded-full ${signupStep >= 1 ? 'bg-cyan-400' : 'bg-gray-600'}`}></div>
                  <div className={`w-3 h-3 rounded-full ${signupStep >= 2 ? 'bg-cyan-400' : 'bg-gray-600'}`}></div>
                  <div className={`w-3 h-3 rounded-full ${signupStep >= 3 ? 'bg-cyan-400' : 'bg-gray-600'}`}></div>
                </div>
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg flex items-center text-sm mb-4">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Paso 1: Información básica */}
              {signupStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">Nombre completo *</label>
                    <div className="relative">
                      <input
                        id="fullName"
                        type="text"
                        value={signupData.fullName}
                        onChange={(e) => updateSignupData('fullName', e.target.value)}
                        placeholder="Dr. Juan Pérez Martínez"
                        required
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                      />
                      <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email-register" className="block text-sm font-medium text-gray-300 mb-2">Correo electrónico *</label>
                    <div className="relative">
                      <input
                        id="email-register"
                        type="email"
                        value={signupData.email}
                        onChange={(e) => updateSignupData('email', e.target.value)}
                        placeholder="ejemplo@deepluxmed.com"
                        required
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                      />
                      <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password-register" className="block text-sm font-medium text-gray-300 mb-2">Contraseña *</label>
                    <div className="relative">
                      <input
                        id="password-register"
                        type="password"
                        value={signupData.password}
                        onChange={(e) => updateSignupData('password', e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                      />
                      <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">Confirmar contraseña *</label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type="password"
                        value={signupData.confirmPassword}
                        onChange={(e) => updateSignupData('confirmPassword', e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                      />
                      <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    </div>
                  </div>
                </div>
              )}

              {/* Paso 2: Información profesional */}
              {signupStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-2">Rol profesional *</label>
                    <div className="relative">
                      <select
                        id="role"
                        value={signupData.role}
                        onChange={(e) => updateSignupData('role', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                      >
                        <option value="doctor">Doctor(a)</option>
                        <option value="nurse">Enfermero(a)</option>
                        <option value="administrator">Administrador(a)</option>
                      </select>
                      <Users className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    </div>
                  </div>

                  {signupData.role === 'doctor' && (
                    <div>
                      <label htmlFor="specialty" className="block text-sm font-medium text-gray-300 mb-2">Especialidad *</label>
                      <select
                        id="specialty"
                        value={signupData.specialty}
                        onChange={(e) => updateSignupData('specialty', e.target.value)}
                        required={signupData.role === 'doctor'}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                      >
                        <option value="">Selecciona tu especialidad</option>
                        {medicalSpecialties.map(specialty => (
                          <option key={specialty} value={specialty}>{specialty}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-300 mb-2">
                      {signupData.role === 'doctor' ? 'Cédula profesional *' : 'Número de licencia *'}
                    </label>
                    <div className="relative">
                      <input
                        id="licenseNumber"
                        type="text"
                        value={signupData.licenseNumber}
                        onChange={(e) => updateSignupData('licenseNumber', e.target.value)}
                        placeholder={signupData.role === 'doctor' ? 'Ej: 12345678' : 'Número de licencia'}
                        required
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                      />
                      <Award className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">Teléfono *</label>
                    <div className="relative">
                      <input
                        id="phone"
                        type="tel"
                        value={signupData.phone}
                        onChange={(e) => updateSignupData('phone', e.target.value)}
                        placeholder="+52 555 123 4567"
                        required
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                      />
                      <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    </div>
                  </div>
                </div>
              )}

              {/* Paso 3: Información adicional */}
              {signupStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="clinicName" className="block text-sm font-medium text-gray-300 mb-2">Nombre de la clínica/institución</label>
                    <div className="relative">
                      <input
                        id="clinicName"
                        type="text"
                        value={signupData.clinicName}
                        onChange={(e) => updateSignupData('clinicName', e.target.value)}
                        placeholder="Hospital General, Clínica Santa María, etc."
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                      />
                      <Building className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="experience" className="block text-sm font-medium text-gray-300 mb-2">Años de experiencia</label>
                    <select
                      id="experience"
                      value={signupData.experience}
                      onChange={(e) => updateSignupData('experience', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                    >
                      <option value="">Selecciona tu experiencia</option>
                      <option value="0-1">Menos de 1 año</option>
                      <option value="1-3">1-3 años</option>
                      <option value="3-5">3-5 años</option>
                      <option value="5-10">5-10 años</option>
                      <option value="10-20">10-20 años</option>
                      <option value="20+">Más de 20 años</option>
                    </select>
                  </div>

                  {/* Resumen de información */}
                  <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                    <h3 className="text-blue-300 font-medium mb-3">Resumen de tu información:</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-400">Nombre:</span> <span className="text-white">{signupData.fullName}</span></div>
                      <div><span className="text-gray-400">Email:</span> <span className="text-white">{signupData.email}</span></div>
                      <div><span className="text-gray-400">Rol:</span> <span className="text-white capitalize">{signupData.role}</span></div>
                      {signupData.specialty && (
                        <div><span className="text-gray-400">Especialidad:</span> <span className="text-white">{signupData.specialty}</span></div>
                      )}
                      <div><span className="text-gray-400">Licencia:</span> <span className="text-white">{signupData.licenseNumber}</span></div>
                      <div><span className="text-gray-400">Teléfono:</span> <span className="text-white">{signupData.phone}</span></div>
                    </div>
                  </div>

                  <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                    <p className="text-green-300 text-sm">
                      ✓ Al crear tu cuenta, aceptas nuestros términos y condiciones de uso del sistema médico.
                    </p>
                  </div>
                </div>
              )}

              {/* Botones de navegación */}
              <div className="flex space-x-3">
                {signupStep > 1 && (
                  <button
                    type="button"
                    onClick={handleBackStep}
                    className="flex-1 py-3 border border-gray-600 text-gray-300 rounded-lg font-semibold hover:bg-gray-700 transition-all duration-300"
                  >
                    Anterior
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? 'Procesando...' : 
                   signupStep === 3 ? 'Crear Cuenta' : 'Siguiente'}
                </button>
              </div>
            </form>
          </div>

          {/* Toggle Panel - Desktop */}
          <div className={`hidden md:block absolute inset-y-0 w-1/2 bg-gradient-to-br from-cyan-600 to-blue-700 transition-all duration-700 ease-in-out z-10 shadow-2xl ${
            isLogin ? 'right-0' : 'right-1/2'
          }`}
               style={{ 
                 borderRadius: isLogin ? '0 1rem 1rem 0' : '1rem 0 0 1rem'
               }}>
            <div className="flex flex-col h-full items-center justify-center p-8 text-white relative">
              <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent"></div>
              <div className="relative z-10 text-center">
                {isLogin ? (
                  <>
                    <div className="mb-6">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold mb-4">¡Bienvenido!</h2>
                    <p className="text-cyan-100 mb-8 text-lg">¿Aún no tienes una cuenta? Únete a DeepLuxMed y accede a la tecnología médica más avanzada</p>
                    <button
                      onClick={() => {
                        setIsLogin(false);
                        setSignupStep(1);
                        setError(null);
                      }}
                      className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-cyan-600 transition-all duration-300"
                    >
                      Crear Cuenta
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mb-6">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Stethoscope className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold mb-4">¡Te esperamos!</h2>
                    <p className="text-cyan-100 mb-8 text-lg">¿Ya eres parte de DeepLuxMed? Inicia sesión y continúa transformando la medicina</p>
                    <button
                      onClick={() => {
                        setIsLogin(true);
                        setSignupStep(1);
                        setError(null);
                      }}
                      className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-cyan-600 transition-all duration-300"
                    >
                      Iniciar Sesión
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Toggle */}
          <div className="md:hidden w-full p-6 text-center border-t border-gray-700">
            {isLogin ? (
              <button
                onClick={() => {
                  setIsLogin(false);
                  setSignupStep(1);
                  setError(null);
                }}
                className="text-cyan-400 font-medium hover:text-cyan-300 transition-colors"
              >
                ¿No tienes una cuenta? <span className="underline">Crear cuenta</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsLogin(true);
                  setSignupStep(1);
                  setError(null);
                }}
                className="text-cyan-400 font-medium hover:text-cyan-300 transition-colors"
              >
                ¿Ya tienes una cuenta? <span className="underline">Iniciar sesión</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}