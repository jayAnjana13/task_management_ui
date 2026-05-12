import { api } from '@/lib/api';
import { Notification } from '@/types';

interface NotificationListResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    unreadCount: number;
  };
}

export const notificationService = {
  async getNotifications(limit: number = 20): Promise<{ notifications: Notification[]; unreadCount: number }> {
    const response = await api.get<NotificationListResponse>(`/notifications?limit=${limit}`);
    return response.data.data;
  },

  async markAsRead(notificationId: string): Promise<void> {
    await api.patch(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.patch('/notifications/read-all');
  },
};
