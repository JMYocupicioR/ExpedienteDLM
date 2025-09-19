import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertCircle } from 'lucide-react';

interface OAuthButtonsProps {
  mode: 'login' | 'signup';
  onError?: (error: string) => void;
}

export default function OAuthButtons({ mode, onError }: OAuthButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOAuthLogin = async (provider: 'google' /* | 'facebook' */) => {
    try {
      setLoading(provider);
      setError(null);
      
      // Para OAuth, usamos el mismo endpoint tanto para login como signup
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // Redirigir a una página de callback que maneje el flujo
          redirectTo: `${window.location.origin}/auth/callback?auth_mode=${mode}`,
          // Agregar scopes necesarios
          scopes: provider === 'google' ? 'email profile' : 'email public_profile',
          // Indicar si es signup para manejo posterior
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            auth_mode: mode
          }
        }
      });

      if (error) throw error;
      
      // La redirección se maneja automáticamente
    } catch (err: any) {
      // Error log removed for security;
      const errorMsg = `Error al iniciar sesión con ${provider}. Por favor, intenta nuevamente.`;
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-gray-800 text-gray-400">
            O continúa con
          </span>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => handleOAuthLogin('google')}
          disabled={loading !== null}
          className="w-full max-w-xs flex items-center justify-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'google' ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </>
          )}
        </button>
      </div>

      {/* Facebook OAuth - Temporalmente deshabilitado */}
      {/* 
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => handleOAuthLogin('facebook')}
          disabled={loading !== null}
          className="w-full max-w-xs flex items-center justify-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'facebook' ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </>
          )}
        </button>
      </div>
      */}

      {error && (
        <div className="mt-2 p-3 bg-red-900/20 border border-red-500/50 rounded-md">
          <p className="text-sm text-red-400 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </p>
        </div>
      )}

      <p className="text-xs text-gray-500 text-center mt-4">
        Al continuar, aceptas nuestros{' '}
        <a href="/terms" className="text-cyan-400 hover:underline">
          Términos de Servicio
        </a>{' '}
        y{' '}
        <a href="/privacy" className="text-cyan-400 hover:underline">
          Política de Privacidad
        </a>
      </p>
    </div>
  );
}
