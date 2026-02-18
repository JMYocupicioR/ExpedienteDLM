import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import type { 
  EnhancedPrescription, 
  PrescriptionTemplate, 
  MedicationTemplate, 
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
  const { user } = useAuth();
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
    } catch {
      setError('Error al cargar prescripciones');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Obtener plantilla de formato visual del médico (layout por defecto)
  const fetchPrescriptionTemplate = useCallback(async () => {
    if (!user) return;

    try {
      // Primero buscar el layout marcado como default del doctor
      const { data, error } = await supabase
        .from('prescription_layouts')
        .select('*')
        .eq('doctor_id', user.id)
        .eq('is_default', true)
        .single();

      if (error && error.code !== 'PGRST116') { // Ignorar "no rows found"
        // Si no hay default, buscar cualquier layout público/predefinido
        const { data: publicData } = await supabase
          .from('prescription_layouts')
          .select('*')
          .eq('is_predefined', true)
          .limit(1)
          .single();

        setPrescriptionTemplate(publicData);
        return;
      }

      setPrescriptionTemplate(data);
    } catch {
      // Silently handle missing template - not critical
      setPrescriptionTemplate(null);
    }
  }, [user]);

  // Crear plantilla de medicamento
  const saveMedicationTemplate = useCallback(async (template: Partial<MedicationTemplate>) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('medical_templates')
        .insert({
          doctor_id: user.id,
          name: template.name,
          type: 'prescripcion',
          content: {
            diagnosis: template.diagnosis,
            medications: template.medications,
            notes: template.notes
          },
          is_public: false,
          usage_count: 1
        })
        .select()
        .single();

      if (error) throw error;
      setMedicationTemplates(prev => [data as unknown as MedicationTemplate, ...prev]);
      return data;
    } catch {
      // Silently fail or log as needed
    }
  }, [user]);

  // Obtener plantillas de medicamentos
  const fetchMedicationTemplates = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('medical_templates')
        .select('*')
        .eq('type', 'prescripcion')
        .or(`is_public.eq.true,usage_count.gt.0`) // Simulating basic visibility or ownership logic if needed
        .order('usage_count', { ascending: false });

      if (error) throw error;

      const formattedTemplates: MedicationTemplate[] = (data || []).map(row => {
        const content = (row.content as unknown) as { 
          sections?: Array<{ id: string; diagnosis?: string; medications?: any[]; notes?: string }>;
          diagnosis?: string;
          medications?: any[];
          notes?: string;
        };
        const prescSection = content?.sections?.find((s) => s.id === 'medications');
        
        return {
          id: row.id,
          doctor_id: user.id,
          name: row.name,
          category: row.category_id || undefined,
          diagnosis: prescSection?.diagnosis || content?.diagnosis || undefined,
          medications: prescSection?.medications || content?.medications || [],
          notes: prescSection?.notes || content?.notes || '',
          is_public: row.is_public,
          usage_count: row.usage_count,
          created_at: row.created_at,
          updated_at: row.updated_at
        };
      });

      setMedicationTemplates(formattedTemplates);
    } catch (err) {
      // Error log removed for security;
    }
  }, [user]);

  // ... (createPrescription, updatePrescription, cancelPrescription, savePrescriptionTemplate remain the same as they use their own tables) ...

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
          // Warning log removed for security;
        }
      }

      // Actualizar lista local
      setPrescriptions(prev => [data, ...prev]);

      return data;
    } catch (err) {
      // Error log removed for security;
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
      // Error log removed for security;
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
      // Error log removed for security;
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

      // Save as default layout in prescription_layouts
      const layoutData = {
        doctor_id: user.id,
        name: 'Mi plantilla',
        template_elements: (styleDefinition as any)?.template_elements || [],
        canvas_settings: (styleDefinition as any)?.canvas_settings || {},
        print_settings: (styleDefinition as any)?.print_settings || {},
        is_default: true,
        updated_at: new Date().toISOString()
      };

      // First, unset any existing defaults
      await supabase
        .from('prescription_layouts')
        .update({ is_default: false })
        .eq('doctor_id', user.id);

      const { data, error: upsertError } = await supabase
        .from('prescription_layouts')
        .upsert(
          layoutData,
          { onConflict: 'doctor_id' }
        )
        .select()
        .single();

      if (upsertError) throw upsertError;

      setPrescriptionTemplate(data);
    } catch (err) {
      // Error log removed for security;
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

      const newTemplate = {
        name: templateData.name,
        type: 'prescripcion' as const,
        is_public: templateData.is_public || false,
        category_id: templateData.category,
        content: {
          sections: [
            {
              id: 'medications',
              title: 'Medicamentos',
              medications: templateData.medications,
              diagnosis: templateData.diagnosis,
              notes: templateData.notes
            }
          ]
        },
        usage_count: 0
      };

      const { data, error: insertError } = await supabase
        .from('medical_templates')
        .insert([newTemplate])
        .select()
        .single();

      if (insertError) throw insertError;

      const content = data.content as any;
      const prescSection = content?.sections?.[0];

      const result: MedicationTemplate = {
        id: data.id,
        doctor_id: user.id,
        name: data.name,
        category: data.category_id || undefined,
        diagnosis: prescSection?.diagnosis || undefined,
        medications: prescSection?.medications || [],
        notes: prescSection?.notes || '',
        is_public: data.is_public,
        usage_count: data.usage_count,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      setMedicationTemplates(prev => [result, ...prev]);
      return result;
    } catch (err) {
      // Error log removed for security;
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
      // Error log removed for security;
      return null;
    }
  }, [user]);

  // Obtener historial de una prescripción
  const getPrescriptionHistory = useCallback(async (prescriptionId: string): Promise<PrescriptionHistory[]> => {
    try {
      const { data, error } = await supabase
        .from('prescription_history_log')
        .select(`
          *,
          performed_by_profile:profiles!prescription_history_log_performed_by_fkey(first_name, last_name)
        `)
        .eq('prescription_id', prescriptionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      // Error log removed for security;
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
