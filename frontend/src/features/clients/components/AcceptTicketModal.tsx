import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  UserCheck,
  FolderGit2,
  Clock,
  Layers,
  Sparkles,
  AlertCircle,
  Hash,
  Loader2,
  Calendar,
} from 'lucide-react';
import { clientsApi, type ServiceRequestItem } from '@/api/clients.api';
import { adminApi, type AdminUserItem } from '@/api/admin.api';
import { projectsApi, type ProjectItem } from '@/api/projects.api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';

interface AcceptTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: ServiceRequestItem | null;
  serviceName?: string;
  onSuccess: (updatedTicket: ServiceRequestItem) => void;
}

export const AcceptTicketModal: React.FC<AcceptTicketModalProps> = ({
  isOpen,
  onClose,
  ticket,
  serviceName,
  onSuccess,
}) => {
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    assigned_to: '' as string | number,
    project_id: '' as string | number,
    priority: 'medium',
    kanban_status: 'in_progress',
    story_points: 3,
    estimated_hours: 4,
    due_date: '',
  });

  // Load staff / developers and client projects
  useEffect(() => {
    if (isOpen && ticket) {
      setFormData({
        assigned_to: ticket.assigned_to || '',
        project_id: ticket.task?.project_id || '',
        priority: ticket.priority || 'medium',
        kanban_status: 'in_progress',
        story_points: ticket.task?.story_points || 3,
        estimated_hours: 4,
        due_date: ticket.sla_deadline ? ticket.sla_deadline.split('T')[0] : '',
      });

      // Fetch users with developer/admin roles
      setLoadingUsers(true);
      adminApi.getUsers()
        .then((res) => {
          const allUsers = res.data || [];
          setUsers(allUsers);
          // If no assigned_to set, default to first developer or current admin
          const firstDev = allUsers.find((u) => u.roles?.includes('developer') || u.role === 'developer');
          if (firstDev && !ticket.assigned_to) {
            setFormData((prev) => ({ ...prev, assigned_to: firstDev.id }));
          }
        })
        .catch(() => {
          toast.error('Could not load team members');
        })
        .finally(() => setLoadingUsers(false));

      // Fetch client projects
      setLoadingProjects(true);
      projectsApi.listProjects({ client_id: ticket.client_id })
        .then((res: any) => {
          const projs = res?.data || res || [];
          const projectList = Array.isArray(projs) ? projs : [];
          setProjects(projectList);
          if (projectList.length > 0 && !formData.project_id) {
            setFormData((prev) => ({ ...prev, project_id: projectList[0].id }));
          }
        })
        .catch(() => {
          // Non-blocking
        })
        .finally(() => setLoadingProjects(false));
    }
  }, [isOpen, ticket]);

  if (!ticket) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.assigned_to) {
      toast.error('Please select a developer or specialist to assign this ticket.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await clientsApi.acceptTicket(ticket.id, {
        assigned_to: Number(formData.assigned_to),
        project_id: formData.project_id ? Number(formData.project_id) : null,
        priority: formData.priority,
        kanban_status: formData.kanban_status,
        story_points: Number(formData.story_points),
        estimated_hours: Number(formData.estimated_hours),
        due_date: formData.due_date || null,
      });

      toast.success(
        `Ticket #${ticket.ticket_number} accepted and sent to Developer Kanban Board!`
      );
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to accept ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const eligibleDevelopers = users.filter((u) =>
    u.is_active && (
      u.roles?.some((r) => ['developer', 'project_manager', 'super_admin', 'admin'].includes(r)) ||
      ['developer', 'project_manager', 'super_admin', 'admin'].includes(u.role)
    )
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Accept & Route to Kanban Board
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Verify ticket legitimacy and assign to developer for delivery
            </p>
          </div>
        </div>
      }
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Ticket Summary Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-slate-400">
              {ticket.ticket_number}
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              Track: {serviceName || 'Service Track'}
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
            {ticket.title}
          </h4>
        </div>

        {/* Developer Assignee Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-primary-500" />
            <span>Assign Developer / Specialist</span>
            <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.assigned_to}
            onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            <option value="">-- Select Developer --</option>
            {eligibleDevelopers.map((dev) => (
              <option key={dev.id} value={dev.id}>
                {dev.name} ({dev.roles?.join(', ') || dev.role}) - {dev.email}
              </option>
            ))}
          </select>
          {loadingUsers && (
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading team members...
            </p>
          )}
        </div>

        {/* Project Routing */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <FolderGit2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Destination Project Kanban</span>
          </label>
          <select
            value={formData.project_id}
            onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            {projects.length > 0 ? (
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  Project: {p.name} (#{p.id})
                </option>
              ))
            ) : (
              <option value="">Auto-create or link Dedicated Service Project</option>
            )}
          </select>
        </div>

        {/* Priority & Kanban Column Stage */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Verified Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent / Critical SLA</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Initial Kanban Stage
            </label>
            <select
              value={formData.kanban_status}
              onChange={(e) => setFormData({ ...formData, kanban_status: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              <option value="in_progress">In Progress (Active Work)</option>
              <option value="backlog">Backlog (Queued for Next Sprint)</option>
            </select>
          </div>
        </div>

        {/* Story Points & Estimated Hours */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Story Points (Effort)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={formData.story_points}
              onChange={(e) => setFormData({ ...formData, story_points: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Estimated Hours
            </label>
            <input
              type="number"
              step="0.5"
              min={0.5}
              value={formData.estimated_hours}
              onChange={(e) => setFormData({ ...formData, estimated_hours: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Due Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Target Due Date
          </label>
          <input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-white/10">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={submitting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={submitting}
            className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Accept Ticket & Create Kanban Task</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
