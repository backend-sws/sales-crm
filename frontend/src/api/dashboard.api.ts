import api from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type { DashboardMetrics } from '@/types/dashboard.types';

export const dashboardApi = {
  /**
   * Get real-time aggregated dashboard telemetry.
   */
  async getMetrics(): Promise<ApiResponse<DashboardMetrics>> {
    const response = await api.get<ApiResponse<DashboardMetrics>>('/dashboard');
    return response.data;
  },
};
