import type { FollowUp } from './followUp.types';

export type LeadPriority = 'hot' | 'warm' | 'cold';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'interested'
  | 'demo_meeting'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export interface LeadSource {
  id: number;
  name: string;
  is_active?: boolean;
}

export interface Product {
  id: number;
  name: string;
  type?: 'software' | 'service' | 'product';
  price_range?: string;
  is_active?: boolean;
}

export interface LeadActivity {
  id: number;
  lead_id: number;
  user_id: number | null;
  type: string;
  payload: Record<string, any> | null;
  created_at: string;
  user?: {
    id: number;
    name: string;
    email?: string;
  } | null;
}

export interface Lead {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  alt_phone: string | null;
  company: string | null;
  city: string | null;
  source: string;
  source_id: number | null;
  priority: LeadPriority;
  status: LeadStatus;
  score: number;
  budget: number | string;
  value: number | string;
  notes: string | null;
  lost_reason: string | null;
  lost_notes: string | null;
  assigned_to: number | null;
  assigned_user?: {
    id: number;
    name: string;
    email: string;
  } | null;
  lead_source?: LeadSource | null;
  products?: Product[];
  pending_follow_ups?: FollowUp[];
  converted_client_id?: number | null;
  created_at: string;
  last_activity_at: string | null;
}

export interface LeadFilterParams {
  search?: string;
  status?: string;
  priority?: string;
  source_id?: number | string;
  assigned_to?: number | string;
  city?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
  segment?: 'unassigned' | 'hot' | 'stale' | 'my_leads' | 'active' | string;
  followup_status?: 'overdue' | 'today' | 'none' | 'scheduled' | string;
  is_unassigned?: boolean;
  score_min?: number;
  score_max?: number;
  value_min?: number;
  value_max?: number;
}

export interface LeadMetadata {
  sources: LeadSource[];
  products: Product[];
  agents: Array<{ id: number; name: string; email: string }>;
}

export type KanbanBoardData = Record<LeadStatus, Lead[]>;

export interface LeadAnalyticsOverview {
  total_leads: number;
  active_leads: number;
  won_leads: number;
  lost_leads: number;
  won_value: number;
  pipeline_value: number;
  unassigned_leads: number;
  stale_leads: number;
  leads_without_followup: number;
}

export interface FunnelStageData {
  stage: string;
  count: number;
  total_value: number;
  conversion_rate: number;
}

export interface LostReasonItem {
  lost_reason: string;
  count: number;
  total_value: number;
}

export interface AgentScoreboardItem {
  agent_id: number;
  name: string;
  email: string;
  assigned_total: number;
  active_count: number;
  won_count: number;
  won_value: number;
  overdue_count: number;
  done_today_count: number;
  stale_count: number;
  win_rate: number;
}

export interface SlaComplianceData {
  under_15m: number;
  under_1h: number;
  under_24h: number;
  breached: number;
}

export interface LeadAnalyticsData {
  overview: LeadAnalyticsOverview;
  funnel: FunnelStageData[];
  lost_reasons: LostReasonItem[];
  agent_matrix: AgentScoreboardItem[];
  sla_compliance: SlaComplianceData;
}

export interface LeadScoreFactor {
  label: string;
  points: number;
  type: string;
}

export interface LeadScoreBreakdown {
  lead_id: number;
  score: number;
  grade: 'hot' | 'warm' | 'cool' | 'cold';
  factors: LeadScoreFactor[];
}

export interface DuplicateCandidate {
  candidate: Lead;
  match_type: 'phone' | 'email' | 'company_contact';
  confidence: number;
  reason: string;
}

