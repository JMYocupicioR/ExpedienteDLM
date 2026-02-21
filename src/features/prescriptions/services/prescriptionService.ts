// =====================================================
// SERVICIO CENTRALIZADO DE PRESCRIPCIONES
// =====================================================
// Encapsula TODAS las queries a Supabase del módulo.
// Reemplaza llamadas directas a supabase dispersas en:
//   - PrescriptionDashboard.tsx
//   - useUnifiedPrescriptionSystem.ts
//   - useEnhancedPrescriptions.ts
//   - usePrescriptionLayouts.ts

import { supabase } from '@/lib/supabase';
import type {
  Prescription,
  PrescriptionLayout,
  MedicationTemplate,
  PrescriptionHistoryEntry,
  PrescriptionStats,
  CreatePrescriptionDTO,
  PrescriptionLayoutSnapshot,
  PrintSettings,
} from '../types';

// =====================================================
// PRESCRIPTIONS CRUD
// =====================================================

export async function fetchPrescriptions(doctorId: string): Promise<Prescription[]> {
  // Try with optional columns first; then progressively fall back on schema incompatibilities.
  const fullSelect = `
    id, patient_id, doctor_id, clinic_id, consultation_id,
    medications, diagnosis, instructions, notes, status,
    expires_at, visual_layout, prescription_date, created_at, updated_at,
    patients(full_name)
  `;
  const baseSelect = `
    id, patient_id, doctor_id, clinic_id, consultation_id,
    medications, diagnosis, instructions, notes, status,
    expires_at, created_at, updated_at,
    patients(full_name)
  `;
  const noJoinSelect = `
    id, patient_id, doctor_id, clinic_id, consultation_id,
    medications, diagnosis, instructions, notes, status,
    expires_at, created_at, updated_at
  `;

  let { data, error } = await supabase
    .from('prescriptions')
    .select(fullSelect)
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false });

  // 400 = bad request (columns/relations don't exist yet – migration pending)
  if (error && (error.code === 'PGRST200' || (error as any)?.message?.includes('column'))) {
    const fallback = await supabase
      .from('prescriptions')
      .select(baseSelect)
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });
    // reassign through any to avoid strict type mismatch on optional columns
    (data as any) = fallback.data;
    (error as any) = fallback.error;
  }

  // Second fallback: relation/embed failures for patients(full_name)
  if (error && ((error as any)?.message?.includes('patients') || (error as any)?.message?.includes('relationship'))) {
    const fallbackNoJoin = await supabase
      .from('prescriptions')
      .select(noJoinSelect)
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });
    (data as any) = fallbackNoJoin.data;
    (error as any) = fallbackNoJoin.error;
  }

  if (error) throw error;

  return (data || []).map((p: any) => ({
    ...p,
    patient_name: p.patients?.full_name || p.patients?.[0]?.full_name || '',
  }));
}

export async function fetchPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createPrescription(
  dto: CreatePrescriptionDTO,
  userId: string
): Promise<Prescription> {
  // 1. Resolve clinic_id
  let clinicId = dto.clinic_id;
  if (!clinicId) {
    const { data: membership } = await supabase
      .from('clinic_user_relationships')
      .select('clinic_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .single();
    clinicId = membership?.clinic_id;
  }
  if (!clinicId) {
    throw new Error('No se encontró clínica activa para el doctor.');
  }

  // 2. Calculate expiry
  const maxDuration = Math.max(
    ...dto.medications.map(m => parseInt(m.duration) || 30),
    30
  );
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + maxDuration);

  // 3. Get layout snapshot if provided
  let visualLayout: PrescriptionLayoutSnapshot | null = null;
  if (dto.layout_id) {
    const { data: layout } = await supabase
      .from('prescription_layouts')
      .select('template_elements, canvas_settings, print_settings')
      .eq('id', dto.layout_id)
      .single();
    if (layout) {
      visualLayout = {
        template_elements: layout.template_elements,
        canvas_settings: layout.canvas_settings,
        print_settings: layout.print_settings,
      };
      // Increment usage
      await Promise.resolve(supabase.rpc('increment_prescription_layout_usage', { p_layout_id: dto.layout_id })).catch(() => {});
    }
  }

  // 4. Insert prescription
  const { data, error } = await supabase
    .from('prescriptions')
    .insert([{
      patient_id: dto.patient_id,
      doctor_id: userId,
      clinic_id: clinicId,
      consultation_id: dto.consultation_id || null,
      medications: dto.medications,
      diagnosis: dto.diagnosis,
      notes: dto.notes || null,
      status: dto.status || 'active',
      expires_at: expiresAt.toISOString(),
      visual_layout: visualLayout,
    }])
    .select('*')
    .single();

  if (error) throw error;

  // 5. Link to consultation if provided
  if (dto.consultation_id) {
    await Promise.resolve(
      supabase
        .from('consultation_prescriptions')
        .insert([{
          consultation_id: dto.consultation_id,
          prescription_id: data.id,
        }])
    ).catch(() => {});
    // Non-critical
  }

  // 6. Log history (non-critical)
  await Promise.resolve(
    supabase
      .from('prescription_history_log')
      .insert([{
        prescription_id: data.id,
        action: 'created',
        performed_by: userId,
        notes: `Receta creada con ${dto.medications.length} medicamento(s)`,
        metadata: {
          diagnosis: dto.diagnosis,
          medications_count: dto.medications.length,
          expires_at: expiresAt.toISOString(),
          layout_id: dto.layout_id || null,
        },
      }])
  ).catch(() => {});

  return data;
}

export async function updatePrescription(
  id: string,
  updates: Partial<Pick<Prescription, 'medications' | 'diagnosis' | 'notes' | 'status'>>,
  userId: string
): Promise<Prescription> {
  const { data, error } = await supabase
    .from('prescriptions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  // Log
  await Promise.resolve(
    supabase
      .from('prescription_history_log')
      .insert([{
        prescription_id: id,
        action: 'updated',
        performed_by: userId,
        metadata: { fields_updated: Object.keys(updates) },
      }])
  ).catch(() => {});

  return data;
}

export async function cancelPrescription(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('prescriptions')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;

  await Promise.resolve(
    supabase
      .from('prescription_history_log')
      .insert([{
        prescription_id: id,
        action: 'cancelled',
        performed_by: userId,
      }])
  ).catch(() => {});
}

// =====================================================
// PRESCRIPTION STATS
// =====================================================

export async function getPrescriptionStats(doctorId: string): Promise<PrescriptionStats> {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('id, status, medications, created_at, expires_at')
    .eq('doctor_id', doctorId);

  if (error) throw error;

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const prescriptions = data || [];

  const stats: PrescriptionStats = {
    total: prescriptions.length,
    active: prescriptions.filter(p => p.status === 'active').length,
    completed: prescriptions.filter(p => p.status === 'completed').length,
    cancelled: prescriptions.filter(p => p.status === 'cancelled').length,
    expiringSoon: prescriptions.filter(p =>
      p.status === 'active' && p.expires_at &&
      new Date(p.expires_at) <= sevenDaysFromNow && new Date(p.expires_at) > now
    ).length,
    mostPrescribed: [],
  };

  // Count medications
  const medCounts: Record<string, number> = {};
  prescriptions.forEach(p => {
    ((p.medications || []) as any[]).forEach(m => {
      if (m?.name) {
        medCounts[m.name] = (medCounts[m.name] || 0) + 1;
      }
    });
  });
  stats.mostPrescribed = Object.entries(medCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([medication, count]) => ({ medication, count }));

  return stats;
}

// =====================================================
// LAYOUTS
// =====================================================

export async function fetchLayouts(doctorId: string): Promise<PrescriptionLayout[]> {
  const { data, error } = await supabase
    .from('prescription_layouts')
    .select('*')
    .or(`doctor_id.eq.${doctorId},is_public.eq.true,is_predefined.eq.true`)
    .order('is_predefined', { ascending: false })
    .order('usage_count', { ascending: false });

  // 404/42P01 = table doesn't exist yet (migration pending) – return empty silently
  if (error) {
    if ((error as any)?.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('404')) {
      console.warn('[prescriptionService] prescription_layouts table not found – run migration 20260214000000');
      return [];
    }
    throw error;
  }
  return data || [];
}

export async function saveLayout(
  layout: Omit<PrescriptionLayout, 'id' | 'usage_count' | 'last_used_at' | 'created_at' | 'updated_at'>,
  layoutId?: string
): Promise<PrescriptionLayout> {
  if (layoutId) {
    const { data, error } = await supabase
      .from('prescription_layouts')
      .update({ ...layout, updated_at: new Date().toISOString() })
      .eq('id', layoutId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('prescription_layouts')
      .insert([{ ...layout, usage_count: 0 }])
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }
}

export async function deleteLayout(layoutId: string): Promise<void> {
  const { error } = await supabase
    .from('prescription_layouts')
    .delete()
    .eq('id', layoutId);
  if (error) throw error;
}

export async function setDefaultLayout(layoutId: string, doctorId: string): Promise<void> {
  await supabase
    .from('prescription_layouts')
    .update({ is_default: false })
    .eq('doctor_id', doctorId);

  const { error } = await supabase
    .from('prescription_layouts')
    .update({ is_default: true })
    .eq('id', layoutId);
  if (error) throw error;
}

// =====================================================
// MEDICATION TEMPLATES
// =====================================================

export async function fetchMedicationTemplates(doctorId: string): Promise<MedicationTemplate[]> {
  const { data, error } = await supabase
    .from('medical_templates')
    .select('*')
    .eq('type', 'prescripcion')
    .or(`is_public.eq.true,usage_count.gt.0`) // Simulating basic visibility
    .order('usage_count', { ascending: false });

  if (error) throw error;
  
  return (data || []).map(row => {
    const content = row.content as any;
    const prescSection = content?.sections?.find((s: any) => s.id === 'medications');
    
    return {
      id: row.id,
      doctor_id: doctorId, // Note: medical_templates doesn't have doctor_id, it uses RLS/ownership logic usually but we'll adapt
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
}

export async function saveMedicationTemplate(
  template: Omit<MedicationTemplate, 'id' | 'usage_count' | 'created_at' | 'updated_at'>
): Promise<MedicationTemplate> {
  // Transformar al nuevo formato
  const newTemplate = {
    name: template.name,
    type: 'prescripcion' as const,
    is_public: template.is_public,
    content: {
      sections: [
        {
          id: 'medications',
          title: 'Medicamentos',
          medications: template.medications,
          diagnosis: template.diagnosis,
          notes: template.notes
        }
      ]
    },
    usage_count: 0
  };

  const { data, error } = await supabase
    .from('medical_templates')
    .insert([newTemplate])
    .select('*')
    .single();

  if (error) throw error;

  const content = data.content as any;
  const prescSection = content?.sections?.[0];

  return {
    id: data.id,
    doctor_id: template.doctor_id,
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
}

// =====================================================
// PRINT SETTINGS
// =====================================================

export async function fetchPrintSettings(doctorId: string): Promise<PrintSettings | null> {
  const { data, error } = await supabase
    .from('prescription_print_settings')
    .select('*')
    .eq('doctor_id', doctorId)
    .maybeSingle();

  // Silently ignore missing table (migration pending) or no row found
  if (error) {
    if ((error as any)?.code === '42P01' || error.message?.includes('does not exist')) {
      console.warn('[prescriptionService] prescription_print_settings table not found – run migration 20260214000000');
      return null;
    }
    if (error.code === 'PGRST116') return null; // no rows
    throw error;
  }
  return data ?? null;
}

export async function savePrintSettings(doctorId: string, settings: Partial<PrintSettings>): Promise<void> {
  const { error } = await supabase
    .from('prescription_print_settings')
    .upsert({ ...settings, doctor_id: doctorId, updated_at: new Date().toISOString() }, { onConflict: 'doctor_id' });
  if (error) throw error;
}

// =====================================================
// HISTORY
// =====================================================

export async function fetchPrescriptionHistory(prescriptionId: string): Promise<PrescriptionHistoryEntry[]> {
  const { data, error } = await supabase
    .from('prescription_history_log')
    .select('*')
    .eq('prescription_id', prescriptionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// =====================================================
// PATIENTS (helper for prescription module)
// =====================================================

export async function fetchPatients(clinicId?: string): Promise<Array<{ id: string; full_name: string }>> {
  let query = supabase.from('patients').select('id, full_name').order('full_name');
  if (clinicId) {
    query = query.eq('clinic_id', clinicId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// =====================================================
// DOCTOR PROFILE (helper)
// =====================================================

export async function fetchDoctorProfile(userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, specialty, additional_info')
    .eq('id', userId)
    .single();

  const { data: membership } = await supabase
    .from('clinic_user_relationships')
    .select('clinics(name, address)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .single();

  const addInfo = (profile?.additional_info || {}) as Record<string, any>;
  const clinic = (membership as any)?.clinics;

  return {
    full_name: profile?.full_name || undefined,
    medical_license: addInfo.medical_license || addInfo.cedula_profesional || undefined,
    specialty: profile?.specialty || addInfo.specialty || undefined,
    clinic_name: clinic?.name || addInfo.clinic_name || undefined,
    clinic_address: clinic?.address || undefined,
  };
}
