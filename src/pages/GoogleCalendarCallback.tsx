import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { googleCalendarService } from '@/lib/services/google-calendar-service';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Google Calendar OAuth Callback Page
 * 
 * Handles the OAuth2 callback from Google after user authorization.
 * Exchanges the authorization code for access and refresh tokens.
 */
export default function GoogleCalendarCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setErrorMessage('Autenticación cancelada o denegada');
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage('No se recibió el código de autenticación');
      return;
    }

    try {
      await googleCalendarService.handleAuthCallback(code);
      setStatus('success');
      
      // Close the popup window if we're in one
      if (window.opener) {
        window.opener.postMessage({ type: 'google_calendar_connected' }, window.location.origin);
        setTimeout(() => window.close(), 2000);
      } else {
        // Redirect to settings after 2 seconds if not in popup
        setTimeout(() => navigate('/settings'), 2000);
      }
    } catch (error) {
      console.error('Error handling Google Calendar callback:', error);
      setStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Error conectando con Google Calendar'
      );
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4'>
      <div className='max-w-md w-full card text-center'>
        {status === 'loading' && (
          <>
            <Loader2 className='h-16 w-16 animate-spin text-cyan-400 mx-auto mb-4' />
            <h1 className='text-2xl font-bold text-white mb-2'>
              Conectando Google Calendar
            </h1>
            <p className='text-gray-400'>
              Por favor espera mientras procesamos tu autorización...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className='p-4 bg-green-500/20 border border-green-500/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4'>
              <CheckCircle className='h-10 w-10 text-green-400' />
            </div>
            <h1 className='text-2xl font-bold text-white mb-2'>
              ¡Conexión Exitosa!
            </h1>
            <p className='text-gray-400 mb-6'>
              Tu cuenta de Google Calendar ha sido conectada correctamente.
              Las citas se sincronizarán automáticamente.
            </p>
            {!window.opener && (
              <Button
                onClick={() => navigate('/settings')}
                className='bg-gradient-to-r from-cyan-500 to-blue-600'
              >
                Ir a Configuración
              </Button>
            )}
          </>
        )}

        {status === 'error' && (
          <>
            <div className='p-4 bg-red-500/20 border border-red-500/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4'>
              <XCircle className='h-10 w-10 text-red-400' />
            </div>
            <h1 className='text-2xl font-bold text-white mb-2'>
              Error de Conexión
            </h1>
            <p className='text-gray-400 mb-6'>
              {errorMessage}
            </p>
            <Button
              onClick={() => navigate('/settings')}
              variant='outline'
              className='border-gray-600 hover:bg-gray-700'
            >
              Volver a Configuración
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
