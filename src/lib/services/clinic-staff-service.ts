import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/database.types';

type ClinicUserRelationship = Database['public']['Tables']['clinic_user_relationships']['Row'];
type ClinicUserRelationshipInsert = Database['public']['Tables']['clinic_user_relationships']['Insert'];
type ClinicUserRelationshipUpdate = Database['public']['Tables']['clinic_user_relationships']['Update'];

export interface StaffMember {
  id: string;
  full_name: string | null;
  email: string;
  role_in_clinic: 'doctor' | 'admin_staff';
  status: 'pending' | 'approved' | 'rejected';
  is_active: boolean;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  permissions_override: any;
}

export interface StaffOverview {
  approvedStaff: StaffMember[];
  pendingStaff: StaffMember[];
  rejectedStaff: StaffMember[];
}

export interface ApprovalResult {
  success: boolean;
  message: string;
  error?: string;
}

export class ClinicStaffService {
  /**
   * Obtiene el personal completo de una clínica organizado por estado
   */
  static async getClinicStaff(clinicId: string): Promise<StaffOverview> {
    try {
      const { data, error } = await supabase
        .from('clinic_user_relationships')
        .select(`
          user_id,
          role_in_clinic,
          status,
          is_active,
          created_at,
          approved_at,
          approved_by,
          rejection_reason,
          rejected_at,
          rejected_by,
          permissions_override,
          profiles:profiles(full_name, email)
        `)
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const staffMembers: StaffMember[] = data.map((item: any) => ({
        id: item.user_id,
        full_name: item.profiles?.full_name || 'Sin nombre',
        email: item.profiles?.email || '',
        role_in_clinic: item.role_in_clinic,
        status: item.status,
        is_active: item.is_active,
        created_at: item.created_at,
        approved_at: item.approved_at,
        approved_by: item.approved_by,
        rejection_reason: item.rejection_reason,
        rejected_at: item.rejected_at,
        rejected_by: item.rejected_by,
        permissions_override: item.permissions_override
      }));

      return {
        approvedStaff: staffMembers.filter(m => m.status === 'approved'),
        pendingStaff: staffMembers.filter(m => m.status === 'pending'),
        rejectedStaff: staffMembers.filter(m => m.status === 'rejected'),
      };
    } catch (error) {
      // Error log removed for security;
      throw error;
    }
  }

  /**
   * Obtiene solo el personal aprobado de una clínica
   */
  static async getApprovedStaff(clinicId: string): Promise<StaffMember[]> {
    try {
      const { data, error } = await supabase
        .from('clinic_user_relationships')
        .select(`
          user_id,
          role_in_clinic,
          status,
          is_active,
          created_at,
          approved_at,
          approved_by,
          profiles:profiles(full_name, email)
        `)
        .eq('clinic_id', clinicId)
        .eq('status', 'approved')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.user_id,
        full_name: item.profiles?.full_name || 'Sin nombre',
        email: item.profiles?.email || '',
        role_in_clinic: item.role_in_clinic,
        status: item.status,
        is_active: item.is_active,
        created_at: item.created_at,
        approved_at: item.approved_at,
        approved_by: item.approved_by,
        rejection_reason: null,
        rejected_at: null,
        rejected_by: null,
      }));
    } catch (error) {
      // Error log removed for security;
      throw error;
    }
  }

  /**
   * Obtiene solo las solicitudes pendientes de una clínica
   */
  static async getPendingStaff(clinicId: string): Promise<StaffMember[]> {
    try {
      const { data, error } = await supabase
        .from('clinic_user_relationships')
        .select(`
          user_id,
          role_in_clinic,
          status,
          is_active,
          created_at,
          profiles:profiles(full_name, email)
        `)
        .eq('clinic_id', clinicId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.user_id,
        full_name: item.profiles?.full_name || 'Sin nombre',
        email: item.profiles?.email || '',
        role_in_clinic: item.role_in_clinic,
        status: item.status,
        is_active: item.is_active,
        created_at: item.created_at,
        approved_at: null,
        approved_by: null,
        rejection_reason: null,
        rejected_at: null,
        rejected_by: null,
      }));
    } catch (error) {
      // Error log removed for security;
      throw error;
    }
  }

  /**
   * Aprueba un usuario para una clínica usando la función RPC
   */
  static async approveUser(userId: string, clinicId: string): Promise<ApprovalResult> {
    try {
      const { data, error } = await supabase.rpc('approve_clinic_user', {
        target_user_id: userId,
        target_clinic_id: clinicId
      });

      if (error) throw error;

      return {
        success: true,
        message: 'Usuario aprobado exitosamente'
      };
    } catch (error: any) {
      // Error log removed for security;
      return {
        success: false,
        message: 'Error al aprobar usuario',
        error: error.message
      };
    }
  }

  /**
   * Rechaza un usuario para una clínica usando la función RPC
   */
  static async rejectUser(
    userId: string, 
    clinicId: string, 
    rejectionReason?: string
  ): Promise<ApprovalResult> {
    try {
      const { data, error } = await supabase.rpc('reject_clinic_user', {
        target_user_id: userId,
        target_clinic_id: clinicId,
        rejection_reason: rejectionReason || null
      });

      if (error) throw error;

      return {
        success: true,
        message: 'Usuario rechazado exitosamente'
      };
    } catch (error: any) {
      // Error log removed for security;
      return {
        success: false,
        message: 'Error al rechazar usuario',
        error: error.message
      };
    }
  }

  /**
   * Crea una nueva relación usuario-clínica (para auto-registro)
   */
  static async createUserRelationship(
    clinicId: string,
    userId: string,
    role: 'doctor' | 'admin_staff',
    extraData?: any
  ): Promise<ApprovalResult> {
    try {
      const { error } = await supabase
        .from('clinic_user_relationships')
        .insert({
          clinic_id: clinicId,
          user_id: userId,
          role_in_clinic: role,
          status: 'pending', // Siempre pendiente por defecto
          is_active: true,
          permissions_override: extraData
        });

      if (error) throw error;

      return {
        success: true,
        message: 'Solicitud de unión enviada. Esperando aprobación del administrador.'
      };
    } catch (error: any) {
      // Error log removed for security;
      return {
        success: false,
        message: 'Error al enviar solicitud de unión',
        error: error.message
      };
    }
  }

  /**
   * Verifica si un usuario tiene acceso aprobado a una clínica
   */
  static async userHasApprovedAccess(clinicId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('user_has_approved_access_to_clinic', {
        check_clinic_id: clinicId
      });

      if (error) throw error;
      return data || false;
    } catch (error) {
      // Error log removed for security;
      return false;
    }
  }

  /**
   * Verifica si un usuario es administrador de una clínica
   */
  static async userIsClinicAdmin(clinicId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('user_is_clinic_admin', {
        check_clinic_id: clinicId
      });

      if (error) throw error;
      return data || false;
    } catch (error) {
      // Error log removed for security;
      return false;
    }
  }

  /**
   * Obtiene estadísticas del personal de una clínica
   */
  static async getStaffStats(clinicId: string): Promise<{
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('clinic_user_relationships')
        .select('status')
        .eq('clinic_id', clinicId);

      if (error) throw error;

      const stats = {
        total: data.length,
        approved: data.filter(item => item.status === 'approved').length,
        pending: data.filter(item => item.status === 'pending').length,
        rejected: data.filter(item => item.status === 'rejected').length,
      };

      return stats;
    } catch (error) {
      // Error log removed for security;
      return { total: 0, approved: 0, pending: 0, rejected: 0 };
    }
  }

  /**
   * Obtiene el historial de auditoría para una clínica
   */
  static async getAuditLogs(clinicId: string, limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          profiles:profiles(full_name, email)
        `)
        .eq('table_name', 'clinic_user_relationships')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Filtrar solo logs relacionados con la clínica específica
      // Esto requiere una consulta adicional ya que audit_logs no tiene clinic_id directamente
      const clinicUserIds = await this.getClinicUserIds(clinicId);
      
      return data.filter(log => 
        clinicUserIds.includes(log.record_id)
      );
    } catch (error) {
      // Error log removed for security;
      return [];
    }
  }

  /**
   * Obtiene el estado del usuario actual en su clínica
   */
  static async getUserClinicStatus(userId: string): Promise<{
    hasRelationship: boolean;
    status?: 'pending' | 'approved' | 'rejected';
    clinic?: {
      id: string;
      name: string;
      type: string;
    };
    role_in_clinic?: 'doctor' | 'admin_staff';
    created_at?: string;
    approved_at?: string;
    rejected_at?: string;
    rejection_reason?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('clinic_user_relationships')
        .select(`
          status,
          role_in_clinic,
          created_at,
          approved_at,
          rejected_at,
          rejection_reason,
          clinic_id,
          clinics:clinic_id(
            id,
            name,
            type
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No relationship found
          return { hasRelationship: false };
        }
        throw error;
      }

      return {
        hasRelationship: true,
        status: data.status,
        clinic: data.clinics ? {
          id: data.clinics.id,
          name: data.clinics.name,
          type: data.clinics.type
        } : undefined,
        role_in_clinic: data.role_in_clinic,
        created_at: data.created_at,
        approved_at: data.approved_at,
        rejected_at: data.rejected_at,
        rejection_reason: data.rejection_reason,
      };
    } catch (error) {
      // Error log removed for security;
      return { hasRelationship: false };
    }
  }

  /**
   * Reenvía una solicitud de acceso a clínica (solo si fue rechazada o no existe)
   */
  static async resendClinicRequest(clinicId: string, roleInClinic: 'doctor' | 'admin_staff' = 'doctor'): Promise<ApprovalResult> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return { success: false, message: 'Usuario no autenticado' };
      }

      // Verificar estado actual
      const currentStatus = await this.getUserClinicStatus(user.user.id);
      
      if (currentStatus.hasRelationship && currentStatus.status === 'pending') {
        return { 
          success: false, 
          message: 'Ya tienes una solicitud pendiente' 
        };
      }

      if (currentStatus.hasRelationship && currentStatus.status === 'approved') {
        return { 
          success: false, 
          message: 'Ya estás aprobado en esta clínica' 
        };
      }

      // Si existe una relación rechazada, actualizarla
      if (currentStatus.hasRelationship && currentStatus.status === 'rejected') {
        const { error } = await supabase
          .from('clinic_user_relationships')
          .update({
            status: 'pending',
            rejected_at: null,
            rejected_by: null,
            rejection_reason: null,
            created_at: new Date().toISOString(),
          })
          .eq('user_id', user.user.id)
          .eq('clinic_id', clinicId);

        if (error) throw error;

        return {
          success: true,
          message: 'Solicitud reenviada correctamente'
        };
      }

      // Crear nueva relación
      const { error } = await supabase
        .from('clinic_user_relationships')
        .insert({
          clinic_id: clinicId,
          user_id: user.user.id,
          role_in_clinic: roleInClinic,
          status: 'pending',
          is_active: true,
        });

      if (error) throw error;

      return {
        success: true,
        message: 'Solicitud enviada correctamente'
      };

    } catch (error) {
      // Error log removed for security;
      return {
        success: false,
        message: 'Error al enviar la solicitud',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene los IDs de usuarios de una clínica para filtrar logs
   */
  private static async getClinicUserIds(clinicId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('clinic_user_relationships')
        .select('id')
        .eq('clinic_id', clinicId);

      if (error) throw error;
      return data.map(item => item.id);
    } catch (error) {
      // Error log removed for security;
      return [];
    }
  }

  /**
   * Busca usuarios para invitar a la clínica
   */
  static async searchUsers(term: string, clinicId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('search_profiles_for_invite', {
        search_term: term,
        target_clinic_id: clinicId
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      // Error log removed for security;
      return [];
    }
  }
}

export default ClinicStaffService;
