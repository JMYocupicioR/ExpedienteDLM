// Configuración de hCaptcha para ExpedienteDLM
export const HCAPTCHA_CONFIG = {
  // Clave del sitio de hCaptcha (pública, segura para el frontend)
  siteKey: import.meta.env.VITE_HCAPTCHA_SITE_KEY || '5e0e8956-46b8-4a76-a756-b5d0cdc02d24',
  
  // Configuración del widget
  theme: 'dark' as const,
  size: 'normal' as const,
  language: 'es',
  
  // URLs permitidas para hCaptcha
  allowedDomains: [
    'expediente-dlm.com',
    'expediente-dlm.com/auth',
    'expediente-dlm.com/login',
    'expediente-dlm.com/register',
    'localhost:5173',
    'localhost:3000',
    '127.0.0.1:5173'
  ]
};

// Función para verificar si el dominio actual está permitido
export const isDomainAllowed = (): boolean => {
  const currentDomain = window.location.hostname;
  const currentPort = window.location.port;
  const currentUrl = currentPort ? `${currentDomain}:${currentPort}` : currentDomain;
  
  return HCAPTCHA_CONFIG.allowedDomains.some(domain => {
    if (domain.includes(':')) {
      return currentUrl === domain;
    }
    return currentDomain === domain;
  });
};

// Función para obtener el token de hCaptcha
export const getHcaptchaToken = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof window.hcaptcha === 'undefined') {
      reject(new Error('hCaptcha no está cargado'));
      return;
    }

    try {
      window.hcaptcha.execute(HCAPTCHA_CONFIG.siteKey, { async: true })
        .then(token => {
          if (token) {
            resolve(token);
          } else {
            reject(new Error('No se pudo obtener el token de hCaptcha'));
          }
        })
        .catch(error => {
          reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
};

// Función para resetear hCaptcha
export const resetHcaptcha = (): void => {
  if (typeof window.hcaptcha !== 'undefined') {
    window.hcaptcha.reset();
  }
};

// Función para renderizar el widget de hCaptcha
export const renderHcaptcha = (containerId: string, onVerify?: (token: string) => void): void => {
  if (typeof window.hcaptcha === 'undefined') {
    console.error('hCaptcha no está cargado');
    return;
  }

  try {
    window.hcaptcha.render(containerId, {
      sitekey: HCAPTCHA_CONFIG.siteKey,
      theme: HCAPTCHA_CONFIG.theme,
      size: HCAPTCHA_CONFIG.size,
      callback: (token: string) => {
        if (onVerify) {
          onVerify(token);
        }
      },
      'expired-callback': () => {
        console.log('Token de hCaptcha expirado');
      },
      'error-callback': () => {
        console.error('Error en hCaptcha');
      }
    });
  } catch (error) {
    console.error('Error renderizando hCaptcha:', error);
  }
};

// Tipos para hCaptcha
declare global {
  interface Window {
    hcaptcha: {
      render: (container: string, options: any) => void;
      execute: (siteKey: string, options: any) => Promise<string>;
      reset: () => void;
      getResponse: () => string;
    };
  }
}
