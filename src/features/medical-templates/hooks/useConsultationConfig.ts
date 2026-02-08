import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useSimpleClinic } from '@/hooks/useSimpleClinic';

export interface ConsultationConfig {
  id?: string;
  user_id: string;
  clinic_id?: string;
  general_config: {
    start_mode: 'classic' | 'guided' | 'last_visit';
    hide_physical_exam: boolean;
    unify_hpi: boolean;
  };
  hpi_config: {
    enable_voice: boolean;
    enable_autocomplete: boolean;
    show_chronology: boolean;
  };
  alerts_config: {
    alert_missing_prescription: boolean;
    alert_missing_diagnosis: boolean;
    alert_allergies: boolean;
    alert_vital_signs: boolean;
  };
  prescription_config: {
    add_brand_name: boolean;
    natural_language_instructions: boolean;
    include_diagnosis: boolean;
    include_next_appointment: boolean;
    default_digital_signature: boolean;
  };
  automation_config: {
    auto_send_prescription: boolean;
    generate_summary: boolean;
  };
}

const DEFAULT_CONFIG: ConsultationConfig = {
  user_id: '',
  general_config: {
    start_mode: 'classic',
    hide_physical_exam: false,
    unify_hpi: false
  },
  hpi_config: {
    enable_voice: false,
    enable_autocomplete: true,
    show_chronology: true
  },
  alerts_config: {
    alert_missing_prescription: true,
    alert_missing_diagnosis: true,
    alert_allergies: true,
    alert_vital_signs: false
  },
  prescription_config: {
    add_brand_name: false,
    natural_language_instructions: true,
    include_diagnosis: false,
    include_next_appointment: true,
    default_digital_signature: true
  },
  automation_config: {
    auto_send_prescription: false,
    generate_summary: false
  }
};

export function useConsultationConfig() {
  const { user } = useAuth();
  const { activeClinic } = useSimpleClinic();
  const [config, setConfig] = useState<ConsultationConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchConfig();
    }
  }, [user, activeClinic]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('consultation_configurations')
        .select('*')
        .eq('user_id', user!.id);

      if (activeClinic?.id) {
        query = query.eq('clinic_id', activeClinic.id);
      } else {
        query = query.is('clinic_id', null);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig(data as unknown as ConsultationConfig);
      } else {
        // Use defaults but set user/clinic ids
        setConfig({
          ...DEFAULT_CONFIG,
          user_id: user!.id,
          clinic_id: activeClinic?.id
        });
      }
    } catch (err: any) {
      console.error('Error fetching consultation config:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (newConfig: Partial<ConsultationConfig>) => {
    if (!user) return;

    try {
      setSaving(true);
      setError(null);

      const configToSave = {
        ...config,
        ...newConfig,
        user_id: user.id,
        clinic_id: activeClinic?.id
      };

      // Remove id if it's new (handled by upsert usually but explicit is better)
      // Actually with upsert we check conflict criteria.
      // Here unique constraint is user_id + clinic_id.
      
      const { data, error } = await supabase
        .from('consultation_configurations')
        .upsert(configToSave, { 
          onConflict: 'user_id,clinic_id' 
        })
        .select()
        .single();

      if (error) throw error;

      setConfig(data as unknown as ConsultationConfig);
      return data;
    } catch (err: any) {
      console.error('Error saving consultation config:', err);
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return {
    config,
    loading,
    saving,
    error,
    saveConfig,
    fetchConfig
  };
}
