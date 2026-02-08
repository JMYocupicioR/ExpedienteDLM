import React, { useState, useEffect } from 'react';
import {
  Building,
  Users,
  UserPlus,
  Check,
  X,
  MailCheck,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/hooks/useAuth';

interface Clinic {
  id: string;
  name: string;
  type: string;
  address?: string;
}

interface ClinicMembership {
  id: string;
  clinic: Clinic;
  role_in_clinic: string;
  status: 'approved' | 'pending' | 'rejected';
  is_active: boolean;
  created_at: string;
}

interface ClinicInvitation {
  id: string;
  clinic: Clinic;
  invited_at: string;
  invited_by_name?: string;
}

interface ClinicAssociationManagerProps {
  userId: string;
  personalClinic: Clinic | null;
}

export function ClinicAssociationManager({
  userId,
  personalClinic,
}: ClinicAssociationManagerProps) {
  const [isIndependent, setIsIndependent] = useState(true);
  const [allowAdditionalClinics, setAllowAdditionalClinics] = useState(false);
  const [loading, setLoading] = useState(true);
  const [associatedClinics, setAssociatedClinics] = useState<ClinicMembership[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<ClinicInvitation[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ClinicMembership[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);

  useEffect(() => {
    loadMemberships();
  }, [userId]);

  const loadMemberships = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all memberships (approved)
      const { data: memberships, error: membershipsError } = await supabase
        .from('clinic_user_relationships')
        .select(`
          id,
          role_in_clinic,
          status,
          is_active,
          created_at,
          clinic:clinic_id (
            id,
            name,
            type,
            address
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'approved')
        .eq('is_active', true);

      if (membershipsError) throw membershipsError;

      // Separate personal clinic from other clinics
      const clinicMemberships = (memberships || []).filter(
        (m: any) => m.clinic && m.clinic.type !== 'consultorio_personal'
      );
      setAssociatedClinics(clinicMemberships as any);
      setAllowAdditionalClinics(clinicMemberships.length > 0);

      // Get pending invitations (sent TO this user by other clinics)
      const { data: invitations, error: invitationsError } = await supabase
        .from('clinic_user_relationships')
        .select(`
          id,
          created_at,
          clinic:clinic_id (
            id,
            name,
            type,
            address
          ),
          created_by
        `)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .eq('is_active', false)
        .neq('created_by', userId);

      if (invitationsError) throw invitationsError;

      setPendingInvitations(
        (invitations || []).map((inv: any) => ({
          id: inv.id,
          clinic: inv.clinic,
          invited_at: inv.created_at,
        }))
      );

      // Get pending requests (sent BY this user to clinics)
      const { data: requests, error: requestsError } = await supabase
        .from('clinic_user_relationships')
        .select(`
          id,
          role_in_clinic,
          status,
          is_active,
          created_at,
          clinic:clinic_id (
            id,
            name,
            type,
            address
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .eq('created_by', userId);

      if (requestsError) throw requestsError;

      setPendingRequests(requests as any);
    } catch (err: any) {
      console.error('Error loading memberships:', err);
      setError('Error al cargar la información de clínicas');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      setProcessingInvitation(invitationId);
      setError(null);
      setSuccess(null);

      const { error } = await supabase
        .from('clinic_user_relationships')
        .update({
          status: 'approved',
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invitationId);

      if (error) throw error;

      setSuccess('Invitación aceptada correctamente');
      await loadMemberships();
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      setError(err.message || 'Error al aceptar la invitación');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      setProcessingInvitation(invitationId);
      setError(null);
      setSuccess(null);

      const { error } = await supabase
        .from('clinic_user_relationships')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invitationId);

      if (error) throw error;

      setSuccess('Invitación rechazada');
      await loadMemberships();
    } catch (err: any) {
      console.error('Error rejecting invitation:', err);
      setError(err.message || 'Error al rechazar la invitación');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleToggleAdditionalClinics = (enabled: boolean) => {
    setAllowAdditionalClinics(enabled);
    if (enabled && associatedClinics.length === 0) {
      // Show instruction or open clinic search
      setSuccess('Activa esta opción y luego solicita unirte a otra clínica');
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card space-y-6">
      <div className="flex items-center">
        <Users className="h-6 w-6 text-purple-400 mr-3" />
        <div>
          <h3 className="text-lg font-semibold">Asociación de Clínicas</h3>
          <p className="text-sm text-gray-400">
            Gestiona tus membresías en diferentes clínicas
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg flex items-center text-sm">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900/50 border border-green-700 text-green-300 p-3 rounded-lg flex items-center text-sm">
          <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Independent Doctor Section */}
      <div className={`rounded-lg p-4 border ${
        personalClinic ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-700/10 border-gray-700/50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Building className={`h-5 w-5 mr-3 ${personalClinic ? 'text-cyan-400' : 'text-gray-500'}`} />
            <div>
              <p className={`font-medium ${personalClinic ? 'text-white' : 'text-gray-400'}`}>
                Médico Independiente
              </p>
              <p className="text-sm text-gray-400">
                {personalClinic 
                  ? 'Trabajar con tu consultorio personal' 
                  : 'No tienes un consultorio personal asignado'}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            {personalClinic ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="ml-2 text-sm text-green-400">Activo</span>
              </>
            ) : (
              <>
                <X className="h-5 w-5 text-gray-500" />
                <span className="ml-2 text-sm text-gray-500">Inactivo</span>
              </>
            )}
          </div>
        </div>

        {personalClinic && (
          <div className="mt-3 pl-8 text-sm text-gray-300">
            📋 {personalClinic.name}
          </div>
        )}
        
        {!personalClinic && (
          <div className="mt-3 pl-8 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
            <p className="text-sm text-yellow-300">
              ⚠️ <strong>Nota:</strong> Solo los médicos con consultorio personal pueden trabajar como independientes.
              Actualmente solo perteneces a clínicas institucionales.
            </p>
          </div>
        )}
      </div>

      {/* Additional Clinics Toggle */}
      <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <UserPlus className="h-5 w-5 text-purple-400 mr-3" />
            <div>
              <p className="font-medium text-white">También pertenezco a otra clínica</p>
              <p className="text-sm text-gray-400">
                Únete a clínicas institucionales adicionales
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggleAdditionalClinics(!allowAdditionalClinics)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              allowAdditionalClinics ? 'bg-cyan-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                allowAdditionalClinics ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Show additional clinic management when enabled */}
        {allowAdditionalClinics && (
          <div className="pl-8 space-y-4">
            {/* Associated Clinics */}
            {associatedClinics.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">
                  📋 Clínicas Asociadas ({associatedClinics.length})
                </p>
                <div className="space-y-2">
                  {associatedClinics.map((membership) => (
                    <div
                      key={membership.id}
                      className="bg-gray-700/50 rounded p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm text-white font-medium">
                          {membership.clinic.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          Rol: {membership.role_in_clinic}
                        </p>
                      </div>
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <MailCheck className="h-4 w-4 mr-1" />
                  Invitaciones Pendientes ({pendingInvitations.length})
                </p>
                <div className="space-y-2">
                  {pendingInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="bg-blue-900/20 border border-blue-700/50 rounded p-3"
                    >
                      <p className="text-sm text-white font-medium mb-1">
                        {invitation.clinic.name}
                      </p>
                      <p className="text-xs text-gray-400 mb-3">
                        Te invitó a unirte a su clínica
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptInvitation(invitation.id)}
                          disabled={processingInvitation === invitation.id}
                          className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          {processingInvitation === invitation.id ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            <>
                              <Check className="h-3 w-3" />
                              Aceptar
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleRejectInvitation(invitation.id)}
                          disabled={processingInvitation === invitation.id}
                          className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          {processingInvitation === invitation.id ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3" />
                              Rechazar
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Requests (sent by user) */}
            {pendingRequests.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Solicitudes Enviadas ({pendingRequests.length})
                </p>
                <div className="space-y-2">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="bg-yellow-900/20 border border-yellow-700/50 rounded p-3"
                    >
                      <p className="text-sm text-white font-medium">
                        {request.clinic.name}
                      </p>
                      <p className="text-xs text-yellow-400">
                        Pendiente de aprobación
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Request to Join Button */}
            <button
              onClick={() => {
                // TODO: Open clinic search and request modal
                setSuccess('Funcionalidad de búsqueda de clínicas en desarrollo');
              }}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Solicitar unirme a otra clínica
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
