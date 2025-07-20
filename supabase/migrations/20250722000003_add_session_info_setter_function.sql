/*
  # Migración para Crear Función de Establecimiento de Información de Sesión

  1. Problema identificado:
    - No existe un mecanismo seguro para que el cliente (frontend) establezca
      la información de la sesión (`app.session_info`) para la auditoría.
    - Llamar a `SET LOCAL` directamente desde el cliente no es ideal.

  2. Corrección:
    - Se crea una función de base de datos `set_app_session_info` que puede ser
      llamada de forma segura a través de RPC desde el cliente.
    - Esta función toma un objeto JSON y lo establece como el valor de `app.session_info`
      para la duración de la transacción actual.
*/

-- ===== FUNCIÓN PARA ESTABLECER LA INFORMACIÓN DE LA SESIÓN =====

CREATE OR REPLACE FUNCTION public.set_app_session_info(session_info_json JSONB)
RETURNS TEXT AS $$
BEGIN
  -- Establecer la variable de sesión local. 'LOCAL' asegura que solo dure
  -- para la transacción actual, lo cual es más seguro.
  EXECUTE 'SET LOCAL app.session_info = ''' || session_info_json::TEXT || '''';
  
  RETURN 'Session information set for this transaction.';
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ===== COMENTARIOS Y DOCUMENTACIÓN =====
COMMENT ON FUNCTION public.set_app_session_info(JSONB) IS 'Establece de forma segura la variable de sesión app.session_info para la transacción actual, utilizada por los triggers de auditoría.';

-- ===== LOG DE MIGRACIÓN =====
DO $$
BEGIN
  RAISE LOG 'MIGRACIÓN COMPLETADA: Se ha creado la función set_app_session_info para la auditoría.';
END $$; 