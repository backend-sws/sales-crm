import React, { useState } from 'react';
import { Star, MessageSquare, ThumbsUp, X, Loader2 } from 'lucide-react';
import { phase5Api } from '@/api/phase5.api';
import { type TaskItem } from '@/api/projects.api';
import { toast } from 'sonner';

interface TaskFeedbackModalProps {
  task: TaskItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TaskFeedbackModal({
  task,
  isOpen,
  onClose,
  onSuccess,
}: TaskFeedbackModalProps) {
  const [rating, setRating] = useState(5);
  const [quality, setQuality] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [timeliness, setTimeliness] = useState(5);
  const [wouldWorkAgain, setWouldWorkAgain] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating <= 2 && !comment.trim()) {
      toast.error('A comment is required for ratings of 2 stars or lower.');
      return;
    }

    try {
      setSubmitting(true);
      await phase5Api.submitTaskFeedback(task.id, {
        rating,
        quality,
        communication,
        timeliness,
        would_work_again: wouldWorkAgain,
        comment: comment.trim() || undefined,
      });

      toast.success('Thank you! Your feedback has been recorded.');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-slate-100 text-sm">Review & Rate Task Deliverable</h4>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-sm">
              TASK-{task.id}: {task.title}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Overall Star Rating */}
          <div className="text-center py-2">
            <label className="block text-xs font-semibold text-slate-300 mb-2">Overall Rating</label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition hover:scale-125 focus:outline-none"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-700 hover:text-slate-500'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {rating === 5 ? 'Exceptional Work' : rating === 4 ? 'Good Quality' : rating === 3 ? 'Average' : 'Needs Improvement'}
            </p>
          </div>

          {/* Detailed Criteria */}
          <div className="space-y-2.5 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Work Quality</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setQuality(val)}
                    className={`w-6 h-6 rounded text-[11px] font-bold ${
                      val <= quality ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">Timeliness</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setTimeliness(val)}
                    className={`w-6 h-6 rounded text-[11px] font-bold ${
                      val <= timeliness ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">Communication</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setCommunication(val)}
                    className={`w-6 h-6 rounded text-[11px] font-bold ${
                      val <= communication ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Feedback Notes {rating <= 2 && <span className="text-rose-400">*</span>}
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What went well or what could be improved?"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-primary-900/30 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
              Submit Review
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
