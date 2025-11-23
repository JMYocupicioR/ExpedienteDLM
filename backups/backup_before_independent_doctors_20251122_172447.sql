

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."clinic_permission" AS ENUM (
    'clinic.view',
    'clinic.edit',
    'clinic.delete',
    'patients.view',
    'patients.create',
    'patients.edit',
    'patients.delete',
    'appointments.view',
    'appointments.create',
    'appointments.edit',
    'appointments.delete',
    'staff.view',
    'staff.invite',
    'staff.edit',
    'staff.remove',
    'billing.view',
    'billing.create',
    'billing.edit',
    'reports.view',
    'reports.create'
);


ALTER TYPE "public"."clinic_permission" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_patient_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Solo insertar en audit_logs si la tabla existe y tiene la estructura correcta
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'audit_logs' 
        AND table_schema = 'public'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' 
        AND table_schema = 'public' 
        AND column_name = 'table_name'
    ) THEN
        INSERT INTO public.audit_logs (
            table_name,
            operation,
            user_id,
            record_id,
            old_data,
            new_data,
            created_at
        ) VALUES (
            'patients',
            TG_OP,
            auth.uid(),
            COALESCE(NEW.id, OLD.id),
            CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
            CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
            NOW()
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        -- Si hay error en auditoría, no fallar la operación principal
        RAISE WARNING 'Error en auditoría: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."audit_patient_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_patient_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Log the creation attempt
  INSERT INTO public.activity_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details,
    clinic_id
  ) VALUES (
    auth.uid(),
    'create',
    'patient',
    NEW.id,
    jsonb_build_object(
      'patient_name', NEW.full_name,
      'curp', NEW.curp,
      'created_by', auth.uid(),
      'clinic_id', NEW.clinic_id
    ),
    NEW.clinic_id
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."audit_patient_creation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_table_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Function logic here
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."audit_table_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_save_physical_exam_draft"("p_patient_id" "uuid", "p_doctor_id" "uuid", "p_template_id" "uuid", "p_draft_data" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  draft_id UUID;
BEGIN
  -- Try to update existing draft
  UPDATE physical_exam_drafts 
  SET 
    draft_data = p_draft_data,
    last_modified = now()
  WHERE 
    patient_id = p_patient_id AND 
    doctor_id = p_doctor_id AND
    template_id = p_template_id
  RETURNING id INTO draft_id;
  
  -- If no existing draft, create new one
  IF draft_id IS NULL THEN
    INSERT INTO physical_exam_drafts (
      patient_id,
      doctor_id,
      template_id,
      draft_data
    ) VALUES (
      p_patient_id,
      p_doctor_id,
      p_template_id,
      p_draft_data
    ) RETURNING id INTO draft_id;
  END IF;
  
  RETURN draft_id;
END;
$$;


ALTER FUNCTION "public"."auto_save_physical_exam_draft"("p_patient_id" "uuid", "p_doctor_id" "uuid", "p_template_id" "uuid", "p_draft_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_bmi"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.height IS NOT NULL AND NEW.weight IS NOT NULL THEN
    IF NEW.height_unit = 'cm' THEN
      NEW.bmi = NEW.weight / POWER(NEW.height / 100, 2);
    ELSE
      NEW.bmi = NEW.weight / POWER(NEW.height, 2);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_bmi"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_bmi"("weight" numeric, "height" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN weight / (height * height);
END;
$$;


ALTER FUNCTION "public"."calculate_bmi"("weight" numeric, "height" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_template_checksum"("definition_data" "jsonb") RETURNS character varying
    LANGUAGE "plpgsql" IMMUTABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN encode(digest(definition_data::text, 'sha256'), 'hex');
END;
$$;


ALTER FUNCTION "public"."calculate_template_checksum"("definition_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_clinic_data"("target_clinic_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_role TEXT;
  user_clinic_id UUID;
BEGIN
  SELECT role, clinic_id INTO user_role, user_clinic_id
  FROM public.profiles 
  WHERE id = auth.uid();
  
  -- Super admin puede acceder a todo
  IF user_role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Otros roles solo pueden acceder a su propia clínica
  RETURN user_clinic_id = target_clinic_id;
END;
$$;


ALTER FUNCTION "public"."can_access_clinic_data"("target_clinic_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_appointment_conflict"("p_doctor_id" "uuid", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_duration" integer, "p_exclude_appointment_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  conflict_exists BOOLEAN := false;
  appointment_start TIMESTAMP;
  appointment_end TIMESTAMP;
BEGIN
  -- Combinar fecha y hora para crear timestamps
  appointment_start := (p_appointment_date::text || ' ' || p_appointment_time::text)::timestamp;
  appointment_end := appointment_start + (p_duration || ' minutes')::interval;
  
  -- Verificar si existe conflicto con otras citas del mismo médico
  SELECT EXISTS (
    SELECT 1 
    FROM public.appointments a
    WHERE a.doctor_id = p_doctor_id
      AND a.status NOT IN ('cancelled_by_clinic', 'cancelled_by_patient', 'no_show')
      AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
      AND (
        -- La nueva cita empieza durante una cita existente
        (appointment_start >= (a.appointment_date::text || ' ' || a.appointment_time::text)::timestamp 
         AND appointment_start < (a.appointment_date::text || ' ' || a.appointment_time::text)::timestamp + (a.duration || ' minutes')::interval)
        OR
        -- La nueva cita termina durante una cita existente
        (appointment_end > (a.appointment_date::text || ' ' || a.appointment_time::text)::timestamp 
         AND appointment_end <= (a.appointment_date::text || ' ' || a.appointment_time::text)::timestamp + (a.duration || ' minutes')::interval)
        OR
        -- La nueva cita envuelve completamente una cita existente
        (appointment_start <= (a.appointment_date::text || ' ' || a.appointment_time::text)::timestamp 
         AND appointment_end >= (a.appointment_date::text || ' ' || a.appointment_time::text)::timestamp + (a.duration || ' minutes')::interval)
      )
  ) INTO conflict_exists;
  
  RETURN conflict_exists;
END;
$$;


ALTER FUNCTION "public"."check_appointment_conflict"("p_doctor_id" "uuid", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_duration" integer, "p_exclude_appointment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_email_availability"("check_email" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
    email_exists boolean := false;
    result json;
BEGIN
    -- Limpiar y normalizar el email
    check_email := lower(trim(check_email));
    
    -- Validar formato básico de email
    IF check_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RETURN json_build_object(
            'available', false,
            'message', 'Formato de email inválido',
            'error', true
        );
    END IF;
    
    -- Verificar si el email existe en profiles
    SELECT EXISTS(
        SELECT 1 FROM public.profiles 
        WHERE email = check_email
    ) INTO email_exists;
    
    -- Si no existe en profiles, verificar en auth.users usando metadatos
    -- (No podemos acceder directamente a auth.users desde funciones públicas por seguridad)
    IF NOT email_exists THEN
        -- Por seguridad, asumimos que si no está en profiles puede estar disponible
        -- El registro real en Supabase Auth validará definitivamente
        result := json_build_object(
            'available', true,
            'message', 'Email disponible',
            'checked_profiles', true,
            'error', false
        );
    ELSE
        result := json_build_object(
            'available', false,
            'message', 'Este email ya está registrado. Puedes iniciar sesión en su lugar.',
            'error', false
        );
    END IF;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- En caso de error, devolver información mínima por seguridad
        RETURN json_build_object(
            'available', true,
            'message', 'Verificación completada',
            'error', false,
            'fallback', true
        );
END;
$_$;


ALTER FUNCTION "public"."check_email_availability"("check_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_email_availability"("check_email" "text") IS 'Función segura para verificar disponibilidad de email. Verifica solo en profiles por seguridad.';



CREATE OR REPLACE FUNCTION "public"."check_medication_allergies"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  allergy_exists BOOLEAN;
BEGIN
  -- Check if patient has any relevant allergies
  SELECT EXISTS (
    SELECT 1
    FROM medical_records mr
    WHERE mr.patient_id = NEW.patient_id
    AND mr.allergies && ARRAY[NEW.medication_id::text]
  ) INTO allergy_exists;
  
  IF allergy_exists THEN
    RAISE EXCEPTION 'Patient has a recorded allergy to this medication';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_medication_allergies"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_multiple_permissions"("p_clinic_id" "uuid", "p_permissions" "public"."clinic_permission"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB := '{}';
    v_permission clinic_permission;
BEGIN
    FOREACH v_permission IN ARRAY p_permissions
    LOOP
        v_result := v_result || 
            jsonb_build_object(
                v_permission::text, 
                has_clinic_permission(auth.uid(), p_clinic_id, v_permission)
            );
    END LOOP;
    
    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."check_multiple_permissions"("p_clinic_id" "uuid", "p_permissions" "public"."clinic_permission"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_physical_exam_drafts"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM physical_exam_drafts 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_physical_exam_drafts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_appointment_notifications"("p_appointment_id" "uuid", "p_doctor_id" "uuid", "p_patient_id" "uuid", "p_clinic_id" "uuid", "p_patient_name" "text", "p_doctor_name" "text", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_action_type" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  notification_message TEXT;
  notification_title TEXT;
  admin_user RECORD;
BEGIN
  -- Preparar mensaje según el tipo de acción
  CASE p_action_type
    WHEN 'created' THEN
      notification_title := 'Nueva cita agendada';
      notification_message := 'Nueva cita con ' || p_patient_name || ' para ' || p_appointment_date || ' a las ' || p_appointment_time;
    WHEN 'updated' THEN
      notification_title := 'Cita modificada';
      notification_message := 'Cita con ' || p_patient_name || ' modificada para ' || p_appointment_date || ' a las ' || p_appointment_time;
    WHEN 'cancelled' THEN
      notification_title := 'Cita cancelada';
      notification_message := 'Cita con ' || p_patient_name || ' del ' || p_appointment_date || ' a las ' || p_appointment_time || ' ha sido cancelada';
    ELSE
      notification_title := 'Actualización de cita';
      notification_message := 'Actualización en cita con ' || p_patient_name;
  END CASE;

  -- Notificar al médico asignado
  INSERT INTO public.notifications (
    user_id, 
    title, 
    message, 
    related_entity_type, 
    related_entity_id,
    action_url,
    priority
  ) VALUES (
    p_doctor_id,
    notification_title,
    notification_message,
    'appointment',
    p_appointment_id,
    '/citas',
    CASE WHEN p_action_type = 'cancelled' THEN 'high' ELSE 'normal' END
  );

  -- Notificar a todos los administradores de la clínica
  FOR admin_user IN 
    SELECT DISTINCT cur.user_id
    FROM public.clinic_user_relationships cur
    WHERE cur.clinic_id = p_clinic_id 
      AND cur.role_in_clinic = 'admin_staff'
      AND cur.status = 'approved'
      AND cur.is_active = true
      AND cur.user_id != p_doctor_id -- No duplicar notificación al médico
  LOOP
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      related_entity_type,
      related_entity_id,
      action_url,
      priority
    ) VALUES (
      admin_user.user_id,
      notification_title,
      notification_message,
      'appointment',
      p_appointment_id,
      '/citas',
      CASE WHEN p_action_type = 'cancelled' THEN 'high' ELSE 'normal' END
    );
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."create_appointment_notifications"("p_appointment_id" "uuid", "p_doctor_id" "uuid", "p_patient_id" "uuid", "p_clinic_id" "uuid", "p_patient_name" "text", "p_doctor_name" "text", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_action_type" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."clinics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT 'clinic'::"text",
    "address" "text",
    "phone" "text",
    "email" "text",
    "website" "text",
    "license_number" "text",
    "director_name" "text",
    "director_license" "text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tax_id" "text",
    "founding_date" "date",
    "logo_url" "text",
    "theme_color" "text" DEFAULT '#3B82F6'::"text",
    "working_hours" "jsonb" DEFAULT '{"friday": {"open": "09:00", "close": "18:00", "is_open": true}, "monday": {"open": "09:00", "close": "18:00", "is_open": true}, "sunday": {"open": "09:00", "close": "13:00", "is_open": false}, "tuesday": {"open": "09:00", "close": "18:00", "is_open": true}, "saturday": {"open": "09:00", "close": "13:00", "is_open": true}, "thursday": {"open": "09:00", "close": "18:00", "is_open": true}, "wednesday": {"open": "09:00", "close": "18:00", "is_open": true}}'::"jsonb",
    "services" "jsonb" DEFAULT '[]'::"jsonb",
    "specialties" "jsonb" DEFAULT '[]'::"jsonb",
    "insurance_providers" "jsonb" DEFAULT '[]'::"jsonb",
    "social_media" "jsonb" DEFAULT '{}'::"jsonb",
    "emergency_phone" "text",
    "appointment_duration_minutes" integer DEFAULT 30,
    "billing_info" "jsonb" DEFAULT '{}'::"jsonb",
    "payment_methods" "jsonb" DEFAULT '["cash", "card", "transfer"]'::"jsonb"
);


ALTER TABLE "public"."clinics" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_clinic_with_member"("clinic_name" "text", "clinic_address" "text" DEFAULT NULL::"text", "user_role" "text" DEFAULT 'admin'::"text") RETURNS "public"."clinics"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_clinic public.clinics;
BEGIN
    -- Crear la clínica con tipo por defecto
    INSERT INTO public.clinics (name, address, type)
    VALUES (clinic_name, clinic_address, 'clinic')
    RETURNING * INTO new_clinic;
    
    -- Agregar al usuario como miembro
    INSERT INTO public.clinic_members (clinic_id, user_id, role)
    VALUES (new_clinic.id, auth.uid(), user_role);
    
    RETURN new_clinic;
END;
$$;


ALTER FUNCTION "public"."create_clinic_with_member"("clinic_name" "text", "clinic_address" "text", "user_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_clinical_rules"("p_clinic_id" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  created_count INTEGER := 0;
BEGIN
  -- Regla para diabetes sin seguimiento
  INSERT INTO public.clinical_rules (
    name,
    description,
    target_condition,
    trigger_logic,
    notification_template,
    suggested_action,
    clinic_id,
    created_by
  ) VALUES (
    'Seguimiento Diabetes - 6 meses',
    'Alerta cuando un paciente con diabetes no ha tenido consulta en 6 meses',
    'diabetes',
    'no_consultation_in_months:6',
    'El paciente {patient_name} con diabetes no ha tenido consulta de seguimiento en {months} meses. Se recomienda agendar cita para control glucémico.',
    '{"type": "schedule_appointment", "label": "Agendar Control Diabético", "priority": "high"}',
    p_clinic_id,
    auth.uid()
  ) ON CONFLICT DO NOTHING;
  
  IF FOUND THEN
    created_count := created_count + 1;
  END IF;
  
  -- Regla para hipertensión sin seguimiento
  INSERT INTO public.clinical_rules (
    name,
    description,
    target_condition,
    trigger_logic,
    notification_template,
    suggested_action,
    clinic_id,
    created_by
  ) VALUES (
    'Seguimiento Hipertensión - 4 meses',
    'Alerta cuando un paciente con hipertensión no ha tenido consulta en 4 meses',
    'hipertension',
    'no_consultation_in_months:4',
    'El paciente {patient_name} con hipertensión no ha tenido consulta de seguimiento en {months} meses. Se recomienda agendar cita para control de presión arterial.',
    '{"type": "schedule_appointment", "label": "Agendar Control de Presión", "priority": "high"}',
    p_clinic_id,
    auth.uid()
  ) ON CONFLICT DO NOTHING;
  
  IF FOUND THEN
    created_count := created_count + 1;
  END IF;
  
  -- Regla para enfermedades cardíacas
  INSERT INTO public.clinical_rules (
    name,
    description,
    target_condition,
    trigger_logic,
    notification_template,
    suggested_action,
    clinic_id,
    created_by
  ) VALUES (
    'Seguimiento Cardiopatía - 3 meses',
    'Alerta cuando un paciente con enfermedad cardíaca no ha tenido consulta en 3 meses',
    'cardio',
    'no_consultation_in_months:3',
    'El paciente {patient_name} con enfermedad cardíaca no ha tenido consulta de seguimiento en {months} meses. Se recomienda evaluación cardiológica urgente.',
    '{"type": "schedule_appointment", "label": "Agendar Evaluación Cardíaca", "priority": "urgent"}',
    p_clinic_id,
    auth.uid()
  ) ON CONFLICT DO NOTHING;
  
  IF FOUND THEN
    created_count := created_count + 1;
  END IF;
  
  RETURN created_count;
END;
$$;


ALTER FUNCTION "public"."create_default_clinical_rules"("p_clinic_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_default_clinical_rules"("p_clinic_id" "uuid") IS 'Crea reglas clínicas predefinidas para una clínica específica o globalmente';



CREATE OR REPLACE FUNCTION "public"."generate_temp_curp"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Generate a temporary CURP format: TEMP_YYYYMMDD_HHMMSS
  RETURN 'TEMP_' || to_char(now(), 'YYYYMMDD_HH24MISS');
END;
$$;


ALTER FUNCTION "public"."generate_temp_curp"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_temp_curp"() IS 'Generates a temporary CURP for testing purposes. Should be replaced with actual CURP in production.';



CREATE OR REPLACE FUNCTION "public"."get_app_user_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_role text;
BEGIN
    -- Assuming you have a 'profiles' table with a 'role' column
    SELECT role INTO user_role 
    FROM public.profiles 
    WHERE id = auth.uid();

    RETURN COALESCE(user_role, 'unauthorized');
END;
$$;


ALTER FUNCTION "public"."get_app_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_clinic"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."get_current_user_clinic"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."get_current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_default_permissions"("p_role" "text") RETURNS "public"."clinic_permission"[]
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    CASE p_role
        WHEN 'admin' THEN
            -- Admin tiene todos los permisos
            RETURN ENUM_RANGE(NULL::clinic_permission);
            
        WHEN 'doctor' THEN
            RETURN ARRAY[
                'clinic.view'::clinic_permission,
                'patients.view'::clinic_permission,
                'patients.create'::clinic_permission,
                'patients.edit'::clinic_permission,
                'appointments.view'::clinic_permission,
                'appointments.create'::clinic_permission,
                'appointments.edit'::clinic_permission,
                'staff.view'::clinic_permission,
                'reports.view'::clinic_permission,
                'reports.create'::clinic_permission
            ];
            
        WHEN 'nurse' THEN
            RETURN ARRAY[
                'clinic.view'::clinic_permission,
                'patients.view'::clinic_permission,
                'patients.create'::clinic_permission,
                'patients.edit'::clinic_permission,
                'appointments.view'::clinic_permission,
                'appointments.create'::clinic_permission,
                'appointments.edit'::clinic_permission,
                'staff.view'::clinic_permission
            ];
            
        WHEN 'staff' THEN
            RETURN ARRAY[
                'clinic.view'::clinic_permission,
                'patients.view'::clinic_permission,
                'appointments.view'::clinic_permission,
                'appointments.create'::clinic_permission,
                'billing.view'::clinic_permission,
                'billing.create'::clinic_permission
            ];
            
        ELSE
            RETURN ARRAY['clinic.view'::clinic_permission];
    END CASE;
END;
$$;


ALTER FUNCTION "public"."get_default_permissions"("p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_effective_config"("p_user_id" "uuid", "p_clinic_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_clinic_config JSONB;
  v_user_preferences JSONB;
  v_combined_config JSONB;
BEGIN
  -- Obtener configuración de clínica
  SELECT to_jsonb(cc.*) INTO v_clinic_config
  FROM clinic_configurations cc
  WHERE cc.clinic_id = p_clinic_id;
  
  -- Si no existe configuración, usar defaults
  IF v_clinic_config IS NULL THEN
    v_clinic_config := '{}'::jsonb;
  END IF;
  
  -- Obtener preferencias de usuario
  SELECT to_jsonb(ucp.*) INTO v_user_preferences
  FROM user_clinic_preferences ucp
  WHERE ucp.user_id = p_user_id
    AND ucp.clinic_id = p_clinic_id;
  
  -- Si no existen preferencias, usar defaults
  IF v_user_preferences IS NULL THEN
    v_user_preferences := '{}'::jsonb;
  END IF;
  
  -- Combinar (preferencias de usuario sobrescriben configuración de clínica)
  v_combined_config := v_clinic_config || v_user_preferences;
  
  -- Actualizar cache
  INSERT INTO active_clinic_configs_cache (user_id, clinic_id, computed_config)
  VALUES (p_user_id, p_clinic_id, v_combined_config)
  ON CONFLICT (user_id, clinic_id)
  DO UPDATE SET
    computed_config = v_combined_config,
    last_updated = NOW();
  
  RETURN v_combined_config;
END;
$$;


ALTER FUNCTION "public"."get_effective_config"("p_user_id" "uuid", "p_clinic_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_enhanced_physical_exam_template"("template_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  template_data JSONB;
BEGIN
  SELECT row_to_json(t)::JSONB INTO template_data
  FROM (
    SELECT 
      id,
      name,
      fields,
      template_type,
      is_active,
      version,
      created_at,
      (
        SELECT json_agg(
          json_build_object(
            'section_id', key,
            'section_data', value
          )
        )
        FROM jsonb_each(fields)
      ) as enhanced_sections
    FROM physical_exam_templates 
    WHERE id = template_id AND is_active = true
  ) t;
  
  RETURN template_data;
END;
$$;


ALTER FUNCTION "public"."get_enhanced_physical_exam_template"("template_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_interaction_alerts"("medication_names" "text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  interactions JSONB := '[]';
  interaction_record RECORD;
  total_severe INTEGER := 0;
  total_moderate INTEGER := 0;
  total_mild INTEGER := 0;
  unfound_medications TEXT[] := ARRAY[]::TEXT[];
  med_name TEXT;
  found_med_count INTEGER;
BEGIN
  -- 1. Validar qué medicamentos de la lista de entrada existen en el catálogo
  FOREACH med_name IN ARRAY medication_names
  LOOP
    SELECT COUNT(*) INTO found_med_count
    FROM public.medications_catalog
    WHERE LOWER(name) = LOWER(med_name)
       OR LOWER(generic_name) = LOWER(med_name)
       OR LOWER(active_ingredient) = LOWER(med_name);

    IF found_med_count = 0 THEN
      unfound_medications := array_append(unfound_medications, med_name);
    END IF;
  END LOOP;

  -- 2. Obtener todas las interacciones para los medicamentos que sí se encontraron
  FOR interaction_record IN 
    SELECT * FROM public.check_drug_interactions_detailed(medication_names)
  LOOP
    -- Contar por severidad
    CASE interaction_record.severity
      WHEN 'severe' THEN total_severe := total_severe + 1;
      WHEN 'contraindicated' THEN total_severe := total_severe + 1;
      WHEN 'moderate' THEN total_moderate := total_moderate + 1;
      WHEN 'mild' THEN total_mild := total_mild + 1;
    END CASE;
    
    -- Agregar interacción al array JSON
    interactions := interactions || jsonb_build_object(
      'medicationA', interaction_record.medication_a,
      'medicationB', interaction_record.medication_b,
      'severity', interaction_record.severity,
      'type', interaction_record.interaction_type,
      'effect', interaction_record.clinical_effect,
      'recommendation', interaction_record.recommendation,
      'evidenceLevel', interaction_record.evidence_level,
      'onset', interaction_record.onset
    );
  END LOOP;
  
  -- 3. Construir el objeto de respuesta final
  RETURN jsonb_build_object(
    'interactions', interactions,
    'summary', jsonb_build_object(
      'total', jsonb_array_length(interactions),
      'severe', total_severe,
      'moderate', total_moderate,
      'mild', total_mild
    ),
    'unfound_medications', to_jsonb(unfound_medications),
    'has_unverified_meds', array_length(unfound_medications, 1) > 0,
    'has_contraindications', total_severe > 0,
    'requires_monitoring', total_moderate > 0 OR total_severe > 0
  );
END;
$$;


ALTER FUNCTION "public"."get_interaction_alerts"("medication_names" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_interaction_alerts"("medication_names" "text"[]) IS 'Obtiene alertas de interacciones y una lista de medicamentos no encontrados. Devuelve un JSON con: interactions, summary, y unfound_medications.';



CREATE OR REPLACE FUNCTION "public"."get_patient_complete_data"() RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  current_user_id UUID;
  result JSON;
BEGIN
  current_user_id := auth.uid();
  
  -- Verificar que el usuario es un paciente
  IF NOT EXISTS (
    SELECT 1 FROM public.patients 
    WHERE patient_user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Usuario no autorizado para acceder a datos de paciente';
  END IF;
  
  -- Construir JSON con todos los datos del paciente
  SELECT json_build_object(
    'personal_info', (
      SELECT json_build_object(
        'full_name', p.full_name,
        'birth_date', p.birth_date,
        'gender', p.gender,
        'email', p.email,
        'phone', p.phone,
        'address', p.address,
        'created_at', p.created_at,
        'updated_at', p.updated_at
      )
      FROM public.patients p
      WHERE p.patient_user_id = current_user_id
    ),
    'consultations', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', c.id,
          'diagnosis', c.diagnosis,
          'treatment', c.treatment,
          'created_at', c.created_at
        )
      ), '[]'::json)
      FROM public.consultations c
      JOIN public.patients p ON p.id = c.patient_id
      WHERE p.patient_user_id = current_user_id
    ),
    'appointments', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', a.id,
          'title', a.title,
          'appointment_date', a.appointment_date,
          'status', a.status,
          'created_at', a.created_at
        )
      ), '[]'::json)
      FROM public.appointments a
      JOIN public.patients p ON p.id = a.patient_id
      WHERE p.patient_user_id = current_user_id
    )
  ) INTO result;
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_patient_complete_data"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medical_practice_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "clinic_id" "uuid",
    "weekday_start_time" time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
    "weekday_end_time" time without time zone DEFAULT '18:00:00'::time without time zone NOT NULL,
    "saturday_start_time" time without time zone DEFAULT '09:00:00'::time without time zone,
    "saturday_end_time" time without time zone DEFAULT '14:00:00'::time without time zone,
    "sunday_enabled" boolean DEFAULT false,
    "sunday_start_time" time without time zone,
    "sunday_end_time" time without time zone,
    "default_consultation_duration" integer DEFAULT 30 NOT NULL,
    "available_durations" integer[] DEFAULT ARRAY[15, 30, 45, 60],
    "enable_presential" boolean DEFAULT true,
    "enable_teleconsultation" boolean DEFAULT false,
    "enable_emergency" boolean DEFAULT false,
    "languages" "text"[] DEFAULT ARRAY['es'::"text"],
    "buffer_time_between_appointments" integer DEFAULT 0,
    "max_advance_booking_days" integer DEFAULT 30,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "medical_practice_settings_buffer_time_between_appointment_check" CHECK (("buffer_time_between_appointments" >= 0)),
    CONSTRAINT "medical_practice_settings_check" CHECK (("weekday_start_time" < "weekday_end_time")),
    CONSTRAINT "medical_practice_settings_check1" CHECK ((("saturday_start_time" IS NULL) OR ("saturday_end_time" IS NULL) OR ("saturday_start_time" < "saturday_end_time"))),
    CONSTRAINT "medical_practice_settings_check2" CHECK ((("sunday_start_time" IS NULL) OR ("sunday_end_time" IS NULL) OR ("sunday_start_time" < "sunday_end_time"))),
    CONSTRAINT "medical_practice_settings_default_consultation_duration_check" CHECK (("default_consultation_duration" > 0)),
    CONSTRAINT "medical_practice_settings_max_advance_booking_days_check" CHECK (("max_advance_booking_days" > 0))
);


ALTER TABLE "public"."medical_practice_settings" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_practice_settings_with_defaults"("p_user_id" "uuid", "p_clinic_id" "uuid" DEFAULT NULL::"uuid") RETURNS "public"."medical_practice_settings"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
        DECLARE
          settings medical_practice_settings;
        BEGIN
          SELECT * INTO settings
          FROM medical_practice_settings
          WHERE user_id = p_user_id
            AND (p_clinic_id IS NULL OR clinic_id = p_clinic_id)
          LIMIT 1;

          -- Si no existe configuración, devolver valores por defecto
          IF NOT FOUND THEN
            settings := ROW(
              gen_random_uuid(),
              p_user_id,
              p_clinic_id,
              '09:00:00'::TIME,
              '18:00:00'::TIME,
              '09:00:00'::TIME,
              '14:00:00'::TIME,
              FALSE,
              NULL,
              NULL,
              30,
              ARRAY[15, 30, 45, 60],
              TRUE,
              FALSE,
              FALSE,
              ARRAY['es'],
              0,
              30,
              NOW(),
              NOW()
            )::medical_practice_settings;
          END IF;

          RETURN settings;
        END;
        $$;


ALTER FUNCTION "public"."get_practice_settings_with_defaults"("p_user_id" "uuid", "p_clinic_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM public.profiles 
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Crear perfil automáticamente para el nuevo usuario
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'doctor',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_record_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = TG_TABLE_NAME::text
      AND column_name = 'created_by'
    ) THEN
      NEW.created_by = (select auth.uid());
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = TG_TABLE_NAME::text
      AND column_name = 'updated_by'
    ) THEN
      NEW.updated_by = (select auth.uid());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_record_metadata"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_soft_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Set the deleted_at timestamp to the current time
    NEW.deleted_at := NOW();
    -- Optionally, you can set a flag to indicate the record is deleted
    -- NEW.is_deleted := TRUE;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_soft_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_clinic_permission"("p_user_id" "uuid", "p_clinic_id" "uuid", "p_permission" "public"."clinic_permission") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_role TEXT;
    v_permissions clinic_permission[];
BEGIN
    -- Obtener rol del usuario en la clínica
    SELECT role INTO v_role
    FROM public.clinic_members
    WHERE user_id = p_user_id AND clinic_id = p_clinic_id;
    
    IF v_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Admin siempre tiene todos los permisos
    IF v_role = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Buscar permisos del rol
    SELECT permissions INTO v_permissions
    FROM public.role_permissions
    WHERE clinic_id = p_clinic_id AND role = v_role;
    
    -- Si no hay permisos definidos, usar permisos por defecto
    IF v_permissions IS NULL THEN
        v_permissions := get_default_permissions(v_role);
    END IF;
    
    RETURN p_permission = ANY(v_permissions);
END;
$$;


ALTER FUNCTION "public"."has_clinic_permission"("p_user_id" "uuid", "p_clinic_id" "uuid", "p_permission" "public"."clinic_permission") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_patient_access"("patient_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (select auth.uid())
    AND (
      role = 'administrator'
      OR (
        role = 'doctor'
        AND EXISTS (
          SELECT 1 FROM consultations
          WHERE consultations.patient_id = has_patient_access.patient_id
          AND consultations.doctor_id = (select auth.uid())
        )
      )
      OR (
        role = 'nurse'
        AND EXISTS (
          SELECT 1 FROM consultations
          WHERE consultations.patient_id = has_patient_access.patient_id
          AND consultations.nurse_id = (select auth.uid())
        )
      )
    )
  );
END;
$$;


ALTER FUNCTION "public"."has_patient_access"("patient_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_layout_usage"("layout_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE prescription_visual_layouts
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE id = layout_id;
END;
$$;


ALTER FUNCTION "public"."increment_layout_usage"("layout_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_clinic_config"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO clinic_configurations (clinic_id)
  VALUES (NEW.id)
  ON CONFLICT (clinic_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."initialize_clinic_config"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_appointment_safe"("appointment_data" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Deshabilitar temporalmente triggers de auditoría
    SET session_replication_role = replica;
    
    -- Insertar la cita
    INSERT INTO public.appointments (
        id,
        doctor_id,
        patient_id,
        clinic_id,
        title,
        description,
        appointment_date,
        appointment_time,
        duration,
        status,
        type,
        location,
        notes,
        reminder_sent,
        created_at,
        updated_at
    ) VALUES (
        (appointment_data->>'id')::UUID,
        (appointment_data->>'doctor_id')::UUID,
        (appointment_data->>'patient_id')::UUID,
        (appointment_data->>'clinic_id')::UUID,
        appointment_data->>'title',
        appointment_data->>'description',
        (appointment_data->>'appointment_date')::DATE,
        (appointment_data->>'appointment_time')::TIME,
        (appointment_data->>'duration')::INTEGER,
        appointment_data->>'status',
        appointment_data->>'type',
        appointment_data->>'location',
        appointment_data->>'notes',
        (appointment_data->>'reminder_sent')::BOOLEAN,
        (appointment_data->>'created_at')::TIMESTAMPTZ,
        (appointment_data->>'updated_at')::TIMESTAMPTZ
    );
    
    -- Rehabilitar triggers
    SET session_replication_role = DEFAULT;
EXCEPTION
    WHEN OTHERS THEN
        -- Rehabilitar triggers en caso de error
        SET session_replication_role = DEFAULT;
        RAISE;
END;
$$;


ALTER FUNCTION "public"."insert_appointment_safe"("appointment_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."invalidate_config_cache"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Eliminar cache de todos los usuarios de esta clínica
  DELETE FROM active_clinic_configs_cache
  WHERE clinic_id = COALESCE(NEW.clinic_id, OLD.clinic_id);
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."invalidate_config_cache"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'administrator'
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_clinic_admin"("check_clinic_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_role_val TEXT;
    user_clinic_id UUID;
BEGIN
    -- Get user's role and clinic
    SELECT role, clinic_id
    INTO user_role_val, user_clinic_id
    FROM public.profiles
    WHERE id = auth.uid();

    -- Super admin can administrate all clinics
    IF user_role_val = 'super_admin' THEN
        RETURN true;
    END IF;

    -- Check if user is admin_staff of the clinic
    IF user_role_val = 'admin_staff' AND user_clinic_id = check_clinic_id THEN
        RETURN true;
    END IF;

    -- Check through clinic_user_relationships
    IF EXISTS (
        SELECT 1 
        FROM public.clinic_user_relationships 
        WHERE user_id = auth.uid() 
        AND clinic_id = check_clinic_id 
        AND role_in_clinic = 'admin_staff'
        AND is_active = true
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$;


ALTER FUNCTION "public"."is_clinic_admin"("check_clinic_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_doctor"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'doctor'
  );
END;
$$;


ALTER FUNCTION "public"."is_doctor"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_nurse"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'nurse'
  );
END;
$$;


ALTER FUNCTION "public"."is_nurse"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_patient_accessible"("check_patient_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_role TEXT;
  user_id UUID;
BEGIN
  user_id := auth.uid();
  user_role := auth.jwt() ->> 'user_metadata' ->> 'role';

  -- Administrator can access all patients
  IF user_role = 'administrator' THEN
    RETURN TRUE;
  END IF;

  -- Doctor can access their own patients
  IF user_role = 'doctor' THEN
    RETURN EXISTS (
      SELECT 1 
      FROM public.patient_doctor_relationships 
      WHERE doctor_id = user_id AND patient_id = check_patient_id
    );
  END IF;

  -- Nurse can access patients in their clinic/department
  IF user_role = 'nurse' THEN
    RETURN EXISTS (
      SELECT 1 
      FROM public.patient_doctor_relationships pdr
      JOIN public.users u ON pdr.doctor_id = u.id
      WHERE 
        pdr.patient_id = check_patient_id AND 
        u.department = (SELECT department FROM public.users WHERE id = user_id)
    );
  END IF;

  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."is_patient_accessible"("check_patient_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_valid_logo_upload"("filename" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
BEGIN
  RETURN filename ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9]+\.(jpg|jpeg|png|gif|webp|svg)$';
END;
$_$;


ALTER FUNCTION "public"."is_valid_logo_upload"("filename" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_valid_logo_upload"("bucket_id" "text", "name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
BEGIN
  -- Validate file extension
  IF NOT (
    name ~* '\.jpg$' OR 
    name ~* '\.jpeg$' OR 
    name ~* '\.png$' OR 
    name ~* '\.gif$' OR 
    name ~* '\.webp$' OR 
    name ~* '\.svg$'
  ) THEN
    RETURN false;
  END IF;

  -- Ensure bucket is correct
  IF bucket_id != 'logos' THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$_$;


ALTER FUNCTION "public"."is_valid_logo_upload"("bucket_id" "text", "name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_id_value UUID;
BEGIN
  -- Obtener el user_id de la sesión actual
  user_id_value := auth.uid();
  
  -- Si no hay usuario autenticado, usar NULL
  IF user_id_value IS NULL THEN
    user_id_value := NULL;
  END IF;

  -- Insertar registro de auditoría según el tipo de operación
  CASE TG_OP
    WHEN 'INSERT' THEN
      INSERT INTO public.audit_logs (
        user_id, action, table_name, record_id, old_values, new_values
      ) VALUES (
        user_id_value,
        'INSERT',
        TG_TABLE_NAME,
        NEW.id,
        NULL,
        to_jsonb(NEW)
      );
      RETURN NEW;
      
    WHEN 'UPDATE' THEN
      INSERT INTO public.audit_logs (
        user_id, action, table_name, record_id, old_values, new_values
      ) VALUES (
        user_id_value,
        'UPDATE',
        TG_TABLE_NAME,
        NEW.id,
        to_jsonb(OLD),
        to_jsonb(NEW)
      );
      RETURN NEW;
      
    WHEN 'DELETE' THEN
      INSERT INTO public.audit_logs (
        user_id, action, table_name, record_id, old_values, new_values
      ) VALUES (
        user_id_value,
        'DELETE',
        TG_TABLE_NAME,
        OLD.id,
        to_jsonb(OLD),
        NULL
      );
      RETURN OLD;
  END CASE;
  
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."log_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manual_insert_appointment"("p_id" "uuid", "p_doctor_id" "uuid", "p_patient_id" "uuid", "p_clinic_id" "uuid", "p_title" "text", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_description" "text" DEFAULT NULL::"text", "p_duration" integer DEFAULT 30, "p_status" "text" DEFAULT 'scheduled'::"text", "p_type" "text" DEFAULT 'consultation'::"text", "p_location" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    inserted_id UUID;
BEGIN
    -- Insertar directamente con SQL para evitar triggers
    INSERT INTO public.appointments (
        id,
        doctor_id,
        patient_id,
        clinic_id,
        title,
        description,
        appointment_date,
        appointment_time,
        duration,
        status,
        type,
        location,
        notes,
        reminder_sent,
        created_at,
        updated_at
    ) VALUES (
        p_id,
        p_doctor_id,
        p_patient_id,
        p_clinic_id,
        p_title,
        p_description,
        p_appointment_date,
        p_appointment_time,
        p_duration,
        p_status,
        p_type,
        p_location,
        p_notes,
        false,
        NOW(),
        NOW()
    );
    
    RETURN p_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error insertando cita: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."manual_insert_appointment"("p_id" "uuid", "p_doctor_id" "uuid", "p_patient_id" "uuid", "p_clinic_id" "uuid", "p_title" "text", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_description" "text", "p_duration" integer, "p_status" "text", "p_type" "text", "p_location" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."medical_scales_search_vector_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', coalesce(NEW.name,'')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.description,'')), 'B') ||
    setweight(to_tsvector('spanish', array_to_string(coalesce(NEW.functions, ARRAY[]::text[]), ' ')), 'C') ||
    setweight(to_tsvector('spanish', array_to_string(coalesce(NEW.specialties, ARRAY[]::text[]), ' ')), 'C') ||
    setweight(to_tsvector('spanish', array_to_string(coalesce(NEW.anatomy_systems, ARRAY[]::text[]), ' ')), 'C') ||
    setweight(to_tsvector('spanish', array_to_string(coalesce(NEW.tags, ARRAY[]::text[]), ' ')), 'D');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."medical_scales_search_vector_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."owns_logo"("object_owner" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN auth.uid() = object_owner;
END;
$$;


ALTER FUNCTION "public"."owns_logo"("object_owner" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."patients_search_vector_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', COALESCE(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.phone, '')), 'C');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."patients_search_vector_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_clinical_rules"() RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  rule_record RECORD;
  patient_record RECORD;
  notification_count INTEGER := 0;
  processed_rules INTEGER := 0;
  rule_logic TEXT;
  trigger_months INTEGER;
  target_condition_pattern TEXT;
  notification_message TEXT;
  suggested_action_data JSONB;
  doctor_id UUID;
  result JSON;
BEGIN
  -- Log inicio del procesamiento
  RAISE NOTICE 'Iniciando procesamiento de reglas clínicas a las %', NOW();
  
  -- Iterar sobre todas las reglas activas
  FOR rule_record IN 
    SELECT * FROM public.clinical_rules 
    WHERE is_active = true
    ORDER BY created_at
  LOOP
    processed_rules := processed_rules + 1;
    RAISE NOTICE 'Procesando regla: % (ID: %)', rule_record.name, rule_record.id;
    
    -- Parsear la lógica del trigger
    rule_logic := rule_record.trigger_logic;
    
    -- Manejar diferentes tipos de lógica
    IF rule_logic LIKE 'no_consultation_in_months:%' THEN
      -- Extraer el número de meses
      trigger_months := CAST(SPLIT_PART(rule_logic, ':', 2) AS INTEGER);
      target_condition_pattern := '%' || rule_record.target_condition || '%';
      
      RAISE NOTICE 'Buscando pacientes con % sin consulta en % meses', rule_record.target_condition, trigger_months;
      
      -- Buscar pacientes que cumplan con la condición
      FOR patient_record IN
        SELECT DISTINCT 
          p.id as patient_id,
          p.full_name as patient_name,
          p.primary_doctor_id,
          p.clinic_id,
          MAX(c.created_at) as last_consultation
        FROM public.patients p
        LEFT JOIN public.consultations c ON c.patient_id = p.id
        WHERE p.is_active = true
          AND (rule_record.clinic_id IS NULL OR p.clinic_id = rule_record.clinic_id)
          AND EXISTS (
            SELECT 1 FROM public.consultations c2
            WHERE c2.patient_id = p.id
              AND (c2.diagnosis ILIKE target_condition_pattern 
                   OR c2.current_condition ILIKE target_condition_pattern)
          )
        GROUP BY p.id, p.full_name, p.primary_doctor_id, p.clinic_id
        HAVING (
          MAX(c.created_at) IS NULL 
          OR MAX(c.created_at) < NOW() - (trigger_months || ' months')::INTERVAL
        )
      LOOP
        -- Determinar el doctor a notificar
        doctor_id := patient_record.primary_doctor_id;
        
        -- Si no hay doctor primario, buscar el último doctor que atendió al paciente
        IF doctor_id IS NULL THEN
          SELECT c.doctor_id INTO doctor_id
          FROM public.consultations c
          WHERE c.patient_id = patient_record.patient_id
          ORDER BY c.created_at DESC
          LIMIT 1;
        END IF;
        
        -- Si aún no hay doctor, buscar un doctor activo de la clínica
        IF doctor_id IS NULL THEN
          SELECT cur.user_id INTO doctor_id
          FROM public.clinic_user_relationships cur
          WHERE cur.clinic_id = patient_record.clinic_id
            AND cur.role_in_clinic = 'doctor'
            AND cur.status = 'approved'
            AND cur.is_active = true
          ORDER BY cur.created_at
          LIMIT 1;
        END IF;
        
        -- Solo proceder si encontramos un doctor
        IF doctor_id IS NOT NULL THEN
          -- Construir el mensaje de notificación
          notification_message := REPLACE(rule_record.notification_template, '{patient_name}', patient_record.patient_name);
          notification_message := REPLACE(notification_message, '{condition}', rule_record.target_condition);
          notification_message := REPLACE(notification_message, '{months}', trigger_months::TEXT);
          
          -- Construir la acción sugerida
          suggested_action_data := jsonb_build_object(
            'type', 'schedule_appointment',
            'label', 'Agendar Cita de Seguimiento',
            'data', jsonb_build_object(
              'patient_id', patient_record.patient_id,
              'patient_name', patient_record.patient_name,
              'priority', 'normal',
              'notes', 'Seguimiento automático por regla clínica: ' || rule_record.name,
              'rule_id', rule_record.id
            )
          );
          
          -- Verificar si ya existe una notificación similar reciente (últimas 48 horas)
          IF NOT EXISTS (
            SELECT 1 FROM public.notifications
            WHERE user_id = doctor_id
              AND related_entity_type = 'clinical_rule'
              AND related_entity_id = rule_record.id::TEXT
              AND message LIKE '%' || patient_record.patient_name || '%'
              AND created_at > NOW() - INTERVAL '48 hours'
          ) THEN
            -- Crear la notificación
            INSERT INTO public.notifications (
              user_id,
              message,
              title,
              related_entity_type,
              related_entity_id,
              priority,
              suggested_action
            ) VALUES (
              doctor_id,
              notification_message,
              'Alerta Clínica: ' || rule_record.name,
              'clinical_rule',
              rule_record.id::TEXT,
              'normal',
              suggested_action_data
            );
            
            notification_count := notification_count + 1;
            RAISE NOTICE 'Notificación creada para paciente % (Doctor: %)', patient_record.patient_name, doctor_id;
          ELSE
            RAISE NOTICE 'Notificación duplicada evitada para paciente %', patient_record.patient_name;
          END IF;
        ELSE
          RAISE NOTICE 'No se encontró doctor para notificar sobre paciente %', patient_record.patient_name;
        END IF;
      END LOOP;
      
    ELSIF rule_logic LIKE 'medication_reminder_days:%' THEN
      -- Lógica futura para recordatorios de medicamentos
      RAISE NOTICE 'Tipo de regla no implementado aún: %', rule_logic;
      
    ELSIF rule_logic LIKE 'test_due_months:%' THEN
      -- Lógica futura para recordatorios de estudios
      RAISE NOTICE 'Tipo de regla no implementado aún: %', rule_logic;
      
    ELSE
      RAISE NOTICE 'Tipo de regla desconocido: %', rule_logic;
    END IF;
  END LOOP;
  
  -- Construir resultado
  result := json_build_object(
    'success', true,
    'processed_rules', processed_rules,
    'notifications_created', notification_count,
    'processed_at', NOW()
  );
  
  RAISE NOTICE 'Procesamiento completado. Reglas procesadas: %, Notificaciones creadas: %', 
    processed_rules, notification_count;
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."process_clinical_rules"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."process_clinical_rules"() IS 'Procesa todas las reglas clínicas activas y genera notificaciones según corresponda';



CREATE OR REPLACE FUNCTION "public"."set_app_session_info"("session_info_json" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Establecer la variable de sesión local. 'LOCAL' asegura que solo dure
  -- para la transacción actual, lo cual es más seguro.
  EXECUTE 'SET LOCAL app.session_info = ''' || session_info_json::TEXT || '''';
  
  RETURN 'Session information set for this transaction.';
END;
$$;


ALTER FUNCTION "public"."set_app_session_info"("session_info_json" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_app_session_info"("session_info_json" "jsonb") IS 'Establece de forma segura la variable de sesión app.session_info para la transacción actual, utilizada por los triggers de auditoría.';



CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.deleted_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."soft_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_clinic_settings"("p_clinic_id" "uuid", "p_settings" "jsonb") RETURNS "public"."clinics"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_clinic public.clinics;
BEGIN
    -- Verificar que el usuario es admin de la clínica
    IF NOT EXISTS (
        SELECT 1 FROM public.clinic_members
        WHERE clinic_id = p_clinic_id
        AND user_id = auth.uid()
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acceso denegado: Solo administradores pueden actualizar configuración';
    END IF;
    
    -- Actualizar settings (merge con existentes)
    UPDATE public.clinics
    SET settings = settings || p_settings
    WHERE id = p_clinic_id
    RETURNING * INTO v_clinic;
    
    RETURN v_clinic;
END;
$$;


ALTER FUNCTION "public"."update_clinic_settings"("p_clinic_id" "uuid", "p_settings" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_medical_practice_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
        BEGIN
          NEW.updated_at = TIMEZONE('utc'::text, NOW());
          RETURN NEW;
        END;
        $$;


ALTER FUNCTION "public"."update_medical_practice_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_prescription_layout_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_prescription_layout_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_role_permissions"("p_clinic_id" "uuid", "p_role" "text", "p_permissions" "public"."clinic_permission"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Verificar que el usuario es admin
    IF NOT has_clinic_permission(auth.uid(), p_clinic_id, 'clinic.edit'::clinic_permission) THEN
        RAISE EXCEPTION 'No tienes permisos para modificar roles';
    END IF;
    
    -- Insertar o actualizar permisos
    INSERT INTO public.role_permissions (clinic_id, role, permissions)
    VALUES (p_clinic_id, p_role, p_permissions)
    ON CONFLICT (clinic_id, role)
    DO UPDATE SET 
        permissions = EXCLUDED.permissions,
        updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."update_role_permissions"("p_clinic_id" "uuid", "p_role" "text", "p_permissions" "public"."clinic_permission"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_belongs_to_clinic"("check_clinic_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE id = auth.uid() 
        AND clinic_id = check_clinic_id
    )
$$;


ALTER FUNCTION "public"."user_belongs_to_clinic"("check_clinic_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_approved_access_to_clinic"("check_clinic_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE 
    has_status_column BOOLEAN;
BEGIN
    -- Verificar si la columna status existe
    SELECT COUNT(*) > 0 INTO has_status_column 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'clinic_user_relationships' 
      AND column_name = 'status';

    IF has_status_column THEN
        RETURN EXISTS (
            SELECT 1 
            FROM public.clinic_user_relationships 
            WHERE user_id = auth.uid() 
              AND clinic_id = check_clinic_id 
              AND status = 'approved'
              AND is_active = true
        );
    ELSE
        -- Si no existe el campo status, asumir que todos están aprobados
        RETURN EXISTS (
            SELECT 1 
            FROM public.clinic_user_relationships 
            WHERE user_id = auth.uid() 
              AND clinic_id = check_clinic_id 
              AND is_active = true
        );
    END IF;
END;
$$;


ALTER FUNCTION "public"."user_has_approved_access_to_clinic"("check_clinic_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_clinic_admin"("check_clinic_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM profiles p
        WHERE p.id = auth.uid() 
        AND p.clinic_id = check_clinic_id
        AND (p.role = 'admin_staff' OR p.role = 'super_admin')
    )
$$;


ALTER FUNCTION "public"."user_is_clinic_admin"("check_clinic_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_jsonb_schema"("data" "jsonb", "schema_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  is_valid BOOLEAN := TRUE;
BEGIN
  CASE schema_name
    WHEN 'vital_signs' THEN
      IF NOT (
        jsonb_typeof(data) = 'object' AND
        (data->>'systolic_pressure' IS NULL OR jsonb_typeof(data->'systolic_pressure') IN ('string', 'number')) AND
        (data->>'diastolic_pressure' IS NULL OR jsonb_typeof(data->'diastolic_pressure') IN ('string', 'number')) AND
        (data->>'heart_rate' IS NULL OR jsonb_typeof(data->'heart_rate') IN ('string', 'number')) AND
        (data->>'respiratory_rate' IS NULL OR jsonb_typeof(data->'respiratory_rate') IN ('string', 'number')) AND
        (data->>'temperature' IS NULL OR jsonb_typeof(data->'temperature') IN ('string', 'number'))
      ) THEN
        is_valid := FALSE;
      END IF;
      
    WHEN 'prescription' THEN
      IF NOT (
        jsonb_typeof(data) = 'object' AND
        data ? 'medications' AND
        jsonb_typeof(data->'medications') = 'array' AND
        jsonb_array_length(data->'medications') <= 20
      ) THEN
        is_valid := FALSE;
      END IF;
      
    WHEN 'physical_examination' THEN
      IF NOT (jsonb_typeof(data) = 'object') THEN
        is_valid := FALSE;
      END IF;
      
    WHEN 'physical_exam_template' THEN
      IF NOT (
        jsonb_typeof(data) = 'object' AND
        data ? 'sections' AND
        jsonb_typeof(data->'sections') = 'array'
      ) THEN
        is_valid := FALSE;
      END IF;
      
    ELSE
      IF NOT (jsonb_typeof(data) IN ('object', 'array')) THEN
        is_valid := FALSE;
      END IF;
  END CASE;
  
  RETURN is_valid;
END;
$$;


ALTER FUNCTION "public"."validate_jsonb_schema"("data" "jsonb", "schema_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_text_array"("input_array" "text"[], "max_items" integer DEFAULT 50, "max_length" integer DEFAULT 200) RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  sanitized_array text[] := '{}';
  item text;
  sanitized_item text;
BEGIN
  IF input_array IS NULL THEN
    RETURN NULL;
  END IF;
  
  FOR i IN 1..LEAST(array_length(input_array, 1), max_items) LOOP
    item := input_array[i];
    
    IF item IS NULL OR trim(item) = '' THEN
      CONTINUE;
    END IF;
    
    sanitized_item := substring(
      replace(replace(replace(replace(replace(
        trim(item),
        '<', '&lt;'),
        '>', '&gt;'),
        '"', '&quot;'),
        '''', '&#39;'),
        '/', '&#47;'
      ),
      1, max_length
    );
    
    IF length(sanitized_item) > 0 THEN
      sanitized_array := array_append(sanitized_array, sanitized_item);
    END IF;
  END LOOP;
  
  RETURN sanitized_array;
END;
$$;


ALTER FUNCTION "public"."validate_text_array"("input_array" "text"[], "max_items" integer, "max_length" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_url"("url" "text") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF url IS NULL OR length(trim(url)) = 0 THEN
    RETURN FALSE;
  END IF;
  
  IF NOT (url ~* '^https?://') THEN
    RETURN FALSE;
  END IF;
  
  IF url ~* '(javascript:|data:|vbscript:|file:|blob:|about:|on\w+\s*=|<script)' THEN
    RETURN FALSE;
  END IF;
  
  IF length(url) > 2000 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."validate_url"("url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_profile_exists"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id
  );
END;
$$;


ALTER FUNCTION "public"."verify_profile_exists"("user_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."active_clinic_configs_cache" (
    "user_id" "uuid" NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "computed_config" "jsonb" NOT NULL,
    "last_updated" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."active_clinic_configs_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "clinic_id" "uuid",
    "patient_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text",
    "entity_id" "uuid",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "appointment_date" "date" NOT NULL,
    "appointment_time" time without time zone NOT NULL,
    "duration" integer DEFAULT 30 NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "type" "text" DEFAULT 'consultation'::"text" NOT NULL,
    "location" "text",
    "notes" "text",
    "reminder_sent" boolean DEFAULT false,
    "external_calendar_event_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "google_event_id" "text",
    "google_calendar_id" "text" DEFAULT 'primary'::"text",
    "sync_status" "text" DEFAULT 'pending'::"text",
    "last_synced_at" timestamp with time zone,
    "last_sync_error" "text",
    CONSTRAINT "appointments_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'confirmed_by_patient'::"text", 'completed'::"text", 'cancelled_by_clinic'::"text", 'cancelled_by_patient'::"text", 'no_show'::"text"]))),
    CONSTRAINT "appointments_sync_status_check" CHECK (("sync_status" = ANY (ARRAY['pending'::"text", 'synced'::"text", 'error'::"text"]))),
    CONSTRAINT "appointments_type_check" CHECK (("type" = ANY (ARRAY['consultation'::"text", 'follow_up'::"text", 'check_up'::"text", 'procedure'::"text", 'emergency'::"text"])))
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "medical_record_id" "uuid",
    "file_name" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "action" character varying(50) NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" character varying(50),
    "user_agent" "text",
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "table_name" "text",
    "record_id" "text"
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clinic_configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "timezone" "text" DEFAULT 'America/Mexico_City'::"text",
    "language" "text" DEFAULT 'es'::"text",
    "currency" "text" DEFAULT 'MXN'::"text",
    "default_consultation_duration" integer DEFAULT 30,
    "enable_teleconsultation" boolean DEFAULT false,
    "enable_emergency_mode" boolean DEFAULT false,
    "max_patients_per_day" integer DEFAULT 20,
    "buffer_time_minutes" integer DEFAULT 5,
    "business_hours" "jsonb" DEFAULT '{"friday": {"open": "09:00", "close": "18:00", "enabled": true}, "monday": {"open": "09:00", "close": "18:00", "enabled": true}, "sunday": {"open": null, "close": null, "enabled": false}, "tuesday": {"open": "09:00", "close": "18:00", "enabled": true}, "saturday": {"open": "09:00", "close": "14:00", "enabled": false}, "thursday": {"open": "09:00", "close": "18:00", "enabled": true}, "wednesday": {"open": "09:00", "close": "18:00", "enabled": true}}'::"jsonb",
    "enable_soap_format" boolean DEFAULT true,
    "enable_cie10_integration" boolean DEFAULT true,
    "require_diagnosis" boolean DEFAULT true,
    "require_physical_exam" boolean DEFAULT false,
    "prescription_template_id" "uuid",
    "enable_electronic_prescription" boolean DEFAULT false,
    "require_prescription_approval" boolean DEFAULT false,
    "notification_settings" "jsonb" DEFAULT '{"sms_enabled": false, "email_enabled": true, "whatsapp_enabled": false, "appointment_reminders": true, "reminder_hours_before": 24}'::"jsonb",
    "data_retention_days" integer DEFAULT 3650,
    "enable_audit_log" boolean DEFAULT true,
    "require_patient_consent" boolean DEFAULT true,
    "enable_billing" boolean DEFAULT false,
    "tax_rate" numeric(5,2) DEFAULT 16.00,
    "billing_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "theme_color" "text" DEFAULT '#3B82F6'::"text",
    "logo_url" "text",
    "custom_branding" "jsonb" DEFAULT '{}'::"jsonb",
    "advanced_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "configured_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "clinic_configurations_buffer_time_minutes_check" CHECK (("buffer_time_minutes" >= 0)),
    CONSTRAINT "clinic_configurations_data_retention_days_check" CHECK (("data_retention_days" >= 365)),
    CONSTRAINT "clinic_configurations_default_consultation_duration_check" CHECK (("default_consultation_duration" > 0)),
    CONSTRAINT "clinic_configurations_max_patients_per_day_check" CHECK (("max_patients_per_day" > 0))
);


ALTER TABLE "public"."clinic_configurations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clinic_members" (
    "clinic_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "clinic_members_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'doctor'::"text", 'nurse'::"text", 'staff'::"text", 'pending_approval'::"text"])))
);


ALTER TABLE "public"."clinic_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clinic_user_relationships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id" "uuid",
    "user_id" "uuid",
    "role_in_clinic" "text" NOT NULL,
    "start_date" "date" DEFAULT CURRENT_DATE,
    "end_date" "date",
    "is_active" boolean DEFAULT true,
    "permissions_override" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "rejection_reason" "text",
    "rejected_by" "uuid",
    "rejected_at" timestamp with time zone,
    CONSTRAINT "clinic_user_relationships_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."clinic_user_relationships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clinical_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "target_condition" "text" NOT NULL,
    "trigger_logic" "text" NOT NULL,
    "notification_template" "text" NOT NULL,
    "suggested_action" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "clinic_id" "uuid"
);


ALTER TABLE "public"."clinical_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."clinical_rules" IS 'Reglas clínicas automáticas para generar notificaciones proactivas (cumplimiento NOM-024)';



COMMENT ON COLUMN "public"."clinical_rules"."target_condition" IS 'Condición médica objetivo (ej: diabetes, hipertension, cardio)';



COMMENT ON COLUMN "public"."clinical_rules"."trigger_logic" IS 'Lógica que dispara la regla (ej: no_consultation_in_months:6)';



COMMENT ON COLUMN "public"."clinical_rules"."notification_template" IS 'Plantilla del mensaje con variables {patient_name}, {condition}, {months}';



COMMENT ON COLUMN "public"."clinical_rules"."suggested_action" IS 'Acción sugerida en formato JSON con type, label y data';



CREATE OR REPLACE VIEW "public"."clinics_public" WITH ("security_invoker"='on') AS
 SELECT "clinics"."id",
    "clinics"."name",
    "clinics"."type",
    "clinics"."address",
    "clinics"."phone",
    "clinics"."email",
    "clinics"."website",
    "clinics"."logo_url",
    "clinics"."theme_color",
    "clinics"."working_hours",
    "clinics"."services",
    "clinics"."specialties",
    "clinics"."insurance_providers"
   FROM "public"."clinics"
  WHERE ("clinics"."is_active" = true);


ALTER TABLE "public"."clinics_public" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid",
    "doctor_id" "uuid",
    "current_condition" "text",
    "vital_signs" "jsonb",
    "physical_examination" "jsonb",
    "diagnosis" "text",
    "prognosis" "text",
    "treatment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."consultations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_correction_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_user_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "request_type" "text" NOT NULL,
    "field_to_correct" "text",
    "current_value" "text",
    "requested_value" "text",
    "reason" "text" NOT NULL,
    "additional_details" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reviewed_by" "uuid",
    "review_notes" "text",
    "reviewed_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "data_correction_requests_request_type_check" CHECK (("request_type" = ANY (ARRAY['access'::"text", 'rectification'::"text", 'cancellation'::"text", 'opposition'::"text"]))),
    CONSTRAINT "data_correction_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_review'::"text", 'approved'::"text", 'rejected'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."data_correction_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hereditary_backgrounds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid",
    "relationship" "text" NOT NULL,
    "condition" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."hereditary_backgrounds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lab_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "medical_test_id" "uuid" NOT NULL,
    "parameter_name" "text" NOT NULL,
    "parameter_code" "text",
    "value" numeric,
    "value_text" "text",
    "unit" "text",
    "reference_min" numeric,
    "reference_max" numeric,
    "reference_text" "text",
    "is_abnormal" boolean DEFAULT false,
    "abnormal_flag" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "lab_results_abnormal_flag_check" CHECK (("abnormal_flag" = ANY (ARRAY['high'::"text", 'low'::"text", 'critical_high'::"text", 'critical_low'::"text"])))
);


ALTER TABLE "public"."lab_results" OWNER TO "postgres";


COMMENT ON TABLE "public"."lab_results" IS 'Resultados de laboratorio estructurados';



COMMENT ON COLUMN "public"."lab_results"."parameter_code" IS 'Código estándar LOINC u otro sistema de codificación';



COMMENT ON COLUMN "public"."lab_results"."value" IS 'Valor numérico del resultado';



COMMENT ON COLUMN "public"."lab_results"."value_text" IS 'Valor textual para resultados cualitativos';



COMMENT ON COLUMN "public"."lab_results"."abnormal_flag" IS 'Tipo de anormalidad detectada';



CREATE TABLE IF NOT EXISTS "public"."medical_conversation_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultation_id" "uuid",
    "patient_id" "uuid" NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "messages" "json" DEFAULT '[]'::"json" NOT NULL,
    "is_starred" boolean DEFAULT false,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."medical_conversation_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."medical_conversation_history" IS 'Stores conversation history between doctors and the AI medical assistant';



COMMENT ON COLUMN "public"."medical_conversation_history"."title" IS 'Human-readable title for the conversation';



COMMENT ON COLUMN "public"."medical_conversation_history"."messages" IS 'JSON array of conversation messages with metadata';



COMMENT ON COLUMN "public"."medical_conversation_history"."is_starred" IS 'Whether the conversation is marked as important by the doctor';



COMMENT ON COLUMN "public"."medical_conversation_history"."tags" IS 'Array of tags for categorizing conversations';



CREATE TABLE IF NOT EXISTS "public"."medical_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "medical_history" "text" NOT NULL,
    "allergies" "text"[],
    "medications" "text"[],
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."medical_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medical_scales" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "specialty" "text",
    "category" "text",
    "description" "text",
    "definition" "jsonb" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "functions" "text"[] DEFAULT '{}'::"text"[],
    "specialties" "text"[] DEFAULT '{}'::"text"[],
    "anatomy_systems" "text"[] DEFAULT '{}'::"text"[],
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "search_vector" "tsvector"
);


ALTER TABLE "public"."medical_scales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medical_specialties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "description" "text",
    "requires_license" boolean DEFAULT true,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "medical_specialties_category_check" CHECK (("category" = ANY (ARRAY['medical'::"text", 'surgical'::"text", 'diagnostic'::"text", 'therapy'::"text", 'nursing'::"text", 'administration'::"text"])))
);


ALTER TABLE "public"."medical_specialties" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."medical_studies_complete" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"uuid" AS "patient_id",
    NULL::"uuid" AS "doctor_id",
    NULL::"text" AS "category",
    NULL::"text" AS "test_name",
    NULL::"text" AS "status",
    NULL::"date" AS "ordered_date",
    NULL::"date" AS "result_date",
    NULL::"text" AS "lab_name",
    NULL::"text" AS "notes",
    NULL::timestamp with time zone AS "created_at",
    NULL::timestamp with time zone AS "updated_at",
    NULL::"uuid" AS "consultation_id",
    NULL::"uuid" AS "reviewed_by",
    NULL::timestamp with time zone AS "reviewed_at",
    NULL::"jsonb" AS "results_data",
    NULL::"text" AS "urgency_level",
    NULL::"text" AS "interpretation",
    NULL::"text" AS "patient_name",
    NULL::"text" AS "doctor_name",
    NULL::"text" AS "reviewed_by_name",
    NULL::"text" AS "consultation_diagnosis",
    NULL::bigint AS "file_count",
    NULL::bigint AS "lab_result_count",
    NULL::boolean AS "has_abnormal_results";


ALTER TABLE "public"."medical_studies_complete" OWNER TO "postgres";


COMMENT ON VIEW "public"."medical_studies_complete" IS 'Vista completa de estudios médicos con información relacionada';



CREATE TABLE IF NOT EXISTS "public"."medical_test_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "medical_test_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" "text",
    "file_size" bigint,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "file_hash" "text",
    "thumbnail_url" "text",
    "is_reviewed" boolean DEFAULT false,
    "reviewed_at" timestamp with time zone
);


ALTER TABLE "public"."medical_test_files" OWNER TO "postgres";


COMMENT ON TABLE "public"."medical_test_files" IS 'Archivos adjuntos a estudios médicos (PDFs, imágenes, etc.)';



COMMENT ON COLUMN "public"."medical_test_files"."file_hash" IS 'Hash MD5 del archivo para detectar duplicados';



COMMENT ON COLUMN "public"."medical_test_files"."thumbnail_url" IS 'URL de miniatura (para imágenes)';



COMMENT ON COLUMN "public"."medical_test_files"."is_reviewed" IS 'Indica si el archivo ha sido revisado';



CREATE TABLE IF NOT EXISTS "public"."medical_tests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "doctor_id" "uuid",
    "category" "text" NOT NULL,
    "test_name" "text" NOT NULL,
    "status" "text" DEFAULT 'ordered'::"text" NOT NULL,
    "ordered_date" "date",
    "result_date" "date",
    "lab_name" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "consultation_id" "uuid",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "results_data" "jsonb" DEFAULT '{}'::"jsonb",
    "urgency_level" "text" DEFAULT 'routine'::"text",
    "interpretation" "text",
    CONSTRAINT "medical_tests_category_check" CHECK (("category" = ANY (ARRAY['gabinete'::"text", 'laboratorio'::"text", 'otro'::"text"]))),
    CONSTRAINT "medical_tests_status_check" CHECK (("status" = ANY (ARRAY['ordered'::"text", 'in_progress'::"text", 'completed'::"text"]))),
    CONSTRAINT "medical_tests_urgency_level_check" CHECK (("urgency_level" = ANY (ARRAY['routine'::"text", 'urgent'::"text", 'stat'::"text"])))
);


ALTER TABLE "public"."medical_tests" OWNER TO "postgres";


COMMENT ON TABLE "public"."medical_tests" IS 'Estudios médicos solicitados (laboratorios, gabinete, etc.)';



COMMENT ON COLUMN "public"."medical_tests"."consultation_id" IS 'Consulta que solicitó este estudio';



COMMENT ON COLUMN "public"."medical_tests"."reviewed_by" IS 'Médico que revisó los resultados';



COMMENT ON COLUMN "public"."medical_tests"."reviewed_at" IS 'Fecha y hora de revisión de resultados';



COMMENT ON COLUMN "public"."medical_tests"."results_data" IS 'Resultados estructurados en formato JSON';



COMMENT ON COLUMN "public"."medical_tests"."urgency_level" IS 'Nivel de urgencia: routine, urgent, stat';



COMMENT ON COLUMN "public"."medical_tests"."interpretation" IS 'Interpretación médica de los resultados';



CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id" "uuid",
    "role" "text" NOT NULL,
    "permissions" "public"."clinic_permission"[] DEFAULT '{}'::"public"."clinic_permission"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."my_clinic_permissions" AS
 SELECT "cm"."clinic_id",
    "c"."name" AS "clinic_name",
    "cm"."role",
    COALESCE("rp"."permissions", "public"."get_default_permissions"("cm"."role")) AS "permissions"
   FROM (("public"."clinic_members" "cm"
     JOIN "public"."clinics" "c" ON (("cm"."clinic_id" = "c"."id")))
     LEFT JOIN "public"."role_permissions" "rp" ON ((("rp"."clinic_id" = "cm"."clinic_id") AND ("rp"."role" = "cm"."role"))))
  WHERE ("cm"."user_id" = "auth"."uid"());


ALTER TABLE "public"."my_clinic_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."non_pathological_histories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid",
    "handedness" "text",
    "religion" "text",
    "marital_status" "text",
    "education_level" "text",
    "diet" "text",
    "personal_hygiene" "text",
    "vaccination_history" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."non_pathological_histories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "title" "text",
    "is_read" boolean DEFAULT false,
    "related_entity_type" "text",
    "related_entity_id" "uuid",
    "action_url" "text",
    "priority" "text" DEFAULT 'normal'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "read_at" timestamp with time zone,
    "suggested_action" "jsonb",
    CONSTRAINT "notifications_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pathological_histories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid",
    "chronic_diseases" "text"[],
    "current_treatments" "text"[],
    "surgeries" "text"[],
    "fractures" "text"[],
    "previous_hospitalizations" "text"[],
    "substance_use" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."pathological_histories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_access_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_user_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "resource_accessed" "text",
    "ip_address" "inet",
    "user_agent" "text",
    "success" boolean DEFAULT true NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."patient_access_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_prescription_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "prescription_id" "uuid" NOT NULL,
    "layout_id" "uuid",
    "layout_snapshot" "jsonb",
    "medications_snapshot" "jsonb" NOT NULL,
    "visual_preview_url" "text",
    "prescribed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "patient_prescription_history_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'cancelled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."patient_prescription_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_registration_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "text" NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "selected_scale_ids" "text"[],
    "allowed_sections" "text"[] DEFAULT ARRAY['personal'::"text", 'pathological'::"text", 'non_pathological'::"text", 'hereditary'::"text"] NOT NULL,
    "assigned_patient_id" "uuid",
    "expires_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."patient_registration_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "birth_date" "date" NOT NULL,
    "gender" "text",
    "email" "text",
    "phone" "text",
    "address" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "city_of_birth" "text",
    "city_of_residence" "text",
    "social_security_number" "text",
    "search_vector" "tsvector",
    "deleted_at" timestamp with time zone,
    "clinic_id" "uuid",
    "primary_doctor_id" "uuid",
    "patient_user_id" "uuid",
    "insurance_info" "jsonb" DEFAULT '{}'::"jsonb",
    "emergency_contact" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "curp" "text",
    "notes" "text",
    CONSTRAINT "patients_email_check" CHECK (("email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text")),
    CONSTRAINT "patients_gender_check" CHECK (("gender" = ANY (ARRAY['masculino'::"text", 'femenino'::"text", 'otro'::"text"]))),
    CONSTRAINT "patients_phone_check" CHECK (("phone" ~* '^\+?[0-9]{10,15}$'::"text"))
);


ALTER TABLE "public"."patients" OWNER TO "postgres";


COMMENT ON COLUMN "public"."patients"."curp" IS 'Clave Única de Registro de Población. Debe ser única por clínica.';



CREATE TABLE IF NOT EXISTS "public"."physical_exam_drafts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "template_id" "uuid",
    "draft_data" "jsonb" NOT NULL,
    "last_modified" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."physical_exam_drafts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."physical_exam_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultation_id" "uuid",
    "section_id" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size" bigint,
    "file_url" "text" NOT NULL,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."physical_exam_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."physical_exam_sections" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."physical_exam_sections" OWNER TO "postgres";


ALTER TABLE "public"."physical_exam_sections" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."physical_exam_sections_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."physical_exam_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doctor_id" "uuid",
    "name" "text" NOT NULL,
    "definition" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "template_type" "text" DEFAULT 'general'::"text",
    "is_active" boolean DEFAULT true,
    "version" integer DEFAULT 1,
    "parent_template_id" "uuid"
);


ALTER TABLE "public"."physical_exam_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."physical_exams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "consultation_id" "uuid",
    "template_id" "uuid",
    "exam_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "exam_time" time without time zone DEFAULT CURRENT_TIME,
    "vital_signs" "jsonb" DEFAULT '{}'::"jsonb",
    "examination_data" "jsonb" DEFAULT '{}'::"jsonb",
    "findings" "text",
    "conclusions" "text",
    "recommendations" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."physical_exams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prescription_layout_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "layout_id" "uuid" NOT NULL,
    "version_number" integer NOT NULL,
    "changes_summary" "text",
    "template_elements" "jsonb" NOT NULL,
    "canvas_settings" "jsonb" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."prescription_layout_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prescription_layouts_unified" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" DEFAULT 'general'::"text",
    "orientation" "text" DEFAULT 'portrait'::"text" NOT NULL,
    "page_size" "text" DEFAULT 'A4'::"text" NOT NULL,
    "template_elements" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "canvas_settings" "jsonb" DEFAULT '{"zoom": 1, "margin": "20mm", "pageSize": "A4", "showGrid": false, "canvasSize": {"width": 794, "height": 1123}, "backgroundColor": "#ffffff", "backgroundImage": null}'::"jsonb" NOT NULL,
    "print_settings" "jsonb" DEFAULT '{"colorMode": "color", "pageMargins": {"top": "20mm", "left": "15mm", "right": "15mm", "bottom": "20mm"}, "scaleFactor": 1.0, "printQuality": "high", "includeQrCode": true, "watermarkText": null, "autoFitContent": true, "includeDigitalSignature": true}'::"jsonb" NOT NULL,
    "is_horizontal" boolean GENERATED ALWAYS AS (("orientation" = 'landscape'::"text")) STORED,
    "is_default" boolean DEFAULT false,
    "is_public" boolean DEFAULT false,
    "is_predefined" boolean DEFAULT false,
    "usage_count" integer DEFAULT 0,
    "last_used_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "prescription_layouts_unified_orientation_check" CHECK (("orientation" = ANY (ARRAY['portrait'::"text", 'landscape'::"text"]))),
    CONSTRAINT "prescription_layouts_unified_page_size_check" CHECK (("page_size" = ANY (ARRAY['A4'::"text", 'Letter'::"text", 'Legal'::"text"]))),
    CONSTRAINT "valid_canvas_size" CHECK (((("canvas_settings" ->> 'canvasSize'::"text") IS NOT NULL) AND (((("canvas_settings" -> 'canvasSize'::"text") ->> 'width'::"text"))::integer > 200) AND (((("canvas_settings" -> 'canvasSize'::"text") ->> 'height'::"text"))::integer > 200)))
);


ALTER TABLE "public"."prescription_layouts_unified" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prescription_print_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "default_layout_id" "uuid",
    "page_size" "text" DEFAULT 'A4'::"text",
    "page_orientation" "text" DEFAULT 'portrait'::"text",
    "page_margins" "json" DEFAULT '{"top": "20mm", "right": "15mm", "bottom": "20mm", "left": "15mm"}'::"json",
    "print_quality" "text" DEFAULT 'high'::"text",
    "color_mode" "text" DEFAULT 'color'::"text",
    "scale_factor" double precision DEFAULT 1.0,
    "auto_fit_content" boolean DEFAULT true,
    "include_qr_code" boolean DEFAULT true,
    "include_digital_signature" boolean DEFAULT true,
    "watermark_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."prescription_print_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."prescription_print_settings" IS 'Per-doctor settings for prescription printing preferences and default layouts';



COMMENT ON COLUMN "public"."prescription_print_settings"."page_margins" IS 'JSON object with top, right, bottom, left margin specifications';



CREATE TABLE IF NOT EXISTS "public"."prescription_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "medications" "jsonb" NOT NULL,
    "diagnosis" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."prescription_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prescription_visual_layouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "template_name" "text" NOT NULL,
    "description" "text",
    "template_elements" "json" DEFAULT '[]'::"json" NOT NULL,
    "canvas_settings" "json" DEFAULT '{
        "backgroundColor": "#ffffff",
        "backgroundImage": null,
        "canvasSize": {"width": 794, "height": 1123},
        "pageSize": "A4",
        "margin": "20mm",
        "showGrid": false,
        "zoom": 1
    }'::"json" NOT NULL,
    "category" "text" DEFAULT 'general'::"text",
    "is_default" boolean DEFAULT false,
    "is_public" boolean DEFAULT false,
    "usage_count" integer DEFAULT 0,
    "last_used_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."prescription_visual_layouts" OWNER TO "postgres";


COMMENT ON TABLE "public"."prescription_visual_layouts" IS 'Stores visual layout templates for prescription printing with element positioning and styling';



COMMENT ON COLUMN "public"."prescription_visual_layouts"."template_elements" IS 'JSON array of visual elements with position, size, style, and content data';



COMMENT ON COLUMN "public"."prescription_visual_layouts"."canvas_settings" IS 'JSON object with canvas configuration including size, background, and display settings';



CREATE TABLE IF NOT EXISTS "public"."prescriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "diagnosis" "text" NOT NULL,
    "medications" "jsonb" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL,
    "status" "text" NOT NULL,
    "deleted_at" timestamp with time zone,
    "qr_code" "text",
    "signature_data" "text",
    "qr_code_url" "text",
    "validation_warnings" "jsonb",
    "visual_layout" "jsonb",
    CONSTRAINT "prescriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'expired'::"text", 'dispensed'::"text"])))
);


ALTER TABLE "public"."prescriptions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."prescriptions"."expires_at" IS 'Fecha de expiración calculada para la receta.';



COMMENT ON COLUMN "public"."prescriptions"."signature_data" IS 'Contiene la imagen de la firma del doctor en formato base64.';



COMMENT ON COLUMN "public"."prescriptions"."validation_warnings" IS 'Almacena advertencias de interacciones o alergias que fueron aceptadas por el doctor.';



COMMENT ON COLUMN "public"."prescriptions"."visual_layout" IS 'Snapshot del layout visual (elementos + configuración de canvas) usado al generar/imprimir la receta';



CREATE TABLE IF NOT EXISTS "public"."privacy_consents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_user_id" "uuid" NOT NULL,
    "consent_type" "text" NOT NULL,
    "consent_version" "text" NOT NULL,
    "granted" boolean DEFAULT false NOT NULL,
    "granted_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."privacy_consents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "specialty" "text",
    "full_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "license_number" "text",
    "phone" "text",
    "schedule" "jsonb",
    "prescription_style" "jsonb" DEFAULT '{}'::"jsonb",
    "clinic_id" "uuid",
    "user_role_id" "uuid",
    "specialty_id" "uuid",
    "employee_id" "text",
    "hire_date" "date",
    "is_active" boolean DEFAULT true,
    "profile_completed" boolean DEFAULT false,
    "additional_info" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['super_admin'::"text", 'doctor'::"text", 'patient'::"text", 'health_staff'::"text", 'admin_staff'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles_backup" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "role" "text",
    "specialty" "text",
    "full_name" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "license_number" "text",
    "phone" "text",
    "schedule" "jsonb",
    "prescription_style" "jsonb"
);


ALTER TABLE "public"."profiles_backup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(50) NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scale_assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "consultation_id" "uuid",
    "scale_id" "text" NOT NULL,
    "answers" "jsonb" NOT NULL,
    "score" numeric,
    "severity" "text",
    "interpretation" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."scale_assessments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."specialties" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."specialties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."study_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id" "uuid",
    "category" "text" NOT NULL,
    "test_name" "text" NOT NULL,
    "description" "text",
    "typical_parameters" "jsonb" DEFAULT '[]'::"jsonb",
    "preparation_instructions" "text",
    "estimated_duration" "text",
    "estimated_cost" numeric,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "study_templates_category_check" CHECK (("category" = ANY (ARRAY['gabinete'::"text", 'laboratorio'::"text", 'otro'::"text"])))
);


ALTER TABLE "public"."study_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."study_templates" IS 'Plantillas de estudios médicos comunes para agilizar órdenes';



CREATE TABLE IF NOT EXISTS "public"."user_clinic_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "preferred_consultation_duration" integer DEFAULT 30,
    "my_schedule" "jsonb" DEFAULT '{}'::"jsonb",
    "default_note_template" "text",
    "favorite_diagnoses" "text"[] DEFAULT ARRAY[]::"text"[],
    "frequent_medications" "jsonb" DEFAULT '[]'::"jsonb",
    "sidebar_collapsed" boolean DEFAULT false,
    "dashboard_widgets" "jsonb" DEFAULT '["upcoming_appointments", "recent_patients", "pending_tasks"]'::"jsonb",
    "quick_actions" "jsonb" DEFAULT '["new_consultation", "search_patient", "new_prescription"]'::"jsonb",
    "notification_preferences" "jsonb" DEFAULT '{"sound_alerts": false, "email_emergencies": true, "email_appointments": true, "desktop_notifications": true}'::"jsonb",
    "keyboard_shortcuts" "jsonb" DEFAULT '{}'::"jsonb",
    "custom_templates" "jsonb" DEFAULT '[]'::"jsonb",
    "export_preferences" "jsonb" DEFAULT '{"format": "pdf", "include_logo": true, "include_signature": true}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_clinic_preferences_preferred_consultation_duration_check" CHECK (("preferred_consultation_duration" > 0))
);


ALTER TABLE "public"."user_clinic_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_google_connections" (
    "user_id" "uuid" NOT NULL,
    "access_token" "text",
    "refresh_token" "text",
    "expires_at" timestamp with time zone,
    "calendar_id" "text" DEFAULT 'primary'::"text",
    "sync_token" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_google_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "description" "text",
    "permissions" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."active_clinic_configs_cache"
    ADD CONSTRAINT "active_clinic_configs_cache_pkey" PRIMARY KEY ("user_id", "clinic_id");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clinic_configurations"
    ADD CONSTRAINT "clinic_configurations_clinic_id_key" UNIQUE ("clinic_id");



ALTER TABLE ONLY "public"."clinic_configurations"
    ADD CONSTRAINT "clinic_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clinic_members"
    ADD CONSTRAINT "clinic_members_pkey" PRIMARY KEY ("clinic_id", "user_id");



ALTER TABLE ONLY "public"."clinic_user_relationships"
    ADD CONSTRAINT "clinic_user_relationships_clinic_id_user_id_key" UNIQUE ("clinic_id", "user_id");



ALTER TABLE ONLY "public"."clinic_user_relationships"
    ADD CONSTRAINT "clinic_user_relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clinical_rules"
    ADD CONSTRAINT "clinical_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clinics"
    ADD CONSTRAINT "clinics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultations"
    ADD CONSTRAINT "consultations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_correction_requests"
    ADD CONSTRAINT "data_correction_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hereditary_backgrounds"
    ADD CONSTRAINT "hereditary_backgrounds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lab_results"
    ADD CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medical_conversation_history"
    ADD CONSTRAINT "medical_conversation_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medical_practice_settings"
    ADD CONSTRAINT "medical_practice_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medical_practice_settings"
    ADD CONSTRAINT "medical_practice_settings_user_id_clinic_id_key" UNIQUE ("user_id", "clinic_id");



ALTER TABLE ONLY "public"."medical_records"
    ADD CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medical_scales"
    ADD CONSTRAINT "medical_scales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medical_specialties"
    ADD CONSTRAINT "medical_specialties_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."medical_specialties"
    ADD CONSTRAINT "medical_specialties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medical_test_files"
    ADD CONSTRAINT "medical_test_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medical_tests"
    ADD CONSTRAINT "medical_tests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."non_pathological_histories"
    ADD CONSTRAINT "non_pathological_histories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pathological_histories"
    ADD CONSTRAINT "pathological_histories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_access_logs"
    ADD CONSTRAINT "patient_access_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_prescription_history"
    ADD CONSTRAINT "patient_prescription_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_prescription_history"
    ADD CONSTRAINT "patient_prescription_history_prescription_id_key" UNIQUE ("prescription_id");



ALTER TABLE ONLY "public"."patient_registration_tokens"
    ADD CONSTRAINT "patient_registration_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_registration_tokens"
    ADD CONSTRAINT "patient_registration_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_clinic_curp_unique" UNIQUE ("clinic_id", "curp");



COMMENT ON CONSTRAINT "patients_clinic_curp_unique" ON "public"."patients" IS 'Ensures each CURP is unique within a clinic to prevent duplicate patient records';



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."physical_exam_drafts"
    ADD CONSTRAINT "physical_exam_drafts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."physical_exam_files"
    ADD CONSTRAINT "physical_exam_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."physical_exam_sections"
    ADD CONSTRAINT "physical_exam_sections_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."physical_exam_sections"
    ADD CONSTRAINT "physical_exam_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."physical_exam_templates"
    ADD CONSTRAINT "physical_exam_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."physical_exams"
    ADD CONSTRAINT "physical_exams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prescription_layout_versions"
    ADD CONSTRAINT "prescription_layout_versions_layout_id_version_number_key" UNIQUE ("layout_id", "version_number");



ALTER TABLE ONLY "public"."prescription_layout_versions"
    ADD CONSTRAINT "prescription_layout_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prescription_layouts_unified"
    ADD CONSTRAINT "prescription_layouts_unified_doctor_id_name_key" UNIQUE ("doctor_id", "name");



ALTER TABLE ONLY "public"."prescription_layouts_unified"
    ADD CONSTRAINT "prescription_layouts_unified_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prescription_print_settings"
    ADD CONSTRAINT "prescription_print_settings_doctor_id_key" UNIQUE ("doctor_id");



ALTER TABLE ONLY "public"."prescription_print_settings"
    ADD CONSTRAINT "prescription_print_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prescription_templates"
    ADD CONSTRAINT "prescription_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prescription_visual_layouts"
    ADD CONSTRAINT "prescription_visual_layouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."privacy_consents"
    ADD CONSTRAINT "privacy_consents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles_backup"
    ADD CONSTRAINT "profiles_backup_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_clinic_id_role_key" UNIQUE ("clinic_id", "role");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scale_assessments"
    ADD CONSTRAINT "scale_assessments_consultation_id_scale_id_key" UNIQUE ("consultation_id", "scale_id");



ALTER TABLE ONLY "public"."scale_assessments"
    ADD CONSTRAINT "scale_assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."specialties"
    ADD CONSTRAINT "specialties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."study_templates"
    ADD CONSTRAINT "study_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "unique_clinic_social_security" UNIQUE ("clinic_id", "social_security_number");



ALTER TABLE ONLY "public"."user_clinic_preferences"
    ADD CONSTRAINT "user_clinic_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_clinic_preferences"
    ADD CONSTRAINT "user_clinic_preferences_user_id_clinic_id_key" UNIQUE ("user_id", "clinic_id");



ALTER TABLE ONLY "public"."user_google_connections"
    ADD CONSTRAINT "user_google_connections_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_active_configs_cache_user_clinic" ON "public"."active_clinic_configs_cache" USING "btree" ("user_id", "clinic_id");



CREATE INDEX "idx_activity_logs_clinic_id" ON "public"."activity_logs" USING "btree" ("clinic_id");



CREATE INDEX "idx_activity_logs_created_at" ON "public"."activity_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activity_logs_user_id" ON "public"."activity_logs" USING "btree" ("user_id");



CREATE INDEX "idx_appointments_clinic_date" ON "public"."appointments" USING "btree" ("clinic_id", "appointment_date");



CREATE INDEX "idx_appointments_date_time" ON "public"."appointments" USING "btree" ("appointment_date", "appointment_time");



CREATE INDEX "idx_appointments_doctor_date" ON "public"."appointments" USING "btree" ("doctor_id", "appointment_date");



CREATE INDEX "idx_appointments_doctor_status" ON "public"."appointments" USING "btree" ("doctor_id", "status");



CREATE INDEX "idx_appointments_patient_date" ON "public"."appointments" USING "btree" ("patient_id", "appointment_date");



CREATE INDEX "idx_appointments_status" ON "public"."appointments" USING "btree" ("status");



CREATE INDEX "idx_attachments_record" ON "public"."attachments" USING "btree" ("medical_record_id");



CREATE INDEX "idx_audit_logs_entity" ON "public"."audit_logs" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_audit_logs_timestamp" ON "public"."audit_logs" USING "btree" ("timestamp");



CREATE INDEX "idx_audit_logs_user" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_clinic_configurations_clinic_id" ON "public"."clinic_configurations" USING "btree" ("clinic_id");



CREATE INDEX "idx_clinic_members_clinic_id" ON "public"."clinic_members" USING "btree" ("clinic_id");



CREATE INDEX "idx_clinic_members_user_id" ON "public"."clinic_members" USING "btree" ("user_id");



CREATE INDEX "idx_clinic_relationships_clinic" ON "public"."clinic_user_relationships" USING "btree" ("clinic_id");



CREATE INDEX "idx_clinic_relationships_user" ON "public"."clinic_user_relationships" USING "btree" ("user_id");



CREATE INDEX "idx_clinic_user_relationships_clinic_user" ON "public"."clinic_user_relationships" USING "btree" ("clinic_id", "user_id");



CREATE INDEX "idx_clinical_rules_active" ON "public"."clinical_rules" USING "btree" ("is_active");



CREATE INDEX "idx_clinical_rules_clinic" ON "public"."clinical_rules" USING "btree" ("clinic_id");



CREATE INDEX "idx_clinical_rules_condition" ON "public"."clinical_rules" USING "btree" ("target_condition");



CREATE INDEX "idx_clinics_is_active" ON "public"."clinics" USING "btree" ("is_active");



CREATE INDEX "idx_clinics_license_number" ON "public"."clinics" USING "btree" ("license_number");



CREATE INDEX "idx_clinics_type" ON "public"."clinics" USING "btree" ("type");



CREATE INDEX "idx_consultations_doctor" ON "public"."consultations" USING "btree" ("doctor_id");



CREATE INDEX "idx_consultations_patient" ON "public"."consultations" USING "btree" ("patient_id");



CREATE INDEX "idx_consultations_patient_date" ON "public"."consultations" USING "btree" ("patient_id", "created_at" DESC);



CREATE INDEX "idx_consultations_physical_exam" ON "public"."consultations" USING "gin" ("physical_examination");



CREATE INDEX "idx_cur_user_clinic_status_active" ON "public"."clinic_user_relationships" USING "btree" ("user_id", "clinic_id", "status", "is_active") WHERE (("status" = 'approved'::"text") AND ("is_active" = true));



CREATE INDEX "idx_hereditary_backgrounds_patient" ON "public"."hereditary_backgrounds" USING "btree" ("patient_id");



CREATE INDEX "idx_lab_results_abnormal" ON "public"."lab_results" USING "btree" ("is_abnormal") WHERE ("is_abnormal" = true);



CREATE INDEX "idx_lab_results_parameter" ON "public"."lab_results" USING "btree" ("parameter_name");



CREATE INDEX "idx_lab_results_test_id" ON "public"."lab_results" USING "btree" ("medical_test_id");



CREATE INDEX "idx_medical_conversation_history_consultation_id" ON "public"."medical_conversation_history" USING "btree" ("consultation_id");



CREATE INDEX "idx_medical_conversation_history_doctor_id" ON "public"."medical_conversation_history" USING "btree" ("doctor_id");



CREATE INDEX "idx_medical_conversation_history_is_starred" ON "public"."medical_conversation_history" USING "btree" ("is_starred") WHERE ("is_starred" = true);



CREATE INDEX "idx_medical_conversation_history_patient_id" ON "public"."medical_conversation_history" USING "btree" ("patient_id");



CREATE INDEX "idx_medical_conversation_history_updated_at" ON "public"."medical_conversation_history" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_medical_records_patient" ON "public"."medical_records" USING "btree" ("patient_id");



CREATE INDEX "idx_medical_scales_active" ON "public"."medical_scales" USING "btree" ("is_active");



CREATE INDEX "idx_medical_scales_anatomy" ON "public"."medical_scales" USING "gin" ("anatomy_systems");



CREATE INDEX "idx_medical_scales_functions" ON "public"."medical_scales" USING "gin" ("functions");



CREATE INDEX "idx_medical_scales_search" ON "public"."medical_scales" USING "gin" ("search_vector");



CREATE INDEX "idx_medical_scales_specialties" ON "public"."medical_scales" USING "gin" ("specialties");



CREATE INDEX "idx_medical_scales_tags" ON "public"."medical_scales" USING "gin" ("tags");



CREATE INDEX "idx_medical_specialties_active" ON "public"."medical_specialties" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_medical_specialties_category" ON "public"."medical_specialties" USING "btree" ("category");



CREATE INDEX "idx_medical_specialties_name" ON "public"."medical_specialties" USING "btree" ("name");



CREATE INDEX "idx_medical_test_files_test" ON "public"."medical_test_files" USING "btree" ("medical_test_id");



CREATE INDEX "idx_medical_test_files_uploaded_by" ON "public"."medical_test_files" USING "btree" ("uploaded_by");



CREATE INDEX "idx_medical_tests_category" ON "public"."medical_tests" USING "btree" ("category");



CREATE INDEX "idx_medical_tests_doctor" ON "public"."medical_tests" USING "btree" ("doctor_id");



CREATE INDEX "idx_medical_tests_ordered_date" ON "public"."medical_tests" USING "btree" ("ordered_date");



CREATE INDEX "idx_medical_tests_patient" ON "public"."medical_tests" USING "btree" ("patient_id");



CREATE INDEX "idx_medical_tests_status" ON "public"."medical_tests" USING "btree" ("status");



CREATE INDEX "idx_non_pathological_histories_patient" ON "public"."non_pathological_histories" USING "btree" ("patient_id");



CREATE INDEX "idx_notifications_entity" ON "public"."notifications" USING "btree" ("related_entity_type", "related_entity_id");



CREATE INDEX "idx_notifications_priority" ON "public"."notifications" USING "btree" ("priority", "created_at" DESC);



CREATE INDEX "idx_notifications_suggested_action" ON "public"."notifications" USING "gin" ("suggested_action");



CREATE INDEX "idx_notifications_user_created" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notifications_user_read" ON "public"."notifications" USING "btree" ("user_id", "is_read");



CREATE INDEX "idx_pathological_histories_patient" ON "public"."pathological_histories" USING "btree" ("patient_id");



CREATE INDEX "idx_patient_registration_tokens_assigned_patient" ON "public"."patient_registration_tokens" USING "btree" ("assigned_patient_id");



CREATE INDEX "idx_patient_registration_tokens_expires_at" ON "public"."patient_registration_tokens" USING "btree" ("expires_at");



CREATE INDEX "idx_patients_clinic_id" ON "public"."patients" USING "btree" ("clinic_id");



CREATE INDEX "idx_patients_curp_clinic" ON "public"."patients" USING "btree" ("clinic_id", "curp");



CREATE INDEX "idx_patients_email" ON "public"."patients" USING "btree" ("email");



CREATE INDEX "idx_patients_email_trgm" ON "public"."patients" USING "gin" ("email" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_patients_name_trgm" ON "public"."patients" USING "gin" ("full_name" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_patients_phone" ON "public"."patients" USING "btree" ("phone");



CREATE INDEX "idx_patients_primary_doctor_id" ON "public"."patients" USING "btree" ("primary_doctor_id");



CREATE INDEX "idx_patients_search_vector" ON "public"."patients" USING "gin" ("search_vector");



CREATE INDEX "idx_physical_exam_drafts_doctor" ON "public"."physical_exam_drafts" USING "btree" ("doctor_id");



CREATE INDEX "idx_physical_exam_drafts_patient" ON "public"."physical_exam_drafts" USING "btree" ("patient_id");



CREATE INDEX "idx_physical_exam_files_consultation" ON "public"."physical_exam_files" USING "btree" ("consultation_id");



CREATE INDEX "idx_physical_exam_files_section" ON "public"."physical_exam_files" USING "btree" ("section_id");



CREATE INDEX "idx_physical_exams_consultation_id" ON "public"."physical_exams" USING "btree" ("consultation_id");



CREATE INDEX "idx_physical_exams_doctor_id" ON "public"."physical_exams" USING "btree" ("doctor_id");



CREATE INDEX "idx_physical_exams_exam_date" ON "public"."physical_exams" USING "btree" ("exam_date");



CREATE INDEX "idx_physical_exams_patient_id" ON "public"."physical_exams" USING "btree" ("patient_id");



CREATE INDEX "idx_prescription_history_patient" ON "public"."patient_prescription_history" USING "btree" ("patient_id");



CREATE INDEX "idx_prescription_history_prescribed_at" ON "public"."patient_prescription_history" USING "btree" ("prescribed_at");



CREATE INDEX "idx_prescription_layouts_doctor" ON "public"."prescription_layouts_unified" USING "btree" ("doctor_id");



CREATE INDEX "idx_prescription_layouts_horizontal" ON "public"."prescription_layouts_unified" USING "btree" ("is_horizontal");



CREATE INDEX "idx_prescription_layouts_orientation" ON "public"."prescription_layouts_unified" USING "btree" ("orientation");



CREATE INDEX "idx_prescription_layouts_public" ON "public"."prescription_layouts_unified" USING "btree" ("is_public") WHERE ("is_public" = true);



CREATE INDEX "idx_prescription_print_settings_doctor_id" ON "public"."prescription_print_settings" USING "btree" ("doctor_id");



CREATE INDEX "idx_prescription_templates_category" ON "public"."prescription_templates" USING "btree" ("category");



CREATE INDEX "idx_prescription_templates_doctor" ON "public"."prescription_templates" USING "btree" ("doctor_id");



CREATE INDEX "idx_prescription_visual_layouts_category" ON "public"."prescription_visual_layouts" USING "btree" ("category");



CREATE INDEX "idx_prescription_visual_layouts_doctor_id" ON "public"."prescription_visual_layouts" USING "btree" ("doctor_id");



CREATE INDEX "idx_prescription_visual_layouts_is_default" ON "public"."prescription_visual_layouts" USING "btree" ("doctor_id", "is_default") WHERE ("is_default" = true);



CREATE INDEX "idx_prescription_visual_layouts_usage_count" ON "public"."prescription_visual_layouts" USING "btree" ("usage_count" DESC);



CREATE INDEX "idx_prescriptions_doctor" ON "public"."prescriptions" USING "btree" ("doctor_id");



CREATE INDEX "idx_prescriptions_expires_at" ON "public"."prescriptions" USING "btree" ("expires_at");



CREATE INDEX "idx_prescriptions_patient" ON "public"."prescriptions" USING "btree" ("patient_id");



CREATE INDEX "idx_prescriptions_status" ON "public"."prescriptions" USING "btree" ("status");



CREATE INDEX "idx_profiles_clinic_id" ON "public"."profiles" USING "btree" ("clinic_id");



CREATE INDEX "idx_profiles_email_trgm" ON "public"."profiles" USING "gin" ("email" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_profiles_full_name_trgm" ON "public"."profiles" USING "gin" ("full_name" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_profiles_specialty_id" ON "public"."profiles" USING "btree" ("specialty_id");



CREATE INDEX "idx_profiles_user_role" ON "public"."profiles" USING "btree" ("id", "role");



CREATE INDEX "idx_profiles_user_role_id" ON "public"."profiles" USING "btree" ("user_role_id");



CREATE INDEX "idx_prt_assigned_patient" ON "public"."patient_registration_tokens" USING "btree" ("assigned_patient_id");



CREATE INDEX "idx_prt_expires_at" ON "public"."patient_registration_tokens" USING "btree" ("expires_at");



CREATE INDEX "idx_scale_assessments_consultation" ON "public"."scale_assessments" USING "btree" ("consultation_id");



CREATE INDEX "idx_scale_assessments_doctor" ON "public"."scale_assessments" USING "btree" ("doctor_id");



CREATE INDEX "idx_scale_assessments_patient" ON "public"."scale_assessments" USING "btree" ("patient_id");



CREATE INDEX "idx_study_templates_category" ON "public"."study_templates" USING "btree" ("category");



CREATE INDEX "idx_study_templates_clinic" ON "public"."study_templates" USING "btree" ("clinic_id");



CREATE INDEX "idx_user_clinic_preferences_clinic_id" ON "public"."user_clinic_preferences" USING "btree" ("clinic_id");



CREATE INDEX "idx_user_clinic_preferences_user_id" ON "public"."user_clinic_preferences" USING "btree" ("user_id");



CREATE OR REPLACE VIEW "public"."medical_studies_complete" AS
 SELECT "mt"."id",
    "mt"."patient_id",
    "mt"."doctor_id",
    "mt"."category",
    "mt"."test_name",
    "mt"."status",
    "mt"."ordered_date",
    "mt"."result_date",
    "mt"."lab_name",
    "mt"."notes",
    "mt"."created_at",
    "mt"."updated_at",
    "mt"."consultation_id",
    "mt"."reviewed_by",
    "mt"."reviewed_at",
    "mt"."results_data",
    "mt"."urgency_level",
    "mt"."interpretation",
    "p"."full_name" AS "patient_name",
    "doc"."full_name" AS "doctor_name",
    "rev"."full_name" AS "reviewed_by_name",
    "c"."diagnosis" AS "consultation_diagnosis",
    "count"(DISTINCT "mtf"."id") AS "file_count",
    "count"(DISTINCT "lr"."id") AS "lab_result_count",
    "bool_or"("lr"."is_abnormal") AS "has_abnormal_results"
   FROM (((((("public"."medical_tests" "mt"
     LEFT JOIN "public"."patients" "p" ON (("p"."id" = "mt"."patient_id")))
     LEFT JOIN "public"."profiles" "doc" ON (("doc"."id" = "mt"."doctor_id")))
     LEFT JOIN "public"."profiles" "rev" ON (("rev"."id" = "mt"."reviewed_by")))
     LEFT JOIN "public"."consultations" "c" ON (("c"."id" = "mt"."consultation_id")))
     LEFT JOIN "public"."medical_test_files" "mtf" ON (("mtf"."medical_test_id" = "mt"."id")))
     LEFT JOIN "public"."lab_results" "lr" ON (("lr"."medical_test_id" = "mt"."id")))
  GROUP BY "mt"."id", "p"."full_name", "doc"."full_name", "rev"."full_name", "c"."diagnosis";



CREATE OR REPLACE TRIGGER "audit_consultations" AFTER INSERT OR DELETE OR UPDATE ON "public"."consultations" FOR EACH ROW EXECUTE FUNCTION "public"."audit_table_changes"();



CREATE OR REPLACE TRIGGER "audit_hereditary_backgrounds" AFTER INSERT OR DELETE OR UPDATE ON "public"."hereditary_backgrounds" FOR EACH ROW EXECUTE FUNCTION "public"."audit_table_changes"();



CREATE OR REPLACE TRIGGER "audit_medical_records" AFTER INSERT OR DELETE OR UPDATE ON "public"."medical_records" FOR EACH ROW EXECUTE FUNCTION "public"."audit_table_changes"();



CREATE OR REPLACE TRIGGER "audit_non_pathological_histories" AFTER INSERT OR DELETE OR UPDATE ON "public"."non_pathological_histories" FOR EACH ROW EXECUTE FUNCTION "public"."audit_table_changes"();



CREATE OR REPLACE TRIGGER "audit_pathological_histories" AFTER INSERT OR DELETE OR UPDATE ON "public"."pathological_histories" FOR EACH ROW EXECUTE FUNCTION "public"."audit_table_changes"();



CREATE OR REPLACE TRIGGER "audit_physical_exam_drafts" AFTER INSERT OR DELETE OR UPDATE ON "public"."physical_exam_drafts" FOR EACH ROW EXECUTE FUNCTION "public"."audit_table_changes"();



CREATE OR REPLACE TRIGGER "audit_physical_exam_files" AFTER INSERT OR DELETE OR UPDATE ON "public"."physical_exam_files" FOR EACH ROW EXECUTE FUNCTION "public"."audit_table_changes"();



CREATE OR REPLACE TRIGGER "audit_prescription_templates" AFTER INSERT OR DELETE OR UPDATE ON "public"."prescription_templates" FOR EACH ROW EXECUTE FUNCTION "public"."audit_table_changes"();



CREATE OR REPLACE TRIGGER "audit_prescriptions" AFTER INSERT OR DELETE OR UPDATE ON "public"."prescriptions" FOR EACH ROW EXECUTE FUNCTION "public"."audit_table_changes"();



CREATE OR REPLACE TRIGGER "audit_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."consultations" FOR EACH ROW EXECUTE FUNCTION "public"."log_changes"();



CREATE OR REPLACE TRIGGER "handle_physical_exams_updated_at" BEFORE UPDATE ON "public"."physical_exams" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_profiles" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "patients_audit_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."audit_patient_changes"();



CREATE OR REPLACE TRIGGER "prescription_layouts_updated_at" BEFORE UPDATE ON "public"."prescription_layouts_unified" FOR EACH ROW EXECUTE FUNCTION "public"."update_prescription_layout_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp_consultations" BEFORE UPDATE ON "public"."consultations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp_hereditary_backgrounds" BEFORE UPDATE ON "public"."hereditary_backgrounds" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp_medical_records" BEFORE UPDATE ON "public"."medical_records" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp_non_pathological_histories" BEFORE UPDATE ON "public"."non_pathological_histories" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp_pathological_histories" BEFORE UPDATE ON "public"."pathological_histories" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp_physical_exam_drafts" BEFORE UPDATE ON "public"."physical_exam_drafts" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp_physical_exam_files" BEFORE UPDATE ON "public"."physical_exam_files" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp_physical_exam_templates" BEFORE UPDATE ON "public"."physical_exam_templates" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp_prescription_templates" BEFORE UPDATE ON "public"."prescription_templates" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp_prescriptions" BEFORE UPDATE ON "public"."prescriptions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_clinic_relationships" BEFORE UPDATE ON "public"."clinic_user_relationships" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_clinics" BEFORE UPDATE ON "public"."clinics" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_medical_records" BEFORE UPDATE ON "public"."medical_records" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "soft_delete_consultations" BEFORE UPDATE ON "public"."consultations" FOR EACH ROW WHEN ((("new"."deleted_at" IS NOT NULL) AND ("old"."deleted_at" IS NULL))) EXECUTE FUNCTION "public"."soft_delete"();



CREATE OR REPLACE TRIGGER "soft_delete_medical_records" BEFORE UPDATE ON "public"."medical_records" FOR EACH ROW WHEN ((("new"."deleted_at" IS NOT NULL) AND ("old"."deleted_at" IS NULL))) EXECUTE FUNCTION "public"."soft_delete"();



CREATE OR REPLACE TRIGGER "soft_delete_prescription_templates" BEFORE UPDATE ON "public"."prescription_templates" FOR EACH ROW WHEN ((("new"."deleted_at" IS NOT NULL) AND ("old"."deleted_at" IS NULL))) EXECUTE FUNCTION "public"."soft_delete"();



CREATE OR REPLACE TRIGGER "soft_delete_prescriptions" BEFORE UPDATE ON "public"."prescriptions" FOR EACH ROW WHEN ((("new"."deleted_at" IS NOT NULL) AND ("old"."deleted_at" IS NULL))) EXECUTE FUNCTION "public"."soft_delete"();



CREATE OR REPLACE TRIGGER "trg_medical_scales_search_vector" BEFORE INSERT OR UPDATE ON "public"."medical_scales" FOR EACH ROW EXECUTE FUNCTION "public"."medical_scales_search_vector_update"();



CREATE OR REPLACE TRIGGER "trg_medical_scales_updated_at" BEFORE UPDATE ON "public"."medical_scales" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_scale_assessments_updated_at" BEFORE UPDATE ON "public"."scale_assessments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_user_google_connections_updated_at" BEFORE UPDATE ON "public"."user_google_connections" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_initialize_clinic_config" AFTER INSERT ON "public"."clinics" FOR EACH ROW EXECUTE FUNCTION "public"."initialize_clinic_config"();



CREATE OR REPLACE TRIGGER "trigger_invalidate_clinic_config_cache" AFTER INSERT OR DELETE OR UPDATE ON "public"."clinic_configurations" FOR EACH ROW EXECUTE FUNCTION "public"."invalidate_config_cache"();



CREATE OR REPLACE TRIGGER "trigger_invalidate_user_preferences_cache" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_clinic_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."invalidate_config_cache"();



CREATE OR REPLACE TRIGGER "update_appointments_modtime" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_clinical_rules_modtime" BEFORE UPDATE ON "public"."clinical_rules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_clinics_updated_at" BEFORE UPDATE ON "public"."clinics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_lab_results_updated_at" BEFORE UPDATE ON "public"."lab_results" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_medical_conversation_history_updated_at" BEFORE UPDATE ON "public"."medical_conversation_history" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_medical_practice_settings_updated_at" BEFORE UPDATE ON "public"."medical_practice_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_medical_practice_settings_updated_at"();



CREATE OR REPLACE TRIGGER "update_medical_tests_updated_at" BEFORE UPDATE ON "public"."medical_tests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_prescription_print_settings_updated_at" BEFORE UPDATE ON "public"."prescription_print_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_prescription_visual_layouts_updated_at" BEFORE UPDATE ON "public"."prescription_visual_layouts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_study_templates_updated_at" BEFORE UPDATE ON "public"."study_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."active_clinic_configs_cache"
    ADD CONSTRAINT "active_clinic_configs_cache_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."active_clinic_configs_cache"
    ADD CONSTRAINT "active_clinic_configs_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "public"."medical_records"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clinic_configurations"
    ADD CONSTRAINT "clinic_configurations_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clinic_configurations"
    ADD CONSTRAINT "clinic_configurations_configured_by_fkey" FOREIGN KEY ("configured_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."clinic_members"
    ADD CONSTRAINT "clinic_members_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clinic_members"
    ADD CONSTRAINT "clinic_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clinic_user_relationships"
    ADD CONSTRAINT "clinic_user_relationships_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."clinic_user_relationships"
    ADD CONSTRAINT "clinic_user_relationships_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clinic_user_relationships"
    ADD CONSTRAINT "clinic_user_relationships_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."clinic_user_relationships"
    ADD CONSTRAINT "clinic_user_relationships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clinical_rules"
    ADD CONSTRAINT "clinical_rules_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");



ALTER TABLE ONLY "public"."clinical_rules"
    ADD CONSTRAINT "clinical_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."consultations"
    ADD CONSTRAINT "consultations_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."consultations"
    ADD CONSTRAINT "consultations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."data_correction_requests"
    ADD CONSTRAINT "data_correction_requests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."data_correction_requests"
    ADD CONSTRAINT "data_correction_requests_patient_user_id_fkey" FOREIGN KEY ("patient_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."data_correction_requests"
    ADD CONSTRAINT "data_correction_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."hereditary_backgrounds"
    ADD CONSTRAINT "hereditary_backgrounds_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lab_results"
    ADD CONSTRAINT "lab_results_medical_test_id_fkey" FOREIGN KEY ("medical_test_id") REFERENCES "public"."medical_tests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medical_conversation_history"
    ADD CONSTRAINT "medical_conversation_history_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."medical_conversation_history"
    ADD CONSTRAINT "medical_conversation_history_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medical_conversation_history"
    ADD CONSTRAINT "medical_conversation_history_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medical_practice_settings"
    ADD CONSTRAINT "medical_practice_settings_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medical_practice_settings"
    ADD CONSTRAINT "medical_practice_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medical_records"
    ADD CONSTRAINT "medical_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medical_test_files"
    ADD CONSTRAINT "medical_test_files_medical_test_id_fkey" FOREIGN KEY ("medical_test_id") REFERENCES "public"."medical_tests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medical_test_files"
    ADD CONSTRAINT "medical_test_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."medical_tests"
    ADD CONSTRAINT "medical_tests_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."medical_tests"
    ADD CONSTRAINT "medical_tests_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."medical_tests"
    ADD CONSTRAINT "medical_tests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medical_tests"
    ADD CONSTRAINT "medical_tests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."non_pathological_histories"
    ADD CONSTRAINT "non_pathological_histories_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pathological_histories"
    ADD CONSTRAINT "pathological_histories_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_access_logs"
    ADD CONSTRAINT "patient_access_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_access_logs"
    ADD CONSTRAINT "patient_access_logs_patient_user_id_fkey" FOREIGN KEY ("patient_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_prescription_history"
    ADD CONSTRAINT "patient_prescription_history_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "public"."prescription_layouts_unified"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."patient_prescription_history"
    ADD CONSTRAINT "patient_prescription_history_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_prescription_history"
    ADD CONSTRAINT "patient_prescription_history_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_registration_tokens"
    ADD CONSTRAINT "patient_registration_tokens_assigned_patient_id_fkey" FOREIGN KEY ("assigned_patient_id") REFERENCES "public"."patients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."patient_registration_tokens"
    ADD CONSTRAINT "patient_registration_tokens_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_registration_tokens"
    ADD CONSTRAINT "patient_registration_tokens_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_patient_user_id_fkey" FOREIGN KEY ("patient_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_primary_doctor_id_fkey" FOREIGN KEY ("primary_doctor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."physical_exam_drafts"
    ADD CONSTRAINT "physical_exam_drafts_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."physical_exam_drafts"
    ADD CONSTRAINT "physical_exam_drafts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."physical_exam_drafts"
    ADD CONSTRAINT "physical_exam_drafts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."physical_exam_templates"("id");



ALTER TABLE ONLY "public"."physical_exam_files"
    ADD CONSTRAINT "physical_exam_files_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."physical_exam_files"
    ADD CONSTRAINT "physical_exam_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."physical_exam_templates"
    ADD CONSTRAINT "physical_exam_templates_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."physical_exam_templates"
    ADD CONSTRAINT "physical_exam_templates_parent_template_id_fkey" FOREIGN KEY ("parent_template_id") REFERENCES "public"."physical_exam_templates"("id");



ALTER TABLE ONLY "public"."physical_exams"
    ADD CONSTRAINT "physical_exams_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physical_exams"
    ADD CONSTRAINT "physical_exams_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."physical_exams"
    ADD CONSTRAINT "physical_exams_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."physical_exams"
    ADD CONSTRAINT "physical_exams_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."physical_exam_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."prescription_layout_versions"
    ADD CONSTRAINT "prescription_layout_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."prescription_layout_versions"
    ADD CONSTRAINT "prescription_layout_versions_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "public"."prescription_layouts_unified"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prescription_layouts_unified"
    ADD CONSTRAINT "prescription_layouts_unified_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prescription_print_settings"
    ADD CONSTRAINT "prescription_print_settings_default_layout_id_fkey" FOREIGN KEY ("default_layout_id") REFERENCES "public"."prescription_visual_layouts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."prescription_print_settings"
    ADD CONSTRAINT "prescription_print_settings_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prescription_templates"
    ADD CONSTRAINT "prescription_templates_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."prescription_visual_layouts"
    ADD CONSTRAINT "prescription_visual_layouts_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "prescriptions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."privacy_consents"
    ADD CONSTRAINT "privacy_consents_patient_user_id_fkey" FOREIGN KEY ("patient_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "public"."medical_specialties"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_role_id_fkey" FOREIGN KEY ("user_role_id") REFERENCES "public"."user_roles"("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scale_assessments"
    ADD CONSTRAINT "scale_assessments_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scale_assessments"
    ADD CONSTRAINT "scale_assessments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scale_assessments"
    ADD CONSTRAINT "scale_assessments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scale_assessments"
    ADD CONSTRAINT "scale_assessments_scale_id_fkey" FOREIGN KEY ("scale_id") REFERENCES "public"."medical_scales"("id");



ALTER TABLE ONLY "public"."study_templates"
    ADD CONSTRAINT "study_templates_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_clinic_preferences"
    ADD CONSTRAINT "user_clinic_preferences_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_clinic_preferences"
    ADD CONSTRAINT "user_clinic_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_google_connections"
    ADD CONSTRAINT "user_google_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Administrators can manage all prescriptions" ON "public"."prescriptions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'administrator'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'administrator'::"text")))));



CREATE POLICY "Administrators can manage roles" ON "public"."roles" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'administrator'::"text")))));



CREATE POLICY "Administrators can manage specialties" ON "public"."specialties" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'administrator'::"text")))));



CREATE POLICY "Administrators can view all audit logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'administrator'::"text")))));



CREATE POLICY "Administrators can view all prescriptions" ON "public"."prescriptions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'administrator'::"text")))));



CREATE POLICY "Admins can delete medical tests from their clinic patients" ON "public"."medical_tests" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."patients" "p"
     JOIN "public"."profiles" "pr" ON (("pr"."clinic_id" = "p"."clinic_id")))
  WHERE (("p"."id" = "medical_tests"."patient_id") AND ("pr"."id" = "auth"."uid"()) AND ("pr"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage all exam files" ON "public"."physical_exam_files" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage their clinic templates" ON "public"."study_templates" USING (("clinic_id" IN ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all drafts" ON "public"."physical_exam_drafts" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Allow authenticated read access" ON "public"."physical_exam_sections" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to insert audit logs" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow full access for admin" ON "public"."physical_exam_sections" TO "service_role" USING (true);



CREATE POLICY "Doctors can create medical tests for their clinic patients" ON "public"."medical_tests" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."patients" "p"
     JOIN "public"."profiles" "pr" ON (("pr"."clinic_id" = "p"."clinic_id")))
  WHERE (("p"."id" = "medical_tests"."patient_id") AND ("pr"."id" = "auth"."uid"()) AND ("pr"."role" = ANY (ARRAY['doctor'::"text", 'admin'::"text"]))))));



CREATE POLICY "Doctors can delete their own conversation history" ON "public"."medical_conversation_history" FOR DELETE USING (("doctor_id" = "auth"."uid"()));



CREATE POLICY "Doctors can insert lab results for their clinic patients" ON "public"."lab_results" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."medical_tests" "mt"
     JOIN "public"."patients" "p" ON (("p"."id" = "mt"."patient_id")))
     JOIN "public"."profiles" "pr" ON (("pr"."clinic_id" = "p"."clinic_id")))
  WHERE (("mt"."id" = "lab_results"."medical_test_id") AND ("pr"."id" = "auth"."uid"()) AND ("pr"."role" = ANY (ARRAY['doctor'::"text", 'admin'::"text"]))))));



CREATE POLICY "Doctors can insert their own conversation history" ON "public"."medical_conversation_history" FOR INSERT WITH CHECK (("doctor_id" = "auth"."uid"()));



CREATE POLICY "Doctors can manage exam files" ON "public"."physical_exam_files" TO "authenticated" USING (("public"."is_doctor"() AND (EXISTS ( SELECT 1
   FROM "public"."consultations" "c"
  WHERE (("c"."id" = "physical_exam_files"."consultation_id") AND ("c"."doctor_id" = "auth"."uid"())))))) WITH CHECK (("public"."is_doctor"() AND (EXISTS ( SELECT 1
   FROM "public"."consultations" "c"
  WHERE (("c"."id" = "physical_exam_files"."consultation_id") AND ("c"."doctor_id" = "auth"."uid"()))))));



CREATE POLICY "Doctors can manage their drafts" ON "public"."physical_exam_drafts" TO "authenticated" USING (("public"."is_doctor"() AND ("doctor_id" = "auth"."uid"()))) WITH CHECK (("public"."is_doctor"() AND ("doctor_id" = "auth"."uid"())));



CREATE POLICY "Doctors can manage their exam templates" ON "public"."physical_exam_templates" TO "authenticated" USING (("auth"."uid"() = "doctor_id"));



CREATE POLICY "Doctors can manage their prescriptions" ON "public"."prescriptions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'doctor'::"text") AND ("prescriptions"."doctor_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'doctor'::"text") AND ("prescriptions"."doctor_id" = "auth"."uid"())))));



CREATE POLICY "Doctors can manage their templates" ON "public"."prescription_templates" TO "authenticated" USING ((("public"."is_doctor"() AND ("doctor_id" = "auth"."uid"())) OR "public"."is_admin"())) WITH CHECK ((("public"."is_doctor"() AND ("doctor_id" = "auth"."uid"())) OR "public"."is_admin"()));



CREATE POLICY "Doctors can update lab results for their clinic patients" ON "public"."lab_results" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (("public"."medical_tests" "mt"
     JOIN "public"."patients" "p" ON (("p"."id" = "mt"."patient_id")))
     JOIN "public"."profiles" "pr" ON (("pr"."clinic_id" = "p"."clinic_id")))
  WHERE (("mt"."id" = "lab_results"."medical_test_id") AND ("pr"."id" = "auth"."uid"()) AND ("pr"."role" = ANY (ARRAY['doctor'::"text", 'admin'::"text"]))))));



CREATE POLICY "Doctors can update medical tests from their clinic patients" ON "public"."medical_tests" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."patients" "p"
     JOIN "public"."profiles" "pr" ON (("pr"."clinic_id" = "p"."clinic_id")))
  WHERE (("p"."id" = "medical_tests"."patient_id") AND ("pr"."id" = "auth"."uid"()) AND ("pr"."role" = ANY (ARRAY['doctor'::"text", 'admin'::"text"]))))));



CREATE POLICY "Doctors can update their own conversation history" ON "public"."medical_conversation_history" FOR UPDATE USING (("doctor_id" = "auth"."uid"()));



CREATE POLICY "Doctors can view all prescriptions" ON "public"."prescriptions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'doctor'::"text")))));



CREATE POLICY "Doctors can view prescriptions for their patients" ON "public"."patient_prescription_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."prescriptions" "p"
  WHERE (("p"."id" = "patient_prescription_history"."prescription_id") AND ("p"."doctor_id" = "auth"."uid"())))));



CREATE POLICY "Doctors can view their own conversation history" ON "public"."medical_conversation_history" FOR SELECT USING (("doctor_id" = "auth"."uid"()));



CREATE POLICY "El personal médico puede gestionar los archivos del examen" ON "public"."physical_exam_files" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['doctor'::"text", 'administrator'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['doctor'::"text", 'administrator'::"text"]))))));



CREATE POLICY "El personal médico puede ver los archivos del examen" ON "public"."physical_exam_files" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['doctor'::"text", 'nurse'::"text", 'administrator'::"text"]))))));



CREATE POLICY "Hide deleted prescriptions" ON "public"."prescriptions" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "Medical staff can manage clinic rules" ON "public"."clinical_rules" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'super_admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."clinic_user_relationships" "cur"
  WHERE (("cur"."user_id" = "auth"."uid"()) AND ("cur"."clinic_id" = "clinical_rules"."clinic_id") AND ("cur"."status" = 'approved'::"text") AND ("cur"."is_active" = true) AND ("cur"."role_in_clinic" = ANY (ARRAY['doctor'::"text", 'admin_staff'::"text"]))))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'super_admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."clinic_user_relationships" "cur"
  WHERE (("cur"."user_id" = "auth"."uid"()) AND ("cur"."clinic_id" = "clinical_rules"."clinic_id") AND ("cur"."status" = 'approved'::"text") AND ("cur"."is_active" = true) AND ("cur"."role_in_clinic" = ANY (ARRAY['doctor'::"text", 'admin_staff'::"text"])))))));



CREATE POLICY "Medical staff can manage consultations" ON "public"."consultations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'doctor'::"text") OR ("profiles"."role" = 'administrator'::"text"))))));



CREATE POLICY "Medical staff can manage hereditary backgrounds" ON "public"."hereditary_backgrounds" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'doctor'::"text") OR ("profiles"."role" = 'administrator'::"text"))))));



CREATE POLICY "Medical staff can manage non-pathological histories" ON "public"."non_pathological_histories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'doctor'::"text") OR ("profiles"."role" = 'administrator'::"text"))))));



CREATE POLICY "Medical staff can manage pathological histories" ON "public"."pathological_histories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'doctor'::"text") OR ("profiles"."role" = 'administrator'::"text"))))));



CREATE POLICY "Medical staff can read consultations" ON "public"."consultations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'doctor'::"text") OR ("profiles"."role" = 'nurse'::"text") OR ("profiles"."role" = 'administrator'::"text"))))));



CREATE POLICY "Medical staff can read hereditary backgrounds" ON "public"."hereditary_backgrounds" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'doctor'::"text") OR ("profiles"."role" = 'nurse'::"text") OR ("profiles"."role" = 'administrator'::"text"))))));



CREATE POLICY "Medical staff can read non-pathological histories" ON "public"."non_pathological_histories" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'doctor'::"text") OR ("profiles"."role" = 'nurse'::"text") OR ("profiles"."role" = 'administrator'::"text"))))));



CREATE POLICY "Medical staff can read pathological histories" ON "public"."pathological_histories" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'doctor'::"text") OR ("profiles"."role" = 'nurse'::"text") OR ("profiles"."role" = 'administrator'::"text"))))));



CREATE POLICY "Medical staff can view clinic rules" ON "public"."clinical_rules" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'super_admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."clinic_user_relationships" "cur"
  WHERE (("cur"."user_id" = "auth"."uid"()) AND ("cur"."clinic_id" = "clinical_rules"."clinic_id") AND ("cur"."status" = 'approved'::"text") AND ("cur"."is_active" = true) AND ("cur"."role_in_clinic" = ANY (ARRAY['doctor'::"text", 'admin_staff'::"text"])))))));



CREATE POLICY "Medical staff can view exam files" ON "public"."physical_exam_files" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."consultations" "c"
     JOIN "public"."patients" "p" ON (("c"."patient_id" = "p"."id")))
  WHERE (("c"."id" = "physical_exam_files"."consultation_id") AND ("public"."is_admin"() OR ("public"."is_doctor"() AND ("c"."doctor_id" = "auth"."uid"())) OR ("public"."is_nurse"() AND "public"."has_patient_access"("p"."id")))))));



CREATE POLICY "Medical staff can view roles" ON "public"."roles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'doctor'::"text") OR ("profiles"."role" = 'nurse'::"text"))))));



CREATE POLICY "Medical staff can view specialties" ON "public"."specialties" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'doctor'::"text") OR ("profiles"."role" = 'nurse'::"text"))))));



CREATE POLICY "Medical staff can view templates" ON "public"."prescription_templates" FOR SELECT TO "authenticated" USING (("public"."is_doctor"() OR "public"."is_admin"()));



CREATE POLICY "No mostrar archivos eliminados" ON "public"."physical_exam_files" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "No mostrar plantillas eliminadas" ON "public"."prescription_templates" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "No mostrar registros eliminados de consultas" ON "public"."consultations" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "No mostrar registros eliminados de expedientes" ON "public"."medical_records" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "Nurses can create basic consultation notes" ON "public"."consultations" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'nurse'::"text")))) AND ("current_condition" IS NOT NULL) AND ("vital_signs" IS NOT NULL)));



CREATE POLICY "Nurses can view patient prescriptions" ON "public"."prescriptions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'nurse'::"text") AND (EXISTS ( SELECT 1
           FROM "public"."consultations"
          WHERE ("consultations"."patient_id" = "prescriptions"."patient_id")))))));



CREATE POLICY "Personal médico puede ver expedientes de sus pacientes" ON "public"."medical_records" FOR SELECT TO "authenticated" USING ("public"."has_patient_access"("patient_id"));



CREATE POLICY "Soft delete for medical records" ON "public"."medical_records" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'doctor'::"text") OR ("profiles"."role" = 'administrator'::"text")))))) WITH CHECK ((("deleted_at" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'doctor'::"text") OR ("profiles"."role" = 'administrator'::"text")))))));



CREATE POLICY "Solo administradores pueden eliminar expedientes" ON "public"."medical_records" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Solo médicos pueden actualizar expedientes" ON "public"."medical_records" FOR UPDATE TO "authenticated" USING (("public"."is_doctor"() AND "public"."has_patient_access"("patient_id"))) WITH CHECK (("public"."is_doctor"() AND "public"."has_patient_access"("patient_id")));



CREATE POLICY "Solo médicos pueden crear expedientes" ON "public"."medical_records" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_doctor"() AND "public"."has_patient_access"("patient_id")));



CREATE POLICY "Time-restricted updates for medical records" ON "public"."medical_records" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'doctor'::"text") OR ("profiles"."role" = 'administrator'::"text"))))) AND ((EXTRACT(epoch FROM ("now"() - "created_at")) <= (86400)::numeric) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'administrator'::"text")))))));



CREATE POLICY "Users can create their own layouts" ON "public"."prescription_layouts_unified" FOR INSERT WITH CHECK (("doctor_id" = "auth"."uid"()));



CREATE POLICY "Users can delete files from their clinic medical tests" ON "public"."medical_test_files" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (("public"."medical_tests" "mt"
     JOIN "public"."patients" "p" ON (("p"."id" = "mt"."patient_id")))
     JOIN "public"."profiles" "pr" ON (("pr"."clinic_id" = "p"."clinic_id")))
  WHERE (("mt"."id" = "medical_test_files"."medical_test_id") AND ("pr"."id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own practice settings" ON "public"."medical_practice_settings" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own layouts" ON "public"."prescription_layouts_unified" FOR DELETE USING (("doctor_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own layouts" ON "public"."prescription_visual_layouts" FOR DELETE USING (("doctor_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own print settings" ON "public"."prescription_print_settings" FOR DELETE USING (("doctor_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own practice settings" ON "public"."medical_practice_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own layouts" ON "public"."prescription_visual_layouts" FOR INSERT WITH CHECK (("doctor_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own print settings" ON "public"."prescription_print_settings" FOR INSERT WITH CHECK (("doctor_id" = "auth"."uid"()));



CREATE POLICY "Users can update own practice settings" ON "public"."medical_practice_settings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own layouts" ON "public"."prescription_layouts_unified" FOR UPDATE USING (("doctor_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own layouts" ON "public"."prescription_visual_layouts" FOR UPDATE USING (("doctor_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own print settings" ON "public"."prescription_print_settings" FOR UPDATE USING (("doctor_id" = "auth"."uid"()));



CREATE POLICY "Users can upload files to their clinic medical tests" ON "public"."medical_test_files" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."medical_tests" "mt"
     JOIN "public"."patients" "p" ON (("p"."id" = "mt"."patient_id")))
     JOIN "public"."profiles" "pr" ON (("pr"."clinic_id" = "p"."clinic_id")))
  WHERE (("mt"."id" = "medical_test_files"."medical_test_id") AND ("pr"."id" = "auth"."uid"())))));



CREATE POLICY "Users can view files from their clinic medical tests" ON "public"."medical_test_files" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."medical_tests" "mt"
     JOIN "public"."patients" "p" ON (("p"."id" = "mt"."patient_id")))
     JOIN "public"."profiles" "pr" ON (("pr"."clinic_id" = "p"."clinic_id")))
  WHERE (("mt"."id" = "medical_test_files"."medical_test_id") AND ("pr"."id" = "auth"."uid"())))));



CREATE POLICY "Users can view lab results from their clinic patients" ON "public"."lab_results" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."medical_tests" "mt"
     JOIN "public"."patients" "p" ON (("p"."id" = "mt"."patient_id")))
     JOIN "public"."profiles" "pr" ON (("pr"."clinic_id" = "p"."clinic_id")))
  WHERE (("mt"."id" = "lab_results"."medical_test_id") AND ("pr"."id" = "auth"."uid"())))));



CREATE POLICY "Users can view medical tests from their clinic patients" ON "public"."medical_tests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."patients" "p"
     JOIN "public"."profiles" "pr" ON (("pr"."clinic_id" = "p"."clinic_id")))
  WHERE (("p"."id" = "medical_tests"."patient_id") AND ("pr"."id" = "auth"."uid"())))));



CREATE POLICY "Users can view own practice settings" ON "public"."medical_practice_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their clinic templates" ON "public"."study_templates" FOR SELECT USING (("clinic_id" IN ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own and public layouts" ON "public"."prescription_visual_layouts" FOR SELECT USING ((("doctor_id" = "auth"."uid"()) OR ("is_public" = true)));



CREATE POLICY "Users can view their own google connection" ON "public"."user_google_connections" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own layouts and public ones" ON "public"."prescription_layouts_unified" FOR SELECT USING ((("doctor_id" = "auth"."uid"()) OR ("is_public" = true)));



CREATE POLICY "Users can view their own print settings" ON "public"."prescription_print_settings" FOR SELECT USING (("doctor_id" = "auth"."uid"()));



CREATE POLICY "Users can view versions of their layouts" ON "public"."prescription_layout_versions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."prescription_layouts_unified" "l"
  WHERE (("l"."id" = "prescription_layout_versions"."layout_id") AND ("l"."doctor_id" = "auth"."uid"())))));



CREATE POLICY "View non-deleted medical records" ON "public"."medical_records" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'doctor'::"text") OR ("profiles"."role" = 'nurse'::"text") OR ("profiles"."role" = 'administrator'::"text")))))));



ALTER TABLE "public"."active_clinic_configs_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "activity_logs_insert_policy" ON "public"."activity_logs" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "appointments_delete_policy" ON "public"."appointments" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'super_admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."clinic_user_relationships" "cur"
  WHERE (("cur"."user_id" = "auth"."uid"()) AND ("cur"."clinic_id" = "appointments"."clinic_id") AND ("cur"."role_in_clinic" = 'admin_staff'::"text") AND ("cur"."status" = 'approved'::"text") AND ("cur"."is_active" = true))))));



CREATE POLICY "appointments_insert_policy" ON "public"."appointments" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'super_admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."clinic_user_relationships" "cur"
  WHERE (("cur"."user_id" = "auth"."uid"()) AND ("cur"."clinic_id" = "cur"."clinic_id") AND ("cur"."role_in_clinic" = ANY (ARRAY['doctor'::"text", 'admin_staff'::"text"])) AND ("cur"."status" = 'approved'::"text") AND ("cur"."is_active" = true))))));



CREATE POLICY "appointments_select_policy" ON "public"."appointments" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'super_admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."clinic_user_relationships" "cur"
  WHERE (("cur"."user_id" = "auth"."uid"()) AND ("cur"."clinic_id" = "appointments"."clinic_id") AND ("cur"."status" = 'approved'::"text") AND ("cur"."is_active" = true))))));



CREATE POLICY "appointments_simple_access" ON "public"."appointments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."clinic_user_relationships"
  WHERE (("clinic_user_relationships"."clinic_id" = "appointments"."clinic_id") AND ("clinic_user_relationships"."user_id" = "auth"."uid"()) AND ("clinic_user_relationships"."status" = 'approved'::"text") AND ("clinic_user_relationships"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."clinic_user_relationships"
  WHERE (("clinic_user_relationships"."clinic_id" = "appointments"."clinic_id") AND ("clinic_user_relationships"."user_id" = "auth"."uid"()) AND ("clinic_user_relationships"."status" = 'approved'::"text") AND ("clinic_user_relationships"."is_active" = true)))));



CREATE POLICY "appointments_update_policy" ON "public"."appointments" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'super_admin'::"text")))) OR ("doctor_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."clinic_user_relationships" "cur"
  WHERE (("cur"."user_id" = "auth"."uid"()) AND ("cur"."clinic_id" = "appointments"."clinic_id") AND ("cur"."role_in_clinic" = 'admin_staff'::"text") AND ("cur"."status" = 'approved'::"text") AND ("cur"."is_active" = true))))));



ALTER TABLE "public"."attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clinic_admins_can_manage_config" ON "public"."clinic_configurations" USING ((EXISTS ( SELECT 1
   FROM "public"."clinic_user_relationships" "cur"
  WHERE (("cur"."clinic_id" = "clinic_configurations"."clinic_id") AND ("cur"."user_id" = "auth"."uid"()) AND ("cur"."role_in_clinic" = 'admin_staff'::"text") AND ("cur"."status" = 'approved'::"text") AND ("cur"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."clinic_user_relationships" "cur"
  WHERE (("cur"."clinic_id" = "clinic_configurations"."clinic_id") AND ("cur"."user_id" = "auth"."uid"()) AND ("cur"."role_in_clinic" = 'admin_staff'::"text") AND ("cur"."status" = 'approved'::"text") AND ("cur"."is_active" = true)))));



ALTER TABLE "public"."clinic_configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clinic_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clinic_user_relationships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clinical_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clinics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clinics_full_access" ON "public"."clinics" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."consultations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "consultations_delete_policy" ON "public"."consultations" FOR DELETE TO "authenticated" USING ((("doctor_id" = "auth"."uid"()) OR ("public"."get_app_user_role"() = 'administrator'::"text")));



CREATE POLICY "consultations_insert_policy" ON "public"."consultations" FOR INSERT TO "authenticated" WITH CHECK ((("doctor_id" = "auth"."uid"()) OR ("public"."get_app_user_role"() = 'administrator'::"text")));



CREATE POLICY "consultations_select_policy" ON "public"."consultations" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND (("doctor_id" = "auth"."uid"()) OR ("public"."get_app_user_role"() = ANY (ARRAY['administrator'::"text", 'nurse'::"text"])))));



CREATE POLICY "consultations_update_policy" ON "public"."consultations" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND (("doctor_id" = "auth"."uid"()) OR ("public"."get_app_user_role"() = 'administrator'::"text")))) WITH CHECK ((("doctor_id" = "auth"."uid"()) OR ("public"."get_app_user_role"() = 'administrator'::"text")));



ALTER TABLE "public"."data_correction_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hereditary_backgrounds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lab_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."medical_conversation_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."medical_practice_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."medical_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."medical_scales" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "medical_scales_modify_policy" ON "public"."medical_scales" TO "authenticated" USING (("public"."get_app_user_role"() = 'administrator'::"text")) WITH CHECK (("public"."get_app_user_role"() = 'administrator'::"text"));



CREATE POLICY "medical_scales_select_policy" ON "public"."medical_scales" FOR SELECT TO "authenticated" USING (("is_active" = true));



ALTER TABLE "public"."medical_specialties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."medical_test_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."medical_tests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."non_pathological_histories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_delete_policy" ON "public"."notifications" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_insert_policy" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "notifications_select_policy" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_update_policy" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."pathological_histories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient_access_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient_prescription_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient_registration_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "patients_simple_access" ON "public"."patients" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."clinic_user_relationships"
  WHERE (("clinic_user_relationships"."clinic_id" = "patients"."clinic_id") AND ("clinic_user_relationships"."user_id" = "auth"."uid"()) AND ("clinic_user_relationships"."status" = 'approved'::"text") AND ("clinic_user_relationships"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."clinic_user_relationships"
  WHERE (("clinic_user_relationships"."clinic_id" = "patients"."clinic_id") AND ("clinic_user_relationships"."user_id" = "auth"."uid"()) AND ("clinic_user_relationships"."status" = 'approved'::"text") AND ("clinic_user_relationships"."is_active" = true)))));



ALTER TABLE "public"."physical_exam_drafts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."physical_exam_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."physical_exam_sections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."physical_exam_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."physical_exams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "physical_exams_delete_policy" ON "public"."physical_exams" FOR DELETE TO "authenticated" USING ((("public"."get_app_user_role"() = 'administrator'::"text") OR ("doctor_id" = "auth"."uid"())));



CREATE POLICY "physical_exams_insert_policy" ON "public"."physical_exams" FOR INSERT TO "authenticated" WITH CHECK ((("public"."get_app_user_role"() = ANY (ARRAY['administrator'::"text", 'doctor'::"text"])) AND ("doctor_id" = "auth"."uid"())));



CREATE POLICY "physical_exams_select_policy" ON "public"."physical_exams" FOR SELECT TO "authenticated" USING (("public"."get_app_user_role"() = ANY (ARRAY['administrator'::"text", 'doctor'::"text", 'nurse'::"text"])));



CREATE POLICY "physical_exams_update_policy" ON "public"."physical_exams" FOR UPDATE TO "authenticated" USING ((("public"."get_app_user_role"() = ANY (ARRAY['administrator'::"text", 'doctor'::"text"])) AND ("doctor_id" = "auth"."uid"()))) WITH CHECK ((("public"."get_app_user_role"() = ANY (ARRAY['administrator'::"text", 'doctor'::"text"])) AND ("doctor_id" = "auth"."uid"())));



ALTER TABLE "public"."prescription_layout_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prescription_layouts_unified" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prescription_print_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prescription_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prescription_visual_layouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prescriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "prescriptions_delete_policy" ON "public"."prescriptions" FOR DELETE TO "authenticated" USING ((("doctor_id" = "auth"."uid"()) OR ("public"."get_app_user_role"() = 'administrator'::"text")));



CREATE POLICY "prescriptions_insert_policy" ON "public"."prescriptions" FOR INSERT TO "authenticated" WITH CHECK ((("doctor_id" = "auth"."uid"()) OR ("public"."get_app_user_role"() = 'administrator'::"text")));



CREATE POLICY "prescriptions_patient_access" ON "public"."prescriptions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."patients" "p"
     JOIN "public"."clinic_user_relationships" "cur" ON (("p"."clinic_id" = "cur"."clinic_id")))
  WHERE (("p"."id" = "prescriptions"."patient_id") AND ("cur"."user_id" = "auth"."uid"()) AND ("cur"."status" = 'approved'::"text") AND ("cur"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."patients" "p"
     JOIN "public"."clinic_user_relationships" "cur" ON (("p"."clinic_id" = "cur"."clinic_id")))
  WHERE (("p"."id" = "prescriptions"."patient_id") AND ("cur"."user_id" = "auth"."uid"()) AND ("cur"."status" = 'approved'::"text") AND ("cur"."is_active" = true)))));



CREATE POLICY "prescriptions_select_policy" ON "public"."prescriptions" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND (("doctor_id" = "auth"."uid"()) OR ("public"."get_app_user_role"() = ANY (ARRAY['administrator'::"text", 'nurse'::"text"])))));



CREATE POLICY "prescriptions_update_policy" ON "public"."prescriptions" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND (("doctor_id" = "auth"."uid"()) OR ("public"."get_app_user_role"() = 'administrator'::"text")))) WITH CHECK ((("doctor_id" = "auth"."uid"()) OR ("public"."get_app_user_role"() = 'administrator'::"text")));



ALTER TABLE "public"."privacy_consents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles_backup" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "relationships_own_access" ON "public"."clinic_user_relationships" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "relationships_read_access" ON "public"."clinic_user_relationships" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scale_assessments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scale_assessments_delete_policy" ON "public"."scale_assessments" FOR DELETE TO "authenticated" USING ((("doctor_id" = "auth"."uid"()) OR ("public"."get_app_user_role"() = 'administrator'::"text")));



CREATE POLICY "scale_assessments_insert_policy" ON "public"."scale_assessments" FOR INSERT TO "authenticated" WITH CHECK ((("doctor_id" = "auth"."uid"()) OR ("public"."get_app_user_role"() = 'administrator'::"text")));



CREATE POLICY "scale_assessments_select_policy" ON "public"."scale_assessments" FOR SELECT TO "authenticated" USING ((("doctor_id" = "auth"."uid"()) OR ("public"."get_app_user_role"() = ANY (ARRAY['administrator'::"text", 'nurse'::"text"]))));



CREATE POLICY "scale_assessments_update_policy" ON "public"."scale_assessments" FOR UPDATE TO "authenticated" USING ((("doctor_id" = "auth"."uid"()) OR ("public"."get_app_user_role"() = 'administrator'::"text"))) WITH CHECK ((("doctor_id" = "auth"."uid"()) OR ("public"."get_app_user_role"() = 'administrator'::"text")));



ALTER TABLE "public"."specialties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."study_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_clinic_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_google_connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_access_own_cache" ON "public"."active_clinic_configs_cache" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users_can_read_their_clinic_config" ON "public"."clinic_configurations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."clinic_user_relationships" "cur"
  WHERE (("cur"."clinic_id" = "clinic_configurations"."clinic_id") AND ("cur"."user_id" = "auth"."uid"()) AND ("cur"."status" = 'approved'::"text") AND ("cur"."is_active" = true)))));



CREATE POLICY "users_manage_own_preferences" ON "public"."user_clinic_preferences" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




























































































































































































































































































































































































































































































































































































































































































































































































































































GRANT ALL ON FUNCTION "public"."audit_patient_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_patient_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_patient_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_patient_creation"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_patient_creation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_patient_creation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_table_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_table_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_table_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_save_physical_exam_draft"("p_patient_id" "uuid", "p_doctor_id" "uuid", "p_template_id" "uuid", "p_draft_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."auto_save_physical_exam_draft"("p_patient_id" "uuid", "p_doctor_id" "uuid", "p_template_id" "uuid", "p_draft_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_save_physical_exam_draft"("p_patient_id" "uuid", "p_doctor_id" "uuid", "p_template_id" "uuid", "p_draft_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_bmi"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_bmi"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_bmi"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_bmi"("weight" numeric, "height" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_bmi"("weight" numeric, "height" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_bmi"("weight" numeric, "height" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_template_checksum"("definition_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_template_checksum"("definition_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_template_checksum"("definition_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_clinic_data"("target_clinic_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_clinic_data"("target_clinic_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_clinic_data"("target_clinic_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_appointment_conflict"("p_doctor_id" "uuid", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_duration" integer, "p_exclude_appointment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_appointment_conflict"("p_doctor_id" "uuid", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_duration" integer, "p_exclude_appointment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_appointment_conflict"("p_doctor_id" "uuid", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_duration" integer, "p_exclude_appointment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_email_availability"("check_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_email_availability"("check_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_email_availability"("check_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_medication_allergies"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_medication_allergies"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_medication_allergies"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_multiple_permissions"("p_clinic_id" "uuid", "p_permissions" "public"."clinic_permission"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."check_multiple_permissions"("p_clinic_id" "uuid", "p_permissions" "public"."clinic_permission"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_multiple_permissions"("p_clinic_id" "uuid", "p_permissions" "public"."clinic_permission"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_physical_exam_drafts"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_physical_exam_drafts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_physical_exam_drafts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_appointment_notifications"("p_appointment_id" "uuid", "p_doctor_id" "uuid", "p_patient_id" "uuid", "p_clinic_id" "uuid", "p_patient_name" "text", "p_doctor_name" "text", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_action_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_appointment_notifications"("p_appointment_id" "uuid", "p_doctor_id" "uuid", "p_patient_id" "uuid", "p_clinic_id" "uuid", "p_patient_name" "text", "p_doctor_name" "text", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_action_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_appointment_notifications"("p_appointment_id" "uuid", "p_doctor_id" "uuid", "p_patient_id" "uuid", "p_clinic_id" "uuid", "p_patient_name" "text", "p_doctor_name" "text", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_action_type" "text") TO "service_role";



GRANT ALL ON TABLE "public"."clinics" TO "anon";
GRANT ALL ON TABLE "public"."clinics" TO "authenticated";
GRANT ALL ON TABLE "public"."clinics" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_clinic_with_member"("clinic_name" "text", "clinic_address" "text", "user_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_clinic_with_member"("clinic_name" "text", "clinic_address" "text", "user_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_clinic_with_member"("clinic_name" "text", "clinic_address" "text", "user_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_clinical_rules"("p_clinic_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_clinical_rules"("p_clinic_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_clinical_rules"("p_clinic_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_temp_curp"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_temp_curp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_temp_curp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_app_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_app_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_app_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_clinic"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_clinic"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_clinic"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_default_permissions"("p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_default_permissions"("p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_default_permissions"("p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_effective_config"("p_user_id" "uuid", "p_clinic_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_effective_config"("p_user_id" "uuid", "p_clinic_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_effective_config"("p_user_id" "uuid", "p_clinic_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_enhanced_physical_exam_template"("template_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_enhanced_physical_exam_template"("template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_enhanced_physical_exam_template"("template_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_interaction_alerts"("medication_names" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_interaction_alerts"("medication_names" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_interaction_alerts"("medication_names" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_patient_complete_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_patient_complete_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_patient_complete_data"() TO "service_role";



GRANT ALL ON TABLE "public"."medical_practice_settings" TO "anon";
GRANT ALL ON TABLE "public"."medical_practice_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."medical_practice_settings" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_practice_settings_with_defaults"("p_user_id" "uuid", "p_clinic_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_practice_settings_with_defaults"("p_user_id" "uuid", "p_clinic_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_practice_settings_with_defaults"("p_user_id" "uuid", "p_clinic_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_record_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_record_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_record_metadata"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_soft_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_soft_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_soft_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_clinic_permission"("p_user_id" "uuid", "p_clinic_id" "uuid", "p_permission" "public"."clinic_permission") TO "anon";
GRANT ALL ON FUNCTION "public"."has_clinic_permission"("p_user_id" "uuid", "p_clinic_id" "uuid", "p_permission" "public"."clinic_permission") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_clinic_permission"("p_user_id" "uuid", "p_clinic_id" "uuid", "p_permission" "public"."clinic_permission") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_patient_access"("patient_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_patient_access"("patient_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_patient_access"("patient_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_layout_usage"("layout_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_layout_usage"("layout_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_layout_usage"("layout_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."initialize_clinic_config"() TO "anon";
GRANT ALL ON FUNCTION "public"."initialize_clinic_config"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_clinic_config"() TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_appointment_safe"("appointment_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_appointment_safe"("appointment_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_appointment_safe"("appointment_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."invalidate_config_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."invalidate_config_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."invalidate_config_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_clinic_admin"("check_clinic_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_clinic_admin"("check_clinic_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_clinic_admin"("check_clinic_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_doctor"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_doctor"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_doctor"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_nurse"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_nurse"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_nurse"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_patient_accessible"("check_patient_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_patient_accessible"("check_patient_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_patient_accessible"("check_patient_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_valid_logo_upload"("filename" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_valid_logo_upload"("filename" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_valid_logo_upload"("filename" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_valid_logo_upload"("bucket_id" "text", "name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_valid_logo_upload"("bucket_id" "text", "name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_valid_logo_upload"("bucket_id" "text", "name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."manual_insert_appointment"("p_id" "uuid", "p_doctor_id" "uuid", "p_patient_id" "uuid", "p_clinic_id" "uuid", "p_title" "text", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_description" "text", "p_duration" integer, "p_status" "text", "p_type" "text", "p_location" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."manual_insert_appointment"("p_id" "uuid", "p_doctor_id" "uuid", "p_patient_id" "uuid", "p_clinic_id" "uuid", "p_title" "text", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_description" "text", "p_duration" integer, "p_status" "text", "p_type" "text", "p_location" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."manual_insert_appointment"("p_id" "uuid", "p_doctor_id" "uuid", "p_patient_id" "uuid", "p_clinic_id" "uuid", "p_title" "text", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_description" "text", "p_duration" integer, "p_status" "text", "p_type" "text", "p_location" "text", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."medical_scales_search_vector_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."medical_scales_search_vector_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."medical_scales_search_vector_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."owns_logo"("object_owner" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."owns_logo"("object_owner" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."owns_logo"("object_owner" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."patients_search_vector_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."patients_search_vector_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."patients_search_vector_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_clinical_rules"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_clinical_rules"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_clinical_rules"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_app_session_info"("session_info_json" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."set_app_session_info"("session_info_json" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_app_session_info"("session_info_json" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_clinic_settings"("p_clinic_id" "uuid", "p_settings" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_clinic_settings"("p_clinic_id" "uuid", "p_settings" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_clinic_settings"("p_clinic_id" "uuid", "p_settings" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_medical_practice_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_medical_practice_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_medical_practice_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_prescription_layout_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_prescription_layout_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_prescription_layout_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_role_permissions"("p_clinic_id" "uuid", "p_role" "text", "p_permissions" "public"."clinic_permission"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."update_role_permissions"("p_clinic_id" "uuid", "p_role" "text", "p_permissions" "public"."clinic_permission"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_role_permissions"("p_clinic_id" "uuid", "p_role" "text", "p_permissions" "public"."clinic_permission"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_belongs_to_clinic"("check_clinic_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_belongs_to_clinic"("check_clinic_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_belongs_to_clinic"("check_clinic_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_approved_access_to_clinic"("check_clinic_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_approved_access_to_clinic"("check_clinic_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_approved_access_to_clinic"("check_clinic_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_clinic_admin"("check_clinic_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_clinic_admin"("check_clinic_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_clinic_admin"("check_clinic_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_jsonb_schema"("data" "jsonb", "schema_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_jsonb_schema"("data" "jsonb", "schema_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_jsonb_schema"("data" "jsonb", "schema_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_text_array"("input_array" "text"[], "max_items" integer, "max_length" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_text_array"("input_array" "text"[], "max_items" integer, "max_length" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_text_array"("input_array" "text"[], "max_items" integer, "max_length" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_url"("url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_url"("url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_url"("url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_profile_exists"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_profile_exists"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_profile_exists"("user_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."active_clinic_configs_cache" TO "anon";
GRANT ALL ON TABLE "public"."active_clinic_configs_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."active_clinic_configs_cache" TO "service_role";



GRANT ALL ON TABLE "public"."activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON TABLE "public"."attachments" TO "anon";
GRANT ALL ON TABLE "public"."attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."attachments" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."clinic_configurations" TO "anon";
GRANT ALL ON TABLE "public"."clinic_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."clinic_configurations" TO "service_role";



GRANT ALL ON TABLE "public"."clinic_members" TO "anon";
GRANT ALL ON TABLE "public"."clinic_members" TO "authenticated";
GRANT ALL ON TABLE "public"."clinic_members" TO "service_role";



GRANT ALL ON TABLE "public"."clinic_user_relationships" TO "anon";
GRANT ALL ON TABLE "public"."clinic_user_relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."clinic_user_relationships" TO "service_role";



GRANT ALL ON TABLE "public"."clinical_rules" TO "anon";
GRANT ALL ON TABLE "public"."clinical_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."clinical_rules" TO "service_role";



GRANT ALL ON TABLE "public"."clinics_public" TO "anon";
GRANT ALL ON TABLE "public"."clinics_public" TO "authenticated";
GRANT ALL ON TABLE "public"."clinics_public" TO "service_role";



GRANT ALL ON TABLE "public"."consultations" TO "anon";
GRANT ALL ON TABLE "public"."consultations" TO "authenticated";
GRANT ALL ON TABLE "public"."consultations" TO "service_role";



GRANT ALL ON TABLE "public"."data_correction_requests" TO "anon";
GRANT ALL ON TABLE "public"."data_correction_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."data_correction_requests" TO "service_role";



GRANT ALL ON TABLE "public"."hereditary_backgrounds" TO "anon";
GRANT ALL ON TABLE "public"."hereditary_backgrounds" TO "authenticated";
GRANT ALL ON TABLE "public"."hereditary_backgrounds" TO "service_role";



GRANT ALL ON TABLE "public"."lab_results" TO "anon";
GRANT ALL ON TABLE "public"."lab_results" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_results" TO "service_role";



GRANT ALL ON TABLE "public"."medical_conversation_history" TO "anon";
GRANT ALL ON TABLE "public"."medical_conversation_history" TO "authenticated";
GRANT ALL ON TABLE "public"."medical_conversation_history" TO "service_role";



GRANT ALL ON TABLE "public"."medical_records" TO "anon";
GRANT ALL ON TABLE "public"."medical_records" TO "authenticated";
GRANT ALL ON TABLE "public"."medical_records" TO "service_role";



GRANT ALL ON TABLE "public"."medical_scales" TO "anon";
GRANT ALL ON TABLE "public"."medical_scales" TO "authenticated";
GRANT ALL ON TABLE "public"."medical_scales" TO "service_role";



GRANT ALL ON TABLE "public"."medical_specialties" TO "anon";
GRANT ALL ON TABLE "public"."medical_specialties" TO "authenticated";
GRANT ALL ON TABLE "public"."medical_specialties" TO "service_role";



GRANT ALL ON TABLE "public"."medical_studies_complete" TO "anon";
GRANT ALL ON TABLE "public"."medical_studies_complete" TO "authenticated";
GRANT ALL ON TABLE "public"."medical_studies_complete" TO "service_role";



GRANT ALL ON TABLE "public"."medical_test_files" TO "anon";
GRANT ALL ON TABLE "public"."medical_test_files" TO "authenticated";
GRANT ALL ON TABLE "public"."medical_test_files" TO "service_role";



GRANT ALL ON TABLE "public"."medical_tests" TO "anon";
GRANT ALL ON TABLE "public"."medical_tests" TO "authenticated";
GRANT ALL ON TABLE "public"."medical_tests" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."my_clinic_permissions" TO "anon";
GRANT ALL ON TABLE "public"."my_clinic_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."my_clinic_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."non_pathological_histories" TO "anon";
GRANT ALL ON TABLE "public"."non_pathological_histories" TO "authenticated";
GRANT ALL ON TABLE "public"."non_pathological_histories" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."pathological_histories" TO "anon";
GRANT ALL ON TABLE "public"."pathological_histories" TO "authenticated";
GRANT ALL ON TABLE "public"."pathological_histories" TO "service_role";



GRANT ALL ON TABLE "public"."patient_access_logs" TO "anon";
GRANT ALL ON TABLE "public"."patient_access_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_access_logs" TO "service_role";



GRANT ALL ON TABLE "public"."patient_prescription_history" TO "anon";
GRANT ALL ON TABLE "public"."patient_prescription_history" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_prescription_history" TO "service_role";



GRANT ALL ON TABLE "public"."patient_registration_tokens" TO "anon";
GRANT ALL ON TABLE "public"."patient_registration_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_registration_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."patients" TO "anon";
GRANT ALL ON TABLE "public"."patients" TO "authenticated";
GRANT ALL ON TABLE "public"."patients" TO "service_role";



GRANT ALL ON TABLE "public"."physical_exam_drafts" TO "anon";
GRANT ALL ON TABLE "public"."physical_exam_drafts" TO "authenticated";
GRANT ALL ON TABLE "public"."physical_exam_drafts" TO "service_role";



GRANT ALL ON TABLE "public"."physical_exam_files" TO "anon";
GRANT ALL ON TABLE "public"."physical_exam_files" TO "authenticated";
GRANT ALL ON TABLE "public"."physical_exam_files" TO "service_role";



GRANT ALL ON TABLE "public"."physical_exam_sections" TO "anon";
GRANT ALL ON TABLE "public"."physical_exam_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."physical_exam_sections" TO "service_role";



GRANT ALL ON SEQUENCE "public"."physical_exam_sections_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."physical_exam_sections_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."physical_exam_sections_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."physical_exam_templates" TO "anon";
GRANT ALL ON TABLE "public"."physical_exam_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."physical_exam_templates" TO "service_role";



GRANT ALL ON TABLE "public"."physical_exams" TO "anon";
GRANT ALL ON TABLE "public"."physical_exams" TO "authenticated";
GRANT ALL ON TABLE "public"."physical_exams" TO "service_role";



GRANT ALL ON TABLE "public"."prescription_layout_versions" TO "anon";
GRANT ALL ON TABLE "public"."prescription_layout_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."prescription_layout_versions" TO "service_role";



GRANT ALL ON TABLE "public"."prescription_layouts_unified" TO "anon";
GRANT ALL ON TABLE "public"."prescription_layouts_unified" TO "authenticated";
GRANT ALL ON TABLE "public"."prescription_layouts_unified" TO "service_role";



GRANT ALL ON TABLE "public"."prescription_print_settings" TO "anon";
GRANT ALL ON TABLE "public"."prescription_print_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."prescription_print_settings" TO "service_role";



GRANT ALL ON TABLE "public"."prescription_templates" TO "anon";
GRANT ALL ON TABLE "public"."prescription_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."prescription_templates" TO "service_role";



GRANT ALL ON TABLE "public"."prescription_visual_layouts" TO "anon";
GRANT ALL ON TABLE "public"."prescription_visual_layouts" TO "authenticated";
GRANT ALL ON TABLE "public"."prescription_visual_layouts" TO "service_role";



GRANT ALL ON TABLE "public"."prescriptions" TO "anon";
GRANT ALL ON TABLE "public"."prescriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."prescriptions" TO "service_role";



GRANT ALL ON TABLE "public"."privacy_consents" TO "anon";
GRANT ALL ON TABLE "public"."privacy_consents" TO "authenticated";
GRANT ALL ON TABLE "public"."privacy_consents" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."profiles_backup" TO "anon";
GRANT ALL ON TABLE "public"."profiles_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles_backup" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."scale_assessments" TO "anon";
GRANT ALL ON TABLE "public"."scale_assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."scale_assessments" TO "service_role";



GRANT ALL ON TABLE "public"."specialties" TO "anon";
GRANT ALL ON TABLE "public"."specialties" TO "authenticated";
GRANT ALL ON TABLE "public"."specialties" TO "service_role";



GRANT ALL ON TABLE "public"."study_templates" TO "anon";
GRANT ALL ON TABLE "public"."study_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."study_templates" TO "service_role";



GRANT ALL ON TABLE "public"."user_clinic_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_clinic_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_clinic_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_google_connections" TO "anon";
GRANT ALL ON TABLE "public"."user_google_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."user_google_connections" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
