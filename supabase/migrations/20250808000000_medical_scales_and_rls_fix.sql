-- =============================================
-- Medical Scales + RLS Hardening
-- =============================================

-- 1) Harden existing RLS for critical tables (patients, consultations, prescriptions, physical_exams)
--    Drop overly-permissive policies (auth.role()='authenticated') and re-create using get_app_user_role()

DO $$
BEGIN
  -- Patients
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='patients') THEN
    -- Relax schema to align with frontend (email/phone can be null)
    BEGIN
      ALTER TABLE public.patients ALTER COLUMN email DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN
      -- ignore
    END;
    BEGIN
      ALTER TABLE public.patients ALTER COLUMN phone DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN
      -- ignore
    END;

    ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "patients_insert_policy" ON public.patients;
    DROP POLICY IF EXISTS "patients_select_policy" ON public.patients;
    DROP POLICY IF EXISTS "patients_update_policy" ON public.patients;
    DROP POLICY IF EXISTS "patients_delete_policy" ON public.patients;

    CREATE POLICY "patients_select_policy"
    ON public.patients FOR SELECT
    TO authenticated
    USING (
      (public.get_app_user_role() IN ('administrator', 'doctor', 'nurse'))
    );

    CREATE POLICY "patients_insert_policy"
    ON public.patients FOR INSERT
    TO authenticated
    WITH CHECK (
      public.get_app_user_role() IN ('administrator', 'doctor')
    );

    CREATE POLICY "patients_update_policy"
    ON public.patients FOR UPDATE
    TO authenticated
    USING (
      public.get_app_user_role() IN ('administrator', 'doctor')
    )
    WITH CHECK (
      public.get_app_user_role() IN ('administrator', 'doctor')
    );

    CREATE POLICY "patients_delete_policy"
    ON public.patients FOR DELETE
    TO authenticated
    USING (public.get_app_user_role() = 'administrator');
  END IF;

  -- Consultations
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='consultations') THEN
    ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "consultations_insert_policy" ON public.consultations;
    DROP POLICY IF EXISTS "consultations_select_policy" ON public.consultations;
    DROP POLICY IF EXISTS "consultations_update_policy" ON public.consultations;
    DROP POLICY IF EXISTS "consultations_delete_policy" ON public.consultations;
    DROP POLICY IF EXISTS "consultations_modify_policy" ON public.consultations;

    CREATE POLICY "consultations_select_policy"
    ON public.consultations FOR SELECT
    TO authenticated
    USING (
      deleted_at IS NULL AND
      (doctor_id = auth.uid() OR public.get_app_user_role() IN ('administrator', 'nurse'))
    );

    CREATE POLICY "consultations_insert_policy"
    ON public.consultations FOR INSERT
    TO authenticated
    WITH CHECK (
      doctor_id = auth.uid() OR public.get_app_user_role() = 'administrator'
    );

    CREATE POLICY "consultations_update_policy"
    ON public.consultations FOR UPDATE
    TO authenticated
    USING (
      deleted_at IS NULL AND (doctor_id = auth.uid() OR public.get_app_user_role() = 'administrator')
    )
    WITH CHECK (
      doctor_id = auth.uid() OR public.get_app_user_role() = 'administrator'
    );

    CREATE POLICY "consultations_delete_policy"
    ON public.consultations FOR DELETE
    TO authenticated
    USING (
      doctor_id = auth.uid() OR public.get_app_user_role() = 'administrator'
    );
  END IF;

  -- Physical exams
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='physical_exams') THEN
    ALTER TABLE public.physical_exams ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "physical_exams_insert_policy" ON public.physical_exams;
    DROP POLICY IF EXISTS "physical_exams_select_policy" ON public.physical_exams;
    DROP POLICY IF EXISTS "physical_exams_update_policy" ON public.physical_exams;
    DROP POLICY IF EXISTS "physical_exams_delete_policy" ON public.physical_exams;

    CREATE POLICY "physical_exams_select_policy" 
    ON public.physical_exams FOR SELECT 
    TO authenticated 
    USING (
      public.get_app_user_role() IN ('administrator', 'doctor', 'nurse')
    );

    CREATE POLICY "physical_exams_insert_policy" 
    ON public.physical_exams FOR INSERT 
    TO authenticated 
    WITH CHECK (
      public.get_app_user_role() IN ('administrator', 'doctor') AND doctor_id = auth.uid()
    );

    CREATE POLICY "physical_exams_update_policy" 
    ON public.physical_exams FOR UPDATE 
    TO authenticated 
    USING (
      public.get_app_user_role() IN ('administrator', 'doctor') AND doctor_id = auth.uid()
    )
    WITH CHECK (
      public.get_app_user_role() IN ('administrator', 'doctor') AND doctor_id = auth.uid()
    );

    CREATE POLICY "physical_exams_delete_policy" 
    ON public.physical_exams FOR DELETE 
    TO authenticated 
    USING (
      public.get_app_user_role() = 'administrator' OR doctor_id = auth.uid()
    );
  END IF;

  -- Prescriptions (keep parity with consultations)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='prescriptions') THEN
    ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "prescriptions_insert_policy" ON public.prescriptions;
    DROP POLICY IF EXISTS "prescriptions_select_policy" ON public.prescriptions;
    DROP POLICY IF EXISTS "prescriptions_update_policy" ON public.prescriptions;
    DROP POLICY IF EXISTS "prescriptions_delete_policy" ON public.prescriptions;
    DROP POLICY IF EXISTS "prescriptions_modify_policy" ON public.prescriptions;

    CREATE POLICY "prescriptions_select_policy"
    ON public.prescriptions FOR SELECT
    TO authenticated
    USING (
      deleted_at IS NULL AND (doctor_id = auth.uid() OR public.get_app_user_role() IN ('administrator', 'nurse'))
    );

    CREATE POLICY "prescriptions_insert_policy"
    ON public.prescriptions FOR INSERT
    TO authenticated
    WITH CHECK (
      doctor_id = auth.uid() OR public.get_app_user_role() = 'administrator'
    );

    CREATE POLICY "prescriptions_update_policy"
    ON public.prescriptions FOR UPDATE
    TO authenticated
    USING (
      deleted_at IS NULL AND (doctor_id = auth.uid() OR public.get_app_user_role() = 'administrator')
    )
    WITH CHECK (
      doctor_id = auth.uid() OR public.get_app_user_role() = 'administrator'
    );

    CREATE POLICY "prescriptions_delete_policy"
    ON public.prescriptions FOR DELETE
    TO authenticated
    USING (
      doctor_id = auth.uid() OR public.get_app_user_role() = 'administrator'
    );
  END IF;
END $$;


-- 2) Medical scales catalog + assessments

CREATE TABLE IF NOT EXISTS public.medical_scales (
  id TEXT PRIMARY KEY, -- slug, e.g. 'barthel', 'womac', 'boston_carpal_tunnel'
  name TEXT NOT NULL,
  specialty TEXT,
  category TEXT,
  description TEXT,
  definition JSONB NOT NULL, -- questions, options, scoring rules
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.scale_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  scale_id TEXT NOT NULL REFERENCES public.medical_scales(id),
  answers JSONB NOT NULL,
  score NUMERIC,
  severity TEXT,
  interpretation JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(consultation_id, scale_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scale_assessments_patient ON public.scale_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_scale_assessments_doctor ON public.scale_assessments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_scale_assessments_consultation ON public.scale_assessments(consultation_id);
CREATE INDEX IF NOT EXISTS idx_medical_scales_active ON public.medical_scales(is_active);

-- RLS
ALTER TABLE public.medical_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scale_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medical_scales_select_policy" ON public.medical_scales;
CREATE POLICY "medical_scales_select_policy"
ON public.medical_scales FOR SELECT
TO authenticated
USING (is_active = TRUE);

DROP POLICY IF EXISTS "medical_scales_modify_policy" ON public.medical_scales;
CREATE POLICY "medical_scales_modify_policy"
ON public.medical_scales FOR ALL
TO authenticated
USING (public.get_app_user_role() = 'administrator')
WITH CHECK (public.get_app_user_role() = 'administrator');

DROP POLICY IF EXISTS "scale_assessments_select_policy" ON public.scale_assessments;
CREATE POLICY "scale_assessments_select_policy"
ON public.scale_assessments FOR SELECT
TO authenticated
USING (
  doctor_id = auth.uid() OR public.get_app_user_role() IN ('administrator', 'nurse')
);

DROP POLICY IF EXISTS "scale_assessments_insert_policy" ON public.scale_assessments;
CREATE POLICY "scale_assessments_insert_policy"
ON public.scale_assessments FOR INSERT
TO authenticated
WITH CHECK (
  doctor_id = auth.uid() OR public.get_app_user_role() = 'administrator'
);

DROP POLICY IF EXISTS "scale_assessments_update_policy" ON public.scale_assessments;
CREATE POLICY "scale_assessments_update_policy"
ON public.scale_assessments FOR UPDATE
TO authenticated
USING (
  doctor_id = auth.uid() OR public.get_app_user_role() = 'administrator'
)
WITH CHECK (
  doctor_id = auth.uid() OR public.get_app_user_role() = 'administrator'
);

DROP POLICY IF EXISTS "scale_assessments_delete_policy" ON public.scale_assessments;
CREATE POLICY "scale_assessments_delete_policy"
ON public.scale_assessments FOR DELETE
TO authenticated
USING (
  doctor_id = auth.uid() OR public.get_app_user_role() = 'administrator'
);

-- Triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_medical_scales_updated_at ON public.medical_scales;
CREATE TRIGGER trg_medical_scales_updated_at
  BEFORE UPDATE ON public.medical_scales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_scale_assessments_updated_at ON public.scale_assessments;
CREATE TRIGGER trg_scale_assessments_updated_at
  BEFORE UPDATE ON public.scale_assessments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed: three common scales (minimal definitions)
INSERT INTO public.medical_scales (id, name, specialty, category, description, definition)
VALUES
  ('barthel', 'Índice de Barthel', 'rehabilitacion', 'funcionalidad', 'Evalúa independencia en ABVD',
    jsonb_build_object(
      'version','1.0',
      'items', jsonb_build_array(
        jsonb_build_object('id','alimentacion','text','Alimentación','type','select','options',jsonb_build_array(
          jsonb_build_object('label','Independiente','value',10),
          jsonb_build_object('label','Necesita ayuda','value',5),
          jsonb_build_object('label','Dependiente','value',0)
        )),
        jsonb_build_object('id','bano','text','Baño','type','select','options',jsonb_build_array(
          jsonb_build_object('label','Independiente','value',5),
          jsonb_build_object('label','Dependiente','value',0)
        ))
      ),
      'scoring', jsonb_build_object('sum','value','ranges', jsonb_build_array(
        jsonb_build_object('min',0,'max',20,'severity','dependencia_total')
      ))
    )
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.medical_scales (id, name, specialty, category, description, definition)
VALUES
  ('womac_knee', 'WOMAC (Rodilla)', 'ortopedia', 'dolor_funcion', 'Evaluación de dolor y función en gonartrosis',
    jsonb_build_object(
      'version','1.0',
      'items', jsonb_build_array(
        jsonb_build_object('id','dolor_caminando','text','Dolor al caminar','type','select','options',jsonb_build_array(
          jsonb_build_object('label','Ninguno','value',0),
          jsonb_build_object('label','Leve','value',1),
          jsonb_build_object('label','Moderado','value',2),
          jsonb_build_object('label','Severo','value',3),
          jsonb_build_object('label','Extremo','value',4)
        ))
      ),
      'scoring', jsonb_build_object('sum','value','ranges', jsonb_build_array(
        jsonb_build_object('min',0,'max',96,'severity','mayor_puntuacion=worse')
      ))
    )
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.medical_scales (id, name, specialty, category, description, definition)
VALUES
  ('boston_carpal_tunnel', 'Boston CTS', 'neurologia', 'neuromuscular', 'Síntomas y función en túnel carpiano',
    jsonb_build_object(
      'version','1.0',
      'items', jsonb_build_array(
        jsonb_build_object('id','entumecimiento','text','Entumecimiento','type','select','options',jsonb_build_array(
          jsonb_build_object('label','Ninguno','value',1),
          jsonb_build_object('label','Leve','value',2),
          jsonb_build_object('label','Moderado','value',3),
          jsonb_build_object('label','Severo','value',4),
          jsonb_build_object('label','Muy severo','value',5)
        ))
      ),
      'scoring', jsonb_build_object('average',true,
        'guides', jsonb_build_object(
          'sss', jsonb_build_array(
            jsonb_build_object('min',1.0,'max',1.9,'label','Síntomas leves'),
            jsonb_build_object('min',2.0,'max',3.4,'label','Síntomas moderados'),
            jsonb_build_object('min',3.5,'max',5.0,'label','Síntomas severos')
          ),
          'fss', jsonb_build_array(
            jsonb_build_object('min',1.0,'max',1.9,'label','Función normal/leve'),
            jsonb_build_object('min',2.0,'max',3.4,'label','Dificultad moderada'),
            jsonb_build_object('min',3.5,'max',5.0,'label','Dificultad severa')
          )
        )
      )
    )
  )
ON CONFLICT (id) DO NOTHING;

-- Finish
DO $$ BEGIN RAISE LOG '✅ Medical scales created and RLS hardened'; END $$;


