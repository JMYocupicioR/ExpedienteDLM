import { supabase } from '../supabase';
import { 
  Notification, 
  CreateNotificationPayload, 
  NotificationFilters,
  NotificationStats,
  NotificationPriority
} from '../database.types';

/**
 * Servicio para manejo de notificaciones en tiempo real
 */
class NotificationService {

  /**
   * Obtiene las notificaciones del usuario actual
   */
  async getNotifications(filters: NotificationFilters = {}): Promise<Notification[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters.is_read !== undefined) {
        query = query.eq('is_read', filters.is_read);
      }

      if (filters.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority);
      }

      if (filters.related_entity_type) {
        query = query.eq('related_entity_type', filters.related_entity_type);
      }

      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1);
      }

      const { data, error } = await query;

      if (error) {
        // Si la tabla no existe, retornar array vacío en lugar de error
        if (error.message.includes('relation "notifications" does not exist')) {
          console.warn('Notifications table not found. Run migration to create it.');
          return [];
        }
        console.error('Error fetching notifications:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getNotifications:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de notificaciones
   */
  async getNotificationStats(): Promise<NotificationStats> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('priority, is_read, created_at');

      if (error) {
        // Si la tabla no existe, retornar stats vacías
        if (error.message.includes('relation "notifications" does not exist')) {
          console.warn('Notifications table not found. Run migration to create it.');
          return {
            total: 0,
            unread: 0,
            by_priority: { low: 0, normal: 0, high: 0, urgent: 0 },
            recent: [],
          };
        }
        console.error('Error fetching notification stats:', error);
        throw error;
      }

      const stats: NotificationStats = {
        total: data?.length || 0,
        unread: 0,
        by_priority: {
          low: 0,
          normal: 0,
          high: 0,
          urgent: 0,
        },
        recent: [],
      };

      data?.forEach(notification => {
        if (!notification.is_read) {
          stats.unread++;
        }
        stats.by_priority[notification.priority as NotificationPriority]++;
      });

      // Obtener notificaciones recientes (últimas 5)
      const recentNotifications = await this.getNotifications({ limit: 5 });
      stats.recent = recentNotifications;

      return stats;
    } catch (error) {
      console.error('Error in getNotificationStats:', error);
      throw error;
    }
  }

  /**
   * Marca una notificación como leída
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) {
        if (error.message.includes('relation "notifications" does not exist')) {
          console.warn('Notifications table not found. Skipping mark as read operation.');
          return;
        }
        console.error('Error marking notification as read:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in markAsRead:', error);
      throw error;
    }
  }

  /**
   * Marca múltiples notificaciones como leídas
   */
  async markMultipleAsRead(notificationIds: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .in('id', notificationIds);

      if (error) {
        console.error('Error marking multiple notifications as read:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in markMultipleAsRead:', error);
      throw error;
    }
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  async markAllAsRead(): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      throw error;
    }
  }

  /**
   * Elimina una notificación
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      throw error;
    }
  }

  /**
   * Elimina múltiples notificaciones
   */
  async deleteMultipleNotifications(notificationIds: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds);

      if (error) {
        console.error('Error deleting multiple notifications:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteMultipleNotifications:', error);
      throw error;
    }
  }

  /**
   * Elimina todas las notificaciones leídas
   */
  async deleteAllRead(): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('is_read', true);

      if (error) {
        console.error('Error deleting all read notifications:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteAllRead:', error);
      throw error;
    }
  }

  /**
   * Crea una nueva notificación (usualmente para testing o notificaciones manuales)
   */
  async createNotification(data: CreateNotificationPayload): Promise<Notification> {
    try {
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert(data)
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        throw error;
      }

      return notification;
    } catch (error) {
      console.error('Error in createNotification:', error);
      throw error;
    }
  }

  /**
   * Suscribe a cambios en tiempo real de notificaciones
   */
  subscribeToNotifications(
    userId: string,
    onNotification: (notification: Notification) => void,
    onUpdate: (notification: Notification) => void,
    onDelete: (notificationId: string) => void
  ) {
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onNotification(payload.new as Notification);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onUpdate(payload.new as Notification);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onDelete(payload.old.id);
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * Desuscribe de los cambios en tiempo real
   */
  unsubscribeFromNotifications(subscription: any) {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  }
}

// Exportar instancia única del servicio
export const notificationService = new NotificationService();

// Funciones de conveniencia para importar individualmente
export const getNotifications = (filters?: NotificationFilters) => 
  notificationService.getNotifications(filters);

export const getNotificationStats = () => 
  notificationService.getNotificationStats();

export const markAsRead = (notificationId: string) => 
  notificationService.markAsRead(notificationId);

export const markMultipleAsRead = (notificationIds: string[]) => 
  notificationService.markMultipleAsRead(notificationIds);

export const markAllAsRead = () => 
  notificationService.markAllAsRead();

export const deleteNotification = (notificationId: string) => 
  notificationService.deleteNotification(notificationId);

export const deleteMultipleNotifications = (notificationIds: string[]) => 
  notificationService.deleteMultipleNotifications(notificationIds);

export const deleteAllRead = () => 
  notificationService.deleteAllRead();

export const createNotification = (data: CreateNotificationPayload) => 
  notificationService.createNotification(data);

export const subscribeToNotifications = (
  userId: string,
  onNotification: (notification: Notification) => void,
  onUpdate: (notification: Notification) => void,
  onDelete: (notificationId: string) => void
) => notificationService.subscribeToNotifications(userId, onNotification, onUpdate, onDelete);

export const unsubscribeFromNotifications = (subscription: any) => 
  notificationService.unsubscribeFromNotifications(subscription);
