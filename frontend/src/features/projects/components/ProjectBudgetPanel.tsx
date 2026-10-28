import React from 'react';
import {
  IndianRupee,
  AlertTriangle,
  TrendingUp,
  Clock,
  Users,
  CheckCircle2,
  PieChart,
} from 'lucide-react';
import { type BudgetSnapshot, type CapacityDeveloper } from '@/api/projects.api';

interface ProjectBudgetPanelProps {
  budget?: BudgetSnapshot;
  capacity?: CapacityDeveloper[];
  isClientView?: boolean;
}

export function ProjectBudgetPanel({
  budget,
  capacity = [],
  isClientView = false,
}: ProjectBudgetPanelProps) {
  if (isClientView) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#121217] rounded-3xl border border-slate-200/80 dark:border-white/10 text-slate-400 text-xs">
        Budget and labor capacity matrices are restricted to internal project management.
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Budget data loading...
      </div>
    );
  }

  const consumed = budget.budget_consumed_percent || 0;

  return (
    <div className="space-y-6">
      {/* 80% / 100% Over-budget warning alert banner */}
      {budget.is_over_budget ? (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-900 dark:text-red-200 text-xs">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">CRITICAL: Project is 100%+ Over Budget!</span>
            <p className="mt-0.5 text-red-800 dark:text-red-300">
              Total labor costs (₹{budget.actual_cost.toLocaleString('en-IN')}) have exceeded the allocated internal budget of ₹{budget.total_budget.toLocaleString('en-IN')}. Please review task estimates or submit a formal Change Request.
            </p>
          </div>
        </div>
      ) : budget.is_alert_threshold ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs">
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
            ₹{budget.total_value.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-500">Contract delivery price</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400">Internal Cost Budget</span>
          <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
            ₹{budget.total_budget.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-500">Allocated labor target</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400">Actual Labor Cost</span>
          <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
            ₹{budget.actual_cost.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-500">Logged hours × Dev rates</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400">Gross Margin</span>
          <p
            className={`text-xl font-black mt-1 ${
              budget.gross_margin >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            ₹{budget.gross_margin.toLocaleString('en-IN')} ({budget.gross_margin_percent}%)
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
              ₹{budget.actual_cost.toLocaleString('en-IN')} of ₹{budget.total_budget.toLocaleString('en-IN')} budget
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
            style={{ width: `${Math.min(100, consumed)}%` }}
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
            <Users className="w-4 h-4 text-primary-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Developer Capacity &amp; Availability Matrix (Next 2 Weeks)
            </h4>
          </div>
          <span className="text-xs text-slate-400">Standard 40h/week capacity</span>
        </div>

        {capacity.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No developers configured in system.</div>
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
                {capacity.map((cap) => (
                  <tr key={cap.developer.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary-500/10 text-primary-600 font-bold text-xs flex items-center justify-center">
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
