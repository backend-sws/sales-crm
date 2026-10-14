import api from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';

export interface ForecastStage {
  stage: string;
  probability_pct: number;
  lead_count: number;
  raw_value: number;
  weighted_forecast: number;
}

export interface RevenueForecastData {
  stages: Record<string, ForecastStage>;
  summary: {
    raw_open_pipeline: number;
    weighted_forecast_open: number;
    won_revenue: number;
    lost_revenue: number;
    total_expected_revenue: number;
    pipeline_confidence_pct: number;
  };
}

export interface ExecutiveOverviewData {
  metrics: {
    total_leads: number;
    active_deals: number;
    won_deals_count: number;
    lost_deals_count: number;
    win_rate_percentage: number;
    loss_rate_percentage: number;
    avg_deal_size: number;
    follow_up_discipline_pct: number;
  };
  forecast_summary: RevenueForecastData['summary'];
  funnel_breakdown: Record<string, ForecastStage>;
}

export interface LostDealAnalysisData {
  total_lost_count: number;
  total_lost_value: number;
  by_reason: Array<{
    reason: string;
    count: number;
    total_value: number;
    share_percentage: number;
  }>;
  by_agent: Array<{
    agent_id: number;
    agent_name: string;
    count: number;
    total_value: number;
  }>;
  by_source: Array<{
    source: string;
    count: number;
    total_value: number;
  }>;
}

export interface LeaderboardAgent {
  rank: number;
  agent_id: number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string | null;
  total_leads: number;
  active_leads: number;
  won_count: number;
  won_revenue: number;
  conversion_rate_pct: number;
  completed_followups: number;
  avg_deal_size: number;
  badges: Array<{
    label: string;
    icon: string;
    color: string;
  }>;
}

export const analyticsApi = {
  /**
   * Fetch executive overview KPIs.
   */
  async getOverview(params?: Record<string, any>): Promise<ApiResponse<ExecutiveOverviewData>> {
    const response = await api.get<ApiResponse<ExecutiveOverviewData>>('/analytics/overview', { params });
    return response.data;
  },

  /**
   * Fetch revenue forecast with stage probability weights.
   */
  async getForecast(params?: Record<string, any>): Promise<ApiResponse<RevenueForecastData>> {
    const response = await api.get<ApiResponse<RevenueForecastData>>('/analytics/forecast', { params });
    return response.data;
  },

  /**
   * Fetch lost deal analysis breakdown.
   */
  async getLostDealAnalysis(params?: Record<string, any>): Promise<ApiResponse<LostDealAnalysisData>> {
    const response = await api.get<ApiResponse<LostDealAnalysisData>>('/analytics/lost-deal-analysis', { params });
    return response.data;
  },

  /**
   * Fetch sales team gamified leaderboard.
   */
  async getLeaderboard(limit = 10): Promise<ApiResponse<LeaderboardAgent[]>> {
    const response = await api.get<ApiResponse<LeaderboardAgent[]>>('/analytics/leaderboard', {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Fetch single agent performance report.
   */
  async getAgentReport(id: number): Promise<ApiResponse<any>> {
    const response = await api.get<ApiResponse<any>>(`/analytics/agents/${id}`);
    return response.data;
  },
};
