import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { User } from '@supabase/supabase-js';

type Profile = Database['public']['Tables']['profiles']['Row'];

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        setError(null);
        console.log('🔍 Obteniendo sesión inicial...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('❌ Error obteniendo sesión:', error);
          throw error;
        }
        
        console.log('✅ Sesión obtenida:', session ? 'Sí' : 'No');
        
        if (session?.user) {
          console.log('👤 Usuario encontrado:', session.user.id);
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          console.log('👤 No hay usuario autenticado');
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('❌ Error getting initial session:', error);
        setError(error instanceof Error ? error.message : 'Error de autenticación');
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Suscribirse a cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session ? 'with session' : 'no session');
        
        try {
          setError(null);
          if (session?.user) {
            console.log('👤 Usuario autenticado:', session.user.id);
            setUser(session.user);
            await fetchProfile(session.user.id);
          } else {
            console.log('👤 Usuario desautenticado');
            setUser(null);
            setProfile(null);
          }
        } catch (error) {
          console.error('❌ Error in auth state change:', error);
          setError(error instanceof Error ? error.message : 'Error de autenticación');
          setUser(null);
          setProfile(null);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      setError(null);
      console.log('👤 Buscando perfil para usuario:', userId);
      
      // Intentar obtener el perfil existente
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('📊 Respuesta de profiles:', { data, error });

      if (error) {
        // Si el perfil no existe, intentar crearlo
        if (error.code === 'PGRST116') {
          console.log('⚠️ Perfil no encontrado, creando uno nuevo...');
          
          // Obtener datos del usuario de auth
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError) throw userError;

          // Crear perfil nuevo
          const newProfileData = {
            id: userId,
            email: user?.email || '',
            role: 'doctor',
            full_name: user?.user_metadata?.full_name || 'Usuario',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert(newProfileData)
            .select()
            .single();

          if (createError) {
            console.error('❌ Error creando perfil:', createError);
            // Como fallback, usar datos en memoria
            setProfile(newProfileData as Profile);
          } else {
            console.log('✅ Perfil creado exitosamente:', newProfile);
            setProfile(newProfile);
          }
        } else {
          console.error('❌ Error inesperado obteniendo perfil:', error);
          throw error;
        }
      } else {
        console.log('✅ Perfil encontrado:', data);
        setProfile(data);
      }
    } catch (error) {
      console.error('❌ Error crítico en fetchProfile:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar perfil');
      
      // Fallback: crear perfil temporal en memoria para que la aplicación funcione
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!userError && user) {
          const fallbackProfile: Profile = {
            id: userId,
            email: user.email || '',
            role: 'doctor',
            full_name: user.user_metadata?.full_name || 'Usuario',
            specialty: null,
            license_number: null,
            phone: null,
            schedule: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setProfile(fallbackProfile);
          console.log('🔄 Usando perfil temporal:', fallbackProfile);
        }
      } catch (fallbackError) {
        console.error('❌ Error creando perfil temporal:', fallbackError);
      }
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      console.log('🚪 Cerrando sesión...');
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setProfile(null);
      console.log('✅ Sesión cerrada exitosamente');
    } catch (error) {
      console.error('❌ Error signing out:', error);
      setError(error instanceof Error ? error.message : 'Error al cerrar sesión');
    }
  };

  return {
    user,
    profile,
    loading,
    error,
    signOut,
    isAuthenticated: !!user
  };
};