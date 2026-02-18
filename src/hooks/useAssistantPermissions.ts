/**
 * Hook para verificar permisos del rol administrative_assistant.
 * Lee permissions_override de la relación usuario-clínica activa.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useClinic } from '@/features/clinic/context/ClinicContext';

export interface AssistantPermissions {
  can_manage_appointments: boolean;
  can_create_patient: boolean;
  can_view_pending_tasks: boolean;
  can_add_pending_tasks: boolean;
  can_add_notes: boolean;
  can_register_payments: boolean;
  can_view_patient_list: boolean;
  can_view_patient_basic: boolean;
}

const DEFAULT_PERMISSIONS: AssistantPermissions = {
  can_manage_appointments: true,
  can_create_patient: true,
  can_view_pending_tasks: true,
  can_add_pending_tasks: true,
  can_add_notes: true,
  can_register_payments: true,
  can_view_patient_list: true,
  can_view_patient_basic: true,
};

export function useAssistantPermissions() {
  const { user } = useAuth();
  const { activeClinic } = useClinic();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['assistant-permissions', user?.id, activeClinic?.id],
    queryFn: async (): Promise<AssistantPermissions> => {
      if (!user?.id || !activeClinic?.id) return DEFAULT_PERMISSIONS;

      const { data, error } = await supabase
        .from('clinic_user_relationships')
        .select('role_in_clinic, permissions_override')
        .eq('user_id', user.id)
        .eq('clinic_id', activeClinic.id)
        .eq('status', 'approved')
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data || data.role_in_clinic !== 'administrative_assistant') {
        return DEFAULT_PERMISSIONS;
      }

      const overrides = (data.permissions_override || {}) as Record<string, unknown>;
      return {
        can_manage_appointments: overrides.can_manage_appointments !== false,
        can_create_patient: overrides.can_create_patient !== false,
        can_view_pending_tasks: overrides.can_view_pending_tasks !== false,
        can_add_pending_tasks: overrides.can_add_pending_tasks !== false,
        can_add_notes: overrides.can_add_notes !== false,
        can_register_payments: overrides.can_register_payments !== false,
        can_view_patient_list: overrides.can_view_patient_list !== false,
        can_view_patient_basic: overrides.can_view_patient_basic !== false,
      };
    },
    enabled: Boolean(user?.id && activeClinic?.id),
  });

  return { permissions: permissions ?? DEFAULT_PERMISSIONS, isLoading };
}
