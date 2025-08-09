-- ==========================================
-- POLÍTICAS RLS MEJORADAS - SISTEMA MULTI-ROL
-- ExpedienteDLM
-- ==========================================

-- HABILITAR RLS EN TODAS LAS TABLAS
-- ==========================================

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_user_relationships ENABLE ROW LEVEL SECURITY;

-- LIMPIAR POLÍTICAS EXISTENTES
-- ==========================================

-- Eliminar políticas existentes de profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- Eliminar políticas existentes de patients
DROP POLICY IF EXISTS "patients_insert_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_select_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_update_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_delete_policy" ON public.patients;

-- Eliminar políticas existentes de consultations
DROP POLICY IF EXISTS "consultations_insert_policy" ON public.consultations;
DROP POLICY IF EXISTS "consultations_select_policy" ON public.consultations;
DROP POLICY IF EXISTS "consultations_update_policy" ON public.consultations;
DROP POLICY IF EXISTS "consultations_delete_policy" ON public.consultations;

-- 1. POLÍTICAS PARA CLÍNICAS
-- ==========================================

-- Solo super admin puede crear/modificar clínicas
CREATE POLICY "clinics_insert_policy" ON public.clinics
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- Usuarios pueden ver su propia clínica, super admin ve todas
CREATE POLICY "clinics_select_policy" ON public.clinics
FOR SELECT TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
  id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
);

-- Solo super admin puede actualizar clínicas
CREATE POLICY "clinics_update_policy" ON public.clinics
FOR UPDATE TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- Solo super admin puede eliminar clínicas
CREATE POLICY "clinics_delete_policy" ON public.clinics
FOR DELETE TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- 2. POLÍTICAS PARA ROLES DE USUARIO
-- ==========================================

-- Todos los usuarios autenticados pueden leer roles
CREATE POLICY "user_roles_select_policy" ON public.user_roles
FOR SELECT TO authenticated
USING (true);

-- Solo super admin puede modificar roles
CREATE POLICY "user_roles_insert_policy" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

CREATE POLICY "user_roles_update_policy" ON public.user_roles
FOR UPDATE TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- 3. POLÍTICAS PARA ESPECIALIDADES MÉDICAS
-- ==========================================

-- Todos los usuarios autenticados pueden leer especialidades
CREATE POLICY "medical_specialties_select_policy" ON public.medical_specialties
FOR SELECT TO authenticated
USING (true);

-- Solo super admin puede modificar especialidades
CREATE POLICY "medical_specialties_insert_policy" ON public.medical_specialties
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

CREATE POLICY "medical_specialties_update_policy" ON public.medical_specialties
FOR UPDATE TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- 4. POLÍTICAS MEJORADAS PARA PERFILES
-- ==========================================

-- Los usuarios pueden crear su propio perfil
CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = id OR
  auth.role() = 'service_role' OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_staff'
);

-- Política de lectura basada en roles y clínicas
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated
USING (
  -- Super admin ve todo
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
  
  -- Usuario ve su propio perfil
  auth.uid() = id OR
  
  -- Personal administrativo ve usuarios de su clínica
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_staff' AND
    clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  ) OR
  
  -- Doctores ven otros usuarios de su clínica (para colaboración)
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'doctor' AND
    clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  ) OR
  
  -- Personal de salud ve doctores de su clínica
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'health_staff' AND
    clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()) AND
    role IN ('doctor', 'health_staff')
  )
);

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE TO authenticated
USING (
  auth.uid() = id OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_staff' AND
    clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  auth.uid() = id OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_staff' AND
    clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- Solo super admin y admin staff pueden eliminar perfiles
CREATE POLICY "profiles_delete_policy" ON public.profiles
FOR DELETE TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_staff' AND
    clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- 5. POLÍTICAS MEJORADAS PARA PACIENTES
-- ==========================================

-- Usuarios médicos pueden crear pacientes en su clínica
CREATE POLICY "patients_insert_policy" ON public.patients
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('doctor', 'health_staff', 'admin_staff') AND
    clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- Política de lectura de pacientes basada en roles
CREATE POLICY "patients_select_policy" ON public.patients
FOR SELECT TO authenticated
USING (
  -- Super admin ve todo
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
  
  -- Personal de la clínica ve pacientes de su clínica
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('doctor', 'health_staff', 'admin_staff') AND
    clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  ) OR
  
  -- Paciente ve solo su propio registro
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'patient' AND
    patient_user_id = auth.uid()
  )
);

-- Actualización de pacientes
CREATE POLICY "patients_update_policy" ON public.patients
FOR UPDATE TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('doctor', 'health_staff', 'admin_staff') AND
    clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('doctor', 'health_staff', 'admin_staff') AND
    clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- Solo doctores y admin pueden eliminar pacientes
CREATE POLICY "patients_delete_policy" ON public.patients
FOR DELETE TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('doctor', 'admin_staff') AND
    clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- 6. POLÍTICAS MEJORADAS PARA CONSULTAS
-- ==========================================

-- Crear consultas
CREATE POLICY "consultations_insert_policy" ON public.consultations
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('doctor', 'health_staff') AND
    EXISTS (
      SELECT 1 FROM public.patients p 
      WHERE p.id = patient_id 
      AND p.clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    )
  )
);

-- Leer consultas
CREATE POLICY "consultations_select_policy" ON public.consultations
FOR SELECT TO authenticated
USING (
  -- Super admin ve todo
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
  
  -- Doctor que creó la consulta
  doctor_id = auth.uid() OR
  
  -- Personal médico de la misma clínica del paciente
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('doctor', 'health_staff', 'admin_staff') AND
    EXISTS (
      SELECT 1 FROM public.patients p 
      WHERE p.id = patient_id 
      AND p.clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    )
  ) OR
  
  -- Paciente ve sus propias consultas
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'patient' AND
    EXISTS (
      SELECT 1 FROM public.patients p 
      WHERE p.id = patient_id 
      AND p.patient_user_id = auth.uid()
    )
  )
);

-- Actualizar consultas
CREATE POLICY "consultations_update_policy" ON public.consultations
FOR UPDATE TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
  doctor_id = auth.uid() OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('doctor', 'health_staff') AND
    EXISTS (
      SELECT 1 FROM public.patients p 
      WHERE p.id = patient_id 
      AND p.clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    )
  )
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
  doctor_id = auth.uid() OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('doctor', 'health_staff') AND
    EXISTS (
      SELECT 1 FROM public.patients p 
      WHERE p.id = patient_id 
      AND p.clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    )
  )
);

-- Eliminar consultas (solo doctores)
CREATE POLICY "consultations_delete_policy" ON public.consultations
FOR DELETE TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
  doctor_id = auth.uid()
);

-- 7. POLÍTICAS PARA RELACIONES CLÍNICA-USUARIO
-- ==========================================

-- Solo super admin y admin staff pueden crear relaciones
CREATE POLICY "clinic_relationships_insert_policy" ON public.clinic_user_relationships
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_staff' AND
    clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- Ver relaciones de la propia clínica
CREATE POLICY "clinic_relationships_select_policy" ON public.clinic_user_relationships
FOR SELECT TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
  clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()) OR
  user_id = auth.uid()
);

-- Actualizar relaciones
CREATE POLICY "clinic_relationships_update_policy" ON public.clinic_user_relationships
FOR UPDATE TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_staff' AND
    clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_staff' AND
    clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- CREAR POLÍTICAS PARA OTRAS TABLAS RELACIONADAS
-- ==========================================

-- Si existen otras tablas como prescriptions, physical_exams, etc.
-- aplicar políticas similares basadas en la clínica del paciente

-- Verificar si existe la tabla prescriptions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prescriptions') THEN
    -- Habilitar RLS
    ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
    
    -- Limpiar políticas existentes
    DROP POLICY IF EXISTS "prescriptions_insert_policy" ON public.prescriptions;
    DROP POLICY IF EXISTS "prescriptions_select_policy" ON public.prescriptions;
    DROP POLICY IF EXISTS "prescriptions_update_policy" ON public.prescriptions;
    DROP POLICY IF EXISTS "prescriptions_delete_policy" ON public.prescriptions;
    
    -- Crear nuevas políticas
    CREATE POLICY "prescriptions_insert_policy" ON public.prescriptions
    FOR INSERT TO authenticated
    WITH CHECK (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('super_admin', 'doctor')
    );
    
    CREATE POLICY "prescriptions_select_policy" ON public.prescriptions
    FOR SELECT TO authenticated
    USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
      doctor_id = auth.uid() OR
      (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('doctor', 'health_staff', 'admin_staff') AND
        EXISTS (
          SELECT 1 FROM public.patients p 
          WHERE p.id = patient_id 
          AND p.clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
        )
      ) OR
      (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'patient' AND
        EXISTS (
          SELECT 1 FROM public.patients p 
          WHERE p.id = patient_id 
          AND p.patient_user_id = auth.uid()
        )
      )
    );
    
    CREATE POLICY "prescriptions_update_policy" ON public.prescriptions
    FOR UPDATE TO authenticated
    USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
      doctor_id = auth.uid()
    )
    WITH CHECK (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
      doctor_id = auth.uid()
    );
    
    CREATE POLICY "prescriptions_delete_policy" ON public.prescriptions
    FOR DELETE TO authenticated
    USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
      doctor_id = auth.uid()
    );
  END IF;
END $$;

-- ==========================================
-- ✅ POLÍTICAS RLS COMPLETADAS
-- ==========================================
-- Este script implementa:
-- 1. Seguridad basada en roles y clínicas
-- 2. Acceso granular según tipo de usuario
-- 3. Protección de datos entre clínicas
-- 4. Permisos apropiados para cada rol
-- ==========================================