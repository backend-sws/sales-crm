import React from 'react';
import { useAuthStore } from '@/store/authStore';

interface CanProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Render children only if current user has the specified permission (or is super_admin).
 */
export const Can: React.FC<CanProps> = ({ permission, children, fallback = null }) => {
  const { hasPermission } = useAuthStore();
  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
};

interface CanAnyProps {
  permissions: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Render children if current user has at least one of the specified permissions.
 */
export const CanAny: React.FC<CanAnyProps> = ({ permissions, children, fallback = null }) => {
  const { user, hasPermission } = useAuthStore();
  if (user?.roles?.includes('super_admin') || user?.roles?.includes('superadmin')) {
    return <>{children}</>;
  }
  const hasAny = permissions.some((perm) => hasPermission(perm));
  if (!hasAny) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
};

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Render children only if current user has one of the allowed roles.
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children, fallback = null }) => {
  const { user } = useAuthStore();
  if (!user || !user.roles) {
    return <>{fallback}</>;
  }
  if (user.roles.includes('super_admin') || user.roles.includes('superadmin')) {
    return <>{children}</>;
  }
  const hasRole = user.roles.some((r) => allowedRoles.includes(r));
  if (!hasRole) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
};
