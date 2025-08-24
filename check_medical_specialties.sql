-- =====================================================
-- VERIFICAR ESPECIALIDADES MÉDICAS
-- Script para revisar el estado de la tabla medical_specialties
-- =====================================================

-- Ver cuántas especialidades hay
SELECT COUNT(*) as total_especialidades FROM public.medical_specialties;

-- Ver todas las especialidades ordenadas
SELECT 
    id,
    name,
    category,
    is_active,
    created_at
FROM public.medical_specialties 
ORDER BY name ASC;

-- Ver especialidades por categoría
SELECT 
    category,
    COUNT(*) as cantidad
FROM public.medical_specialties 
WHERE is_active = true
GROUP BY category
ORDER BY categoria;