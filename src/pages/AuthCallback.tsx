import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Obtener la sesión actual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!session) {
          throw new Error('No se pudo obtener la sesión');
        }

        console.log('✅ Sesión OAuth obtenida:', session.user.email);
        
        // Verificar si el usuario tiene un perfil completo
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }
        
        // Si no tiene perfil o no está completo, redirigir al cuestionario
        if (!profile || !profile.profile_completed) {
          console.log('📝 Perfil incompleto, redirigiendo al cuestionario...');
          
          // Guardar información del OAuth en sessionStorage
          sessionStorage.setItem('oauthRegistration', JSON.stringify({
            userId: session.user.id,
            email: session.user.email,
            fullName: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
            avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '',
            provider: session.user.app_metadata?.provider || 'oauth',
            timestamp: Date.now()
          }));
          
          // Redirigir al cuestionario con información básica
          navigate('/signup-questionnaire', {
            state: {
              email: session.user.email,
              fromOAuth: true,
              oauthData: {
                fullName: session.user.user_metadata?.full_name || '',
                email: session.user.email
              }
            }
          });
        } else {
          // Si tiene perfil completo, ir al dashboard
          console.log('✅ Perfil completo, redirigiendo al dashboard...');
          navigate('/dashboard');
        }
      } catch (err: any) {
        console.error('❌ Error en callback OAuth:', err);
        setError(err.message || 'Error al procesar el inicio de sesión');
        
        // Redirigir a login después de 3 segundos
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      } finally {
        setProcessing(false);
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700 p-8 max-w-md w-full">
        {processing ? (
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-cyan-400 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Procesando inicio de sesión...
            </h2>
            <p className="text-gray-400">
              Por favor espera mientras completamos tu acceso
            </p>
          </div>
        ) : error ? (
          <div className="text-center">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Error al iniciar sesión
            </h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              Serás redirigido a la página de inicio de sesión...
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              ¡Inicio de sesión exitoso!
            </h2>
            <p className="text-gray-400">
              Redirigiendo...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
