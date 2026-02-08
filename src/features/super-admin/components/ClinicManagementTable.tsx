import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Building, Users, CheckCircle, Eye, Trash2 } from 'lucide-react';
import type { Database } from '@/lib/database.types';
import DeleteConfirmationModal from './DeleteConfirmationModal';

type Clinic = Database['public']['Tables']['clinics']['Row'] & {
  doctor_count?: number;
};

export default function ClinicManagementTable() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Delete state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clinicToDelete, setClinicToDelete] = useState<Clinic | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadClinics();
  }, []);

  const loadClinics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clinics')
        .select(`
          *,
          clinic_user_relationships(count)
        `);

      if (error) throw error;

      // Query type definition
      type ClinicResponse = Clinic & {
        clinic_user_relationships: { count: number }[] | null;
      };

      const clinicsWithCounts = ((data as unknown as ClinicResponse[]) || []).map((clinic) => ({
        ...clinic,
        doctor_count: clinic.clinic_user_relationships?.[0]?.count || 0 
      }));

      setClinics(clinicsWithCounts);
    } catch (error) {
      console.error('Error loading clinics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (clinic: Clinic) => {
    setClinicToDelete(clinic);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!clinicToDelete) return;

    try {
      setIsDeleting(true);
      
      const { error } = await supabase
        .from('clinics')
        .delete()
        .eq('id', clinicToDelete.id);

      if (error) throw error;

      // Remove from UI
      setClinics(prev => prev.filter(c => c.id !== clinicToDelete.id));
      setDeleteModalOpen(false);
      setClinicToDelete(null);
    } catch (error) {
      console.error('Error deleting clinic:', error);
      alert('Error al eliminar la clínica. Revisa la consola para más detalles.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Cargando clínicas...</div>;
  }

  return (
    <>
      <div className="bg-[#1A1F2B] rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Building className="h-5 w-5 text-cyan-400" />
              Gestión de Clínicas
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Supervisa todas las clínicas registradas y su estado de suscripción.
            </p>
          </div>
          <div className="bg-cyan-500/10 text-cyan-400 px-4 py-2 rounded-lg text-sm font-medium">
            Total: {clinics.length} Clínicas
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-sm">
                <th className="p-4 font-medium">Nombre de la Clínica</th>
                <th className="p-4 font-medium">Dirección</th>
                <th className="p-4 font-medium text-center">Miembros</th>
                <th className="p-4 font-medium text-center">Estatus de Pago</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {clinics.map((clinic) => (
                <tr key={clinic.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-white">{clinic.name}</div>
                    <div className="text-xs text-gray-500">{clinic.id}</div>
                  </td>
                  <td className="p-4 text-gray-400 text-sm max-w-xs truncate">
                    {clinic.address || 'Sin dirección'}
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center gap-1 bg-gray-800 px-2 py-1 rounded text-xs text-gray-300">
                      <Users className="h-3 w-3" />
                      {clinic.doctor_count || 'N/A'} 
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-medium border border-green-500/20">
                      <CheckCircle className="h-3 w-3" />
                      Pagado
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(clinic)}
                        className="text-gray-400 hover:text-red-400 transition-colors p-2 hover:bg-gray-700 rounded-lg"
                        title="Eliminar Clínica"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar Clínica?"
        message="Esta acción eliminará la clínica y TODOS sus datos asociados (incluyendo pacientes, citas y relaciones de usuarios). No podrás recuperar esta información."
        itemName={clinicToDelete?.name}
        loading={isDeleting}
      />
    </>
  );
}
