import { supabase } from '@/lib/supabase';

// Types
export interface ClinicConfiguration {
  id: string;
  clinic_id: string;
  timezone: string;
  language: string;
  currency: string;
  default_consultation_duration: number;
  enable_teleconsultation: boolean;
  enable_emergency_mode: boolean;
  max_patients_per_day: number;
  buffer_time_minutes: number;
  business_hours: BusinessHours;
  enable_soap_format: boolean;
  enable_cie10_integration: boolean;
  require_diagnosis: boolean;
  require_physical_exam: boolean;
  prescription_template_id?: string;
  enable_electronic_prescription: boolean;
  require_prescription_approval: boolean;
  notification_settings: NotificationSettings;
  data_retention_days: number;
  enable_audit_log: boolean;
  require_patient_consent: boolean;
  enable_billing: boolean;
  tax_rate: number;
  billing_settings: Record<string, any>;
  theme_color: string;
  logo_url?: string;
  custom_branding: Record<string, any>;
  advanced_settings: Record<string, any>;
  configured_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  enabled: boolean;
  open: string | null;
  close: string | null;
}

export interface NotificationSettings {
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  appointment_reminders: boolean;
  reminder_hours_before: number;
}

export interface UserClinicPreferences {
  id: string;
  user_id: string;
  clinic_id: string;
  preferred_consultation_duration: number;
  my_schedule: Record<string, any>;
  default_note_template?: string;
  favorite_diagnoses: string[];
  frequent_medications: any[];
  sidebar_collapsed: boolean;
  dashboard_widgets: string[];
  quick_actions: string[];
  notification_preferences: UserNotificationPreferences;
  keyboard_shortcuts: Record<string, string>;
  custom_templates: any[];
  export_preferences: ExportPreferences;
  created_at: string;
  updated_at: string;
}

export interface UserNotificationPreferences {
  email_appointments: boolean;
  email_emergencies: boolean;
  desktop_notifications: boolean;
  sound_alerts: boolean;
}

export interface ExportPreferences {
  format: 'pdf' | 'docx' | 'html';
  include_signature: boolean;
  include_logo: boolean;
}

export interface EffectiveConfiguration extends ClinicConfiguration, Partial<UserClinicPreferences> {
  isUserCustomized: boolean;
}

/**
 * Servicio para gestionar configuraciones de clínicas y preferencias de usuario
 */
export class ClinicConfigService {
  
  // =====================================================
  // CONFIGURACIÓN DE CLÍNICA (Admin)
  // =====================================================
  
  /**
   * Obtener configuración de una clínica
   */
  static async getClinicConfiguration(clinicId: string): Promise<ClinicConfiguration | null> {
    try {
      const { data, error } = await supabase
        .from('clinic_configurations')
        .select('*')
        .eq('clinic_id', clinicId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw error;
      }

      return data as ClinicConfiguration;
    } catch (error) {
      console.error('❌ Error obteniendo configuración de clínica:', error);
      throw error;
    }
  }

  /**
   * Actualizar configuración de clínica (solo admins)
   */
  static async updateClinicConfiguration(
    clinicId: string,
    updates: Partial<ClinicConfiguration>
  ): Promise<ClinicConfiguration> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Verificar que el usuario es admin de la clínica
      const isAdmin = await this.isClinicAdmin(user.id, clinicId);
      if (!isAdmin) {
        throw new Error('No tienes permisos de administrador en esta clínica');
      }

      const { data, error } = await supabase
        .from('clinic_configurations')
        .update({
          ...updates,
          configured_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('clinic_id', clinicId)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Configuración de clínica actualizada');
      return data as ClinicConfiguration;
    } catch (error) {
      console.error('❌ Error actualizando configuración:', error);
      throw error;
    }
  }

  /**
   * Inicializar configuración por defecto para una clínica
   */
  static async initializeClinicConfiguration(clinicId: string): Promise<ClinicConfiguration> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('clinic_configurations')
        .insert({
          clinic_id: clinicId,
          configured_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Configuración inicializada para clínica:', clinicId);
      return data as ClinicConfiguration;
    } catch (error) {
      console.error('❌ Error inicializando configuración:', error);
      throw error;
    }
  }

  // =====================================================
  // PREFERENCIAS DE USUARIO (Médico)
  // =====================================================

  /**
   * Obtener preferencias de usuario para una clínica
   */
  static async getUserClinicPreferences(
    userId: string,
    clinicId: string
  ): Promise<UserClinicPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_clinic_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('clinic_id', clinicId)
        .maybeSingle();

      if (error) throw error;

      return data as UserClinicPreferences | null;
    } catch (error) {
      console.error('❌ Error obteniendo preferencias de usuario:', error);
      throw error;
    }
  }

  /**
   * Actualizar preferencias de usuario para una clínica
   */
  static async updateUserClinicPreferences(
    clinicId: string,
    updates: Partial<UserClinicPreferences>
  ): Promise<UserClinicPreferences> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('user_clinic_preferences')
        .upsert({
          user_id: user.id,
          clinic_id: clinicId,
          ...updates,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,clinic_id'
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Preferencias de usuario actualizadas');
      return data as UserClinicPreferences;
    } catch (error) {
      console.error('❌ Error actualizando preferencias:', error);
      throw error;
    }
  }

  // =====================================================
  // CONFIGURACIÓN EFECTIVA (Clínica + Usuario)
  // =====================================================

  /**
   * Obtener configuración efectiva (combinada) para usuario en clínica
   * Esta es la configuración que se debe aplicar al sistema
   */
  static async getEffectiveConfiguration(
    clinicId: string
  ): Promise<EffectiveConfiguration> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Llamar a la función SQL que combina configuración y preferencias
      const { data, error } = await supabase.rpc('get_effective_config', {
        p_user_id: user.id,
        p_clinic_id: clinicId,
      });

      if (error) throw error;

      // Marcar si tiene personalizaciones
      const hasCustomizations = await this.getUserClinicPreferences(user.id, clinicId);

      return {
        ...data,
        isUserCustomized: hasCustomizations !== null,
      } as EffectiveConfiguration;
    } catch (error) {
      console.error('❌ Error obteniendo configuración efectiva:', error);
      
      // Fallback: Retornar solo configuración de clínica
      const clinicConfig = await this.getClinicConfiguration(clinicId);
      if (!clinicConfig) throw new Error('No se pudo obtener configuración');
      
      return {
        ...clinicConfig,
        isUserCustomized: false,
      } as EffectiveConfiguration;
    }
  }

  // =====================================================
  // UTILIDADES
  // =====================================================

  /**
   * Verificar si un usuario es admin de una clínica
   */
  static async isClinicAdmin(userId: string, clinicId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('clinic_user_relationships')
        .select('role_in_clinic')
        .eq('user_id', userId)
        .eq('clinic_id', clinicId)
        .eq('status', 'approved')
        .eq('is_active', true)
        .single();

      if (error) return false;

      return data?.role_in_clinic === 'admin_staff';
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtener todas las clínicas donde el usuario es admin
   */
  static async getUserAdminClinics(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('clinic_user_relationships')
        .select('clinic_id')
        .eq('user_id', userId)
        .eq('role_in_clinic', 'admin_staff')
        .eq('status', 'approved')
        .eq('is_active', true);

      if (error) throw error;

      return data.map(rel => rel.clinic_id);
    } catch (error) {
      console.error('❌ Error obteniendo clínicas de admin:', error);
      return [];
    }
  }

  /**
   * Invalidar cache de configuración
   */
  static async invalidateCache(userId: string, clinicId: string): Promise<void> {
    try {
      await supabase
        .from('active_clinic_configs_cache')
        .delete()
        .eq('user_id', userId)
        .eq('clinic_id', clinicId);

      console.log('✅ Cache de configuración invalidado');
    } catch (error) {
      console.error('❌ Error invalidando cache:', error);
    }
  }
}
