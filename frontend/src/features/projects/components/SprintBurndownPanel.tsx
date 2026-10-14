import React, { useState, useEffect } from 'react';
import {
  Flame,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  TrendingDown,
  Target,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { projectsApi, type SprintItem, type BurndownData } from '@/api/projects.api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SprintBurndownPanelProps {
  projectId: number;
  sprints: SprintItem[];
  onRefresh: () => void;
  isClientView?: boolean;
}

export function SprintBurndownPanel({
  projectId,
  sprints,
  onRefresh,
  isClientView = false,
}: SprintBurndownPanelProps) {
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(
    sprints.find((s) => s.status === 'active')?.id || sprints[0]?.id || null
  );

  const [burndown, setBurndown] = useState<BurndownData | null>(null);
  const [loadingBurndown, setLoadingBurndown] = useState(false);

  // Close sprint modal
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [retroNotes, setRetroNotes] = useState('');
  const [closing, setClosing] = useState(false);

  // New Sprint Modal
  const [isNewSprintOpen, setIsNewSprintOpen] = useState(false);
  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintGoal, setNewSprintGoal] = useState('');
  const [newSprintVelocity, setNewSprintVelocity] = useState<number | ''>(40);
  const [newSprintStart, setNewSprintStart] = useState('');
  const [newSprintEnd, setNewSprintEnd] = useState('');
  const [creatingSprint, setCreatingSprint] = useState(false);

  const selectedSprint = sprints.find((s) => s.id === selectedSprintId);

  useEffect(() => {
    if (selectedSprintId) {
      loadBurndown(selectedSprintId);
    }
  }, [selectedSprintId]);

  const loadBurndown = async (sprintId: number) => {
    try {
      setLoadingBurndown(true);
      const res = await projectsApi.getBurndown(sprintId);
      setBurndown(res.data);
    } catch {
      // ignore
    } finally {
      setLoadingBurndown(false);
    }
  };

  const handleCloseSprint = async () => {
    if (!selectedSprintId) return;
    try {
      setClosing(true);
      await projectsApi.closeSprint(selectedSprintId, retroNotes || undefined);
      toast.success('Sprint closed successfully and velocity computed!');
      setIsCloseModalOpen(false);
      setRetroNotes('');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to close sprint.');
    } finally {
      setClosing(false);
    }
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSprintName.trim()) {
      toast.error('Sprint name is required.');
      return;
    }

    try {
      setCreatingSprint(true);
      await projectsApi.createSprint(projectId, {
        name: newSprintName.trim(),
        goal: newSprintGoal.trim() || undefined,
        velocity_target: newSprintVelocity ? Number(newSprintVelocity) : undefined,
        start_date: newSprintStart || undefined,
        end_date: newSprintEnd || undefined,
        status: 'active',
      });

      toast.success('Sprint created and set to active!');
      setIsNewSprintOpen(false);
      setNewSprintName('');
      setNewSprintGoal('');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create sprint.');
    } finally {
      setCreatingSprint(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sprint Selection Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Sprint Planning &amp; Burndown Velocity
            </h3>
            <p className="text-xs text-slate-500">2-week timeboxes with ideal vs actual burn tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sprint Selector */}
          {sprints.length > 0 && (
            <select
              value={selectedSprintId || ''}
              onChange={(e) => setSelectedSprintId(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-semibold focus:outline-none"
            >
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status.toUpperCase()})
                </option>
              ))}
            </select>
          )}

          {!isClientView && (
            <>
              {selectedSprint?.status === 'active' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCloseModalOpen(true)}
                  className="text-xs h-8 border-orange-500/30 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Close Sprint
                </Button>
              )}

              <Button size="sm" onClick={() => setIsNewSprintOpen(true)} className="text-xs h-8 gap-1">
                <Plus className="w-3.5 h-3.5" /> New Sprint
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Sprint Overview Metrics */}
      {selectedSprint ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10">
              <span className="text-[11px] font-semibold text-slate-400">Sprint Timeline</span>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary-500" />
                {selectedSprint.start_date} → {selectedSprint.end_date}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10">
              <span className="text-[11px] font-semibold text-slate-400">Velocity Target</span>
              <p className="text-sm font-black text-primary-600 dark:text-primary-400 mt-1 flex items-center gap-1.5">
                <Target className="w-4 h-4" />
                {selectedSprint.velocity_target ? `${selectedSprint.velocity_target} pts` : 'Not set'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10">
              <span className="text-[11px] font-semibold text-slate-400">Scope Delivered</span>
              <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {selectedSprint.completed_story_points || 0} / {selectedSprint.total_story_points || 0} pts
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10">
              <span className="text-[11px] font-semibold text-slate-400">Sprint Status</span>
              <div className="mt-1">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-md text-[10px] uppercase font-black ${
                    selectedSprint.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : selectedSprint.status === 'completed'
                      ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {selectedSprint.status}
                </span>
              </div>
            </div>
          </div>

          {/* Goal banner */}
          {selectedSprint.goal && (
            <div className="p-3 rounded-xl bg-primary-500/5 border border-primary-500/15 text-xs text-primary-800 dark:text-primary-300">
              <strong>Sprint Goal:</strong> {selectedSprint.goal}
            </div>
          )}

          {/* Recharts Burndown Chart */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-orange-500" />
                  Sprint Burndown Trajectory
                </h4>
                <p className="text-xs text-slate-400">Remaining scope over sprint timeline</p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-indigo-400 border-dashed" />
                  <span className="text-slate-500">Ideal Guideline</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-emerald-500 rounded-full" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Actual Burn</span>
                </div>
              </div>
            </div>

            <div className="h-72 w-full pt-2">
              {loadingBurndown ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Calculating burndown...
                </div>
              ) : burndown && burndown.burndown_points.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={burndown.burndown_points} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#121217',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        fontSize: '11px',
                        color: '#fff',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ideal_remaining"
                      name="Ideal Remaining"
                      stroke="#818cf8"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual_remaining"
                      name="Actual Remaining"
                      stroke="#10b981"
                      strokeWidth={3}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No task points logged in this sprint yet.
                </div>
              )}
            </div>
          </div>

          {/* Retrospective notes if sprint is completed */}
          {selectedSprint.retrospective_notes && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 space-y-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary-500" /> Sprint Retrospective &amp; Review
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                {selectedSprint.retrospective_notes}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center bg-white dark:bg-[#121217] rounded-3xl border border-slate-200/80 dark:border-white/10 text-slate-400 text-xs">
          No sprints created yet for this project.
        </div>
      )}

      {/* Close Sprint Modal */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        maxWidth="md"
        title={
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span>Close Sprint &amp; Log Retrospective</span>
          </div>
        }
        description={`Sprint: ${selectedSprint?.name || ''}`}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setIsCloseModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCloseSprint} disabled={closing} className="bg-orange-600 hover:bg-orange-700 text-white">
              {closing ? 'Closing...' : 'Confirm & Close Sprint'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 pt-1">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Sprint Retrospective Notes (What went well, what can be improved?)
          </label>
          <textarea
            value={retroNotes}
            onChange={(e) => setRetroNotes(e.target.value)}
            placeholder="Team completed auth module ahead of schedule. Staging deployment had 1 CORS delay..."
            rows={4}
            className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none font-sans"
          />
        </div>
      </Modal>

      {/* New Sprint Modal */}
      <Modal
        isOpen={isNewSprintOpen}
        onClose={() => setIsNewSprintOpen(false)}
        maxWidth="md"
        title={
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <span>Create New Sprint Timebox</span>
          </div>
        }
        description="Define cadence, velocity target, and sprint objectives."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsNewSprintOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="button" disabled={creatingSprint} onClick={handleCreateSprint}>
              {creatingSprint ? 'Creating...' : 'Launch Sprint'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateSprint} className="space-y-3.5 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Sprint Name *
            </label>
            <input
              type="text"
              required
              value={newSprintName}
              onChange={(e) => setNewSprintName(e.target.value)}
              placeholder="e.g. Sprint 2 - Payments & Webhooks"
              className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Sprint Goal
            </label>
            <input
              type="text"
              value={newSprintGoal}
              onChange={(e) => setNewSprintGoal(e.target.value)}
              placeholder="e.g. Complete Stripe checkout and PDF invoice delivery"
              className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={newSprintStart}
                onChange={(e) => setNewSprintStart(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={newSprintEnd}
                onChange={(e) => setNewSprintEnd(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Velocity Target (Story Points)
            </label>
            <input
              type="number"
              min="1"
              value={newSprintVelocity}
              onChange={(e) => setNewSprintVelocity(e.target.value ? Number(e.target.value) : '')}
              className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
