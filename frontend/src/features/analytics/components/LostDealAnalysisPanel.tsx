import React from 'react';
import { ShieldAlert, TrendingDown, Users, Layers, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, type LostDealAnalysisData } from '@/api/analytics.api';

export function LostDealAnalysisPanel() {
  const { data: res, isLoading } = useQuery({
    queryKey: ['analytics', 'lost-deals'],
    queryFn: () => analyticsApi.getLostDealAnalysis(),
    staleTime: 60 * 1000,
  });

  const lostData = res?.data;

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (isLoading || !lostData) {
    return (
      <div className="p-6 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 animate-pulse text-xs text-slate-400">
        Loading lost deal root-cause analytics...
      </div>
    );
  }

  const { total_lost_count, total_lost_value, by_reason, by_agent, by_source } = lostData;

  return (
    <div className="bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 rounded-2xl p-5 md:p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
              Root-Cause Analysis
            </span>
          </div>
          <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            Lost Deals &amp; Drop-off Intelligence
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Identify pattern reasons why deals are lost to refine sales pitch, pricing, and targeting.
          </p>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-red-500/[0.04] border border-red-500/20">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Lost Pipeline
            </span>
            <span className="text-xl md:text-2xl font-black text-red-600 dark:text-red-400 font-mono">
              {formatINR(total_lost_value)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Across {total_lost_count} lost deal(s)
            </span>
          </div>
        </div>
      </div>

      {/* Grid: By Reason vs By Agent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reasons Breakdown */}
        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Lost Reason Distribution
          </h4>

          {by_reason.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No lost reasons recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {by_reason.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                      {item.reason.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-slate-500 text-[11px]">
                      {item.count} deals ({item.share_percentage}%) • {formatINR(item.total_value)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, item.share_percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Losses By Agent & By Source */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" /> Losses by Sales Agent
            </h4>

            {by_agent.length === 0 ? (
              <p className="text-xs text-slate-400 py-2 text-center">No agent losses recorded.</p>
            ) : (
              <div className="space-y-2">
                {by_agent.map((agent, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {agent.agent_name}
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {agent.count} deal(s)
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {formatINR(agent.total_value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" /> Losses by Lead Channel
            </h4>

            <div className="flex flex-wrap gap-2 pt-1">
              {by_source.map((src, idx) => (
                <div
                  key={idx}
                  className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs flex items-center gap-1.5"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                    {src.source}
                  </span>
                  <span className="font-bold text-red-600 dark:text-red-400 font-mono">
                    ({src.count})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
