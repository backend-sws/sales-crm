import React, { useState } from 'react';
import {
  Clock,
  Play,
  Lock,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Plus,
  CheckCircle2,
  XCircle,
  Star,
  FileText,
  User as UserIcon,
  Sparkles,
  Eye,
} from 'lucide-react';
import { projectsApi, type TaskItem, type SprintItem, type ProjectMilestoneItem } from '@/api/projects.api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { AttachProofModal } from './AttachProofModal';
import { ViewProofModal } from './ViewProofModal';
import { CreateTaskModal } from './CreateTaskModal';
import { toast } from 'sonner';

interface KanbanBoardProps {
  projectId: number;
  tasks: TaskItem[];
  sprints?: SprintItem[];
  milestones?: ProjectMilestoneItem[];
  teamMembers?: { id: number; name: string; avatar?: string | null }[];
  onRefresh: () => void;
  isClientView?: boolean;
}

const STAGES = [
  { key: 'backlog', label: 'Backlog', color: 'border-slate-300 dark:border-white/10 bg-slate-100/60 dark:bg-white/[0.02]' },
  { key: 'in_progress', label: 'In Progress', color: 'border-blue-400 dark:border-blue-500/40 bg-blue-50/40 dark:bg-blue-950/10' },
  { key: 'qa', label: 'QA / Testing', color: 'border-purple-400 dark:border-purple-500/40 bg-purple-50/40 dark:bg-purple-950/10' },
  { key: 'client_review', label: 'Client Review', color: 'border-amber-400 dark:border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/10' },
  { key: 'done', label: 'Done', color: 'border-emerald-400 dark:border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/10' },
] as const;

const stripHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<br\s*[\/]?>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, ' ')
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export function KanbanBoard({
  projectId,
  tasks,
  sprints = [],
  milestones = [],
  teamMembers = [],
  onRefresh,
  isClientView = false,
}: KanbanBoardProps) {
  const [selectedTaskForProof, setSelectedTaskForProof] = useState<TaskItem | null>(null);
  const [selectedTaskToViewProof, setSelectedTaskToViewProof] = useState<TaskItem | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [movingTaskId, setMovingTaskId] = useState<number | null>(null);

  // Client Review decision modal
  const [clientDecisionTask, setClientDecisionTask] = useState<TaskItem | null>(null);
  const [decisionAction, setDecisionAction] = useState<'accept' | 'reject'>('accept');
  const [decisionReason, setDecisionReason] = useState('');
  const [clientRating, setClientRating] = useState(5);
  const [submittingDecision, setSubmittingDecision] = useState(false);

  const handleMoveStatus = async (task: TaskItem, newStatus: string) => {
    // If moving to client_review and proof not attached, open modal
    if (newStatus === 'client_review' && !task.is_proof_attached) {
      setSelectedTaskForProof(task);
      toast.info('Proof of work is mandatory before moving to Client Review.');
      return;
    }

    try {
      setMovingTaskId(task.id);
      await projectsApi.updateTaskStatus(task.id, newStatus);
      toast.success(`Task moved to ${newStatus.replace('_', ' ')}`);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.response?.data?.errors?.status?.[0] || 'Cannot move task.');
    } finally {
      setMovingTaskId(null);
    }
  };

  const handleStartTimer = async (taskId: number) => {
    try {
      await projectsApi.startTimer(taskId);
      toast.success('Stopwatch timer started on task!');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not start timer.');
    }
  };

  const handleClientDecisionSubmit = async () => {
    if (!clientDecisionTask) return;
    try {
      setSubmittingDecision(true);
      await projectsApi.clientDecision(clientDecisionTask.id, {
        action: decisionAction,
        reason: decisionReason || undefined,
        rating: decisionAction === 'accept' ? clientRating : undefined,
      });

      toast.success(decisionAction === 'accept' ? 'Task accepted and completed!' : 'Task returned for rework.');
      setClientDecisionTask(null);
      setDecisionReason('');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit decision.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">
            Total Tasks: <strong className="text-slate-800 dark:text-white">{tasks.length}</strong>
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Completed: <strong>{tasks.filter((t) => t.status === 'done').length}</strong>
          </span>
        </div>

        {!isClientView && (
          <Button onClick={() => setIsCreateTaskOpen(true)} size="sm" className="gap-1.5 h-9">
            <Plus className="w-4 h-4" /> Add Task
          </Button>
        )}
      </div>

      {/* 5 Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-start">
        {STAGES.map((stage) => {
          const stageTasks = tasks.filter((t) => t.status === stage.key);

          return (
            <div
              key={stage.key}
              className={`rounded-2xl border p-3 flex flex-col min-h-[460px] max-h-[820px] ${stage.color} backdrop-blur-xs`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/80 dark:border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  {stage.label}
                </span>
                <span className="w-5 h-5 rounded-full bg-white dark:bg-white/10 text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center shadow-xs">
                  {stageTasks.length}
                </span>
              </div>

              {/* Tasks List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
                {stageTasks.length === 0 ? (
                  <div className="h-28 flex flex-col items-center justify-center text-center p-3 text-slate-400 text-xs border border-dashed border-slate-200 dark:border-white/5 rounded-xl">
                    <span>No tasks</span>
                  </div>
                ) : (
                  stageTasks.map((task) => (
                    <div
                      key={task.id}
                      className="group p-3 rounded-xl bg-white dark:bg-[#15151c] border border-slate-200/90 dark:border-white/10 shadow-xs hover:shadow-md hover:border-primary-500/40 transition-all space-y-2.5"
                    >
                      {/* Priority, Complexity & Dependency Tag */}
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded-md ${
                              task.priority === 'critical'
                                ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                                : task.priority === 'high'
                                ? 'bg-orange-500/10 text-orange-600 border border-orange-500/20'
                                : 'bg-slate-100 dark:bg-white/5 text-slate-500'
                            }`}
                          >
                            {task.priority}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            {task.complexity}
                          </span>
                          {(task.service_request_id || task.service_request || task.title.startsWith('[TICK-')) && (
                            <span
                              className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30"
                              title="Client Ticket approved by Super Admin"
                            >
                              <Sparkles className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" />
                              <span>Client Ticket</span>
                            </span>
                          )}
                        </div>

                        {task.is_blocked && (
                          <span
                            className="flex items-center gap-1 text-[9px] font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-md border border-red-500/30"
                            title="Blocked by unfinished dependency task"
                          >
                            <Lock className="w-2.5 h-2.5" /> Blocked
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {task.title}
                      </h4>

                      {/* Description preview */}
                      {task.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                          {stripHtml(task.description)}
                        </p>
                      )}

                      {/* Story points, estimated & actual hours */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-100 dark:border-white/5">
                        <span>
                          {task.story_points ? `${task.story_points} pts` : 'No pts'} •{' '}
                          {task.estimated_hours ? `${task.estimated_hours}h est` : 'No est'}
                        </span>
                        {task.actual_hours !== undefined && task.actual_hours > 0 && (
                          <span className="text-primary-600 dark:text-primary-400 font-bold">
                            {task.actual_hours}h logged
                          </span>
                        )}
                      </div>

                      {/* Proof of Work Badge & Rework counter */}
                      <div className="flex items-center justify-between text-[10px]">
                        {task.is_proof_attached ? (
                          <button
                            type="button"
                            onClick={() => setSelectedTaskToViewProof(task)}
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 font-bold border border-emerald-500/20 transition-all hover:scale-105"
                            title="Click to view attached screenshots, video demo or staging link"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Proof Attached</span>
                            <Eye className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedTaskForProof(task)}
                            className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <FileText className="w-3 h-3" /> Attach Proof
                          </button>
                        )}

                        {task.rework_count > 0 && (
                          <span className="text-red-500 font-bold">
                            {task.rework_count}x Rework
                          </span>
                        )}
                      </div>

                      {/* Assignee & Card Footer Actions */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <div className="w-5 h-5 rounded-full bg-primary-500/20 text-primary-600 font-bold text-[9px] flex items-center justify-center">
                            {task.assignee?.name?.charAt(0) || '?'}
                          </div>
                          <span className="text-[10px] truncate max-w-[80px]">
                            {task.assignee?.name || 'Unassigned'}
                          </span>
                        </div>

                        {/* Developer Live Timer Button */}
                        {!isClientView && task.status !== 'done' && (
                          <button
                            type="button"
                            onClick={() => handleStartTimer(task.id)}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all border border-transparent hover:border-emerald-500/30"
                            title="Developer Work Tracker: Start live stopwatch timer on this task to log billable hours"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span className="text-[9px] font-bold">Track</span>
                          </button>
                        )}
                      </div>

                      {/* Stage Movement Controls */}
                      <div className="pt-1.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-1">
                        {/* Client Review Action Buttons if task is in client_review */}
                        {task.status === 'client_review' ? (
                          <div className="w-full grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => {
                                setClientDecisionTask(task);
                                setDecisionAction('accept');
                              }}
                              className="w-full py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center justify-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Accept
                            </button>
                            <button
                              onClick={() => {
                                setClientDecisionTask(task);
                                setDecisionAction('reject');
                              }}
                              className="w-full py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 text-[10px] font-bold flex items-center justify-center gap-1"
                            >
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </div>
                        ) : (
                          // Developer/PM Progression
                          !isClientView && (
                            <div className="w-full flex items-center justify-end gap-1">
                              {task.status === 'backlog' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={movingTaskId === task.id || task.is_blocked}
                                  onClick={() => handleMoveStatus(task, 'in_progress')}
                                  className="h-6 px-2 text-[10px] gap-1 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-blue-600"
                                >
                                  {task.is_blocked ? (
                                    <>
                                      <Lock className="w-2.5 h-2.5" /> Blocked
                                    </>
                                  ) : (
                                    <>
                                      Start <ArrowRight className="w-2.5 h-2.5" />
                                    </>
                                  )}
                                </Button>
                              )}

                              {task.status === 'in_progress' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={movingTaskId === task.id}
                                  onClick={() => handleMoveStatus(task, 'qa')}
                                  className="h-6 px-2 text-[10px] gap-1 hover:bg-purple-50 dark:hover:bg-purple-950/20 text-purple-600"
                                >
                                  To QA <ArrowRight className="w-2.5 h-2.5" />
                                </Button>
                              )}

                              {task.status === 'qa' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={movingTaskId === task.id}
                                  onClick={() => handleMoveStatus(task, 'client_review')}
                                  className="h-6 px-2 text-[10px] gap-1 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-600 font-bold"
                                >
                                  To Review <ArrowRight className="w-2.5 h-2.5" />
                                </Button>
                              )}

                              {task.status === 'done' && (
                                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Completed
                                </span>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Attach Proof Modal */}
      {selectedTaskForProof && (
        <AttachProofModal
          task={selectedTaskForProof}
          isOpen={Boolean(selectedTaskForProof)}
          onClose={() => setSelectedTaskForProof(null)}
          onSuccess={onRefresh}
        />
      )}

      {/* Create Task Modal */}
      {isCreateTaskOpen && (
        <CreateTaskModal
          projectId={projectId}
          isOpen={isCreateTaskOpen}
          onClose={() => setIsCreateTaskOpen(false)}
          onSuccess={onRefresh}
          sprints={sprints}
          milestones={milestones}
          existingTasks={tasks}
          teamMembers={teamMembers}
        />
      )}

      {/* Client Review Accept / Reject Modal */}
      {clientDecisionTask && (
        <Modal
          isOpen={!!clientDecisionTask}
          onClose={() => setClientDecisionTask(null)}
          title={
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  decisionAction === 'accept'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                }`}
              >
                {decisionAction === 'accept' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {decisionAction === 'accept' ? 'Accept & Approve Deliverable' : 'Request Deliverable Rework'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                  Task: {clientDecisionTask.title}
                </p>
              </div>
            </div>
          }
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {decisionAction === 'accept'
                ? 'Approving this deliverable confirms that it satisfies acceptance criteria and marks the task as completed.'
                : 'Requesting rework will return this task back to the team with your feedback for revisions.'}
            </div>

            {decisionAction === 'accept' ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Rate Quality &amp; Satisfaction:
                </label>
                <div className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setClientRating(star)}
                      className="p-1 text-amber-400 hover:scale-110 transition-transform focus:outline-none"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= clientRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-zinc-700'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 ml-2">
                    {clientRating}/5 Stars
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mandatory Rejection / Rework Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Clearly explain what needs to be fixed or revised before approval..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <Button variant="outline" size="sm" onClick={() => setClientDecisionTask(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleClientDecisionSubmit}
                disabled={submittingDecision || (decisionAction === 'reject' && !decisionReason.trim())}
                className={
                  decisionAction === 'accept'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }
              >
                {submittingDecision
                  ? 'Submitting...'
                  : decisionAction === 'accept'
                  ? 'Confirm Approval'
                  : 'Submit Rework Request'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Proof of Work Modal */}
      {selectedTaskToViewProof && (
        <ViewProofModal
          task={selectedTaskToViewProof}
          isOpen={!!selectedTaskToViewProof}
          onClose={() => setSelectedTaskToViewProof(null)}
          onAttachMore={() => {
            const task = selectedTaskToViewProof;
            setSelectedTaskToViewProof(null);
            setSelectedTaskForProof(task);
          }}
          onRefresh={onRefresh}
          isClientView={isClientView}
        />
      )}
    </div>
  );
}
