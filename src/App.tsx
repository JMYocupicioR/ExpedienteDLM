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
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

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
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route 
            path="/auth" 
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Auth />} 
          />
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/auth" />} 
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
            path="/signup-questionnaire" 
            element={<SignupQuestionnaire />} 
          />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;