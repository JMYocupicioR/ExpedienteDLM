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
      <div className={`relative w-[850px] h-[550px] bg-white rounded-[30px] shadow-lg overflow-hidden`}>
        {/* Login Form */}
        <div className={`absolute top-0 w-1/2 h-full flex items-center justify-center transition-transform duration-700 ease-in-out ${isLogin ? 'left-0' : '-translate-x-full'}`}>
          <form onSubmit={handleSubmit} className="w-full max-w-md p-8 space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 text-center">Iniciar Sesión</h1>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center text-sm">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="relative">
              <input
                type="email"
                name="email"
                placeholder="Correo electrónico"
                required
                className="w-full px-5 py-3 bg-gray-50 rounded-lg pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            </div>

            <div className="relative">
              <input
                type="password"
                name="password"
                placeholder="Contraseña"
                required
                className="w-full px-5 py-3 bg-gray-50 rounded-lg pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            </div>

            <div className="text-right">
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
        <div className={`absolute top-0 w-1/2 h-full flex items-center justify-center transition-transform duration-700 ease-in-out ${isLogin ? 'translate-x-full right-0' : 'right-0'}`}>
          <form onSubmit={handleSubmit} className="w-full max-w-md p-8 space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 text-center">Crear Cuenta</h1>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center text-sm">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="relative">
              <input
                type="text"
                name="fullName"
                placeholder="Nombre completo"
                required
                className="w-full px-5 py-3 bg-gray-50 rounded-lg pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <User className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            </div>

            <div className="relative">
              <input
                type="email"
                name="email"
                placeholder="Correo electrónico"
                required
                className="w-full px-5 py-3 bg-gray-50 rounded-lg pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            </div>

            <div className="relative">
              <input
                type="password"
                name="password"
                placeholder="Contraseña"
                required
                className="w-full px-5 py-3 bg-gray-50 rounded-lg pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
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

        {/* Toggle Box */}
        <div className="absolute w-full h-full">
          <div className={`absolute w-[300%] h-full bg-blue-600 transition-all duration-700 ease-in-out transform ${isLogin ? 'rotate-[-10deg] -left-[100%]' : 'rotate-[10deg] left-[50%]'} origin-[0_100%] z-20`} />

          {/* Left Panel */}
          <div className={`absolute left-0 w-1/2 h-full flex flex-col justify-center items-center text-white z-30 transition-all duration-700 ${isLogin ? '' : '-translate-x-full'}`}>
            <h1 className="text-3xl font-bold mb-4">¡Bienvenido!</h1>
            <p className="mb-8">¿No tienes una cuenta?</p>
            <button
              onClick={() => setIsLogin(false)}
              className="px-10 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Registrarse
            </button>
          </div>

          {/* Right Panel */}
          <div className={`absolute right-0 w-1/2 h-full flex flex-col justify-center items-center text-white z-30 transition-all duration-700 ${isLogin ? 'translate-x-full' : ''}`}>
            <h1 className="text-3xl font-bold mb-4">¡Bienvenido de nuevo!</h1>
            <p className="mb-8">¿Ya tienes una cuenta?</p>
            <button
              onClick={() => setIsLogin(true)}
              className="px-10 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Iniciar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}