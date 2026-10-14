import api from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';

export interface NotificationLogItem {
  id: number;
  notifiable_type: string;
  notifiable_id: number;
  channel: 'whatsapp' | 'email' | 'database' | 'push';
  type: string;
  payload: {
    title?: string;
    message?: string;
    lead_name?: string;
    lead_phone?: string;
    lead_score?: number;
    hours_overdue?: number;
    is_escalation?: boolean;
    today_count?: number;
    overdue_count?: number;
    hot_leads_count?: number;
    action_url?: string;
    recipient_name?: string;
    recipient_phone?: string;
    [key: string]: any;
  };
  status: string;
  sent_at: string;
  created_at: string;
}

export const notificationsApi = {
  /**
   * Fetch recent CRM notification logs.
   */
  async getRecent(limit = 15): Promise<ApiResponse<NotificationLogItem[]>> {
    const response = await api.get<ApiResponse<NotificationLogItem[]>>('/notifications/recent', {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Dispatch a test notification via WhatsApp or Email.
   */
  async sendTest(channel = 'whatsapp', message?: string): Promise<ApiResponse<NotificationLogItem>> {
    const response = await api.post<ApiResponse<NotificationLogItem>>('/notifications/test', {
      channel,
      message,
    });
    return response.data;
  },
};
