import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FolderKanban,
  ArrowLeft,
  Columns3,
  Flame,
  CalendarDays,
  Clock,
  TrendingUp,
  ShieldCheck,
  Calendar,
  Plus,
  Building2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Users,
} from 'lucide-react';
import {
  projectsApi,
  type ProjectItem,
  type ScopeVersionItem,
  type ChangeRequestItem,
} from '../api/projects.api';
import { adminApi, type AdminUserItem } from '../api/admin.api';
import { useAuthStore } from '../store/authStore';
import { KanbanBoard } from '../features/projects/components/KanbanBoard';
import { SprintBurndownPanel } from '../features/projects/components/SprintBurndownPanel';
import { GanttChartView } from '../features/projects/components/GanttChartView';
import { TimeWorklogsPanel } from '../features/projects/components/TimeWorklogsPanel';
import { ProjectBudgetPanel } from '../features/projects/components/ProjectBudgetPanel';
import { ScopeGovernancePanel } from '../features/projects/components/ScopeGovernancePanel';
import { ProjectMeetingsPanel } from '../features/projects/components/ProjectMeetingsPanel';
import { CreateTaskModal } from '../features/projects/components/CreateTaskModal';
import { ProjectChatSlack } from '../features/projects/components/ProjectChatSlack';
import { ProjectGitAnalyticsPanel } from '../features/projects/components/ProjectGitAnalyticsPanel';
import { ProjectAiInsightsPanel } from '../features/projects/components/ProjectAiInsightsPanel';
import { MessageSquare, GitBranch, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

type ProjectTab = 'kanban' | 'sprints' | 'gantt' | 'time' | 'budget' | 'scope' | 'meetings' | 'chat' | 'git' | 'ai';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const projectId = Number(id);

  const [project, setProject] = useState<ProjectItem | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [scopeVersions, setScopeVersions] = useState<ScopeVersionItem[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProjectTab>('kanban');
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

  const isSuperAdmin = Boolean(user?.roles?.some((r) => r === 'super_admin' || r === 'superadmin'));
  const isProjectManager = Boolean(user?.roles?.includes('project_manager'));
  const isDeveloper = Boolean(user?.roles?.includes('developer'));
  const isSales = Boolean(user?.roles?.some((r) => r === 'sales_agent' || r === 'sales_manager'));
  const isClient = Boolean(user?.roles?.includes('client'));

  const fetchProjectDetails = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [projRes, scopeRes, crRes] = await Promise.all([
        projectsApi.getProject(projectId),
        projectsApi.listScopeVersions(projectId).catch(() => ({ data: [] })),
        projectsApi.listChangeRequests(projectId).catch(() => ({ data: [] })),
      ]);

      if (projRes.success && projRes.data) {
        setProject(projRes.data);
      }
      if (scopeRes && scopeRes.data) {
        setScopeVersions(scopeRes.data);
      }
      if (crRes && crRes.data) {
        setChangeRequests(crRes.data);
      }
    } catch (err: any) {
      toast.error('Failed to load project details.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  useEffect(() => {
    adminApi
      .getUsers()
      .then((res) => {
        if (res.data) setUsers(res.data);
      })
      .catch(() => {
        // Fallback for non-admin
      });
  }, []);

  const allTabs: { key: ProjectTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = useMemo(
    () => [
      { key: 'kanban', label: 'Kanban Board', icon: Columns3 },
      { key: 'sprints', label: 'Sprints & Burndown', icon: Flame },
      { key: 'gantt', label: 'Gantt Timeline', icon: CalendarDays },
      { key: 'time', label: 'Time & Worklogs', icon: Clock },
      { key: 'budget', label: 'Budget & Capacity', icon: TrendingUp },
      { key: 'scope', label: 'Scope Governance & CR', icon: ShieldCheck },
      { key: 'meetings', label: 'Meetings & MoM', icon: Calendar },
      { key: 'chat', label: 'Slack Chat', icon: MessageSquare },
      { key: 'git', label: 'Git & Analytics', icon: GitBranch },
      { key: 'ai', label: 'Gemini AI', icon: Sparkles },
    ],
    []
  );

  const tabs = useMemo(() => {
    return allTabs.filter((tab) => {
      if (tab.key === 'budget') {
        return isSuperAdmin || isProjectManager;
      }
      if (tab.key === 'ai') {
        return isSuperAdmin || isProjectManager;
      }
      if (tab.key === 'time') {
        return !isClient;
      }
      if (tab.key === 'git') {
        return !isClient && !(isSales && !isSuperAdmin && !isProjectManager);
      }
      return true;
    });
  }, [allTabs, isSuperAdmin, isProjectManager, isClient, isSales]);

  useEffect(() => {
    if (tabs.length > 0 && !tabs.some((t) => t.key === activeTab)) {
      setActiveTab(tabs[0].key);
    }
  }, [tabs, activeTab]);

  if (loading && !project) {
    return (
      <div className="w-full h-96 flex items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="w-full px-8 py-16 text-center space-y-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Project Not Found</h3>
        <p className="text-xs text-slate-500">The requested project could not be located or you lack permissions.</p>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
        >
          Return to Projects
        </button>
      </div>
    );
  }

  const budgetPercent = project.budget_snapshot?.budget_consumed_percent || 0;
  const isAlert = project.budget_snapshot?.is_alert_threshold;
  const isOver = project.budget_snapshot?.is_over_budget;

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/projects')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects Directory
        </button>

        {project.client && (
          <Link
            to={`/clients/${project.client.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            <Building2 className="w-3.5 h-3.5" />
            Client: {project.client.company || project.client.name}
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* Hero Workspace Header Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              PRJ-{project.id}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                project.status === 'in_dev'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                  : project.status === 'completed'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  : project.status === 'client_review'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              {project.status.replace('_', ' ')}
            </span>
            {project.project_manager && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                PM: <strong className="text-slate-700 dark:text-slate-300">{project.project_manager.name}</strong>
              </span>
            )}
          </div>

          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {project.name}
          </h1>

          {project.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              {project.description}
            </p>
          )}
        </div>

        {/* Header Right Actions & Budget Consumption Badge */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {(isSuperAdmin || isProjectManager) && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 min-w-[200px]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1 font-medium">
                  Budget Consumed
                  {isOver ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  ) : isAlert ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  ) : null}
                </span>
                <span
                  className={`font-black ${
                    isOver
                      ? 'text-rose-500'
                      : isAlert
                      ? 'text-amber-500'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {budgetPercent}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOver ? 'bg-rose-500' : isAlert ? 'bg-amber-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>Cost: ₹{Number(project.budget_snapshot?.actual_cost || 0).toLocaleString('en-IN')}</span>
                <span>Total: ₹{Number(project.total_value || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowCreateTaskModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </button>
        </div>
      </div>

      {/* Tab Navigation Pill Bar */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Views */}
      <div className="mt-4">
        {activeTab === 'kanban' && (
          <KanbanBoard
            projectId={projectId}
            tasks={project.tasks || []}
            sprints={project.sprints || []}
            milestones={project.milestones || []}
            teamMembers={users}
            onRefresh={fetchProjectDetails}
            isClientView={isClient}
          />
        )}

        {activeTab === 'sprints' && (
          <SprintBurndownPanel
            projectId={projectId}
            sprints={project.sprints || []}
            onRefresh={fetchProjectDetails}
            isClientView={isClient}
          />
        )}

        {activeTab === 'gantt' && (
          <GanttChartView
            projectId={projectId}
          />
        )}

        {activeTab === 'time' && !isClient && (
          <TimeWorklogsPanel
            projectId={projectId}
            tasks={project.tasks || []}
            onRefresh={fetchProjectDetails}
            isClientView={isClient}
            hideCosts={!isSuperAdmin && !isProjectManager}
          />
        )}

        {activeTab === 'budget' && (isSuperAdmin || isProjectManager) && (
          <ProjectBudgetPanel
            budget={project.budget_snapshot}
            capacity={project.capacity_matrix || []}
            isClientView={isClient}
          />
        )}

        {activeTab === 'scope' && (
          <ScopeGovernancePanel
            projectId={projectId}
            scopeVersions={scopeVersions}
            changeRequests={changeRequests}
            onRefresh={fetchProjectDetails}
            isClientView={isClient}
          />
        )}

        {activeTab === 'meetings' && (
          <ProjectMeetingsPanel
            projectId={projectId}
            users={users}
            isClient={isClient}
          />
        )}

        {activeTab === 'chat' && (
          <ProjectChatSlack
            projectId={projectId}
            projectTitle={project.name}
            teamMembers={users}
          />
        )}

        {activeTab === 'git' && (
          <ProjectGitAnalyticsPanel
            projectId={projectId}
            projectTitle={project.name}
            tasks={project.tasks || []}
          />
        )}

        {activeTab === 'ai' && (isSuperAdmin || isProjectManager) && (
          <ProjectAiInsightsPanel
            projectId={projectId}
            projectTitle={project.name}
            sprints={project.sprints || []}
            onTaskCreated={fetchProjectDetails}
          />
        )}
      </div>

      {/* Global Task Creation Modal */}
      {showCreateTaskModal && (
        <CreateTaskModal
          projectId={projectId}
          isOpen={showCreateTaskModal}
          onClose={() => setShowCreateTaskModal(false)}
          onSuccess={() => {
            setShowCreateTaskModal(false);
            fetchProjectDetails();
          }}
          sprints={project.sprints || []}
          milestones={project.milestones || []}
          existingTasks={project.tasks || []}
          teamMembers={users}
        />
      )}
    </div>
  );
}
