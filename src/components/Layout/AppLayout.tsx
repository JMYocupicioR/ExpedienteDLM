import Navbar from '@/components/Navigation/Navbar';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useIsAssistant } from '@/hooks/useIsAssistant';
import NewPatientForm from '@/features/patients/components/NewPatientForm';
import type { Database } from '@/lib/database.types';
import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { UserCheck, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

type Patient = Database['public']['Tables']['patients']['Row'];

interface AppLayoutProps {
  children?: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, profile, loading, signOut } = useAuth();
  const { isAssistant } = useIsAssistant();
  const navigate = useNavigate();
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

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
    navigate(isAssistant ? '/clinic/patients' : `/expediente/${newPatient.id}`);
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

  // Comprobar si es un doctor inactivo (pendiente de aprobación)
  if (profile && !profile.is_active && profile.role === 'doctor') {
    const additionalInfo = profile.additional_info as Record<string, unknown> | null;
    const hasRequestedAccess = additionalInfo?.access_requested === true;
    
    return (
      <div className="min-h-screen bg-[#0F1218] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#1A1F2B] border border-gray-800 rounded-xl p-8 text-center shadow-xl">
          <div className="flex justify-end mb-4">
            <button 
              onClick={() => signOut()}
              className="text-gray-400 hover:text-white transition-colors flex items-center text-sm"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </button>
          </div>
          
          <div className="bg-amber-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserCheck className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Pendiente de Aprobación</h2>
          
          {hasRequestedAccess || requestSuccess ? (
            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg my-6">
              <p className="text-green-400 font-medium">¡Solicitud enviada exitosamente!</p>
              <p className="text-sm text-gray-400 mt-2">
                Un administrador revisará su solicitud pronto. Recibirá una notificación cuando su cuenta sea activada.
              </p>
            </div>
          ) : (
            <>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Su cuenta ha sido creada exitosamente pero requiere aprobación para acceder a la plataforma.
              </p>
              <p className="text-sm text-gray-400 mb-8">
                Por favor, solicite acceso o comuníquese con <strong>noreply@deeplux.org</strong> para obtener más información.
              </p>
              <Button 
                onClick={async () => {
                  try {
                    setRequestLoading(true);
                    const { error } = await supabase.rpc('request_doctor_access');
                    if (error) throw error;
                    setRequestSuccess(true);
                  } catch (_err) {
                    // console.error(err);
                  } finally {
                    setRequestLoading(false);
                  }
                }}
                disabled={requestLoading}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-2 rounded-lg transition-colors"
                size="lg"
              >
                {requestLoading ? 'Enviando solicitud...' : 'Solicitar Acceso'}
              </Button>
            </>
          )}
        </div>
      </div>
    );
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
