import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserCheck, Clock, Building, Mail, Stethoscope, CheckCircle, XCircle } from 'lucide-react';
import type { Database } from '@/lib/database.types';

type ClinicUserRelationship = Database['public']['Tables']['clinic_user_relationships']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type Clinic = Database['public']['Tables']['clinics']['Row'];

interface PendingApproval {
  relationship: ClinicUserRelationship;
  doctor: Profile;
  clinic: Clinic;
}

export default function PendingApprovalsTable() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      
      // Query for pending relationships with user and clinic data
      const { data, error } = await supabase
        .from('clinic_user_relationships')
        .select(`
          *,
          profiles!clinic_user_relationships_user_id_fkey(*),
          clinics!clinic_user_relationships_clinic_id_fkey(*)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Type for the Supabase query response with nested relationships
      type QueryResponse = {
        profiles: Profile;
        clinics: Clinic;
      } & ClinicUserRelationship;

      // Transform the data
      const pendingApprovals: PendingApproval[] = (data || []).map((item: QueryResponse) => ({
        relationship: item as ClinicUserRelationship,
        doctor: item.profiles as Profile,
        clinic: item.clinics as Clinic,
      }));

      setApprovals(pendingApprovals);
    } catch (error) {
      console.error('Error loading pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approval: PendingApproval) => {
    try {
      setActionLoading(approval.relationship.id);
      
      // Get current user for approved_by field
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('clinic_user_relationships')
        .update({
          status: 'approved',
          is_active: true,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', approval.relationship.id);

      if (error) throw error;

      // Remove from UI
      setApprovals(prev => prev.filter(a => a.relationship.id !== approval.relationship.id));
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Error al aprobar la solicitud. Revisa la consola para más detalles.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (approval: PendingApproval) => {
    try {
      setActionLoading(approval.relationship.id);
      
      // Get current user for rejected_by field
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('clinic_user_relationships')
        .update({
          status: 'rejected',
          is_active: false,
          rejected_by: user.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: 'Rechazado por super administrador',
        })
        .eq('id', approval.relationship.id);

      if (error) throw error;

      // Remove from UI
      setApprovals(prev => prev.filter(a => a.relationship.id !== approval.relationship.id));
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Error al rechazar la solicitud. Revisa la consola para más detalles.');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Cargando solicitudes pendientes...</div>;
  }

  if (approvals.length === 0) {
    return (
      <div className="bg-[#1A1F2B] rounded-xl border border-gray-800 p-12">
        <div className="text-center">
          <UserCheck className="h-16 w-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No hay solicitudes pendientes
          </h3>
          <p className="text-gray-400">
            Todas las solicitudes de acceso a clínicas han sido procesadas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1A1F2B] rounded-xl border border-gray-800 overflow-hidden">
      <div className="p-6 border-b border-gray-800 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-cyan-400" />
            Aprobaciones Pendientes
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Médicos que han solicitado unirse a clínicas y esperan aprobación.
          </p>
        </div>
        <div className="bg-amber-500/10 text-amber-400 px-4 py-2 rounded-lg text-sm font-medium">
          Pendientes: {approvals.length}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-sm">
              <th className="p-4 font-medium">Médico</th>
              <th className="p-4 font-medium">Clínica Solicitada</th>
              <th className="p-4 font-medium">Fecha de Solicitud</th>
              <th className="p-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {approvals.map((approval) => (
              <tr key={approval.relationship.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="p-4">
                  <div className="space-y-1">
                    <div className="font-medium text-white">
                      {approval.doctor.full_name || 'Sin nombre'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Mail className="h-3 w-3" />
                      {approval.doctor.email}
                    </div>
                    {approval.doctor.specialty && (
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Stethoscope className="h-3 w-3" />
                        {approval.doctor.specialty}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="space-y-1">
                    <div className="font-medium text-white flex items-center gap-2">
                      <Building className="h-4 w-4 text-cyan-400" />
                      {approval.clinic.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {approval.clinic.type}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Clock className="h-4 w-4 text-gray-400" />
                    {formatDate(approval.relationship.created_at)}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleApprove(approval)}
                      disabled={actionLoading === approval.relationship.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Aprobar solicitud"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {actionLoading === approval.relationship.id ? 'Procesando...' : 'Aprobar'}
                    </button>
                    <button
                      onClick={() => handleReject(approval)}
                      disabled={actionLoading === approval.relationship.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Rechazar solicitud"
                    >
                      <XCircle className="h-4 w-4" />
                      {actionLoading === approval.relationship.id ? 'Procesando...' : 'Rechazar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
