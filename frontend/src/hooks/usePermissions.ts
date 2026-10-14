import { useAuthStore } from '@/store/authStore';

export function usePermissions() {
  const user = useAuthStore((state) => state.user);

  // Superadmins bypass all permission checks globally
  const isSuperadminRole = Boolean(
    user?.roles?.some((role: any) => {
      const roleName = typeof role === 'string' ? role : role?.name;
      return roleName === 'super_admin' || roleName === 'superadmin' || roleName === 'admin';
    })
  );

  const hasPermission = (permission: string): boolean => {
    if (isSuperadminRole) return true;
    if (!user?.permissions) return false;
    
    return user.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (isSuperadminRole) return true;
    if (!user?.permissions) return false;

    return permissions.some((perm) => user.permissions?.includes(perm));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (isSuperadminRole) return true;
    if (!user?.permissions) return false;

    return permissions.every((perm) => user.permissions?.includes(perm));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSuperadmin: isSuperadminRole || false,
  };
}
