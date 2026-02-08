import { useState, useEffect } from 'react';
import { googleCalendarService } from '@/lib/services/google-calendar-service';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Calendar, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Google Calendar Settings Component
 * 
 * Allows users to connect/disconnect their Google Calendar account
 * and manage synchronization settings.
 */
export function GoogleCalendarSettings() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const connected = await googleCalendarService.isConnected();
      setIsConnected(connected);
    } catch (error) {
      console.error('Error checking Google Calendar connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsProcessing(true);
      await googleCalendarService.initiateAuth();
      
      toast({
        title: 'Autenticación iniciada',
        description: 'Por favor completa el proceso de autenticación en la ventana emergente.',
      });
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo conectar con Google Calendar',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsProcessing(true);
      await googleCalendarService.disconnect();
      setIsConnected(false);
      
      toast({
        title: 'Desconectado',
        description: 'Tu cuenta de Google Calendar ha sido desconectada.',
      });
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo desconectar Google Calendar',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className='card'>
        <div className='flex items-center space-x-3'>
          <Loader2 className='h-5 w-5 animate-spin text-cyan-400' />
          <span className='text-gray-300'>Cargando configuración...</span>
        </div>
      </div>
    );
  }

  return (
    <div className='card'>
      <div className='flex items-start justify-between'>
        <div className='flex items-start space-x-4 flex-1'>
          <div className='p-3 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-lg border border-cyan-500/20'>
            <Calendar className='h-6 w-6 text-cyan-400' />
          </div>

          <div className='flex-1'>
            <div className='flex items-center space-x-2 mb-1'>
              <h3 className='text-lg font-semibold text-white'>
                Google Calendar
              </h3>
              {isConnected ? (
                <span className='flex items-center space-x-1 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-xs font-medium text-green-400'>
                  <CheckCircle className='h-3 w-3' />
                  <span>Conectado</span>
                </span>
              ) : (
                <span className='flex items-center space-x-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded-full text-xs font-medium text-gray-400'>
                  <XCircle className='h-3 w-3' />
                  <span>Desconectado</span>
                </span>
              )}
            </div>

            <p className='text-sm text-gray-400 mb-4'>
              {isConnected
                ? 'Las citas se sincronizarán automáticamente con tu Google Calendar.'
                : 'Conecta tu cuenta de Google para sincronizar citas automáticamente.'}
            </p>

            {isConnected && (
              <div className='space-y-2 text-sm text-gray-400 p-3 bg-gray-700/50 rounded-lg border border-gray-600'>
                <p className='flex items-start'>
                  <CheckCircle className='h-4 w-4 mr-2 mt-0.5 text-green-400 flex-shrink-0' />
                  <span>Las citas nuevas se crearán automáticamente en Google Calendar</span>
                </p>
                <p className='flex items-start'>
                  <CheckCircle className='h-4 w-4 mr-2 mt-0.5 text-green-400 flex-shrink-0' />
                  <span>Los cambios a las citas se reflejarán en tu calendario</span>
                </p>
                <p className='flex items-start'>
                  <CheckCircle className='h-4 w-4 mr-2 mt-0.5 text-green-400 flex-shrink-0' />
                  <span>Las citas canceladas se eliminarán de tu calendario</span>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className='ml-4'>
          {isConnected ? (
            <Button
              onClick={handleDisconnect}
              disabled={isProcessing}
              variant='outline'
              className='border-red-500/50 hover:bg-red-500/10 hover:border-red-500 text-red-400'
            >
              {isProcessing ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  Desconectando...
                </>
              ) : (
                <>
                  <XCircle className='h-4 w-4 mr-2' />
                  Desconectar
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={isProcessing}
              className='bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700'
            >
              {isProcessing ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  Conectando...
                </>
              ) : (
                <>
                  <Calendar className='h-4 w-4 mr-2' />
                  Conectar Calendar
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {!isConnected && (
        <div className='mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg'>
          <p className='text-sm text-blue-300'>
            <strong>Nota:</strong> Necesitarás autorizar el acceso a tu Google Calendar.
            Los eventos se crearán con tu nombre y se enviará una invitación al paciente si
            tiene un correo electrónico registrado.
          </p>
        </div>
      )}
    </div>
  );
}
