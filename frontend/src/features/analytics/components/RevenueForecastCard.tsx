import React from 'react';
import { TrendingUp, IndianRupee, Target, ShieldCheck, Zap, ArrowUpRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, type RevenueForecastData } from '@/api/analytics.api';

const STAGE_LABELS: Record<string, { label: string; color: string; barColor: string }> = {
  new: { label: 'New Lead', color: 'text-slate-500', barColor: 'bg-slate-400' },
  contacted: { label: 'Contacted', color: 'text-blue-500', barColor: 'bg-blue-500' },
  interested: { label: 'Interested', color: 'text-cyan-500', barColor: 'bg-cyan-500' },
  demo_meeting: { label: 'Demo / Meeting', color: 'text-indigo-500', barColor: 'bg-indigo-500' },
  proposal: { label: 'Proposal Sent', color: 'text-purple-500', barColor: 'bg-purple-500' },
  negotiation: { label: 'Negotiation', color: 'text-amber-500', barColor: 'bg-amber-500' },
  won: { label: 'Closed Won', color: 'text-emerald-500', barColor: 'bg-emerald-500' },
};

export function RevenueForecastCard() {
  const { data: res, isLoading } = useQuery({
    queryKey: ['analytics', 'forecast'],
    queryFn: () => analyticsApi.getForecast(),
    staleTime: 60 * 1000,
  });

  const forecast = res?.data;

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (isLoading || !forecast) {
    return (
      <div className="p-6 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 animate-pulse text-xs text-slate-400">
        Calculating weighted revenue forecast...
      </div>
    );
  }

  const { summary, stages } = forecast;

  return (
    <div className="bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 rounded-2xl p-5 md:p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Stage-Weighted Telemetry
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              Confidence Index: {summary.pipeline_confidence_pct}%
            </span>
          </div>
          <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Weighted Revenue Forecasting
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Calculated as Raw Pipeline Value × Historical Stage Conversion Probability.
          </p>
        </div>

        <div className="flex items-baseline gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Expected Revenue
            </span>
            <span className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatINR(summary.total_expected_revenue)}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards: Raw Pipeline vs Weighted vs Won */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Raw Open Pipeline
          </span>
          <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
            {formatINR(summary.raw_open_pipeline)}
          </span>
          <p className="text-[10px] text-slate-400 mt-1">
            Unweighted deal value currently in negotiation/proposal
          </p>
        </div>

        <div className="p-4 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/20">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
            Weighted Open Forecast
          </span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {formatINR(summary.weighted_forecast_open)}
          </span>
          <p className="text-[10px] text-slate-400 mt-1">
            Expected revenue realization based on stage probability
          </p>
        </div>

        <div className="p-4 rounded-xl bg-blue-500/[0.03] border border-blue-500/20">
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
            Closed Won Revenue
          </span>
          <span className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono">
            {formatINR(summary.won_revenue)}
          </span>
          <p className="text-[10px] text-slate-400 mt-1">
            100% realized revenue collected from won deals
          </p>
        </div>
      </div>

      {/* Stage Breakdown Matrix Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Pipeline Stage Probability Breakdown
        </h4>

        <div className="divide-y divide-slate-100 dark:divide-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden">
          {Object.entries(stages)
            .filter(([key]) => key !== 'lost')
            .map(([stageKey, item]) => {
              const meta = STAGE_LABELS[stageKey] || {
                label: stageKey,
                color: 'text-slate-400',
                barColor: 'bg-primary-500',
              };

              return (
                <div
                  key={stageKey}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="sm:w-1/3 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {meta.label}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                        {item.probability_pct}% prob.
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {item.lead_count} deal(s) active
                    </span>
                  </div>

                  <div className="sm:w-1/3 flex-1 flex flex-col justify-center">
                    <div className="w-full bg-slate-100 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${meta.barColor}`}
                        style={{ width: `${Math.min(100, item.probability_pct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="sm:w-1/3 text-right">
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white block">
                      {formatINR(item.weighted_forecast)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Raw: {formatINR(item.raw_value)}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
