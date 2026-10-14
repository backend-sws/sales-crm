import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useTenantStore } from './tenantStore';

export type UserRole =
  | 'super_admin'
  | 'sales_manager'
  | 'sales_agent'
  | 'project_manager'
  | 'developer'
  | 'account_manager'
  | 'client';

export interface User {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string | null;
  roles?: string[];
  permissions?: string[];
  redirect_to?: string;
  client_id?: number | null;
  is_active?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  originalUser: User | null;
  originalToken: string | null;
  isAuthenticated: boolean;
  isProfileLoading: boolean;
  setAuth: (user: User, token: string) => void;
  updateUser: (user: Partial<User>) => void;
  setProfileLoading: (loading: boolean) => void;
  impersonate: (user: User, token: string) => void;
  leaveImpersonation: () => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      originalUser: null,
      originalToken: null,
      isAuthenticated: false,
      isProfileLoading: !!localStorage.getItem('auth_token'),
      setAuth: (user, token) => {
        localStorage.setItem('auth_token', token);
        sessionStorage.clear();
        set({ user, token, isAuthenticated: true, isProfileLoading: false });
      },
      updateUser: (updates) => set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),
      setProfileLoading: (loading) => set({ isProfileLoading: loading }),
      impersonate: (user, token) => {
        const state = get();
        // Save current auth as original
        set({
          originalUser: state.user,
          originalToken: state.token,
          user,
          token,
          isAuthenticated: true,
          isProfileLoading: false,
        });
        localStorage.setItem('auth_token', token);
      },
      leaveImpersonation: () => {
        const state = get();
        if (state.originalToken && state.originalUser) {
          localStorage.setItem('auth_token', state.originalToken);
          set({
            user: state.originalUser,
            token: state.originalToken,
            originalUser: null,
            originalToken: null,
          });
        }
      },
        logout: () => {
        localStorage.removeItem('auth_token');
        sessionStorage.clear();
        set({ user: null, token: null, originalUser: null, originalToken: null, isAuthenticated: false, isProfileLoading: false });
        // Static import since there is no circular dependency
        useTenantStore.getState().reset();
      },
      hasRole: (role: string) => {
        const user = get().user;
        if (!user || !user.roles) return false;
        return user.roles.includes(role);
      },
      hasPermission: (permission: string) => {
        const user = get().user;
        if (!user) return false;
        if (user.roles?.includes('super_admin')) return true;
        return user.permissions?.includes(permission) ?? false;
      },
    }),
    {
      name: 'mobilecrm-auth', // localStorage key
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        originalUser: state.originalUser,
        originalToken: state.originalToken,
        isAuthenticated: state.isAuthenticated,
      }), // Exclude isProfileLoading from persistence
    }
  )
);
