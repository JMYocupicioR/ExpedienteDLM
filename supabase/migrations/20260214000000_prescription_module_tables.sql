-- =====================================================
-- MÓDULO DE RECETAS: TABLAS FALTANTES
-- =====================================================
-- Crea las tablas que el frontend referencia pero no existían:
-- 1. prescription_layouts       (reemplaza prescription_visual_layouts + prescription_layouts_unified)
-- 2. medication_templates       (presets de medicamentos del doctor)
-- 3. prescription_history_log   (auditoría de cambios en recetas)
-- 4. prescription_print_settings (preferencias de impresión por doctor)

BEGIN;

-- =====================================================
-- 1. PRESCRIPTION_LAYOUTS
-- =====================================================
-- Tabla canónica unificada para layouts/plantillas visuales de recetas.
-- Reemplaza: prescription_visual_layouts (disabled), prescription_layouts_unified (no existía)

CREATE TABLE IF NOT EXISTS prescription_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Sin nombre',
  description TEXT,
  orientation TEXT NOT NULL DEFAULT 'portrait' CHECK (orientation IN ('portrait', 'landscape')),
  page_size TEXT NOT NULL DEFAULT 'A4' CHECK (page_size IN ('A4', 'Letter', 'Legal')),
  template_elements JSONB NOT NULL DEFAULT '[]'::JSONB,
  canvas_settings JSONB NOT NULL DEFAULT '{
    "backgroundColor": "#ffffff",
    "backgroundImage": null,
    "canvasSize": {"width": 794, "height": 1123},
    "pageSize": "A4",
    "margin": "20mm",
    "showGrid": false,
    "zoom": 1
  }'::JSONB,
  print_settings JSONB DEFAULT '{
    "pageMargins": {"top": "20mm", "right": "15mm", "bottom": "20mm", "left": "15mm"},
    "printQuality": "high",
    "colorMode": "color",
    "scaleFactor": 1,
    "autoFitContent": true,
    "includeQrCode": true,
    "includeDigitalSignature": true
  }'::JSONB,
  is_default BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  is_predefined BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE prescription_layouts ENABLE ROW LEVEL SECURITY;

-- RLS: ver propios + públicos + predefinidos
CREATE POLICY "prescription_layouts_select" ON prescription_layouts
  FOR SELECT USING (
    doctor_id = auth.uid()
    OR is_public = true
    OR is_predefined = true
  );

CREATE POLICY "prescription_layouts_insert" ON prescription_layouts
  FOR INSERT WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "prescription_layouts_update" ON prescription_layouts
  FOR UPDATE USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "prescription_layouts_delete" ON prescription_layouts
  FOR DELETE USING (doctor_id = auth.uid() AND is_predefined = false);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prescription_layouts_doctor ON prescription_layouts(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescription_layouts_public ON prescription_layouts(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_prescription_layouts_default ON prescription_layouts(doctor_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_prescription_layouts_usage ON prescription_layouts(usage_count DESC);

-- Trigger updated_at
CREATE TRIGGER update_prescription_layouts_updated_at
  BEFORE UPDATE ON prescription_layouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_prescription_layout_usage(p_layout_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE prescription_layouts
  SET usage_count = usage_count + 1,
      last_used_at = now()
  WHERE id = p_layout_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON prescription_layouts TO authenticated;

-- =====================================================
-- 2. MEDICATION_TEMPLATES
-- =====================================================
-- Presets de grupos de medicamentos guardados por el doctor
-- Ej: "Tratamiento gripe" = paracetamol + ibuprofeno + antitusivo

CREATE TABLE IF NOT EXISTS medication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  diagnosis TEXT,
  medications JSONB NOT NULL DEFAULT '[]'::JSONB,
  notes TEXT,
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE medication_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medication_templates_select" ON medication_templates
  FOR SELECT USING (doctor_id = auth.uid() OR is_public = true);

CREATE POLICY "medication_templates_insert" ON medication_templates
  FOR INSERT WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "medication_templates_update" ON medication_templates
  FOR UPDATE USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "medication_templates_delete" ON medication_templates
  FOR DELETE USING (doctor_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_medication_templates_doctor ON medication_templates(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medication_templates_public ON medication_templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_medication_templates_usage ON medication_templates(usage_count DESC);

CREATE TRIGGER update_medication_templates_updated_at
  BEFORE UPDATE ON medication_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON medication_templates TO authenticated;

-- =====================================================
-- 3. PRESCRIPTION_HISTORY_LOG
-- =====================================================
-- Registro de acciones sobre recetas (crear, editar, cancelar, imprimir)

CREATE TABLE IF NOT EXISTS prescription_history_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'cancelled', 'printed', 'dispensed')),
  performed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE prescription_history_log ENABLE ROW LEVEL SECURITY;

-- Solo puede ver el historial quien tiene acceso a la receta
CREATE POLICY "prescription_history_log_select" ON prescription_history_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM prescriptions p
      WHERE p.id = prescription_history_log.prescription_id
        AND p.doctor_id = auth.uid()
    )
  );

CREATE POLICY "prescription_history_log_insert" ON prescription_history_log
  FOR INSERT WITH CHECK (performed_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_prescription_history_log_prescription ON prescription_history_log(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_history_log_action ON prescription_history_log(action);
CREATE INDEX IF NOT EXISTS idx_prescription_history_log_date ON prescription_history_log(created_at DESC);

GRANT SELECT, INSERT ON prescription_history_log TO authenticated;

-- =====================================================
-- 4. PRESCRIPTION_PRINT_SETTINGS
-- =====================================================
-- Preferencias de impresión por doctor (1:1 con doctor)

CREATE TABLE IF NOT EXISTS prescription_print_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  default_layout_id UUID REFERENCES prescription_layouts(id) ON DELETE SET NULL,
  page_size TEXT DEFAULT 'A4',
  page_orientation TEXT DEFAULT 'portrait',
  page_margins JSONB DEFAULT '{"top": "20mm", "right": "15mm", "bottom": "20mm", "left": "15mm"}'::JSONB,
  print_quality TEXT DEFAULT 'high',
  color_mode TEXT DEFAULT 'color',
  scale_factor FLOAT DEFAULT 1.0,
  auto_fit_content BOOLEAN DEFAULT true,
  include_qr_code BOOLEAN DEFAULT true,
  include_digital_signature BOOLEAN DEFAULT true,
  watermark_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(doctor_id)
);

ALTER TABLE prescription_print_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prescription_print_settings_select" ON prescription_print_settings
  FOR SELECT USING (doctor_id = auth.uid());

CREATE POLICY "prescription_print_settings_insert" ON prescription_print_settings
  FOR INSERT WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "prescription_print_settings_update" ON prescription_print_settings
  FOR UPDATE USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "prescription_print_settings_delete" ON prescription_print_settings
  FOR DELETE USING (doctor_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_prescription_print_settings_doctor ON prescription_print_settings(doctor_id);

CREATE TRIGGER update_prescription_print_settings_updated_at
  BEFORE UPDATE ON prescription_print_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON prescription_print_settings TO authenticated;

-- =====================================================
-- 5. AGREGAR COLUMNAS FALTANTES A prescriptions (si no existen)
-- =====================================================
-- El frontend usa diagnosis, expires_at, visual_layout que no están en la migración base

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prescriptions' AND column_name = 'diagnosis') THEN
    ALTER TABLE prescriptions ADD COLUMN diagnosis TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prescriptions' AND column_name = 'expires_at') THEN
    ALTER TABLE prescriptions ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prescriptions' AND column_name = 'visual_layout') THEN
    ALTER TABLE prescriptions ADD COLUMN visual_layout JSONB;
  END IF;
END $$;

-- =====================================================
-- 6. LAYOUT PREDEFINIDO POR DEFECTO
-- =====================================================
-- Inserta una plantilla pública predefinida "Clásica" disponible para todos los doctores

INSERT INTO prescription_layouts (
  doctor_id,
  name,
  description,
  orientation,
  page_size,
  template_elements,
  canvas_settings,
  is_public,
  is_predefined,
  category
) 
SELECT 
  p.id,
  'Plantilla Clásica',
  'Diseño tradicional de receta médica con información esencial',
  'portrait',
  'A4',
  '[
    {"id":"header-clinic","type":"text","position":{"x":50,"y":50},"size":{"width":694,"height":60},"content":"{{clinicName}}","style":{"fontSize":24,"fontFamily":"Arial","color":"#1f2937","fontWeight":"bold","textAlign":"center"},"zIndex":1,"isVisible":true,"isLocked":false},
    {"id":"doctor-info","type":"text","position":{"x":50,"y":120},"size":{"width":400,"height":40},"content":"Dr. {{doctorName}} - Cédula: {{doctorLicense}}","style":{"fontSize":14,"fontFamily":"Arial","color":"#374151","fontWeight":"normal","textAlign":"left"},"zIndex":1,"isVisible":true,"isLocked":false},
    {"id":"date-field","type":"text","position":{"x":500,"y":120},"size":{"width":244,"height":40},"content":"Fecha: {{date}}","style":{"fontSize":12,"fontFamily":"Arial","color":"#6b7280","fontWeight":"normal","textAlign":"right"},"zIndex":1,"isVisible":true,"isLocked":false},
    {"id":"patient-info","type":"text","position":{"x":50,"y":180},"size":{"width":694,"height":60},"content":"Paciente: {{patientName}}","style":{"fontSize":14,"fontFamily":"Arial","color":"#1f2937","fontWeight":"normal","textAlign":"left","lineHeight":1.5},"zIndex":1,"isVisible":true,"isLocked":false},
    {"id":"diagnosis","type":"text","position":{"x":50,"y":260},"size":{"width":694,"height":40},"content":"Diagnóstico: {{diagnosis}}","style":{"fontSize":14,"fontFamily":"Arial","color":"#1f2937","fontWeight":"bold","textAlign":"left"},"zIndex":1,"isVisible":true,"isLocked":false},
    {"id":"medications-header","type":"text","position":{"x":50,"y":320},"size":{"width":694,"height":30},"content":"MEDICAMENTOS:","style":{"fontSize":16,"fontFamily":"Arial","color":"#1f2937","fontWeight":"bold","textAlign":"left"},"zIndex":1,"isVisible":true,"isLocked":false},
    {"id":"medications-list","type":"text","position":{"x":50,"y":360},"size":{"width":694,"height":300},"content":"{{medications}}","style":{"fontSize":12,"fontFamily":"Arial","color":"#1f2937","fontWeight":"normal","textAlign":"left","lineHeight":1.8},"zIndex":1,"isVisible":true,"isLocked":false},
    {"id":"notes","type":"text","position":{"x":50,"y":680},"size":{"width":694,"height":80},"content":"Notas: {{notes}}","style":{"fontSize":11,"fontFamily":"Arial","color":"#6b7280","fontWeight":"normal","textAlign":"left","lineHeight":1.4},"zIndex":1,"isVisible":true,"isLocked":false},
    {"id":"signature-area","type":"text","position":{"x":450,"y":900},"size":{"width":294,"height":60},"content":"________________________\nFirma del Médico","style":{"fontSize":12,"fontFamily":"Arial","color":"#374151","fontWeight":"normal","textAlign":"center","lineHeight":1.5},"zIndex":1,"isVisible":true,"isLocked":false}
  ]'::JSONB,
  '{"backgroundColor":"#ffffff","backgroundImage":null,"canvasSize":{"width":794,"height":1123},"pageSize":"A4","margin":"20mm","showGrid":false,"zoom":1}'::JSONB,
  true,
  true,
  'general'
FROM profiles p
WHERE p.role IN ('doctor', 'super_admin')
LIMIT 1
ON CONFLICT DO NOTHING;

COMMIT;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
DO $$
DECLARE
  t_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO t_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('prescription_layouts', 'medication_templates', 'prescription_history_log', 'prescription_print_settings');

  IF t_count < 4 THEN
    RAISE WARNING 'Solo % de 4 tablas fueron creadas', t_count;
  ELSE
    RAISE NOTICE '✅ 4/4 tablas del módulo de recetas creadas correctamente';
  END IF;
END $$;
