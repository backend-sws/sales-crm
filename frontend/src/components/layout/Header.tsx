import { useState, useRef, useEffect } from "react";
import {
  Menu,
  Expand,
  Shrink,
  Activity,
  Palette,
  Check,
  Search,
  ChevronRight,
  LogOut,
  ShieldCheck,
  Bell,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { useLayoutStore } from "@/store/layoutStore";
import { useThemeStore, type PrimaryColor, type LayoutTheme } from "@/store/themeStore";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { followUpsApi } from "@/api/followUps.api";
import { queryKeys } from "@/constants/queryKeys";
import { NotificationAlertsDropdown } from "./NotificationAlertsDropdown";
import { ActiveTimerWidget } from "@/features/projects/components/ActiveTimerWidget";

function ThemeCustomizer() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { theme, setTheme, primaryColor, setPrimaryColor } = useThemeStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const colorOptions: { name: string; value: PrimaryColor; bg: string }[] = [
    { name: "Teal", value: "teal", bg: "bg-teal-500" },
    { name: "Blue", value: "blue", bg: "bg-blue-500" },
    { name: "Purple", value: "purple", bg: "bg-purple-500" },
    { name: "Orange", value: "orange", bg: "bg-orange-500" },
    { name: "Green", value: "green", bg: "bg-emerald-500" },
    { name: "Rose", value: "rose", bg: "bg-rose-500" },
    { name: "Red", value: "red", bg: "bg-red-500" },
    { name: "Slate", value: "slate", bg: "bg-slate-500" },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-xl border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        title="Customize Theme & Colors"
      >
        <Palette className="w-4 h-4 text-primary-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Appearance
            </p>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
              {(["light", "semi-dark", "dark"] as LayoutTheme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    "text-[10px] py-1 px-1.5 rounded-lg font-semibold capitalize transition-all",
                    theme === t
                      ? "bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  )}
                >
                  {t === "semi-dark" ? "Semi" : t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Primary Color
            </p>
            <div className="grid grid-cols-4 gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setPrimaryColor(c.value)}
                  className={cn(
                    "h-7 rounded-lg flex items-center justify-center transition-transform hover:scale-105 relative",
                    c.bg
                  )}
                  title={c.name}
                >
                  {primaryColor === c.value && (
                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const userRole = user?.roles?.[0] || "sales_agent";

  const getRoleLabel = (r: string) => {
    switch (r) {
      case "super_admin": return "Super Admin";
      case "sales_manager": return "Sales Manager";
      case "sales_agent": return "Sales Agent";
      case "project_manager": return "Project Manager";
      case "developer": return "Developer";
      case "account_manager": return "Account Manager";
      case "client": return "Client";
      default: return r.replace('_', ' ');
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1 pl-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200/60 dark:border-white/10 transition-colors focus:outline-none"
      >
        <div className="hidden sm:flex flex-col items-end leading-tight pr-1">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {user?.name || "Sales Admin"}
          </span>
          <span className="text-[10px] font-semibold text-slate-400">
            {getRoleLabel(userRole)}
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 via-primary-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-white dark:ring-[#0c0c11] shadow-sm">
          {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="p-3 border-b border-slate-100 dark:border-white/5 space-y-1">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {user?.name || "Sales Admin"}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {user?.email || "admin@salescrm.com"}
            </p>
            <div className="flex items-center gap-1.5 pt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
                <ShieldCheck className="w-3 h-3" />
                {getRoleLabel(userRole)}
              </span>
            </div>
          </div>

          <div className="p-1 space-y-1">
            {user?.roles?.includes('client') ? (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate("/portal");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors text-left"
              >
                <ShieldCheck className="w-4 h-4 text-primary-500" />
                Client Portal
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate("/system-status");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors text-left"
              >
                <Activity className="w-4 h-4 text-primary-500" />
                API &amp; System Health
              </button>
            )}

            <button
              onClick={() => {
                setIsOpen(false);
                logout();
                navigate("/login");
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Header({ className = "" }: { className?: string }) {
  const {
    isSidebarCollapsed,
    toggleSidebar,
    toggleMobileSidebar,
  } = useLayoutStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: summary } = useQuery({
    queryKey: queryKeys.followUps.summary,
    queryFn: async () => {
      const res = await followUpsApi.getSummary();
      return res.data;
    },
    refetchInterval: 30000,
  });

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      toggleMobileSidebar();
    } else {
      toggleSidebar();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const { user } = useAuthStore();
  const isClientUser = user?.roles?.includes('client');

  const getBreadcrumbTitle = () => {
    if (location.pathname.startsWith("/portal")) return "Client Workspace";
    if (location.pathname.startsWith("/projects")) return "Project Delivery & Sprints";
    if (location.pathname.startsWith("/clients")) return "Clients & Retainers";
    if (location.pathname.startsWith("/follow-ups")) return "Follow-Up Action Queue";
    if (location.pathname.startsWith("/leads/analytics")) return "Pipeline & Anti-Loss Analytics";
    if (location.pathname.startsWith("/leads")) return "Deals & Leads Explorer";
    if (location.pathname.startsWith("/system-status")) return "System & API Health";
    return isClientUser ? "Client Workspace" : "Sales Dashboard";
  };

  return (
    <header
      className={cn(
        "h-16 px-4 md:px-6 bg-white/85 dark:bg-[#0c0c11]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between sticky top-0 z-30 transition-colors",
        className
      )}
    >
      {/* Left: Sidebar toggle button (accessible everywhere) + Clean Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggleSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent hover:border-slate-200/80 dark:hover:border-white/10 transition-all cursor-pointer"
          title={isSidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">Workspace</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 hidden sm:inline" />
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              {getBreadcrumbTitle()}
            </h2>
          </div>
        </div>
      </div>

      {/* Center: Command Palette / Quick Search Trigger */}
      {!isClientUser && (
        <div className="hidden lg:flex items-center">
          <button
            onClick={() => navigate('/leads')}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/[0.08] border border-slate-200/60 dark:border-white/5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all cursor-pointer group"
            title="Quick search leads"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
            <span>Quick search leads, deals...</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white dark:bg-white/10 border border-slate-200 dark:border-slate-white/10 text-slate-500 ml-2">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* Right: Anti-loss alert dropdown, Live Timer Widget, Theme customizer, ModeToggle, Fullscreen, Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Live Stopwatch Timer Widget */}
        {!isClientUser && <ActiveTimerWidget />}

        {/* Anti-Loss Live Alerts & Notifications */}
        {!isClientUser && <NotificationAlertsDropdown />}

        <ThemeCustomizer />

        <ModeToggle />

        <button
          onClick={toggleFullscreen}
          className="hidden sm:flex w-9 h-9 rounded-xl border border-slate-200/80 dark:border-white/10 items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
        </button>

        <div className="h-5 w-px bg-slate-200 dark:bg-white/10 mx-1" />

        <ProfileMenu />
      </div>
    </header>
  );
}
