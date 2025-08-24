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

  // Load user's clinics when component mounts or user changes
  useEffect(() => {
    const loadUserClinics = async () => {
      try {
        setIsLoading(true);
        console.log('🔄 Starting to load user clinics...');

        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) {
          console.error('❌ Error getting user:', userError);
          setUserClinics([]);
          setActiveClinic(null);
          return;
        }

        if (!user) {
          console.log('⚠️ No user found, clearing clinics');
          setUserClinics([]);
          setActiveClinic(null);
          return;
        }

        console.log('👤 User authenticated:', user.id);

        // Fetch user's clinic memberships (without nested clinic to avoid RLS recursion)
        console.log('🔍 Fetching clinic memberships for user:', user.id);
        const { data: memberships, error: membershipsError } = await supabase
          .from('clinic_members')
          .select('clinic_id, user_id, role, joined_at')
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false });

        if (membershipsError) {
          console.error('❌ Error loading clinic memberships:', membershipsError);
          console.error('❌ Error details:', {
            message: membershipsError.message,
            details: membershipsError.details,
            hint: membershipsError.hint,
            code: membershipsError.code,
          });
          setUserClinics([]);
          return;
        }

        console.log('✅ Clinic memberships loaded:', memberships?.length || 0, 'memberships');

        // Fetch clinic details in a separate query
        const clinicIds = (memberships || []).map((m: any) => m.clinic_id);
        let clinicsById: Record<string, Clinic> = {};

        if (clinicIds.length > 0) {
          console.log('🔍 Fetching clinic details for IDs:', clinicIds);
          const { data: clinicsData, error: clinicsError } = await supabase
            .from('clinics')
            .select('id, name, address, created_at, updated_at')
            .in('id', clinicIds);

          if (clinicsError) {
            console.error('❌ Error loading clinics:', clinicsError);
            console.error('❌ Clinics error details:', {
              message: clinicsError.message,
              details: clinicsError.details,
              hint: clinicsError.hint,
              code: clinicsError.code,
            });
          } else {
            console.log('✅ Clinics data loaded:', clinicsData?.length || 0, 'clinics');
            clinicsById = (clinicsData || []).reduce((acc: Record<string, Clinic>, c: any) => {
              acc[c.id] = c as Clinic;
              return acc;
            }, {});
          }
        } else {
          console.log('⚠️ No clinic IDs found in memberships');
        }

        // Transform data to match our interface
        const transformedMemberships: ClinicMember[] = memberships.map((membership: any) => ({
          clinic_id: membership.clinic_id,
          user_id: membership.user_id,
          role: membership.role,
          joined_at: membership.joined_at,
          clinic: clinicsById[membership.clinic_id],
        }));

        console.log('🔄 Transformed memberships:', transformedMemberships);
        setUserClinics(transformedMemberships);

        // Set active clinic if none is selected or if current one is no longer valid
        if (!activeClinic || !transformedMemberships.find(m => m.clinic_id === activeClinic.id)) {
          if (transformedMemberships.length > 0) {
            const firstClinic = transformedMemberships[0].clinic;
            if (firstClinic) {
              console.log('🎯 Setting active clinic to first available:', firstClinic.name);
              setActiveClinic(firstClinic);
            } else {
              console.log('⚠️ First membership has no clinic data');
            }
          } else {
            console.log('⚠️ No memberships available, clearing active clinic');
            setActiveClinic(null);
          }
        }
      } catch (error) {
        console.error('💥 Unexpected error in loadUserClinics:', error);
        setUserClinics([]);
        setActiveClinic(null);
      } finally {
        setIsLoading(false);
        console.log('✅ Finished loading user clinics');
      }
    };

    loadUserClinics();
  }, []);

  // Refresh user clinics
  const refreshUserClinics = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Refreshing user clinics...');

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        console.error('❌ Error getting user in refresh:', userError);
        return;
      }

      if (!user) {
        console.log('⚠️ No user found in refresh');
        return;
      }

      console.log('🔍 Refreshing clinic memberships for user:', user.id);
      const { data: memberships, error: membershipsError } = await supabase
        .from('clinic_members')
        .select('clinic_id, user_id, role, joined_at')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false });

      if (membershipsError) {
        console.error('❌ Error refreshing clinic memberships:', membershipsError);
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
        console.log('🔍 Refresh: fetching clinic details for IDs:', clinicIds);
        const { data: clinicsData, error: clinicsError } = await supabase
          .from('clinics')
          .select('id, name, address, created_at, updated_at')
          .in('id', clinicIds);

        if (clinicsError) {
          console.error('❌ Error refreshing clinics:', clinicsError);
          console.error('❌ Refresh clinics error details:', {
            message: clinicsError.message,
            details: clinicsError.details,
            hint: clinicsError.hint,
            code: clinicsError.code,
          });
        } else {
          console.log('✅ Refresh: clinics data loaded:', clinicsData?.length || 0, 'clinics');
          clinicsById = (clinicsData || []).reduce((acc: Record<string, Clinic>, c: any) => {
            acc[c.id] = c as Clinic;
            return acc;
          }, {});
        }
      }

      const transformedMemberships: ClinicMember[] = memberships.map((membership: any) => ({
        clinic_id: membership.clinic_id,
        user_id: membership.user_id,
        role: membership.role,
        joined_at: membership.joined_at,
        clinic: clinicsById[membership.clinic_id],
      }));

      console.log('🔄 Refresh: transformed memberships:', transformedMemberships);
      setUserClinics(transformedMemberships);
    } catch (error) {
      console.error('💥 Unexpected error in refreshUserClinics:', error);
    } finally {
      setIsLoading(false);
      console.log('✅ Finished refreshing user clinics');
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

      // Start a transaction by using RPC function
      const { data: newClinic, error } = await supabase.rpc('create_clinic_with_member', {
        clinic_name: clinicData.name,
        clinic_address: clinicData.address || null,
        user_role: 'admin',
      });

      if (error) throw error;

      // Refresh user clinics
      await refreshUserClinics();

      // Set as active clinic
      if (newClinic) {
        setActiveClinic(newClinic);
      }

      return newClinic;
    } catch (error) {
      console.error('Error creating clinic:', error);
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

      const { error } = await supabase.from('clinic_members').insert({
        clinic_id: clinicId,
        user_id: user.id,
        role: 'pending_approval',
      });

      if (error) throw error;

      // Refresh user clinics
      await refreshUserClinics();
      return true;
    } catch (error) {
      console.error('Error joining clinic:', error);
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
        .from('clinic_members')
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
      console.error('Error leaving clinic:', error);
      return false;
    }
  };

  const setActiveClinicWithSideEffect = async (clinic: Clinic | null) => {
    try {
      if (clinic) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
          .from('profiles')
          .update({ clinic_id: clinic.id })
          .eq('id', user.id);

        if (error) throw error;
      }
      setActiveClinic(clinic);
    } catch (err) {
      console.error('Error updating active clinic in profile:', err);
    }
  };

  const value: ClinicContextType = {
    activeClinic,
    setActiveClinic: setActiveClinicWithSideEffect,
    userClinics,
    isLoading,
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
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
};
