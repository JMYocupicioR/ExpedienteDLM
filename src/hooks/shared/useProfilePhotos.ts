import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/hooks/useAuth';

interface PhotoUploadResult {
  url: string | null;
  error: string | null;
}

export const useProfilePhotos = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función para subir foto de perfil
  const uploadProfilePhoto = useCallback(async (file: File): Promise<PhotoUploadResult> => {
    if (!user) {
      return { url: null, error: 'Usuario no autenticado' };
    }

    try {
      setUploading(true);
      setError(null);

      // Validar tamaño del archivo (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('La imagen debe ser menor a 5MB');
      }

      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Formato de imagen no válido. Use JPG, PNG, WebP o GIF');
      }

      // Crear nombre del archivo
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `profile.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Subir archivo a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Save URL in additional_info JSONB (profile_photo_url column doesn't exist on profiles)
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('additional_info')
        .eq('id', user.id)
        .single();

      const additionalInfo = (currentProfile?.additional_info as Record<string, unknown>) || {};
      await supabase
        .from('profiles')
        .update({
          additional_info: { ...additionalInfo, photo_url: publicUrl },
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      return { url: publicUrl, error: null };

    } catch (err: any) {
      const errorMessage = err.message || 'Error al subir la imagen';
      setError(errorMessage);
      return { url: null, error: errorMessage };
    } finally {
      setUploading(false);
    }
  }, [user]);

  // Subir logo de la clínica (bucket: clinic-assets)
  const uploadClinicLogo = useCallback(async (clinicId: string, file: File): Promise<PhotoUploadResult> => {
    if (!user) {
      return { url: null, error: 'Usuario no autenticado' };
    }

    if (!clinicId) {
      return { url: null, error: 'Perfil sin clínica asociada' };
    }

    try {
      setUploading(true);
      setError(null);

      // Validar tamaño/tipo
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('El logo debe ser menor a 5MB');
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Formato no válido. Use JPG, PNG, WebP o SVG');
      }

      // Verificar permisos: admin de clínica o super_admin
      const [{ data: rel }, { data: prof }] = await Promise.all([
        supabase
          .from('clinic_user_relationships')
          .select('role_in_clinic, is_active')
          .eq('user_id', user.id)
          .eq('clinic_id', clinicId)
          .eq('is_active', true)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single(),
      ]);

      const canUploadLogo =
        ['owner', 'director', 'admin_staff', 'doctor'].includes(rel?.role_in_clinic ?? '') || prof?.role === 'super_admin';
      if (!canUploadLogo) {
        throw new Error('No tienes permisos para actualizar el logo de la clínica');
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const filePath = `${clinicId}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('clinic-assets')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('clinic-assets')
        .getPublicUrl(filePath);

      const logoPublicUrl = publicUrlData.publicUrl;

      // Sync logo_url to both clinics table and clinic_configurations
      await Promise.allSettled([
        supabase
          .from('clinics')
          .update({ logo_url: logoPublicUrl, updated_at: new Date().toISOString() })
          .eq('id', clinicId),
        supabase
          .from('clinic_configurations')
          .update({ logo_url: logoPublicUrl })
          .eq('clinic_id', clinicId),
      ]);

      return { url: logoPublicUrl, error: null };
    } catch (err: any) {
      const errorMessage = err.message || 'Error al subir el logo';
      setError(errorMessage);
      return { url: null, error: errorMessage };
    } finally {
      setUploading(false);
    }
  }, [user]);

  // Función para subir icono de receta
  const uploadPrescriptionIcon = useCallback(async (file: File): Promise<PhotoUploadResult> => {
    if (!user) {
      return { url: null, error: 'Usuario no autenticado' };
    }

    try {
      setUploading(true);
      setError(null);

      // Validar que el usuario sea doctor
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['doctor', 'super_admin'].includes(profile.role)) {
        throw new Error('Solo los doctores pueden subir iconos de recetas');
      }

      // Validar tamaño del archivo (2MB máximo para iconos)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('El icono debe ser menor a 2MB');
      }

      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Formato de icono no válido. Use JPG, PNG, WebP o SVG');
      }

      // Crear nombre del archivo
      const fileExt = file.type === 'image/svg+xml' ? 'svg' : file.name.split('.').pop()?.toLowerCase();
      const fileName = `icon.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Subir archivo a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('prescription-icons')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('prescription-icons')
        .getPublicUrl(filePath);

      const iconUrl = urlData.publicUrl;

      // Save URL in additional_info JSONB (prescription_icon_url column doesn't exist on profiles)
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('additional_info')
        .eq('id', user.id)
        .single();

      const additionalInfo = (currentProfile?.additional_info as Record<string, unknown>) || {};
      await supabase
        .from('profiles')
        .update({
          additional_info: { ...additionalInfo, prescription_icon_url: iconUrl },
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      return { url: iconUrl, error: null };

    } catch (err: any) {
      const errorMessage = err.message || 'Error al subir el icono';
      setError(errorMessage);
      return { url: null, error: errorMessage };
    } finally {
      setUploading(false);
    }
  }, [user]);

  // Función para obtener URL de foto de perfil
  // Usa storage.list() para evitar HEAD 400 en archivos inexistentes (como getPrescriptionIconUrl)
  const getProfilePhotoUrl = useCallback(async (userId?: string): Promise<string | null> => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return null;

    try {
      const { data: files, error: listError } = await supabase.storage
        .from('profile-photos')
        .list(targetUserId);

      if (listError || !files?.length) return null;

      const profileFile = files.find((f) =>
        /^profile\.(jpg|jpeg|png|webp)$/i.test(f.name)
      );
      if (!profileFile) return null;

      const { data } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(`${targetUserId}/${profileFile.name}`);
      return data.publicUrl;
    } catch (err) {
      return null;
    }
  }, [user]);

  // Función para obtener URL de icono de receta
  const getPrescriptionIconUrl = useCallback(async (userId?: string): Promise<string | null> => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return null;

    try {
      // Verificar si el bucket existe primero
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError || !buckets?.some(bucket => bucket.name === 'prescription-icons')) {
        // Si el bucket no existe, no intentar verificar archivos
        return null;
      }

      // Intentar diferentes extensiones
      const extensions = ['png', 'jpg', 'jpeg', 'webp', 'svg'];

      for (const ext of extensions) {
        const filePath = `${targetUserId}/icon.${ext}`;

        try {
          // Verificar si el archivo existe en el bucket
          const { data: fileExists, error: fileError } = await supabase.storage
            .from('prescription-icons')
            .list(targetUserId);

          if (!fileError && fileExists?.some(file => file.name === `icon.${ext}`)) {
            const { data } = supabase.storage
              .from('prescription-icons')
              .getPublicUrl(filePath);
            return data.publicUrl;
          }
        } catch {
          continue;
        }
      }

      return null;
    } catch (err) {
      // Error log removed for security;
      return null;
    }
  }, [user]);

  // Función para eliminar foto de perfil
  const deleteProfilePhoto = useCallback(async (): Promise<{ success: boolean; error: string | null }> => {
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    try {
      setError(null);

      // Listar todos los archivos del usuario en el bucket
      const { data: files, error: listError } = await supabase.storage
        .from('profile-photos')
        .list(user.id);

      if (listError) throw listError;

      if (files && files.length > 0) {
        // Eliminar todos los archivos de perfil del usuario
        const filesToDelete = files.map(file => `${user.id}/${file.name}`);
        
        const { error: deleteError } = await supabase.storage
          .from('profile-photos')
          .remove(filesToDelete);

        if (deleteError) throw deleteError;

        // Remove URL from additional_info JSONB
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('additional_info')
          .eq('id', user.id)
          .single();

        const additionalInfo = (currentProfile?.additional_info as Record<string, unknown>) || {};
        const { photo_url: _removed, ...restInfo } = additionalInfo;
        await supabase
          .from('profiles')
          .update({
            additional_info: restInfo,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      }

      return { success: true, error: null };

    } catch (err: any) {
      const errorMessage = err.message || 'Error al eliminar la imagen';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [user]);

  // Función para eliminar icono de receta
  const deletePrescriptionIcon = useCallback(async (): Promise<{ success: boolean; error: string | null }> => {
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    try {
      setError(null);

      // Listar todos los archivos del usuario en el bucket
      const { data: files, error: listError } = await supabase.storage
        .from('prescription-icons')
        .list(user.id);

      if (listError) throw listError;

      if (files && files.length > 0) {
        // Eliminar todos los archivos de icono del usuario
        const filesToDelete = files.map(file => `${user.id}/${file.name}`);
        
        const { error: deleteError } = await supabase.storage
          .from('prescription-icons')
          .remove(filesToDelete);

        if (deleteError) throw deleteError;

        // Remove URL from additional_info JSONB
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('additional_info')
          .eq('id', user.id)
          .single();

        const additionalInfo = (currentProfile?.additional_info as Record<string, unknown>) || {};
        const { prescription_icon_url: _removed, ...restInfo } = additionalInfo;
        await supabase
          .from('profiles')
          .update({
            additional_info: restInfo,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      }

      return { success: true, error: null };

    } catch (err: any) {
      const errorMessage = err.message || 'Error al eliminar el icono';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [user]);

  // Resolve clinic logo URL: clinics.logo_url → clinic_configurations.logo_url → storage lookup
  const getClinicLogoUrl = useCallback(async (clinicId?: string): Promise<string | null> => {
    if (!clinicId) return null;
    try {
      // 1. Try clinics table first (fastest)
      const { data: clinic } = await supabase
        .from('clinics')
        .select('logo_url')
        .eq('id', clinicId)
        .single();
      if (clinic?.logo_url) return clinic.logo_url as string;

      // 2. Try clinic_configurations table
      const { data: cfg } = await supabase
        .from('clinic_configurations')
        .select('logo_url')
        .eq('clinic_id', clinicId)
        .maybeSingle();
      if (cfg?.logo_url) return cfg.logo_url as string;

      // 3. Fallback: check storage bucket directly
      const { data: files } = await supabase.storage
        .from('clinic-assets')
        .list(clinicId);
      if (files?.length) {
        const logoFile = files.find((f) => /^logo\.(jpg|jpeg|png|webp|svg)$/i.test(f.name));
        if (logoFile) {
          const { data } = supabase.storage
            .from('clinic-assets')
            .getPublicUrl(`${clinicId}/${logoFile.name}`);
          return data.publicUrl;
        }
      }

      return null;
    } catch {
      return null;
    }
  }, []);

  // Función para redimensionar imagen antes de subir
  const resizeImage = useCallback(async (file: File, maxWidth: number, maxHeight: number, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo aspect ratio
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Dibujar imagen redimensionada
        ctx?.drawImage(img, 0, 0, width, height);

        // Convertir a blob y luego a file
        canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(resizedFile);
          } else {
            resolve(file); // Si falla, retornar archivo original
          }
        }, file.type, quality);
      };

      img.onerror = () => resolve(file); // Si falla, retornar archivo original
      img.src = URL.createObjectURL(file);
    });
  }, []);

  return {
    uploading,
    error,
    uploadProfilePhoto,
    uploadPrescriptionIcon,
    uploadClinicLogo,
    getProfilePhotoUrl,
    getPrescriptionIconUrl,
    getClinicLogoUrl,
    deleteProfilePhoto,
    deletePrescriptionIcon,
    resizeImage,
    clearError: () => setError(null)
  };
};
