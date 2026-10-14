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
  return <Navigate to="/dashboard" replace />;
}

function DashboardRoute() {
  const { user } = useAuthStore();
  if (user?.roles?.includes('client')) {
    return <Navigate to="/portal" replace />;
  }
  return <DashboardPage />;
}

function StaffOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (user?.roles?.includes('client')) {
    return <Navigate to="/portal" replace />;
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
            <Route path="/leads" element={<StaffOnlyRoute><LeadsPage /></StaffOnlyRoute>} />
            <Route path="/leads/analytics" element={<StaffOnlyRoute><LeadsAnalyticsPage /></StaffOnlyRoute>} />
            <Route path="/follow-ups" element={<StaffOnlyRoute><FollowUpsPage /></StaffOnlyRoute>} />
            <Route path="/clients" element={<StaffOnlyRoute><ClientsPage /></StaffOnlyRoute>} />
            <Route path="/clients/:id" element={<StaffOnlyRoute><ClientDetailPage /></StaffOnlyRoute>} />
            <Route path="/clients/:id/portal" element={<StaffOnlyRoute><ClientPortalPage /></StaffOnlyRoute>} />
            <Route path="/portal" element={<ClientPortalPage />} />
            <Route path="/client/dashboard" element={<Navigate to="/portal" replace />} />
            <Route path="/admin/users" element={<StaffOnlyRoute><AdminUsersPage /></StaffOnlyRoute>} />
            <Route path="/admin/audit-logs" element={<StaffOnlyRoute><AdminAuditLogsPage /></StaffOnlyRoute>} />
            <Route path="/system-status" element={<StaffOnlyRoute><SystemStatusPage /></StaffOnlyRoute>} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </Suspense>
    </>
  );
}
