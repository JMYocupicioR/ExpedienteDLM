import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

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
 * Una función de ejemplo para envolver una llamada a Supabase que requiere auditoría.
 * Primero establece la información de la sesión y luego realiza la operación.
 * 
 * @param {object} profileData - Los datos del perfil a actualizar.
 * @param {string} userId - El ID del usuario a actualizar.
 */
export const updateUserProfileWithAudit = async (profileData: any, userId: string) => {
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