import React, { useState } from 'react';
import { ShieldCheck, Video, Globe, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { projectsApi, type TaskItem } from '@/api/projects.api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AttachProofModalProps {
  task: TaskItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AttachProofModal({
  task,
  isOpen,
  onClose,
  onSuccess,
}: AttachProofModalProps) {
  const [proofType, setProofType] = useState<'video' | 'staging_url' | 'screenshot'>('video');
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error('Proof URL (Loom link or Staging URL) is required.');
      return;
    }

    try {
      setLoading(true);
      await projectsApi.attachProof(task.id, {
        url: url.trim(),
        file_name: fileName || `${proofType.toUpperCase()} Proof - ${task.title}`,
        file_type: proofType,
        notes: notes || undefined,
      });

      toast.success('Proof of work attached! Task is now eligible for Client Review.');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to attach proof of work.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span>Mandatory Proof of Work</span>
        </div>
      }
      description={`Task: ${task.title}`}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={loading} onClick={handleSubmit} className="gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            {loading ? 'Attaching...' : 'Attach Proof'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <span>
            <strong>Governance Rule:</strong> Tasks cannot be submitted to <strong>Client Review</strong> without verifiable proof (e.g. Loom walkthrough video or verified staging deployment).
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Proof Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Proof Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setProofType('video')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all ${
                  proofType === 'video'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400'
                    : 'border-slate-200 dark:border-white/10 text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <Video className="w-3.5 h-3.5" /> Loom / Video
              </button>

              <button
                type="button"
                onClick={() => setProofType('staging_url')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all ${
                  proofType === 'staging_url'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400'
                    : 'border-slate-200 dark:border-white/10 text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> Staging URL
              </button>

              <button
                type="button"
                onClick={() => setProofType('screenshot')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all ${
                  proofType === 'screenshot'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400'
                    : 'border-slate-200 dark:border-white/10 text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" /> Screenshot
              </button>
            </div>
          </div>

          {/* Proof Link Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Proof URL / Link <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={proofType === 'video' ? 'https://www.loom.com/share/...' : 'https://staging.myapp.com/feature'}
              className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>

          {/* Label / File Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Proof Label (Optional)
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g. Video Walkthrough & Test Credentials"
              className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Notes for Reviewer (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe edge cases verified, test user credentials, or key highlights..."
              rows={3}
              className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all resize-none"
            />
          </div>
        </form>
      </div>
    </Modal>
  );
}
