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
  Settings,
  Copy,
  Check,
  Award,
  Star,
  ShieldAlert,
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
  type DeveloperPerformanceTelemetry,
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

  // Connect Repo Modal
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [repoFullName, setRepoFullName] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [savingRepo, setSavingRepo] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Simulation Form State
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simType, setSimType] = useState<'commit' | 'pull_request'>('commit');
  const [selectedTaskId, setSelectedTaskId] = useState<number | ''>('');
  const [customMsg, setCustomMsg] = useState('');
  const [additionsCount, setAdditionsCount] = useState(65);
  const [deletionsCount, setDeletionsCount] = useState(12);

  // Contributor Filter State (How each developer showcases their work)
  const [selectedContributor, setSelectedContributor] = useState<string | null>(null);

  // Developer Scorecard Modal State
  const [scorecardDevId, setScorecardDevId] = useState<number | null>(null);
  const [devScorecard, setDevScorecard] = useState<DeveloperPerformanceTelemetry | null>(null);
  const [loadingScorecard, setLoadingScorecard] = useState(false);
  const [disputeComment, setDisputeComment] = useState('');
  const [disputingId, setDisputingId] = useState<number | null>(null);

  const webhookUrl = `${window.location.protocol}//${window.location.host}/api/v1/webhooks/github`;

  useEffect(() => {
    loadAnalytics();
  }, [projectId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await phase5Api.getGitAnalytics(projectId);
      setAnalytics(data);
      if (data?.repo?.repo_full_name) {
        setRepoFullName(data.repo.repo_full_name);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load Git analytics.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoFullName.trim()) {
      toast.error('Repository full name is required (e.g. org/repo).');
      return;
    }

    try {
      setSavingRepo(true);
      await phase5Api.linkRepo(projectId, repoFullName.trim(), webhookSecret.trim() || undefined);
      toast.success(`GitHub repository '${repoFullName}' connected successfully!`);
      setShowConnectModal(false);
      loadAnalytics();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to link repository.');
    } finally {
      setSavingRepo(false);
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

  const openScorecard = async (devId: number) => {
    try {
      setScorecardDevId(devId);
      setLoadingScorecard(true);
      const data = await phase5Api.getDeveloperPerformance(devId);
      setDevScorecard(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not load developer scorecard.');
    } finally {
      setLoadingScorecard(false);
    }
  };

  const handleDispute = async (feedbackId: number) => {
    if (!disputeComment.trim()) {
      toast.error('Please specify why this rating is contested.');
      return;
    }
    try {
      await phase5Api.disputeFeedback(feedbackId, disputeComment.trim());
      toast.success('Dispute recorded for Super Admin review!');
      setDisputingId(null);
      setDisputeComment('');
      if (scorecardDevId) openScorecard(scorecardDevId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Dispute submission failed.');
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    toast.success('Webhook URL copied to clipboard!');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Filter commits by selected contributor
  const displayedCommits = (analytics?.recent_commits || []).filter((c) => {
    if (!selectedContributor) return true;
    return c.author_name === selectedContributor;
  });

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs">Ingesting Git telemetry and repository activity...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Repo Link, Connect Button, and Simulation Button */}
      <div className="p-5 bg-white border border-slate-200/90 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
            <GitBranch className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-sm">
                {analytics?.repo?.repo_full_name || `salescrm/${projectTitle.toLowerCase().replace(/\s+/g, '-')}`}
              </h3>
              {analytics?.repo_configured ? (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
              ) : (
                <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                  Default Mock
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Commits matching <code className="text-indigo-600 bg-slate-100 px-1 py-0.5 rounded border border-slate-200 font-mono text-[11px]">TASK-&#123;id&#125;</code> automatically sync to tasks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowConnectModal(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition shadow-xs"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-600" /> Connect GitHub Repo
          </button>
          <button
            onClick={() => setShowSimulateModal(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Simulate Commit / PR
          </button>
          <button
            onClick={loadAnalytics}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition shadow-xs"
            title="Refresh Git Analytics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-medium">
            <span>Total Commits</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <GitCommit className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{analytics?.total_commits || 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Across all branches</p>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-medium">
            <span>Lines Added</span>
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold font-mono text-xs px-1.5 py-0.5 rounded">+</span>
          </div>
          <p className="text-2xl font-black text-emerald-600 tracking-tight">
            +{analytics?.total_additions?.toLocaleString() || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Code additions</p>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-medium">
            <span>Lines Deleted</span>
            <span className="text-rose-700 bg-rose-50 border border-rose-200 font-bold font-mono text-xs px-1.5 py-0.5 rounded">-</span>
          </div>
          <p className="text-2xl font-black text-rose-600 tracking-tight">
            -{analytics?.total_deletions?.toLocaleString() || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Refactored / pruned</p>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-medium">
            <span>Net Code Impact</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">
            {((analytics?.net_lines || 0) >= 0 ? '+' : '') + (analytics?.net_lines?.toLocaleString() || 0)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Net line growth</p>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-medium">
            <span>Pull Requests</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <GitPullRequest className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{analytics?.prs_merged || 0}</p>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            {analytics?.prs_count || 0} total opened
          </p>
        </div>
      </div>

      {/* Charts & Contributors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 14-Day Commit Velocity Chart */}
        <div className="lg:col-span-2 p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Commit Velocity (Last 14 Days)</h4>
              <p className="text-xs text-slate-500">Daily frequency of merged code contributions</p>
            </div>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-full">
              Activity Trend
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.timeline || []}>
                <defs>
                  <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                    color: '#0f172a',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="commits"
                  name="Commits"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCommits)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Contributors Leaderboard (Showcasing Each Developer's Work) */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600" /> Developer Work Showcase
              </h4>
              <p className="text-[11px] text-slate-500">Click a developer to filter commits or view scorecard</p>
            </div>
            {selectedContributor && (
              <button
                onClick={() => setSelectedContributor(null)}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Clear Filter
              </button>
            )}
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto">
            {(!analytics?.contributors || analytics.contributors.length === 0) ? (
              <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
                No contributors tracked yet. Click "Simulate Commit / PR" to test!
              </div>
            ) : (
              analytics.contributors.map((c, idx) => {
                const isSelected = selectedContributor === c.author_name;

                return (
                  <div
                    key={c.author_name}
                    className={`p-3 rounded-xl border transition ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-400 shadow-xs'
                        : 'bg-slate-50/60 border-slate-200/80 hover:bg-indigo-50/30 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        onClick={() => setSelectedContributor(isSelected ? null : c.author_name)}
                        className="flex items-center gap-2.5 cursor-pointer flex-1"
                      >
                        <span className="w-5 text-[11px] font-bold text-slate-400">#{idx + 1}</span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xs shadow-xs">
                          {c.author_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{c.author_name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            <span className="text-emerald-600 font-semibold">+{c.total_additions}</span> /{' '}
                            <span className="text-rose-600 font-semibold">-{c.total_deletions}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-2xs">
                          {c.commit_count} commits
                        </span>
                        <button
                          onClick={() => openScorecard(idx + 1)}
                          title="View 0-100 Performance Scorecard"
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 transition"
                        >
                          <Award className="w-3.5 h-3.5 text-amber-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Task-Linked Commits Stream */}
      <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-bold text-slate-900 text-sm">
              {selectedContributor ? `Commits by ${selectedContributor}` : 'Recent Task-Linked Commits'}
            </h4>
            <p className="text-xs text-slate-500">
              {selectedContributor
                ? `Showing commits and deliverables authored by ${selectedContributor}`
                : 'Real-time commit ingestion linked to project tasks'}
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full font-medium">
            {displayedCommits.length} commits shown
          </span>
        </div>

        <div className="space-y-2">
          {displayedCommits.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No commits found. Click "Simulate Commit / PR" to test!
            </div>
          ) : (
            displayedCommits.map((commit) => (
              <div
                key={commit.id}
                className="p-3.5 bg-slate-50/60 hover:bg-white border border-slate-200/70 hover:border-slate-300 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition shadow-2xs"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <GitCommit className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                        {commit.sha.substring(0, 7)}
                      </span>
                      {commit.task && (
                        <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-mono font-semibold">
                          TASK-{commit.task.id}: {commit.task.title}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-800 mt-1 leading-relaxed font-mono font-medium">
                      {commit.message}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Committed by <span className="text-slate-700 font-semibold">{commit.author_name}</span> on{' '}
                      {new Date(commit.committed_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 font-mono text-xs font-bold">
                  <span className="text-emerald-600">+{commit.additions}</span>
                  <span className="text-rose-600">-{commit.deletions}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- CONNECT GITHUB REPOSITORY MODAL --- */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-sm">Connect GitHub Repository</h4>
              </div>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConnectRepo} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GitHub Repository Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={repoFullName}
                  onChange={(e) => setRepoFullName(e.target.value)}
                  placeholder="e.g. your-org/project-repo"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Format: <code>owner/repository-name</code> on GitHub
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Webhook Secret (Optional / Recommended)
                </label>
                <input
                  type="text"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="Enter custom HMAC secret or leave blank for auto-generate"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              {/* Webhook Setup Instructions */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">GitHub Webhook Payload URL:</span>
                  <button
                    type="button"
                    onClick={copyWebhookUrl}
                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                  >
                    {copiedUrl ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedUrl ? 'Copied' : 'Copy URL'}
                  </button>
                </div>
                <code className="block p-2.5 bg-white border border-slate-200 rounded-lg font-mono text-[11px] text-slate-800 break-all select-all font-medium">
                  {webhookUrl}
                </code>

                <div className="text-slate-600 space-y-1 text-[11px] pt-1">
                  <p>1. In GitHub, go to <b>Repository Settings &gt; Webhooks &gt; Add webhook</b>.</p>
                  <p>2. Paste the <b>Payload URL</b> above.</p>
                  <p>3. Set <b>Content type</b> to <code>application/json</code>.</p>
                  <p>4. Under events, check <b>Pushes</b> and <b>Pull requests</b>.</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRepo}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 disabled:opacity-50"
                >
                  {savingRepo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Save Repository Connection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DEVELOPER SCORECARD MODAL --- */}
      {scorecardDevId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Developer Performance Scorecard</h4>
                  <p className="text-xs text-slate-500">0–100 Multi-Signal Performance Telemetry & Reviews</p>
                </div>
              </div>
              <button
                onClick={() => setScorecardDevId(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              {loadingScorecard || !devScorecard ? (
                <div className="h-44 flex items-center justify-center text-slate-500 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mr-2 text-indigo-600" /> Computing telemetry...
                </div>
              ) : (
                <>
                  {/* Overall 0-100 Score Hero */}
                  <div className="p-5 bg-gradient-to-r from-indigo-50 via-white to-sky-50 border border-indigo-200/80 rounded-2xl flex items-center justify-between shadow-xs">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Monthly Performance Score ({devScorecard.period})</p>
                      <h2 className="text-4xl font-black text-indigo-950 mt-1">
                        {devScorecard.score.final_score}
                        <span className="text-lg text-slate-400 font-normal"> / 100</span>
                      </h2>
                      <p className="text-xs font-medium text-emerald-600 mt-1">
                        Evaluated across {devScorecard.score.sample_size} delivered tasks
                      </p>
                    </div>

                    <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs">
                      <Award className="w-8 h-8" />
                    </div>
                  </div>

                  {/* 6 Signal Weights Breakdown */}
                  <div>
                    <h5 className="font-bold text-slate-800 text-xs mb-2">Signal Breakdown & Formula</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <span className="text-slate-500 font-medium">Client Ratings (30%)</span>
                        <p className="text-lg font-black text-slate-900 mt-1">{devScorecard.score.client_score}%</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <span className="text-slate-500 font-medium">On-Time Delivery (20%)</span>
                        <p className="text-lg font-black text-emerald-600 mt-1">{devScorecard.score.ontime_score}%</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <span className="text-slate-500 font-medium">Low Rework Rate (20%)</span>
                        <p className="text-lg font-black text-slate-900 mt-1">{devScorecard.score.rework_score}%</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <span className="text-slate-500 font-medium">PM Peer Review (15%)</span>
                        <p className="text-lg font-black text-slate-900 mt-1">{devScorecard.score.pm_score}%</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <span className="text-slate-500 font-medium">Estimate Accuracy (10%)</span>
                        <p className="text-lg font-black text-slate-900 mt-1">{devScorecard.score.estimate_score}%</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <span className="text-slate-500 font-medium">Response SLA (5%)</span>
                        <p className="text-lg font-black text-slate-900 mt-1">90%</p>
                      </div>
                    </div>
                  </div>

                  {/* Received Feedback List & Dispute Action */}
                  <div>
                    <h5 className="font-bold text-slate-800 text-xs mb-2">Received Client Reviews</h5>
                    <div className="space-y-2.5">
                      {devScorecard.feedbacks.length === 0 ? (
                        <p className="text-xs text-slate-400 py-3">No client reviews logged yet.</p>
                      ) : (
                        devScorecard.feedbacks.map((f) => (
                          <div
                            key={f.id}
                            className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800">
                                  {f.client_user?.name || 'Client'}
                                </span>
                                {f.task && (
                                  <span className="text-[10px] text-slate-500 font-mono font-medium">
                                    on TASK-{f.task.id}: {f.task.title}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-amber-500 font-bold">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span>{f.rating}</span>
                              </div>
                            </div>

                            {f.comment && (
                              <p className="text-slate-700 italic bg-white border border-slate-200/80 p-2.5 rounded-lg">
                                "{f.comment}"
                              </p>
                            )}

                            {f.is_excluded ? (
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono">
                                Excluded from score by Admin ({f.exclusion_reason})
                              </span>
                            ) : disputingId === f.id ? (
                              <div className="mt-2 space-y-2 p-2.5 bg-white rounded-xl border border-slate-200">
                                <input
                                  type="text"
                                  value={disputeComment}
                                  onChange={(e) => setDisputeComment(e.target.value)}
                                  placeholder="State why this review is unfair or out-of-scope..."
                                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                                />
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => setDisputingId(null)}
                                    className="px-2 py-1 text-slate-500 text-xs hover:text-slate-800"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleDispute(f.id)}
                                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs transition"
                                  >
                                    Submit Dispute
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-end">
                                <button
                                  onClick={() => {
                                    setDisputingId(f.id);
                                    setDisputeComment('');
                                  }}
                                  className="text-[11px] font-semibold text-amber-600 hover:underline flex items-center gap-1"
                                >
                                  <ShieldAlert className="w-3 h-3" /> Dispute This Review
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- SIMULATE WEBHOOK MODAL --- */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-sm">Simulate GitHub Webhook Event</h4>
              </div>
              <button
                onClick={() => setShowSimulateModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSimulate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimType('commit')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      simType === 'commit'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Commit Push
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimType('pull_request')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      simType === 'pull_request'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Pull Request (Merged)
                  </button>
                </div>
              </div>

              {simType === 'commit' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Link to Task (Optional)
                    </label>
                    <select
                      value={selectedTaskId}
                      onChange={(e) => setSelectedTaskId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Commit Message (leave blank for auto-generated)
                    </label>
                    <input
                      type="text"
                      value={customMsg}
                      onChange={(e) => setCustomMsg(e.target.value)}
                      placeholder={selectedTaskId ? `feat: TASK-${selectedTaskId}: Implement feature` : 'refactor: code enhancements'}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Lines Added (+)</label>
                      <input
                        type="number"
                        value={additionsCount}
                        onChange={(e) => setAdditionsCount(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-emerald-600 font-bold font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Lines Deleted (-)</label>
                      <input
                        type="number"
                        value={deletionsCount}
                        onChange={(e) => setDeletionsCount(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-rose-600 font-bold font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {simType === 'pull_request' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PR Title</label>
                  <input
                    type="text"
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                    placeholder="feat: Sprint 2 core modules merge"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={simulating}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 disabled:opacity-50"
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
