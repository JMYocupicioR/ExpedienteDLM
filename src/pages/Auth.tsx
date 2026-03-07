import OAuthButtons from '@/features/authentication/components/OAuthButtons';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DeepLuxLogo } from '@/components/Brand';
import HCaptcha from '@hcaptcha/react-hcaptcha';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [hcaptchaToken, setHcaptchaToken] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState<string | null>(null);
  const loginCaptchaRef = useRef<HCaptcha>(null);
  const signupCaptchaRef = useRef<HCaptcha>(null);
  const navigate = useNavigate();

  const handleCaptchaVerify = (token: string) => {

    setHcaptchaToken(token);
  };

  const handleCaptchaError = (error: any) => {

    setHcaptchaToken(null);
  };

  const handleCaptchaExpire = () => {
    setHcaptchaToken(null);
  };

  const resetCaptcha = () => {
    if (isLogin && loginCaptchaRef.current) {
      loginCaptchaRef.current.resetCaptcha();
    } else if (!isLogin && signupCaptchaRef.current) {
      signupCaptchaRef.current.resetCaptcha();
    }
    setHcaptchaToken(null);
  };

  // Validación en tiempo real de contraseñas
  React.useEffect(() => {
    const passwordInput = document.getElementById('password-register') as HTMLInputElement;
    const confirmPasswordInput = document.getElementById(
      'confirm-password-register'
    ) as HTMLInputElement;
    const strengthDiv = document.getElementById('password-strength');
    const matchDiv = document.getElementById('password-match');

    const validatePassword = () => {
      if (!passwordInput || !strengthDiv) return;

      const password = passwordInput.value;
      let strength = '';
      let strengthClass = '';

      if (password.length === 0) {
        strength = '';
      } else {
        // Criterios de validación más detallados
        const hasLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        const score = [hasLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
        
        if (score < 2) {
          strength = '🔴 Muy débil';
          strengthClass = 'text-red-400';
        } else if (score < 4) {
          strength = '🟡 Moderada';
          strengthClass = 'text-yellow-400';
        } else {
          strength = '🟢 Fuerte';
          strengthClass = 'text-green-400';
        }
      }

      strengthDiv.textContent = strength;
      strengthDiv.className = `text-xs ${strengthClass} transition-all duration-300`;
    };

    const validatePasswordMatch = () => {
      if (!passwordInput || !confirmPasswordInput || !matchDiv) return;

      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      if (confirmPassword.length === 0) {
        matchDiv.textContent = '';
        matchDiv.className = 'text-xs mt-1 transition-all duration-300';
      } else if (password === confirmPassword) {
        matchDiv.textContent = '🟢 Las contraseñas coinciden';
        matchDiv.className = 'text-xs mt-1 text-green-400 transition-all duration-300';
      } else {
        matchDiv.textContent = '🔴 Las contraseñas no coinciden';
        matchDiv.className = 'text-xs mt-1 text-red-400 transition-all duration-300';
      }
    };

    if (passwordInput) {
      passwordInput.addEventListener('input', validatePassword);
      passwordInput.addEventListener('input', validatePasswordMatch);
    }

    if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener('input', validatePasswordMatch);
    }

    return () => {
      if (passwordInput) {
        passwordInput.removeEventListener('input', validatePassword);
        passwordInput.removeEventListener('input', validatePasswordMatch);
      }
      if (confirmPasswordInput) {
        confirmPasswordInput.removeEventListener('input', validatePasswordMatch);
      }
    };
  }, [isLogin]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;



    try {
      if (isLogin) {
        // Logging in...
        const isDevelopment = import.meta.env.DEV;
        if (!hcaptchaToken && !isDevelopment) {

          setError('Por favor, completa el captcha para continuar.');
          setLoading(false); // Detener el loading
          return;
        }



        // Captcha token obtained, proceeding with login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
          options: {
            captchaToken: hcaptchaToken || undefined,
          },
        });



        if (error) throw error;



        // Login successful
        // NO navegar inmediatamente - dejar que useAuth maneje la navegación
        // navigate('/dashboard') se manejará automáticamente en App.tsx
      } else {
        // Starting registration process
        setCheckingEmail(true);

        try {
          const isDevelopment = import.meta.env.DEV;
          if (!hcaptchaToken && !isDevelopment) {
            setError('Por favor, completa el captcha para continuar.');
            setLoading(false); // Detener el loading
            return;
          }

          // Captcha token obtained, proceeding with signup
          
          // NUEVO FLUJO: Validar, crear usuario y enviar email de verificación
          // Validating email format

          // Validación básica del email
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            setError('Por favor, ingresa un correo electrónico válido');
            return;
          }

          // Validación básica de la contraseña
          if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
          }

          // Validación de confirmación de contraseña
          if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
          }

          // Verificar si el email existe usando múltiples métodos
          // Checking email availability

          // Método 1: Usar la función RPC segura (si está disponible)
          let emailExists = false;

          try {
            const { data: availabilityCheck, error: rpcError } = await supabase.rpc(
              'check_email_availability',
              { check_email: email.toLowerCase().trim() }
            );

            if (!rpcError && availabilityCheck) {
              emailExists = !availabilityCheck.available;
              if (emailExists) {
                // Email already registered
              }
            } else {
              // Si la función RPC no existe, usar método alternativo
              // RPC not available, using alternative method

              // Método 2: Verificar con un query a profiles
              const { data: existingProfile, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email.toLowerCase().trim())
                .maybeSingle();

              if (profileError && profileError.code !== 'PGRST116') {
                // Error log removed for security;

                // Si profiles falla, no podemos verificar en auth.users desde el cliente
                // Por seguridad, procederemos y dejaremos que Supabase maneje el error
                console.warn(
                  'No se puede verificar en profiles, se verificará al intentar crear el usuario'
                );
              } else if (existingProfile) {
                emailExists = true;
                // Sensitive log removed for security');
              }
            }
          } catch (checkError) {
            // Error log removed for security;
            setError('Error al verificar el email. Por favor, intenta nuevamente.');
            return;
          }

          if (emailExists) {
            setError(
              'Este correo electrónico ya está registrado. Por favor, inicia sesión en lugar de registrarte.'
            );
            setIsLogin(true);
            return;
          }

          // Sensitive log removed for security;

          // Crear usuario en Supabase Auth y enviar email de verificación
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: email.toLowerCase().trim(),
            password: password,
            options: {
              captchaToken: hcaptchaToken || undefined,
              emailRedirectTo: `${window.location.origin}/auth/callback`,
              data: {
                email_confirmed: false,
                registration_step: 'email_verification'
              }
            }
          });

          if (signUpError) {
            throw signUpError;
          }

          // Sensitive log removed for security;

          // Guardar datos temporalmente para el cuestionario (sin contraseña por seguridad)
          sessionStorage.setItem(
            'pendingRegistration',
            JSON.stringify({
              email: email.toLowerCase().trim(),
              userId: signUpData.user?.id,
              timestamp: Date.now(),
            })
          );

          // Redirigir a página de verificación de email
          navigate('/email-verification', {
            state: {
              email: email.toLowerCase().trim(),
              fromRegistration: true,
            },
          });
          return;
        } finally {
          setCheckingEmail(false);
        }
      }
    } catch (err: any) {


      // Manejo de errores mejorado
      if (err.message === 'Invalid login credentials') {
        setError('Credenciales inválidas. Verifica tu email y contraseña.');
      } else if (err.message?.includes('Email not confirmed')) {
        setError(
          'Por favor confirma tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada y también tu carpeta de spam.'
        );
      } else if (err.message?.includes('Too many requests')) {
        setError('Demasiados intentos. Espera unos minutos antes de intentar de nuevo.');
      } else if (err.message === 'Failed to fetch' || err.name === 'AuthRetryableFetchError') {
        setError(
          'No se pudo conectar con Supabase. Verifica que Supabase local esté corriendo (npx supabase start) o que las credenciales de Supabase Cloud sean correctas.'
        );
      } else {
        setError(err.message || 'Error desconocido');
      }
      
      // Reset hCaptcha on any error
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setForgotPasswordMessage(null);

    const normalizedEmail = forgotPasswordEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setForgotPasswordMessage('Ingresa tu correo electrónico para continuar.');
      return;
    }

    setForgotPasswordLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;
      setForgotPasswordMessage(
        'Te enviamos un correo con instrucciones para restablecer tu contraseña.'
      );
    } catch (err: any) {
      setForgotPasswordMessage(
        err?.message || 'No se pudo enviar el correo de recuperación. Intenta nuevamente.'
      );
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4'>
      {/* Background decoration */}
      <div className='absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-transparent to-blue-900/20'></div>

      <div className='relative w-full max-w-5xl h-auto bg-gray-800/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700 overflow-hidden'>
        <div className='flex flex-col md:flex-row w-full h-full'>
          {/* Login Form */}
          <div
            className={`w-full md:w-1/2 transition-all duration-500 ease-in-out p-8 ${isLogin ? 'block' : 'hidden md:block'}`}
          >
            <form onSubmit={handleSubmit} className='w-full max-w-md mx-auto space-y-6'>
              <div className='text-center mb-8'>
                <DeepLuxLogo variant='auth' showProduct={false} />
                <h1 className='text-3xl font-bold text-white mb-2 mt-4'>Iniciar Sesión</h1>
                <p className='text-gray-400'>Accede a Expediente DLM</p>
              </div>

              {error && (
                <div className='bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg flex items-start text-sm mb-4 animate-in slide-in-from-top-2 duration-300'>
                  <AlertCircle className='h-5 w-5 mr-3 flex-shrink-0 mt-0.5' />
                  <div>
                    <div className='font-medium mb-1'>Error de Inicio de Sesión</div>
                    <div className='text-red-200'>{error}</div>
                  </div>
                </div>
              )}

              <div className='space-y-4'>
                <div>
                  <label
                    htmlFor='email-login'
                    className='block text-sm font-medium text-gray-300 mb-2'
                  >
                    Correo electrónico
                  </label>
                  <div className='relative'>
                    <input
                      id='email-login'
                      type='email'
                      name='email'
                      autoComplete='username'
                      placeholder='ejemplo@deepluxmed.com'
                      required
                      className='w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all'
                    />
                    <Mail className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor='password-login'
                    className='block text-sm font-medium text-gray-300 mb-2'
                  >
                    Contraseña
                  </label>
                  <div className='relative'>
                    <input
                      id='password-login'
                      type='password'
                      name='password'
                      autoComplete='current-password'
                      placeholder='••••••••'
                      required
                      className='w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all'
                    />
                    <Lock className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' />
                  </div>
                </div>
                {/* hCaptcha Widget for Login */}
                {!import.meta.env.DEV && (
                  <div className='mt-2'>
                    <HCaptcha
                      ref={loginCaptchaRef}
                      sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY || ''}
                      onVerify={handleCaptchaVerify}
                      onError={handleCaptchaError}
                      onExpire={handleCaptchaExpire}
                      theme='dark'
                    />
                  </div>
                )}
              </div>

              <div className='text-right'>
                <button
                  type='button'
                  onClick={() => {
                    setShowForgotPassword(prev => !prev);
                    setForgotPasswordMessage(null);
                  }}
                  className='text-sm text-cyan-400 hover:text-cyan-300 transition-colors'
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {showForgotPassword && (
                <div className='rounded-lg border border-cyan-700/70 bg-cyan-950/30 p-4 space-y-3'>
                  <p className='text-sm text-cyan-100'>
                    Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.
                  </p>
                  <form onSubmit={handleForgotPassword} className='space-y-3'>
                    <div className='relative'>
                      <input
                        type='email'
                        name='recoveryEmail'
                        autoComplete='email'
                        value={forgotPasswordEmail}
                        onChange={e => setForgotPasswordEmail(e.target.value)}
                        placeholder='ejemplo@deepluxmed.com'
                        required
                        className='w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all'
                      />
                      <Mail className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' />
                    </div>
                    <button
                      type='submit'
                      disabled={forgotPasswordLoading}
                      className='w-full py-2 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
                    >
                      {forgotPasswordLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                    </button>
                  </form>
                  {forgotPasswordMessage && (
                    <p className='text-xs text-cyan-200'>{forgotPasswordMessage}</p>
                  )}
                </div>
              )}

              <button
                type='submit'
                disabled={loading}
                className='w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center'
              >
                {loading ? (
                  <>
                    <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2'></div>
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>

              {/* OAuth Buttons for Login */}
              <div className='mt-6'>
                <OAuthButtons mode='login' onError={setError} />
              </div>
            </form>
          </div>

          {/* Register Form */}
          <div
            className={`w-full md:w-1/2 transition-all duration-500 ease-in-out p-8 ${isLogin ? 'hidden md:block' : 'block'}`}
          >
            <form onSubmit={handleSubmit} className='w-full max-w-md mx-auto space-y-6'>
              <div className='text-center mb-8'>
                <DeepLuxLogo variant='auth' showProduct={false} />
                <h1 className='text-3xl font-bold text-white mb-2 mt-4'>Crear Cuenta</h1>
                <p className='text-gray-400'>Únete a DeepLux MED</p>
              </div>

              {error && (
                <div className='bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg flex items-start text-sm mb-4 animate-in slide-in-from-top-2 duration-300'>
                  <AlertCircle className='h-5 w-5 mr-3 flex-shrink-0 mt-0.5' />
                  <div>
                    <div className='font-medium mb-1'>Error de Registro</div>
                    <div className='text-red-200'>{error}</div>
                  </div>
                </div>
              )}

              <div className='space-y-4'>
                <div>
                  <label
                    htmlFor='email-register'
                    className='block text-sm font-medium text-gray-300 mb-2'
                  >
                    Correo electrónico
                  </label>
                  <div className='relative'>
                    <input
                      id='email-register'
                      type='email'
                      name='email'
                      autoComplete='email'
                      placeholder='ejemplo@correo.com'
                      required
                      disabled={checkingEmail}
                      className='w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all disabled:opacity-50'
                    />
                    {checkingEmail ? (
                      <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                        <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-400'></div>
                      </div>
                    ) : (
                      <Mail className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' />
                    )}
                  </div>
                  <p className='text-xs text-cyan-400 mt-1'>
                    {checkingEmail
                      ? '🔍 Verificando disponibilidad del email...'
                      : '✨ Solo necesitamos tu email para comenzar'}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor='password-register'
                    className='block text-sm font-medium text-gray-300 mb-2'
                  >
                    Contraseña *
                  </label>
                  <div className='relative'>
                    <input
                      id='password-register'
                      type={showRegisterPassword ? 'text' : 'password'}
                      name='password'
                      autoComplete='new-password'
                      placeholder='••••••••'
                      required
                      minLength={6}
                      disabled={checkingEmail}
                      className='w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-20 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all disabled:opacity-50'
                    />
                    <button
                      type='button'
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className='absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 disabled:opacity-50'
                      disabled={checkingEmail}
                    >
                      {showRegisterPassword ? (
                        <EyeOff className='h-5 w-5' />
                      ) : (
                        <Eye className='h-5 w-5' />
                      )}
                    </button>
                    <Lock className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' />
                  </div>
                  <div className='flex items-center justify-between mt-1'>
                    <p className='text-xs text-gray-400'>Mínimo 6 caracteres</p>
                    <div className='text-xs' id='password-strength'></div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor='confirm-password-register'
                    className='block text-sm font-medium text-gray-300 mb-2'
                  >
                    Confirmar contraseña *
                  </label>
                  <div className='relative'>
                    <input
                      id='confirm-password-register'
                      type={showRegisterConfirmPassword ? 'text' : 'password'}
                      name='confirmPassword'
                      autoComplete='new-password'
                      placeholder='••••••••'
                      required
                      minLength={6}
                      disabled={checkingEmail}
                      className='w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 pr-20 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all disabled:opacity-50'
                    />
                    <button
                      type='button'
                      onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                      className='absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 disabled:opacity-50'
                      disabled={checkingEmail}
                    >
                      {showRegisterConfirmPassword ? (
                        <EyeOff className='h-5 w-5' />
                      ) : (
                        <Eye className='h-5 w-5' />
                      )}
                    </button>
                    <Lock className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' />
                  </div>
                  <div className='text-xs mt-1' id='password-match'></div>
                </div>
              </div>

              <div className='bg-blue-900/30 border border-blue-700 rounded-lg p-4'>
                <div className='flex items-start space-x-3'>
                  <div className='flex-shrink-0'>
                    <div className='w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center'>
                      <span className='text-blue-900 text-xs font-bold'>1</span>
                    </div>
                  </div>
                  <div>
                    <p className='text-blue-300 text-sm font-medium mb-1'>
                      ✨ Registro inteligente y seguro
                    </p>
                    <p className='text-blue-200 text-xs'>
                      • Credenciales verificadas antes del cuestionario
                      <br />
                      • Usuario creado solo al completar todo el proceso
                      <br />• Sin usuarios basura en la base de datos
                    </p>
                  </div>
                </div>
              </div>

              {/* hCaptcha Widget for Registration */}
              {!import.meta.env.DEV && (
                <div className='mt-4'>
                  <HCaptcha
                    ref={signupCaptchaRef}
                    sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY || ''}
                    onVerify={handleCaptchaVerify}
                    onError={handleCaptchaError}
                    onExpire={handleCaptchaExpire}
                    theme='dark'
                  />
                </div>
              )}

              <button
                type='submit'
                disabled={loading || checkingEmail}
                className='w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center transform hover:scale-[1.02] active:scale-[0.98]'
              >
                {checkingEmail ? (
                  <>
                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                    <span className='animate-pulse'>Verificando email...</span>
                  </>
                ) : loading ? (
                  <>
                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                    <span className='animate-pulse'>Iniciando registro...</span>
                  </>
                ) : (
                  <>
                    Comenzar Registro 
                    <span className='ml-2 transition-transform group-hover:translate-x-1'>→</span>
                  </>
                )}
              </button>

              {/* OAuth Buttons for Signup */}
              <div className='mt-6'>
                <OAuthButtons mode='signup' onError={setError} />
              </div>

              <div className='text-center'>
                <button
                  type='button'
                  onClick={() => {
                    setIsLogin(true);
                    setError(null);
                  }}
                  className='text-cyan-400 text-sm hover:text-cyan-300 transition-colors'
                >
                  ¿Ya tienes una cuenta? Iniciar sesión
                </button>
              </div>
            </form>
          </div>

          {/* Toggle Panel - Desktop */}
          <div
            className={`hidden md:block absolute inset-y-0 w-1/2 bg-gradient-to-br from-cyan-600 to-blue-700 transition-all duration-700 ease-in-out z-10 shadow-2xl ${
              isLogin ? 'right-0' : 'right-1/2'
            }`}
            style={{
              borderRadius: isLogin ? '0 1rem 1rem 0' : '1rem 0 0 1rem',
            }}
          >
            <div className='flex flex-col h-full items-center justify-center p-8 text-white relative'>
              <div className='absolute inset-0 bg-gradient-to-br from-black/20 to-transparent'></div>
              <div className='relative z-10 text-center'>
                {isLogin ? (
                  <>
                    <div className='mb-6'>
                      <div className='w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4'>
                        <DeepLuxLogo variant='compact' />
                      </div>
                    </div>
                    <h2 className='text-3xl font-bold mb-4'>¡Bienvenido!</h2>
                    <p className='text-cyan-100 mb-8 text-lg'>
                      ¿Aún no tienes una cuenta? Únete a DeepLux MED y accede a la tecnología médica
                      más avanzada
                    </p>
                    <button
                      onClick={() => {
                        setIsLogin(false);
                        setError(null);
                      }}
                      className='px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-cyan-600 transition-all duration-300'
                    >
                      Crear Cuenta
                    </button>
                  </>
                ) : (
                  <>
                    <div className='mb-6'>
                      <div className='w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4'>
                        <DeepLuxLogo variant='compact' />
                      </div>
                    </div>
                    <h2 className='text-3xl font-bold mb-4'>¡Te esperamos!</h2>
                    <p className='text-cyan-100 mb-8 text-lg'>
                      ¿Ya eres parte de DeepLux MED? Inicia sesión y continúa transformando la
                      medicina
                    </p>
                    <button
                      onClick={() => {
                        setIsLogin(true);
                        setError(null);
                      }}
                      className='px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-cyan-600 transition-all duration-300'
                    >
                      Iniciar Sesión
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Toggle */}
          <div className='md:hidden w-full p-6 text-center border-t border-gray-700'>
            {isLogin ? (
              <button
                onClick={() => {
                  setIsLogin(false);
                  setError(null);
                }}
                className='text-cyan-400 font-medium hover:text-cyan-300 transition-colors'
              >
                ¿No tienes una cuenta? <span className='underline'>Crear cuenta</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsLogin(true);
                  setError(null);
                }}
                className='text-cyan-400 font-medium hover:text-cyan-300 transition-colors'
              >
                ¿Ya tienes una cuenta? <span className='underline'>Iniciar sesión</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
