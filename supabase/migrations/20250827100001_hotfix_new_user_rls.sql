-- =====================================================
-- HOTFIX: Ajuste de Políticas RLS para Nuevos Usuarios
-- Fecha: 2025-08-27
-- Descripción: Este script ajusta las políticas de RLS para
-- solucionar un problema de "huevo y gallina" donde los
-- nuevos usuarios no podían realizar acciones iniciales
-- (como crear su primer paciente o clínica) porque aún
-- no estaban asociados a una clínica.
-- =====================================================

-- =====================================================
-- PASO 1: Ajustar Políticas en la Tabla 'patients'
-- =====================================================

-- Descripción: La política de INSERT anterior (`patients_insert_own_clinic`)
-- fallaba para nuevos usuarios porque `get_user_clinic_id()` devolvía NULL.
-- Esta nueva política permite la inserción si el usuario está creando
-- un paciente para la clínica que está a punto de seleccionar o a la que pertenece.

-- Primero, eliminamos la política anterior para evitar conflictos.
DROP POLICY IF EXISTS "patients_insert_own_clinic" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_policy" ON public.patients;


-- Creamos la nueva política de INSERT más flexible.
CREATE POLICY "patients_insert_policy" ON public.patients
FOR INSERT
WITH CHECK (
    -- Opción 1: El usuario ya pertenece a la clínica del paciente.
    is_user_in_clinic(clinic_id)
    OR
    -- Opción 2: El usuario es el médico primario y está creando un paciente
    -- en la clínica que está seleccionando para sí mismo.
    -- Esto es crucial para el flujo de nuevos doctores.
    (primary_doctor_id = auth.uid() AND clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()))
);


-- =====================================================
-- PASO 2: Asegurar el Acceso al Propio Perfil
-- =====================================================

-- Descripción: Es vital que los usuarios siempre puedan leer su propio
-- perfil para que la aplicación cargue sus datos correctamente.

-- Habilitar RLS en la tabla 'profiles' si aún no está habilitado.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas para evitar duplicados.
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Política SELECT: Permitir a los usuarios leer su propio perfil.
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT
USING (
    id = auth.uid()
);

-- Política UPDATE: Permitir a los usuarios actualizar su propio perfil.
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE
USING (
    id = auth.uid()
)
WITH CHECK (
    id = auth.uid()
);


-- =====================================================
-- PASO 3: Asegurar la Visibilidad de las Clínicas
-- =====================================================

-- Descripción: Los nuevos usuarios necesitan ver la lista de clínicas
-- para poder registrarse o solicitar unirse a una. La política
-- `clinics_select_authenticated` ya lo permite, pero nos aseguramos
-- de que RLS esté activado y la política exista.

-- Habilitar RLS en la tabla 'clinics'
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- Eliminar política anterior si existe, para recrearla de forma segura.
DROP POLICY IF EXISTS "clinics_select_authenticated" ON public.clinics;

-- Política SELECT: Todos los usuarios autenticados pueden ver la lista de clínicas.
CREATE POLICY "clinics_select_authenticated" ON public.clinics
FOR SELECT
USING (
    auth.role() = 'authenticated'
);

-- =====================================================
-- FIN DEL HOTFIX
-- =====================================================
