import api from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  FollowUp,
  ScheduleFollowUpPayload,
  CompleteFollowUpPayload,
} from '@/types/followUp.types';

export const followUpsApi = {
  /**
   * Get follow-ups with optional filters (lead_id, agent_id, status, type).
   */
  async getFollowUps(params: {
    lead_id?: number;
    agent_id?: number;
    status?: string;
    type?: string;
  } = {}): Promise<ApiResponse<FollowUp[]>> {
    const response = await api.get<ApiResponse<FollowUp[]>>('/follow-ups', { params });
    return response.data;
  },

  /**
   * Get today's pending follow-ups.
   */
  async getTodayFollowUps(): Promise<ApiResponse<FollowUp[]>> {
    const response = await api.get<ApiResponse<FollowUp[]>>('/follow-ups/today');
    return response.data;
  },

  /**
   * Get overdue pending follow-ups.
   */
  async getOverdueFollowUps(): Promise<ApiResponse<FollowUp[]>> {
    const response = await api.get<ApiResponse<FollowUp[]>>('/follow-ups/overdue');
    return response.data;
  },

  /**
   * Get summary counts for all follow-up buckets (overdue, today, upcoming, completed_today).
   */
  async getSummary(): Promise<ApiResponse<{ overdue: number; today: number; upcoming: number; completed_today: number }>> {
    const response = await api.get<ApiResponse<{ overdue: number; today: number; upcoming: number; completed_today: number }>>('/follow-ups/summary');
    return response.data;
  },

  /**
   * Schedule a new follow-up.
   */
  async scheduleFollowUp(payload: ScheduleFollowUpPayload): Promise<ApiResponse<FollowUp>> {
    const response = await api.post<ApiResponse<FollowUp>>('/follow-ups', payload);
    return response.data;
  },

  /**
   * Complete follow-up with outcome discussion notes and optional next chaining.
   */
  async completeFollowUp(id: number, payload: CompleteFollowUpPayload): Promise<ApiResponse<FollowUp>> {
    const response = await api.patch<ApiResponse<FollowUp>>(`/follow-ups/${id}/complete`, payload);
    return response.data;
  },
};
