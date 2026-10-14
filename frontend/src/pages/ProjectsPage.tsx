import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Search,
  Filter,
  Plus,
  Building2,
  Calendar,
  Clock,
  ArrowRight,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Users,
  ShieldCheck,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { projectsApi, type ProjectItem } from '../api/projects.api';
import { clientsApi, type ClientItem } from '../api/clients.api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');

  // Create Project Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    client_id: '',
    description: '',
    status: 'in_dev',
    total_value: '',
    start_date: new Date().toISOString().slice(0, 10),
    target_end_date: '',
    sprint_duration_days: '14',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (clientFilter !== 'all') params.client_id = Number(clientFilter);

      const [projRes, clientRes] = await Promise.all([
        projectsApi.listProjects(params),
        clientsApi.getClients({ per_page: 100 }),
      ]);

      if (projRes.success && projRes.data) {
        setProjects(projRes.data);
      }
      if (clientRes && clientRes.data) {
        setClients(clientRes.data);
      }
    } catch (err: any) {
      toast.error('Failed to load projects list.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, clientFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchData]);

  // Aggregate stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'in_dev' || p.status === 'scope_approved').length;
  const totalValue = projects.reduce((acc, p) => acc + Number(p.total_value || 0), 0);
  const totalBudgetConsumed = projects.reduce((acc, p) => {
    const budget = Number(p.total_value || 0);
    const consumed = p.budget_snapshot?.budget_consumed_percent || 0;
    return acc + (budget * consumed) / 100;
  }, 0);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim() || !newProject.client_id) {
      toast.error('Project name and client are required.');
      return;
    }

    try {
      setCreateSubmitting(true);
      const payload: any = {
        name: newProject.name,
        client_id: Number(newProject.client_id),
        description: newProject.description || null,
        status: newProject.status,
        total_value: newProject.total_value ? Number(newProject.total_value) : 0,
        start_date: newProject.start_date || null,
        target_end_date: newProject.target_end_date || null,
        sprint_duration_days: Number(newProject.sprint_duration_days) || 14,
      };

      const res = await projectsApi.createProject(payload);
      if (res.success) {
        toast.success('Project created successfully!');
        setShowCreateModal(false);
        setNewProject({
          name: '',
          client_id: '',
          description: '',
          status: 'in_dev',
          total_value: '',
          start_date: new Date().toISOString().slice(0, 10),
          target_end_date: '',
          sprint_duration_days: '14',
        });
        fetchData();
        if (res.data?.id) {
          navigate(`/projects/${res.data.id}`);
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create project.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-sky-500/20 border border-indigo-500/30 text-indigo-500 flex items-center justify-center">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Project Delivery & Sprint Governance
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Phase 4
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dispute-proof SOW locking, 5-stage Kanban, Live Timers, Sprint Burndowns &amp; 48-Hour MoM Rules.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          New Project Track
        </button>
      </div>

      {/* Aggregate KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Projects
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {activeProjects}
            </span>
            <span className="text-xs text-slate-400">/ {totalProjects} total</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            Active sprint governance underway
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Contract Value
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              ${totalValue.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Locked under baseline SOW contracts
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Labor Consumed
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              ${Math.round(totalBudgetConsumed).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">
              ({totalValue > 0 ? Math.round((totalBudgetConsumed / totalValue) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Real-time telemetry from timer logs
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Governance Standard
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              100%
            </span>
            <span className="text-xs text-emerald-500 font-semibold">Dispute-Proof</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-500" />
            Mandatory proof &amp; 48h MoM active
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="in_dev">In Development</option>
            <option value="scope_approved">Scope Approved</option>
            <option value="client_review">Client Review</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company || c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400">Loading project tracks...</div>
      ) : projects.length === 0 ? (
        <div className="p-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <FolderKanban className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Projects Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Initialize a new project track with dispute-proof SOW scope baseline, sprint cadence, and budget telemetry.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20"
          >
            Create New Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => {
            const budgetPercent = proj.budget_snapshot?.budget_consumed_percent || 0;
            const isAlert = proj.budget_snapshot?.is_alert_threshold;
            const isOver = proj.budget_snapshot?.is_over_budget;

            return (
              <div
                key={proj.id}
                onClick={() => navigate(`/projects/${proj.id}`)}
                className="group relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 p-6 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Top Row: ID badge & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      PRJ-{proj.id}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        proj.status === 'in_dev'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                          : proj.status === 'completed'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : proj.status === 'client_review'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {proj.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Title & Client */}
                  <div className="mt-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {proj.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {proj.client?.company || proj.client?.name || 'No Client Assigned'}
                    </p>
                  </div>

                  {/* Description preview */}
                  {proj.description && (
                    <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {proj.description}
                    </p>
                  )}

                  {/* Budget Progress Bar */}
                  <div className="mt-5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1">
                        Budget Consumed
                        {isOver ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        ) : isAlert ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        ) : null}
                      </span>
                      <span
                        className={`font-bold ${
                          isOver
                            ? 'text-rose-500'
                            : isAlert
                            ? 'text-amber-500'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {budgetPercent}% (${Number(proj.total_value || 0).toLocaleString()})
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOver ? 'bg-rose-500' : isAlert ? 'bg-amber-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Meta: PM, Sprints & Arrow */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    {proj.project_manager ? (
                      <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        PM: {proj.project_manager.name}
                      </span>
                    ) : (
                      <span className="text-slate-400">No PM Assigned</span>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                    Workspace
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="2xl"
        title={
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
            <span>Create New Project Track</span>
          </div>
        }
        description="Set up contract value, client association, and sprint cadence governance."
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={createSubmitting}
              onClick={handleCreateSubmit}
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
            >
              {createSubmitting ? 'Creating Project...' : 'Launch Project Track'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Project Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. FinTech Mobile App Replatforming"
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Client Association *
            </label>
            <select
              required
              value={newProject.client_id}
              onChange={(e) => setNewProject({ ...newProject, client_id: e.target.value })}
              className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company || c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Contract / Budget Value ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 25000"
                value={newProject.total_value}
                onChange={(e) => setNewProject({ ...newProject, total_value: e.target.value })}
                className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Sprint Cadence (Days)
              </label>
              <input
                type="number"
                min="7"
                step="1"
                placeholder="e.g. 14"
                value={newProject.sprint_duration_days}
                onChange={(e) => setNewProject({ ...newProject, sprint_duration_days: e.target.value })}
                className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={newProject.start_date}
                onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target End Date
              </label>
              <input
                type="date"
                value={newProject.target_end_date}
                onChange={(e) => setNewProject({ ...newProject, target_end_date: e.target.value })}
                className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Description / High-Level Scope
            </label>
            <textarea
              rows={3}
              placeholder="Outline key deliverables, tech stack, and goals..."
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all resize-none"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
