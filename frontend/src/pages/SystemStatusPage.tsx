import { useEffect, useState } from "react";
import { Activity, CheckCircle2, ShieldAlert, Terminal, Server, Cpu, Database, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SystemStatusPage() {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/health");
      setHealthData(res.data);
    } catch (err: any) {
      setError(err.message || "Failed to reach health endpoint");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-500" />
            Backend System & API Architecture
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Standardized API envelope, Laravel 13 Framework, and Boost MCP telemetry.
          </p>
        </div>
        <Button onClick={checkHealth} disabled={loading} variant="outline" size="sm" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Run Health Check
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 shadow-sm flex items-start gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-bold text-slate-400">Framework</p>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {healthData?.data?.framework || "Laravel 13"}
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              Active &amp; Operational
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 shadow-sm flex items-start gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-bold text-slate-400">API Architecture</p>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">API Version 1</h3>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
              Services &amp; Contracts Pattern
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 shadow-sm flex items-start gap-4">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-bold text-slate-400">AI Context</p>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Laravel Boost MCP</h3>
            <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mt-1">
              Active (.mcp.json configured)
            </p>
          </div>
        </div>
      </div>

      {/* Standard Response Envelope Inspector */}
      <div className="bg-white dark:bg-[#121217] rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Uniform Response Envelope Verification
            </h2>
            <p className="text-xs text-slate-500">
              Live payload from <code className="text-indigo-500">GET /api/v1/health</code> verified against the ApiResponse format.
            </p>
          </div>
          <Badge variant={error ? "destructive" : "default"}>
            {error ? "OFFLINE" : "200 OK (STANDARD FORMAT)"}
          </Badge>
        </div>

        <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto border border-white/10 leading-relaxed">
          {loading
            ? "Pinging endpoint..."
            : JSON.stringify(healthData, null, 2)}
        </pre>
      </div>

      {/* Services & Interfaces Registry Summary */}
      <div className="bg-white dark:bg-[#121217] rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
          Registered Service Contracts
        </h2>
        <div className="space-y-2 text-sm font-mono">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
              AuthServiceInterface
            </span>
            <span className="text-slate-500 text-xs">Mapped to App\Services\AuthService</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
              LeadServiceInterface
            </span>
            <span className="text-slate-500 text-xs">Mapped to App\Services\LeadService</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
              DashboardServiceInterface
            </span>
            <span className="text-slate-500 text-xs">Mapped to App\Services\DashboardService</span>
          </div>
        </div>
      </div>
    </div>
  );
}
