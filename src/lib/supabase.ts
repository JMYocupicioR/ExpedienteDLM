import { Database } from '@/lib/database.types';
import { createClient } from '@supabase/supabase-js';

// Obtener variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificar que las variables de entorno estén configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  // Error log removed for security;
  // Error log removed for security;
  // Error log removed for security;
  // Error log removed for security;
  // Error log removed for security;
  // Error log removed for security;
  // Error log removed for security;

  // En lugar de lanzar error inmediatamente, intentar con valores por defecto
  if (!supabaseUrl) {
    // Warning log removed for security;
  }
  if (!supabaseAnonKey) {
    // Warning log removed for security;
  }
}

// Verificar formato de URL solo si existe
if (supabaseUrl && (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co'))) {
  // Error log removed for security;
  // Error log removed for security;
}

// Usar valores por defecto si no están configurados (solo para desarrollo)
const finalUrl = supabaseUrl || 'https://YOUR_PROJECT_REF.supabase.co';
const finalKey = supabaseAnonKey || 'YOUR_SUPABASE_ANON_KEY';

// Crear cliente de Supabase
export const supabase = createClient<Database>(finalUrl, finalKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Estado de configuración
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Sensitive log removed for security;
// Sensitive log removed for security;
// Sensitive log removed for security;

// Función simple para verificar conectividad (opcional, no bloquea la aplicación)
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      // Warning log removed for security;
      return false;
    }
    // Sensitive log removed for security;
    return true;
  } catch (error) {
    // Warning log removed for security;
    return false;
  }
};

// Función utilitaria para limpiar cachés (simplificada)
export const clearAuthCache = async () => {
  try {
    // Sensitive log removed for security;

    // 1. Cerrar sesión en Supabase
    await supabase.auth.signOut();

    // 2. Limpiar localStorage relacionado con Supabase
    const keysToRemove = Object.keys(localStorage).filter(
      key => key.startsWith('supabase.') || key.includes('supabase') || key.includes('auth')
    );

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    // Sensitive log removed for security;
    // Sensitive log removed for security;
  } catch (error) {
    // Error log removed for security;
  }
};

// Listener para cambios de estado de autenticación
supabase.auth.onAuthStateChange((event, session) => {
  switch (event) {
    case 'SIGNED_IN':
      // Sensitive log removed for security;
      break;
    case 'SIGNED_OUT':
      // Sensitive log removed for security;
      break;
    case 'TOKEN_REFRESHED':
      // Sensitive log removed for security;
      break;
    case 'USER_UPDATED':
      // Sensitive log removed for security;
      break;
    case 'PASSWORD_RECOVERY':
      // Sensitive log removed for security;
      break;
    default:
      // Sensitive log removed for security;
  }
});

// Función para obtener información del usuario actual
export const getCurrentUser = async () => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    // Error log removed for security;
    return null;
  }
};

// Función para obtener perfil del usuario
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

    if (error) throw error;
    return data;
  } catch (error) {
    // Error log removed for security;
    return null;
  }
};

// Función para crear perfil de usuario
export const createUserProfile = async (userId: string, profileData: any) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        ...profileData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    // Error log removed for security;
    throw error;
  }
};

// Función para actualizar perfil de usuario
export const updateUserProfile = async (userId: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    // Error log removed for security;
    throw error;
  }
};

// Función simple para verificar rol del usuario
export const hasRole = async (userId: string, requiredRole: string): Promise<boolean> => {
  try {
    const profile = await getUserProfile(userId);
    return profile?.role === requiredRole;
  } catch (error) {
    // Error log removed for security;
    return false;
  }
};

export default supabase;
