import React, { useState, useEffect } from 'react';
import {
  Building,
  X,
  Save,
  Upload,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Globe,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useProfilePhotos } from '@/hooks/shared/useProfilePhotos';

interface Clinic {
  id: string;
  name: string;
  type: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  tax_id?: string;
  director_name?: string;
  director_license?: string;
  logo_url?: string;
}

interface PersonalClinicModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinic: Clinic;
  onUpdate: (updatedClinic: Clinic) => void;
}

export function PersonalClinicModal({
  isOpen,
  onClose,
  clinic,
  onUpdate,
}: PersonalClinicModalProps) {
  const { uploadClinicLogo } = useProfilePhotos();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(clinic.logo_url || null);

  const [formData, setFormData] = useState({
    name: clinic.name || '',
    address: clinic.address || '',
    phone: clinic.phone || '',
    email: clinic.email || '',
    website: clinic.website || '',
    tax_id: clinic.tax_id || '',
    director_name: clinic.director_name || '',
    director_license: clinic.director_license || '',
  });

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        name: clinic.name || '',
        address: clinic.address || '',
        phone: clinic.phone || '',
        email: clinic.email || '',
        website: clinic.website || '',
        tax_id: clinic.tax_id || '',
        director_name: clinic.director_name || '',
        director_license: clinic.director_license || '',
      });
      setLogoPreview(clinic.logo_url || null);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, clinic]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let logoUrl = clinic.logo_url;

      // Upload logo if changed
      if (logoFile) {
        const result = await uploadClinicLogo(clinic.id, logoFile);
        if (result.error) {
          throw new Error(result.error);
        }
        logoUrl = result.url;
      }

      // Update clinic data
      const { data, error: updateError } = await supabase
        .from('clinics')
        .update({
          name: formData.name.trim(),
          address: formData.address.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          website: formData.website.trim(),
          tax_id: formData.tax_id.trim(),
          director_name: formData.director_name.trim(),
          director_license: formData.director_license.trim(),
          logo_url: logoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clinic.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setSuccess('Configuración actualizada correctamente');
      onUpdate(data);
      
      // Close modal after 1.5 seconds
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error updating clinic:', err);
      setError(err.message || 'Error al actualizar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
          <div className="flex items-center">
            <Building className="h-6 w-6 text-cyan-400 mr-3" />
            <div>
              <h2 className="text-xl font-bold text-white">Configuración de Consultorio</h2>
              <p className="text-sm text-gray-400 mt-1">
                Configura la información completa de tu consultorio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Alerts */}
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-900/50 border border-green-700 text-green-300 p-4 rounded-lg flex items-center">
              <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Logo del Consultorio
            </label>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-600">
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <label className="flex-1 cursor-pointer">
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-cyan-400 transition-colors">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-300">
                    Haz clic para subir logo
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    JPG, PNG o WebP (máx. 2MB)
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre del Consultorio *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="Consultorio del Dr. Juan Pérez"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <MapPin className="h-4 w-4 inline mr-1" />
                Dirección
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="Av. Principal #123, Col. Centro"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Phone className="h-4 w-4 inline mr-1" />
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="+52 999 123 4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Mail className="h-4 w-4 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="contacto@consultorio.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Globe className="h-4 w-4 inline mr-1" />
                Sitio Web
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="https://www.consultorio.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                RFC / Tax ID
              </label>
              <input
                type="text"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="ABCD123456XYZ"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre del Director
              </label>
              <input
                type="text"
                value={formData.director_name}
                onChange={(e) =>
                  setFormData({ ...formData, director_name: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="Dr. Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cédula Profesional
              </label>
              <input
                type="text"
                value={formData.director_license}
                onChange={(e) =>
                  setFormData({ ...formData, director_license: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="1234567"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name.trim()}
              className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
