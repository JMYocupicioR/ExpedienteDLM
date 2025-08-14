-- Fix infinite recursion in RLS policies for patients and clinic_user_relationships

-- Step 1: Drop all existing policies that might cause recursion
DO $$
BEGIN
    -- Drop patients policies
    DROP POLICY IF EXISTS "patients_select_own_clinic" ON patients;
    DROP POLICY IF EXISTS "patients_insert_own_clinic" ON patients;
    DROP POLICY IF EXISTS "patients_update_own_clinic" ON patients;
    DROP POLICY IF EXISTS "patients_delete_own_clinic" ON patients;
    
    -- Drop clinic_user_relationships policies
    DROP POLICY IF EXISTS "cur_select_own_clinic" ON clinic_user_relationships;
    DROP POLICY IF EXISTS "cur_insert_self_or_admin" ON clinic_user_relationships;
    DROP POLICY IF EXISTS "cur_update_admin_only" ON clinic_user_relationships;
    DROP POLICY IF EXISTS "cur_delete_admin_only" ON clinic_user_relationships;
    
    -- Drop any other potentially conflicting policies
    DROP POLICY IF EXISTS "clinic_user_relationships_select" ON clinic_user_relationships;
    DROP POLICY IF EXISTS "clinic_user_relationships_insert" ON clinic_user_relationships;
    DROP POLICY IF EXISTS "clinic_user_relationships_update" ON clinic_user_relationships;
    DROP POLICY IF EXISTS "clinic_user_relationships_delete" ON clinic_user_relationships;
END $$;

-- Step 2: Create helper functions to avoid recursion
CREATE OR REPLACE FUNCTION get_user_clinic_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT clinic_id 
    FROM profiles 
    WHERE id = auth.uid()
    LIMIT 1
$$;

CREATE OR REPLACE FUNCTION user_belongs_to_clinic(check_clinic_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE id = auth.uid() 
        AND clinic_id = check_clinic_id
    )
$$;

CREATE OR REPLACE FUNCTION user_is_clinic_admin(check_clinic_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM profiles p
        WHERE p.id = auth.uid() 
        AND p.clinic_id = check_clinic_id
        AND (p.role = 'admin_staff' OR p.role = 'super_admin')
    )
$$;

-- Step 3: Create simple policies for clinic_user_relationships first
CREATE POLICY "cur_select_simple" ON clinic_user_relationships
    FOR SELECT USING (
        -- Users can see relationships for their own clinic
        clinic_id = get_user_clinic_id()
        OR 
        -- Users can see their own relationships
        user_id = auth.uid()
    );

CREATE POLICY "cur_insert_simple" ON clinic_user_relationships
    FOR INSERT WITH CHECK (
        -- Only admins can insert relationships for their clinic
        user_is_clinic_admin(clinic_id)
    );

CREATE POLICY "cur_update_simple" ON clinic_user_relationships
    FOR UPDATE USING (
        -- Only admins can update relationships for their clinic
        user_is_clinic_admin(clinic_id)
    );

CREATE POLICY "cur_delete_simple" ON clinic_user_relationships
    FOR DELETE USING (
        -- Only admins can delete relationships for their clinic
        user_is_clinic_admin(clinic_id)
    );

-- Step 4: Create policies for patients table using the helper functions
CREATE POLICY "patients_select_clinic" ON patients
    FOR SELECT USING (
        -- Users can see patients from their clinic
        user_belongs_to_clinic(clinic_id)
    );

CREATE POLICY "patients_insert_clinic" ON patients
    FOR INSERT WITH CHECK (
        -- Users can only insert patients for their clinic
        clinic_id = get_user_clinic_id()
    );

CREATE POLICY "patients_update_clinic" ON patients
    FOR UPDATE USING (
        -- Users can only update patients from their clinic
        user_belongs_to_clinic(clinic_id)
    );

CREATE POLICY "patients_delete_clinic" ON patients
    FOR DELETE USING (
        -- Only admins can delete patients from their clinic
        user_is_clinic_admin(clinic_id)
    );

-- Step 5: Create indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_profiles_clinic_id ON profiles(clinic_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_role ON profiles(id, role);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_user_relationships_clinic_user ON clinic_user_relationships(clinic_id, user_id);

-- Step 6: Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_clinic_id() TO authenticated;
GRANT EXECUTE ON FUNCTION user_belongs_to_clinic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_is_clinic_admin(UUID) TO authenticated;
