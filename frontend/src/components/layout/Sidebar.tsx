import { cn } from "@/lib/utils";
import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  TrendingUp,
  Activity,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Zap,
  BarChart3,
  X,
  Users,
  Briefcase,
  FolderKanban,
  Settings,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useLayoutStore } from "@/store/layoutStore";
import { useAuthStore } from "@/store/authStore";
import { followUpsApi } from "@/api/followUps.api";
import { queryKeys } from "@/constants/queryKeys";

export interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeType?: string;
  superAdminOnly?: boolean;
  requiredPermission?: string | string[];
  allowedRoles?: string[];
}

export const crmMenuGroups = [
  {
    title: "SALES OPERATIONS",
    items: [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        allowedRoles: ["super_admin", "sales_manager", "sales_agent", "project_manager", "account_manager"],
      },
      {
        name: "Follow-Up Center",
        href: "/follow-ups",
        icon: Zap,
        badgeType: "followups",
        requiredPermission: ["followups.view_all", "followups.view_own"],
      },
      {
        name: "Deals & Leads",
        href: "/leads",
        icon: TrendingUp,
        requiredPermission: ["leads.view_all", "leads.view_own"],
      },
      {
        name: "Pipeline & Forecast",
        href: "/leads/analytics",
        icon: BarChart3,
        requiredPermission: ["analytics.view_company", "analytics.view_team", "analytics.view_own"],
      },
    ],
  },
  {
    title: "CLIENT SUCCESS & SERVICES",
    items: [
      {
        name: "Clients & Retainers",
        href: "/clients",
        icon: Briefcase,
        requiredPermission: ["clients.view_all", "clients.view_own"],
      },
      {
        name: "Projects & Sprints",
        href: "/projects",
        icon: FolderKanban,
        requiredPermission: ["projects.view_all", "projects.view_assigned"],
      },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      { name: "Team & Access Control", href: "/admin/users", icon: Users, superAdminOnly: true },
      { name: "Audit Trail Explorer", href: "/admin/audit-logs", icon: ShieldCheck, superAdminOnly: true },
      { name: "API & System Health", href: "/system-status", icon: Activity, superAdminOnly: true },
      { name: "Settings", href: "/settings", icon: Settings, superAdminOnly: true },
    ],
  },
];

export const clientMenuGroups = [
  {
    title: "MY CLIENT WORKSPACE",
    items: [
      { name: "Portal Overview", href: "/portal", icon: LayoutDashboard },
      { name: "My Projects", href: "/projects", icon: FolderKanban },
    ],
  },
];

export const businessMenuGroups = crmMenuGroups;
export const superadminMenuGroups = crmMenuGroups;

export function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/dashboard" && pathname === "/") return true;
  return pathname === href || pathname.startsWith(href + "/");
}

function PortalTooltip({ children, text, visible }: { children: React.ReactNode; text: string; visible: boolean }) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  if (!visible) return <>{children}</>;

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.right + 12,
      });
    }
  };

  const handleMouseLeave = () => setCoords(null);

  return (
    <div ref={triggerRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="relative">
      {children}
      {coords &&
        createPortal(
          <div
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: "translateY(-50%)",
            }}
            className="fixed z-[9999] pointer-events-none px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md rounded-md shadow-xl border border-white/10 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150"
          >
            {text}
          </div>,
          document.body
        )}
    </div>
  );
}

export function Sidebar({ className = "" }: { className?: string }) {
  const location = useLocation();
  const {
    isSidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
    isMobileSidebarOpen,
    setMobileSidebarOpen,
  } = useLayoutStore();
  const { user, logout } = useAuthStore();

  const { data: summary } = useQuery({
    queryKey: queryKeys.followUps.summary,
    queryFn: async () => {
      const res = await followUpsApi.getSummary();
      return res.data;
    },
    refetchInterval: 30000,
  });

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  const isClientUser = user?.roles?.includes('client');
  const isSuperAdmin = Boolean(
    user?.roles?.some((r) => r === 'super_admin' || r === 'superadmin')
  );

  const baseMenuGroups = isClientUser ? clientMenuGroups : crmMenuGroups;
  const activeMenuGroups = baseMenuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item: MenuItem) => {
        if (isSuperAdmin) return true;
        if (item.superAdminOnly) return false;

        // Check allowedRoles if defined
        if (item.allowedRoles && item.allowedRoles.length > 0) {
          const hasRole = user?.roles?.some((r) => item.allowedRoles!.includes(r));
          if (!hasRole) return false;
        }

        // Check requiredPermission if defined
        if (item.requiredPermission) {
          const perms = Array.isArray(item.requiredPermission)
            ? item.requiredPermission
            : [item.requiredPermission];
          const hasPerm = perms.some((p) => user?.permissions?.includes(p));
          if (!hasPerm) return false;
        }

        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const handleNavClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 z-40 lg:hidden backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col h-screen bg-white dark:bg-[#0c0c11] border-r border-slate-200/90 dark:border-white/10 select-none shadow-2xl lg:shadow-none transition-all duration-300 ease-in-out shrink-0 print:hidden",
          // Mobile Drawer behaviour
          "w-[280px] -translate-x-full lg:translate-x-0 lg:static",
          isMobileSidebarOpen && "translate-x-0",
          // Desktop Collapsed vs Expanded
          isSidebarCollapsed ? "lg:w-[72px]" : "lg:w-[260px]",
          className
        )}
      >
        {/* Brand Header */}
        <div
          className={cn(
            "h-16 flex items-center border-b border-slate-200/80 dark:border-white/10 shrink-0 px-3",
            isSidebarCollapsed ? "justify-center" : "justify-between px-4"
          )}
        >
          {isSidebarCollapsed ? (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-primary-500/25 group hover:shadow-lg hover:shadow-primary-500/35 hover:scale-105 transition-all cursor-pointer relative"
              title="Click to expand sidebar (Ctrl+B)"
              aria-label="Expand sidebar"
            >
              <Sparkles className="w-4 h-4 group-hover:hidden transition-transform" />
              <ChevronRight className="w-5 h-5 hidden group-hover:block transition-transform" />
            </button>
          ) : (
            <>
              <Link
                to={isClientUser ? "/portal" : "/dashboard"}
                onClick={handleNavClick}
                className="flex items-center gap-3 overflow-hidden group"
                title={isClientUser ? "Client Workspace" : "SalesCRM Dashboard"}
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-primary-500/20 shrink-0 transition-transform group-hover:scale-105">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                    {isClientUser ? "Client Portal" : "SalesCRM"}
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20 uppercase tracking-wide">
                      {isClientUser ? "CLIENT" : "PRO"}
                    </span>
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">
                    {isClientUser ? "Dedicated Workspace" : "Enterprise Platform"}
                  </span>
                </div>
              </Link>

              <div className="flex items-center gap-1">
                {/* Desktop Collapse Button */}
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="hidden lg:flex w-7 h-7 rounded-lg items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors shrink-0 cursor-pointer"
                  title="Collapse sidebar (Ctrl+B)"
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Mobile Drawer Close Button */}
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="flex lg:hidden w-8 h-8 rounded-lg items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors shrink-0 cursor-pointer"
                  title="Close sidebar drawer"
                  aria-label="Close sidebar drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-6 custom-scrollbar">
          {activeMenuGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!isSidebarCollapsed && (
                <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                  {group.title}
                </div>
              )}
              {group.items.map((item) => {
                const active = isRouteActive(location.pathname, item.href);
                return (
                  <PortalTooltip key={item.name} text={item.name} visible={isSidebarCollapsed}>
                    <Link
                      to={item.href}
                      onClick={handleNavClick}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 group relative",
                        active
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white",
                        isSidebarCollapsed && "justify-center px-0"
                      )}
                    >
                      <div className="relative shrink-0">
                        <item.icon
                          className={cn(
                            "w-4 h-4 transition-transform group-hover:scale-110",
                            active
                              ? "text-primary-400 dark:text-primary-600"
                              : "text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white"
                          )}
                        />
                        {isSidebarCollapsed && (item as any).badgeType === "followups" && summary && summary.overdue > 0 && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        )}
                      </div>
                      {!isSidebarCollapsed && (
                        <span className="truncate">{item.name}</span>
                      )}
                      {!isSidebarCollapsed && (item as any).badgeType === "followups" && summary && (summary.overdue > 0 || summary.today > 0) && (
                        <span className={cn(
                          "ml-auto px-1.5 py-0.2 rounded-md text-[10px] font-bold shrink-0",
                          summary.overdue > 0
                            ? "bg-red-500 text-white animate-pulse"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300"
                        )}>
                          {summary.overdue > 0 ? `🚨 ${summary.overdue}` : summary.today}
                        </span>
                      )}
                    </Link>
                  </PortalTooltip>
                );
              })}
            </div>
          ))}
        </nav>

        {/* System Health & User Profile Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-white/5 space-y-2 shrink-0">
          {!isSidebarCollapsed && (
            <div className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">MCP Engine</span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                Active
              </span>
            </div>
          )}

          <div
            className={cn(
              "flex items-center justify-between p-2 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5",
              isSidebarCollapsed && "justify-center p-2"
            )}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 via-primary-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                    {user?.name || "Sales Admin"}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    {user?.roles?.[0]?.replace('_', ' ').toUpperCase() || "ADMIN"}
                  </p>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-1">
                {isSuperAdmin && (
                  <Link
                    to="/settings"
                    onClick={handleNavClick}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors"
                    title="System Settings (Super Admin)"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </Link>
                )}
                <button
                  onClick={() => logout()}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
