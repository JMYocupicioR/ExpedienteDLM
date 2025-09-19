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

      // Actualizar el perfil con la nueva URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          profile_photo_url: urlData.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        // Warning log removed for security;
      }

      return { url: urlData.publicUrl, error: null };

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

      const isClinicAdmin = rel?.role_in_clinic === 'admin_staff' || prof?.role === 'super_admin';
      if (!isClinicAdmin) {
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

      return { url: publicUrlData.publicUrl, error: null };
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

      // Actualizar el perfil con la nueva URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          prescription_icon_url: urlData.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        // Warning log removed for security;
      }

      return { url: urlData.publicUrl, error: null };

    } catch (err: any) {
      const errorMessage = err.message || 'Error al subir el icono';
      setError(errorMessage);
      return { url: null, error: errorMessage };
    } finally {
      setUploading(false);
    }
  }, [user]);

  // Función para obtener URL de foto de perfil
  const getProfilePhotoUrl = useCallback(async (userId?: string): Promise<string | null> => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return null;

    try {
      // Intentar diferentes extensiones
      const extensions = ['jpg', 'jpeg', 'png', 'webp'];
      
      for (const ext of extensions) {
        const filePath = `${targetUserId}/profile.${ext}`;
        const { data } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(filePath);

        // Verificar si la imagen existe haciendo una petición HEAD
        try {
          const response = await fetch(data.publicUrl, { method: 'HEAD' });
          if (response.ok) {
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

        // Actualizar el perfil removiendo la URL
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            profile_photo_url: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          // Warning log removed for security;
        }
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

        // Actualizar el perfil removiendo la URL
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            prescription_icon_url: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          // Warning log removed for security;
        }
      }

      return { success: true, error: null };

    } catch (err: any) {
      const errorMessage = err.message || 'Error al eliminar el icono';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [user]);

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
    deleteProfilePhoto,
    deletePrescriptionIcon,
    resizeImage,
    clearError: () => setError(null)
  };
};
