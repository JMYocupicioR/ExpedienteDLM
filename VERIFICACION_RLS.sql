-- =====================================================
-- VERIFICACIÓN COMPLETA DE RLS (Row Level Security)
-- ExpedienteDLM
-- =====================================================

-- =====================================================
-- 1. VERIFICAR QUÉ TABLAS TIENEN RLS HABILITADO
-- =====================================================
SELECT
    schemaname,
    tablename,
    CASE
        WHEN rowsecurity THEN '✅ RLS HABILITADO'
        ELSE '❌ RLS DESHABILITADO'
    END as estado_rls
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = t.schemaname
WHERE schemaname = 'public'
AND tablename NOT LIKE 'pg_%'
AND tablename NOT LIKE 'sql_%'
ORDER BY
    CASE WHEN rowsecurity THEN 0 ELSE 1 END,
    tablename;

-- =====================================================
-- 2. VERIFICAR POLÍTICAS RLS POR TABLA
-- =====================================================
SELECT
    schemaname,
    tablename,
    policyname,
    cmd AS operacion,
    CASE
        WHEN qual IS NOT NULL THEN 'USING: ' || pg_get_expr(qual, c.oid)
        ELSE 'Sin USING'
    END as clausula_using,
    CASE
        WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || pg_get_expr(with_check, c.oid)
        ELSE 'Sin WITH CHECK'
    END as clausula_with_check
FROM pg_policies p
JOIN pg_class c ON c.relname = p.tablename
JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = p.schemaname
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- 3. CONTAR POLÍTICAS POR TABLA
-- =====================================================
SELECT
    tablename,
    COUNT(*) as num_politicas,
    STRING_AGG(DISTINCT cmd::text, ', ') as operaciones_cubiertas
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- =====================================================
-- 4. TABLAS SIN POLÍTICAS RLS (POSIBLE PROBLEMA)
-- =====================================================
SELECT DISTINCT
    t.tablename,
    '⚠️ Tabla con RLS habilitado pero sin políticas' as advertencia
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = t.schemaname
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
AND c.relrowsecurity = true
AND p.policyname IS NULL
AND t.tablename NOT LIKE 'pg_%'
AND t.tablename NOT LIKE 'sql_%';

-- =====================================================
-- 5. VERIFICAR FUNCIONES RLS
-- =====================================================
SELECT
    n.nspname as esquema,
    p.proname as nombre_funcion,
    pg_get_function_arguments(p.oid) as argumentos,
    CASE p.provolatile
        WHEN 'i' THEN 'IMMUTABLE'
        WHEN 's' THEN 'STABLE'
        WHEN 'v' THEN 'VOLATILE'
    END as volatilidad,
    CASE p.prosecdef
        WHEN true THEN '✅ SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as seguridad
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'is_user_in_clinic',
    'get_user_clinic_id',
    'check_patient_exists_by_social_security',
    'check_patient_exists_by_curp'
)
ORDER BY p.proname;

-- =====================================================
-- 6. VERIFICAR TABLAS CRÍTICAS Y SUS POLÍTICAS
-- =====================================================
WITH tablas_criticas AS (
    SELECT unnest(ARRAY[
        'profiles',
        'clinics',
        'clinic_user_relationships',
        'patients',
        'consultations',
        'prescriptions',
        'medical_records',
        'clinic_configurations',
        'user_clinic_preferences',
        'activity_logs',
        'audit_logs'
    ]) as tabla
)
SELECT
    tc.tabla,
    CASE
        WHEN c.relrowsecurity THEN '✅'
        WHEN pt.tablename IS NULL THEN '⚠️ No existe'
        ELSE '❌'
    END as rls_habilitado,
    COALESCE(COUNT(DISTINCT p.policyname), 0) as num_politicas,
    COALESCE(STRING_AGG(DISTINCT p.cmd::text, ', '), 'Sin políticas') as operaciones
FROM tablas_criticas tc
LEFT JOIN pg_tables pt ON pt.tablename = tc.tabla AND pt.schemaname = 'public'
LEFT JOIN pg_class c ON c.relname = tc.tabla
LEFT JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = 'public'
LEFT JOIN pg_policies p ON p.tablename = tc.tabla AND p.schemaname = 'public'
GROUP BY tc.tabla, c.relrowsecurity, pt.tablename
ORDER BY
    CASE WHEN pt.tablename IS NULL THEN 2
         WHEN c.relrowsecurity THEN 0
         ELSE 1
    END,
    tc.tabla;

-- =====================================================
-- 7. RESUMEN GENERAL
-- =====================================================
SELECT
    'Total de tablas públicas' as metrica,
    COUNT(*)::text as valor
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT LIKE 'pg_%'
AND tablename NOT LIKE 'sql_%'

UNION ALL

SELECT
    'Tablas con RLS habilitado',
    COUNT(*)::text
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = t.schemaname
WHERE schemaname = 'public'
AND c.relrowsecurity = true
AND tablename NOT LIKE 'pg_%'

UNION ALL

SELECT
    'Tablas sin RLS',
    COUNT(*)::text
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = t.schemaname
WHERE schemaname = 'public'
AND c.relrowsecurity = false
AND tablename NOT LIKE 'pg_%'

UNION ALL

SELECT
    'Total de políticas RLS',
    COUNT(*)::text
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT
    'Funciones RLS definidas',
    COUNT(*)::text
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname LIKE '%clinic%' OR p.proname LIKE '%user%';
