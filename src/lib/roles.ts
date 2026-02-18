/**
 * Unified clinic role catalog and permission helpers.
 * Single source of truth for RBAC across frontend, RLS, and RPC.
 */

/** Roles in clinic_user_relationships that grant administrative privileges */
export const CLINIC_ADMIN_ROLES = ['owner', 'director', 'admin_staff'] as const;

/** All operational clinic roles (who can have appointments/patients assigned) */
export const CLINIC_OPERATIONAL_ROLES = [
  'doctor',
  'physiotherapist',
  'nurse',
  'assistant',
  'admin_staff',
] as const;

/** Roles that can have appointments assigned (doctor_id equivalent) */
export const APPOINTMENT_ELIGIBLE_ROLES = [
  'owner',
  'director',
  'doctor',
  'physiotherapist',
  'nurse',
  'assistant',
  'admin_staff',
] as const;

export type ClinicAdminRole = (typeof CLINIC_ADMIN_ROLES)[number];
export type ClinicOperationalRole = (typeof CLINIC_OPERATIONAL_ROLES)[number];
export type AppointmentEligibleRole = (typeof APPOINTMENT_ELIGIBLE_ROLES)[number];

/** Roles available when inviting staff to a clinic */
export const INVITABLE_CLINIC_ROLES = ['doctor', 'admin_staff', 'administrative_assistant'] as const;
export type InvitableClinicRole = (typeof INVITABLE_CLINIC_ROLES)[number];

/** Labels for invite dropdown */
export const CLINIC_ROLE_LABELS: Record<InvitableClinicRole, string> = {
  doctor: 'Médico',
  admin_staff: 'Administrador',
  administrative_assistant: 'Asistente administrativo',
};

/** role_in_clinic values currently used in DB (for backwards compatibility) */
export type RoleInClinicDB =
  | 'owner'
  | 'director'
  | 'admin_staff'
  | 'doctor'
  | 'physiotherapist'
  | 'nurse'
  | 'assistant'
  | 'administrative_assistant';

/** Frontend display role for admin UI (ClinicContext maps role_in_clinic -> role) */
export type ClinicDisplayRole = 'admin' | 'owner' | 'director' | 'doctor' | string;

/**
 * True if role_in_clinic grants clinic admin privileges (RLS uses same set).
 */
export function isClinicAdminRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return (CLINIC_ADMIN_ROLES as readonly string[]).includes(role);
}

/**
 * Maps role_in_clinic to display role for frontend.
 * Keeps owner/director as-is; admin_staff -> 'admin' for UI consistency.
 */
export function toDisplayRole(roleInClinic: string | null | undefined): ClinicDisplayRole {
  if (!roleInClinic) return 'doctor';
  if (roleInClinic === 'admin_staff') return 'admin';
  return roleInClinic;
}

/**
 * True if the display role (from ClinicContext) indicates admin capability.
 */
export function isAdminDisplayRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'owner' || role === 'director';
}
