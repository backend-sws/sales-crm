import React, { useState } from 'react';
import { CheckSquare, Users, AlertCircle, Link2, Sparkles } from 'lucide-react';
import { projectsApi, type TaskItem, type SprintItem, type ProjectMilestoneItem } from '@/api/projects.api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CreateTaskModalProps {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sprints?: SprintItem[];
  milestones?: ProjectMilestoneItem[];
  existingTasks?: TaskItem[];
  teamMembers?: { id: number; name: string; avatar?: string | null }[];
}

export function CreateTaskModal({
  projectId,
  isOpen,
  onClose,
  onSuccess,
  sprints = [],
  milestones = [],
  existingTasks = [],
  teamMembers = [],
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState<number | ''>('');
  const [sprintId, setSprintId] = useState<number | ''>('');
  const [milestoneId, setMilestoneId] = useState<number | ''>('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [complexity, setComplexity] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [storyPoints, setStoryPoints] = useState<number | ''>(3);
  const [estimatedHours, setEstimatedHours] = useState<number | ''>(4);
  const [dependsOnIds, setDependsOnIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Task title is required.');
      return;
    }

    try {
      setLoading(true);
      await projectsApi.createTask(projectId, {
        title,
        description,
        assignee_id: assigneeId ? Number(assigneeId) : null,
        sprint_id: sprintId ? Number(sprintId) : null,
        milestone_id: milestoneId ? Number(milestoneId) : null,
        priority,
        complexity,
        story_points: storyPoints ? Number(storyPoints) : 1,
        estimated_hours: estimatedHours ? Number(estimatedHours) : 1,
        depends_on: dependsOnIds,
      });

      toast.success('Task created successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create task.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDependency = (id: number) => {
    setDependsOnIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
            <CheckSquare className="w-4 h-4" />
          </div>
          <span>Create Project Task</span>
        </div>
      }
      description="Backlog, Sprint & Kanban Execution"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={loading} onClick={handleSubmit} className="gap-1.5">
            <CheckSquare className="w-4 h-4" />
            {loading ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Implement Webhook Deduplication and Anti-Loss Alarm"
            className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Description &amp; Acceptance Criteria
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detail required functionality, endpoints, UI states, or test conditions..."
            rows={3}
            className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Assignee */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Assignee
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : '')}
              className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            >
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sprint */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Sprint
            </label>
            <select
              value={sprintId}
              onChange={(e) => setSprintId(e.target.value ? Number(e.target.value) : '')}
              className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            >
              <option value="">No Sprint (Direct to Backlog)</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Milestone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Milestone Allocation
            </label>
            <select
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value ? Number(e.target.value) : '')}
              className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            >
              <option value="">General (No Milestone)</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} (${Number(m.amount).toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="critical">Critical / Blocker</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Complexity */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Complexity
            </label>
            <select
              value={complexity}
              onChange={(e) => setComplexity(e.target.value as any)}
              className="w-full h-9 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            >
              <option value="easy">Easy (1-3 pts)</option>
              <option value="medium">Medium (5 pts)</option>
              <option value="hard">Hard (8-13 pts)</option>
            </select>
          </div>

          {/* Story Points */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Story Points
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={storyPoints}
              onChange={(e) => setStoryPoints(e.target.value ? Number(e.target.value) : '')}
              className="w-full h-9 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </div>

          {/* Est Hours */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Est. Hours
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value ? Number(e.target.value) : '')}
              className="w-full h-9 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </div>
        </div>

        {/* Dependencies Selector */}
        {existingTasks.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-primary-500" />
              Task Dependencies (Cannot start until selected tasks are Done)
            </label>
            <div className="max-h-32 overflow-y-auto border border-slate-200 dark:border-zinc-800 rounded-xl p-2 space-y-1 bg-slate-50/50 dark:bg-zinc-900/50">
              {existingTasks.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={dependsOnIds.includes(t.id)}
                    onChange={() => toggleDependency(t.id)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="truncate text-slate-700 dark:text-slate-300 font-medium">{t.title}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 ml-auto">[{t.status}]</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
