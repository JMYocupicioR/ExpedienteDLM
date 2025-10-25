-- Fix clinic_user_relationships status for users
-- This migration ensures all users have proper approved status and active flag
-- AND creates missing clinics and relationships

BEGIN;

-- Step 1: Create missing clinics from user profiles
INSERT INTO clinics (id, name, address, type, is_active, created_at, updated_at)
SELECT DISTINCT
  p.clinic_id,
  COALESCE(
    p.additional_info->>'clinic_name',
    p.full_name || '''s Clinic',
    'Clinica Medica'
  ),
  CASE
    WHEN p.additional_info->'clinic_address' IS NOT NULL THEN
      CONCAT_WS(', ',
        p.additional_info->'clinic_address'->>'street',
        p.additional_info->'clinic_address'->>'city',
        p.additional_info->'clinic_address'->>'state'
      )
    ELSE NULL
  END,
  'clinic',
  true,
  NOW(),
  NOW()
FROM profiles p
WHERE p.clinic_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM clinics c WHERE c.id = p.clinic_id
  )
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create clinic_user_relationships for users with clinic_id
INSERT INTO clinic_user_relationships (clinic_id, user_id, role_in_clinic, status, is_active, created_at, updated_at)
SELECT DISTINCT
  p.clinic_id,
  p.id,
  CASE
    WHEN p.role = 'admin_staff' THEN 'admin_staff'
    WHEN p.role = 'super_admin' THEN 'admin_staff'
    ELSE p.role
  END,
  'approved',
  true,
  NOW(),
  NOW()
FROM profiles p
WHERE p.clinic_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM clinic_user_relationships cur
    WHERE cur.clinic_id = p.clinic_id
      AND cur.user_id = p.id
  )
ON CONFLICT (clinic_id, user_id) DO UPDATE
SET
  status = 'approved',
  is_active = true,
  updated_at = NOW();

-- Step 3: Update any existing relationships that aren't approved/active
UPDATE clinic_user_relationships
SET
  status = 'approved',
  is_active = true,
  updated_at = NOW()
WHERE status IS NULL OR status != 'approved' OR is_active IS NULL OR is_active = false;

COMMIT;

-- Log the changes
DO $$
DECLARE
  clinic_count INT;
  relationship_count INT;
BEGIN
  SELECT COUNT(*) INTO clinic_count FROM clinics;
  SELECT COUNT(*) INTO relationship_count FROM clinic_user_relationships WHERE status = 'approved' AND is_active = true;

  RAISE NOTICE 'Total clinics in database: %', clinic_count;
  RAISE NOTICE 'Total active clinic relationships: %', relationship_count;
END $$;
