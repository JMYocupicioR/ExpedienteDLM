import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

// Tipos extraídos de la base de datos
type Patient = Database['public']['Tables']['patients']['Row'];
type PatientInsert = Database['public']['Tables']['patients']['Insert'];
type PatientUpdate = Database['public']['Tables']['patients']['Update'];

// Funciones de servicio (devuelven datos o lanzan error)
export async function getPatientsByClinic(clinicId: string): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('full_name');

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getPatientById(patientId: string, clinicId?: string): Promise<Patient> {
  let query = supabase.from('patients').select('*').eq('id', patientId);
  if (clinicId) query = query.eq('clinic_id', clinicId);
  const { data, error } = await query.single();
  if (error) throw new Error(error.message);
  return data as Patient;
}

/**
 * Crea un nuevo paciente en la base de datos.
 * Esta función es el único punto de entrada para la creación de pacientes.
 * Se encarga de limpiar los datos y devolver el objeto completo del paciente creado.
 * @param patientData - Los datos del paciente a crear.
 * @param clinicId - El ID de la clínica a la que pertenece el paciente.
 * @returns El objeto completo del paciente recién creado.
 */
export async function createPatient(
  patientData: PatientInsert,
  clinicId: string
): Promise<Patient> {
  // 1. Limpieza y preparación de datos
  const dataToInsert: PatientInsert = {
    ...patientData,
    clinic_id: clinicId,
    // Asegurar que CURP se guarde en mayúsculas y sin espacios
    curp: patientData.curp ? patientData.curp.toUpperCase().trim() : null,
    // Manejar birth_date: si es una cadena vacía o nulo, se guarda como NULL.
    birth_date: patientData.birth_date || null,
    // Asegurar que las notas se incluyan, si existen
    notes: patientData.notes || null,
  };

  // 2. Inserción en la base de datos y devolución del registro completo
  const { data, error } = await supabase
    .from('patients')
    .insert(dataToInsert)
    .select()
    .single();

  // 3. Manejo de errores
  if (error) {
    // Error de duplicado de CURP (código 23505 para unique_violation)
    if (error.code === '23505' && error.message.includes('unique_clinic_curp')) {
      throw new Error('Ya existe un paciente con este CURP en la clínica.');
    }
    console.error('Error creating patient:', error);
    throw new Error(`Error al crear el paciente: ${error.message}`);
  }

  return data as Patient;
}

export async function updatePatient(
  patientId: string,
  updates: PatientUpdate,
  clinicId: string
): Promise<Patient> {
  const { id, clinic_id, created_at, ...safeUpdates } = updates as any;
  const { data, error } = await supabase
    .from('patients')
    .update({
      ...safeUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', patientId)
    .eq('clinic_id', clinicId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Patient;
}

export async function deletePatient(patientId: string, clinicId: string): Promise<boolean> {
  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', patientId)
    .eq('clinic_id', clinicId);
  if (error) throw new Error(error.message);
  return true;
}

export async function searchPatients(
  searchTerm: string,
  clinicId: string,
  limit: number = 20
): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('clinic_id', clinicId)
    .ilike('full_name', `%${searchTerm}%`)
    .order('full_name')
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getPatientStats(clinicId: string): Promise<{
  total: number;
  newThisMonth: number;
  activeThisMonth: number;
}> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: totalCount, error: totalError } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', clinicId);
  if (totalError) throw new Error(totalError.message);

  const { count: newCount, error: newError } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .gte('created_at', startOfMonth.toISOString());
  if (newError) throw new Error(newError.message);

  return {
    total: totalCount || 0,
    newThisMonth: newCount || 0,
    activeThisMonth: 0,
  };
}

export type { Patient, PatientInsert, PatientUpdate };
