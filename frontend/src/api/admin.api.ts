import api from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';

export interface AdminUserItem {
  id: number;
  name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  role: string;
  roles: string[];
  open_deals_count: number;
  won_revenue: number;
  created_at: string;
}

export interface ImpersonationStartResponse {
  token: string;
  impersonation_log_id: number;
  target_user: any;
  admin: {
    id: number;
    name: string;
    email: string;
  };
}

export interface AuditLogItem {
  id: number;
  log_name: string;
  description: string;
  subject_type?: string;
  subject_id?: number;
  causer_type?: string;
  causer_id?: number;
  properties?: any;
  created_at: string;
}

export interface ScheduledReportItem {
  id: number;
  user_id: number;
  report_type: 'weekly_digest' | 'monthly_executive' | 'agent_performance';
  frequency: 'weekly' | 'monthly' | 'on_demand';
  last_generated_at?: string;
  file_url?: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  parameters?: any;
  created_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface RoleItem {
  id: number;
  name: string;
}

export interface RolesPermissionsResponseData {
  roles: RoleItem[];
  matrix: Record<string, string[]>;
  categories: Record<string, Record<string, string>>;
  total_permissions: number;
}

export const adminApi = {
  /**
   * Fetch all users for Admin management.
   */
  async getUsers(): Promise<ApiResponse<AdminUserItem[]>> {
    const response = await api.get<ApiResponse<AdminUserItem[]>>('/admin/users');
    return response.data;
  },

  /**
   * Create a new user with role.
   */
  async createUser(payload: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role: string;
  }): Promise<ApiResponse<{ user: AdminUserItem }>> {
    const response = await api.post<ApiResponse<{ user: AdminUserItem }>>('/admin/users', payload);
    return response.data;
  },

  /**
   * Update user details or active status.
   */
  async updateUser(
    id: number,
    payload: {
      name?: string;
      phone?: string;
      is_active?: boolean;
      role?: string;
    }
  ): Promise<ApiResponse<AdminUserItem>> {
    const response = await api.patch<ApiResponse<AdminUserItem>>(`/admin/users/${id}`, payload);
    return response.data;
  },

  /**
   * Start impersonating a user (Super Admin only).
   */
  async startImpersonation(
    userId: number,
    reason?: string
  ): Promise<ApiResponse<ImpersonationStartResponse>> {
    const response = await api.post<ApiResponse<ImpersonationStartResponse>>(
      `/admin/impersonate/${userId}`,
      { reason }
    );
    return response.data;
  },

  /**
   * Terminate active impersonation session.
   */
  async exitImpersonation(impersonationLogId?: number | null): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/admin/impersonate/exit', {
      impersonation_log_id: impersonationLogId,
    });
    return response.data;
  },

  /**
   * Fetch system audit logs.
   */
  async getAuditLogs(params?: Record<string, any>): Promise<ApiResponse<AuditLogItem[]>> {
    const response = await api.get<ApiResponse<AuditLogItem[]>>('/admin/audit-logs', { params });
    return response.data;
  },

  /**
   * Fetch scheduled reports.
   */
  async getScheduledReports(): Promise<ApiResponse<ScheduledReportItem[]>> {
    const response = await api.get<ApiResponse<ScheduledReportItem[]>>('/reports/scheduled');
    return response.data;
  },

  /**
   * Subscribe or generate a new report.
   */
  async createScheduledReport(payload: {
    report_type: string;
    frequency?: string;
    parameters?: any;
  }): Promise<ApiResponse<ScheduledReportItem>> {
    const response = await api.post<ApiResponse<ScheduledReportItem>>('/reports/scheduled', payload);
    return response.data;
  },

  /**
   * Trigger on-demand generation.
   */
  async triggerGenerateReport(id: number): Promise<ApiResponse<ScheduledReportItem>> {
    const response = await api.post<ApiResponse<ScheduledReportItem>>(`/reports/scheduled/${id}/generate`);
    return response.data;
  },

  /**
   * Fetch complete RBAC matrix (SuperAdmin only).
   */
  async getRolesPermissions(): Promise<ApiResponse<RolesPermissionsResponseData>> {
    const response = await api.get<ApiResponse<RolesPermissionsResponseData>>('/admin/roles-permissions');
    return response.data;
  },

  /**
   * Synchronize role permissions.
   */
  async syncRolePermissions(payload: {
    role: string;
    permissions: string[];
  }): Promise<ApiResponse<{ role: string; permissions: string[] }>> {
    const response = await api.post<ApiResponse<{ role: string; permissions: string[] }>>(
      '/admin/roles-permissions/sync',
      payload
    );
    return response.data;
  },
};
