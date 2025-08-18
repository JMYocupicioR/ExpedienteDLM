import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Trash2,
  Edit
} from 'lucide-react';
import ClinicStaffService, { StaffMember, StaffOverview } from '@/lib/services/clinic-staff-service';

interface ClinicStaffManagementProps {
  clinicId: string;
}

interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
  id: string;
}

export default function ClinicStaffManagement({ clinicId }: ClinicStaffManagementProps) {
  const [staffOverview, setStaffOverview] = useState<StaffOverview>({
    approvedStaff: [],
    pendingStaff: [],
    rejectedStaff: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<StaffMember | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Cargar personal de la clínica
  const loadStaff = async () => {
    try {
      setLoading(true);
      const staff = await ClinicStaffService.getClinicStaff(clinicId);
      setStaffOverview(staff);
    } catch (error) {
      console.error('Error cargando personal:', error);
      addNotification('error', 'Error al cargar el personal de la clínica');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [clinicId]);

  // Agregar notificación
  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { type, message, id }]);
    
    // Auto-remover notificación después de 5 segundos
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Aprobar usuario
  const handleApprove = async (user: StaffMember) => {
    try {
      const result = await ClinicStaffService.approveUser(user.id, clinicId);
      
      if (result.success) {
        addNotification('success', result.message);
        await loadStaff(); // Recargar datos
      } else {
        addNotification('error', result.error || 'Error al aprobar usuario');
      }
    } catch (error) {
      addNotification('error', 'Error inesperado al aprobar usuario');
    }
  };

  // Rechazar usuario
  const handleReject = async (user: StaffMember) => {
    setSelectedUser(user);
    setShowRejectionModal(true);
  };

  // Confirmar rechazo
  const confirmReject = async () => {
    if (!selectedUser) return;

    try {
      const result = await ClinicStaffService.rejectUser(
        selectedUser.id, 
        clinicId, 
        rejectionReason
      );
      
      if (result.success) {
        addNotification('success', result.message);
        await loadStaff(); // Recargar datos
        setShowRejectionModal(false);
        setSelectedUser(null);
        setRejectionReason('');
      } else {
        addNotification('error', result.error || 'Error al rechazar usuario');
      }
    } catch (error) {
      addNotification('error', 'Error inesperado al rechazar usuario');
    }
  };

  // Filtrar personal según búsqueda y filtros
  const getFilteredStaff = () => {
    let filtered = [...staffOverview.approvedStaff, ...staffOverview.pendingStaff, ...staffOverview.rejectedStaff];
    
    // Aplicar filtro de estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.status === statusFilter);
    }
    
    // Aplicar búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(member => 
        member.full_name?.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term) ||
        member.role_in_clinic.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  };

  // Obtener estadísticas
  const getStats = () => ({
    total: staffOverview.approvedStaff.length + staffOverview.pendingStaff.length + staffOverview.rejectedStaff.length,
    approved: staffOverview.approvedStaff.length,
    pending: staffOverview.pendingStaff.length,
    rejected: staffOverview.rejectedStaff.length
  });

  const stats = getStats();
  const filteredStaff = getFilteredStaff();

  // Renderizar tarjeta de estadísticas
  const renderStatsCard = (title: string, value: number, icon: React.ReactNode, color: string) => (
    <div className={`bg-gray-800 rounded-lg p-4 border-l-4 border-${color}-500`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
        <div className={`text-${color}-500`}>
          {icon}
        </div>
      </div>
    </div>
  );

  // Renderizar tarjeta de miembro del personal
  const renderStaffCard = (member: StaffMember) => {
    const getStatusIcon = () => {
      switch (member.status) {
        case 'approved':
          return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'pending':
          return <Clock className="h-5 w-5 text-yellow-500" />;
        case 'rejected':
          return <XCircle className="h-5 w-5 text-red-500" />;
        default:
          return <AlertCircle className="h-5 w-5 text-gray-500" />;
      }
    };

    const getStatusColor = () => {
      switch (member.status) {
        case 'approved':
          return 'border-green-500 bg-green-900/20';
        case 'pending':
          return 'border-yellow-500 bg-yellow-900/20';
        case 'rejected':
          return 'border-red-500 bg-red-900/20';
        default:
          return 'border-gray-500 bg-gray-900/20';
      }
    };

    const getRoleLabel = () => {
      return member.role_in_clinic === 'admin_staff' ? 'Administrador' : 'Doctor';
    };

    return (
      <div key={member.id} className={`border-l-4 p-4 rounded-lg ${getStatusColor()}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              {getStatusIcon()}
              <div>
                <h3 className="text-white font-medium">
                  {member.full_name || 'Sin nombre'}
                </h3>
                <p className="text-gray-400 text-sm">{member.email}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                    {getRoleLabel()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(member.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {member.status === 'pending' && (
              <>
                <button
                  onClick={() => handleApprove(member)}
                  className="p-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
                  title="Aprobar usuario"
                >
                  <CheckCircle className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleReject(member)}
                  className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
                  title="Rechazar usuario"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </>
            )}
            
            {member.status === 'approved' && (
              <div className="text-green-400 text-xs">
                Aprobado {member.approved_at && new Date(member.approved_at).toLocaleDateString()}
              </div>
            )}
            
            {member.status === 'rejected' && (
              <div className="text-red-400 text-xs">
                Rechazado {member.rejected_at && new Date(member.rejected_at).toLocaleDateString()}
                {member.rejection_reason && (
                  <div className="mt-1 text-gray-500">
                    Razón: {member.rejection_reason}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 text-cyan-500 animate-spin" />
        <span className="ml-2 text-gray-400">Cargando personal...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notificaciones */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border ${
                notification.type === 'success'
                  ? 'bg-green-900/50 border-green-700 text-green-300'
                  : notification.type === 'error'
                  ? 'bg-red-900/50 border-red-700 text-red-300'
                  : 'bg-blue-900/50 border-blue-700 text-blue-300'
              }`}
            >
              {notification.message}
            </div>
          ))}
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {renderStatsCard('Total Personal', stats.total, <Users className="h-6 w-6" />, 'blue')}
        {renderStatsCard('Aprobados', stats.approved, <UserCheck className="h-6 w-6" />, 'green')}
        {renderStatsCard('Pendientes', stats.pending, <Clock className="h-6 w-6" />, 'yellow')}
        {renderStatsCard('Rechazados', stats.rejected, <UserX className="h-6 w-6" />, 'red')}
      </div>

      {/* Controles de búsqueda y filtros */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o rol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobados</option>
              <option value="rejected">Rechazados</option>
            </select>
            
            <button
              onClick={loadStaff}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
              title="Actualizar"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Personal */}
      <div className="space-y-4">
        {filteredStaff.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-600" />
            <p>No se encontró personal con los filtros aplicados</p>
          </div>
        ) : (
          filteredStaff.map(renderStaffCard)
        )}
      </div>

      {/* Modal de Rechazo */}
      {showRejectionModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              Rechazar Usuario
            </h3>
            
            <div className="mb-4">
              <p className="text-gray-300 mb-2">
                ¿Estás seguro de que quieres rechazar a <strong>{selectedUser.full_name}</strong>?
              </p>
              <p className="text-gray-400 text-sm">
                Este usuario no podrá acceder a los datos de la clínica.
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">
                Razón del rechazo (opcional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Especifica una razón para el rechazo..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                rows={3}
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setSelectedUser(null);
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmReject}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
