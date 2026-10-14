import React from 'react';
import { Briefcase, ArrowUpRight } from 'lucide-react';
import { PIPELINE_STAGES } from '@/constants/crm.constants';
import type { DashboardMetrics } from '@/types/dashboard.types';

interface FunnelDistributionProps {
  metrics: DashboardMetrics | null;
  onOpenBoard: () => void;
}

export function FunnelDistribution({ metrics, onOpenBoard }: FunnelDistributionProps) {
  const formatINR = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="bg-white dark:bg-[#121217] rounded-3xl border border-slate-200 dark:border-white/10 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            8-Stage Pipeline Distribution
          </h2>
        </div>
        <button
          onClick={onOpenBoard}
          className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
        >
          Open Board <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {PIPELINE_STAGES.map((st) => {
          const count = metrics?.funnel_breakdown?.[st.key]?.count || 0;
          const val = metrics?.funnel_breakdown?.[st.key]?.total_value || 0;
          return (
            <div
              key={st.key}
              onClick={onOpenBoard}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-primary-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300">
                  {st.label}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${st.badgeClass}`}>
                  {count}
                </span>
              </div>
              <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-2">
                {formatINR(val)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
