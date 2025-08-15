import { useState, useEffect, useCallback } from 'react';
import { 
  Notification, 
  NotificationFilters,
  NotificationStats,
  NotificationPriority
} from '../lib/database.types';
import { notificationService } from '../lib/services/notification-service';
import { useAuth } from './useAuth';

export interface UseNotificationsOptions {
  autoLoad?: boolean;
  realTime?: boolean;
  filters?: NotificationFilters;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  stats: NotificationStats | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  loadNotifications: (filters?: NotificationFilters) => Promise<void>;
  loadStats: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markMultipleAsRead: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteMultipleNotifications: (notificationIds: string[]) => Promise<void>;
  deleteAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // Utility functions
  getUnreadCount: () => number;
  getNotificationsByPriority: (priority: NotificationPriority) => Notification[];
  getRecentNotifications: (limit?: number) => Notification[];
}

export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const { autoLoad = true, realTime = true, filters: initialFilters } = options;
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<NotificationFilters | undefined>(initialFilters);

  // Load notifications
  const loadNotifications = useCallback(async (filters?: NotificationFilters) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const filtersToUse = filters || currentFilters;
      const data = await notificationService.getNotifications(filtersToUse);
      setNotifications(data);
      setCurrentFilters(filtersToUse);
    } catch (err) {
      // Si la tabla no existe, no es realmente un error para el usuario
      if (err instanceof Error && err.message.includes('relation "notifications" does not exist')) {
        console.warn('Notifications table not found. Please run the migration.');
        setNotifications([]);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Error al cargar las notificaciones';
        setError(errorMessage);
        console.error('Error loading notifications:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [user, currentFilters]);

  // Load stats
  const loadStats = useCallback(async () => {
    if (!user) return;
    
    try {
      const statsData = await notificationService.getNotificationStats();
      setStats(statsData);
    } catch (err) {
      if (err instanceof Error && err.message.includes('relation "notifications" does not exist')) {
        console.warn('Notifications table not found. Stats will remain empty.');
        setStats({
          total: 0,
          unread: 0,
          by_priority: { low: 0, normal: 0, high: 0, urgent: 0 },
          recent: [],
        });
      } else {
        console.error('Error loading notification stats:', err);
      }
    }
  }, [user]);

  // Mark as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        )
      );
      
      // Update stats
      setStats(prev => prev ? {
        ...prev,
        unread: prev.unread - 1
      } : null);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al marcar como leída';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Mark multiple as read
  const markMultipleAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      await notificationService.markMultipleAsRead(notificationIds);
      
      const readAt = new Date().toISOString();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notificationIds.includes(notification.id)
            ? { ...notification, is_read: true, read_at: readAt }
            : notification
        )
      );
      
      // Update stats
      const unreadCount = notifications.filter(n => 
        notificationIds.includes(n.id) && !n.is_read
      ).length;
      
      setStats(prev => prev ? {
        ...prev,
        unread: prev.unread - unreadCount
      } : null);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al marcar como leídas';
      setError(errorMessage);
      throw err;
    }
  }, [notifications]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      
      const readAt = new Date().toISOString();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({
          ...notification,
          is_read: true,
          read_at: notification.read_at || readAt
        }))
      );
      
      // Update stats
      setStats(prev => prev ? { ...prev, unread: 0 } : null);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al marcar todas como leídas';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      
      // Update local state
      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update stats
      if (deletedNotification) {
        setStats(prev => prev ? {
          ...prev,
          total: prev.total - 1,
          unread: deletedNotification.is_read ? prev.unread : prev.unread - 1,
          by_priority: {
            ...prev.by_priority,
            [deletedNotification.priority]: prev.by_priority[deletedNotification.priority] - 1
          }
        } : null);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar la notificación';
      setError(errorMessage);
      throw err;
    }
  }, [notifications]);

  // Delete multiple notifications
  const deleteMultipleNotifications = useCallback(async (notificationIds: string[]) => {
    try {
      await notificationService.deleteMultipleNotifications(notificationIds);
      
      // Get deleted notifications for stats update
      const deletedNotifications = notifications.filter(n => notificationIds.includes(n.id));
      
      // Update local state
      setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)));
      
      // Update stats
      if (deletedNotifications.length > 0) {
        const unreadCount = deletedNotifications.filter(n => !n.is_read).length;
        const priorityCounts = deletedNotifications.reduce((acc, n) => {
          acc[n.priority] = (acc[n.priority] || 0) + 1;
          return acc;
        }, {} as Record<NotificationPriority, number>);
        
        setStats(prev => prev ? {
          ...prev,
          total: prev.total - deletedNotifications.length,
          unread: prev.unread - unreadCount,
          by_priority: {
            low: prev.by_priority.low - (priorityCounts.low || 0),
            normal: prev.by_priority.normal - (priorityCounts.normal || 0),
            high: prev.by_priority.high - (priorityCounts.high || 0),
            urgent: prev.by_priority.urgent - (priorityCounts.urgent || 0),
          }
        } : null);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar las notificaciones';
      setError(errorMessage);
      throw err;
    }
  }, [notifications]);

  // Delete all read notifications
  const deleteAllRead = useCallback(async () => {
    try {
      await notificationService.deleteAllRead();
      
      // Get read notifications for stats update
      const readNotifications = notifications.filter(n => n.is_read);
      
      // Update local state
      setNotifications(prev => prev.filter(n => !n.is_read));
      
      // Update stats
      if (readNotifications.length > 0) {
        const priorityCounts = readNotifications.reduce((acc, n) => {
          acc[n.priority] = (acc[n.priority] || 0) + 1;
          return acc;
        }, {} as Record<NotificationPriority, number>);
        
        setStats(prev => prev ? {
          ...prev,
          total: prev.total - readNotifications.length,
          by_priority: {
            low: prev.by_priority.low - (priorityCounts.low || 0),
            normal: prev.by_priority.normal - (priorityCounts.normal || 0),
            high: prev.by_priority.high - (priorityCounts.high || 0),
            urgent: prev.by_priority.urgent - (priorityCounts.urgent || 0),
          }
        } : null);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar notificaciones leídas';
      setError(errorMessage);
      throw err;
    }
  }, [notifications]);

  // Refresh both notifications and stats
  const refresh = useCallback(async () => {
    await Promise.all([loadNotifications(), loadStats()]);
  }, [loadNotifications, loadStats]);

  // Utility functions
  const getUnreadCount = useCallback((): number => {
    return notifications.filter(n => !n.is_read).length;
  }, [notifications]);

  const getNotificationsByPriority = useCallback((priority: NotificationPriority): Notification[] => {
    return notifications.filter(n => n.priority === priority);
  }, [notifications]);

  const getRecentNotifications = useCallback((limit: number = 5): Notification[] => {
    return notifications.slice(0, limit);
  }, [notifications]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && user) {
      refresh();
    }
  }, [autoLoad, user, refresh]);

  // Real-time subscription
  useEffect(() => {
    if (!realTime || !user) return;

    const subscription = notificationService.subscribeToNotifications(
      user.id,
      // On new notification
      (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setStats(prev => prev ? {
          ...prev,
          total: prev.total + 1,
          unread: prev.unread + 1,
          by_priority: {
            ...prev.by_priority,
            [notification.priority]: prev.by_priority[notification.priority] + 1
          }
        } : null);
      },
      // On notification update
      (notification) => {
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? notification : n)
        );
      },
      // On notification delete
      (notificationId) => {
        const deletedNotification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        if (deletedNotification && stats) {
          setStats(prev => prev ? {
            ...prev,
            total: prev.total - 1,
            unread: deletedNotification.is_read ? prev.unread : prev.unread - 1,
            by_priority: {
              ...prev.by_priority,
              [deletedNotification.priority]: prev.by_priority[deletedNotification.priority] - 1
            }
          } : null);
        }
      }
    );

    return () => {
      notificationService.unsubscribeFromNotifications(subscription);
    };
  }, [realTime, user, notifications, stats]);

  return {
    notifications,
    stats,
    loading,
    error,
    
    // Actions
    loadNotifications,
    loadStats,
    markAsRead,
    markMultipleAsRead,
    markAllAsRead,
    deleteNotification,
    deleteMultipleNotifications,
    deleteAllRead,
    refresh,
    
    // Utility functions
    getUnreadCount,
    getNotificationsByPriority,
    getRecentNotifications,
  };
}

export default useNotifications;
