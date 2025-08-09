-- ==========================================
-- CONFIGURACIÓN DE SUPABASE STORAGE
-- Para fotos de perfil e iconos de recetas
-- ==========================================

-- 1. CREAR BUCKETS DE STORAGE
-- ==========================================

-- Bucket para fotos de perfil
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  5242880, -- 5MB límite
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket para iconos de recetas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prescription-icons',
  'prescription-icons',
  true,
  2097152, -- 2MB límite (iconos más pequeños)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. POLÍTICAS RLS PARA STORAGE
-- ==========================================

-- Políticas para profile-photos bucket
-- Los usuarios pueden ver todas las fotos de perfil
CREATE POLICY "Profile photos are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

-- Los usuarios pueden subir su propia foto de perfil
CREATE POLICY "Users can upload their own profile photo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Los usuarios pueden actualizar su propia foto de perfil
CREATE POLICY "Users can update their own profile photo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Los usuarios pueden eliminar su propia foto de perfil
CREATE POLICY "Users can delete their own profile photo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Políticas para prescription-icons bucket
-- Los iconos de recetas son visibles por usuarios autenticados (para ver en recetas)
CREATE POLICY "Prescription icons are viewable by authenticated users"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'prescription-icons');

-- Solo doctores pueden subir iconos de recetas
CREATE POLICY "Doctors can upload their prescription icons"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'prescription-icons' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('doctor', 'super_admin')
  )
);

-- Solo doctores pueden actualizar sus iconos de recetas
CREATE POLICY "Doctors can update their prescription icons"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'prescription-icons' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('doctor', 'super_admin')
  )
);

-- Solo doctores pueden eliminar sus iconos de recetas
CREATE POLICY "Doctors can delete their prescription icons"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'prescription-icons' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('doctor', 'super_admin')
  )
);

-- 3. FUNCIONES AUXILIARES PARA STORAGE
-- ==========================================

-- Función para obtener URL de foto de perfil
CREATE OR REPLACE FUNCTION get_profile_photo_url(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  photo_url TEXT;
BEGIN
  SELECT 
    CASE 
      WHEN COUNT(*) > 0 THEN 
        'https://' || current_setting('app.settings.supabase_url') || '/storage/v1/object/public/profile-photos/' || user_id || '/profile.jpg'
      ELSE NULL 
    END INTO photo_url
  FROM storage.objects 
  WHERE bucket_id = 'profile-photos' 
  AND name = user_id || '/profile.jpg';
  
  RETURN photo_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener URL de icono de receta
CREATE OR REPLACE FUNCTION get_prescription_icon_url(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  icon_url TEXT;
BEGIN
  SELECT 
    CASE 
      WHEN COUNT(*) > 0 THEN 
        'https://' || current_setting('app.settings.supabase_url') || '/storage/v1/object/public/prescription-icons/' || user_id || '/icon.png'
      ELSE NULL 
    END INTO icon_url
  FROM storage.objects 
  WHERE bucket_id = 'prescription-icons' 
  AND name = user_id || '/icon.png';
  
  RETURN icon_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. AGREGAR CAMPOS DE URL A LA TABLA PROFILES
-- ==========================================

-- Agregar campos para URLs de imágenes (opcional, se pueden calcular dinámicamente)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS prescription_icon_url TEXT;

-- Trigger para actualizar URLs cuando se suben archivos
CREATE OR REPLACE FUNCTION update_profile_image_urls()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar URL de foto de perfil si el archivo corresponde
  IF NEW.bucket_id = 'profile-photos' AND NEW.name LIKE '%/profile.jpg' THEN
    UPDATE public.profiles 
    SET profile_photo_url = get_profile_photo_url((string_to_array(NEW.name, '/'))[1]::UUID)
    WHERE id = (string_to_array(NEW.name, '/'))[1]::UUID;
  END IF;
  
  -- Actualizar URL de icono de receta si el archivo corresponde
  IF NEW.bucket_id = 'prescription-icons' AND NEW.name LIKE '%/icon.png' THEN
    UPDATE public.profiles 
    SET prescription_icon_url = get_prescription_icon_url((string_to_array(NEW.name, '/'))[1]::UUID)
    WHERE id = (string_to_array(NEW.name, '/'))[1]::UUID;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para actualizar URLs automáticamente
DROP TRIGGER IF EXISTS update_profile_urls_trigger ON storage.objects;
CREATE TRIGGER update_profile_urls_trigger
  AFTER INSERT OR UPDATE ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_image_urls();

-- 5. VISTA PARA PERFILES CON IMÁGENES
-- ==========================================

-- Crear vista que incluye URLs de imágenes calculadas dinámicamente
CREATE OR REPLACE VIEW profiles_with_images AS
SELECT 
  p.*,
  get_profile_photo_url(p.id) as calculated_profile_photo_url,
  get_prescription_icon_url(p.id) as calculated_prescription_icon_url,
  s.name as specialty_name,
  s.category as specialty_category,
  c.name as clinic_name,
  c.type as clinic_type,
  c.address as clinic_address
FROM public.profiles p
LEFT JOIN public.medical_specialties s ON p.specialty_id = s.id
LEFT JOIN public.clinics c ON p.clinic_id = c.id;

-- 6. CONFIGURACIÓN DE CORS PARA STORAGE (si es necesario)
-- ==========================================

-- Nota: La configuración de CORS se debe hacer desde el panel de Supabase
-- o usando la API de management. Aquí documentamos la configuración recomendada:

/*
CORS Configuration para Storage:
{
  "allowedOrigins": ["http://localhost:3000", "http://localhost:5173", "https://tu-dominio.com"],
  "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
  "allowedHeaders": ["Authorization", "Content-Type", "x-client-info", "apikey"],
  "maxAge": 3600
}
*/

-- 7. ÍNDICES PARA MEJORAR PERFORMANCE
-- ==========================================

-- Índice para búsquedas por bucket_id en storage.objects
CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_id ON storage.objects(bucket_id);

-- Índice para búsquedas por name pattern en storage.objects
CREATE INDEX IF NOT EXISTS idx_storage_objects_name_pattern ON storage.objects(name text_pattern_ops);

-- ==========================================
-- ✅ CONFIGURACIÓN DE STORAGE COMPLETADA
-- ==========================================
-- Después de ejecutar este SQL:
-- 1. Los buckets de storage estarán creados
-- 2. Las políticas RLS estarán configuradas
-- 3. Los usuarios podrán subir fotos de perfil
-- 4. Los doctores podrán subir iconos de recetas
-- 5. Las URLs se calcularán automáticamente
-- ==========================================