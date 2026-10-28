import React, { useState } from 'react';
import {
  ShieldCheck,
  Video,
  Globe,
  Image as ImageIcon,
  ExternalLink,
  Download,
  Calendar,
  User,
  Plus,
  Maximize2,
  X,
  CheckCircle2,
  AlertTriangle,
  Star,
} from 'lucide-react';
import { projectsApi, type TaskItem, type TaskAttachmentItem } from '@/api/projects.api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ViewProofModalProps {
  task: TaskItem;
  isOpen: boolean;
  onClose: () => void;
  onAttachMore?: () => void;
  onRefresh?: () => void;
  isClientView?: boolean;
}

export function ViewProofModal({
  task,
  isOpen,
  onClose,
  onAttachMore,
  onRefresh,
  isClientView = false,
}: ViewProofModalProps) {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Client decision in-modal state
  const [isDecisionMode, setIsDecisionMode] = useState(false);
  const [decisionAction, setDecisionAction] = useState<'accept' | 'reject'>('accept');
  const [decisionReason, setDecisionReason] = useState('');
  const [clientRating, setClientRating] = useState(5);
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // All attachments flagged as proof
  const proofs = (task.attachments || []).filter((a) => a.is_proof);

  // Separate by types
  const screenshots = proofs.filter((p) => {
    const type = (p.file_type || '').toLowerCase();
    const url = (p.url || p.file_path || '').toLowerCase();
    return (
      type === 'screenshot' ||
      type.startsWith('image') ||
      url.endsWith('.png') ||
      url.endsWith('.jpg') ||
      url.endsWith('.jpeg') ||
      url.endsWith('.webp')
    );
  });

  const videos = proofs.filter((p) => {
    const type = (p.file_type || '').toLowerCase();
    const url = (p.url || p.file_path || '').toLowerCase();
    return (
      type === 'video' ||
      url.includes('loom.com') ||
      url.includes('youtube.com') ||
      url.includes('youtu.be') ||
      url.includes('vimeo.com') ||
      url.endsWith('.mp4')
    );
  });

  const stagingUrls = proofs.filter((p) => {
    const type = (p.file_type || '').toLowerCase();
    return type === 'staging_url' || (!screenshots.includes(p) && !videos.includes(p) && p.url);
  });

  const handleClientDecisionSubmit = async () => {
    try {
      setSubmittingDecision(true);
      await projectsApi.clientDecision(task.id, {
        action: decisionAction,
        reason: decisionReason || undefined,
        rating: decisionAction === 'accept' ? clientRating : undefined,
      });

      toast.success(
        decisionAction === 'accept'
          ? 'Proof approved! Task marked as Completed.'
          : 'Task returned to development team for rework.'
      );
      onClose();
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit decision.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="2xl"
        title={
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Proof of Work Verification
              </span>
              <p className="text-[11px] font-normal text-slate-400 truncate max-w-md">
                Task: <strong className="text-slate-700 dark:text-slate-300">{task.title}</strong>
              </p>
            </div>
          </div>
        }
        description={
          proofs.length > 0
            ? `${proofs.length} proof record(s) attached to verify task completion and quality.`
            : 'No proof records attached yet.'
        }
        footer={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {proofs.length > 0 && (
                <span>
                  {screenshots.length} screenshot(s) • {videos.length} video(s) • {stagingUrls.length} link(s)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isClientView && onAttachMore && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onAttachMore();
                  }}
                  className="text-xs h-8 gap-1.5 border-primary-500/30 text-primary-600 dark:text-primary-400"
                >
                  <Plus className="w-3.5 h-3.5" /> Attach More Proof
                </Button>
              )}

              {isClientView && task.status === 'client_review' && !isDecisionMode && (
                <Button
                  size="sm"
                  onClick={() => setIsDecisionMode(true)}
                  className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Review &amp; Accept / Reject
                </Button>
              )}

              <Button variant="outline" size="sm" onClick={onClose} className="text-xs h-8">
                Close
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5 pt-2 max-h-[70vh] overflow-y-auto pr-1">
          {/* Client Decision Form (If active in review mode) */}
          {isDecisionMode && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Client Sign-Off Decision
                </h4>
                <button
                  type="button"
                  onClick={() => setIsDecisionMode(false)}
                  className="text-xs text-amber-600 hover:underline"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDecisionAction('accept')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    decisionAction === 'accept'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" /> Accept Task
                </button>
                <button
                  type="button"
                  onClick={() => setDecisionAction('reject')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    decisionAction === 'reject'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-800'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" /> Request Rework
                </button>
              </div>

              {decisionAction === 'accept' && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Quality Rating (1 to 5 Stars):
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setClientRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= clientRating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300 dark:text-zinc-700'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold ml-2 text-slate-700 dark:text-slate-300">
                      {clientRating} / 5 Stars
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  {decisionAction === 'accept' ? 'Feedback / Notes (Optional)' : 'Rework Reason * (Required)'}
                </label>
                <textarea
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder={
                    decisionAction === 'accept'
                      ? 'Looks great, verified staging deployment.'
                      : 'Please adjust button padding on mobile screen...'
                  }
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  onClick={handleClientDecisionSubmit}
                  disabled={submittingDecision || (decisionAction === 'reject' && !decisionReason.trim())}
                  className={`text-xs h-8 ${
                    decisionAction === 'accept' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  } text-white`}
                >
                  {submittingDecision ? 'Submitting...' : 'Confirm Decision'}
                </Button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {proofs.length === 0 && (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 text-xs text-slate-400 space-y-2">
              <ShieldCheck className="w-8 h-8 mx-auto text-slate-300 dark:text-zinc-600" />
              <p>No proof documents or screenshots have been attached to this task yet.</p>
            </div>
          )}

          {/* Screenshot Proof Gallery */}
          {screenshots.length > 0 && (
            <div className="space-y-2.5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-primary-500" />
                Attached Screenshots ({screenshots.length})
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {screenshots.map((proof) => {
                  const proofImgUrl = proof.url || proof.file_path || '';
                  return (
                    <div
                      key={proof.id}
                      className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-zinc-900 transition-all hover:border-primary-500/40 shadow-xs"
                    >
                      {/* Image Preview */}
                      <div className="aspect-video w-full overflow-hidden bg-slate-950/20 relative">
                        {proofImgUrl ? (
                          <img
                            src={proofImgUrl}
                            alt={proof.file_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                            No image preview
                          </div>
                        )}

                        {/* Hover Overlay Controls */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {proofImgUrl && (
                            <>
                              <button
                                type="button"
                                onClick={() => setFullscreenImage(proofImgUrl)}
                                className="p-2 rounded-xl bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm transition-transform hover:scale-110"
                                title="Expand Fullscreen"
                              >
                                <Maximize2 className="w-4 h-4" />
                              </button>
                              <a
                                href={proofImgUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm transition-transform hover:scale-110"
                                title="Open Original in New Tab"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Info bar below thumbnail */}
                      <div className="p-2.5 bg-white dark:bg-[#15151c] border-t border-slate-200/80 dark:border-white/5 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate pr-2">
                            {proof.file_name}
                          </p>
                          {proofImgUrl && (
                            <a
                              href={proofImgUrl}
                              download
                              className="text-slate-400 hover:text-primary-500"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        {proof.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 italic">
                            &ldquo;{proof.notes}&rdquo;
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                          {proof.uploader ? (
                            <span className="flex items-center gap-1 truncate max-w-[120px]">
                              <User className="w-3 h-3 text-primary-500" />
                              {proof.uploader.name}
                            </span>
                          ) : (
                            <span>Attached by Team</span>
                          )}
                          {proof.created_at && (
                            <span>{new Date(proof.created_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Video Demo Proof */}
          {videos.length > 0 && (
            <div className="space-y-2.5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-rose-500" />
                Video Walkthrough &amp; Screen Recordings ({videos.length})
              </h5>

              <div className="space-y-2">
                {videos.map((proof) => (
                  <div
                    key={proof.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-[#15151c] border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Video className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h6 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {proof.file_name}
                        </h6>
                        {proof.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 italic">
                            &ldquo;{proof.notes}&rdquo;
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {proof.url || proof.file_path}
                        </p>
                      </div>
                    </div>

                    {proof.url && (
                      <a
                        href={proof.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs shrink-0 transition-transform hover:scale-105"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Watch Demo Video</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staging & Interactive Links */}
          {stagingUrls.length > 0 && (
            <div className="space-y-2.5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                Staging URLs &amp; Live Verification Links ({stagingUrls.length})
              </h5>

              <div className="space-y-2">
                {stagingUrls.map((proof) => (
                  <div
                    key={proof.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-[#15151c] border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h6 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {proof.file_name}
                        </h6>
                        {proof.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 italic">
                            &ldquo;{proof.notes}&rdquo;
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                          {proof.url}
                        </p>
                      </div>
                    </div>

                    {proof.url && (
                      <a
                        href={proof.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs shrink-0 transition-transform hover:scale-105"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Open Staging Preview</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Fullscreen Lightbox for Screenshot Preview */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            type="button"
            onClick={() => setFullscreenImage(null)}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={fullscreenImage}
            alt="Fullscreen preview"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
