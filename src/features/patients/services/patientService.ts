import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

// Tipos extraídos de la base de datos
type Patient = Database['public']['Tables']['patients']['Row'];
type PatientInsert = Database['public']['Tables']['patients']['Insert'];
type PatientUpdate = Database['public']['Tables']['patients']['Update'];

// Tipos de respuesta personalizados
export interface PatientServiceResponse<T = Patient> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PatientsListResponse {
  data: Patient[];
  error: string | null;
  success: boolean;
  count?: number;
}

/**
 * Servicio centralizado para operaciones CRUD de pacientes
 * Maneja todas las llamadas a Supabase relacionadas con pacientes
 */
export class PatientService {
  
  /**
   * Obtiene todos los pacientes de una clínica
   */
  static async getPatientsByClinic(clinicId: string): Promise<PatientsListResponse> {
    try {
      const { data, error, count } = await supabase
        .from('patients')
        .select('*', { count: 'exact' })
        .eq('clinic_id', clinicId)
        .order('full_name');

      if (error) {
        console.error('Error fetching patients:', error);
        return {
          data: [],
          error: error.message,
          success: false
        };
      }

      return {
        data: data || [],
        error: null,
        success: true,
        count: count || 0
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al obtener pacientes';
      console.error('Service error in getPatientsByClinic:', err);
      return {
        data: [],
        error: errorMessage,
        success: false
      };
    }
  }

  /**
   * Obtiene un paciente por ID
   */
  static async getPatientById(patientId: string, clinicId?: string): Promise<PatientServiceResponse> {
    try {
      let query = supabase
        .from('patients')
        .select('*')
        .eq('id', patientId);

      // Si se proporciona clinicId, validar que el paciente pertenece a esa clínica
      if (clinicId) {
        query = query.eq('clinic_id', clinicId);
      }

      const { data, error } = await query.single();

      if (error) {
        console.error('Error fetching patient:', error);
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
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al obtener paciente';
      console.error('Service error in getPatientById:', err);
      return {
        data: null,
        error: errorMessage,
        success: false
      };
    }
  }

  /**
   * Crea un nuevo paciente
   */
  static async createPatient(
    patientData: Omit<PatientInsert, 'id' | 'created_at' | 'updated_at'>,
    clinicId: string
  ): Promise<PatientServiceResponse> {
    try {
      const { data, error } = await supabase
        .from('patients')
        .insert({
          ...patientData,
          clinic_id: clinicId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating patient:', error);
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
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al crear paciente';
      console.error('Service error in createPatient:', err);
      return {
        data: null,
        error: errorMessage,
        success: false
      };
    }
  }

  /**
   * Actualiza un paciente existente
   */
  static async updatePatient(
    patientId: string,
    updates: PatientUpdate,
    clinicId: string
  ): Promise<PatientServiceResponse> {
    try {
      // Remover campos que no deben ser actualizados directamente
      const { id, clinic_id, created_at, ...safeUpdates } = updates;

      const { data, error } = await supabase
        .from('patients')
        .update({
          ...safeUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', patientId)
        .eq('clinic_id', clinicId) // Asegurar que pertenece a la clínica
        .select()
        .single();

      if (error) {
        console.error('Error updating patient:', error);
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
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al actualizar paciente';
      console.error('Service error in updatePatient:', err);
      return {
        data: null,
        error: errorMessage,
        success: false
      };
    }
  }

  /**
   * Elimina un paciente (soft delete recomendado)
   */
  static async deletePatient(patientId: string, clinicId: string): Promise<PatientServiceResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId)
        .eq('clinic_id', clinicId); // Asegurar que pertenece a la clínica

      if (error) {
        console.error('Error deleting patient:', error);
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
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al eliminar paciente';
      console.error('Service error in deletePatient:', err);
      return {
        data: false,
        error: errorMessage,
        success: false
      };
    }
  }

  /**
   * Busca pacientes por nombre
   */
  static async searchPatients(
    searchTerm: string,
    clinicId: string,
    limit: number = 20
  ): Promise<PatientsListResponse> {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('clinic_id', clinicId)
        .ilike('full_name', `%${searchTerm}%`)
        .order('full_name')
        .limit(limit);

      if (error) {
        console.error('Error searching patients:', error);
        return {
          data: [],
          error: error.message,
          success: false
        };
      }

      return {
        data: data || [],
        error: null,
        success: true
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al buscar pacientes';
      console.error('Service error in searchPatients:', err);
      return {
        data: [],
        error: errorMessage,
        success: false
      };
    }
  }

  /**
   * Obtiene estadísticas de pacientes de una clínica
   */
  static async getPatientStats(clinicId: string): Promise<{
    total: number;
    newThisMonth: number;
    activeThisMonth: number;
    error: string | null;
  }> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Total de pacientes
      const { count: totalCount, error: totalError } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId);

      if (totalError) throw totalError;

      // Pacientes nuevos este mes
      const { count: newCount, error: newError } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .gte('created_at', startOfMonth.toISOString());

      if (newError) throw newError;

      return {
        total: totalCount || 0,
        newThisMonth: newCount || 0,
        activeThisMonth: 0, // TODO: Implementar lógica de pacientes activos
        error: null
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al obtener estadísticas';
      console.error('Service error in getPatientStats:', err);
      return {
        total: 0,
        newThisMonth: 0,
        activeThisMonth: 0,
        error: errorMessage
      };
    }
  }
}

// Exportar funciones individuales para compatibilidad
export const {
  getPatientsByClinic,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  searchPatients,
  getPatientStats
} = PatientService;

// Exportar tipos para uso en hooks y componentes
export type { Patient, PatientInsert, PatientUpdate };
