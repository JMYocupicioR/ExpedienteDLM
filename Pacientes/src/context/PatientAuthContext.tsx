import type { Database } from '@/lib/database.types';
import { patientLog } from '@/lib/patientDebugLogger';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type PatientProfile = Database['public']['Tables']['patients']['Row'];

type PatientAuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: PatientProfile | null;
  loading: boolean;
  profileLoading: boolean;
  authError: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const PatientAuthContext = createContext<PatientAuthContextValue | undefined>(undefined);

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timeout (${timeoutMs}ms): ${label}`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function PatientAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadPatientProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    setAuthError(null);
    patientLog('info', 'auth.profile.fetch.start', { userId });

    try {
      const { data, error } = await withTimeout(
        supabase.from('patients').select('*').eq('patient_user_id', userId).maybeSingle(),
        8000,
        'fetch profile by patient_user_id',
      );
      if (!error && data) {
        setProfile(data);
        patientLog('info', 'auth.profile.fetch.success', { patientId: data.id, source: 'patient_user_id' });
        return;
      }

      if (error) {
        patientLog('warn', 'auth.profile.fetch.not_found_by_user', { userId, message: error.message });
      }

      const {
        data: { user: authUser },
      } = await withTimeout(supabase.auth.getUser(), 8000, 'auth.getUser');

      const email = authUser?.email?.trim().toLowerCase();
      if (!email) {
        setProfile(null);
        setAuthError('No se pudo obtener el correo del usuario autenticado para vincular expediente.');
        patientLog('error', 'auth.profile.link.failed_missing_email', { userId });
        return;
      }

      // Fallback: link existing patient row by verified auth email when patient_user_id is still NULL.
      const { error: linkError } = await withTimeout(
        supabase.rpc('link_patient_to_current_user_by_email', { p_email: email }),
        8000,
        'rpc link_patient_to_current_user_by_email',
      );
      if (linkError) {
        patientLog('error', 'auth.profile.link.rpc_error', { userId, email, message: linkError.message });
      } else {
        patientLog('info', 'auth.profile.link.rpc_success', { userId, email });
      }

      const { data: linkedProfile, error: linkedError } = await withTimeout(
        supabase.from('patients').select('*').eq('patient_user_id', userId).maybeSingle(),
        8000,
        'fetch linked profile',
      );

      if (linkedError) {
        setProfile(null);
        setAuthError(linkedError.message || 'No fue posible cargar el expediente del paciente.');
        patientLog('error', 'auth.profile.fetch.linked_error', { userId, message: linkedError.message });
        return;
      }

      setProfile(linkedProfile ?? null);
      if (!linkedProfile) {
        setAuthError('Tu sesion esta activa, pero aun no se encontro un expediente vinculado.');
        patientLog('warn', 'auth.profile.fetch.linked_empty', { userId, email });
        return;
      }

      patientLog('info', 'auth.profile.fetch.success', { patientId: linkedProfile.id, source: 'email_linking' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error inesperado al obtener perfil';
      setProfile(null);
      setAuthError('No se pudo cargar tu perfil en este momento. Intenta nuevamente.');
      patientLog('error', 'auth.profile.fetch.unhandled', { userId, message });
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    await loadPatientProfile(user.id);
  }, [loadPatientProfile, user]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      patientLog('info', 'auth.bootstrap.start');
      try {
        const {
          data: { session: activeSession },
        } = await withTimeout(supabase.auth.getSession(), 8000, 'auth.getSession');

        if (!mounted) return;

        setSession(activeSession);
        setUser(activeSession?.user ?? null);
        patientLog('info', 'auth.bootstrap.session_loaded', {
          hasSession: !!activeSession,
          userId: activeSession?.user?.id || null,
        });

        if (activeSession?.user) {
          await loadPatientProfile(activeSession.user.id);
        } else {
          setProfile(null);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error inesperado de sesion';
        setAuthError('No se pudo verificar la sesion en este momento.');
        patientLog('error', 'auth.bootstrap.error', { message });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      patientLog('info', 'auth.state_change', {
        event: _event,
        hasSession: !!newSession,
        userId: newSession?.user?.id || null,
      });
      setSession(newSession);
      setUser(newSession?.user ?? null);

      try {
        if (newSession?.user) {
          await loadPatientProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error en cambio de auth';
        setAuthError('No se pudo sincronizar el perfil tras cambio de sesion.');
        patientLog('error', 'auth.state_change.error', { message });
      } finally {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadPatientProfile]);

  const signOut = useCallback(async () => {
    patientLog('info', 'auth.sign_out.start');
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setAuthError(null);
    patientLog('info', 'auth.sign_out.success');
  }, []);

  const value = useMemo<PatientAuthContextValue>(
    () => ({ user, session, profile, loading, profileLoading, authError, refreshProfile, signOut }),
    [authError, loading, profile, profileLoading, refreshProfile, session, signOut, user],
  );

  return <PatientAuthContext.Provider value={value}>{children}</PatientAuthContext.Provider>;
}

export function usePatientAuth() {
  const context = useContext(PatientAuthContext);
  if (!context) {
    throw new Error('usePatientAuth must be used within PatientAuthProvider');
  }
  return context;
}
