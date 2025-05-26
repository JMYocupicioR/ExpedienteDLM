import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    // Cleanup preview URL when component unmounts
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setError('Por favor selecciona una imagen válida (JPG, PNG, GIF, WebP, o SVG)');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen no debe exceder 2MB');
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Create preview
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
  };

  const handleLogoUpload = async () => {
    try {
      if (!selectedFile) return;

      setLoading(true);
      setError(null);

      const user = supabase.auth.getUser();
      if (!user) {
        throw new Error('No hay sesión activa');
      }

      const userId = (await user).data.user?.id;
      if (!userId) {
        throw new Error('No se pudo obtener el ID del usuario');
      }

      // Create unique filename with user ID prefix
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      // Update user profile with logo URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          prescription_style: {
            logo_url: publicUrl
          }
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      onClose();
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Configuración de Recetas</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg flex items-center text-sm">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Logo para Recetas
              </label>
              
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-lg hover:border-gray-500 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-400">
                    <label className="relative cursor-pointer rounded-md font-medium text-blue-500 hover:text-blue-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>Subir un archivo</span>
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={loading}
                      />
                    </label>
                    <p className="pl-1">o arrastra y suelta</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF hasta 2MB
                  </p>
                </div>
              </div>

              {previewUrl && (
                <div className="mt-4">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-32 rounded border border-gray-600"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-900 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleLogoUpload}
            disabled={!selectedFile || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}