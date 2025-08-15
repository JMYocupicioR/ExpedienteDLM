import React, { useState, useEffect } from 'react';
import { 
  Building, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Send, 
  Loader2,
  RefreshCw,
  Calendar,
  User
} from 'lucide-react';
import { Button } from './ui/button';
import { ClinicStaffService } from '../lib/services/clinic-staff-service';
import { useAuth } from '../hooks/useAuth';

interface ClinicStatusCardProps {
  onStatusUpdate?: () => void;
}

interface ClinicStatus {
  hasRelationship: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  clinic?: {
    id: string;
    name: string;
    type: string;
  };
  role_in_clinic?: 'doctor' | 'admin_staff';
  created_at?: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900',
    borderColor: 'border-yellow-700',
    label: 'Pendiente de Aprobación',
    description: 'Tu solicitud está siendo revisada por los administradores'
  },
  approved: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-900',
    borderColor: 'border-green-700',
    label: 'Aprobado',
    description: 'Tienes acceso completo a la clínica'
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-900',
    borderColor: 'border-red-700',
    label: 'Rechazado',
    description: 'Tu solicitud fue rechazada'
  }
};

export default function ClinicStatusCard({ onStatusUpdate }: ClinicStatusCardProps) {
  const { user } = useAuth();
  const [clinicStatus, setClinicStatus] = useState<ClinicStatus>({ hasRelationship: false });
  const [loading, setLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadClinicStatus = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const status = await ClinicStaffService.getUserClinicStatus(user.id);
      setClinicStatus(status);
    } catch (error) {
      console.error('Error loading clinic status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClinicStatus();
  }, [user?.id]);

  const handleSendRequest = async () => {
    if (!clinicStatus.clinic?.id) {
      // Si no hay clínica, redirigir a búsqueda o registro
      setMessage({
        type: 'error',
        text: 'Primero debes registrarte en una clínica o buscar clínicas disponibles'
      });
      return;
    }

    setSendingRequest(true);
    setMessage(null);

    try {
      const result = await ClinicStaffService.resendClinicRequest(
        clinicStatus.clinic.id,
        'doctor' // Asumiendo que el perfil es de doctor
      );

      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        // Recargar el estado después de enviar
        await loadClinicStatus();
        onStatusUpdate?.();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error al enviar la solicitud. Inténtalo de nuevo.'
      });
    } finally {
      setSendingRequest(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          <span className="ml-2 text-gray-300">Cargando estado de clínica...</span>
        </div>
      </div>
    );
  }

  // Usuario sin relación con clínica
  if (!clinicStatus.hasRelationship) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-gray-700 rounded-lg">
            <Building className="h-6 w-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">
              Estado de Clínica
            </h3>
            <div className="text-gray-300 mb-4">
              <p>No estás asociado a ninguna clínica</p>
              <p className="text-sm text-gray-400 mt-1">
                Para acceder a las funcionalidades completas, debes solicitar acceso a una clínica
              </p>
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={() => window.location.href = '/buscar-clinicas'}
                variant="outline"
                className="flex items-center"
              >
                <Building className="h-4 w-4 mr-2" />
                Buscar Clínicas
              </Button>
              <Button
                onClick={() => window.location.href = '/registrar-clinica'}
                className="flex items-center"
              >
                <Building className="h-4 w-4 mr-2" />
                Registrar Nueva Clínica
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentStatus = clinicStatus.status!;
  const config = statusConfig[currentStatus];
  const StatusIcon = config.icon;

  return (
    <div className={`bg-gray-800/50 backdrop-blur-xl rounded-2xl border p-6 ${config.borderColor}`}>
      <div className="flex items-start space-x-4">
        <div className={`p-3 rounded-lg ${config.bgColor}`}>
          <StatusIcon className={`h-6 w-6 ${config.color}`} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-white">
              Estado en {clinicStatus.clinic?.name}
            </h3>
            <button
              onClick={loadClinicStatus}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="Actualizar estado"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color} border ${config.borderColor}`}>
            <StatusIcon className="h-4 w-4 mr-2" />
            {config.label}
          </div>
          
          <p className="text-gray-300 mt-2">{config.description}</p>
          
          {/* Información adicional según el estado */}
          <div className="mt-4 space-y-2 text-sm">
            {clinicStatus.clinic && (
              <div className="flex items-center text-gray-400">
                <Building className="h-4 w-4 mr-2" />
                <span className="capitalize">{clinicStatus.clinic.type}</span>
              </div>
            )}
            
            {clinicStatus.role_in_clinic && (
              <div className="flex items-center text-gray-400">
                <User className="h-4 w-4 mr-2" />
                <span className="capitalize">
                  {clinicStatus.role_in_clinic === 'doctor' ? 'Médico' : 'Personal Administrativo'}
                </span>
              </div>
            )}
            
            {clinicStatus.created_at && (
              <div className="flex items-center text-gray-400">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Solicitud enviada: {formatDate(clinicStatus.created_at)}</span>
              </div>
            )}
            
            {clinicStatus.approved_at && currentStatus === 'approved' && (
              <div className="flex items-center text-green-400">
                <CheckCircle className="h-4 w-4 mr-2" />
                <span>Aprobado: {formatDate(clinicStatus.approved_at)}</span>
              </div>
            )}
            
            {clinicStatus.rejected_at && currentStatus === 'rejected' && (
              <div className="flex items-center text-red-400">
                <XCircle className="h-4 w-4 mr-2" />
                <span>Rechazado: {formatDate(clinicStatus.rejected_at)}</span>
              </div>
            )}
            
            {clinicStatus.rejection_reason && currentStatus === 'rejected' && (
              <div className="mt-3 p-3 bg-red-900 border border-red-700 rounded-lg">
                <p className="text-red-300 text-sm">
                  <strong>Motivo del rechazo:</strong> {clinicStatus.rejection_reason}
                </p>
              </div>
            )}
          </div>
          
          {/* Acciones según el estado */}
          <div className="mt-4 flex items-center space-x-3">
            {currentStatus === 'rejected' && (
              <Button
                onClick={handleSendRequest}
                disabled={sendingRequest}
                className="flex items-center"
              >
                {sendingRequest ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Reenviar Solicitud
              </Button>
            )}
            
            {currentStatus === 'pending' && (
              <div className="flex items-center text-yellow-400">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span className="text-sm">Esperando revisión del administrador</span>
              </div>
            )}
            
            {currentStatus === 'approved' && (
              <div className="flex items-center text-green-400">
                <CheckCircle className="h-4 w-4 mr-2" />
                <span className="text-sm">Acceso completo a la clínica</span>
              </div>
            )}
          </div>
          
          {/* Mensaje de respuesta */}
          {message && (
            <div className={`mt-3 p-3 rounded-lg border ${
              message.type === 'success' 
                ? 'bg-green-900 border-green-700 text-green-300'
                : 'bg-red-900 border-red-700 text-red-300'
            }`}>
              <p className="text-sm">{message.text}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
