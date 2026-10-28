import React, { useState, useEffect, useCallback } from 'react';
import {
  IndianRupee,
  AlertTriangle,
  TrendingUp,
  Clock,
  Users,
  CheckCircle2,
  PieChart,
  RefreshCw,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { projectsApi, type BudgetSnapshot, type CapacityDeveloper } from '@/api/projects.api';

interface ProjectBudgetPanelProps {
  projectId?: number;
  budget?: BudgetSnapshot;
  capacity?: CapacityDeveloper[];
  isClientView?: boolean;
  onRefresh?: () => void;
}

export function ProjectBudgetPanel({
  projectId,
  budget,
  capacity = [],
  isClientView = false,
  onRefresh,
}: ProjectBudgetPanelProps) {
  const [localBudget, setLocalBudget] = useState<BudgetSnapshot | undefined>(budget);
  const [localCapacity, setLocalCapacity] = useState<CapacityDeveloper[]>(capacity);
  const [loading, setLoading] = useState<boolean>(!budget && Boolean(projectId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if props update from parent
  useEffect(() => {
    if (budget) {
      setLocalBudget(budget);
    }
  }, [budget]);

  useEffect(() => {
    if (capacity && capacity.length > 0) {
      setLocalCapacity(capacity);
    }
  }, [capacity]);

  // Self-healing: Fetch budget and capacity if not passed or when user requests reload
  const fetchTelemetry = useCallback(
    async (asRefresh = false) => {
      if (!projectId) return;
      try {
        if (asRefresh) {
          setIsRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const [budgetRes, capRes] = await Promise.all([
          projectsApi.getBudget(projectId).catch((err) => {
            console.error('Failed to load project budget:', err);
            return null;
          }),
          projectsApi.getCapacity(projectId).catch((err) => {
            console.error('Failed to load project capacity:', err);
            return null;
          }),
        ]);

        if (budgetRes?.data) {
          setLocalBudget(budgetRes.data);
        }
        if (capRes?.data) {
          setLocalCapacity(capRes.data);
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to calculate budget telemetry');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [projectId]
  );

  // Trigger load on mount if budget is missing
  useEffect(() => {
    if (!localBudget && projectId && !isClientView) {
      fetchTelemetry();
    }
  }, [localBudget, projectId, isClientView, fetchTelemetry]);

  const handleManualRefresh = async () => {
    await fetchTelemetry(true);
    if (onRefresh) {
      onRefresh();
    }
  };

  if (isClientView) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#121217] rounded-3xl border border-slate-200/80 dark:border-white/10 text-slate-400 text-xs">
        Budget and labor capacity matrices are restricted to internal project management.
      </div>
    );
  }

  if (loading && !localBudget) {
    return (
      <div className="p-12 text-center bg-white dark:bg-[#121217] rounded-3xl border border-slate-200/80 dark:border-white/10 flex flex-col items-center justify-center gap-3 shadow-xs">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Calculating real-time project budget telemetry &amp; capacity...
        </span>
      </div>
    );
  }

  if (!localBudget) {
    return (
      <div className="p-10 text-center bg-white dark:bg-[#121217] rounded-3xl border border-slate-200/80 dark:border-white/10 space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center mx-auto">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Budget Telemetry Not Available
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {error || 'No budget parameters have been initialized for this project yet or permissions are restricted.'}
          </p>
        </div>
        {projectId && (
          <button
            onClick={() => fetchTelemetry(false)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recalculate Telemetry
          </button>
        )}
      </div>
    );
  }

  const activeBudget = localBudget;
  const activeCapacity = localCapacity;
  const consumed = activeBudget.budget_consumed_percent || 0;

  return (
    <div className="space-y-6">
      {/* Top Telemetry Header & Recalculate Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Budget Telemetry &amp; Resource Allocation
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Real-time labor rate consumption, margin projections and team capacity
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors shrink-0 shadow-xs cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Recalculating...' : 'Refresh Metrics'}</span>
        </button>
      </div>

      {/* 80% / 100% Over-budget warning alert banner */}
      {activeBudget.is_over_budget ? (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-900 dark:text-red-200 text-xs shadow-xs animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">CRITICAL: Project is 100%+ Over Budget!</span>
            <p className="mt-0.5 text-red-800 dark:text-red-300">
              Total labor costs (₹{Number(activeBudget.actual_cost || 0).toLocaleString('en-IN')}) have exceeded the allocated internal budget of ₹{Number(activeBudget.total_budget || 0).toLocaleString('en-IN')}. Please review task estimates or submit a formal Change Request.
            </p>
          </div>
        </div>
      ) : activeBudget.is_alert_threshold ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs shadow-xs animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Budget Alert: 80% Consumption Reached!</span>
            <p className="mt-0.5 text-amber-800 dark:text-amber-300">
              The project has consumed {consumed}% of its internal budget. Monitor remaining sprint hours to prevent margin erosion.
            </p>
          </div>
        </div>
      ) : null}

      {/* Primary Budget Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400">Total Client Value</span>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
            ₹{Number(activeBudget.total_value || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-500">Contract delivery price</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400">Internal Cost Budget</span>
          <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
            ₹{Number(activeBudget.total_budget || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-500">Allocated labor target</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400">Actual Labor Cost</span>
          <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
            ₹{Number(activeBudget.actual_cost || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-500">Logged hours × Dev rates</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400">Gross Margin</span>
          <p
            className={`text-xl font-black mt-1 ${
              Number(activeBudget.gross_margin || 0) >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            ₹{Number(activeBudget.gross_margin || 0).toLocaleString('en-IN')} ({activeBudget.gross_margin_percent || 0}%)
          </p>
          <span className="text-[10px] text-slate-500">Client price − actual cost</span>
        </div>
      </div>

      {/* Consumption Progress Gauge */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Budget Consumption Progress
            </h4>
            <span className="text-xs text-slate-400">
              ₹{Number(activeBudget.actual_cost || 0).toLocaleString('en-IN')} of ₹{Number(activeBudget.total_budget || 0).toLocaleString('en-IN')} budget
            </span>
          </div>
          <span
            className={`font-mono text-sm font-black ${
              consumed >= 100
                ? 'text-red-500'
                : consumed >= 80
                ? 'text-amber-500'
                : 'text-emerald-500'
            }`}
          >
            {consumed}%
          </span>
        </div>

        <div className="h-3 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
          <div
            style={{ width: `${Math.min(100, Math.max(0, consumed))}%` }}
            className={`h-full rounded-full transition-all duration-500 ${
              consumed >= 100
                ? 'bg-red-500'
                : consumed >= 80
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
          />
        </div>
      </div>

      {/* Team Capacity & Availability Matrix */}
      <div className="rounded-3xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Developer Capacity &amp; Availability Matrix (Next 2 Weeks)
            </h4>
          </div>
          <span className="text-xs text-slate-400">Standard 40h/week capacity</span>
        </div>

        {activeCapacity.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No active technical staff or developers configured in the system.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Developer</th>
                  <th className="py-2.5 px-4">Open Tasks</th>
                  <th className="py-2.5 px-4">Remaining Work</th>
                  <th className="py-2.5 px-4">Available (Week 1)</th>
                  <th className="py-2.5 px-4">Available (Week 2)</th>
                  <th className="py-2.5 px-4">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {activeCapacity.map((cap) => (
                  <tr key={cap.developer.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 font-bold text-xs flex items-center justify-center">
                          {cap.developer.name.charAt(0)}
                        </div>
                        <div>
                          <div>{cap.developer.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            ₹{cap.developer.hourly_rate || 0}/hr
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {cap.open_tasks_count} tasks
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {cap.remaining_hours} hrs
                    </td>
                    <td className="py-2.5 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {cap.available_week_1}h free
                    </td>
                    <td className="py-2.5 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {cap.available_week_2}h free
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, cap.utilization_percent)}%` }}
                            className={`h-full rounded-full ${
                              cap.is_over_allocated
                                ? 'bg-red-500'
                                : cap.utilization_percent >= 80
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                        </div>
                        <span
                          className={`font-mono text-[10px] font-bold ${
                            cap.is_over_allocated
                              ? 'text-red-500'
                              : cap.utilization_percent >= 80
                              ? 'text-amber-500'
                              : 'text-slate-600'
                          }`}
                        >
                          {cap.utilization_percent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
