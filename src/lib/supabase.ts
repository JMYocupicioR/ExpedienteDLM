import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificar si las variables de entorno están configuradas
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Crear cliente solo si está configurado, usar valores por defecto si no
const url = supabaseUrl || 'https://placeholder.supabase.co';
const key = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZWxicnpqcm1qeHBqeGxseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNDQ1NDUsImV4cCI6MjA2MjkyMDU0NX0.FPREjK1R3FEsVbcAMQVcOrRcs16MYFL8cQHK2W3STKw';

export const supabase = createClient<Database>(url, key);

// Función para verificar conectividad con Supabase
export const checkSupabaseConnection = async (timeoutMs = 5000): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    console.warn('⚠️ Supabase no está configurado. Variables de entorno faltantes.');
    return false;
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    );

    const connectionPromise = supabase.auth.getSession();

    await Promise.race([connectionPromise, timeoutPromise]);
    return true;
  } catch (error) {
    console.warn('⚠️ No se pudo conectar a Supabase:', error);
    return false;
  }
};

/**
 * Establece la información de la sesión para la auditoría en la base de datos.
 * Esta información es utilizada por los triggers de auditoría para registrar
 * la dirección IP y el agente de usuario que realizan una operación.
 * 
 * @param {string} sessionId - Un identificador para la sesión actual.
 */
export const setSessionInfo = async (sessionId: string) => {
  const sessionInfo = {
    ip_address: '127.0.0.1', // En un entorno real, esto debería obtenerse del servidor.
    user_agent: navigator.userAgent,
    session_id: sessionId,
  };

  // El 'BEGIN' y 'COMMIT' aseguran que el setting solo dure para la transacción.
  const { error } = await supabase.rpc('execute_as_transaction', {
    sql: `
      SET LOCAL app.session_info = '${JSON.stringify(sessionInfo)}';
    `
  });

  if (error) {
    console.error('Error setting session info for audit:', error);
  }
};

/**
 * Función utilitaria para limpiar completamente el caché y sesiones
 */
export const clearAllCache = async () => {
  try {
    console.log('🧹 Iniciando limpieza completa...');
    
    // 1. Cerrar sesión en Supabase
    await supabase.auth.signOut();
    
    // 2. Limpiar localStorage
    const localStorageKeys = Object.keys(localStorage);
    localStorageKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    console.log(`📦 localStorage limpiado: ${localStorageKeys.length} items removidos`);
    
    // 3. Limpiar sessionStorage
    const sessionStorageKeys = Object.keys(sessionStorage);
    sessionStorageKeys.forEach(key => {
      sessionStorage.removeItem(key);
    });
    console.log(`📦 sessionStorage limpiado: ${sessionStorageKeys.length} items removidos`);
    
    // 4. Limpiar caché del navegador
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log(`🗂️ Cache del navegador limpiado: ${cacheNames.length} cachés removidos`);
    }
    
    // 5. Limpiar IndexedDB de Supabase
    if ('indexedDB' in window) {
      try {
        const databases = ['supabase-auth-token', 'supabase-cache'];
        for (const dbName of databases) {
          const deleteReq = indexedDB.deleteDatabase(dbName);
          await new Promise((resolve, reject) => {
            deleteReq.onsuccess = () => resolve(true);
            deleteReq.onerror = () => reject(deleteReq.error);
          });
        }
        console.log('🗃️ IndexedDB limpiado');
      } catch (error) {
        console.warn('⚠️ No se pudo limpiar IndexedDB:', error);
      }
    }
    
    console.log('✅ Limpieza completa exitosa');
    
    // 6. Recargar la página para asegurar estado limpio
    setTimeout(() => {
      window.location.href = '/auth';
    }, 500);
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  }
};

/**
 * Una función de ejemplo para envolver una llamada a Supabase que requiere auditoría.
 * Primero establece la información de la sesión y luego realiza la operación.
 * 
 * @param {object} profileData - Los datos del perfil a actualizar.
 * @param {string} userId - El ID del usuario a actualizar.
 */
export const updateUserProfileWithAudit = async (profileData: Record<string, unknown>, userId: string) => {
  const sessionId = crypto.randomUUID(); // Generar un ID de sesión único para esta operación
  
  // Establecer la información de la sesión para la auditoría
  await setSessionInfo(sessionId);

  // Realizar la operación de actualización
  return supabase
    .from('profiles')
    .update(profileData)
    .eq('id', userId);
};

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('User signed in:', session?.user?.email);
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
  }
});