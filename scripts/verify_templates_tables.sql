-- Script de verificación para el sistema de templates
-- Ejecuta esto en el SQL Editor de Supabase después de aplicar la migración

-- 1. Verificar que las tablas existen
SELECT 
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = t.table_name
    ) THEN '✅ Existe'
    ELSE '❌ No existe'
  END as status
FROM (
  VALUES 
    ('template_categories'),
    ('medical_templates'),
    ('template_favorites'),
    ('template_usage')
) AS t(table_name);

-- 2. Verificar categorías predefinidas
SELECT 
  '✅ Categorías seed' as check_type,
  COUNT(*) as count,
  STRING_AGG(name, ', ') as categories
FROM public.template_categories
WHERE is_predefined = true;

-- 3. Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  '✅ Activo' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('template_categories', 'medical_templates', 'template_favorites', 'template_usage')
ORDER BY tablename, policyname;

-- 4. Verificar índices
SELECT 
  tablename,
  indexname,
  '✅ Creado' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('template_categories', 'medical_templates', 'template_favorites', 'template_usage')
ORDER BY tablename, indexname;

-- 5. Test de inserción (opcional - descomentar para probar)
/*
INSERT INTO public.medical_templates (
  user_id,
  name,
  description,
  type,
  content
) VALUES (
  auth.uid(),
  'Test Template',
  'Template de prueba',
  'interrogatorio',
  '{"sections": [{"id": "test", "title": "Test Section"}]}'::jsonb
) RETURNING id, name, '✅ Insert exitoso' as status;
*/
