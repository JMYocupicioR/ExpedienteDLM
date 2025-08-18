import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useClinic } from '@/features/clinic/context/ClinicContext';

export interface Patient {
  id: string;
  clinic_id: string;
  full_name: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  email?: string;
  phone?: string;
  address?: string;
  medical_record_number?: string;
  created_at: string;
  updated_at: string;
}

interface UsePatientsReturn {
  patients: Patient[];
  loading: boolean;
  error: string | null;
  createPatient: (patientData: Omit<Patient, 'id' | 'clinic_id' | 'created_at' | 'updated_at'>) => Promise<Patient | null>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<boolean>;
  deletePatient: (id: string) => Promise<boolean>;
  refreshPatients: () => Promise<void>;
}

export const usePatients = (): UsePatientsReturn => {
  const { activeClinic } = useClinic();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load patients when active clinic changes
  useEffect(() => {
    if (activeClinic) {
      loadPatients();
    } else {
      setPatients([]);
      setLoading(false);
    }
  }, [activeClinic]);

  const loadPatients = async () => {
    if (!activeClinic) {
      setPatients([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('patients')
        .select('*')
        .eq('clinic_id', activeClinic.id)
        .order('full_name');

      if (fetchError) throw fetchError;

      setPatients(data || []);
    } catch (err) {
      console.error('Error loading patients:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar pacientes');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const createPatient = async (patientData: Omit<Patient, 'id' | 'clinic_id' | 'created_at' | 'updated_at'>): Promise<Patient | null> => {
    if (!activeClinic) {
      setError('No hay clínica activa');
      return null;
    }

    try {
      const { data, error: createError } = await supabase
        .from('patients')
        .insert({
          ...patientData,
          clinic_id: activeClinic.id
        })
        .select()
        .single();

      if (createError) throw createError;

      // Update local state
      setPatients(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error creating patient:', err);
      setError(err instanceof Error ? err.message : 'Error al crear paciente');
      return null;
    }
  };

  const updatePatient = async (id: string, updates: Partial<Patient>): Promise<boolean> => {
    if (!activeClinic) {
      setError('No hay clínica activa');
      return false;
    }

    try {
      // Remove id and clinic_id from updates to prevent changing them
      const { id: _, clinic_id: __, ...safeUpdates } = updates;

      const { error: updateError } = await supabase
        .from('patients')
        .update(safeUpdates)
        .eq('id', id)
        .eq('clinic_id', activeClinic.id); // Ensure patient belongs to active clinic

      if (updateError) throw updateError;

      // Update local state
      setPatients(prev => 
        prev.map(patient => 
          patient.id === id ? { ...patient, ...safeUpdates } : patient
        )
      );
      return true;
    } catch (err) {
      console.error('Error updating patient:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar paciente');
      return false;
    }
  };

  const deletePatient = async (id: string): Promise<boolean> => {
    if (!activeClinic) {
      setError('No hay clínica activa');
      return false;
    }

    try {
      const { error: deleteError } = await supabase
        .from('patients')
        .delete()
        .eq('id', id)
        .eq('clinic_id', activeClinic.id); // Ensure patient belongs to active clinic

      if (deleteError) throw deleteError;

      // Update local state
      setPatients(prev => prev.filter(patient => patient.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting patient:', err);
      setError(err instanceof Error ? err.message : 'Error al eliminar paciente');
      return false;
    }
  };

  const refreshPatients = async () => {
    await loadPatients();
  };

  return {
    patients,
    loading,
    error,
    createPatient,
    updatePatient,
    deletePatient,
    refreshPatients
  };
};
