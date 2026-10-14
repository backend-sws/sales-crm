import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/api/auth.api";
import { toast } from "sonner";

const demoRoles = [
  { name: "Super Admin", email: "admin@salescrm.com", color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800" },
  { name: "Sales Manager", email: "manager@salescrm.com", color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800" },
  { name: "Sales Agent", email: "agent@salescrm.com", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800" },
  { name: "Project Manager", email: "pm@salescrm.com", color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800" },
  { name: "Developer", email: "dev@salescrm.com", color: "text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800" },
  { name: "Account Manager", email: "am@salescrm.com", color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800" },
  { name: "Client (Apex Tech)", email: "rahul@apextech.in", color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState("admin@salescrm.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      if (res.success) {
        const { user, token } = res.data;
        setAuth(user, token);
        toast.success(res.message || `Logged in as ${user.name}!`);
        if (user.roles?.includes('client')) {
          navigate("/portal", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.errors?.email?.[0] ||
        "Invalid login credentials";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const selectDemoRole = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword("password123");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/30 dark:from-[#09090b] dark:via-[#0c0c12] dark:to-[#131122]">
      <div className="w-full max-w-lg bg-white dark:bg-[#121217] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Enterprise SalesCRM
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Multi-Role RBAC • Spatie Permissions • Laravel 13 API v1
          </p>
        </div>

        {/* Demo Quick-Fill Roles */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Quick Demo Login (7 Roles):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {demoRoles.map((r) => {
              const isSelected = email === r.email;
              return (
                <button
                  key={r.email}
                  type="button"
                  onClick={() => selectDemoRole(r.email)}
                  className={`text-left px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all ${
                    isSelected
                      ? `${r.color} ring-2 ring-indigo-500/50 shadow-sm font-semibold`
                      : "border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="truncate">{r.name}</div>
                  <div className="text-[9px] opacity-70 truncate">{r.email.split("@")[0]}</div>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                placeholder="admin@salescrm.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25 h-10 font-semibold gap-2 mt-2"
          >
            {loading ? "Authenticating..." : `Sign In (${demoRoles.find((r) => r.email === email)?.name || "CRM"})`}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-xs text-slate-500 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Universal Demo Password:
          </div>
          <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
            Password: <span className="text-indigo-600 dark:text-indigo-400 font-bold">password123</span>
          </div>
        </div>
      </div>
    </div>
  );
}
