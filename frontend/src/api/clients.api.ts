import api from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';

export interface ClientBranding {
  id: number;
  client_id: number;
  logo_url?: string | null;
  primary_color: string;
  subdomain?: string | null;
  custom_domain?: string | null;
  hide_vendor_branding: boolean;
  enabled_features?: Record<string, boolean>;
}

export interface ClientHealthScore {
  id: number;
  client_id: number;
  score: number;
  ticket_score: number;
  payment_score: number;
  engagement_score: number;
  feedback_score: number;
  response_score: number;
  status: 'healthy' | 'at_risk' | 'churning';
  calculated_at: string;
}

export interface ClientServiceItem {
  id: number;
  client_id: number;
  product_id?: number | null;
  service_name: string;
  service_type: 'recurring' | 'one_time' | 'software_project';
  status: 'active' | 'in_progress' | 'paused' | 'completed';
  start_date: string;
  billing_cycle: 'monthly' | 'quarterly' | 'yearly' | 'milestone';
  value: number;
  next_invoice_date?: string | null;
  notes?: string | null;
  requests?: ServiceRequestItem[];
  reports?: ServiceReportItem[];
}

export interface ServiceRequestItem {
  id: number;
  client_service_id: number;
  client_id: number;
  ticket_number: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'done' | 'confirmed' | 'closed';
  added_by?: number | null;
  added_by_type: 'client' | 'admin';
  assigned_to?: number | null;
  sla_deadline?: string | null;
  completed_at?: string | null;
  confirmed_at?: string | null;
  created_at: string;
  creator?: { id: number; name: string; email: string };
  assignee?: { id: number; name: string; email: string };
}

export interface ServiceReportItem {
  id: number;
  client_service_id: number;
  client_id: number;
  title: string;
  period: string;
  file_url?: string | null;
  metrics?: Record<string, any> | null;
  uploaded_by?: number | null;
  created_at: string;
  uploader?: { id: number; name: string; email: string };
}

export interface ClientDocumentItem {
  id: number;
  client_id: number;
  type: 'contract' | 'proposal' | 'nda' | 'welcome';
  title: string;
  file_url: string;
  signed_file_url?: string | null;
  status: 'pending_signature' | 'signed' | 'declined' | 'expired';
  signed_at?: string | null;
  signer_ip?: string | null;
  signer_name?: string | null;
  signature_data_url?: string | null;
  created_at: string;
}

export interface InvoiceItem {
  id: number;
  client_id: number;
  client_service_id?: number | null;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
  paid_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  paid_at?: string | null;
  line_items?: Array<{ description: string; amount: number }>;
  notes?: string | null;
}

export interface OnboardingStepItem {
  key: string;
  label: string;
  completed: boolean;
}

export interface ClientItem {
  id: number;
  name: string;
  company: string;
  email: string;
  phone?: string | null;
  gst_number?: string | null;
  billing_address?: string | null;
  billing_state?: string | null;
  source_lead_id?: number | null;
  account_manager_id?: number | null;
  onboarding_completed: boolean;
  onboarding_steps?: OnboardingStepItem[];
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  branding?: ClientBranding | null;
  health_score?: ClientHealthScore | null;
  services?: ClientServiceItem[];
  account_manager?: { id: number; name: string; email: string; phone?: string } | null;
  documents?: ClientDocumentItem[];
  invoices?: InvoiceItem[];
  source_lead?: any;
}

export interface OnboardingProgressResponse {
  client_id: number;
  completed: boolean;
  percentage: number;
  total_steps: number;
  steps: OnboardingStepItem[];
}

export const clientsApi = {
  /**
   * List all clients with health scores and service summary.
   */
  async getClients(params?: Record<string, any>): Promise<ApiResponse<ClientItem[]>> {
    const response = await api.get<ApiResponse<ClientItem[]>>('/clients', { params });
    return response.data;
  },

  /**
   * Directly onboard and create a new client account.
   */
  async createClient(payload: Record<string, any>): Promise<ApiResponse<ClientItem>> {
    const response = await api.post<ApiResponse<ClientItem>>('/clients', payload);
    return response.data;
  },

  /**
   * Get single client profile with services, tickets, invoices and pre-sales history.
   */
  async getClient(id: number): Promise<ApiResponse<ClientItem>> {
    const response = await api.get<ApiResponse<ClientItem>>(`/clients/${id}`);
    return response.data;
  },

  /**
   * Get current authenticated client's self-service portal workspace.
   */
  async getPortalProfile(): Promise<ApiResponse<ClientItem>> {
    const response = await api.get<ApiResponse<ClientItem>>('/client/portal-profile');
    return response.data;
  },

  /**
   * Convert Won Lead into a client account.
   */
  async convertLead(leadId: number, payload: Record<string, any>): Promise<ApiResponse<ClientItem>> {
    const response = await api.post<ApiResponse<ClientItem>>(`/leads/${leadId}/convert`, payload);
    return response.data;
  },

  /**
   * Update client details.
   */
  async updateClient(id: number, payload: Record<string, any>): Promise<ApiResponse<ClientItem>> {
    const response = await api.patch<ApiResponse<ClientItem>>(`/clients/${id}`, payload);
    return response.data;
  },

  /**
   * Update white-label portal branding.
   */
  async updateBranding(id: number, payload: Record<string, any>): Promise<ApiResponse<ClientBranding>> {
    const response = await api.post<ApiResponse<ClientBranding>>(`/clients/${id}/branding`, payload);
    return response.data;
  },

  /**
   * Get onboarding checklist progress.
   */
  async getOnboarding(id: number): Promise<ApiResponse<OnboardingProgressResponse>> {
    const response = await api.get<ApiResponse<OnboardingProgressResponse>>(`/clients/${id}/onboarding`);
    return response.data;
  },

  /**
   * Update onboarding step completion.
   */
  async updateOnboardingStep(id: number, step: string, completed: boolean): Promise<ApiResponse<OnboardingProgressResponse>> {
    const response = await api.patch<ApiResponse<OnboardingProgressResponse>>(`/clients/${id}/onboarding/${step}`, { completed });
    return response.data;
  },

  /**
   * Get client health score.
   */
  async getHealth(id: number): Promise<ApiResponse<ClientHealthScore>> {
    const response = await api.get<ApiResponse<ClientHealthScore>>(`/clients/${id}/health`);
    return response.data;
  },

  /**
   * Get tickets for a client service.
   */
  async getTickets(serviceId: number, params?: Record<string, any>): Promise<ApiResponse<ServiceRequestItem[]>> {
    const response = await api.get<ApiResponse<ServiceRequestItem[]>>(`/services/${serviceId}/tickets`, { params });
    return response.data;
  },

  /**
   * Create a new ticket.
   */
  async createTicket(serviceId: number, payload: Record<string, any>): Promise<ApiResponse<ServiceRequestItem>> {
    const response = await api.post<ApiResponse<ServiceRequestItem>>(`/services/${serviceId}/tickets`, payload);
    return response.data;
  },

  /**
   * Transition ticket status.
   */
  async updateTicketStatus(ticketId: number, status: string): Promise<ApiResponse<ServiceRequestItem>> {
    const response = await api.patch<ApiResponse<ServiceRequestItem>>(`/tickets/${ticketId}/status`, { status });
    return response.data;
  },

  /**
   * Client confirms ticket completion.
   */
  async confirmTicket(ticketId: number): Promise<ApiResponse<ServiceRequestItem>> {
    const response = await api.post<ApiResponse<ServiceRequestItem>>(`/tickets/${ticketId}/confirm`);
    return response.data;
  },

  /**
   * Upload monthly / periodic service report.
   */
  async uploadReport(serviceId: number, payload: Record<string, any>): Promise<ApiResponse<ServiceReportItem>> {
    const response = await api.post<ApiResponse<ServiceReportItem>>(`/services/${serviceId}/reports`, payload);
    return response.data;
  },

  /**
   * List reports for a service.
   */
  async getReports(serviceId: number): Promise<ApiResponse<ServiceReportItem[]>> {
    const response = await api.get<ApiResponse<ServiceReportItem[]>>(`/services/${serviceId}/reports`);
    return response.data;
  },

  /**
   * Get invoices for client.
   */
  async getInvoices(clientId: number, params?: Record<string, any>): Promise<ApiResponse<InvoiceItem[]>> {
    const response = await api.get<ApiResponse<InvoiceItem[]>>(`/clients/${clientId}/invoices`, { params });
    return response.data;
  },

  /**
   * Generate retainer invoice for service.
   */
  async generateInvoice(serviceId: number, payload?: Record<string, any>): Promise<ApiResponse<InvoiceItem>> {
    const response = await api.post<ApiResponse<InvoiceItem>>(`/services/${serviceId}/invoices/generate`, payload || {});
    return response.data;
  },

  /**
   * Mark invoice as paid.
   */
  async markInvoicePaid(invoiceId: number, payload: Record<string, any>): Promise<ApiResponse<InvoiceItem>> {
    const response = await api.patch<ApiResponse<InvoiceItem>>(`/invoices/${invoiceId}/mark-paid`, payload);
    return response.data;
  },

  /**
   * List client documents for e-sign.
   */
  async getDocuments(clientId: number): Promise<ApiResponse<ClientDocumentItem[]>> {
    const response = await api.get<ApiResponse<ClientDocumentItem[]>>(`/clients/${clientId}/documents`);
    return response.data;
  },

  /**
   * Upload document for signature.
   */
  async uploadDocument(clientId: number, payload: Record<string, any>): Promise<ApiResponse<ClientDocumentItem>> {
    const response = await api.post<ApiResponse<ClientDocumentItem>>(`/clients/${clientId}/documents`, payload);
    return response.data;
  },

  /**
   * Client e-signs document.
   */
  async signDocument(documentId: number, payload: { signer_name: string; signature_data_url?: string }): Promise<ApiResponse<ClientDocumentItem>> {
    const response = await api.post<ApiResponse<ClientDocumentItem>>(`/documents/${documentId}/sign`, payload);
    return response.data;
  },
};
