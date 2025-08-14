-- Primero, necesitamos obtener el ID del usuario de auth.users
-- Ejecuta este query para ver los usuarios:
SELECT id, email FROM auth.users WHERE email = 'jmyocupidor@gmail.com';

-- Una vez que tengas el ID, usa este SQL para crear el perfil
-- (reemplaza 'USER_ID_HERE' con el ID real del usuario)

-- Crear perfil de administrador
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
) 
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', 'Administrador'),
  'admin_staff',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'jmyocupidor@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin_staff',
  updated_at = NOW();

-- Crear una clínica si no existe
INSERT INTO clinics (
  id,
  name,
  type,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'DLM Clinic',
  'general',
  true,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Asociar el usuario con la clínica
WITH user_profile AS (
  SELECT id FROM profiles WHERE email = 'jmyocupidor@gmail.com'
),
clinic_info AS (
  SELECT id FROM clinics WHERE name = 'DLM Clinic' LIMIT 1
)
UPDATE profiles 
SET clinic_id = clinic_info.id
FROM user_profile, clinic_info
WHERE profiles.id = user_profile.id;

-- Crear relación usuario-clínica
INSERT INTO clinic_user_relationships (
  user_id,
  clinic_id,
  role_in_clinic,
  is_active,
  start_date
)
SELECT 
  p.id,
  p.clinic_id,
  'admin_staff',
  true,
  CURRENT_DATE
FROM profiles p
WHERE p.email = 'jmyocupidor@gmail.com'
  AND p.clinic_id IS NOT NULL
ON CONFLICT (user_id, clinic_id) DO UPDATE SET
  role_in_clinic = 'admin_staff',
  is_active = true;

-- Verificar que todo se creó correctamente
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.clinic_id,
  c.name as clinic_name,
  cur.role_in_clinic,
  cur.is_active
FROM profiles p
LEFT JOIN clinics c ON p.clinic_id = c.id
LEFT JOIN clinic_user_relationships cur ON p.id = cur.user_id AND p.clinic_id = cur.clinic_id
WHERE p.email = 'jmyocupidor@gmail.com';
