-- =====================================================
-- RLS_FIX_FINAL.sql
-- Corrección segura para errores 500 por políticas RLS
-- Objetivo: eliminar cualquier recursión y simplificar
-- =====================================================

-- 1) Deshabilitar RLS temporalmente (si existen)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clinics') THEN
    EXECUTE 'ALTER TABLE public.clinics DISABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clinic_members') THEN
    EXECUTE 'ALTER TABLE public.clinic_members DISABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clinic_user_relationships') THEN
    EXECUTE 'ALTER TABLE public.clinic_user_relationships DISABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- 2) Borrar TODAS las políticas existentes en las tablas objetivo
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname, c.relname AS tbl
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname='public'
    WHERE c.relname IN ('clinics','clinic_members','clinic_user_relationships')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.polname, pol.tbl);
  END LOOP;
END $$;

-- 3) Rehabilitar RLS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clinics') THEN
    EXECUTE 'ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clinic_members') THEN
    EXECUTE 'ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clinic_user_relationships') THEN
    EXECUTE 'ALTER TABLE public.clinic_user_relationships ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- 4) Políticas simples y no recursivas

-- clinics
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clinics') THEN
    CREATE POLICY clinic_select_simple ON public.clinics
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.clinic_members m
          WHERE m.clinic_id = clinics.id AND m.user_id = auth.uid()
        )
      );

    CREATE POLICY clinic_insert_any_auth ON public.clinics
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

    CREATE POLICY clinic_update_admin ON public.clinics
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.clinic_members m
          WHERE m.clinic_id = clinics.id AND m.user_id = auth.uid() AND m.role = 'admin'
        )
      );
  END IF;
END $$;

-- clinic_members
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clinic_members') THEN
    CREATE POLICY cm_select_self_or_admin ON public.clinic_members
      FOR SELECT USING (
        user_id = auth.uid() OR clinic_id IN (
          SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid() AND role = 'admin'
        )
      );

    CREATE POLICY cm_insert_self ON public.clinic_members
      FOR INSERT WITH CHECK (user_id = auth.uid());

    CREATE POLICY cm_delete_self_or_admin ON public.clinic_members
      FOR DELETE USING (
        user_id = auth.uid() OR clinic_id IN (
          SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- clinic_user_relationships (si aún existe la tabla antigua)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clinic_user_relationships') THEN
    CREATE POLICY cur_select_self ON public.clinic_user_relationships
      FOR SELECT USING (user_id = auth.uid());

    CREATE POLICY cur_insert_self ON public.clinic_user_relationships
      FOR INSERT WITH CHECK (user_id = auth.uid());

    CREATE POLICY cur_delete_self ON public.clinic_user_relationships
      FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- 5) Aviso final
DO $$
BEGIN
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'RLS_FIX_FINAL aplicado: políticas simples activas';
  RAISE NOTICE 'Si aún ves error 500, limpia el cache del navegador';
  RAISE NOTICE 'y reinicia el servidor de desarrollo (npm run dev).';
  RAISE NOTICE '===============================================';
END $$;


