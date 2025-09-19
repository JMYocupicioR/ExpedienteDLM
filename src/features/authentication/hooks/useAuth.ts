import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setSession(session);
          setUser(session.user);
          await loadProfile(session.user.id);
        }
      } catch (error) {
        // Error log removed for security;
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setUser(newSession.user);
        await loadProfile(newSession.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);

      // La navegación se maneja ahora en App.tsx, no en el hook
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

      if (error) {
        // Error log removed for security;
        return;
      }

      setProfile(data);
    } catch (error) {
      // Error log removed for security;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setProfile(null);
    } catch (error) {
      // Error log removed for security;
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      return data;
    } catch (error) {
      // Error log removed for security;
      throw error;
    }
  };

  return {
    user,
    profile,
    loading,
    session,
    signOut,
    updateProfile,
    isAuthenticated: !!user,
  };
}
