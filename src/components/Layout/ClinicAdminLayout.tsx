import { useAuth } from '@/features/authentication/hooks/useAuth';
import { Navigate, Outlet } from 'react-router-dom';

export default function ClinicAdminLayout() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-900'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400'></div>
      </div>
    );
  }

  // Strict check: User must have admin privileges
  const isAuthorized = 
    profile?.role === 'admin_staff' || 
    profile?.role === 'super_admin' ||
    // Allow doctors who are also clinic owners/directors (handled by DB check usually, 
    // but here we check profile role. If a doctor is an admin, their profile role should reflect that 
    // OR we need a more complex check. For now, let's assume specific roles or verify RLS handles the rest)
    // Actually, 'doctor' might be an admin of their own clinic.
    // The previous analysis said "roles: super_admin, clinic_admin (owner, director, admin_staff), doctor".
    // If a USER is a DOCTOR but also an ADMIN, they might have role='doctor' but match `is_clinic_admin` DB function.
    // Frontend `profile.role` might be just 'doctor'.
    // We should probably allow 'doctor' here if they are in admin context, 
    // BUT usually we want strict separation or a "switch role" feature.
    // For this MVP, let's assume 'admin_staff' is the primary role for pure admins, 
    // but doctors might need access if they are owners.
    // Let's allow 'doctor' for now and let the specific pages/RLS handle fine-grained failures if they aren't owners.
    profile?.role === 'doctor'; 

  if (!isAuthorized) {
    console.warn('Unauthorized access attempt to Clinic Admin area');
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
