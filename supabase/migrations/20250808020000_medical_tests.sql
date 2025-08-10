-- Medical tests (Estudios) and files
-- Tables
CREATE TABLE IF NOT EXISTS public.medical_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('gabinete','laboratorio','otro')),
  test_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ordered','in_progress','completed')) DEFAULT 'ordered',
  ordered_date DATE,
  result_date DATE,
  lab_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.medical_test_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_test_id UUID NOT NULL REFERENCES public.medical_tests(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Triggers
CREATE OR REPLACE FUNCTION public.set_updated_at_medical_tests()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_medical_tests ON public.medical_tests;
CREATE TRIGGER set_updated_at_medical_tests
  BEFORE UPDATE ON public.medical_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_medical_tests();

-- RLS
ALTER TABLE public.medical_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_test_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS medical_tests_select_policy ON public.medical_tests;
DROP POLICY IF EXISTS medical_tests_modify_policy ON public.medical_tests;
DROP POLICY IF EXISTS medical_test_files_select_policy ON public.medical_test_files;
DROP POLICY IF EXISTS medical_test_files_modify_policy ON public.medical_test_files;

CREATE POLICY medical_tests_select_policy
ON public.medical_tests FOR SELECT
TO authenticated
USING (
  public.get_app_user_role() IN ('administrator','doctor','nurse')
);

CREATE POLICY medical_tests_modify_policy
ON public.medical_tests FOR ALL
TO authenticated
USING (
  (doctor_id = auth.uid()) OR public.get_app_user_role() = 'administrator'
)
WITH CHECK (
  (doctor_id = auth.uid()) OR public.get_app_user_role() = 'administrator'
);

CREATE POLICY medical_test_files_select_policy
ON public.medical_test_files FOR SELECT
TO authenticated
USING (
  public.get_app_user_role() IN ('administrator','doctor','nurse')
);

CREATE POLICY medical_test_files_modify_policy
ON public.medical_test_files FOR ALL
TO authenticated
USING (
  (uploaded_by = auth.uid()) OR public.get_app_user_role() = 'administrator'
)
WITH CHECK (
  (uploaded_by = auth.uid()) OR public.get_app_user_role() = 'administrator'
);


