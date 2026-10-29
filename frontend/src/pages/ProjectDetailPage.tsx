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
  Sliders,
  Edit3,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
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
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [updatingProject, setUpdatingProject] = useState(false);
  const [projectFormData, setProjectFormData] = useState({
    name: '',
    status: 'in_dev',
    budget: '',
    description: '',
    sprint_duration_days: '14',
  });

  const openEditProjectModal = () => {
    if (!project) return;
    const initialBudget = project.total_budget || project.total_value || '';
    setProjectFormData({
      name: project.name || '',
      status: project.status || 'in_dev',
      budget: initialBudget ? String(initialBudget) : '',
      description: project.description || '',
      sprint_duration_days: String(project.sprint_duration_days || 14),
    });
    setShowEditProjectModal(true);
  };

  const handleSaveProjectDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    try {
      setUpdatingProject(true);
      const budgetVal = projectFormData.budget ? Number(projectFormData.budget) : 0;
      await projectsApi.updateProject(projectId, {
        name: projectFormData.name,
        status: projectFormData.status,
        total_value: budgetVal,
        total_budget: budgetVal,
        description: projectFormData.description || null,
        sprint_duration_days: Number(projectFormData.sprint_duration_days) || 14,
      });
      toast.success('Project details and budget updated successfully!');
      setShowEditProjectModal(false);
      fetchProjectDetails();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update project.');
    } finally {
      setUpdatingProject(false);
    }
  };

  const isSuperAdmin = Boolean(user?.roles?.some((r) => r === 'super_admin' || r === 'superadmin'));
  const isProjectManager = Boolean(user?.roles?.includes('project_manager'));
  const isAccountManager = Boolean(user?.roles?.includes('account_manager'));
  const isDeveloper = Boolean(user?.roles?.includes('developer'));
  const isSales = Boolean(user?.roles?.some((r) => r === 'sales_agent' || r === 'sales_manager'));
  const isClient = Boolean(user?.roles?.includes('client'));
  const canViewBudget = isSuperAdmin || isProjectManager || isAccountManager;

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
    if (isClient) {
      if (project) {
        const team: any[] = [];
        if (project.project_manager) {
          team.push({
            id: project.project_manager.id,
            name: project.project_manager.name,
            email: project.project_manager.email,
          });
        }
        (project.tasks || []).forEach((t) => {
          if (t.assignee && !team.some((m) => m.id === t.assignee!.id)) {
            team.push({
              id: t.assignee.id,
              name: t.assignee.name,
              email: t.assignee.email,
            });
          }
        });
        setUsers(team as any);
      }
      return;
    }

    adminApi
      .getUsers()
      .then((res) => {
        if (res.data) setUsers(res.data);
      })
      .catch(() => {
        // Fallback for non-admin
      });
  }, [isClient, project]);

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
        return canViewBudget;
      }
      if (tab.key === 'ai') {
        return isSuperAdmin || isProjectManager;
      }
      if (tab.key === 'time') {
        return !isClient;
      }
      if (tab.key === 'git') {
        return !(isSales && !isSuperAdmin && !isProjectManager);
      }
      return true;
    });
  }, [allTabs, canViewBudget, isSuperAdmin, isProjectManager, isClient, isSales]);

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
    <div className="w-full max-w-full px-2.5 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-6 pb-20">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-2">
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
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
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
                <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                PM: <strong className="text-slate-700 dark:text-slate-300">{project.project_manager.name}</strong>
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight break-words">
            {project.name}
          </h1>

          {project.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              {project.description}
            </p>
          )}
        </div>

        {/* Header Right Actions & Budget Consumption Badge */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          {(isSuperAdmin || isProjectManager) && (
            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 w-full sm:w-auto sm:min-w-[200px]">
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
                <span>Budget: ₹{Number(project.budget_snapshot?.total_budget || project.total_value || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {(isSuperAdmin || isProjectManager) && (
              <button
                type="button"
                onClick={openEditProjectModal}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors shadow-xs cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden xs:inline">Edit Budget</span>
                <span className="xs:hidden">Edit</span>
              </button>
            )}

            <button
              onClick={() => setShowCreateTaskModal(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation Pill Bar - Horizontal touch scroll */}
      <div className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-x-auto scrollbar-none touch-pan-x flex-nowrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>{tab.label}</span>
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
            tasks={project.tasks || []}
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

        {activeTab === 'budget' && canViewBudget && (
          <ProjectBudgetPanel
            projectId={projectId}
            budget={project.budget_snapshot}
            capacity={project.capacity_matrix || []}
            isClientView={isClient}
            onRefresh={fetchProjectDetails}
            onEditBudget={openEditProjectModal}
          />
        )}

        {activeTab === 'scope' && (
          <ScopeGovernancePanel
            projectId={projectId}
            project={project}
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
            sprints={project.sprints || []}
            milestones={project.milestones || []}
            existingTasks={project.tasks || []}
            onTaskCreated={fetchProjectDetails}
            onNavigateToKanban={() => setActiveTab('kanban')}
          />
        )}

        {activeTab === 'git' && (
          <ProjectGitAnalyticsPanel
            projectId={projectId}
            projectTitle={project.name}
            tasks={project.tasks || []}
            isClientView={isClient}
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

      {/* Edit Project & Budget Configuration Modal */}
      {showEditProjectModal && (
        <Modal
          isOpen={showEditProjectModal}
          onClose={() => setShowEditProjectModal(false)}
          title={`Edit Project & Budget: ${project.name}`}
          maxWidth="lg"
        >
          <form onSubmit={handleSaveProjectDetails} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={projectFormData.name}
                onChange={(e) => setProjectFormData({ ...projectFormData, name: e.target.value })}
                className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Project Status
                </label>
                <select
                  value={projectFormData.status}
                  onChange={(e) => setProjectFormData({ ...projectFormData, status: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                >
                  <option value="draft">Draft</option>
                  <option value="scope_approved">Scope Approved</option>
                  <option value="in_dev">In Development (Active)</option>
                  <option value="client_review">Client Review</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Sprint Duration (Days)
                </label>
                <input
                  type="number"
                  min="7"
                  max="30"
                  value={projectFormData.sprint_duration_days}
                  onChange={(e) => setProjectFormData({ ...projectFormData, sprint_duration_days: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all font-mono"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                Project Budget (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 15000"
                value={projectFormData.budget}
                onChange={(e) => setProjectFormData({ ...projectFormData, budget: e.target.value })}
                className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-900/50 text-sm font-bold text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Total allocated budget for project execution. Developer worklogs will track labor consumption against this amount.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Description / Notes
              </label>
              <textarea
                rows={3}
                value={projectFormData.description}
                onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
                className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all resize-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditProjectModal(false)}
                className="text-xs h-9 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updatingProject}
                className="text-xs h-9 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20"
              >
                {updatingProject ? 'Saving Budget...' : 'Save & Recalculate Budget'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

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
