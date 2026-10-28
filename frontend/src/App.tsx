import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { PageLoadingSkeleton } from "./components/ui/PageLoadingSkeleton";
import { AppLayout } from "./components/layout/AppLayout";
import { useAuthStore } from "./store/authStore";

import { useThemeEffect } from "./hooks/useThemeEffect";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const LeadsPage = lazy(() => import("./pages/LeadsPage"));
const FollowUpsPage = lazy(() => import("./pages/FollowUpsPage"));
const LeadsAnalyticsPage = lazy(() => import("./pages/LeadsAnalyticsPage"));
const SystemStatusPage = lazy(() => import("./pages/SystemStatusPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const AdminAuditLogsPage = lazy(() => import("./pages/AdminAuditLogsPage"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const ClientDetailPage = lazy(() => import("./pages/ClientDetailPage"));
const ClientPortalPage = lazy(() => import("./pages/ClientPortalPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function RootRedirect() {
  const { user } = useAuthStore();
  if (user?.roles?.includes('client')) {
    return <Navigate to="/portal" replace />;
  }
  if (user?.roles?.includes('developer')) {
    return <Navigate to="/projects" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

function DashboardRoute() {
  const { user } = useAuthStore();
  if (user?.roles?.includes('client')) {
    return <Navigate to="/portal" replace />;
  }
  if (user?.roles?.includes('developer')) {
    return <Navigate to="/projects" replace />;
  }
  return <DashboardPage />;
}

function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const isSuperAdmin = Boolean(
    user?.roles?.some((r) => r === 'super_admin' || r === 'superadmin')
  );
  if (!isSuperAdmin) {
    if (user?.roles?.includes('client')) return <Navigate to="/portal" replace />;
    if (user?.roles?.includes('developer')) return <Navigate to="/projects" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function PermissionGuardRoute({
  permissions,
  children,
}: {
  permissions: string[];
  children: React.ReactNode;
}) {
  const { user, hasPermission } = useAuthStore();
  const isSuperAdmin = Boolean(
    user?.roles?.some((r) => r === 'super_admin' || r === 'superadmin')
  );
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  const hasAny = permissions.some((p) => hasPermission(p));
  if (!hasAny) {
    if (user?.roles?.includes('client')) return <Navigate to="/portal" replace />;
    if (user?.roles?.includes('developer')) return <Navigate to="/projects" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  useThemeEffect();

  return (
    <>
      <Toaster position="top-right" richColors />
      <Suspense fallback={<PageLoadingSkeleton />}>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Application Layout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<RootRedirect />} />
            <Route path="/dashboard" element={<DashboardRoute />} />
            <Route
              path="/leads"
              element={
                <PermissionGuardRoute permissions={['leads.view_all', 'leads.view_own']}>
                  <LeadsPage />
                </PermissionGuardRoute>
              }
            />
            <Route
              path="/leads/analytics"
              element={
                <PermissionGuardRoute permissions={['analytics.view_company', 'analytics.view_team', 'analytics.view_own']}>
                  <LeadsAnalyticsPage />
                </PermissionGuardRoute>
              }
            />
            <Route
              path="/follow-ups"
              element={
                <PermissionGuardRoute permissions={['followups.view_all', 'followups.view_own']}>
                  <FollowUpsPage />
                </PermissionGuardRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <PermissionGuardRoute permissions={['clients.view_all', 'clients.view_own']}>
                  <ClientsPage />
                </PermissionGuardRoute>
              }
            />
            <Route
              path="/clients/:id"
              element={
                <PermissionGuardRoute permissions={['clients.view_all', 'clients.view_own']}>
                  <ClientDetailPage />
                </PermissionGuardRoute>
              }
            />
            <Route
              path="/clients/:id/portal"
              element={
                <PermissionGuardRoute permissions={['clients.view_all', 'clients.view_own']}>
                  <ClientPortalPage />
                </PermissionGuardRoute>
              }
            />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/portal" element={<ClientPortalPage />} />
            <Route path="/client/dashboard" element={<Navigate to="/portal" replace />} />
            <Route
              path="/admin/users"
              element={
                <AdminOnlyRoute>
                  <AdminUsersPage />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <AdminOnlyRoute>
                  <AdminAuditLogsPage />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/system-status"
              element={
                <AdminOnlyRoute>
                  <SystemStatusPage />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <AdminOnlyRoute>
                  <SettingsPage />
                </AdminOnlyRoute>
              }
            />
            <Route path="/admin/settings" element={<Navigate to="/settings" replace />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </Suspense>
    </>
  );
}
