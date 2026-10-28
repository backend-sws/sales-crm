import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { useThemeStore } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/PageWrapper";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import api from "@/lib/api";

export function AppLayout() {
  const { theme } = useThemeStore();
  const isSemiDark = theme === "semi-dark";
  const { token, user, updateUser } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (token) {
      api.get("/auth/user")
        .then((res) => {
          if (res.data?.data) {
            updateUser(res.data.data);
          }
        })
        .catch((err) => {
          console.warn("Could not sync user profile:", err.message);
        })
        .finally(() => {
          setIsReady(true);
        });
    } else {
      setIsReady(true);
    }
  }, [token, updateUser]);

  // Route redirection guard: Clients access /portal and client /projects workspaces
  useEffect(() => {
    if (!isReady || !user) return;
    const isClient = user.roles?.includes('client');
    const isAllowedClientRoute =
      location.pathname.startsWith('/portal') ||
      location.pathname.startsWith('/projects');
    if (isClient && !isAllowedClientRoute) {
      navigate('/portal', { replace: true });
    }
  }, [isReady, user, location.pathname, navigate]);

  if (!isReady) {
    return <PageLoadingSkeleton />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-[#09090b] text-slate-800 dark:text-white font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-300 print:block print:h-auto print:overflow-visible print:bg-white">
      <Sidebar className={isSemiDark ? "dark" : ""} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0 print:block print:h-auto print:overflow-visible">
        <ImpersonationBanner />
        <div className="print:hidden shrink-0">
          <Header className={isSemiDark ? "dark" : ""} />
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full transition-all duration-300 bg-slate-50/70 dark:bg-[#09090d] print:block print:overflow-visible print:bg-white">
          <PageWrapper className="w-full">
            <Outlet />
          </PageWrapper>
        </main>
      </div>
    </div>
  );
}
