import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Mail, 
  CheckCircle, 
  RefreshCw, 
  ArrowLeft, 
  Clock,
  AlertCircle,
  Stethoscope
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EmailVerificationProps {}

const EmailVerification: React.FC<EmailVerificationProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'waiting' | 'checking' | 'verified' | 'expired'>('waiting');

  // Obtener email del estado de navegación
  const email = location.state?.email || '';
  const fromRegistration = location.state?.fromRegistration || false;

  useEffect(() => {
    // Si no hay email, redirigir al registro
    if (!email) {
      navigate('/auth', { replace: true });
      return;
    }

    // Configurar verificación automática del estado de auth
    const checkAuthStatus = () => {
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setVerificationStatus('verified');
          setTimeout(() => {
            // Redirigir al dashboard - el usuario ya está autenticado
            navigate('/dashboard', { replace: true });
          }, 2000);
        }
      });
    };

    checkAuthStatus();

    // Iniciar cooldown si viene de registro
    if (fromRegistration) {
      setResendCooldown(60); // 60 segundos de cooldown inicial
    }
  }, [email, navigate, fromRegistration]);

  useEffect(() => {
    // Manejar cooldown del reenvío
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        setMessage({
          type: 'error',
          text: `Error al reenviar: ${error.message}`
        });
      } else {
        setMessage({
          type: 'success',
          text: '✅ Correo de verificación reenviado exitosamente'
        });
        setResendCooldown(60); // Reiniciar cooldown
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error inesperado al reenviar el correo'
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToAuth = () => {
    navigate('/auth', { replace: true });
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'waiting':
        return <Clock className="h-16 w-16 text-cyan-400 animate-pulse" />;
      case 'checking':
        return <RefreshCw className="h-16 w-16 text-cyan-400 animate-spin" />;
      case 'verified':
        return <CheckCircle className="h-16 w-16 text-green-400" />;
      case 'expired':
        return <AlertCircle className="h-16 w-16 text-red-400" />;
      default:
        return <Mail className="h-16 w-16 text-cyan-400" />;
    }
  };

  const getStatusMessage = () => {
    switch (verificationStatus) {
      case 'waiting':
        return {
          title: 'Verifica tu correo electrónico',
          description: 'Te hemos enviado un enlace de verificación. Revisa tu bandeja de entrada y haz clic en el enlace para continuar.'
        };
      case 'checking':
        return {
          title: 'Verificando...',
          description: 'Estamos procesando tu verificación. Espera un momento.'
        };
      case 'verified':
        return {
          title: '¡Verificación exitosa!',
          description: 'Tu email ha sido verificado. Serás redirigido al dashboard en unos momentos.'
        };
      case 'expired':
        return {
          title: 'Enlace expirado',
          description: 'El enlace de verificación ha expirado. Puedes solicitar uno nuevo.'
        };
      default:
        return {
          title: 'Verificación de email',
          description: 'Sigue las instrucciones para verificar tu correo electrónico.'
        };
    }
  };

  const statusInfo = getStatusMessage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-cyan-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8 animate-fadeInUp">
            <div className="flex items-center justify-center mb-4">
              <Stethoscope className="h-12 w-12 text-cyan-400 mr-3" />
              <h1 className="text-3xl font-bold text-white">ExpedienteDLM</h1>
            </div>
            <p className="text-cyan-200">Sistema de Gestión Médica</p>
          </div>

          {/* Main Card */}
          <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-8 shadow-2xl animate-fadeInUp animate-delay-200">
            {/* Status Icon */}
            <div className="flex justify-center mb-6">
              {getStatusIcon()}
            </div>

            {/* Status Message */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-3">
                {statusInfo.title}
              </h2>
              <p className="text-gray-300 leading-relaxed">
                {statusInfo.description}
              </p>
            </div>

            {/* Email Display */}
            <div className="bg-gray-700/50 rounded-lg p-4 mb-6 border border-gray-600">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-cyan-400 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-400">Correo enviado a:</p>
                  <p className="text-white font-medium break-all">{email}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            {message && (
              <div className={`p-4 rounded-lg mb-6 border ${
                message.type === 'success' ? 'bg-green-900/30 border-green-700 text-green-300' :
                message.type === 'error' ? 'bg-red-900/30 border-red-700 text-red-300' :
                'bg-blue-900/30 border-blue-700 text-blue-300'
              }`}>
                <p className="text-sm">{message.text}</p>
              </div>
            )}

            {/* Instructions */}
            {verificationStatus === 'waiting' && (
              <div className="bg-cyan-900/20 border border-cyan-700 rounded-lg p-4 mb-6">
                <h3 className="text-cyan-300 font-medium mb-2">Instrucciones:</h3>
                <ul className="text-sm text-cyan-200 space-y-1">
                  <li>• Revisa tu bandeja de entrada</li>
                  <li>• Busca el correo de "DeepLux Med"</li>
                  <li>• Haz clic en "Confirmar email"</li>
                  <li>• Revisa también la carpeta de spam</li>
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-4">
              {/* Resend Button */}
              {verificationStatus !== 'verified' && (
                <button
                  onClick={handleResendEmail}
                  disabled={isResending || resendCooldown > 0}
                  className={`w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                    isResending || resendCooldown > 0
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-cyan-600 hover:bg-cyan-700 text-white transform hover:scale-105'
                  }`}
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Reenviando...
                    </>
                  ) : resendCooldown > 0 ? (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Reenviar en {resendCooldown}s
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reenviar correo
                    </>
                  )}
                </button>
              )}

              {/* Back Button */}
              <button
                onClick={handleBackToAuth}
                className="w-full flex items-center justify-center px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 hover:border-gray-500 transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al registro
              </button>
            </div>

            {/* Auto-refresh indicator */}
            {verificationStatus === 'waiting' && (
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  Esta página se actualizará automáticamente cuando verifiques tu email
                </p>
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-400">
              ¿Problemas con la verificación?{' '}
              <button 
                onClick={() => setMessage({
                  type: 'info',
                  text: 'Contacta a soporte@deepluxmed.mx para asistencia'
                })}
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                Contacta soporte
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
