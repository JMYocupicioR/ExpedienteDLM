import { supabase } from '@/lib/supabase';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// Types
export interface Clinic {
  id: string;
  name: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface ClinicMember {
  clinic_id: string;
  user_id: string;
  role: 'admin' | 'doctor' | 'nurse' | 'staff' | 'pending_approval';
  joined_at: string;
  clinic?: Clinic;
}

interface ClinicContextType {
  activeClinic: Clinic | null;
  setActiveClinic: (clinic: Clinic | null) => void;
  userClinics: ClinicMember[];
  isLoading: boolean;
  error: string | null;
  isIndependentDoctor: boolean;
  refreshUserClinics: () => Promise<void>;
  createClinic: (clinicData: { name: string; address?: string }) => Promise<Clinic | null>;
  joinClinic: (clinicId: string) => Promise<boolean>;
  leaveClinic: (clinicId: string) => Promise<boolean>;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

interface ClinicProviderProps {
  children: ReactNode;
}

export const ClinicProvider: React.FC<ClinicProviderProps> = ({ children }) => {
  const [activeClinic, setActiveClinic] = useState<Clinic | null>(null);
  const [userClinics, setUserClinics] = useState<ClinicMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isIndependentDoctor, setIsIndependentDoctor] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user's clinics when component mounts or user changes
  useEffect(() => {
    const loadUserClinics = async () => {
      try {
        setIsLoading(true);
        // Sensitive log removed for security;
        setError(null);

        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) {
          // Error log removed for security;
          setUserClinics([]);
          setActiveClinic(null);
          return;
        }

        if (!user) {
          // Sensitive log removed for security;
          setUserClinics([]);
          setActiveClinic(null);
          return;
        }

        // Sensitive log removed for security;

        // Fetch user's clinic memberships (without nested clinic to avoid RLS recursion)
        // Sensitive log removed for security;
        const { data: memberships, error: membershipsError } = await supabase
          .from('clinic_user_relationships')
          .select('clinic_id, user_id, role_in_clinic, created_at, status, is_active')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (membershipsError) {
          console.error('❌ Error loading clinic relationships:', {
            message: membershipsError.message,
            details: membershipsError.details,
            hint: membershipsError.hint,
            code: membershipsError.code,
          });
          setUserClinics([]);
          setError(membershipsError.message);
          return;
        }

        console.log('✅ Clinic relationships loaded:', memberships?.length || 0);

        // Sensitive log removed for security;

        // Fetch clinic details in a separate query
        const clinicIds = (memberships || []).map((m: any) => m.clinic_id);
        let clinicsById: Record<string, Clinic> = {};

        if (clinicIds.length > 0) {
          // Sensitive log removed for security;
          const { data: clinicsData, error: clinicsError } = await supabase
            .from('clinics')
            .select('id, name, address, created_at, updated_at')
            .in('id', clinicIds);

          if (clinicsError) {
            console.error('❌ Error loading clinics data:', {
              message: clinicsError.message,
              details: clinicsError.details,
              hint: clinicsError.hint,
              code: clinicsError.code,
            });
          } else {
            console.log('✅ Clinics data loaded:', clinicsData?.length || 0);
            clinicsById = (clinicsData || []).reduce((acc: Record<string, Clinic>, c: any) => {
              acc[c.id] = c as Clinic;
              return acc;
            }, {});
          }
        } else {
          // Sensitive log removed for security;
        }

        // Transform data to match our interface
        const transformedMemberships: ClinicMember[] = (memberships || []).map((membership: any) => ({
          clinic_id: membership.clinic_id,
          user_id: membership.user_id,
          role: membership.role_in_clinic === 'admin_staff' ? 'admin' : membership.role_in_clinic,
          joined_at: membership.created_at,
          clinic: clinicsById[membership.clinic_id],
        }));

        console.log('✅ Transformed memberships:', transformedMemberships.length);
        console.log('✅ First membership:', transformedMemberships[0]);
        setUserClinics(transformedMemberships);

        // Detect independent doctor when no memberships approved/active
        if (!transformedMemberships.length) {
          setIsIndependentDoctor(true);
          setActiveClinic(null);
          localStorage.removeItem('activeClinicId');
        } else {
          setIsIndependentDoctor(false);
          // Set active clinic from localStorage preference or first available
          const storedClinicId = localStorage.getItem('activeClinicId');
          const storedClinic = transformedMemberships.find(m => m.clinic_id === storedClinicId)?.clinic;
          const firstClinic = transformedMemberships[0].clinic;
          const nextClinic = storedClinic || firstClinic || null;
          if (nextClinic && (!activeClinic || nextClinic.id !== activeClinic.id)) {
            setActiveClinic(nextClinic);
            localStorage.setItem('activeClinicId', nextClinic.id);
          }
        }
      } catch (error) {
        // Error log removed for security;
        setUserClinics([]);
        setActiveClinic(null);
        setIsIndependentDoctor(false);
        setError((error as any)?.message || 'Error cargando clínicas');
      } finally {
        setIsLoading(false);
        // Sensitive log removed for security;
      }
    };

    loadUserClinics();
  }, []);

  // Refresh user clinics
  const refreshUserClinics = async () => {
    try {
      setIsLoading(true);
      // Sensitive log removed for security;

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        // Error log removed for security;
        return;
      }

      if (!user) {
        // Sensitive log removed for security;
        return;
      }

      // Sensitive log removed for security;
      const { data: memberships, error: membershipsError } = await supabase
        .from('clinic_user_relationships')
        .select('clinic_id, user_id, role_in_clinic, created_at, status, is_active')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (membershipsError) {
        // Error log removed for security;
        console.error('❌ Refresh error details:', {
          message: membershipsError.message,
          details: membershipsError.details,
          hint: membershipsError.hint,
          code: membershipsError.code,
        });
        throw membershipsError;
      }

      console.log(
        '✅ Refresh: clinic memberships loaded:',
        memberships?.length || 0,
        'memberships'
      );

      // Fetch clinic details
      const clinicIds = (memberships || []).map((m: any) => m.clinic_id);
      let clinicsById: Record<string, Clinic> = {};

      if (clinicIds.length > 0) {
        // Sensitive log removed for security;
        const { data: clinicsData, error: clinicsError } = await supabase
          .from('clinics')
          .select('id, name, address, created_at, updated_at')
          .in('id', clinicIds);

        if (clinicsError) {
          // Error log removed for security;
          console.error('❌ Refresh clinics error details:', {
            message: clinicsError.message,
            details: clinicsError.details,
            hint: clinicsError.hint,
            code: clinicsError.code,
          });
        } else {
          // Sensitive log removed for security;
          clinicsById = (clinicsData || []).reduce((acc: Record<string, Clinic>, c: any) => {
            acc[c.id] = c as Clinic;
            return acc;
          }, {});
        }
      }

      const transformedMemberships: ClinicMember[] = memberships.map((membership: any) => ({
        clinic_id: membership.clinic_id,
        user_id: membership.user_id,
        role: membership.role_in_clinic === 'admin_staff' ? 'admin' : membership.role_in_clinic,
        joined_at: membership.created_at,
        clinic: clinicsById[membership.clinic_id],
      }));

      // Sensitive log removed for security;
      setUserClinics(transformedMemberships);
      setIsIndependentDoctor(!transformedMemberships.length);
    } catch (error) {
      // Error log removed for security;
      setError((error as any)?.message || 'Error refrescando clínicas');
    } finally {
      setIsLoading(false);
      // Sensitive log removed for security;
    }
  };

  // Create a new clinic
  const createClinic = async (clinicData: {
    name: string;
    address?: string;
  }): Promise<Clinic | null> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create clinic directly (no RPC needed)
      const { data: newClinic, error: clinicError } = await supabase
        .from('clinics')
        .insert({
          name: clinicData.name,
          address: clinicData.address || null,
          type: 'clinic',
          is_active: true
        })
        .select()
        .single();

      if (clinicError) throw clinicError;

      // Create user-clinic relationship
      const { error: relationError } = await supabase
        .from('clinic_user_relationships')
        .insert({
          clinic_id: newClinic.id,
          user_id: user.id,
          role_in_clinic: 'admin_staff',
          status: 'approved',
          is_active: true
        });

      if (relationError) throw relationError;

      // Refresh user clinics
      await refreshUserClinics();

      // Set as active clinic
      if (newClinic) {
        setActiveClinic(newClinic);
      }

      return newClinic;
    } catch (error) {
      // Error log removed for security;
      return null;
    }
  };

  // Join an existing clinic
  const joinClinic = async (clinicId: string): Promise<boolean> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.from('clinic_user_relationships').insert({
        clinic_id: clinicId,
        user_id: user.id,
        role_in_clinic: 'doctor',
        status: 'pending',
        is_active: false,
      });

      if (error) throw error;

      // Refresh user clinics
      await refreshUserClinics();
      return true;
    } catch (error) {
      // Error log removed for security;
      return false;
    }
  };

  // Leave a clinic
  const leaveClinic = async (clinicId: string): Promise<boolean> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('clinic_user_relationships')
        .delete()
        .eq('clinic_id', clinicId)
        .eq('user_id', user.id);

      if (error) throw error;

      // If leaving active clinic, switch to another one
      if (activeClinic?.id === clinicId) {
        const remainingClinics = userClinics.filter(m => m.clinic_id !== clinicId);
        if (remainingClinics.length > 0) {
          setActiveClinic(remainingClinics[0].clinic!);
        } else {
          setActiveClinic(null);
        }
      }

      // Refresh user clinics
      await refreshUserClinics();
      return true;
    } catch (error) {
      // Error log removed for security;
      return false;
    }
  };

  const setActiveClinicWithSideEffect = async (clinic: Clinic | null) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Persist selection in profile when there is a clinic, clear when null
      const { error } = await supabase
        .from('profiles')
        .update({ clinic_id: clinic ? clinic.id : null })
        .eq('id', user.id);

      if (error) throw error;

      if (clinic) {
        localStorage.setItem('activeClinicId', clinic.id);
      } else {
        localStorage.removeItem('activeClinicId');
      }

      setActiveClinic(clinic);
    } catch (err) {
      // Error log removed for security;
    }
  };

  const value: ClinicContextType = {
    activeClinic,
    setActiveClinic: setActiveClinicWithSideEffect,
    userClinics,
    isLoading,
    error,
    isIndependentDoctor,
    refreshUserClinics,
    createClinic,
    joinClinic,
    leaveClinic,
  };

  return <ClinicContext.Provider value={value}>{children}</ClinicContext.Provider>;
};

// Custom hook to use the clinic context
export const useClinic = (): ClinicContextType => {
  const context = useContext(ClinicContext);
  if (context === undefined) {
    console.error('❌ useClinic called outside ClinicProvider');
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  
  // Debug info
  console.log('useClinic called - activeClinic:', context.activeClinic?.name || 'null');
  console.log('useClinic called - userClinics:', context.userClinics?.length || 0);
  console.log('useClinic called - isLoading:', context.isLoading);
  
  return context;
};
