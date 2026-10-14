import api from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  Lead,
  LeadFilterParams,
  KanbanBoardData,
  LeadMetadata,
  LeadActivity,
  LeadAnalyticsData,
  DuplicateCandidate,
  LeadScoreBreakdown,
} from '@/types/lead.types';

export const leadsApi = {
  /**
   * Get paginated leads with filters.
   */
  async getLeads(params: LeadFilterParams = {}): Promise<ApiResponse<Lead[]>> {
    const response = await api.get<ApiResponse<Lead[]>>('/leads', { params });
    return response.data;
  },

  /**
   * Get anti-loss, velocity, and pipeline conversion analytics.
   */
  async getAnalytics(): Promise<ApiResponse<LeadAnalyticsData>> {
    const response = await api.get<ApiResponse<LeadAnalyticsData>>('/leads/analytics');
    return response.data;
  },

  /**
   * Get leads grouped into 8 pipeline stages for the Kanban board.
   */
  async getKanbanLeads(params: { search?: string; assigned_to?: string } = {}): Promise<ApiResponse<KanbanBoardData>> {
    const response = await api.get<ApiResponse<KanbanBoardData>>('/leads/kanban', { params });
    return response.data;
  },

  /**
   * Get lead metadata (sources, products, agents).
   */
  async getMetadata(): Promise<ApiResponse<LeadMetadata>> {
    const response = await api.get<ApiResponse<LeadMetadata>>('/leads/metadata');
    return response.data;
  },

  /**
   * Get single lead by ID with relationships.
   */
  async getLeadById(id: number): Promise<ApiResponse<Lead>> {
    const response = await api.get<ApiResponse<Lead>>(`/leads/${id}`);
    return response.data;
  },

  /**
   * Get chronological activity timeline feed for a lead.
   */
  async getTimeline(id: number): Promise<ApiResponse<LeadActivity[]>> {
    const response = await api.get<ApiResponse<LeadActivity[]>>(`/leads/${id}/timeline`);
    return response.data;
  },

  /**
   * Create a new lead.
   */
  async createLead(data: Partial<Lead> & { product_ids?: number[] }): Promise<ApiResponse<Lead>> {
    const response = await api.post<ApiResponse<Lead>>('/leads', data);
    return response.data;
  },

  /**
   * Update lead details.
   */
  async updateLead(id: number, data: Partial<Lead> & { product_ids?: number[] }): Promise<ApiResponse<Lead>> {
    const response = await api.put<ApiResponse<Lead>>(`/leads/${id}`, data);
    return response.data;
  },

  /**
   * Update pipeline stage with optional lost reason.
   */
  async updateStatus(
    id: number,
    status: string,
    lostReason?: string,
    lostNotes?: string
  ): Promise<ApiResponse<Lead>> {
    const response = await api.patch<ApiResponse<Lead>>(`/leads/${id}/status`, {
      status,
      lost_reason: lostReason,
      lost_notes: lostNotes,
    });
    return response.data;
  },

  /**
   * Assign lead to an agent.
   */
  async assignLead(id: number, agentId: number): Promise<ApiResponse<Lead>> {
    const response = await api.post<ApiResponse<Lead>>(`/leads/${id}/assign`, {
      agent_id: agentId,
    });
    return response.data;
  },

  /**
   * Bulk reassign leads to an agent.
   */
  async bulkAssign(leadIds: number[], agentId: number): Promise<ApiResponse<{ count: number }>> {
    const response = await api.post<ApiResponse<{ count: number }>>('/leads/bulk-assign', {
      lead_ids: leadIds,
      agent_id: agentId,
    });
    return response.data;
  },

  /**
   * Bulk update status for multiple leads.
   */
  async bulkUpdateStatus(leadIds: number[], status: string): Promise<ApiResponse<{ count: number }>> {
    const response = await api.post<ApiResponse<{ count: number }>>('/leads/bulk-status', {
      lead_ids: leadIds,
      status,
    });
    return response.data;
  },

  /**
   * Merge duplicate lead into master lead.
   */
  async mergeLeads(masterId: number, duplicateId: number): Promise<ApiResponse<Lead>> {
    const response = await api.post<ApiResponse<Lead>>(`/leads/${masterId}/merge`, {
      duplicate_lead_id: duplicateId,
    });
    return response.data;
  },

  /**
   * Soft-delete lead.
   */
  async deleteLead(id: number): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/leads/${id}`);
    return response.data;
  },

  /**
   * Detect potential duplicate leads by phone, email, or company.
   */
  async getDuplicates(id: number): Promise<ApiResponse<DuplicateCandidate[]>> {
    const response = await api.get<ApiResponse<DuplicateCandidate[]>>(`/leads/${id}/duplicates`);
    return response.data;
  },

  /**
   * Recalculate lead intelligence score and get detailed factor breakdown.
   */
  async recalculateScore(id: number): Promise<ApiResponse<LeadScoreBreakdown>> {
    const response = await api.post<ApiResponse<LeadScoreBreakdown>>(`/leads/${id}/recalculate-score`);
    return response.data;
  },

  /**
   * Preview uploaded CSV for column mapping.
   */
  async previewImport(file: File): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<any>>('/leads/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Process mapped import batch.
   */
  async processImport(payload: {
    rows: any[];
    column_mapping: Record<string, string>;
    duplicate_strategy: string;
    assigned_agent_id?: number | null;
  }): Promise<ApiResponse<any>> {
    const response = await api.post<ApiResponse<any>>('/leads/import/process', payload);
    return response.data;
  },

  /**
   * Auto-assign lead to best matched agent using intelligent strategy.
   */
  async autoAssign(id: number, strategy: string = 'load_balanced'): Promise<ApiResponse<{ lead: Lead; assigned_agent: any; strategy: string }>> {
    const response = await api.post<ApiResponse<{ lead: Lead; assigned_agent: any; strategy: string }>>(`/leads/${id}/auto-assign`, {
      strategy,
    });
    return response.data;
  },
};
