-- Script para aplicar configuración médica directamente en producción
-- Solo ejecutar si la tabla no existe

DO $$
BEGIN
    -- Verificar si la tabla ya existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'medical_practice_settings') THEN
        -- Crear tabla de configuración de práctica médica
        CREATE TABLE medical_practice_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,

          -- Horarios de consulta
          weekday_start_time TIME NOT NULL DEFAULT '09:00:00',
          weekday_end_time TIME NOT NULL DEFAULT '18:00:00',
          saturday_start_time TIME DEFAULT '09:00:00',
          saturday_end_time TIME DEFAULT '14:00:00',
          sunday_enabled BOOLEAN DEFAULT FALSE,
          sunday_start_time TIME DEFAULT NULL,
          sunday_end_time TIME DEFAULT NULL,

          -- Configuración de consultas
          default_consultation_duration INTEGER NOT NULL DEFAULT 30, -- en minutos
          available_durations INTEGER[] DEFAULT ARRAY[15, 30, 45, 60], -- opciones disponibles

          -- Tipos de consulta habilitados
          enable_presential BOOLEAN DEFAULT TRUE,
          enable_teleconsultation BOOLEAN DEFAULT FALSE,
          enable_emergency BOOLEAN DEFAULT FALSE,

          -- Idiomas de atención
          languages TEXT[] DEFAULT ARRAY['es'], -- 'es', 'en', 'fr'

          -- Configuración adicional
          buffer_time_between_appointments INTEGER DEFAULT 0, -- tiempo de buffer en minutos
          max_advance_booking_days INTEGER DEFAULT 30, -- máximo días de anticipación para reservar

          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

          -- Constraints
          UNIQUE(user_id, clinic_id),
          CHECK (weekday_start_time < weekday_end_time),
          CHECK (saturday_start_time IS NULL OR saturday_end_time IS NULL OR saturday_start_time < saturday_end_time),
          CHECK (sunday_start_time IS NULL OR sunday_end_time IS NULL OR sunday_start_time < sunday_end_time),
          CHECK (default_consultation_duration > 0),
          CHECK (buffer_time_between_appointments >= 0),
          CHECK (max_advance_booking_days > 0)
        );

        -- RLS policies
        ALTER TABLE medical_practice_settings ENABLE ROW LEVEL SECURITY;

        -- Los usuarios solo pueden ver/editar sus propias configuraciones
        CREATE POLICY "Users can view own practice settings" ON medical_practice_settings
          FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own practice settings" ON medical_practice_settings
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own practice settings" ON medical_practice_settings
          FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete own practice settings" ON medical_practice_settings
          FOR DELETE USING (auth.uid() = user_id);

        -- Trigger para actualizar updated_at
        CREATE OR REPLACE FUNCTION update_medical_practice_settings_updated_at()
        RETURNS TRIGGER AS $trigger$
        BEGIN
          NEW.updated_at = TIMEZONE('utc'::text, NOW());
          RETURN NEW;
        END;
        $trigger$ language 'plpgsql';

        CREATE TRIGGER update_medical_practice_settings_updated_at
          BEFORE UPDATE ON medical_practice_settings
          FOR EACH ROW
          EXECUTE FUNCTION update_medical_practice_settings_updated_at();

        -- Función para obtener configuración con valores por defecto
        CREATE OR REPLACE FUNCTION get_practice_settings_with_defaults(p_user_id UUID, p_clinic_id UUID DEFAULT NULL)
        RETURNS medical_practice_settings AS $function$
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
        $function$ LANGUAGE plpgsql SECURITY DEFINER;

        RAISE NOTICE 'Tabla medical_practice_settings creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla medical_practice_settings ya existe';
    END IF;
END $$;