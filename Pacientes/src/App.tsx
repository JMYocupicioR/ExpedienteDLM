import PatientMobileLayout from '@/components/Layout/PatientMobileLayout';
import { usePatientAuth } from '@/context/PatientAuthContext';
import AppointmentsPage from '@/features/appointments/AppointmentsPage';
import AuthPage from '@/features/auth/AuthPage';
import ExercisesPage from '@/features/exercises/ExercisesPage';
import MedicationsPage from '@/features/medications/MedicationsPage';
import MessagesPage from '@/features/messages/MessagesPage';
import ProfilePage from '@/features/profile/ProfilePage';
import ProgressPage from '@/features/progress/ProgressPage';
import ScaleTaskPage from '@/features/scales/ScaleTaskPage';
import TimelinePage from '@/features/timeline/TimelinePage';
import DoctorDirectory from '@/pages/DoctorDirectory';
import DoctorPublicProfile from '@/pages/DoctorPublicProfile';
import PatientPublicRegistration from '@/pages/PatientPublicRegistration';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

function ProtectedRoutes() {
  return (
    <Routes>
      <Route path="/medicos" element={<DoctorDirectory />} />
      <Route path="/medicos/:doctorId" element={<DoctorPublicProfile />} />
      <Route element={<PatientMobileLayout />}>
        <Route path="/" element={<TimelinePage />} />
        <Route path="/citas" element={<AppointmentsPage />} />
        <Route path="/mensajes" element={<MessagesPage />} />
        <Route path="/progreso" element={<ProgressPage />} />
        <Route path="/perfil" element={<ProfilePage />} />
        <Route path="/escalas/:taskId" element={<ScaleTaskPage />} />
        <Route path="/ejercicios" element={<ExercisesPage />} />
        <Route path="/medicamentos" element={<MedicationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function PublicRoutes() {
  return (
    <Routes>
      <Route path="/medicos" element={<DoctorDirectory />} />
      <Route path="/medicos/:doctorId" element={<DoctorPublicProfile />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/register/patient/:token" element={<PatientPublicRegistration />} />
      <Route path="*" element={<Navigate to="/auth" />} />
    </Routes>
  );
}

export default function App() {
  const { user, loading, profile, signOut, refreshProfile, authError, profileLoading } = usePatientAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        Cargando...
      </div>
    );
  }

  if (user && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-200">
        <div className="w-full max-w-md space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h1 className="text-lg font-semibold">Cuenta sin expediente vinculado</h1>
          <p className="text-sm text-slate-300">
            Tu sesion esta activa, pero no encontramos un perfil de paciente asociado. Pide al medico una invitacion
            vigente o completa el registro con el token correcto.
          </p>
          {authError ? <p className="text-xs text-amber-300">{authError}</p> : null}
          <button
            onClick={() => {
              void refreshProfile();
            }}
            disabled={profileLoading}
            className="w-full rounded-md border border-slate-700 px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {profileLoading ? 'Verificando expediente...' : 'Reintentar vinculacion'}
          </button>
          <button
            onClick={() => {
              void signOut();
            }}
            className="w-full rounded-md bg-slate-700 px-4 py-2 text-sm font-medium"
          >
            Cerrar sesion
          </button>
        </div>
      </div>
    );
  }

  return <BrowserRouter>{user ? <ProtectedRoutes /> : <PublicRoutes />}</BrowserRouter>;
}
