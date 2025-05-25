-- Crear tabla de prescripciones
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES profiles(id),
  medications JSONB NOT NULL,
  diagnosis TEXT NOT NULL,
  notes TEXT,
  signature TEXT,
  qr_code TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'dispensed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Crear tabla de plantillas de prescripciones
CREATE TABLE IF NOT EXISTS prescription_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID REFERENCES profiles(id),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  medications JSONB NOT NULL,
  diagnosis TEXT,
  notes TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de relación entre consultas y prescripciones
CREATE TABLE IF NOT EXISTS consultation_prescriptions (
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (consultation_id, prescription_id)
);

-- Crear tabla de farmacias
CREATE TABLE IF NOT EXISTS pharmacies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de estado de prescripciones en farmacias
CREATE TABLE IF NOT EXISTS prescription_pharmacy_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID REFERENCES prescriptions(id),
  pharmacy_id UUID REFERENCES pharmacies(id),
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'received', 'preparing', 'ready', 'delivered')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_prescriptions_created_at ON prescriptions(created_at DESC);
CREATE INDEX idx_prescription_templates_doctor_id ON prescription_templates(doctor_id);
CREATE INDEX idx_prescription_pharmacy_status_prescription ON prescription_pharmacy_status(prescription_id);
CREATE INDEX idx_prescription_pharmacy_status_pharmacy ON prescription_pharmacy_status(pharmacy_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_pharmacy_status ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para prescripciones
-- Los médicos pueden ver todas las prescripciones
CREATE POLICY "Doctors can view all prescriptions" ON prescriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'administrator')
    )
  );

-- Los médicos solo pueden crear sus propias prescripciones
CREATE POLICY "Doctors can create prescriptions" ON prescriptions
  FOR INSERT TO authenticated
  WITH CHECK (doctor_id = auth.uid());

-- Los médicos pueden actualizar sus propias prescripciones
CREATE POLICY "Doctors can update own prescriptions" ON prescriptions
  FOR UPDATE TO authenticated
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

-- Políticas para plantillas
CREATE POLICY "Doctors can manage own templates" ON prescription_templates
  FOR ALL TO authenticated
  USING (doctor_id = auth.uid() OR is_public = true)
  WITH CHECK (doctor_id = auth.uid());

-- Políticas para farmacias (todos pueden ver)
CREATE POLICY "Everyone can view pharmacies" ON pharmacies
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Solo administradores pueden gestionar farmacias
CREATE POLICY "Admins can manage pharmacies" ON pharmacies
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrator'
    )
  );

-- Función para actualizar el timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prescription_templates_updated_at BEFORE UPDATE ON prescription_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pharmacies_updated_at BEFORE UPDATE ON pharmacies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prescription_pharmacy_status_updated_at BEFORE UPDATE ON prescription_pharmacy_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 