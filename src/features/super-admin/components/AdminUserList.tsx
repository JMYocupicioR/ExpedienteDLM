import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Shield, Mail, UserX } from 'lucide-react';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface AdminUser {
  user_id: string;
  clinic_id: string;
  role_in_clinic: string;
  status: string;
  profiles: {
    email: string;
    first_name: string;
    last_name: string;
  };
  clinics: {
    name: string;
  };
}

export default function AdminUserList() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      // Fetch users with admin-level roles in any clinic
      const { data, error } = await supabase
        .from('clinic_user_relationships')
        .select(`
          user_id,
          clinic_id,
          role_in_clinic,
          status,
          profiles:user_id (email, first_name, last_name),
          clinics:clinic_id (name)
        `)
        .in('role_in_clinic', ['owner', 'director', 'admin_staff', 'super_admin'])
        .eq('is_active', true);

      if (error) throw error;
      
      // Transform data if necessary, or just cast if structure matches
      // The query returns joined data which matches our AdminUser interface structure
      // except that supabase types might not strictly match the nested objects without generated types.
      // We'll use a safe cast for now as we manually verified the structure.
      setAdmins(data as unknown as AdminUser[]);
    } catch (error) {
      console.error('Error loading admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (admin: AdminUser) => {
    setAdminToDelete(admin);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!adminToDelete) return;

    try {
      setIsDeleting(true);
      
      const { error } = await supabase
        .from('clinic_user_relationships')
        .delete()
        .eq('user_id', adminToDelete.user_id)
        .eq('clinic_id', adminToDelete.clinic_id);

      if (error) throw error;

      // Remove from UI
      setAdmins(prev => prev.filter(a => !(a.user_id === adminToDelete.user_id && a.clinic_id === adminToDelete.clinic_id)));
      setDeleteModalOpen(false);
      setAdminToDelete(null);
    } catch (error) {
      console.error('Error removing admin access:', error);
      alert('Error al revocar acceso. Revisa la consola para más detalles.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Cargando administradores...</div>;
  }

  return (
    <>
      <div className="bg-[#1A1F2B] rounded-xl border border-gray-800 overflow-hidden mt-6">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-400" />
            Administradores Globales y de Clínicas
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Lista de todos los usuarios con privilegios administrativos en la plataforma.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-sm">
                <th className="p-4 font-medium">Usuario</th>
                <th className="p-4 font-medium">Rol</th>
                <th className="p-4 font-medium">Clínica</th>
                <th className="p-4 font-medium text-center">Estado</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {admins.map((admin, index) => (
                <tr key={`${admin.user_id}-${admin.clinic_id}-${index}`} className="hover:bg-gray-800/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-500/20 p-2 rounded-full text-purple-400">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-white">
                          {admin.profiles?.first_name 
                            ? `${admin.profiles.first_name} ${admin.profiles.last_name || ''}`
                            : 'Usuario sin nombre'}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {admin.profiles?.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`
                      inline-block px-2 py-1 rounded text-xs font-medium border
                      ${admin.role_in_clinic === 'owner' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                        admin.role_in_clinic === 'super_admin' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'}
                    `}>
                      {admin.role_in_clinic.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-gray-300 text-sm">
                    {admin.clinics?.name || 'N/A'}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-xs ${admin.status === 'approved' ? 'text-green-400' : 'text-gray-400'}`}>
                      {admin.status === 'approved' ? 'Activo' : admin.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDeleteClick(admin)}
                      className="text-gray-400 hover:text-red-400 transition-colors p-2 hover:bg-gray-700 rounded-lg group"
                      title="Revocar Acceso"
                    >
                      <UserX className="h-4 w-4 group-hover:text-red-400" />
                    </button>
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
        title="¿Revocar Acceso Administrativo?"
        message="¿Estás seguro de que deseas eliminar los permisos administrativos de este usuario? El usuario dejará de tener acceso a las funciones de gestión de esta clínica."
        itemName={adminToDelete?.profiles?.email}
        loading={isDeleting}
      />
    </>
  );
}
