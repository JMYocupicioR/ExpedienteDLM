import { supabase } from '@/lib/supabase';
import { Json } from '@/lib/database.types';

/**
 * Interfaz para registros de auditoría
 */
export interface AuditLogRecord {
  id: string;
  timestamp: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  user_name: string | null;
  user_email: string | null;
  old_values: Json | null;
  new_values: Json | null;
}

/**
 * Interfaz para el historial de auditoría con metadata adicional
 */
export interface AuditHistoryEntry extends AuditLogRecord {
  changes?: {
    field: string;
    old_value: any;
    new_value: any;
  }[];
  summary: string;
}

/**
 * Servicio para manejo de auditoría inmutable
 * Cumple con requisitos de NOM-024 para inalterabilidad de registros médicos
 */
export class AuditService {
  
  /**
   * Obtiene el historial de auditoría para un registro específico
   */
  static async getAuditHistoryForRecord(
    tableName: string, 
    recordId: string,
    limit: number = 50
  ): Promise<AuditHistoryEntry[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_audit_history_for_record', {
          p_table_name: tableName,
          p_record_id: recordId,
          p_limit: limit
        });

      if (error) {
        console.error('Error fetching audit history:', error);
        throw error;
      }

      if (!data) return [];

      return data.map((record: AuditLogRecord) => ({
        ...record,
        changes: this.extractChanges(record.old_values, record.new_values),
        summary: this.generateChangeSummary(record)
      }));

    } catch (error) {
      console.error('Error in getAuditHistoryForRecord:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial combinado para un paciente (paciente + consultas)
   */
  static async getPatientAuditHistory(patientId: string): Promise<{
    patient: AuditHistoryEntry[];
    consultations: AuditHistoryEntry[];
    appointments: AuditHistoryEntry[];
    combined: AuditHistoryEntry[];
  }> {
    try {
      const [patientHistory, consultationsHistory, appointmentsHistory] = await Promise.all([
        this.getAuditHistoryForRecord('patients', patientId),
        this.getAuditHistoryForRecord('consultations', patientId),
        this.getAuditHistoryForRecord('appointments', patientId)
      ]);

      // Combinar y ordenar por timestamp
      const combined = [...patientHistory, ...consultationsHistory, ...appointmentsHistory]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return {
        patient: patientHistory,
        consultations: consultationsHistory,
        appointments: appointmentsHistory,
        combined
      };
    } catch (error) {
      console.error('Error getting patient audit history:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de auditoría para una clínica
   */
  static async getClinicAuditStats(clinicId: string, days: number = 30): Promise<{
    totalChanges: number;
    changesByTable: Record<string, number>;
    changesByAction: Record<string, number>;
    mostActiveUsers: Array<{ user_name: string; changes: number }>;
  }> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          action,
          table_name,
          profiles:profiles(full_name)
        `)
        .gte('timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const stats = {
        totalChanges: data?.length || 0,
        changesByTable: {} as Record<string, number>,
        changesByAction: {} as Record<string, number>,
        mostActiveUsers: [] as Array<{ user_name: string; changes: number }>
      };

      if (!data) return stats;

      // Agrupar por tabla
      data.forEach(record => {
        stats.changesByTable[record.table_name] = (stats.changesByTable[record.table_name] || 0) + 1;
        stats.changesByAction[record.action] = (stats.changesByAction[record.action] || 0) + 1;
      });

      // Agrupar por usuarios más activos
      const userChanges: Record<string, number> = {};
      data.forEach(record => {
        const userName = record.profiles?.full_name || 'Usuario desconocido';
        userChanges[userName] = (userChanges[userName] || 0) + 1;
      });

      stats.mostActiveUsers = Object.entries(userChanges)
        .map(([user_name, changes]) => ({ user_name, changes }))
        .sort((a, b) => b.changes - a.changes)
        .slice(0, 10);

      return stats;
    } catch (error) {
      console.error('Error getting clinic audit stats:', error);
      throw error;
    }
  }

  /**
   * Extrae los cambios específicos entre old_values y new_values
   */
  private static extractChanges(oldValues: Json | null, newValues: Json | null): Array<{
    field: string;
    old_value: any;
    new_value: any;
  }> {
    const changes: Array<{ field: string; old_value: any; new_value: any }> = [];

    if (!oldValues && !newValues) return changes;

    // Para INSERT, solo mostrar campos importantes del new_values
    if (!oldValues && newValues) {
      const important_fields = ['full_name', 'email', 'phone', 'diagnosis', 'treatment', 'status'];
      const newObj = newValues as Record<string, any>;
      
      Object.keys(newObj).forEach(key => {
        if (important_fields.includes(key) && newObj[key] !== null && newObj[key] !== '') {
          changes.push({
            field: key,
            old_value: null,
            new_value: newObj[key]
          });
        }
      });
      return changes;
    }

    // Para DELETE, mostrar campos importantes del old_values
    if (oldValues && !newValues) {
      const important_fields = ['full_name', 'email', 'phone', 'diagnosis', 'treatment', 'status'];
      const oldObj = oldValues as Record<string, any>;
      
      Object.keys(oldObj).forEach(key => {
        if (important_fields.includes(key) && oldObj[key] !== null && oldObj[key] !== '') {
          changes.push({
            field: key,
            old_value: oldObj[key],
            new_value: null
          });
        }
      });
      return changes;
    }

    // Para UPDATE, comparar valores
    if (oldValues && newValues) {
      const oldObj = oldValues as Record<string, any>;
      const newObj = newValues as Record<string, any>;

      Object.keys(newObj).forEach(key => {
        // Excluir campos de sistema que cambian automáticamente
        if (['updated_at', 'created_at', 'id'].includes(key)) return;

        const oldVal = oldObj[key];
        const newVal = newObj[key];

        // Comparar valores (manejar nulls y undefined)
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changes.push({
            field: key,
            old_value: oldVal,
            new_value: newVal
          });
        }
      });
    }

    return changes;
  }

  /**
   * Genera un resumen legible del cambio
   */
  private static generateChangeSummary(record: AuditLogRecord): string {
    const { action, user_name } = record;
    const userName = user_name || 'Sistema';

    switch (action) {
      case 'INSERT':
        return `${userName} creó un nuevo registro`;
      case 'UPDATE':
        return `${userName} modificó el registro`;
      case 'DELETE':
        return `${userName} eliminó el registro`;
      default:
        return `${userName} realizó una acción`;
    }
  }

  /**
   * Obtiene el historial de auditoría con filtros avanzados
   */
  static async getAuditHistoryWithFilters(filters: {
    table_name?: string;
    user_id?: string;
    action?: 'INSERT' | 'UPDATE' | 'DELETE';
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditHistoryEntry[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          id,
          timestamp,
          action,
          table_name,
          record_id,
          old_values,
          new_values,
          profiles:user_id(full_name, email)
        `)
        .order('timestamp', { ascending: false });

      // Aplicar filtros
      if (filters.table_name) {
        query = query.eq('table_name', filters.table_name);
      }

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.date_from) {
        query = query.gte('timestamp', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('timestamp', filters.date_to);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data) return [];

      return data.map((record: any) => ({
        id: record.id,
        timestamp: record.timestamp,
        action: record.action,
        user_name: record.profiles?.full_name || null,
        user_email: record.profiles?.email || null,
        old_values: record.old_values,
        new_values: record.new_values,
        changes: this.extractChanges(record.old_values, record.new_values),
        summary: this.generateChangeSummary({
          id: record.id,
          timestamp: record.timestamp,
          action: record.action,
          user_name: record.profiles?.full_name || null,
          user_email: record.profiles?.email || null,
          old_values: record.old_values,
          new_values: record.new_values
        })
      }));

    } catch (error) {
      console.error('Error in getAuditHistoryWithFilters:', error);
      throw error;
    }
  }

  /**
   * Verifica la integridad de los registros de auditoría
   */
  static async verifyAuditIntegrity(tableName: string, recordId: string): Promise<{
    hasGaps: boolean;
    missingOperations: string[];
    timeline: Array<{ timestamp: string; action: string }>;
  }> {
    try {
      const history = await this.getAuditHistoryForRecord(tableName, recordId);
      
      const timeline = history.map(h => ({
        timestamp: h.timestamp,
        action: h.action
      })).reverse(); // Ordenar cronológicamente

      let hasGaps = false;
      const missingOperations: string[] = [];

      // Verificar que el primer registro sea INSERT
      if (timeline.length > 0 && timeline[0].action !== 'INSERT') {
        hasGaps = true;
        missingOperations.push('Falta registro de creación (INSERT)');
      }

      // Verificar secuencia lógica
      for (let i = 1; i < timeline.length; i++) {
        const prev = timeline[i - 1];
        const current = timeline[i];

        // Si hay un UPDATE después de DELETE, es irregular
        if (prev.action === 'DELETE' && current.action === 'UPDATE') {
          hasGaps = true;
          missingOperations.push(`Operación ilógica: UPDATE después de DELETE en ${current.timestamp}`);
        }
      }

      return {
        hasGaps,
        missingOperations,
        timeline
      };

    } catch (error) {
      console.error('Error verifying audit integrity:', error);
      throw error;
    }
  }
}

export default AuditService;
