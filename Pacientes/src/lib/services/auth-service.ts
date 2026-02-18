import { supabase } from '@/lib/supabase';
import type { PatientProfile } from '@/lib/types/app';

export const authService = {
  async signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  },

  async signOut() {
    return supabase.auth.signOut();
  },

  async getSession() {
    return supabase.auth.getSession();
  },

  async signUpWithInvitationToken(email: string, password: string, token: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          registration_token: token,
          role: 'patient',
          source_app: 'pacientes',
        },
      },
    });

    let linkError: string | null = null;
    if (!error && data.session) {
      const { error: invokeError } = await supabase.functions.invoke('link-patient-account', {
        body: { token },
      });
      if (invokeError) {
        linkError = invokeError.message || 'No se pudo vincular la cuenta con el paciente.';
      }
    }

    return { data, error, linkError };
  },

  async linkPatientAccountWithToken(token: string) {
    const trimmedToken = token.trim();
    if (!trimmedToken) return { error: null };
    const { error } = await supabase.functions.invoke('link-patient-account', {
      body: { token: trimmedToken },
    });
    return { error };
  },

  async getPatientProfile(userId: string): Promise<PatientProfile | null> {
    const { data, error } = await supabase
      .from('patients')
      .select('id, patient_user_id, full_name, primary_doctor_id, clinic_id')
      .eq('patient_user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      patient_id: data.id,
      patient_user_id: data.patient_user_id,
      full_name: data.full_name,
      primary_doctor_id: data.primary_doctor_id,
      clinic_id: data.clinic_id,
    };
  },
};
