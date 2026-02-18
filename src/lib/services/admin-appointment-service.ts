/**
 * Admin appointment service: clinic-scoped appointments for administrators.
 * Extends enhanced-appointment-service with filters by staff and RPC summaries.
 */
import { supabase } from '@/lib/supabase';
import {
  getAppointments,
  getAppointmentsByDateRange,
  getAppointmentStats,
  type EnhancedAppointment,
} from './enhanced-appointment-service';
import type { AppointmentFilters } from '@/lib/database.types';

export interface ClinicAppointmentsSummaryRow {
  staff_id: string;
  staff_name: string | null;
  staff_role: string;
  total_appointments: number;
  completed: number;
  scheduled: number;
  cancelled: number;
}

export interface StaffWorkloadRow {
  staff_id: string;
  full_name: string | null;
  role_in_clinic: string;
  appointment_count: number;
  completed_count: number;
}

export interface AdminAppointmentFilters extends AppointmentFilters {
  staff_id?: string; // filter by doctor_id (primary staff)
}

export async function getClinicAppointments(
  clinicId: string,
  filters: AdminAppointmentFilters = {}
): Promise<EnhancedAppointment[]> {
  const baseFilters: AppointmentFilters = {
    ...filters,
    clinic_id: clinicId,
  };
  return getAppointments(baseFilters);
}

export async function getClinicAppointmentsByDateRange(
  clinicId: string,
  dateFrom: string,
  dateTo: string,
  staffId?: string
): Promise<EnhancedAppointment[]> {
  return getAppointmentsByDateRange(dateFrom, dateTo, staffId, clinicId);
}

export async function getClinicAppointmentsSummary(
  clinicId: string,
  dateFrom: string,
  dateTo: string
): Promise<ClinicAppointmentsSummaryRow[]> {
  const { data, error } = await supabase.rpc('get_clinic_appointments_summary', {
    p_clinic_id: clinicId,
    p_date_from: dateFrom,
    p_date_to: dateTo,
  });
  if (error) {
    // 400 = función RPC no existe o parámetros inválidos (ej. migración no aplicada)
    console.warn(
      '[admin-appointment] get_clinic_appointments_summary failed:',
      error.message,
      error.code
    );
    return [];
  }
  return (data || []) as ClinicAppointmentsSummaryRow[];
}

export async function getStaffWorkload(
  clinicId: string,
  dateFrom: string,
  dateTo: string,
  staffId?: string
): Promise<StaffWorkloadRow[]> {
  const { data, error } = await supabase.rpc('get_staff_workload', {
    p_clinic_id: clinicId,
    p_date_from: dateFrom,
    p_date_to: dateTo,
    p_staff_id: staffId || null,
  });
  if (error) {
    // 400 = función RPC no existe o parámetros inválidos (ej. migración no aplicada)
    console.warn(
      '[admin-appointment] get_staff_workload failed:',
      error.message,
      error.code
    );
    return [];
  }
  return (data || []) as StaffWorkloadRow[];
}

export async function getClinicAppointmentStats(
  clinicId: string,
  dateFrom?: string,
  dateTo?: string,
  staffId?: string
) {
  return getAppointmentStats(staffId, clinicId, dateFrom, dateTo);
}
