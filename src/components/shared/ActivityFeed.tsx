import React from 'react';
import { 
  Stethoscope, Users, FileText, Activity, Clock, Calendar,
  User, CheckCircle, AlertCircle, Info, ChevronRight
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'consultation' | 'prescription' | 'patient_created' | 'appointment' | 'test_result' | 'note';
  title: string;
  description: string;
  date: string;
  patientName?: string;
  status?: 'completed' | 'pending' | 'cancelled' | 'scheduled';
  priority?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  onActivityClick?: (activity: ActivityItem) => void;
  showEmptyState?: boolean;
  className?: string;
  maxItems?: number;
}

export default function ActivityFeed({
  activities,
  onActivityClick,
  showEmptyState = true,
  className = '',
  maxItems
}: ActivityFeedProps) {
  const displayActivities = maxItems ? activities.slice(0, maxItems) : activities;

  const getActivityIcon = (type: string, status?: string) => {
    const iconClass = "h-4 w-4";
    
    switch (type) {
      case 'consultation':
        return <Stethoscope className={`${iconClass} text-blue-400`} />;
      case 'prescription':
        return <FileText className={`${iconClass} text-green-400`} />;
      case 'patient_created':
        return <Users className={`${iconClass} text-purple-400`} />;
      case 'appointment':
        return <Calendar className={`${iconClass} text-orange-400`} />;
      case 'test_result':
        return <Activity className={`${iconClass} text-cyan-400`} />;
      case 'note':
        return <Info className={`${iconClass} text-yellow-400`} />;
      default:
        return <Activity className={`${iconClass} text-gray-400`} />;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-400" />;
      case 'pending':
        return <Clock className="h-3 w-3 text-yellow-400" />;
      case 'cancelled':
        return <AlertCircle className="h-3 w-3 text-red-400" />;
      case 'scheduled':
        return <Calendar className="h-3 w-3 text-blue-400" />;
      default:
        return null;
    }
  };

  const getPriorityBorder = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-4 border-red-400';
      case 'medium':
        return 'border-l-4 border-yellow-400';
      case 'low':
        return 'border-l-4 border-green-400';
      default:
        return 'border-l-4 border-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return `Hoy ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 2) {
      return `Ayer ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays <= 7) {
      return `Hace ${diffDays - 1} días`;
    } else {
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (displayActivities.length === 0 && showEmptyState) {
    return (
      <div className={`bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6 ${className}`}>
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">No hay actividad reciente</h3>
          <p className="text-gray-500 text-sm">
            La actividad aparecerá aquí cuando realices consultas, prescripciones o registres pacientes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6 ${className}`}>
      <h3 className="text-xl font-semibold mb-6 flex items-center text-white">
        <Activity className="h-6 w-6 text-cyan-400 mr-2" />
        Actividad Reciente
        {maxItems && activities.length > maxItems && (
          <span className="ml-auto text-sm text-gray-400">
            {maxItems} de {activities.length}
          </span>
        )}
      </h3>
      
      <div className="space-y-3">
        {displayActivities.map((activity, index) => (
          <div
            key={activity.id}
            className={`
              flex items-center p-4 bg-gray-700/50 rounded-lg transition-all duration-200
              ${getPriorityBorder(activity.priority)}
              ${onActivityClick ? 'cursor-pointer hover:bg-gray-700 hover:scale-[1.02]' : ''}
            `}
            onClick={() => onActivityClick?.(activity)}
          >
            {/* Icon */}
            <div className="flex-shrink-0 mr-4">
              <div className="relative">
                {getActivityIcon(activity.type, activity.status)}
                {activity.status && (
                  <div className="absolute -bottom-1 -right-1">
                    {getStatusIcon(activity.status)}
                  </div>
                )}
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-grow min-w-0">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-white text-sm truncate">
                    {activity.title}
                  </h4>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                    {activity.description}
                  </p>
                  
                  {activity.patientName && (
                    <div className="flex items-center mt-2">
                      <User className="h-3 w-3 text-cyan-400 mr-1" />
                      <span className="text-xs text-cyan-400 font-medium">
                        {activity.patientName}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Date and Arrow */}
                <div className="flex-shrink-0 ml-4 text-right">
                  <p className="text-xs text-gray-500 mb-1">
                    {formatDate(activity.date)}
                  </p>
                  
                  {activity.status && (
                    <span className={`
                      inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                      ${activity.status === 'completed' ? 'bg-green-900/50 text-green-300' : ''}
                      ${activity.status === 'pending' ? 'bg-yellow-900/50 text-yellow-300' : ''}
                      ${activity.status === 'cancelled' ? 'bg-red-900/50 text-red-300' : ''}
                      ${activity.status === 'scheduled' ? 'bg-blue-900/50 text-blue-300' : ''}
                    `}>
                      {activity.status === 'completed' && 'Completado'}
                      {activity.status === 'pending' && 'Pendiente'}
                      {activity.status === 'cancelled' && 'Cancelado'}
                      {activity.status === 'scheduled' && 'Programado'}
                    </span>
                  )}
                  
                  {onActivityClick && (
                    <ChevronRight className="h-4 w-4 text-gray-500 mt-1 mx-auto" />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ver más button */}
      {maxItems && activities.length > maxItems && (
        <div className="mt-4 text-center">
          <button className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors">
            Ver todas las actividades ({activities.length - maxItems} más)
          </button>
        </div>
      )}
    </div>
  );
}
