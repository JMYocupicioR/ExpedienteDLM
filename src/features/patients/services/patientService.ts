import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { encryptPatientPHI, decryptPatientPHI } from '@/lib/encryption';

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
  
  // Temporarily skip decryption for debugging
  console.log('Patients loaded:', data?.length || 0);
  return (data || []) as Patient[];
}

export async function getPatientById(patientId: string, clinicId?: string): Promise<Patient> {
  let query = supabase.from('patients').select('*').eq('id', patientId);
  if (clinicId) query = query.eq('clinic_id', clinicId);
  const { data, error } = await query.single();
  if (error) throw new Error(error.message);
  
  // Temporarily skip decryption for debugging
  console.log('Patient loaded by ID:', data.id);
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
  // 1. Limpieza y preparación de datos - VERSION SIMPLIFICADA PARA DEBUG
  const cleanedData = {
    full_name: patientData.full_name,
    social_security_number: patientData.social_security_number ? patientData.social_security_number.toUpperCase().trim() : null,
    email: patientData.email || null,
    phone: patientData.phone || null,
    birth_date: patientData.birth_date || null,
    gender: patientData.gender || null,
    address: patientData.address || null,
    clinic_id: clinicId,
    primary_doctor_id: patientData.primary_doctor_id || null,
    is_active: patientData.is_active !== undefined ? patientData.is_active : true,
    // Campos JSON como objetos vacíos si no se proporcionan
    insurance_info: patientData.insurance_info || {},
    emergency_contact: patientData.emergency_contact || {},
    notes: patientData.notes || null
  };

  // 2. Temporarily skip encryption for debugging
  console.log('Inserting patient data:', cleanedData);
  
  // 3. Inserción en la base de datos y devolución del registro completo
  const { data, error } = await supabase
    .from('patients')
    .insert(cleanedData)
    .select()
    .single();

  // 4. Manejo de errores
  if (error) {
    console.error('Patient creation error details:');
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    console.error('Details:', error.details);
    console.error('Hint:', error.hint);
    console.error('Full error object:', error);
    
    // Error de duplicado de CURP (código 23505 para unique_violation)
    if (error.code === '23505' && error.message.includes('unique_clinic_social_security')) {
      throw new Error('Ya existe un paciente con este número de seguridad social en la clínica.');
    }
    throw new Error(`Error al crear el paciente: ${error.message} (Código: ${error.code})`);
  }

  // 5. Return patient data (temporarily without decryption for debugging)
  console.log('Patient created successfully:', data);
  return data as Patient;
}

export async function updatePatient(
  patientId: string,
  updates: PatientUpdate,
  clinicId: string
): Promise<Patient> {
  const { id, clinic_id, created_at, ...safeUpdates } = updates as any;
  
  // Encrypt PHI data before updating
  const encryptedUpdates = await encryptPatientPHI({
    ...safeUpdates,
    updated_at: new Date().toISOString(),
  });
  
  const { data, error } = await supabase
    .from('patients')
    .update(encryptedUpdates)
    .eq('id', patientId)
    .eq('clinic_id', clinicId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  
  // Decrypt PHI data before returning
  const decryptedPatient = await decryptPatientPHI(data);
  return decryptedPatient as Patient;
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
  
  // Temporarily skip decryption for debugging
  console.log('Search results:', data?.length || 0);
  return (data || []) as Patient[];
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
