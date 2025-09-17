-- Script corregido para diagnosticar y corregir las relaciones de clínicas
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si existen clínicas
SELECT 'Clínicas existentes:' as info;
SELECT id, name, type, is_active, created_at FROM clinics ORDER BY created_at DESC;

-- 2. Verificar estructura de clinic_user_relationships
SELECT 'Estructura de clinic_user_relationships:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clinic_user_relationships' 
ORDER BY ordinal_position;

-- 3. Verificar tablas de relaciones
SELECT 'Tabla clinic_user_relationships:' as info;
SELECT COUNT(*) as total_relationships FROM clinic_user_relationships;

-- 4. Verificar tu usuario actual
SELECT 'Tu perfil actual:' as info;
SELECT id, email, full_name, role FROM profiles WHERE id = auth.uid();

-- 5. Verificar tus relaciones actuales
SELECT 'Tus relaciones con clínicas:' as info;
SELECT cur.*, c.name as clinic_name, c.is_active as clinic_active
FROM clinic_user_relationships cur
LEFT JOIN clinics c ON cur.clinic_id = c.id
WHERE cur.user_id = auth.uid();

-- 6. Crear clínicas de ejemplo si no existen
INSERT INTO clinics (name, type, address, phone, email, is_active)
SELECT 
  'Hospital General San José',
  'hospital',
  'Av. Insurgentes Sur 123, Col. Centro, CDMX',
  '+52 55 1234 5678',
  'contacto@hospitalsanjose.com',
  true
WHERE NOT EXISTS (SELECT 1 FROM clinics WHERE name = 'Hospital General San José');

INSERT INTO clinics (name, type, address, phone, email, is_active)
SELECT 
  'Clínica Especializada Santa María',
  'specialist_clinic',
  'Calle Reforma 456, Col. Juárez, CDMX',
  '+52 55 2345 6789',
  'info@clinicasantamaria.com',
  true
WHERE NOT EXISTS (SELECT 1 FROM clinics WHERE name = 'Clínica Especializada Santa María');

-- 7. Asociarte automáticamente a las clínicas (sin columna role por ahora)
-- (Solo si no tienes relaciones existentes)
INSERT INTO clinic_user_relationships (user_id, clinic_id, status, is_active, joined_at)
SELECT 
  auth.uid(),
  c.id,
  'approved',
  true,
  NOW()
FROM clinics c
WHERE c.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM clinic_user_relationships cur 
  WHERE cur.user_id = auth.uid() 
  AND cur.clinic_id = c.id
);

-- 8. Verificar resultado final
SELECT 'Resultado final - Tus clínicas:' as info;
SELECT 
  c.name,
  c.type,
  cur.status,
  cur.is_active,
  cur.joined_at
FROM clinic_user_relationships cur
JOIN clinics c ON cur.clinic_id = c.id
WHERE cur.user_id = auth.uid()
ORDER BY cur.joined_at DESC;