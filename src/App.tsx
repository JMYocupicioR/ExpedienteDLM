import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import PatientRecord from './pages/PatientRecord';
import PrescriptionDashboard from './pages/PrescriptionDashboard';
import SignupQuestionnaire from './pages/SignupQuestionnaire';
import EnhancedSignupQuestionnaire from './pages/EnhancedSignupQuestionnaire';
import UserProfile from './pages/UserProfile';
import Settings from './pages/Settings';
import MedicalTemplates from './pages/MedicalTemplates';
import MedicalScales from './pages/MedicalScales';
import MedicalScaleBarthel from './pages/MedicalScaleBarthel';
import MedicalScaleBoston from './pages/MedicalScaleBoston';
import PatientsList from './pages/PatientsList';
import AppointmentsPage from './pages/AppointmentsPage';
import AppLayout from './components/Layout/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { useTheme } from './hooks/useTheme';

import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {/* Skip links para navegación accesible */}
      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>
      <a href="#navigation" className="skip-link">
        Saltar a la navegación
      </a>
      
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route 
            path="/auth" 
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Auth />} 
          />
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Auth />} 
          />
          <Route 
            path="/signup-questionnaire" 
            element={<EnhancedSignupQuestionnaire />} 
          />
          <Route 
            path="/signup-legacy" 
            element={<SignupQuestionnaire />} 
          />

          {/* Protected routes with layout */}
          <Route element={<AppLayout />}>
            <Route 
              path="/dashboard" 
              element={isAuthenticated ? <Dashboard /> : <Navigate to="/auth" />} 
            />
            <Route 
              path="/profile" 
              element={isAuthenticated ? <UserProfile /> : <Navigate to="/auth" />} 
            />
            <Route 
              path="/settings" 
              element={isAuthenticated ? <Settings /> : <Navigate to="/auth" />} 
            />
            <Route 
              path="/plantillas" 
              element={isAuthenticated ? <MedicalTemplates /> : <Navigate to="/auth" />} 
            />
            <Route 
              path="/escalas" 
              element={isAuthenticated ? <MedicalScales /> : <Navigate to="/auth" />} 
            />
            <Route 
              path="/escalas/barthel" 
              element={isAuthenticated ? <MedicalScaleBarthel /> : <Navigate to="/auth" />} 
            />
            <Route 
              path="/escalas/:id" 
              element={isAuthenticated ? <MedicalScaleBoston /> : <Navigate to="/auth" />} 
            />
            <Route 
              path="/expediente/:id" 
              element={isAuthenticated ? <PatientRecord /> : <Navigate to="/auth" />} 
            />
            <Route 
              path="/recetas" 
              element={isAuthenticated ? <PrescriptionDashboard /> : <Navigate to="/auth" />} 
            />
            <Route 
              path="/patients" 
              element={isAuthenticated ? <PatientsList /> : <Navigate to="/auth" />} 
            />
            <Route 
              path="/citas" 
              element={isAuthenticated ? <AppointmentsPage /> : <Navigate to="/auth" />} 
            />
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;