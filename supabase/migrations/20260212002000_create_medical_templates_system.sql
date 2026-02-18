-- =====================================================
-- MEDICAL TEMPLATES SYSTEM
-- =====================================================
-- Crea el sistema completo de plantillas médicas para interrogatorios,
-- exploraciones físicas y prescripciones

-- 1. Template Categories Table
CREATE TABLE IF NOT EXISTS public.template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  type TEXT NOT NULL CHECK (type IN ('interrogatorio', 'exploracion', 'prescripcion', 'general')),
  is_predefined BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, type)
);

-- 2. Medical Templates Table
CREATE TABLE IF NOT EXISTS public.medical_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.template_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('interrogatorio', 'exploracion', 'prescripcion')),
  specialty TEXT,
  content JSONB NOT NULL DEFAULT '{"sections": []}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_predefined BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3. Template Favorites Table
CREATE TABLE IF NOT EXISTS public.template_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.medical_templates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, template_id)
);

-- 4. Template Usage Tracking Table
CREATE TABLE IF NOT EXISTS public.template_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.medical_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  context JSONB
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Template Categories
CREATE INDEX IF NOT EXISTS idx_template_categories_type ON public.template_categories(type);
CREATE INDEX IF NOT EXISTS idx_template_categories_name ON public.template_categories(name);

-- Medical Templates
CREATE INDEX IF NOT EXISTS idx_medical_templates_user_id ON public.medical_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_templates_clinic_id ON public.medical_templates(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medical_templates_category_id ON public.medical_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_medical_templates_type ON public.medical_templates(type);
CREATE INDEX IF NOT EXISTS idx_medical_templates_is_public ON public.medical_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_medical_templates_is_predefined ON public.medical_templates(is_predefined);
CREATE INDEX IF NOT EXISTS idx_medical_templates_is_active ON public.medical_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_medical_templates_specialty ON public.medical_templates(specialty);
CREATE INDEX IF NOT EXISTS idx_medical_templates_usage_count ON public.medical_templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_medical_templates_created_at ON public.medical_templates(created_at DESC);

-- Template Favorites
CREATE INDEX IF NOT EXISTS idx_template_favorites_user_id ON public.template_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_template_favorites_template_id ON public.template_favorites(template_id);

-- Template Usage
CREATE INDEX IF NOT EXISTS idx_template_usage_template_id ON public.template_usage(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_user_id ON public.template_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_patient_id ON public.template_usage(patient_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_used_at ON public.template_usage(used_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_usage ENABLE ROW LEVEL SECURITY;

-- Template Categories Policies
-- Todos pueden leer categorías
CREATE POLICY "template_categories_select_all"
  ON public.template_categories FOR SELECT
  USING (true);

-- Solo admins pueden insertar/actualizar/eliminar categorías predefinidas
CREATE POLICY "template_categories_insert_admin"
  ON public.template_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "template_categories_update_admin"
  ON public.template_categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "template_categories_delete_admin"
  ON public.template_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Medical Templates Policies
-- Ver plantillas: propias, públicas, predefinidas, o de la misma clínica
CREATE POLICY "medical_templates_select"
  ON public.medical_templates FOR SELECT
  USING (
    is_active = true
    AND (
      user_id = auth.uid()
      OR is_public = true
      OR is_predefined = true
      OR (
        clinic_id IS NOT NULL
        AND clinic_id IN (
          SELECT clinic_id FROM public.user_profiles
          WHERE id = auth.uid()
        )
      )
    )
  );

-- Insertar: usuarios autenticados
CREATE POLICY "medical_templates_insert"
  ON public.medical_templates FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Actualizar: solo el propietario
CREATE POLICY "medical_templates_update"
  ON public.medical_templates FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Eliminar: solo el propietario (soft delete)
CREATE POLICY "medical_templates_delete"
  ON public.medical_templates FOR DELETE
  USING (user_id = auth.uid());

-- Template Favorites Policies
CREATE POLICY "template_favorites_select"
  ON public.template_favorites FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "template_favorites_insert"
  ON public.template_favorites FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "template_favorites_delete"
  ON public.template_favorites FOR DELETE
  USING (user_id = auth.uid());

-- Template Usage Policies
CREATE POLICY "template_usage_select"
  ON public.template_usage FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.medical_templates
      WHERE id = template_usage.template_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "template_usage_insert"
  ON public.template_usage FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Actualizar updated_at en template_categories
CREATE OR REPLACE FUNCTION update_template_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_template_categories_updated_at
  BEFORE UPDATE ON public.template_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_template_categories_updated_at();

-- Actualizar updated_at en medical_templates
CREATE OR REPLACE FUNCTION update_medical_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_medical_templates_updated_at
  BEFORE UPDATE ON public.medical_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_templates_updated_at();

-- Incrementar usage_count cuando se registra un uso
CREATE OR REPLACE FUNCTION increment_template_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.medical_templates
  SET usage_count = usage_count + 1
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_increment_template_usage_count
  AFTER INSERT ON public.template_usage
  FOR EACH ROW
  EXECUTE FUNCTION increment_template_usage_count();

-- =====================================================
-- SEED DATA
-- =====================================================

-- Categorías predefinidas
INSERT INTO public.template_categories (name, description, type, is_predefined, icon)
VALUES
  ('General', 'Plantillas generales aplicables a cualquier especialidad', 'general', true, 'FileText'),
  ('Medicina Interna', 'Plantillas para medicina interna', 'interrogatorio', true, 'Stethoscope'),
  ('Cardiología', 'Plantillas especializadas en cardiología', 'interrogatorio', true, 'Heart'),
  ('Neurología', 'Plantillas neurológicas', 'interrogatorio', true, 'Brain'),
  ('Traumatología', 'Plantillas de traumatología y ortopedia', 'exploracion', true, 'Bone'),
  ('Fisioterapia', 'Prescripciones de ejercicios y rehabilitación', 'prescripcion', true, 'Dumbbell'),
  ('Nutrición', 'Planes alimenticios y dietas', 'prescripcion', true, 'Apple')
ON CONFLICT (name, type) DO NOTHING;

-- Grant permissions
GRANT SELECT ON public.template_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_templates TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.template_favorites TO authenticated;
GRANT SELECT, INSERT ON public.template_usage TO authenticated;

-- Comentarios
COMMENT ON TABLE public.template_categories IS 'Categorías para organizar plantillas médicas';
COMMENT ON TABLE public.medical_templates IS 'Plantillas reutilizables para interrogatorios, exploraciones y prescripciones';
COMMENT ON TABLE public.template_favorites IS 'Plantillas favoritas de cada usuario';
COMMENT ON TABLE public.template_usage IS 'Registro de uso de plantillas para analytics';
