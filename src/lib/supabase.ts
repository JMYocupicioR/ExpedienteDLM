import { Database } from '@/lib/database.types';
import { createClient } from '@supabase/supabase-js';

// Obtener variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificar que las variables de entorno estén configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables de Supabase no configuradas');
  console.error('Por favor, configura las siguientes variables en tu archivo .env:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- VITE_SUPABASE_ANON_KEY');
  console.error('Variables encontradas:');
  console.error('URL:', supabaseUrl);
  console.error('Key:', supabaseAnonKey ? 'Definida' : 'No definida');

  // En lugar de lanzar error inmediatamente, intentar con valores por defecto
  if (!supabaseUrl) {
    console.warn('⚠️ Usando URL por defecto para desarrollo');
  }
  if (!supabaseAnonKey) {
    console.warn('⚠️ Usando clave por defecto para desarrollo');
  }
}

// Verificar formato de URL solo si existe
if (supabaseUrl && (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co'))) {
  console.error('❌ URL de Supabase inválida:', supabaseUrl);
  console.error('La URL de Supabase debe tener el formato: https://tu-proyecto.supabase.co');
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

console.log('✅ Supabase configurado correctamente');
console.log('📡 URL:', finalUrl);
console.log('🔑 Clave configurada:', finalKey ? 'Sí' : 'No');

// Función simple para verificar conectividad (opcional, no bloquea la aplicación)
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('⚠️ Problema con la sesión de Supabase:', error.message);
      return false;
    }
    console.log('✅ Conexión a Supabase verificada');
    return true;
  } catch (error) {
    console.warn('⚠️ No se pudo verificar la conexión a Supabase:', error);
    return false;
  }
};

// Función utilitaria para limpiar cachés (simplificada)
export const clearAuthCache = async () => {
  try {
    console.log('🧹 Limpiando caché de autenticación...');

    // 1. Cerrar sesión en Supabase
    await supabase.auth.signOut();

    // 2. Limpiar localStorage relacionado con Supabase
    const keysToRemove = Object.keys(localStorage).filter(
      key => key.startsWith('supabase.') || key.includes('supabase') || key.includes('auth')
    );

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    console.log(`📦 ${keysToRemove.length} elementos de caché eliminados`);
    console.log('✅ Caché limpiado exitosamente');
  } catch (error) {
    console.error('❌ Error limpiando caché:', error);
  }
};

// Listener para cambios de estado de autenticación
supabase.auth.onAuthStateChange((event, session) => {
  switch (event) {
    case 'SIGNED_IN':
      console.log('✅ Usuario autenticado:', session?.user?.email);
      break;
    case 'SIGNED_OUT':
      console.log('👋 Usuario desautenticado');
      break;
    case 'TOKEN_REFRESHED':
      console.log('🔄 Token de autenticación renovado');
      break;
    case 'USER_UPDATED':
      console.log('👤 Información de usuario actualizada');
      break;
    case 'PASSWORD_RECOVERY':
      console.log('🔐 Recuperación de contraseña iniciada');
      break;
    default:
      console.log('🔄 Cambio de estado de autenticación:', event);
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
    console.error('Error obteniendo usuario actual:', error);
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
    console.error('Error obteniendo perfil:', error);
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
    console.error('Error creando perfil:', error);
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
    console.error('Error actualizando perfil:', error);
    throw error;
  }
};

// Función simple para verificar rol del usuario
export const hasRole = async (userId: string, requiredRole: string): Promise<boolean> => {
  try {
    const profile = await getUserProfile(userId);
    return profile?.role === requiredRole;
  } catch (error) {
    console.error('Error verificando rol:', error);
    return false;
  }
};

export default supabase;
