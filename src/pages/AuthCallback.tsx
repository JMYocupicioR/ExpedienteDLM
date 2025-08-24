import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let didNavigate = false;

    const handleAuthSuccess = async (session: any) => {
      if (!session || didNavigate) return;

      console.log('🔐 Auth callback - Usuario autenticado:', session.user.email);

      try {
        // Verificar si el usuario tiene un perfil completo
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error verificando perfil:', profileError);
        }

        // Verificar si es un registro OAuth nuevo
        const urlParams = new URLSearchParams(window.location.search);
        const authMode = urlParams.get('auth_mode');
        
        // Para OAuth, consideramos que necesita cuestionario si:
        // 1. No tiene perfil en absoluto, O
        // 2. Su perfil no está marcado como registration_completed, O  
        // 3. El auth_mode es 'signup'
        const needsQuestionnaire = !profile || 
                                  profile.registration_completed === false || 
                                  profile.registration_completed === null ||
                                  authMode === 'signup';

        console.log('🔍 Estado del usuario OAuth:', {
          hasProfile: !!profile,
          isRegistrationCompleted: profile?.registration_completed,
          authMode: authMode,
          provider: session.user.app_metadata?.provider,
          needsQuestionnaire: needsQuestionnaire,
          userEmail: session.user.email
        });

        didNavigate = true;

        if (needsQuestionnaire) {
          // Usuario nuevo o registro OAuth - ir al cuestionario
          console.log('📝 Redirigiendo a cuestionario para completar registro...');
          
          // Guardar datos OAuth para el cuestionario
          sessionStorage.setItem('oauthRegistration', JSON.stringify({
            email: session.user.email,
            fullName: session.user.user_metadata?.full_name || 
                     session.user.user_metadata?.name || '',
            provider: session.user.app_metadata?.provider || 'google',
            userId: session.user.id,
            emailVerified: true,
            timestamp: Date.now()
          }));

          navigate('/signup-questionnaire', {
            state: {
              email: session.user.email,
              fromOAuth: true,
              emailVerified: true,
              oauthData: {
                fullName: session.user.user_metadata?.full_name || 
                         session.user.user_metadata?.name || '',
                provider: session.user.app_metadata?.provider || 'google'
              }
            }
          });
        } else {
          // Usuario existente - ir al dashboard
          console.log('✅ Usuario existente, redirigiendo al dashboard...');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error en AuthCallback:', error);
        didNavigate = true;
        navigate('/auth');
      }
    };

    // 1) Verificar sesión existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthSuccess(session);
    });

    // 2) Escuchar eventos de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        handleAuthSuccess(session);
      }
    });

    // 3) Fallback: si en ~15s no hay navegación, ir a auth
    const fallback = setTimeout(() => {
      if (!didNavigate) {
        console.warn('AuthCallback timeout - redirigiendo a /auth');
        navigate('/auth');
      }
    }, 15000);

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
