import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Video,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  User,
  ShieldCheck,
  CheckSquare,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { projectsApi, type ProjectMeetingItem } from '../../../api/projects.api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ProjectMeetingsPanelProps {
  projectId: number;
  users?: { id: number; name: string; email: string }[];
  isClient?: boolean;
}

export const ProjectMeetingsPanel: React.FC<ProjectMeetingsPanelProps> = ({
  projectId,
  users = [],
  isClient = false,
}) => {
  const [meetings, setMeetings] = useState<ProjectMeetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMeetingId, setExpandedMeetingId] = useState<number | null>(null);

  // New Meeting Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAgenda, setNewAgenda] = useState('');
  const [newMomBody, setNewMomBody] = useState('');
  const [newRecordingUrl, setNewRecordingUrl] = useState('');
  const [newScheduledAt, setNewScheduledAt] = useState(new Date().toISOString().slice(0, 16));
  const [newStatus, setNewStatus] = useState<'scheduled' | 'completed'>('completed');
  const [newActionItems, setNewActionItems] = useState<
    { title: string; assignee_id?: number | ''; due_date?: string }[]
  >([]);

  // Action item conversion loading
  const [convertingItemId, setConvertingItemId] = useState<number | null>(null);
  const [confirmingMeetingId, setConfirmingMeetingId] = useState<number | null>(null);

  // Dispute MoM State
  const [disputeModalMeetingId, setDisputeModalMeetingId] = useState<number | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const res = await projectsApi.listMeetings(projectId);
      if (res.success && res.data) {
        setMeetings(res.data);
        if (res.data.length > 0 && !expandedMeetingId) {
          setExpandedMeetingId(res.data[0].id);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load project meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [projectId]);

  const handleAddActionItem = () => {
    setNewActionItems((prev) => [...prev, { title: '', assignee_id: '', due_date: '' }]);
  };

  const handleRemoveActionItem = (index: number) => {
    setNewActionItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleActionItemChange = (index: number, field: string, value: any) => {
    setNewActionItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Meeting title is required');
      return;
    }

    try {
      setCreateSubmitting(true);
      const payload: any = {
        title: newTitle,
        agenda: newAgenda,
        mom_body: newMomBody,
        recording_url: newRecordingUrl || null,
        scheduled_at: newScheduledAt,
        status: newStatus,
        action_items: newActionItems
          .filter((a) => a.title.trim())
          .map((a) => ({
            title: a.title,
            assignee_id: a.assignee_id ? Number(a.assignee_id) : undefined,
            due_date: a.due_date || undefined,
          })),
      };

      const res = await projectsApi.createMeeting(projectId, payload);
      if (res.success) {
        toast.success('Meeting & MoM logged successfully!');
        setShowCreateModal(false);
        setNewTitle('');
        setNewAgenda('');
        setNewMomBody('');
        setNewRecordingUrl('');
        setNewActionItems([]);
        fetchMeetings();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record meeting');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleConfirmMoM = async (meetingId: number) => {
    try {
      setConfirmingMeetingId(meetingId);
      const res = await projectsApi.confirmMoM(meetingId);
      if (res.success) {
        toast.success('MoM confirmed and accepted by client!');
        fetchMeetings();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to confirm MoM');
    } finally {
      setConfirmingMeetingId(null);
    }
  };

  const handleDisputeMoM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeModalMeetingId || !disputeReason.trim()) {
      toast.error('Please describe your dispute or requested changes.');
      return;
    }

    try {
      setDisputeSubmitting(true);
      const res = await projectsApi.disputeMoM(disputeModalMeetingId, disputeReason.trim());
      if (res.success) {
        toast.success('MoM dispute submitted and flagged for agency review.');
        setDisputeModalMeetingId(null);
        setDisputeReason('');
        fetchMeetings();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit dispute');
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const handleConvertActionItem = async (actionItemId: number) => {
    try {
      setConvertingItemId(actionItemId);
      const res = await projectsApi.convertActionItem(actionItemId);
      if (res.success) {
        toast.success(`Action item converted to Task #${res.data?.id || ''} in Backlog!`);
        fetchMeetings();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to convert to task');
    } finally {
      setConvertingItemId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500/20 to-blue-500/20 border border-sky-500/30 flex items-center justify-center text-sky-500">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Sprint Meetings & 48-Hour MoM Governance
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                Dispute-Proof
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Minutes of Meeting (MoM) automatically auto-accept in 48 hours unless disputed, with 1-click action item task conversion.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-sm font-semibold shadow-md shadow-sky-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Log Meeting & MoM
        </button>
      </div>

      {/* Meetings List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading meetings & MoM records...</div>
      ) : meetings.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Meetings Logged</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Record sprint kickoffs, standups, or client review calls with MoMs to preserve verifiable audit trails.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
          >
            Log First Meeting
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => {
            const isExpanded = expandedMeetingId === meeting.id;
            const scheduledDate = meeting.scheduled_at
              ? new Date(meeting.scheduled_at).toLocaleString()
              : 'Unscheduled';

            return (
              <div
                key={meeting.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm transition-all"
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedMeetingId(isExpanded ? null : meeting.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        meeting.is_auto_accepted
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                      }`}
                    >
                      <Calendar className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {meeting.title}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            meeting.status === 'completed'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                          }`}
                        >
                          {meeting.status}
                        </span>

                        {meeting.is_disputed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            <AlertCircle className="w-3 h-3 text-rose-500" />
                            MoM Dispute Under Review
                          </span>
                        ) : meeting.is_auto_accepted || meeting.client_confirmed_at ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            {meeting.client_confirmed_at ? 'Accepted by Client' : 'MoM Accepted'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <Clock className="w-3 h-3 text-amber-500" />
                            48h Auto-Acceptance Pending
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {scheduledDate}
                        </span>
                        {meeting.creator && (
                          <span className="inline-flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            Recorded by: {meeting.creator.name}
                          </span>
                        )}
                        {meeting.action_items && (
                          <span className="inline-flex items-center gap-1.5">
                            <CheckSquare className="w-3.5 h-3.5" />
                            {meeting.action_items.length} Action Items
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-auto">
                    {meeting.recording_url && (
                      <a
                        href={meeting.recording_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
                      >
                        <Video className="w-3.5 h-3.5 text-rose-500" />
                        Recording
                        <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                      </a>
                    )}

                    {!meeting.is_auto_accepted && !meeting.client_confirmed_at && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmMoM(meeting.id);
                          }}
                          disabled={confirmingMeetingId === meeting.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {confirmingMeetingId === meeting.id ? 'Confirming...' : 'Confirm MoM'}
                        </button>
                        {!meeting.is_disputed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDisputeModalMeetingId(meeting.id);
                              setDisputeReason('');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold shadow-xs transition-all"
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            Dispute MoM
                          </button>
                        )}
                      </div>
                    )}

                    <div className="p-1 rounded-lg text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-5 bg-slate-50/40 dark:bg-slate-900/40">
                    {/* Agenda */}
                    {meeting.agenda && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Agenda
                        </span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                          {meeting.agenda}
                        </p>
                      </div>
                    )}

                    {/* MoM Notes */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-sky-500" />
                          Minutes of Meeting (MoM)
                        </span>
                        {meeting.auto_accepted_at && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                            Accepted at: {new Date(meeting.auto_accepted_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                        {meeting.mom_body || (
                          <span className="italic text-slate-400">No MoM text recorded.</span>
                        )}
                      </div>
                    </div>

                    {/* Dispute Notes if Raised */}
                    {meeting.is_disputed && meeting.dispute_reason && (
                      <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200">
                        <div className="font-bold flex items-center gap-1.5 mb-1.5 text-rose-700 dark:text-rose-300">
                          <AlertCircle className="w-4 h-4 text-rose-500" />
                          Client Dispute / Requested Changes:
                        </div>
                        <p className="leading-relaxed bg-white/70 dark:bg-black/30 p-2.5 rounded-lg border border-rose-200/50 dark:border-rose-900/50">
                          {meeting.dispute_reason}
                        </p>
                      </div>
                    )}

                    {/* Action Items */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                          Action Items ({meeting.action_items?.length || 0})
                        </span>
                        <span className="text-[11px] text-slate-400">
                          1-Click conversion into Project Backlog Task
                        </span>
                      </div>

                      {meeting.action_items && meeting.action_items.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {meeting.action_items.map((item) => (
                            <div
                              key={item.id}
                              className="p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 shadow-xs"
                            >
                              <div className="space-y-1 flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {item.title}
                                </p>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                  {item.assignee && (
                                    <span className="inline-flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {item.assignee.name}
                                    </span>
                                  )}
                                  {item.due_date && (
                                    <span className="inline-flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      Due {new Date(item.due_date).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center">
                                {item.converted_task_id ? (
                                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    Task #{item.converted_task_id}
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleConvertActionItem(item.id)}
                                    disabled={convertingItemId === item.id}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800 transition-colors"
                                  >
                                    <ArrowRight className="w-3 h-3" />
                                    {convertingItemId === item.id ? 'Converting...' : 'Convert to Task'}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No action items recorded for this meeting.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Log Meeting Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="3xl"
        title={
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <span>Log Meeting & Minutes of Meeting (MoM)</span>
          </div>
        }
        description="Meeting records establish dispute-proof audit trails and action item accountability."
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
              onClick={handleCreateMeeting}
              className="bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20"
            >
              {createSubmitting ? 'Saving...' : 'Record Meeting & MoM'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateMeeting} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Meeting Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sprint 2 Kickoff & Scope Alignment"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={newScheduledAt}
                onChange={(e) => setNewScheduledAt(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as any)}
                className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
              >
                <option value="completed">Completed (MoM Ready)</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Recording URL (Loom / Zoom / Meet)
            </label>
            <input
              type="url"
              placeholder="https://loom.com/share/... or https://meet.google.com/..."
              value={newRecordingUrl}
              onChange={(e) => setNewRecordingUrl(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Agenda
            </label>
            <textarea
              rows={2}
              placeholder="Key topics to discuss..."
              value={newAgenda}
              onChange={(e) => setNewAgenda(e.target.value)}
              className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Minutes of Meeting (MoM)
              </label>
              <span className="text-[11px] text-sky-500 font-semibold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800">
                48h auto-acceptance rule active
              </span>
            </div>
            <textarea
              rows={4}
              placeholder="Detailed notes, agreements, decisions made during the call..."
              value={newMomBody}
              onChange={(e) => setNewMomBody(e.target.value)}
              className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all resize-none font-sans"
            />
          </div>

          {/* Action items builder */}
          <div className="space-y-3 pt-3 border-t border-slate-200/80 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Action Items ({newActionItems.length})
                </label>
                <p className="text-[11px] text-slate-400">
                  Each action item can be converted into a project task with 1 click.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddActionItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900 text-sky-600 dark:text-sky-300 text-xs font-semibold border border-sky-200 dark:border-sky-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Action Item
              </button>
            </div>

            {newActionItems.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 text-center text-xs text-slate-400">
                No action items added yet. Click &ldquo;Add Action Item&rdquo; above to assign deliverables.
              </div>
            ) : (
              <div className="space-y-3">
                {newActionItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/40 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Item #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveActionItem(idx)}
                        className="text-xs text-rose-500 hover:text-rose-600 font-semibold px-2 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                      >
                        Remove
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Task description (e.g. Integrate payment webhook by Friday)..."
                      value={item.title}
                      onChange={(e) => handleActionItemChange(idx, 'title', e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Assignee</label>
                        <select
                          value={item.assignee_id}
                          onChange={(e) => handleActionItemChange(idx, 'assignee_id', e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                        >
                          <option value="">Assign to team member...</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Due Date</label>
                        <input
                          type="date"
                          value={item.due_date}
                          onChange={(e) => handleActionItemChange(idx, 'due_date', e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Dispute MoM Modal */}
      {disputeModalMeetingId && (
        <Modal
          isOpen={true}
          onClose={() => setDisputeModalMeetingId(null)}
          title="Dispute / Request Changes on MoM"
        >
          <form onSubmit={handleDisputeMoM} className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Please specify the items or deliverables in this Minutes of Meeting (MoM) that you dispute or need clarified. Submitting this dispute will halt 48-hour auto-acceptance and notify your agency team.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Dispute Reason / Clarification Notes <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="e.g. Milestone 2 delivery date discussed was Nov 10th instead of Nov 25th; please adjust the action item..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDisputeModalMeetingId(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={disputeSubmitting}
                className="bg-rose-600 hover:bg-rose-500 text-white gap-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                {disputeSubmitting ? 'Submitting Dispute...' : 'Submit Dispute'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
