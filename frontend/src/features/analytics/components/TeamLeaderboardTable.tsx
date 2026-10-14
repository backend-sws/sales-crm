import React, { useState } from 'react';
import { Award, Trophy, TrendingUp, CheckCircle2, Zap, Shield, Flame, Download, Eye, Clock, Phone, Mail } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, type LeaderboardAgent } from '@/api/analytics.api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

export function TeamLeaderboardTable() {
  const { token } = useAuthStore();
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['analytics', 'leaderboard'],
    queryFn: () => analyticsApi.getLeaderboard(10),
    staleTime: 60 * 1000,
  });

  const { data: scorecardRes, isLoading: isScorecardLoading } = useQuery({
    queryKey: ['analytics', 'agent-scorecard', selectedAgentId],
    queryFn: () => analyticsApi.getAgentReport(selectedAgentId!),
    enabled: !!selectedAgentId,
  });

  const agents = res?.data || [];
  const scorecard = scorecardRes?.data;

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-xl">🥇</span>;
    if (rank === 2) return <span className="text-xl">🥈</span>;
    if (rank === 3) return <span className="text-xl">🥉</span>;
    return (
      <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 font-bold flex items-center justify-center text-xs">
        {rank}
      </span>
    );
  };

  const handleExportScorecard = async (agentId: number, agentName: string) => {
    try {
      toast.info(`Generating performance scorecard CSV for ${agentName}...`);
      const response = await fetch(`http://localhost:8000/api/v1/reports/agent/${agentId}/export`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to export agent report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scorecard_${agentName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Agent scorecard CSV downloaded.');
    } catch (err) {
      toast.error('Could not download scorecard CSV.');
    }
  };

  return (
    <div className="bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-500" /> Sales Gamification
            </span>
          </div>
          <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            Sales Team Leaderboard &amp; Performance Streaks
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ranked by closed won revenue, conversion rate %, and follow-up discipline. Click any agent to inspect deep-dive scorecard.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-3 px-3">Rank</th>
              <th className="py-3 px-3">Sales Agent</th>
              <th className="py-3 px-3">Won Revenue</th>
              <th className="py-3 px-3">Deals Won</th>
              <th className="py-3 px-3">Conversion %</th>
              <th className="py-3 px-3">Follow-ups Done</th>
              <th className="py-3 px-3">Badges &amp; Streaks</th>
              <th className="py-3 px-3 text-right">Scorecard</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  Loading sales leaderboard...
                </td>
              </tr>
            ) : agents.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No active sales data available yet.
                </td>
              </tr>
            ) : (
              agents.map((agent) => (
                <tr
                  key={agent.agent_id}
                  onClick={() => setSelectedAgentId(agent.agent_id)}
                  className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center justify-center w-8">
                      {getRankBadge(agent.rank)}
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold flex items-center justify-center shrink-0 border border-primary-500/20 text-xs">
                        {agent.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 dark:text-white block truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {agent.name}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {agent.email}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatINR(agent.won_revenue)}
                  </td>

                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {agent.won_count} won
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      ({agent.active_leads} open)
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        agent.conversion_rate_pct >= 20
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : agent.conversion_rate_pct >= 10
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400'
                      }`}
                    >
                      {agent.conversion_rate_pct}%
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {agent.completed_followups} completed
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {agent.badges.map((b, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
                        >
                          <span>{b.icon}</span>
                          <span>{b.label}</span>
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-3 px-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAgentId(agent.agent_id);
                      }}
                      className="h-7 text-[11px] rounded-lg gap-1"
                    >
                      <Eye className="w-3 h-3 text-slate-400" /> View
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Agent Deep Dive Scorecard Modal */}
      {selectedAgentId && (
        <Modal
          isOpen={!!selectedAgentId}
          onClose={() => setSelectedAgentId(null)}
          title="Sales Agent Scorecard & Pipeline Diagnostics"
        >
          {isScorecardLoading ? (
            <div className="py-12 text-center text-slate-400">Loading scorecard metrics...</div>
          ) : scorecard ? (
            <div className="space-y-4 text-xs">
              {/* Profile Card */}
              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    {scorecard.agent.name}
                  </h4>
                  <span className="text-[11px] text-slate-400 block">{scorecard.agent.email}</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleExportScorecard(scorecard.agent.id, scorecard.agent.name)}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </Button>
              </div>

              {/* Scorecard Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 bg-white dark:bg-[#121217] rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Won Revenue
                  </span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    {formatINR(scorecard.metrics.won_revenue)}
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-[#121217] rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Open Pipeline
                  </span>
                  <span className="text-base font-black text-blue-600 dark:text-blue-400">
                    {formatINR(scorecard.metrics.open_pipeline_value)}
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-[#121217] rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Conversion Rate
                  </span>
                  <span className="text-base font-black text-purple-600 dark:text-purple-400">
                    {scorecard.metrics.conversion_rate_pct}%
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-[#121217] rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Total Assigned
                  </span>
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    {scorecard.metrics.total_leads}
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-[#121217] rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block mb-0.5">
                    Follow-ups Done
                  </span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    {scorecard.metrics.follow_ups_done}
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-[#121217] rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block mb-0.5">
                    Follow-ups Missed
                  </span>
                  <span className="text-base font-black text-rose-600 dark:text-rose-400">
                    {scorecard.metrics.follow_ups_missed}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedAgentId(null)}
                  className="h-9 px-4 text-xs rounded-xl"
                >
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
}
