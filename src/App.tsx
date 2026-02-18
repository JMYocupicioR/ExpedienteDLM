import ErrorBoundary from '@/components/ErrorBoundary';
import AppLayout from '@/components/Layout/AppLayout';
import PatientPortalLayout from '@/components/Layout/PatientPortalLayout';
import ClinicAdminLayout from '@/components/Layout/ClinicAdminLayout';
import AdminClinicConfigPanel from '@/components/clinic-config/AdminClinicConfigPanel';
import DoctorClinicPreferences from '@/components/clinic-config/DoctorClinicPreferences';
import AdherenceDashboardPage from '@/features/adherence-dashboard/pages/AdherenceDashboardPage';
import { ClinicProvider } from '@/features/clinic/context/ClinicContext';
import ExerciseManagerPage from '@/features/exercise-manager/pages/ExerciseManagerPage';
import QuestionnaireManagerPage from '@/features/questionnaire-manager/pages/QuestionnaireManagerPage';
import { supabase } from '@/lib/supabase';
import AboutPage from '@/pages/AboutPage';
import AppointmentsPage from '@/pages/AppointmentsPage';
import Auth from '@/pages/Auth';
import AuthCallback from '@/pages/AuthCallback';
import ClinicAdminPage from '@/pages/ClinicAdminPage';
import ClinicAdminDashboard from '@/pages/ClinicAdminDashboard';
import StaffSchedulePage from '@/pages/StaffSchedulePage';
import ClinicPatients from '@/pages/ClinicPatients';
import ClinicRegistration from '@/pages/ClinicRegistration';
import ClinicSearch from '@/pages/ClinicSearch';
import DebugClinics from '@/pages/DebugClinics';
import ClinicSettings from '@/pages/ClinicSettings';
import ClinicStaff from '@/pages/ClinicStaff';
import ClinicSummary from '@/pages/ClinicSummary';
import Dashboard from '@/pages/Dashboard';
import EmailVerification from '@/pages/EmailVerification';
import EnhancedSignupQuestionnaire from '@/pages/EnhancedSignupQuestionnaire';
import LandingPage from '@/pages/LandingPage';
import MedicalScaleBarthel from '@/pages/MedicalScaleBarthel';
import MedicalScaleBoston from '@/pages/MedicalScaleBoston';
import MedicalScales from '@/pages/MedicalScales';
import MedicalTemplates from '@/pages/MedicalTemplates';
import NotFound from '@/pages/NotFound';
import PatientPublicRegistration from '@/pages/PatientPublicRegistration';
import PatientRecord from '@/pages/PatientRecord';
import AssistantBlockedRoute from '@/components/guards/AssistantBlockedRoute';
import PatientsList from '@/pages/PatientsList';
import PrescriptionDashboard from '@/pages/PrescriptionDashboard';
import PrivacyDashboard from '@/pages/PrivacyDashboard';
import RequestClinicAccess from '@/pages/RequestClinicAccess';
import ResetPassword from '@/pages/ResetPassword';
import ScaleAssessmentSession from '@/pages/ScaleAssessmentSession';
import Settings from '@/pages/Settings';
import UserProfile from '@/pages/UserProfile';
import SuperAdminDashboard from '@/features/super-admin/pages/SuperAdminDashboard';
import SuperAdminClinicDetail from '@/features/super-admin/pages/SuperAdminClinicDetail';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const authResolvedRef = useRef(false);

  // Stable setter that avoids unnecessary re-renders when value hasn't changed
  const setAuthSafe = useCallback((value: boolean) => {
    authResolvedRef.current = true;
    setIsAuthenticated(prev => (prev === value ? prev : value));
  }, []);

  useEffect(() => {
    // Check initial auth state with a safety timeout
    const timeout = setTimeout(() => {
      // If getSession() hasn't resolved in 5s, assume no session
      if (!authResolvedRef.current) {
        setAuthSafe(false);
      }
    }, 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setAuthSafe(!!session);
    }).catch(() => {
      clearTimeout(timeout);
      setAuthSafe(false);
    });

    // Subscribe to auth changes — only update on meaningful events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // TOKEN_REFRESHED keeps the same auth status — skip re-render
      if (event === 'TOKEN_REFRESHED') return;
      setAuthSafe(!!session);
    });

    // Handle tab visibility — re-check session when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          setAuthSafe(!!session);
        }).catch(() => {
          // Network error while checking — keep current state
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setAuthSafe]);

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ClinicProvider>
          {/* Skip links para navegación accesible */}
          <a href='#main-content' className='skip-link'>
            Saltar al contenido principal
          </a>
          <a href='#navigation' className='skip-link'>
            Saltar a la navegación
          </a>
          <Routes>
            {/* Public routes */}
            <Route path='/' element={<LandingPage />} />
            <Route path='/about' element={<AboutPage />} />
            <Route
              path='/auth'
              element={isAuthenticated ? <Navigate to='/dashboard' /> : <Auth />}
            />
            <Route
              path='/login'
              element={isAuthenticated ? <Navigate to='/dashboard' /> : <Auth />}
            />
            <Route path='/signup-questionnaire' element={<EnhancedSignupQuestionnaire />} />
            <Route path='/email-verification' element={<EmailVerification />} />
            <Route path='/auth/callback' element={<AuthCallback />} />
            <Route path='/auth/reset-password' element={<ResetPassword />} />
            <Route path='/register/patient/:token' element={<PatientPublicRegistration />} />
            
            {/* Clinic Search and Registration Routes */}
            <Route
              path='/buscar-clinicas'
              element={isAuthenticated ? <ClinicSearch /> : <Navigate to='/auth' />}
            />
            <Route
              path='/registrar-clinica'
              element={isAuthenticated ? <ClinicRegistration /> : <Navigate to='/auth' />}
            />
            <Route
              path='/debug-clinicas'
              element={isAuthenticated ? <DebugClinics /> : <Navigate to='/auth' />}
            />
            <Route
              path='/solicitar-acceso/:clinicId'
              element={isAuthenticated ? <RequestClinicAccess /> : <Navigate to='/auth' />}
            />

            {/* Patient Portal Routes */}
            <Route path='/portal' element={<PatientPortalLayout />}>
              <Route
                index
                element={
                  isAuthenticated ? (
                    <PrivacyDashboard />
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />
              <Route
                path='privacidad'
                element={
                  isAuthenticated ? (
                    <PrivacyDashboard />
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />
              <Route
                path='consultas'
                element={
                  isAuthenticated ? (
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
                  isAuthenticated ? (
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
                  isAuthenticated ? (
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
                  isAuthenticated ? <Dashboard /> : <Navigate to='/auth' />
                }
              />
              <Route
                path='/profile'
                element={
                  isAuthenticated ? <UserProfile /> : <Navigate to='/auth' />
                }
              />
              <Route
                path='/settings'
                element={
                  isAuthenticated ? <Settings /> : <Navigate to='/auth' />
                }
              />
              <Route
                path='/clinic/config'
                element={
                  isAuthenticated ? <AdminClinicConfigPanel /> : <Navigate to='/auth' />
                }
              />
              <Route
                path='/my/preferences'
                element={
                  isAuthenticated ? <DoctorClinicPreferences /> : <Navigate to='/auth' />
                }
              />
              <Route
                path='/plantillas'
                element={
                  isAuthenticated ? (
                    <MedicalTemplates />
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />
              <Route
                path='/escalas'
                element={
                  isAuthenticated ? <MedicalScales /> : <Navigate to='/auth' />
                }
              />
              <Route
                path='/escalas/barthel'
                element={
                  isAuthenticated ? (
                    <MedicalScaleBarthel />
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />
              <Route
                path='/escalas/:id'
                element={
                  isAuthenticated ? (
                    <MedicalScaleBoston />
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />
              <Route
                path='/expediente/:id/escalas/:assessmentId'
                element={
                  isAuthenticated ? (
                    <AssistantBlockedRoute>
                      <ScaleAssessmentSession />
                    </AssistantBlockedRoute>
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />
              <Route
                path='/expediente/:id'
                element={
                  isAuthenticated ? (
                    <AssistantBlockedRoute>
                      <PatientRecord />
                    </AssistantBlockedRoute>
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />
              <Route
                path='/recetas'
                element={
                  isAuthenticated ? (
                    <PrescriptionDashboard />
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />
              <Route
                path='/patients'
                element={
                  isAuthenticated ? <PatientsList /> : <Navigate to='/auth' />
                }
              />
              <Route
                path='/citas'
                element={
                  isAuthenticated ? (
                    <AppointmentsPage />
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />
              <Route
                path='/patient-ops/cuestionarios'
                element={
                  isAuthenticated ? (
                    <QuestionnaireManagerPage />
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />
              <Route
                path='/patient-ops/ejercicios'
                element={
                  isAuthenticated ? (
                    <ExerciseManagerPage />
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />
              <Route
                path='/patient-ops/adherencia'
                element={
                  isAuthenticated ? (
                    <AdherenceDashboardPage />
                  ) : (
                    <Navigate to='/auth' />
                  )
                }
              />

              {/* Clinic Admin Protected Routes */}
              <Route element={<ClinicAdminLayout />}>
                <Route
                  path='/clinic/dashboard'
                  element={
                    isAuthenticated ? <ClinicAdminDashboard /> : <Navigate to='/auth' />
                  }
                />
                <Route
                  path='/clinic/admin'
                  element={
                    isAuthenticated ? <ClinicAdminPage /> : <Navigate to='/auth' />
                  }
                />
                <Route
                  path='/clinic-admin'
                  element={
                    isAuthenticated ? <ClinicAdminPage /> : <Navigate to='/auth' />
                  }
                />
                <Route
                  path='/clinic/summary'
                  element={
                    isAuthenticated ? <ClinicSummary /> : <Navigate to='/auth' />
                  }
                />
                <Route
                  path='/clinic/patients'
                  element={
                    isAuthenticated ? <ClinicPatients /> : <Navigate to='/auth' />
                  }
                />
                <Route
                  path='/clinic/staff'
                  element={
                    isAuthenticated ? (
                      <ClinicStaff />
                    ) : (
                      <Navigate to='/auth' />
                    )
                  }
                />
                <Route
                  path='/clinic/schedule'
                  element={
                    isAuthenticated ? (
                      <StaffSchedulePage />
                    ) : (
                      <Navigate to='/auth' />
                    )
                  }
                />
                <Route
                  path='/clinic/settings'
                  element={
                    isAuthenticated ? <ClinicSettings /> : <Navigate to='/auth' />
                  }
                />
                <Route
                  path='/clinic/config'
                  element={
                    isAuthenticated ? <AdminClinicConfigPanel /> : <Navigate to='/auth' />
                  }
                />
              </Route>

              <Route
                path='/super-admin'
                element={
                  isAuthenticated ? <SuperAdminDashboard /> : <Navigate to='/auth' />
                }
              />
              <Route
                path='/super-admin/clinic/:clinicId'
                element={
                  isAuthenticated ? <SuperAdminClinicDetail /> : <Navigate to='/auth' />
                }
              />
            </Route>

            {/* 404 route - must be last */}
            <Route path='*' element={<NotFound />} />
          </Routes>
        </ClinicProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
