import api from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type { LoginValues } from '@/schemas/auth.schema';

export const authApi = {
  /**
   * Authenticate with email and password.
   */
  async login(credentials: LoginValues): Promise<ApiResponse<{
    user: any;
    token: string;
    token_type: string;
    redirect_to: string;
  }>> {
    const response = await api.post<ApiResponse<any>>('/auth/login', credentials);
    return response.data;
  },

  /**
   * Fetch authenticated user profile.
   */
  async getProfile(): Promise<ApiResponse<any>> {
    const response = await api.get<ApiResponse<any>>('/auth/user');
    return response.data;
  },

  /**
   * Revoke session token and logout.
   */
  async logout(): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/auth/logout');
    return response.data;
  },
};
