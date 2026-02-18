import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useClinic } from '@/features/clinic/context/ClinicContext';
import { Navigate, Outlet } from 'react-router-dom';

export default function ClinicAdminLayout() {
  const { profile, loading } = useAuth();
  const { userClinics, activeClinic } = useClinic();

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-900'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400'></div>
      </div>
    );
  }

  // Strict check: User must have admin privileges
  const membership = activeClinic ? userClinics?.find((m) => m.clinic_id === activeClinic.id) : null;
  const isAuthorizedByProfile =
    profile?.role === 'admin_staff' ||
    profile?.role === 'super_admin' ||
    profile?.role === 'doctor' ||
    profile?.role === 'administrator';
  const isAuthorizedByClinic =
    membership?.role === 'admin' ||
    membership?.role === 'owner' ||
    membership?.role === 'director' ||
    membership?.role === 'administrative_assistant';
  const isAuthorized = isAuthorizedByProfile || isAuthorizedByClinic;

  if (!isAuthorized) {
    console.warn('Unauthorized access attempt to Clinic Admin area');
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
