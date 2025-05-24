/*
  # Enhanced Physical Examination System

  1. Updates
    - Enhanced physical_exam_templates table structure
    - Updated consultations table to support detailed physical examinations
    - New audit logging for physical examinations
    - New file attachments system for physical exam images
    
  2. New Tables
    - `physical_exam_files`: Store files/images attached to physical examinations
    - `physical_exam_drafts`: Auto-save drafts of physical examinations
    
  3. Security
    - Enhanced RLS policies
    - Audit logging for all changes
    - File access control

  4. Performance
    - Optimized indexes
    - JSONB operations for complex data structures
*/

-- Create physical exam files table
CREATE TABLE IF NOT EXISTS physical_exam_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Create physical exam drafts table for auto-save functionality
CREATE TABLE IF NOT EXISTS physical_exam_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  template_id UUID REFERENCES physical_exam_templates(id),
  draft_data JSONB NOT NULL,
  last_modified TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_physical_exam_files_consultation ON physical_exam_files(consultation_id);
CREATE INDEX IF NOT EXISTS idx_physical_exam_files_section ON physical_exam_files(section_id);
CREATE INDEX IF NOT EXISTS idx_physical_exam_drafts_patient ON physical_exam_drafts(patient_id);
CREATE INDEX IF NOT EXISTS idx_physical_exam_drafts_doctor ON physical_exam_drafts(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_physical_exam ON consultations USING GIN (physical_examination);

-- Update physical_exam_templates table structure
ALTER TABLE physical_exam_templates 
ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_template_id UUID REFERENCES physical_exam_templates(id);

-- Enable RLS on new tables
ALTER TABLE physical_exam_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_exam_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for physical_exam_files
CREATE POLICY "Medical staff can view exam files"
  ON physical_exam_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      JOIN patients p ON c.patient_id = p.id
      WHERE c.id = physical_exam_files.consultation_id
      AND (
        is_admin() OR
        (is_doctor() AND c.doctor_id = auth.uid()) OR
        (is_nurse() AND has_patient_access(p.id))
      )
    )
  );

CREATE POLICY "Doctors can manage exam files"
  ON physical_exam_files
  FOR ALL
  TO authenticated
  USING (
    is_doctor() AND EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = physical_exam_files.consultation_id
      AND c.doctor_id = auth.uid()
    )
  )
  WITH CHECK (
    is_doctor() AND EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = physical_exam_files.consultation_id
      AND c.doctor_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all exam files"
  ON physical_exam_files
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- RLS Policies for physical_exam_drafts
CREATE POLICY "Doctors can manage their drafts"
  ON physical_exam_drafts
  FOR ALL
  TO authenticated
  USING (is_doctor() AND doctor_id = auth.uid())
  WITH CHECK (is_doctor() AND doctor_id = auth.uid());

CREATE POLICY "Admins can view all drafts"
  ON physical_exam_drafts
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Add soft delete policies
CREATE POLICY "No mostrar archivos eliminados"
  ON physical_exam_files
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Create triggers for timestamps
CREATE TRIGGER set_timestamp_physical_exam_files
  BEFORE UPDATE ON physical_exam_files
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_timestamp_physical_exam_drafts
  BEFORE UPDATE ON physical_exam_drafts
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create triggers for audit logging
CREATE TRIGGER audit_physical_exam_files
  AFTER INSERT OR UPDATE OR DELETE ON physical_exam_files
  FOR EACH ROW
  EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_physical_exam_drafts
  AFTER INSERT OR UPDATE OR DELETE ON physical_exam_drafts
  FOR EACH ROW
  EXECUTE FUNCTION audit_table_changes();

-- Function to clean old drafts (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_physical_exam_drafts()
RETURNS void AS $$
BEGIN
  DELETE FROM physical_exam_drafts 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to get physical exam template with enhanced data
CREATE OR REPLACE FUNCTION get_enhanced_physical_exam_template(template_id UUID)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate physical examination data
CREATE OR REPLACE FUNCTION validate_physical_exam_data(exam_data JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  required_fields TEXT[] := ARRAY['exam_date', 'exam_time', 'vital_signs'];
  field TEXT;
BEGIN
  -- Check required fields exist
  FOREACH field IN ARRAY required_fields
  LOOP
    IF NOT (exam_data ? field) THEN
      RAISE EXCEPTION 'Missing required field: %', field;
    END IF;
  END LOOP;
  
  -- Validate vital signs structure
  IF NOT (exam_data->'vital_signs' ? 'systolic_pressure') OR
     NOT (exam_data->'vital_signs' ? 'diastolic_pressure') OR
     NOT (exam_data->'vital_signs' ? 'heart_rate') OR
     NOT (exam_data->'vital_signs' ? 'temperature') THEN
    RAISE EXCEPTION 'Missing required vital signs';
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-save physical exam draft
CREATE OR REPLACE FUNCTION auto_save_physical_exam_draft(
  p_patient_id UUID,
  p_doctor_id UUID,
  p_template_id UUID,
  p_draft_data JSONB
)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update default physical exam templates with enhanced structure
DO $$
DECLARE
  admin_doctor_id UUID;
BEGIN
  -- Get first admin or doctor to assign templates
  SELECT id INTO admin_doctor_id 
  FROM profiles 
  WHERE role IN ('administrator', 'doctor') 
  LIMIT 1;
  
  IF admin_doctor_id IS NOT NULL THEN
    -- Update existing general template or create new one
    INSERT INTO physical_exam_templates (
      doctor_id,
      name,
      fields,
      template_type,
      is_active,
      version
    ) VALUES (
      admin_doctor_id,
      'Exploración Física General Completa',
      '{
        "head_neck": {
          "label": "Cabeza y Cuello",
          "type": "section",
          "normalFindings": [
            "Normocéfalo, sin deformidades",
            "Cuello simétrico, sin masas palpables",
            "Tiroides no palpable",
            "Ganglios no palpables",
            "Pulsos carotídeos simétricos"
          ],
          "abnormalFindings": [
            "Adenopatías cervicales",
            "Bocio",
            "Ingurgitación yugular",
            "Rigidez nucal",
            "Asimetría facial"
          ]
        },
        "chest_lungs": {
          "label": "Tórax y Pulmones",
          "type": "section",
          "normalFindings": [
            "Tórax simétrico",
            "Expansibilidad conservada",
            "Murmullo vesicular presente bilateral",
            "Sin ruidos agregados",
            "Percusión resonante"
          ],
          "abnormalFindings": [
            "Estertores",
            "Sibilancias",
            "Soplos",
            "Matidez",
            "Disminución del murmullo vesicular"
          ]
        },
        "cardiovascular": {
          "label": "Corazón y Sistema Cardiovascular",
          "type": "section",
          "normalFindings": [
            "Ruidos cardíacos rítmicos",
            "Sin soplos",
            "Pulsos periféricos presentes",
            "Sin edema",
            "Llenado capilar < 2 segundos"
          ],
          "abnormalFindings": [
            "Soplo sistólico",
            "Soplo diastólico",
            "Arritmia",
            "Edema en extremidades",
            "Pulsos débiles"
          ]
        },
        "abdomen": {
          "label": "Abdomen",
          "type": "section",
          "normalFindings": [
            "Blando, depresible",
            "Sin dolor a la palpación",
            "Ruidos intestinales presentes",
            "Sin masas palpables",
            "Sin organomegalias"
          ],
          "abnormalFindings": [
            "Dolor abdominal",
            "Distensión",
            "Hepatomegalia",
            "Esplenomegalia",
            "Masas abdominales"
          ]
        },
        "extremities": {
          "label": "Extremidades",
          "type": "section",
          "normalFindings": [
            "Movilidad conservada",
            "Sin deformidades",
            "Fuerza muscular 5/5",
            "Sin edema",
            "Pulsos periféricos presentes"
          ],
          "abnormalFindings": [
            "Limitación del movimiento",
            "Deformidades",
            "Debilidad muscular",
            "Edema",
            "Ausencia de pulsos"
          ]
        },
        "musculoskeletal": {
          "label": "Sistema Músculo-esquelético",
          "type": "section",
          "normalFindings": [
            "Articulaciones sin inflamación",
            "Movilidad completa",
            "Sin dolor articular",
            "Tono muscular normal",
            "Marcha normal"
          ],
          "abnormalFindings": [
            "Artritis",
            "Rigidez articular",
            "Atrofia muscular",
            "Contracturas",
            "Alteraciones de la marcha"
          ]
        },
        "skin": {
          "label": "Piel y Anexos",
          "type": "section",
          "normalFindings": [
            "Piel íntegra",
            "Color normal",
            "Sin lesiones",
            "Hidratación adecuada",
            "Uñas normales"
          ],
          "abnormalFindings": [
            "Palidez",
            "Ictericia",
            "Cianosis",
            "Erupciones",
            "Lesiones cutáneas"
          ]
        },
        "neurological": {
          "label": "Sistema Neurológico",
          "type": "section",
          "normalFindings": [
            "Consciente, orientado",
            "Reflejos normales",
            "Fuerza muscular 5/5",
            "Sensibilidad conservada",
            "Coordinación normal"
          ],
          "abnormalFindings": [
            "Alteración del estado mental",
            "Reflejos alterados",
            "Debilidad muscular",
            "Pérdida sensorial",
            "Incoordinación"
          ]
        }
      }'::JSONB,
      'general',
      true,
      2
    ) ON CONFLICT DO NOTHING;
  END IF;
END $$; 