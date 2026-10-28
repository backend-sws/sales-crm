import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  PlusCircle,
  TrendingUp,
  Users,
  Code,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Play,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  phase5Api,
  type GitAnalyticsResponse,
  type SimulateWebhookPayload,
} from '@/api/phase5.api';
import { type TaskItem } from '@/api/projects.api';
import { toast } from 'sonner';

interface ProjectGitAnalyticsPanelProps {
  projectId: number;
  projectTitle: string;
  tasks?: TaskItem[];
}

export function ProjectGitAnalyticsPanel({
  projectId,
  projectTitle,
  tasks = [],
}: ProjectGitAnalyticsPanelProps) {
  const [analytics, setAnalytics] = useState<GitAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // Simulation Form State
  const [simType, setSimType] = useState<'commit' | 'pull_request'>('commit');
  const [selectedTaskId, setSelectedTaskId] = useState<number | ''>('');
  const [customMsg, setCustomMsg] = useState('');
  const [additionsCount, setAdditionsCount] = useState(65);
  const [deletionsCount, setDeletionsCount] = useState(12);

  useEffect(() => {
    loadAnalytics();
  }, [projectId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await phase5Api.getGitAnalytics(projectId);
      setAnalytics(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load Git analytics.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSimulating(true);

      const payload: SimulateWebhookPayload = {
        type: simType,
        task_id: selectedTaskId ? Number(selectedTaskId) : undefined,
        message: customMsg.trim() || undefined,
        additions: additionsCount,
        deletions: deletionsCount,
        state: 'merged',
      };

      const res = await phase5Api.simulateGitWebhook(projectId, payload);
      toast.success(res.message || 'Simulated event received!');
      setShowSimulateModal(false);
      setCustomMsg('');
      loadAnalytics();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Simulation failed.');
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        <p className="text-xs">Ingesting Git telemetry and repository activity...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Repo Link & Simulation Button */}
      <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white shadow-inner">
            <GitBranch className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-100 text-sm">
                {analytics?.repo?.repo_full_name || `salescrm/${projectTitle.toLowerCase().replace(/\s+/g, '-')}`}
              </h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Integration
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Commits matching <code className="text-emerald-400">TASK-&#123;id&#125;</code> pattern automatically sync to project tasks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSimulateModal(true)}
            className="px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-primary-900/40 transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Simulate Webhook Event
          </button>
          <button
            onClick={loadAnalytics}
            className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 transition"
            title="Refresh Git Analytics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Commits</span>
            <GitCommit className="w-4 h-4 text-primary-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100">{analytics?.total_commits || 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Across all branches</p>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Lines Added</span>
            <span className="text-emerald-400 text-sm font-mono">+</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            +{analytics?.total_additions?.toLocaleString() || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Code additions</p>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Lines Deleted</span>
            <span className="text-rose-400 text-sm font-mono">-</span>
          </div>
          <p className="text-2xl font-bold text-rose-400">
            -{analytics?.total_deletions?.toLocaleString() || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Refactored / pruned</p>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Net Code Impact</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100">
            {((analytics?.net_lines || 0) >= 0 ? '+' : '') + (analytics?.net_lines?.toLocaleString() || 0)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Net line growth</p>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Pull Requests</span>
            <GitPullRequest className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100">{analytics?.prs_merged || 0}</p>
          <p className="text-[11px] text-emerald-400 mt-1">
            {analytics?.prs_count || 0} total opened
          </p>
        </div>
      </div>

      {/* Charts & Contributors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 14-Day Commit Velocity Chart */}
        <div className="lg:col-span-2 p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-semibold text-slate-100 text-sm">Commit Velocity (Last 14 Days)</h4>
              <p className="text-xs text-slate-400">Daily frequency of merged code contributions</p>
            </div>
            <span className="text-xs font-mono text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded">
              Activity Trend
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.timeline || []}>
                <defs>
                  <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                    color: '#f8fafc',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="commits"
                  name="Commits"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCommits)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Contributors Leaderboard */}
        <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-100 text-sm flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary-400" /> Contributor Scorecard
            </h4>
            <span className="text-xs text-slate-500">{analytics?.contributors?.length || 0} active</span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {(!analytics?.contributors || analytics.contributors.length === 0) ? (
              <div className="h-44 flex items-center justify-center text-slate-500 text-xs">
                No contributors tracked yet. Use the simulator above to log test commits!
              </div>
            ) : (
              analytics.contributors.map((c, idx) => (
                <div
                  key={c.author_name}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 text-[11px] font-bold text-slate-500">#{idx + 1}</span>
                    <div className="w-7 h-7 rounded-lg bg-primary-600/20 text-primary-400 border border-primary-500/30 flex items-center justify-center font-bold text-xs">
                      {c.author_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-200">{c.author_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        <span className="text-emerald-400">+{c.total_additions}</span> /{' '}
                        <span className="text-rose-400">-{c.total_deletions}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-lg">
                    {c.commit_count} commits
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Task-Linked Commits Stream */}
      <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold text-slate-100 text-sm">Recent Task-Linked Commits</h4>
            <p className="text-xs text-slate-400">Real-time commit ingestion linked to project tasks</p>
          </div>
          <span className="text-xs text-slate-400">
            Showing last {analytics?.recent_commits?.length || 0} commits
          </span>
        </div>

        <div className="space-y-2">
          {(!analytics?.recent_commits || analytics.recent_commits.length === 0) ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No recent commits recorded. Click "Simulate Webhook Event" to test!
            </div>
          ) : (
            analytics.recent_commits.map((commit) => (
              <div
                key={commit.id}
                className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-700 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <GitCommit className="w-4 h-4 text-primary-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-primary-400 font-semibold">
                        {commit.sha.substring(0, 7)}
                      </span>
                      {commit.task && (
                        <span className="text-[10px] bg-primary-500/10 text-primary-300 border border-primary-500/30 px-1.5 py-0.5 rounded font-mono">
                          TASK-{commit.task.id}: {commit.task.title}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-200 mt-1 leading-relaxed font-mono">
                      {commit.message}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Committed by <span className="text-slate-400">{commit.author_name}</span> on{' '}
                      {new Date(commit.committed_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
                  <span className="text-emerald-400 font-medium">+{commit.additions}</span>
                  <span className="text-rose-400 font-medium">-{commit.deletions}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- SIMULATE WEBHOOK MODAL --- */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-primary-400" />
                <h4 className="font-semibold text-slate-100 text-sm">Simulate GitHub Webhook Event</h4>
              </div>
              <button
                onClick={() => setShowSimulateModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSimulate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Event Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimType('commit')}
                    className={`py-2 rounded-xl text-xs font-medium border transition ${
                      simType === 'commit'
                        ? 'bg-primary-600 text-white border-primary-500 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Commit Push
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimType('pull_request')}
                    className={`py-2 rounded-xl text-xs font-medium border transition ${
                      simType === 'pull_request'
                        ? 'bg-primary-600 text-white border-primary-500 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Pull Request (Merged)
                  </button>
                </div>
              </div>

              {simType === 'commit' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Link to Task (Optional)
                    </label>
                    <select
                      value={selectedTaskId}
                      onChange={(e) => setSelectedTaskId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-primary-500"
                    >
                      <option value="">No task linked</option>
                      {tasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          TASK-{t.id}: {t.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Commit Message (leave blank for auto-generated)
                    </label>
                    <input
                      type="text"
                      value={customMsg}
                      onChange={(e) => setCustomMsg(e.target.value)}
                      placeholder={selectedTaskId ? `feat: TASK-${selectedTaskId}: Implement feature` : 'refactor: code enhancements'}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Lines Added (+)</label>
                      <input
                        type="number"
                        value={additionsCount}
                        onChange={(e) => setAdditionsCount(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Lines Deleted (-)</label>
                      <input
                        type="number"
                        value={deletionsCount}
                        onChange={(e) => setDeletionsCount(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-rose-400 font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {simType === 'pull_request' && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">PR Title</label>
                  <input
                    type="text"
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                    placeholder="feat: Sprint 2 core modules merge"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-primary-500"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={simulating}
                  className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-primary-900/30 disabled:opacity-50"
                >
                  {simulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  Dispatch Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
