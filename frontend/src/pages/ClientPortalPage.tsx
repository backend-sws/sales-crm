import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  Receipt,
  FileCheck,
  Plus,
  RefreshCw,
  ExternalLink,
  Shield,
  Eye,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Calendar,
  FolderKanban,
  MessageSquare,
  GitBranch,
  CheckSquare,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  User as UserIcon,
  Star,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { clientsApi, type ClientItem } from '@/api/clients.api';
import { projectsApi, type ProjectItem, type TaskItem } from '@/api/projects.api';
import { useAuthStore } from '@/store/authStore';
import {
  ClientOnboardingCard,
  ServiceTicketsPanel,
  RetainerInvoicesPanel,
  ClientDocumentsPanel,
} from '@/features/clients/components';
import { ProjectMeetingsPanel } from '@/features/projects/components/ProjectMeetingsPanel';
import { ProjectGitAnalyticsPanel } from '@/features/projects/components/ProjectGitAnalyticsPanel';
import { ProjectChatSlack } from '@/features/projects/components/ProjectChatSlack';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';

type PortalTab =
  | 'projects'
  | 'meetings'
  | 'chat'
  | 'git'
  | 'services'
  | 'billing'
  | 'documents'
  | 'onboarding';

export default function ClientPortalPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isPreviewMode = Boolean(id);

  const [client, setClient] = useState<ClientItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PortalTab>('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Review Task Modal State
  const [reviewTask, setReviewTask] = useState<TaskItem | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'accept' | 'reject'>('accept');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchPortalData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (isPreviewMode) {
        // Admin preview mode for specific client
        const res = await clientsApi.getClient(Number(id));
        setClient(res.data);
      } else {
        // Logged-in client's own portal
        const res = await clientsApi.getPortalProfile();
        setClient(res.data);
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'Could not load client portal.';
      setError(errMsg);
      toast.error(errMsg);
      if (isPreviewMode) {
        navigate('/clients');
      }
    } finally {
      setLoading(false);
    }
  }, [id, isPreviewMode, navigate]);

  useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  // Set default selected project
  useEffect(() => {
    if (client?.projects && client.projects.length > 0) {
      if (!selectedProjectId || !client.projects.some((p) => p.id === selectedProjectId)) {
        setSelectedProjectId(client.projects[0].id);
      }
    }
  }, [client, selectedProjectId]);

  const activeProject = useMemo(() => {
    if (!client?.projects || client.projects.length === 0) return null;
    return client.projects.find((p) => p.id === selectedProjectId) || client.projects[0];
  }, [client, selectedProjectId]);

  // Pending MoM calculations across projects
  const pendingMoMs = useMemo(() => {
    if (!client?.projects) return [];
    const allMeetings: any[] = [];
    client.projects.forEach((proj: any) => {
      if (proj.meetings && Array.isArray(proj.meetings)) {
        proj.meetings.forEach((m: any) => {
          if (!m.is_auto_accepted && !m.client_confirmed_at && !m.is_disputed) {
            allMeetings.push({ ...m, projectName: proj.name, projectId: proj.id });
          }
        });
      }
    });
    return allMeetings;
  }, [client]);

  const pendingMoMCount = pendingMoMs.length;

  const handleTaskReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTask) return;

    try {
      setSubmittingReview(true);
      const res = await projectsApi.clientDecision(reviewTask.id, {
        action: reviewDecision,
        reason: reviewNotes.trim() || undefined,
        rating: reviewDecision === 'accept' ? reviewRating : undefined,
      });

      if (res.success) {
        toast.success(
          reviewDecision === 'accept'
            ? 'Deliverable approved! Great job team!'
            : 'Changes requested. Task moved back to in-progress.'
        );
        setReviewTask(null);
        setReviewNotes('');
        fetchPortalData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit review decision');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
        <span className="text-sm font-semibold text-slate-500">Loading your client workspace...</span>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
          <Shield className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-white">Client Portal Account Not Ready</h3>
        <p className="text-xs text-slate-500 max-w-md">
          {error || 'We could not load your organization profile. Please contact your account manager.'}
        </p>
        <Button onClick={fetchPortalData} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </Button>
      </div>
    );
  }

  const primaryColor = client.branding?.primary_color || '#1E40AF';
  const hideVendor = client.branding?.hide_vendor_branding ?? true;

  const tabs: {
    key: PortalTab;
    label: string;
    icon: any;
    badge?: number;
    badgeClass?: string;
  }[] = [
    {
      key: 'projects',
      label: 'Projects & Roadmap',
      icon: FolderKanban,
      badge: client.projects?.length,
      badgeClass: 'bg-white/20 text-white',
    },
    {
      key: 'meetings',
      label: 'Meetings & 48h MoM',
      icon: Calendar,
      badge: pendingMoMCount > 0 ? pendingMoMCount : undefined,
      badgeClass: 'bg-amber-500 text-white animate-pulse',
    },
    { key: 'chat', label: 'Team Chat', icon: MessageSquare },
    { key: 'git', label: 'GitHub Velocity', icon: GitBranch },
    { key: 'services', label: 'Services & Retainers', icon: Layers },
    { key: 'billing', label: 'Invoices & Receipts', icon: Receipt },
    { key: 'documents', label: 'Agreements & E-Sign', icon: FileCheck },
    { key: 'onboarding', label: 'Setup Checklist', icon: Sparkles },
  ];

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">
      {/* Admin Preview Banner if opened by an Admin */}
      {isPreviewMode && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Client Portal Live Preview:</span>{' '}
              <span>Viewing white-label workspace as {client.company} (Client #{client.id})</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/clients/${client.id}`)}
            className="text-xs h-8 border-amber-400 text-amber-900 dark:text-amber-200 gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to CRM Workspace</span>
          </Button>
        </div>
      )}

      {/* 48-Hour Pending MoM Action Alert Banner */}
      {pendingMoMCount > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/20">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                Action Required: {pendingMoMCount} Meeting MoM Awaiting Your Review
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 font-semibold">
                  48-Hour Auto-Acceptance Active
                </span>
              </h4>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                Review discussion agendas and action items. Click &ldquo;Confirm MoM&rdquo; to accept, or submit dispute notes if adjustments are needed.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setActiveTab('meetings')}
            className="bg-amber-600 hover:bg-amber-500 text-white text-xs h-8 px-3.5 gap-1.5 shrink-0 shadow-sm"
          >
            <span>Review & Confirm MoM</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Branded White-Label Portal Header */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 overflow-hidden shadow-xs">
        {/* Dynamic primary brand color bar */}
        <div
          className="p-6 md:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6 transition-colors duration-300 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, #0F172A 100%)`,
          }}
        >
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-4.5 z-10">
            {client.branding?.logo_url ? (
              <img
                src={client.branding.logo_url}
                alt={client.company}
                className="h-16 max-w-[160px] object-contain rounded-2xl bg-white/20 backdrop-blur-md p-2 border border-white/20 shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-2xl text-white border border-white/20 shadow-md">
                {client.company.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="text-white space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight">{client.company}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider">
                  Client Collaboration Portal
                </span>
                {client.health_score && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Account Health: {Math.round(client.health_score.score)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-white/80">
                Welcome back, {client.name} • Dedicated Project Workspace & Governance Hub
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 z-10 self-start md:self-end">
            {client.account_manager && (
              <div className="px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center text-xs font-bold">
                  {client.account_manager.name.slice(0, 1)}
                </div>
                <div className="text-left text-xs">
                  <div className="text-[10px] text-white/70">Account Manager</div>
                  <div className="font-semibold">{client.account_manager.name}</div>
                </div>
              </div>
            )}

            {!hideVendor && (
              <span className="text-[10px] font-semibold text-white/60 self-center">
                Powered by SalesCRM Platform
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-t border-slate-200 dark:border-white/10 flex items-center gap-1 overflow-x-auto bg-slate-50/50 dark:bg-slate-900/50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-3.5 px-3.5 border-b-2 text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400 bg-white dark:bg-slate-900 shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {typeof tab.badge !== 'undefined' && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      tab.badgeClass || 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Project Selector if Multiple Projects Exist */}
      {client.projects && client.projects.length > 1 && (
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
            <FolderKanban className="w-4 h-4 text-primary-500" />
            <span>Select Active Project Workspace:</span>
          </div>
          <select
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {client.projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name} ({proj.status.replace('_', ' ')})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: PROJECTS & ROADMAP */}
      {/* ========================================================================= */}
      {activeTab === 'projects' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {!client.projects || client.projects.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-center space-y-3">
              <FolderKanban className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">No Delivery Projects Active</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your account is set up for retainers and service tickets. Once a software delivery project is launched by your team, its live sprint timeline and GitHub velocity will appear here.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab('services')}
                className="gap-1.5 text-xs"
              >
                <Layers className="w-4 h-4" /> View My Services & Retainers
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {client.projects.map((proj: any) => {
                const totalTasks = proj.tasks_count || 0;
                const completedTasks = proj.completed_tasks_count || 0;
                const reviewTasks = proj.review_tasks_count || 0;
                const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                const activeSprint = proj.sprints?.[0];

                return (
                  <div
                    key={proj.id}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm space-y-6"
                  >
                    {/* Project Header Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                            PR3-{proj.id}
                          </span>
                          <h2 className="text-lg font-black text-slate-900 dark:text-white">
                            {proj.name}
                          </h2>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              proj.status === 'in_dev'
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                : proj.status === 'completed'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {proj.status.replace('_', ' ')}
                          </span>
                          {proj.github_repo && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 font-mono">
                              <GitBranch className="w-3 h-3 text-emerald-500" />
                              {proj.github_repo.repo_full_name}
                            </span>
                          )}
                        </div>
                        {proj.description && (
                          <p className="text-xs text-slate-500 mt-1 max-w-2xl">{proj.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-start md:self-center">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/projects/${proj.id}`)}
                          className="bg-primary-600 hover:bg-primary-500 text-white text-xs h-9 px-4 gap-1.5 shadow-sm"
                        >
                          <span>Full Project Workspace</span>
                          <ArrowUpRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* KPI Metric Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                      <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-white/5 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500">Overall Progress</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-slate-900 dark:text-white">
                            {progressPercent}%
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            ({completedTasks}/{totalTasks} tasks)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-1">
                          <div
                            className="h-full bg-primary-600 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-white/5 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500">Current Sprint</span>
                        <div className="text-base font-bold text-slate-900 dark:text-white truncate">
                          {activeSprint ? activeSprint.name : 'Sprint Planning'}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {activeSprint
                            ? `${activeSprint.velocity_achieved || 0}/${activeSprint.velocity_target || 0} pts target`
                            : 'Next sprint starting soon'}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-white/5 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500">Project Manager</span>
                        <div className="text-base font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                          <UserIcon className="w-4 h-4 text-primary-500 shrink-0" />
                          <span>{proj.project_manager?.name || 'Assigned Lead PM'}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {proj.project_manager?.email || 'Dedicated delivery manager'}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-white/5 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500">Deliverables in Review</span>
                        <div className="text-2xl font-black text-amber-600">
                          {reviewTasks}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {reviewTasks > 0 ? 'Ready for your client review' : 'No tasks waiting sign-off'}
                        </p>
                      </div>
                    </div>

                    {/* Quick Access Collaboration Strip */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-primary-500/5 via-indigo-500/5 to-slate-50 dark:to-slate-900 border border-primary-500/20 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary-600" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Direct Collaboration Actions:
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setSelectedProjectId(proj.id);
                            setActiveTab('meetings');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-2xs transition"
                        >
                          <Calendar className="w-3.5 h-3.5 text-sky-500" />
                          <span>View MoMs & Meetings</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProjectId(proj.id);
                            setActiveTab('chat');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-2xs transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Chat with Team</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProjectId(proj.id);
                            setActiveTab('git');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-2xs transition"
                        >
                          <GitBranch className="w-3.5 h-3.5 text-emerald-500" />
                          <span>GitHub Activity Telemetry</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MEETINGS & 48H MOM GOVERNANCE */}
      {/* ========================================================================= */}
      {activeTab === 'meetings' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {activeProject ? (
            <ProjectMeetingsPanel
              projectId={activeProject.id}
              isClient={true}
            />
          ) : (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              Please link an active project to view and govern sprint meetings.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SLACK TEAM CHAT */}
      {/* ========================================================================= */}
      {activeTab === 'chat' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {activeProject ? (
            <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              <ProjectChatSlack
                projectId={activeProject.id}
                projectTitle={activeProject.name}
              />
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              Please link an active project to access the team communication channel.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: GITHUB VELOCITY & TELEMETRY */}
      {/* ========================================================================= */}
      {activeTab === 'git' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {activeProject ? (
            <ProjectGitAnalyticsPanel
              projectId={activeProject.id}
              projectTitle={activeProject.name}
              tasks={activeProject.tasks || []}
              isClientView={true}
            />
          ) : (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              Please link an active project to view code velocity and GitHub telemetry.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SERVICES & RETAINERS (EXISTING) */}
      {/* ========================================================================= */}
      {activeTab === 'services' && (
        <div className="animate-in fade-in duration-150">
          <ServiceTicketsPanel
            services={client.services || []}
            onRefresh={fetchPortalData}
            isClient={!isPreviewMode}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: BILLING & INVOICES (EXISTING) */}
      {/* ========================================================================= */}
      {activeTab === 'billing' && (
        <div className="animate-in fade-in duration-150">
          <RetainerInvoicesPanel
            clientId={client.id}
            clientName={client.name}
            clientCompany={client.company}
            clientGst={client.gst_number}
            clientAddress={client.billing_address}
            clientState={client.billing_state}
            invoices={client.invoices || []}
            services={client.services || []}
            onRefresh={fetchPortalData}
            isClient={!isPreviewMode}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: DOCUMENTS & E-SIGN (EXISTING) */}
      {/* ========================================================================= */}
      {activeTab === 'documents' && (
        <div className="animate-in fade-in duration-150">
          <ClientDocumentsPanel
            clientId={client.id}
            documents={client.documents || []}
            onRefresh={fetchPortalData}
            isClient={!isPreviewMode}
            clientName={client.name}
            clientCompany={client.company}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: SETUP CHECKLIST (EXISTING) */}
      {/* ========================================================================= */}
      {activeTab === 'onboarding' && (
        <div className="max-w-2xl animate-in fade-in duration-150">
          <ClientOnboardingCard
            client={client}
            onRefresh={fetchPortalData}
            isClient={!isPreviewMode}
          />
        </div>
      )}
    </div>
  );
}
