import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import type { Database } from '@/lib/database.types';

type Clinic = Database['public']['Tables']['clinics']['Row'];

interface ClinicContextType {
  clinics: Clinic[];
  activeClinic: Clinic | null;
  setActiveClinic: (clinic: Clinic | null) => void;
  loading: boolean;
  error: string | null;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [activeClinic, setActiveClinicState] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClinics = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data: relationships, error: relError } = await supabase
          .from('clinic_user_relationships')
          .select('clinic_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .eq('status', 'approved');

        if (relError) throw relError;

        if (!relationships || relationships.length === 0) {
          setClinics([]);
          setActiveClinicState(null);
          throw new Error('No estás asociado a ninguna clínica activa.');
        }

        const clinicIds = relationships.map(rel => rel.clinic_id);
        const { data: clinicsData, error: clinicsError } = await supabase
          .from('clinics')
          .select('*')
          .in('id', clinicIds);

        if (clinicsError) throw clinicsError;

        setClinics(clinicsData || []);

        const lastClinicId = localStorage.getItem('activeClinicId');
        const lastClinic = clinicsData?.find(c => c.id === lastClinicId);

        if (lastClinic) {
          setActiveClinicState(lastClinic);
        } else if (clinicsData && clinicsData.length > 0) {
          setActiveClinicState(clinicsData[0]);
        } else {
          setActiveClinicState(null);
        }
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching clinics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClinics();
  }, [user]);

  const setActiveClinic = (clinic: Clinic | null) => {
    setActiveClinicState(clinic);
    if (clinic) {
      localStorage.setItem('activeClinicId', clinic.id);
    } else {
      localStorage.removeItem('activeClinicId');
    }
  };

  return (
    <ClinicContext.Provider value={{ clinics, activeClinic, setActiveClinic, loading, error }}>
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (context === undefined) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
};
