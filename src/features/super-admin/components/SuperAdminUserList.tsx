import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Search, Edit2, ShieldAlert, KeyRound, Ban, CheckCircle2 } from 'lucide-react';
import EditUserModal from './EditUserModal';
import DeepDeleteUserModal from './DeepDeleteUserModal';

export interface UserProfileInfo {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  status?: string;
  created_at: string;
  clinics?: {
    name: string;
  } | null;
  clinic_id?: string | null;
}

export default function SuperAdminUserList() {
  const [users, setUsers] = useState<UserProfileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfileInfo | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          role,
          status,
          created_at,
          clinic_id,
          clinics:clinic_id(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setUsers(data as unknown as UserProfileInfo[]);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const [statusFilter, setStatusFilter] = useState('all');

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (user.email.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    // Tratamos el status undefined o null como "active" por compatibilidad con esquema antiguo
    const userStatus = user.status || 'active';
    const matchesStatus = statusFilter === 'all' || userStatus === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleEditClick = (user: UserProfileInfo) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (user: UserProfileInfo) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  const handleSendResetPassword = async (email: string) => {
    if (!window.confirm(`¿Enviar enlace de recuperación de contraseña a ${email}?`)) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      alert(`Correo de recuperación enviado a ${email}`);
    } catch (error) {
      console.error('Error reset password:', error);
      alert('Error enviando correo de recuperación.');
    }
  };

  const handleToggleSuspend = async (user: UserProfileInfo) => {
    const isCurrentlySuspended = user.status === 'suspended';
    const nextStatus = isCurrentlySuspended ? 'active' : 'suspended';
    const actionText = isCurrentlySuspended ? 'reactivar' : 'suspender';

    if (!window.confirm(`¿Estás seguro que deseas ${actionText} a ${user.email}?`)) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({ status: nextStatus })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setUsers(users.map(u => u.id === user.id ? { ...u, status: nextStatus } : u));
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Error cambiando el estado de la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-[#1A1F2B] rounded-xl border border-gray-800 overflow-hidden mt-6">
        <div className="p-6 border-b border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-400" />
              Gestión Completa de Usuarios
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Lista de todas las cuentas registradas. Permite edición y borrado profundo.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 bg-[#0F1218] border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-[#0F1218] border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors appearance-none"
            >
              <option value="all">Todos los Roles</option>
              <option value="doctor">Médico / Doctor</option>
              <option value="patient">Paciente</option>
              <option value="administrator">Administrador de Clínica</option>
              <option value="administrative_assistant">Asistente Administrativo</option>
              <option value="assistant">Asistente / Recepcionista</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0F1218] border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors appearance-none"
            >
              <option value="all">Cualquier Estado</option>
              <option value="active">Activos</option>
              <option value="suspended">Suspendidos</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando usuarios...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-sm">
                  <th className="p-4 font-medium">Usuario</th>
                  <th className="p-4 font-medium">Rol</th>
                  <th className="p-4 font-medium">Clínica Referencia</th>
                  <th className="p-4 font-medium text-center">Registro</th>
                  <th className="p-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      No se encontraron usuarios coincidentes.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            user.role === 'super_admin' ? 'bg-purple-500/20 text-purple-400' :
                            user.role === 'doctor' ? 'bg-cyan-500/20 text-cyan-400' :
                            'bg-gray-700/50 text-gray-400'
                          }`}>
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              {user.full_name || 'Sin nombre asignado'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${
                            user.role === 'super_admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                            user.role === 'doctor' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                            user.role === 'patient' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {user.role.toUpperCase()}
                          </span>
                          {(user.status === 'suspended') && (
                            <span className="inline-block px-2 py-1 rounded text-[10px] uppercase font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                              Suspendido
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-gray-300 text-sm">
                        {user.clinics ? user.clinics.name : <span className="text-gray-600">N/A</span>}
                      </td>
                      <td className="p-4 text-center text-gray-400 text-sm">
                        {new Date(user.created_at).toLocaleDateString('es-MX')}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button 
                            onClick={() => handleSendResetPassword(user.email)}
                            className="text-gray-400 hover:text-blue-400 transition-colors p-2 hover:bg-gray-700 rounded-lg group"
                            title="Recuperar Contraseña"
                          >
                            <KeyRound className="h-4 w-4 group-hover:text-blue-400" />
                          </button>
                          {user.role !== 'super_admin' && (
                            <button 
                              onClick={() => handleToggleSuspend(user)}
                              className={`text-gray-400 transition-colors p-2 hover:bg-gray-700 rounded-lg group ${
                                user.status === 'suspended' ? 'hover:text-emerald-400' : 'hover:text-orange-400'
                              }`}
                              title={user.status === 'suspended' ? "Activar Cuenta" : "Suspender Cuenta"}
                            >
                              {user.status === 'suspended' ? (
                                <CheckCircle2 className="h-4 w-4 group-hover:text-emerald-400" />
                              ) : (
                                <Ban className="h-4 w-4 group-hover:text-orange-400" />
                              )}
                            </button>
                          )}
                          <button 
                            onClick={() => handleEditClick(user)}
                            className="text-gray-400 hover:text-cyan-400 transition-colors p-2 hover:bg-gray-700 rounded-lg group"
                            title="Editar Usuario"
                          >
                            <Edit2 className="h-4 w-4 group-hover:text-cyan-400" />
                          </button>
                          {user.role !== 'super_admin' && (
                            <button 
                              onClick={() => handleDeleteClick(user)}
                              className="text-gray-400 hover:text-red-400 transition-colors p-2 hover:bg-gray-700 rounded-lg group"
                              title="Borrar Permanentemente"
                            >
                              <ShieldAlert className="h-4 w-4 group-hover:text-red-400" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditUserModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        user={selectedUser}
        onSuccess={loadUsers}
      />

      <DeepDeleteUserModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        user={selectedUser}
        onSuccess={loadUsers}
      />
    </>
  );
}
