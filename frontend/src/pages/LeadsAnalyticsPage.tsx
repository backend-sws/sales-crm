import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Award,
  Users,
  Layers,
  ArrowUpRight,
  RefreshCw,
  PieChart as PieChartIcon,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Trophy,
  TrendingDown,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { leadsApi } from '@/api/leads.api';
import { queryKeys } from '@/constants/queryKeys';
import type { LeadAnalyticsData } from '@/types/lead.types';
import {
  RevenueForecastCard,
  TeamLeaderboardTable,
  LostDealAnalysisPanel,
  ScheduledReportsPanel,
} from '@/features/analytics/components';

export default function LeadsAnalyticsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'forecast' | 'leaderboard' | 'lost_deals' | 'reports' | 'sla_radar'>('forecast');

  const {
    data: analytics,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<LeadAnalyticsData>({
    queryKey: queryKeys.leads.analytics,
    queryFn: async () => {
      const res = await leadsApi.getAnalytics();
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  const formatINR = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const overview = analytics?.overview;
  const funnel = analytics?.funnel || [];
  const lostReasons = analytics?.lost_reasons || [];
  const agents = analytics?.agent_matrix || [];
  const sla = analytics?.sla_compliance;

  const totalSla = (sla?.under_15m || 0) + (sla?.under_1h || 0) + (sla?.under_24h || 0) + (sla?.breached || 0);

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
              🛡️ Zero-Leakage Radar
            </span>
            {overview && (overview.stale_leads > 0 || overview.unassigned_leads > 0) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
                ⚠️ Leakage Detected
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">
            Pipeline Velocity &amp; Anti-Loss Analytics
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            SLA compliance telemetry, stale leads radar, and agent performance accountability.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="rounded-xl h-9 text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/follow-ups')}
            className="rounded-xl h-9 text-xs gap-1.5 bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-600/25"
          >
            <span>Follow-Up Queue</span>
          </Button>
        </div>
      </div>

      {/* Analytics Module Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('forecast')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'forecast'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          <span>Revenue Forecasting</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'leaderboard'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>Team Leaderboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lost_deals')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'lost_deals'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
          <span>Lost Deal Analysis</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'reports'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
          <span>Scheduled Reports &amp; Digests</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sla_radar')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'sla_radar'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-primary-500" />
          <span>SLA &amp; Anti-Loss Radar</span>
        </button>
      </div>

      {/* Tab 1: Revenue Forecasting */}
      {activeTab === 'forecast' && <RevenueForecastCard />}

      {/* Tab 2: Sales Team Leaderboard */}
      {activeTab === 'leaderboard' && <TeamLeaderboardTable />}

      {/* Tab 3: Lost Deal Root-Cause Analysis */}
      {activeTab === 'lost_deals' && <LostDealAnalysisPanel />}

      {/* Tab 4: Scheduled Reports & Executive Digests */}
      {activeTab === 'reports' && <ScheduledReportsPanel />}

      {/* Tab 5: Zero-Leakage & SLA Compliance Radar */}
      {activeTab === 'sla_radar' && (
        <div className="space-y-6">
          {/* Top 4 Anti-Loss Leakage Radar Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Unassigned Leads */}
        <div
          onClick={() => navigate('/leads?segment=unassigned')}
          className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#111116] shadow-xs cursor-pointer hover:border-amber-400 transition-all group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Unassigned Leads
            </span>
            <Users className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              {isLoading ? '...' : overview?.unassigned_leads ?? 0}
            </span>
            {(overview?.unassigned_leads ?? 0) > 0 && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                Triage Needed
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Inbound leads sitting without an owner
          </p>
        </div>

        {/* Stale / Slipping Leads */}
        <div
          onClick={() => navigate('/leads?segment=stale')}
          className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#111116] shadow-xs cursor-pointer hover:border-red-400 transition-all group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Stale Leads (&gt; 72h)
            </span>
            <AlertTriangle className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              {isLoading ? '...' : overview?.stale_leads ?? 0}
            </span>
            {(overview?.stale_leads ?? 0) > 0 && (
              <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800">
                At Risk
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Active deals with zero contact in 3+ days
          </p>
        </div>

        {/* Leads Without Next Action */}
        <div
          onClick={() => navigate('/leads?followup_status=none')}
          className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#111116] shadow-xs cursor-pointer hover:border-purple-400 transition-all group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              No Next Action
            </span>
            <Clock className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              {isLoading ? '...' : overview?.leads_without_followup ?? 0}
            </span>
            {(overview?.leads_without_followup ?? 0) > 0 && (
              <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                Orphaned
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Active leads with no scheduled follow-up
          </p>
        </div>

        {/* Won Revenue & Pipeline Value */}
        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#111116] shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Won Revenue
            </span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {isLoading ? '...' : formatINR(overview?.won_value ?? 0)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Pipeline Active: {formatINR(overview?.pipeline_value ?? 0)}
          </p>
        </div>
      </div>

      {/* First Response Time (FRT) SLA Compliance Meter */}
      <div className="bg-white dark:bg-[#111116] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-500" />
              First Response Time (FRT) SLA Compliance
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Speed-to-lead benchmark (leads contacted under 15 minutes have a 7x higher conversion probability)
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Sample size: {totalSla} evaluated leads
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">⚡ &lt; 15 Mins (Golden)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
              {sla?.under_15m ?? 0}
            </p>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
              {totalSla > 0 ? Math.round(((sla?.under_15m ?? 0) / totalSla) * 100) : 0}% of leads
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">15 – 60 Mins</span>
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">
              {sla?.under_1h ?? 0}
            </p>
            <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80">
              {totalSla > 0 ? Math.round(((sla?.under_1h ?? 0) / totalSla) * 100) : 0}% of leads
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">1 – 24 Hours</span>
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">
              {sla?.under_24h ?? 0}
            </p>
            <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80">
              {totalSla > 0 ? Math.round(((sla?.under_24h ?? 0) / totalSla) * 100) : 0}% of leads
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-900 dark:text-red-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">🚨 &gt; 24h (Breached)</span>
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-2xl font-black text-red-700 dark:text-red-300 mt-1">
              {sla?.breached ?? 0}
            </p>
            <p className="text-[10px] text-red-600/80 dark:text-red-400/80">
              {totalSla > 0 ? Math.round(((sla?.breached ?? 0) / totalSla) * 100) : 0}% of leads
            </p>
          </div>
        </div>
      </div>

      {/* 8-Stage Pipeline Conversion & Funnel Breakdown */}
      <div className="bg-white dark:bg-[#111116] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary-500" />
            8-Stage Deal Funnel Distribution &amp; Velocity
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Stage volume, monetary deal value, and conversion throughput
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {funnel.map((item) => {
            const isWon = item.stage === 'won';
            const isLost = item.stage === 'lost';

            return (
              <div
                key={item.stage}
                onClick={() => navigate(`/leads?status=${item.stage}`)}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer hover:shadow-xs group ${
                  isWon
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : isLost
                    ? 'border-slate-300 dark:border-white/10 bg-slate-100/50 dark:bg-white/[0.02]'
                    : 'border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.03] hover:border-primary-400'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                  {item.stage.replace('_', ' ')}
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white block mt-1">
                  {item.count}
                </span>
                <span className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 block mt-0.5 truncate">
                  {formatINR(item.total_value)}
                </span>
                <span className="text-[9px] text-slate-400 block mt-1">
                  {item.conversion_rate}% share
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Agent Accountability Scoreboard + Lost Reasons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Scoreboard (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111116] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-primary-500" />
                Sales Agent Workload &amp; Accountability
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Monitoring active leads, overdue follow-up leakage, and closing pace per agent
              </p>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-white/10 text-slate-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-3">Agent</th>
                  <th className="py-2.5 px-3">Active Load</th>
                  <th className="py-2.5 px-3">Overdue 🚨</th>
                  <th className="py-2.5 px-3">Done Today</th>
                  <th className="py-2.5 px-3">Won Deals</th>
                  <th className="py-2.5 px-3">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {agents.length > 0 ? (
                  agents.map((ag) => (
                    <tr key={ag.agent_id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        <div>
                          <p>{ag.name}</p>
                          <p className="text-[10px] text-slate-400 font-normal">{ag.email}</p>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                        {ag.active_count}
                      </td>
                      <td className="py-2.5 px-3">
                        {ag.overdue_count > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                            {ag.overdue_count} overdue
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold text-[11px]">0 clean</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold">
                        {ag.done_today_count}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {ag.won_count}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">
                          ({formatINR(ag.won_value)})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-primary-600 dark:text-primary-400">
                        {ag.win_rate}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No agent activity recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lost Reasons Pareto Analysis (1 Col) */}
        <div className="bg-white dark:bg-[#111116] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-red-500" />
              Lost Reasons Breakdown
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Root causes for lost opportunities
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {lostReasons.length > 0 ? (
              lostReasons.map((lr) => (
                <div key={lr.lost_reason} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize truncate">
                      {lr.lost_reason.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {lr.count}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({formatINR(lr.total_value)})
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${overview?.lost_leads ? Math.min(100, Math.round((lr.count / overview.lost_leads) * 100)) : 20}%`,
                      }}
                      className="h-full bg-red-500 rounded-full"
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                No lost deals with documented reasons yet.
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    )}
  </div>
  );
}
