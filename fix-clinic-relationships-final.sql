-- Script FINAL corregido para diagnosticar y corregir las relaciones de clínicas
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si existen clínicas
SELECT 'Clínicas existentes:' as info;
SELECT id, name, type, is_active, created_at FROM clinics ORDER BY created_at DESC;

-- 2. Verificar tablas de relaciones
SELECT 'Tabla clinic_user_relationships:' as info;
SELECT COUNT(*) as total_relationships FROM clinic_user_relationships;

-- 3. Verificar tu usuario actual
SELECT 'Tu perfil actual:' as info;
SELECT id, email, full_name, role FROM profiles WHERE id = auth.uid();

-- 4. Verificar tus relaciones actuales
SELECT 'Tus relaciones con clínicas:' as info;
SELECT 
  cur.id,
  cur.role_in_clinic,
  cur.status,
  cur.is_active,
  cur.start_date,
  c.name as clinic_name, 
  c.is_active as clinic_active
FROM clinic_user_relationships cur
LEFT JOIN clinics c ON cur.clinic_id = c.id
WHERE cur.user_id = auth.uid();

-- 5. Crear clínicas de ejemplo si no existen
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

INSERT INTO clinics (name, type, address, phone, email, is_active)
SELECT 
  'Centro Médico Los Ángeles',
  'medical_center',
  'Av. Universidad 789, Col. Del Valle, CDMX',
  '+52 55 3456 7890',
  'contacto@centrolosangeles.com',
  true
WHERE NOT EXISTS (SELECT 1 FROM clinics WHERE name = 'Centro Médico Los Ángeles');

-- 6. Asociarte automáticamente a las clínicas como admin
-- (Solo si no tienes relaciones existentes)
INSERT INTO clinic_user_relationships (
  user_id, 
  clinic_id, 
  role_in_clinic, 
  start_date,
  is_active, 
  status,
  created_at,
  updated_at
)
SELECT 
  auth.uid(),
  c.id,
  'admin_staff',
  NOW()::date,
  true,
  'approved',
  NOW(),
  NOW()
FROM clinics c
WHERE c.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM clinic_user_relationships cur 
  WHERE cur.user_id = auth.uid() 
  AND cur.clinic_id = c.id
);

-- 7. Verificar resultado final
SELECT 'Resultado final - Tus clínicas:' as info;
SELECT 
  c.name,
  c.type,
  cur.role_in_clinic,
  cur.status,
  cur.is_active,
  cur.start_date,
  cur.created_at as joined_at
FROM clinic_user_relationships cur
JOIN clinics c ON cur.clinic_id = c.id
WHERE cur.user_id = auth.uid()
ORDER BY cur.created_at DESC;

-- 8. Mostrar resumen final
SELECT 'RESUMEN:' as info;
SELECT 
  COUNT(DISTINCT c.id) as total_clinicas_disponibles,
  COUNT(DISTINCT cur.clinic_id) as mis_clinicas_asociadas,
  COUNT(CASE WHEN cur.status = 'approved' AND cur.is_active = true THEN 1 END) as clinicas_activas
FROM clinics c
LEFT JOIN clinic_user_relationships cur ON c.id = cur.clinic_id AND cur.user_id = auth.uid();