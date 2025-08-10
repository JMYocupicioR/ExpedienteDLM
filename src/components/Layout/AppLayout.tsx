import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from '../Navigation/Navbar';
import NewPatientForm from '../NewPatientForm';
import { useAuth } from '../../hooks/useAuth';
import type { Database } from '../../lib/database.types';

type Patient = Database['public']['Tables']['patients']['Row'];


interface AppLayoutProps {
  children?: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);

  // Listen for navbar collapse state changes
  useEffect(() => {
    const handleNavbarToggle = (event: CustomEvent) => {
      setIsNavCollapsed(event.detail.isCollapsed);
    };

    window.addEventListener('navbar-toggle', handleNavbarToggle as EventListener);
    return () => window.removeEventListener('navbar-toggle', handleNavbarToggle as EventListener);
  }, []);

  const handleNewPatientClick = () => {
    setShowNewPatientForm(true);
  };

  const handleNewPatientCreated = (newPatient: Patient) => {
    setShowNewPatientForm(false);
    navigate(`/expediente/${newPatient.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (!user) {
    return children || <Outlet />;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--app-gradient)', color: 'var(--text-primary)' }}>
      <Navbar onNewPatientClick={handleNewPatientClick} />
      
      {/* Main Content Area */}
      <main className={`
        transition-all duration-300 min-h-screen
        ${isNavCollapsed ? 'lg:ml-16' : 'lg:ml-64'}
        pt-16 lg:pt-0
      `}>
        <div className="min-h-screen p-4 lg:p-6 pb-24 lg:pb-6">
          {children || <Outlet />}
        </div>
      </main>

      <NewPatientForm
        isOpen={showNewPatientForm}
        onClose={() => setShowNewPatientForm(false)}
        onSave={handleNewPatientCreated}
      />
    </div>
  );
}