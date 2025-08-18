import Navbar from '@/components/Navigation/Navbar';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import NewPatientForm from '@/features/patients/components/NewPatientForm';
import type { Database } from '@/lib/database.types';
import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

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
      <div className='min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400'></div>
      </div>
    );
  }

  if (!user) {
    return children || <Outlet />;
  }

  return (
    <div className='app-container'>
      <Navbar onNewPatientClick={handleNewPatientClick} />

      {/* Main Content Area */}
      <div className='main-layout'>
        <div className={`content-wrapper ${isNavCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div className='page-container'>{children || <Outlet />}</div>
        </div>
      </div>

      <NewPatientForm
        isOpen={showNewPatientForm}
        onClose={() => setShowNewPatientForm(false)}
        onSave={handleNewPatientCreated}
      />
    </div>
  );
}
