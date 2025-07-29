import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Stethoscope, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🔍 Auth component mounted');
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    console.log(`🔑 Attempting ${isLogin ? 'login' : 'signup'} for:`, email);

    try {
      if (isLogin) {
        console.log('🔐 Logging in...');
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        console.log('✅ Login successful:', data.user?.email);
        // NO navegar inmediatamente - dejar que useAuth maneje la navegación
        // navigate('/dashboard') se manejará automáticamente en App.tsx
        
      } else {
        console.log('📝 Signing up...');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: 'Usuario' // Nombre por defecto
            }
          }
        });
        
        if (error) {
          if (error.message?.includes('User already registered')) {
            setError('Este correo ya está registrado. Por favor inicia sesión.');
            setIsLogin(true);
            return;
          }
          throw error;
        }
        
        if (data.user) {
          console.log('✅ Signup successful:', data.user.email);
          
          // Verificar si necesita confirmación por email
          if (data.user.email_confirmed_at) {
            console.log('📧 Email ya confirmado, useAuth manejará la navegación...');
            // NO navegar inmediatamente - dejar que useAuth maneje el estado
          } else {
            console.log('📧 Email pendiente de confirmación');
            setError('Revisa tu correo electrónico para confirmar tu cuenta.');
          }
        } else {
          throw new Error('No se pudo crear el usuario');
        }
      }
    } catch (err: any) {
      console.error(`❌ ${isLogin ? 'Login' : 'Signup'} error:`, err);
      
      // Manejo de errores mejorado
      if (err.message === 'Invalid login credentials') {
        setError('Credenciales inválidas. Verifica tu email y contraseña.');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Por favor confirma tu correo electrónico antes de iniciar sesión.');
      } else if (err.message?.includes('Too many requests')) {
        setError('Demasiados intentos. Espera unos minutos antes de intentar de nuevo.');
      } else {
        setError(err.message || 'Error desconocido');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-transparent to-blue-900/20"></div>
      
      <div className="relative w-full max-w-5xl h-auto bg-gray-800/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        <div className="flex flex-col md:flex-row w-full h-full">
          {/* Login Form */}
          <div className={`w-full md:w-1/2 transition-all duration-500 ease-in-out p-8 ${isLogin ? 'block' : 'hidden md:block'}`}>
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
          <div className={`w-full md:w-1/2 transition-all duration-500 ease-in-out p-8 ${isLogin ? 'hidden md:block' : 'block'}`}>
            <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-6">
              <div className="text-center mb-8">
                <Stethoscope className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2">Crear Cuenta</h1>
                <p className="text-gray-400">Únete a DeepLuxMed</p>
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg flex items-center text-sm mb-4">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="email-register" className="block text-sm font-medium text-gray-300 mb-2">Correo electrónico</label>
                  <div className="relative">
                    <input
                      id="email-register"
                      type="email"
                      name="email"
                      placeholder="ejemplo@correo.com"
                      required
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                    />
                    <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  </div>
                </div>

                <div>
                  <label htmlFor="password-register" className="block text-sm font-medium text-gray-300 mb-2">Contraseña</label>
                  <div className="relative">
                    <input
                      id="password-register"
                      type="password"
                      name="password"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                    />
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Mínimo 6 caracteres</p>
                </div>
              </div>

              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                <p className="text-blue-300 text-sm">
                  ✅ Tu perfil se creará automáticamente tras el registro.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setError(null);
                  }}
                  className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors"
                >
                  ¿Ya tienes una cuenta? Iniciar sesión
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