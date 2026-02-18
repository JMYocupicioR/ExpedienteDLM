import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

function readRecoveryParams() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const queryParams = new URLSearchParams(window.location.search);

  const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
  const type = hashParams.get('type') || queryParams.get('type');

  return { accessToken, refreshToken, type };
}

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRecoveryContext, setIsRecoveryContext] = useState(false);

  const canSubmit = useMemo(() => {
    return password.length >= 8 && confirmPassword.length >= 8 && !loading;
  }, [password.length, confirmPassword.length, loading]);

  useEffect(() => {
    let isMounted = true;

    const initializeRecoverySession = async () => {
      const { accessToken, refreshToken, type } = readRecoveryParams();
      const isRecovery = type === 'recovery';

      if (isRecovery && accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError && isMounted) {
          setError('El enlace de recuperación no es válido o ya expiró.');
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (isRecovery || !!session) {
        setIsRecoveryContext(true);
      } else {
        setError('No se detectó una sesión de recuperación válida.');
      }

      if (window.location.hash) {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
    };

    initializeRecoverySession().catch(() => {
      if (isMounted) {
        setError('No se pudo validar el enlace de recuperación. Intenta nuevamente.');
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!isRecoveryContext) {
      setError('Primero abre el enlace de recuperación enviado a tu correo.');
      return;
    }

    if (password.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setSuccessMessage('Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar tu contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4'>
      <div className='w-full max-w-md rounded-2xl border border-gray-700 bg-gray-800/40 backdrop-blur-xl p-8 shadow-2xl'>
        <div className='text-center mb-6'>
          <h1 className='text-2xl font-bold text-white'>Crear nueva contraseña</h1>
          <p className='text-sm text-gray-400 mt-2'>
            Usa una contraseña fuerte para proteger tu cuenta de Expediente DLM.
          </p>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label htmlFor='new-password' className='block text-sm font-medium text-gray-300 mb-2'>
              Nueva contraseña
            </label>
            <div className='relative'>
              <input
                id='new-password'
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete='new-password'
                minLength={8}
                required
                className='w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-20 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all'
              />
              <button
                type='button'
                onClick={() => setShowPassword(prev => !prev)}
                className='absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200'
                aria-label='Mostrar u ocultar contraseña'
              >
                {showPassword ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
              </button>
              <Lock className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' />
            </div>
          </div>

          <div>
            <label
              htmlFor='confirm-new-password'
              className='block text-sm font-medium text-gray-300 mb-2'
            >
              Confirmar contraseña
            </label>
            <div className='relative'>
              <input
                id='confirm-new-password'
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete='new-password'
                minLength={8}
                required
                className='w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-20 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all'
              />
              <button
                type='button'
                onClick={() => setShowConfirmPassword(prev => !prev)}
                className='absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200'
                aria-label='Mostrar u ocultar confirmación de contraseña'
              >
                {showConfirmPassword ? (
                  <EyeOff className='h-5 w-5' />
                ) : (
                  <Eye className='h-5 w-5' />
                )}
              </button>
              <Lock className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' />
            </div>
          </div>

          {error && (
            <div className='rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-200 flex items-start gap-2'>
              <AlertCircle className='h-5 w-5 flex-shrink-0 mt-0.5' />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className='rounded-lg border border-green-700 bg-green-900/30 p-3 text-sm text-green-200 flex items-start gap-2'>
              <CheckCircle2 className='h-5 w-5 flex-shrink-0 mt-0.5' />
              <span>{successMessage}</span>
            </div>
          )}

          <button
            type='submit'
            disabled={!canSubmit}
            className='w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
          >
            {loading ? 'Actualizando contraseña...' : 'Guardar nueva contraseña'}
          </button>
        </form>

        <div className='mt-6 text-center'>
          <Link to='/auth' className='text-sm text-cyan-400 hover:text-cyan-300 transition-colors'>
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
