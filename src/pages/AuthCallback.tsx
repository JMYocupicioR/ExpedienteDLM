import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let didNavigate = false;

    // 1) Navegar si ya existe sesión (por si el SDK ya procesó los tokens)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !didNavigate) {
        didNavigate = true;
        navigate('/dashboard');
      }
    });

    // 2) Escuchar el evento de autenticación y navegar solo cuando haya sesión
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !didNavigate) {
        didNavigate = true;
        navigate('/dashboard');
      }
    });

    // 3) Fallback: si en ~10s no hay sesión, enviar a /auth
    const fallback = setTimeout(() => {
      if (!didNavigate) {
        navigate('/auth');
      }
    }, 10000);

    return () => {
      clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4'>
      <div className='bg-gray-800/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700 p-8 max-w-md w-full text-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4'></div>
        <h2 className='text-xl font-semibold text-white mb-2'>Validando tu sesión...</h2>
        <p className='text-gray-400'>Serás redirigido automáticamente en un momento</p>
      </div>
    </div>
  );
}
