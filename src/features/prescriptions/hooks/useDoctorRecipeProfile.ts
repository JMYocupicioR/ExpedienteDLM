import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfilePhotos } from '@/hooks/shared/useProfilePhotos';
import type { PrescriptionRenderData } from '../types';

export interface DoctorRecipeProfile {
  full_name?: string;
  medical_license?: string;
  specialty?: string;
  clinic_name?: string;
  clinic_address?: string;
  clinic_phone?: string;
  clinic_email?: string;
  logo_url?: string | null;
}

/** Convierte DoctorRecipeProfile a PrescriptionRenderData (solo campos médico/clínica) */
export function toPrescriptionRenderData(profile: DoctorRecipeProfile | null): Partial<PrescriptionRenderData> {
  if (!profile) return {};
  return {
    doctorName: profile.full_name || 'Dr.',
    doctorLicense: profile.medical_license || '',
    doctorSpecialty: profile.specialty || '',
    clinicName: profile.clinic_name || 'Clínica',
    clinicAddress: profile.clinic_address || '',
    clinicPhone: profile.clinic_phone || '',
    clinicEmail: profile.clinic_email || '',
  };
}

/**
 * Resolver único de datos del médico para recetas.
 * Fuente central: profile + clinic_user_relationships + clinics + logo.
 */
export function useDoctorRecipeProfile(userId?: string | null) {
  const [profile, setProfile] = useState<DoctorRecipeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { getPrescriptionIconUrl, getClinicLogoUrl } = useProfilePhotos();

  const resolve = useCallback(async (uid?: string) => {
    const targetId = uid || userId;
    if (!targetId) {
      setProfile(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, specialty, additional_info')
        .eq('id', targetId)
        .single();

      const addInfo = (prof?.additional_info || {}) as Record<string, unknown>;
      const clinicInfo = (addInfo.clinic_info || addInfo.clinic || {}) as Record<string, string>;

      const { data: membership } = await supabase
        .from('clinic_user_relationships')
        .select('clinic_id, clinics(name, address, phone, email)')
        .eq('user_id', targetId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      const mem = membership as { clinic_id?: string; clinics?: { name?: string; address?: string; phone?: string; email?: string } } | null;
      const clinic = mem?.clinics ?? null;
      const clinicId = mem?.clinic_id;

      const result: DoctorRecipeProfile = {
        full_name: prof?.full_name || undefined,
        medical_license: (addInfo.medical_license as string) || (addInfo.cedula_profesional as string) || undefined,
        specialty: (prof?.specialty as string) || (addInfo.specialty as string) || undefined,
        clinic_name: clinic?.name || (addInfo.clinic_name as string) || clinicInfo?.name || undefined,
        clinic_address: clinic?.address || clinicInfo?.address || undefined,
        clinic_phone: clinic?.phone || clinicInfo?.phone || undefined,
        clinic_email: clinic?.email || clinicInfo?.email || undefined,
      };

      const [prescriptionLogo, clinicLogo] = await Promise.all([
        getPrescriptionIconUrl(targetId, clinicId),
        clinicId ? getClinicLogoUrl(clinicId) : Promise.resolve(null),
      ]);

      result.logo_url = prescriptionLogo || clinicLogo || null;
      setProfile(result);
      return result;
    } catch {
      setProfile(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId, getPrescriptionIconUrl, getClinicLogoUrl]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      await resolve(user?.id);
    };
    load();
  }, [resolve]);

  return {
    profile,
    loading,
    refetch: () => resolve(),
    toRenderData: () => toPrescriptionRenderData(profile),
  };
}
