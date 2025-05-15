import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: formData.get('fullName'),
              role: 'doctor', // Default role
            },
          },
        });
        if (error) throw error;
        setError('Registro exitoso. Por favor inicia sesión.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl h-auto md:h-[550px] bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="flex flex-col md:flex-row w-full h-full">
          {/* Login Form */}
          <div className={`w-full md:w-1/2 transition-all duration-500 ease-in-out p-6 ${isLogin ? 'block' : 'hidden md:block'}`}>
            <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto p-4 space-y-6">
              <h1 className="text-3xl font-bold text-gray-900 text-center mb-6">Iniciar Sesión</h1>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center text-sm mb-4">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="relative mb-4">
                <label htmlFor="email-login" className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                <div className="relative">
                  <input
                    id="email-login"
                    type="email"
                    name="email"
                    placeholder="Correo electrónico"
                    required
                    className="w-full px-5 py-3 bg-gray-50 rounded-lg pr-12 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                </div>
              </div>

              <div className="relative mb-4">
                <label htmlFor="password-login" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <div className="relative">
                  <input
                    id="password-login"
                    type="password"
                    name="password"
                    placeholder="Contraseña"
                    required
                    className="w-full px-5 py-3 bg-gray-50 rounded-lg pr-12 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                </div>
              </div>

              <div className="text-right mb-4">
                <a href="#" className="text-sm text-blue-600 hover:text-blue-700">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Cargando...' : 'Iniciar Sesión'}
              </button>
            </form>
          </div>

          {/* Register Form */}
          <div className={`w-full md:w-1/2 transition-all duration-500 ease-in-out p-6 ${isLogin ? 'hidden md:block' : 'block'}`}>
            <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto p-4 space-y-6">
              <h1 className="text-3xl font-bold text-gray-900 text-center mb-6">Crear Cuenta</h1>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center text-sm mb-4">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="relative mb-4">
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                <div className="relative">
                  <input
                    id="fullName"
                    type="text"
                    name="fullName"
                    placeholder="Nombre completo"
                    required
                    className="w-full px-5 py-3 bg-gray-50 rounded-lg pr-12 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <User className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                </div>
              </div>

              <div className="relative mb-4">
                <label htmlFor="email-register" className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                <div className="relative">
                  <input
                    id="email-register"
                    type="email"
                    name="email"
                    placeholder="Correo electrónico"
                    required
                    className="w-full px-5 py-3 bg-gray-50 rounded-lg pr-12 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                </div>
              </div>

              <div className="relative mb-4">
                <label htmlFor="password-register" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <div className="relative">
                  <input
                    id="password-register"
                    type="password"
                    name="password"
                    placeholder="Contraseña"
                    required
                    className="w-full px-5 py-3 bg-gray-50 rounded-lg pr-12 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Cargando...' : 'Registrarse'}
              </button>
            </form>
          </div>

          {/* Toggle Panel - Visible only on Desktop */}
          <div className="hidden md:block absolute inset-y-0 w-1/2 bg-blue-600 transition-all duration-700 ease-in-out z-10"
               style={{ 
                 right: isLogin ? '0' : '50%',
                 borderRadius: '0 1rem 1rem 0'
               }}>
            <div className="flex flex-col h-full items-center justify-center p-8 text-white">
              {isLogin ? (
                <>
                  <h2 className="text-2xl font-bold mb-4">¿Aún no tienes una cuenta?</h2>
                  <p className="text-center mb-8">Regístrate para acceder a todas las funcionalidades</p>
                  <button
                    onClick={() => setIsLogin(false)}
                    className="px-8 py-2 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
                  >
                    Registrarse
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold mb-4">¿Ya tienes una cuenta?</h2>
                  <p className="text-center mb-8">Inicia sesión para continuar</p>
                  <button
                    onClick={() => setIsLogin(true)}
                    className="px-8 py-2 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
                  >
                    Iniciar Sesión
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Toggle - Only visible on mobile */}
          <div className="md:hidden w-full p-4 text-center">
            {isLogin ? (
              <button
                onClick={() => setIsLogin(false)}
                className="text-blue-600 font-medium hover:underline"
              >
                ¿No tienes una cuenta? Regístrate
              </button>
            ) : (
              <button
                onClick={() => setIsLogin(true)}
                className="text-blue-600 font-medium hover:underline"
              >
                ¿Ya tienes una cuenta? Inicia sesión
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}