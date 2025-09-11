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
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useClinic } from '@/context/ClinicContext';
import { useSimpleClinic } from '@/hooks/useSimpleClinic';
import { supabase } from '@/lib/supabase';

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
  const navigate = useNavigate();
  
  // Usar contexto complejo y hook simple como fallback
  const { activeClinic: contextClinic, clinics, loading: contextLoading, error: contextError } = useClinic();
  const { activeClinic: simpleClinic, loading: simpleLoading, error: simpleError } = useSimpleClinic();
  
  // Usar el que esté disponible
  const activeClinic = contextClinic || simpleClinic;
  const loading = contextLoading || simpleLoading;
  const error = contextError || simpleError;
  
  console.log('ClinicStatusCard - using clinic:', activeClinic?.name || 'null');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userRelationship, setUserRelationship] = useState<any>(null);

  // Load user's relationship with current clinic
  useEffect(() => {
    const loadUserRelationship = async () => {
      if (!activeClinic) {
        setUserRelationship(null);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('clinic_user_relationships')
          .select('*')
          .eq('user_id', user.id)
          .eq('clinic_id', activeClinic.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        setUserRelationship(data);
      } catch (err) {
        // Error log removed for security
      }
    };

    loadUserRelationship();
  }, [activeClinic]);

  const handleSendRequest = async () => {
    if (!activeClinic) {
      setMessage({
        type: 'error',
        text: 'No hay una clínica activa para reenviar la solicitud.'
      });
      return;
    }

    setSendingRequest(true);
    setMessage(null);

    try {
      // Esta lógica podría necesitar una función dedicada en el contexto
      // pero por ahora, la mantenemos simple.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase.from('clinic_user_relationships')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('clinic_id', activeClinic.id);

      if (error) throw error;

      setMessage({ type: 'success', text: "Solicitud reenviada con éxito." });
      // Reload relationship
      const { data } = await supabase
        .from('clinic_user_relationships')
        .select('*')
        .eq('user_id', user.id)
        .eq('clinic_id', activeClinic.id)
        .single();
      setUserRelationship(data);
      onStatusUpdate?.();

    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error al reenviar la solicitud. Inténtalo de nuevo.'
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
  if (!activeClinic || !userRelationship) {
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
                onClick={() => navigate('/buscar-clinicas')}
                variant="outline"
                className="flex items-center"
              >
                <Building className="h-4 w-4 mr-2" />
                Buscar Clínicas
              </Button>
              <Button
                onClick={() => navigate('/registrar-clinica')}
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

  const currentStatus = userRelationship?.status || 'approved';
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
              Estado en {activeClinic.name}
            </h3>
            <button
              onClick={() => window.location.reload()}
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
            {activeClinic.address && (
              <div className="flex items-center text-gray-400">
                <Building className="h-4 w-4 mr-2" />
                <span>{activeClinic.address}</span>
              </div>
            )}
            
            {userRelationship?.role_in_clinic && (
              <div className="flex items-center text-gray-400">
                <User className="h-4 w-4 mr-2" />
                <span className="capitalize">
                  {userRelationship.role_in_clinic === 'doctor' ? 'Médico' : 
                   userRelationship.role_in_clinic === 'admin_staff' ? 'Personal Administrativo' : 'Personal'}
                </span>
              </div>
            )}
            
            {userRelationship?.start_date && (
              <div className="flex items-center text-gray-400">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Miembro desde: {formatDate(userRelationship.start_date)}</span>
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
