import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import type { 
  EnhancedPrescription, 
  PrescriptionTemplate, 
  MedicationTemplate, 
  ConsultationPrescription,
  PrescriptionHistory
} from '@/lib/database.types';

interface PrescriptionStats {
  total: number;
  active: number;
  completed: number;
  thisMonth: number;
  mostPrescribed: Array<{
    medication: string;
    count: number;
  }>;
}

interface PrescriptionFormData {
  patient_id: string;
  consultation_id?: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  diagnosis?: string;
  notes?: string;
  duration_days?: number;
}

export function useEnhancedPrescriptions() {
  const { user, profile } = useAuth();
  const [prescriptions, setPrescriptions] = useState<EnhancedPrescription[]>([]);
  const [prescriptionTemplate, setPrescriptionTemplate] = useState<PrescriptionTemplate | null>(null);
  const [medicationTemplates, setMedicationTemplates] = useState<MedicationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Obtener todas las prescripciones del médico
  const fetchPrescriptions = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('prescriptions')
        .select(`
          *,
          patient:patients(id, first_name, last_name),
          consultation:consultations(id, current_condition, created_at)
        `)
        .eq('doctor_id', user.id)
        .eq('deleted_at', null)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setPrescriptions(data || []);
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar prescripciones');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Obtener plantilla de formato visual del médico
  const fetchPrescriptionTemplate = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('prescription_templates')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Ignorar "no rows found"
        throw error;
      }

      setPrescriptionTemplate(data);
    } catch (err) {
      console.error('Error fetching prescription template:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar plantilla de receta');
    }
  }, [user]);

  // Obtener plantillas de medicamentos
  const fetchMedicationTemplates = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('medication_templates')
        .select('*')
        .or(`doctor_id.eq.${user.id},is_public.eq.true`)
        .order('usage_count', { ascending: false });

      if (error) throw error;

      setMedicationTemplates(data || []);
    } catch (err) {
      console.error('Error fetching medication templates:', err);
    }
  }, [user]);

  // Crear nueva prescripción
  const createPrescription = useCallback(async (prescriptionData: PrescriptionFormData): Promise<EnhancedPrescription> => {
    if (!user) throw new Error('Usuario no autenticado');

    try {
      setLoading(true);
      setError(null);

      // Calcular fecha de expiración
      const maxDuration = Math.max(
        ...prescriptionData.medications.map(m => parseInt(m.duration) || 30),
        30
      );
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + maxDuration);

      const newPrescription = {
        ...prescriptionData,
        doctor_id: user.id,
        expires_at: expiresAt.toISOString(),
        status: 'active' as const
      };

      const { data, error: insertError } = await supabase
        .from('prescriptions')
        .insert([newPrescription])
        .select(`
          *,
          patient:patients(id, first_name, last_name)
        `)
        .single();

      if (insertError) throw insertError;

      // Si hay consultation_id, crear relación
      if (prescriptionData.consultation_id) {
        const { error: relationError } = await supabase
          .from('consultation_prescriptions')
          .insert([{
            consultation_id: prescriptionData.consultation_id,
            prescription_id: data.id
          }]);

        if (relationError) {
          console.warn('Error creating consultation-prescription relation:', relationError);
        }
      }

      // Actualizar lista local
      setPrescriptions(prev => [data, ...prev]);

      return data;
    } catch (err) {
      console.error('Error creating prescription:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al crear prescripción';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Actualizar prescripción
  const updatePrescription = useCallback(async (
    id: string, 
    updates: Partial<PrescriptionFormData>
  ): Promise<EnhancedPrescription> => {
    if (!user) throw new Error('Usuario no autenticado');

    try {
      setLoading(true);
      setError(null);

      const { data, error: updateError } = await supabase
        .from('prescriptions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('doctor_id', user.id)
        .select(`
          *,
          patient:patients(id, first_name, last_name)
        `)
        .single();

      if (updateError) throw updateError;

      // Actualizar lista local
      setPrescriptions(prev => prev.map(p => p.id === id ? data : p));

      return data;
    } catch (err) {
      console.error('Error updating prescription:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar prescripción';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Cancelar prescripción
  const cancelPrescription = useCallback(async (id: string): Promise<void> => {
    if (!user) throw new Error('Usuario no autenticado');

    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('prescriptions')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('doctor_id', user.id);

      if (updateError) throw updateError;

      // Actualizar lista local
      setPrescriptions(prev => prev.map(p => 
        p.id === id ? { ...p, status: 'cancelled' } : p
      ));
    } catch (err) {
      console.error('Error cancelling prescription:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al cancelar prescripción';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Guardar plantilla de formato visual
  const savePrescriptionTemplate = useCallback(async (
    styleDefinition: Record<string, unknown>,
    logoFile?: File
  ): Promise<void> => {
    if (!user) throw new Error('Usuario no autenticado');

    try {
      setLoading(true);
      setError(null);

      let logoUrl = prescriptionTemplate?.logo_url;

      // Subir logo si se proporciona
      if (logoFile) {
        const filePath = `${user.id}/${logoFile.name}-${Date.now()}`;
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(filePath, logoFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(filePath);
        logoUrl = urlData.publicUrl;
      }

      const { data, error: upsertError } = await supabase
        .from('prescription_templates')
        .upsert(
          { 
            user_id: user.id, 
            style_definition: styleDefinition, 
            logo_url: logoUrl,
            updated_at: new Date().toISOString() 
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (upsertError) throw upsertError;

      setPrescriptionTemplate(data);
    } catch (err) {
      console.error('Error saving prescription template:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar plantilla';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, prescriptionTemplate]);

  // Crear plantilla de medicamentos
  const createMedicationTemplate = useCallback(async (templateData: {
    name: string;
    category?: string;
    medications: unknown[];
    diagnosis?: string;
    notes?: string;
    is_public?: boolean;
  }): Promise<MedicationTemplate> => {
    if (!user) throw new Error('Usuario no autenticado');

    try {
      setLoading(true);
      setError(null);

      const { data, error: insertError } = await supabase
        .from('medication_templates')
        .insert([{
          ...templateData,
          doctor_id: user.id,
          usage_count: 0
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      setMedicationTemplates(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error creating medication template:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al crear plantilla de medicamentos';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Obtener estadísticas de prescripciones
  const getPrescriptionStats = useCallback(async (): Promise<PrescriptionStats | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('id, status, medications, created_at')
        .eq('doctor_id', user.id)
        .eq('deleted_at', null);

      if (error) throw error;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const stats: PrescriptionStats = {
        total: data.length,
        active: data.filter(p => p.status === 'active').length,
        completed: data.filter(p => p.status === 'completed').length,
        thisMonth: data.filter(p => new Date(p.created_at) >= startOfMonth).length,
        mostPrescribed: []
      };

      // Calcular medicamentos más prescritos
      const medicationCounts: Record<string, number> = {};
      data.forEach(prescription => {
        if (Array.isArray(prescription.medications)) {
          prescription.medications.forEach((med: any) => {
            if (med.name) {
              medicationCounts[med.name] = (medicationCounts[med.name] || 0) + 1;
            }
          });
        }
      });

      stats.mostPrescribed = Object.entries(medicationCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([medication, count]) => ({ medication, count }));

      return stats;
    } catch (err) {
      console.error('Error getting prescription stats:', err);
      return null;
    }
  }, [user]);

  // Obtener historial de una prescripción
  const getPrescriptionHistory = useCallback(async (prescriptionId: string): Promise<PrescriptionHistory[]> => {
    try {
      const { data, error } = await supabase
        .from('prescription_history')
        .select(`
          *,
          performed_by_profile:profiles!prescription_history_performed_by_fkey(first_name, last_name)
        `)
        .eq('prescription_id', prescriptionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching prescription history:', err);
      return [];
    }
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    if (user) {
      fetchPrescriptions();
      fetchPrescriptionTemplate();
      fetchMedicationTemplates();
    }
  }, [user, fetchPrescriptions, fetchPrescriptionTemplate, fetchMedicationTemplates]);

  return {
    // Estado
    prescriptions,
    prescriptionTemplate,
    medicationTemplates,
    loading,
    error,

    // Funciones principales
    createPrescription,
    updatePrescription,
    cancelPrescription,
    
    // Plantillas
    savePrescriptionTemplate,
    createMedicationTemplate,
    
    // Estadísticas y historial
    getPrescriptionStats,
    getPrescriptionHistory,

    // Refrescar datos
    refreshPrescriptions: fetchPrescriptions,
    refreshTemplate: fetchPrescriptionTemplate,
    refreshMedicationTemplates: fetchMedicationTemplates,

    // Utilidades
    clearError: () => setError(null)
  };
}
