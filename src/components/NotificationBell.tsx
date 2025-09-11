import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  BellRing, 
  Check, 
  CheckCircle, 
  X, 
  Trash2, 
  MoreHorizontal,
  AlertCircle,
  Clock,
  Calendar,
  User,
  Settings
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import useNotifications from '@/hooks/shared/useNotifications';
import { Notification, NotificationPriority, NotificationWithSuggestedAction } from '@/lib/database.types';

const priorityConfig = {
  low: { 
    icon: Clock, 
    color: 'text-gray-400',
    bgColor: 'bg-gray-900',
    borderColor: 'border-gray-700'
  },
  normal: { 
    icon: Bell, 
    color: 'text-blue-400',
    bgColor: 'bg-blue-900',
    borderColor: 'border-blue-700'
  },
  high: { 
    icon: BellRing, 
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900',
    borderColor: 'border-yellow-700'
  },
  urgent: { 
    icon: AlertCircle, 
    color: 'text-red-400',
    bgColor: 'bg-red-900',
    borderColor: 'border-red-700'
  },
};

const entityTypeIcons = {
  appointment: Calendar,
  patient: User,
  consultation: Clock,
  clinical_rule: AlertCircle,
  default: Bell,
};

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    stats,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    getUnreadCount,
    refresh
  } = useNotifications({
    autoLoad: true,
    realTime: true,
    filters: { limit: 20 } // Limitar a las últimas 20 notificaciones
  });

  const unreadCount = getUnreadCount();

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedNotifications([]);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    // Marcar como leída si no lo está
    if (!notification.is_read) {
      try {
        await markAsRead(notification.id);
      } catch (error) {
        // Error log removed for security;
      }
    }

    // Navegar si tiene URL de acción
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  const handleSuggestedAction = async (notification: NotificationWithSuggestedAction, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!notification.suggested_action) return;

    const action = notification.suggested_action;
    
    try {
      // Marcar la notificación como leída
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }

      // Ejecutar la acción según el tipo
      switch (action.type) {
        case 'schedule_appointment':
          if (action.data?.patient_id) {
            // Navegar al formulario de citas con datos precargados
            const params = new URLSearchParams({
              patient_id: action.data.patient_id,
              patient_name: action.data.patient_name || '',
              priority: action.data.priority || 'normal',
              notes: action.data.notes || '',
              from_notification: 'true'
            });
            window.location.href = `/citas?${params.toString()}`;
          }
          break;
          
        case 'view_record':
          if (action.data?.patient_id) {
            window.location.href = `/expediente/${action.data.patient_id}`;
          }
          break;
          
        case 'call_patient':
          if (action.data?.patient_name) {
            alert(`Llamar a ${action.data.patient_name}\n\nEsta funcionalidad integrará con el sistema telefónico.`);
          }
          break;
          
        case 'send_reminder':
          if (action.data?.patient_id) {
            alert(`Recordatorio enviado a ${action.data.patient_name || 'paciente'}\n\nEsta funcionalidad integrará con SMS/Email.`);
          }
          break;
          
        default:
          // Warning log removed for security;
      }
    } catch (error) {
      // Error log removed for security;
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      // Error log removed for security;
    }
  };

  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevenir que se ejecute el click de la notificación
    
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      // Error log removed for security;
    }
  };

  const handleDeleteAllRead = async () => {
    try {
      await deleteAllRead();
    } catch (error) {
      // Error log removed for security;
    }
  };

  const toggleNotificationSelection = (notificationId: string) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const renderNotificationIcon = (notification: Notification) => {
    const priorityIcon = priorityConfig[notification.priority].icon;
    const entityIcon = entityTypeIcons[notification.related_entity_type as keyof typeof entityTypeIcons] || entityTypeIcons.default;
    
    return (
      <div className={`relative p-2 rounded-lg ${priorityConfig[notification.priority].bgColor}`}>
        {React.createElement(entityIcon, {
          className: `h-4 w-4 ${priorityConfig[notification.priority].color}`
        })}
        {!notification.is_read && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full"></div>
        )}
      </div>
    );
  };

  const getRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: es 
      });
    } catch {
      return 'Hace un momento';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        title="Notificaciones"
      >
        <Bell className="h-6 w-6" />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-[32rem] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-700 bg-gray-750">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium">
                Notificaciones
                {unreadCount > 0 && (
                  <span className="ml-2 px-2 py-1 bg-red-500 text-xs rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h3>
              
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                    title="Marcar todas como leídas"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                )}
                
                <button
                  onClick={handleDeleteAllRead}
                  className="text-xs text-gray-400 hover:text-red-400"
                  title="Eliminar todas las leídas"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                
                <button
                  onClick={refresh}
                  className="text-xs text-gray-400 hover:text-white"
                  title="Actualizar"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400 mx-auto"></div>
                <p className="mt-2 text-sm">Cargando notificaciones...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Bell className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No hay notificaciones</p>
                {console.warn && (
                  <p className="text-xs text-gray-500 mt-2">
                    Si esperabas notificaciones, ejecuta la migración de la base de datos
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-gray-700 transition-colors cursor-pointer ${
                      !notification.is_read ? 'bg-gray-750' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Icon */}
                      {renderNotificationIcon(notification)}
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {notification.title && (
                          <p className={`text-sm font-medium ${
                            !notification.is_read ? 'text-white' : 'text-gray-300'
                          }`}>
                            {notification.title}
                          </p>
                        )}
                        
                        <p className={`text-sm ${
                          !notification.is_read ? 'text-gray-200' : 'text-gray-400'
                        } line-clamp-2`}>
                          {notification.message}
                        </p>
                        
                        <p className="text-xs text-gray-500 mt-1">
                          {getRelativeTime(notification.created_at)}
                        </p>
                        
                        {/* Suggested Action Button */}
                        {(notification as NotificationWithSuggestedAction).suggested_action && (
                          <div className="mt-2">
                            <button
                              onClick={(e) => handleSuggestedAction(notification as NotificationWithSuggestedAction, e)}
                              className="inline-flex items-center px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-medium rounded-full transition-colors"
                            >
                              <Calendar className="h-3 w-3 mr-1" />
                              {(notification as NotificationWithSuggestedAction).suggested_action?.label || 'Acción'}
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex flex-col items-end space-y-1">
                        {!notification.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="p-1 text-gray-400 hover:text-cyan-400"
                            title="Marcar como leída"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => handleDeleteNotification(notification.id, e)}
                          className="p-1 text-gray-400 hover:text-red-400"
                          title="Eliminar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-700 bg-gray-750">
              <button 
                onClick={() => {
                  setIsOpen(false);
                  // Aquí se podría navegar a una página completa de notificaciones
                }}
                className="w-full text-center text-sm text-cyan-400 hover:text-cyan-300"
              >
                Ver todas las notificaciones
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
