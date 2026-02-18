/**
 * Hook to check if the current user is an administrative_assistant in the active clinic.
 * Used for route guards that block clinical access.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useClinic } from '@/features/clinic/context/ClinicContext';

export function useIsAssistant() {
  const { user } = useAuth();
  const { activeClinic } = useClinic();

  const { data: isAssistant, isLoading } = useQuery({
    queryKey: ['is-assistant', user?.id, activeClinic?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user?.id) return false;
      let query = supabase
        .from('clinic_user_relationships')
        .select('role_in_clinic')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .eq('is_active', true);
      if (activeClinic?.id) {
        query = query.eq('clinic_id', activeClinic.id);
      }
      const { data, error } = await query;
      if (error || !data?.length) return false;
      return data.some((r: { role_in_clinic: string }) => r.role_in_clinic === 'administrative_assistant');
    },
    enabled: Boolean(user?.id),
  });

  return { isAssistant: isAssistant ?? false, isLoading };
}
