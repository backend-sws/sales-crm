import React, { useState, useEffect } from 'react';
import { Clock, Plus, IndianRupee, Calendar, User as UserIcon, CheckCircle2, Shield } from 'lucide-react';
import { projectsApi, type TimeEntryItem, type TaskItem } from '@/api/projects.api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TimeWorklogsPanelProps {
  projectId: number;
  tasks: TaskItem[];
  onRefresh: () => void;
  isClientView?: boolean;
}

export function TimeWorklogsPanel({
  projectId,
  tasks,
  onRefresh,
  isClientView = false,
}: TimeWorklogsPanelProps) {
  const [worklogs, setWorklogs] = useState<TimeEntryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual Log Modal
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | ''>(tasks[0]?.id || '');
  const [hours, setHours] = useState<number | ''>(2);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isBillable, setIsBillable] = useState(true);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadWorklogs();
  }, [projectId]);

  const loadWorklogs = async () => {
    try {
      setLoading(true);
      const res = await projectsApi.getProjectWorklogs(projectId);
      setWorklogs(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleLogManualTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId) {
      toast.error('Please select a task to log time against.');
      return;
    }

    try {
      setSaving(true);
      await projectsApi.logManualTime(Number(selectedTaskId), {
        duration_hours: Number(hours),
        date,
        is_billable: isBillable,
        description: description.trim() || undefined,
      });

      toast.success('Work session logged successfully!');
      setIsLogModalOpen(false);
      setDescription('');
      loadWorklogs();
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to log time.');
    } finally {
      setSaving(false);
    }
  };

  const totalMinutes = worklogs.reduce((acc, curr) => acc + curr.duration_minutes, 0);
  const totalHours = roundDec(totalMinutes / 60, 1);
  const totalCost = worklogs.reduce((acc, curr) => acc + (curr.cost || 0), 0);

  function roundDec(val: number, places: number) {
    const factor = Math.pow(10, places);
    return Math.round(val * factor) / factor;
  }

  return (
    <div className="space-y-5">
      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Total Hours Tracked</span>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {totalHours} hrs
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {!isClientView && (
          <div className="p-4 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400">Total Labor Cost</span>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                ₹{totalCost.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Total Sessions</span>
            <p className="text-xl font-black text-primary-600 dark:text-primary-400 mt-0.5">
              {worklogs.length} logged
            </p>
          </div>
          {!isClientView && (
            <Button size="sm" onClick={() => setIsLogModalOpen(true)} className="gap-1.5 h-8">
              <Plus className="w-3.5 h-3.5" /> Log Work
            </Button>
          )}
        </div>
      </div>

      {/* Worklogs Table */}
      <div className="rounded-3xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Developer Sessions &amp; Time Log
          </h4>
          <span className="text-xs text-slate-400">{worklogs.length} entries</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading worklogs...</div>
        ) : worklogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No time recorded on this project yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Task</th>
                  <th className="py-2.5 px-4">Team Member</th>
                  <th className="py-2.5 px-4">Date &amp; Time</th>
                  <th className="py-2.5 px-4">Duration</th>
                  {!isClientView && <th className="py-2.5 px-4">Cost</th>}
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {worklogs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white max-w-[200px] truncate">
                      {entry.task?.title || 'General Task'}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <div className="w-5 h-5 rounded-full bg-primary-500/10 text-primary-600 font-bold text-[9px] flex items-center justify-center">
                          {entry.user?.name?.charAt(0) || 'U'}
                        </div>
                        <span>{entry.user?.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {new Date(entry.started_at).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {entry.hours} hrs
                    </td>
                    {!isClientView && (
                      <td className="py-2.5 px-4 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        ₹{(entry.cost || 0).toLocaleString('en-IN')}
                      </td>
                    )}
                    <td className="py-2.5 px-4">
                      {entry.is_billable ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          Billable
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                          Non-billable
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 max-w-[220px] truncate">
                      {entry.description || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Time Entry Modal */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        maxWidth="md"
        title={
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <span>Log Work Session</span>
          </div>
        }
        description="Record billable engineering hours against project deliverables."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsLogModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="button" disabled={saving} onClick={handleLogManualTime}>
              {saving ? 'Logging...' : 'Save Worklog'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleLogManualTime} className="space-y-3.5 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Task <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="">Select task...</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.status})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Hours Worked
              </label>
              <input
                type="number"
                step="0.25"
                min="0.1"
                required
                value={hours}
                onChange={(e) => setHours(e.target.value ? Number(e.target.value) : '')}
                className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="billable_check"
              checked={isBillable}
              onChange={(e) => setIsBillable(e.target.checked)}
              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="billable_check" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              Is Billable Time (Calculates labor cost towards project budget)
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Notes / Work Accomplished
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Unit tests implemented and verified..."
              rows={3}
              className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
