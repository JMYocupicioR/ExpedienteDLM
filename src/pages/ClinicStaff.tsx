import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
  Users,
  UserPlus,
  Mail,
  Phone,
  Calendar,
  Shield,
  ArrowLeft,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  UserCheck,
  UserX
} from 'lucide-react';

interface StaffMember {
  id: string;
  user_id: string;
  role_in_clinic: 'doctor' | 'admin_staff';
  is_active: boolean;
  start_date: string;
  end_date?: string;
  profile?: {
    full_name: string;
    email: string;
    phone?: string;
    specialty?: string;
    license_number?: string;
  };
}

export default function ClinicStaff() {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'doctor' | 'admin_staff'>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    if (profile?.clinic_id) {
      loadStaff();
    }
  }, [profile]);

  const loadStaff = async () => {
    if (!profile?.clinic_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clinic_user_relationships')
        .select(`
          *,
          profile:profiles!clinic_user_relationships_user_id_fkey (
            full_name,
            email,
            phone,
            specialty,
            license_number
          )
        `)
        .eq('clinic_id', profile.clinic_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStaff(data || []);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStaffStatus = async (staffId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('clinic_user_relationships')
        .update({ is_active: !currentStatus })
        .eq('id', staffId);

      if (error) throw error;

      // Recargar lista
      loadStaff();
    } catch (error) {
      console.error('Error updating staff status:', error);
    }
  };

  const removeStaffMember = async (staffId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este miembro del personal?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clinic_user_relationships')
        .delete()
        .eq('id', staffId);

      if (error) throw error;

      // Recargar lista
      loadStaff();
    } catch (error) {
      console.error('Error removing staff member:', error);
    }
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch = searchTerm === '' || 
      member.profile?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.profile?.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === 'all' || member.role_in_clinic === filterRole;

    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/clinic/summary"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-white">Personal de la Clínica</h1>
                <p className="text-sm text-gray-400">Gestiona el equipo médico y administrativo</p>
              </div>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invitar Personal
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Personal"
            value={staff.length}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Doctores"
            value={staff.filter(s => s.role_in_clinic === 'doctor').length}
            icon={UserCheck}
            color="green"
          />
          <StatCard
            title="Administrativos"
            value={staff.filter(s => s.role_in_clinic === 'admin_staff').length}
            icon={Shield}
            color="purple"
          />
          <StatCard
            title="Personal Activo"
            value={staff.filter(s => s.is_active).length}
            icon={UserCheck}
            color="cyan"
          />
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>

            {/* Role Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as any)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="all">Todos los roles</option>
                <option value="doctor">Solo Doctores</option>
                <option value="admin_staff">Solo Administrativos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Staff List */}
        <div className="space-y-4">
          {filteredStaff.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
              <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No se encontraron miembros del personal</p>
            </div>
          ) : (
            filteredStaff.map((member) => (
              <div
                key={member.id}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {member.profile?.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {member.profile?.full_name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          member.role_in_clinic === 'doctor' 
                            ? 'bg-green-900 text-green-300' 
                            : 'bg-purple-900 text-purple-300'
                        }`}>
                          {member.role_in_clinic === 'doctor' ? 'Doctor' : 'Administrativo'}
                        </span>
                        {member.profile?.specialty && (
                          <span>{member.profile.specialty}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-center space-x-3 text-sm text-gray-400">
                        {member.profile?.email && (
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            <span>{member.profile.email}</span>
                          </div>
                        )}
                        {member.profile?.phone && (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            <span>{member.profile.phone}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>Desde {new Date(member.start_date).toLocaleDateString('es-ES')}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleStaffStatus(member.id, member.is_active)}
                        className={`p-2 rounded-lg transition-colors ${
                          member.is_active 
                            ? 'bg-green-900 text-green-300 hover:bg-green-800' 
                            : 'bg-red-900 text-red-300 hover:bg-red-800'
                        }`}
                        title={member.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {member.is_active ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => removeStaffMember(member.id)}
                        className="p-2 bg-red-900 text-red-300 rounded-lg hover:bg-red-800 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {member.profile?.license_number && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-sm text-gray-400">
                      Cédula Profesional: <span className="text-white">{member.profile.license_number}</span>
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Invite Modal - Placeholder */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Invitar Personal</h2>
            <p className="text-gray-400 mb-4">
              La funcionalidad de invitación se implementará próximamente.
            </p>
            <button
              onClick={() => setShowInviteModal(false)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: number; 
  icon: any; 
  color: string;
}) {
  const bgColors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    cyan: 'bg-cyan-500'
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${bgColors[color as keyof typeof bgColors]}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}
