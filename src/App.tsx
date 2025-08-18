import ErrorBoundary from '@/components/ErrorBoundary';
import AppLayout from '@/components/Layout/AppLayout';
import PatientPortalLayout from '@/components/Layout/PatientPortalLayout';
import { ClinicProvider } from '@/features/clinic/context/ClinicContext';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import AboutPage from '@/pages/AboutPage';
import AppointmentsPage from '@/pages/AppointmentsPage';
import Auth from '@/pages/Auth';
import AuthCallback from '@/pages/AuthCallback';
import ClinicAdminPage from '@/pages/ClinicAdminPage';
import ClinicPatients from '@/pages/ClinicPatients';
import ClinicSettings from '@/pages/ClinicSettings';
import ClinicStaff from '@/pages/ClinicStaff';
import ClinicSummary from '@/pages/ClinicSummary';
import Dashboard from '@/pages/Dashboard';
import EnhancedSignupQuestionnaire from '@/pages/EnhancedSignupQuestionnaire';
import LandingPage from '@/pages/LandingPage';
import MedicalScaleBarthel from '@/pages/MedicalScaleBarthel';
import MedicalScaleBoston from '@/pages/MedicalScaleBoston';
import MedicalScales from '@/pages/MedicalScales';
import MedicalTemplates from '@/pages/MedicalTemplates';
import NotFound from '@/pages/NotFound';
import PatientPublicRegistration from '@/pages/PatientPublicRegistration';
import PatientRecord from '@/pages/PatientRecord';
import PatientsList from '@/pages/PatientsList';
import PrescriptionDashboard from '@/pages/PrescriptionDashboard';
import PrivacyDashboard from '@/pages/PrivacyDashboard';
import Settings from '@/pages/Settings';
import UserProfile from '@/pages/UserProfile';
import { useEffect, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { resolvedTheme } = useTheme();
  const allowAuthBypass = import.meta.env.VITE_ALLOW_DASHBOARD_WITHOUT_AUTH === 'true';

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show loading state while checking auth (skip if bypass enabled)
  if (isAuthenticated === null && !allowAuthBypass) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ClinicProvider>
        {/* Skip links para navegación accesible */}
        <a href='#main-content' className='skip-link'>
          Saltar al contenido principal
        </a>
        <a href='#navigation' className='skip-link'>
          Saltar a la navegación
        </a>

        <Router>
          <Routes>
            {/* Public routes */}
            <Route path='/' element={<LandingPage />} />
            <Route path='/about' element={<AboutPage />} />
            <Route
              path='/auth'
              element={isAuthenticated || allowAuthBypass ? <Navigate to='/dashboard' /> : <Auth />}
            />
            <Route
              path='/login'
              element={isAuthenticated || allowAuthBypass ? <Navigate to='/dashboard' /> : <Auth />}
            />
            <Route path='/signup-questionnaire' element={<EnhancedSignupQuestionnaire />} />
            <Route path='/auth/callback' element={<AuthCallback />} />
            <Route path='/register/patient/:token' element={<PatientPublicRegistration />} />

            {/* Patient Portal Routes */}
            <Route path='/portal' element={<PatientPortalLayout />}>
              <Route
                index
                element={
                  isAuthenticated || allowAuthBypass ? (
                    <PrivacyDashboard />
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />
              <Route
                path='privacidad'
                element={
                  isAuthenticated || allowAuthBypass ? (
                    <PrivacyDashboard />
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />
              <Route
                path='consultas'
                element={
                  isAuthenticated || allowAuthBypass ? (
                    <div className='p-6'>
                      <h1 className='text-2xl font-bold'>Mis Consultas</h1>
                      <p className='text-gray-600 mt-2'>Funcionalidad en desarrollo...</p>
                    </div>
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />
              <Route
                path='citas'
                element={
                  isAuthenticated || allowAuthBypass ? (
                    <div className='p-6'>
                      <h1 className='text-2xl font-bold'>Mis Citas</h1>
                      <p className='text-gray-600 mt-2'>Funcionalidad en desarrollo...</p>
                    </div>
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />
              <Route
                path='estudios'
                element={
                  isAuthenticated || allowAuthBypass ? (
                    <div className='p-6'>
                      <h1 className='text-2xl font-bold'>Mis Estudios</h1>
                      <p className='text-gray-600 mt-2'>Funcionalidad en desarrollo...</p>
                    </div>
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />
            </Route>

            {/* Protected routes with layout */}
            <Route element={<AppLayout />}>
              <Route
                path='/dashboard'
                element={
                  isAuthenticated || allowAuthBypass ? <Dashboard /> : <Navigate to='/auth' />
                }
              />
              <Route
                path='/profile'
                element={
                  isAuthenticated || allowAuthBypass ? <UserProfile /> : <Navigate to='/auth' />
                }
              />
              <Route
                path='/settings'
                element={
                  isAuthenticated || allowAuthBypass ? <Settings /> : <Navigate to='/auth' />
                }
              />
              <Route
                path='/plantillas'
                element={
                  isAuthenticated || allowAuthBypass ? (
                    <MedicalTemplates />
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />
              <Route
                path='/escalas'
                element={
                  isAuthenticated || allowAuthBypass ? <MedicalScales /> : <Navigate to='/auth' />
                }
              />
              <Route
                path='/escalas/barthel'
                element={
                  isAuthenticated || allowAuthBypass ? (
                    <MedicalScaleBarthel />
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />
              <Route
                path='/escalas/:id'
                element={
                  isAuthenticated || allowAuthBypass ? (
                    <MedicalScaleBoston />
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />
              <Route
                path='/expediente/:id'
                element={
                  isAuthenticated || allowAuthBypass ? <PatientRecord /> : <Navigate to='/auth' />
                }
              />
              <Route
                path='/recetas'
                element={
                  isAuthenticated || allowAuthBypass ? (
                    <PrescriptionDashboard />
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />
              <Route
                path='/patients'
                element={
                  isAuthenticated || allowAuthBypass ? <PatientsList /> : <Navigate to='/auth' />
                }
              />
              <Route
                path='/citas'
                element={
                  isAuthenticated || allowAuthBypass ? (
                    <AppointmentsPage />
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />
              <Route
                path='/clinic/admin'
                element={
                  isAuthenticated || allowAuthBypass ? <ClinicAdminPage /> : <Navigate to='/auth' />
                }
              />
              <Route
                path='/clinic-admin'
                element={
                  isAuthenticated || allowAuthBypass ? <ClinicAdminPage /> : <Navigate to='/auth' />
                }
              />
              <Route
                path='/clinic/summary'
                element={
                  isAuthenticated || allowAuthBypass ? <ClinicSummary /> : <Navigate to='/auth' />
                }
              />
              <Route
                path='/clinic/patients'
                element={
                  isAuthenticated || allowAuthBypass ? <ClinicPatients /> : <Navigate to='/auth' />
                }
              />
              <Route
                path='/clinic/staff'
                element={
                  isAuthenticated || allowAuthBypass ? <ClinicStaff /> : <Navigate to='/auth' />
                }
              />
              <Route
                path='/clinic/settings'
                element={
                  isAuthenticated || allowAuthBypass ? <ClinicSettings /> : <Navigate to='/auth' />
                }
              />
            </Route>

            {/* 404 route - must be last */}
            <Route path='*' element={<NotFound />} />
          </Routes>
        </Router>
      </ClinicProvider>
    </ErrorBoundary>
  );
}

export default App;
