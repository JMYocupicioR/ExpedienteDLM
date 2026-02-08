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

  // Decrypt PHI data for each patient
  const decryptedPatients = await Promise.all((data || []).map(patient => decryptPatientPHI(patient)));

  return decryptedPatients as Patient[];
}

export async function getPatientsForDoctor(primaryDoctorId: string): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('primary_doctor_id', primaryDoctorId)
    .is('clinic_id', null)
    .order('full_name');

  if (error) throw new Error(error.message);

  const decryptedPatients = await Promise.all((data || []).map(patient => decryptPatientPHI(patient)));
  return decryptedPatients as Patient[];
}

export async function getPatientById(patientId: string, clinicId?: string): Promise<Patient> {
  let query = supabase.from('patients').select('*').eq('id', patientId);
  if (clinicId) query = query.eq('clinic_id', clinicId);
  const { data, error } = await query.single();
  if (error) throw new Error(error.message);

  // Decrypt PHI data before returning
  const decryptedPatient = await decryptPatientPHI(data);
  return decryptedPatient as Patient;
}

/**
 * Crea un nuevo paciente en la base de datos.
 * Esta función es el único punto de entrada para la creación de pacientes.
 * Se encarga de limpiar los datos y devolver el objeto completo del paciente creado.
 * @param patientData - Los datos del paciente a crear.
 * @param clinicId - El ID de la clínica a la que pertenece el paciente (opcional para médicos independientes).
 * @returns El objeto completo del paciente recién creado.
 */
export async function createPatient(
  patientData: PatientInsert,
  clinicId?: string | null
): Promise<Patient> {
  // 1. Limpieza y preparación de datos
  const cleanedData = {
    full_name: patientData.full_name,
    social_security_number: patientData.social_security_number ? patientData.social_security_number.toUpperCase().trim() : null,
    email: patientData.email || null,
    phone: patientData.phone || null,
    birth_date: patientData.birth_date || null,
    gender: patientData.gender || null,
    address: patientData.address || null,
    // clinic_id puede ser NULL para médicos independientes
    clinic_id: clinicId || patientData.clinic_id || null,
    primary_doctor_id: patientData.primary_doctor_id || null,
    is_active: patientData.is_active !== undefined ? patientData.is_active : true,
    // Campos JSON como objetos vacíos si no se proporcionan
    insurance_info: patientData.insurance_info || {},
    emergency_contact: patientData.emergency_contact || {},
    notes: patientData.notes || null
  };

  // 2. Encrypt PHI data before insertion
  const encryptedData = await encryptPatientPHI(cleanedData);

  // 3. Inserción en la base de datos y devolución del registro completo
  const { data, error } = await supabase
    .from('patients')
    .insert(encryptedData)
    .select()
    .single();

  // 4. Manejo de errores
  if (error) {
    // Error de duplicado de CURP (código 23505 para unique_violation)
    if (error.code === '23505' && error.message.includes('unique_clinic_social_security')) {
      throw new Error('Ya existe un paciente con este número de seguridad social en la clínica.');
    }
    throw new Error(`Error al crear el paciente: ${error.message} (Código: ${error.code})`);
  }

  // 5. Decrypt and return patient data
  const decryptedPatient = await decryptPatientPHI(data);
  return decryptedPatient as Patient;
}

export async function updatePatient(
  patientId: string,
  updates: PatientUpdate,
  clinicId?: string | null
): Promise<Patient> {
  const { id, clinic_id, created_at, ...safeUpdates } = updates as any;

  // Encrypt PHI data before updating
  const encryptedUpdates = await encryptPatientPHI({
    ...safeUpdates,
    updated_at: new Date().toISOString(),
  });

  let query = supabase.from('patients').update(encryptedUpdates).eq('id', patientId);
  query = clinicId === undefined ? query : query.eq('clinic_id', clinicId ?? null);

  const { data, error } = await query.select().single();

  if (error) throw new Error(error.message);

  // Decrypt PHI data before returning
  const decryptedPatient = await decryptPatientPHI(data);
  return decryptedPatient as Patient;
}

export async function deletePatient(patientId: string, clinicId?: string | null): Promise<boolean> {
  let query = supabase.from('patients').delete().eq('id', patientId);
  query = clinicId === undefined ? query : query.eq('clinic_id', clinicId ?? null);
  const { error } = await query;
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

  // Decrypt PHI data for each patient
  const decryptedPatients = await Promise.all(
    (data || []).map(patient => decryptPatientPHI(patient))
  );

  return decryptedPatients as Patient[];
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
