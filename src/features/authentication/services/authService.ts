import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import type { User, AuthError } from '@supabase/supabase-js';

// Tipos de la base de datos
type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

// Tipos de respuesta del servicio
export interface AuthServiceResponse<T = any> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  role?: 'admin' | 'doctor' | 'staff';
}

export interface ProfileData {
  full_name: string;
  role: 'admin' | 'doctor' | 'staff';
  phone?: string;
  avatar_url?: string;
}

/**
 * Servicio centralizado para operaciones de autenticación
 * Maneja login, registro, perfiles y sesiones
 */
export class AuthService {
  
  /**
   * Iniciar sesión con email y contraseña
   */
  static async signIn(credentials: LoginCredentials): Promise<AuthServiceResponse<User>> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        console.error('Sign in error:', error);
        return {
          data: null,
          error: error.message,
          success: false
        };
      }

      return {
        data: data.user,
        error: null,
        success: true
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al iniciar sesión';
      console.error('Service error in signIn:', err);
      return {
        data: null,
        error: errorMessage,
        success: false
      };
    }
  }

  /**
   * Registrar nuevo usuario
   */
  static async signUp(registerData: RegisterData): Promise<AuthServiceResponse<User>> {
    try {
      // Validaciones básicas
      if (registerData.password !== registerData.confirmPassword) {
        return {
          data: null,
          error: 'Las contraseñas no coinciden',
          success: false
        };
      }

      if (registerData.password.length < 6) {
        return {
          data: null,
          error: 'La contraseña debe tener al menos 6 caracteres',
          success: false
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
        options: {
          data: {
            full_name: registerData.fullName,
            role: registerData.role || 'staff'
          }
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        return {
          data: null,
          error: error.message,
          success: false
        };
      }

      return {
        data: data.user,
        error: null,
        success: true
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al registrarse';
      console.error('Service error in signUp:', err);
      return {
        data: null,
        error: errorMessage,
        success: false
      };
    }
  }

  /**
   * Cerrar sesión
   */
  static async signOut(): Promise<AuthServiceResponse<boolean>> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Sign out error:', error);
        return {
          data: false,
          error: error.message,
          success: false
        };
      }

      return {
        data: true,
        error: null,
        success: true
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cerrar sesión';
      console.error('Service error in signOut:', err);
      return {
        data: false,
        error: errorMessage,
        success: false
      };
    }
  }

  /**
   * Obtener usuario actual
   */
  static async getCurrentUser(): Promise<AuthServiceResponse<User>> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        console.error('Get user error:', error);
        return {
          data: null,
          error: error.message,
          success: false
        };
      }

      return {
        data: user,
        error: null,
        success: true
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al obtener usuario';
      console.error('Service error in getCurrentUser:', err);
      return {
        data: null,
        error: errorMessage,
        success: false
      };
    }
  }

  /**
   * Obtener perfil del usuario
   */
  static async getUserProfile(userId: string): Promise<AuthServiceResponse<Profile>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Get profile error:', error);
        return {
          data: null,
          error: error.message,
          success: false
        };
      }

      return {
        data,
        error: null,
        success: true
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al obtener perfil';
      console.error('Service error in getUserProfile:', err);
      return {
        data: null,
        error: errorMessage,
        success: false
      };
    }
  }

  /**
   * Actualizar perfil del usuario
   */
  static async updateUserProfile(
    userId: string, 
    updates: ProfileUpdate
  ): Promise<AuthServiceResponse<Profile>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Update profile error:', error);
        return {
          data: null,
          error: error.message,
          success: false
        };
      }

      return {
        data,
        error: null,
        success: true
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al actualizar perfil';
      console.error('Service error in updateUserProfile:', err);
      return {
        data: null,
        error: errorMessage,
        success: false
      };
    }
  }

  /**
   * Crear perfil para usuario nuevo
   */
  static async createUserProfile(
    userId: string, 
    profileData: ProfileData
  ): Promise<AuthServiceResponse<Profile>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          ...profileData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Create profile error:', error);
        return {
          data: null,
          error: error.message,
          success: false
        };
      }

      return {
        data,
        error: null,
        success: true
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al crear perfil';
      console.error('Service error in createUserProfile:', err);
      return {
        data: null,
        error: errorMessage,
        success: false
      };
    }
  }

  /**
   * Restablecer contraseña
   */
  static async resetPassword(email: string): Promise<AuthServiceResponse<boolean>> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        console.error('Reset password error:', error);
        return {
          data: false,
          error: error.message,
          success: false
        };
      }

      return {
        data: true,
        error: null,
        success: true
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al restablecer contraseña';
      console.error('Service error in resetPassword:', err);
      return {
        data: false,
        error: errorMessage,
        success: false
      };
    }
  }

  /**
   * Actualizar contraseña
   */
  static async updatePassword(newPassword: string): Promise<AuthServiceResponse<boolean>> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Update password error:', error);
        return {
          data: false,
          error: error.message,
          success: false
        };
      }

      return {
        data: true,
        error: null,
        success: true
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al actualizar contraseña';
      console.error('Service error in updatePassword:', err);
      return {
        data: false,
        error: errorMessage,
        success: false
      };
    }
  }

  /**
   * Verificar si el usuario tiene un rol específico
   */
  static async hasRole(userId: string, requiredRole: string): Promise<AuthServiceResponse<boolean>> {
    try {
      const profileResponse = await this.getUserProfile(userId);
      
      if (!profileResponse.success || !profileResponse.data) {
        return {
          data: false,
          error: profileResponse.error || 'No se pudo obtener el perfil',
          success: false
        };
      }

      const hasRequiredRole = profileResponse.data.role === requiredRole;
      
      return {
        data: hasRequiredRole,
        error: null,
        success: true
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al verificar rol';
      console.error('Service error in hasRole:', err);
      return {
        data: false,
        error: errorMessage,
        success: false
      };
    }
  }
}

// Exportar funciones individuales para compatibilidad
export const {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
  createUserProfile,
  resetPassword,
  updatePassword,
  hasRole
} = AuthService;

// Exportar tipos
export type { Profile, ProfileInsert, ProfileUpdate, LoginCredentials, RegisterData, ProfileData };
