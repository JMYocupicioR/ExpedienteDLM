import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useClinic } from '@/context/ClinicContext';

export interface ClinicSettings {
  id: string;
  name: string;
  type: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  license_number: string | null;
  director_name: string | null;
  director_license: string | null;
  tax_id: string | null;
  founding_date: string | null;
  emergency_phone: string | null;
  appointment_duration_minutes: number;
  theme_color: string;
  logo_url: string | null;
  working_hours: Record<string, any>;
  services: string[];
  specialties: string[];
  insurance_providers: string[];
  payment_methods: string[];
  settings: Record<string, any>;
  is_active: boolean;
}

export const useClinicSettings = () => {
  const { activeClinic } = useClinic();
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeClinic) {
      loadClinicSettings();
    }
  }, [activeClinic]);

  const loadClinicSettings = async () => {
    if (!activeClinic) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', activeClinic.id)
        .single();

      if (error) throw error;

      setSettings(data);
    } catch (err: any) {
      // Error log removed for security;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<ClinicSettings>) => {
    if (!activeClinic) return { success: false, error: 'No active clinic' };

    try {
      const { data, error } = await supabase
        .from('clinics')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeClinic.id)
        .select()
        .single();

      if (error) throw error;

      setSettings(data);
      return { success: true, data };
    } catch (err: any) {
      // Error log removed for security;
      return { success: false, error: err.message };
    }
  };

  const updateWorkingHours = async (workingHours: Record<string, any>) => {
    return updateSettings({ working_hours: workingHours });
  };

  const updateServices = async (services: string[]) => {
    return updateSettings({ services });
  };

  const updateSpecialties = async (specialties: string[]) => {
    return updateSettings({ specialties });
  };

  const updateInsuranceProviders = async (insurance_providers: string[]) => {
    return updateSettings({ insurance_providers });
  };

  const updatePaymentMethods = async (payment_methods: string[]) => {
    return updateSettings({ payment_methods });
  };

  const uploadLogo = async (file: File) => {
    if (!activeClinic) return { success: false, error: 'No active clinic' };

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${activeClinic.id}/logo.${fileExt}`;
      const filePath = `clinic-logos/${fileName}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      // Update clinic record
      const result = await updateSettings({ logo_url: publicUrl });
      return result;
    } catch (err: any) {
      // Error log removed for security;
      return { success: false, error: err.message };
    }
  };

  const checkAdminPermissions = async (userId: string) => {
    if (!activeClinic) return false;

    try {
      const { data, error } = await supabase
        .from('clinic_members')
        .select('role')
        .eq('clinic_id', activeClinic.id)
        .eq('user_id', userId)
        .single();

      if (error || !data) return false;

      return data.role === 'admin';
    } catch (err) {
      // Error log removed for security;
      return false;
    }
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    updateWorkingHours,
    updateServices,
    updateSpecialties,
    updateInsuranceProviders,
    updatePaymentMethods,
    uploadLogo,
    checkAdminPermissions,
    reload: loadClinicSettings
  };
};
