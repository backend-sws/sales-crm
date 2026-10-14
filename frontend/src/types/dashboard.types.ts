export interface DashboardSummary {
  total_leads: number;
  total_pipeline_value: number;
  won_deals_value: number;
  conversion_rate_percentage: number;
}

export interface FunnelStageMetric {
  count: number;
  total_value: number;
}

export interface DashboardMetrics {
  summary: DashboardSummary;
  funnel_breakdown: Record<string, FunnelStageMetric>;
  recent_leads: Array<{
    id: number;
    name: string;
    email: string;
    company: string;
    status: string;
    priority?: string;
    score?: number;
    value: string | number;
    budget?: string | number;
    created_at: string;
  }>;
}
