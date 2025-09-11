import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface SimpleClinic {
  id: string;
  name: string;
  type: string;
}

interface SimpleClinicHook {
  activeClinic: SimpleClinic | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook simplificado para obtener la clínica activa del usuario
 * Sin dependencias complejas del ClinicContext
 */
export function useSimpleClinic(): SimpleClinicHook {
  const [activeClinic, setActiveClinic] = useState<SimpleClinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserClinic();
  }, []);

  const loadUserClinic = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener usuario actual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError('Usuario no autenticado');
        return;
      }

      console.log('🔍 Loading clinic for user:', user.id);

      // Obtener relación usuario-clínica aprobada
      const { data: relationship, error: relError } = await supabase
        .from('clinic_user_relationships')
        .select('clinic_id, role_in_clinic, status, is_active')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (relError) {
        console.error('❌ Error loading relationship:', relError);
        setError(`Error loading clinic relationship: ${relError.message}`);
        return;
      }

      if (!relationship) {
        console.log('⚠️ No approved clinic relationships found');
        setActiveClinic(null);
        return;
      }

      console.log('✅ Found relationship:', relationship);

      // Obtener datos de la clínica
      const { data: clinic, error: clinicError } = await supabase
        .from('clinics')
        .select('id, name, type')
        .eq('id', relationship.clinic_id)
        .single();

      if (clinicError) {
        console.error('❌ Error loading clinic:', clinicError);
        setError(`Error loading clinic: ${clinicError.message}`);
        return;
      }

      console.log('✅ Clinic loaded:', clinic.name);
      setActiveClinic(clinic);

    } catch (err: any) {
      console.error('❌ Unexpected error:', err);
      setError(err.message || 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return {
    activeClinic,
    loading,
    error
  };
}
