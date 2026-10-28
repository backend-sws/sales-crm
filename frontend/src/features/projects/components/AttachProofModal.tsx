import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  Video,
  Globe,
  Image as ImageIcon,
  AlertCircle,
  UploadCloud,
  X,
  CheckCircle2,
  Loader2,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { projectsApi, type TaskItem } from '@/api/projects.api';
import { phase5Api } from '@/api/phase5.api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AttachProofModalProps {
  task: TaskItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface UploadedScreenshot {
  id: string;
  file_name: string;
  url: string;
  size: number;
  preview_url: string;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

export function AttachProofModal({
  task,
  isOpen,
  onClose,
  onSuccess,
}: AttachProofModalProps) {
  const [proofType, setProofType] = useState<'video' | 'staging_url' | 'screenshot'>('screenshot');
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Multiple Screenshot Upload State
  const [screenshots, setScreenshots] = useState<UploadedScreenshot[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [useManualUrl, setUseManualUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const uploadFile = async (file: File): Promise<string> => {
    // 1. Request presigned upload metadata
    const presigned = await phase5Api.requestPresignedUpload({
      file_name: file.name,
      file_type: file.type || 'image/png',
      file_size_bytes: file.size,
      folder: 'proof_of_work',
    });

    let finalUrl = presigned.public_url;

    if (presigned.mode === 's3_presigned') {
      // Direct S3 / Cloudflare R2 PUT
      await fetch(presigned.upload_url, {
        method: 'PUT',
        headers: presigned.headers,
        body: file,
      });
    } else {
      // Direct Multipart upload fallback
      const uploadRes = await phase5Api.directUploadFile(file, 'proof_of_work');
      finalUrl = uploadRes.public_url;
    }

    return finalUrl;
  };

  const handleFiles = async (files: FileList | File[]) => {
    const validImageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (validImageFiles.length === 0) {
      toast.error('Please select valid image files (PNG, JPG, WebP).');
      return;
    }

    const newEntries: UploadedScreenshot[] = validImageFiles.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      file_name: file.name,
      url: '',
      size: file.size,
      preview_url: URL.createObjectURL(file),
      status: 'uploading',
    }));

    setScreenshots((prev) => [...prev, ...newEntries]);

    // Upload each file asynchronously
    for (let i = 0; i < validImageFiles.length; i++) {
      const file = validImageFiles[i];
      const entryId = newEntries[i].id;

      try {
        const publicUrl = await uploadFile(file);
        setScreenshots((prev) =>
          prev.map((item) =>
            item.id === entryId ? { ...item, url: publicUrl, status: 'done' } : item
          )
        );
        toast.success(`Uploaded '${file.name}'`);
      } catch (err: any) {
        setScreenshots((prev) =>
          prev.map((item) =>
            item.id === entryId
              ? { ...item, status: 'error', error: err?.response?.data?.message || 'Upload failed' }
              : item
          )
        );
        toast.error(`Failed to upload '${file.name}'`);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = ''; // Reset input to allow re-uploading same file
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveScreenshot = (id: string) => {
    setScreenshots((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (proofType === 'screenshot' && !useManualUrl) {
      const finishedUploads = screenshots.filter((s) => s.status === 'done');
      const pendingUploads = screenshots.filter((s) => s.status === 'uploading');

      if (pendingUploads.length > 0) {
        toast.error('Please wait for all screenshots to finish uploading.');
        return;
      }

      if (finishedUploads.length === 0) {
        toast.error('Please upload at least one screenshot or provide a proof link.');
        return;
      }

      try {
        setLoading(true);
        // Attach all uploaded screenshots as proof items
        await Promise.all(
          finishedUploads.map((shot, idx) =>
            projectsApi.attachProof(task.id, {
              url: shot.url,
              file_name:
                finishedUploads.length > 1
                  ? `${fileName ? `${fileName} (${idx + 1}/${finishedUploads.length})` : shot.file_name}`
                  : fileName || shot.file_name,
              file_type: 'screenshot',
              notes: notes || undefined,
            })
          )
        );

        toast.success(`${finishedUploads.length} screenshot(s) attached! Task eligible for Client Review.`);
        onSuccess();
        onClose();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Failed to attach proof screenshots.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Video, Staging URL or Manual Image URL
    if (!url.trim()) {
      toast.error('Proof URL (Loom link, Staging URL or Image link) is required.');
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

  const isUploadingAny = screenshots.some((s) => s.status === 'uploading');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
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
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="text-xs text-slate-500">
            {proofType === 'screenshot' && !useManualUrl && screenshots.length > 0 && (
              <span>
                <b>{screenshots.filter((s) => s.status === 'done').length}</b> of{' '}
                <b>{screenshots.length}</b> screenshot(s) ready
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading || isUploadingAny}
              onClick={handleSubmit}
              className="gap-1.5 bg-primary-600 hover:bg-primary-500 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Attaching...</span>
                </>
              ) : isUploadingAny ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading files...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {proofType === 'screenshot' && !useManualUrl && screenshots.length > 1
                      ? `Attach ${screenshots.filter((s) => s.status === 'done').length} Screenshots`
                      : 'Attach Proof'}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {/* Governance banner */}
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <span>
            <strong>Governance Rule:</strong> Tasks cannot be submitted to <strong>Client Review</strong> without verifiable proof (e.g. Loom walkthrough video, staging URL, or uploaded screenshots).
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
                onClick={() => {
                  setProofType('screenshot');
                  setUseManualUrl(false);
                }}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  proofType === 'screenshot'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 shadow-2xs'
                    : 'border-slate-200 dark:border-white/10 text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" /> Multiple Screenshots
              </button>

              <button
                type="button"
                onClick={() => setProofType('video')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  proofType === 'video'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 shadow-2xs'
                    : 'border-slate-200 dark:border-white/10 text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <Video className="w-3.5 h-3.5" /> Loom / Video
              </button>

              <button
                type="button"
                onClick={() => setProofType('staging_url')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  proofType === 'staging_url'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 shadow-2xs'
                    : 'border-slate-200 dark:border-white/10 text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> Staging URL
              </button>
            </div>
          </div>

          {/* Screenshot Upload Dropzone (When proofType === 'screenshot' and !useManualUrl) */}
          {proofType === 'screenshot' && !useManualUrl && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Upload Verification Screenshots <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setUseManualUrl(true)}
                  className="text-[11px] font-semibold text-primary-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Or enter image link
                </button>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-950/40 scale-[1.01]'
                    : 'border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/40 hover:bg-slate-50 hover:border-primary-400'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">
                      Click to browse or drag & drop screenshots here
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Direct upload via presigned storage • Multiple files supported (PNG, JPG, WebP)
                    </p>
                  </div>
                </div>
              </div>

              {/* Uploaded Thumbnails Grid */}
              {screenshots.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                    <span>Uploaded Proof Images ({screenshots.length})</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary-600 hover:underline flex items-center gap-1 normal-case font-semibold"
                    >
                      <Plus className="w-3 h-3" /> Add more
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {screenshots.map((item) => (
                      <div
                        key={item.id}
                        className="relative group rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs"
                      >
                        <div className="relative aspect-video w-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                          <img
                            src={item.preview_url}
                            alt={item.file_name}
                            className="w-full h-full object-cover"
                          />

                          {/* Status Overlay */}
                          {item.status === 'uploading' && (
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs flex flex-col items-center justify-center text-white text-[10px] gap-1">
                              <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
                              <span>Uploading...</span>
                            </div>
                          )}

                          {item.status === 'done' && (
                            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-emerald-600/90 text-white text-[10px] font-semibold flex items-center gap-1 shadow-xs">
                              <CheckCircle2 className="w-3 h-3" /> Ready
                            </div>
                          )}

                          {item.status === 'error' && (
                            <div className="absolute inset-0 bg-rose-900/70 backdrop-blur-2xs p-2 flex flex-col items-center justify-center text-white text-[10px] text-center">
                              <AlertCircle className="w-4 h-4 text-rose-300 mb-0.5" />
                              <span>{item.error || 'Failed'}</span>
                            </div>
                          )}

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveScreenshot(item.id);
                            }}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/70 hover:bg-rose-600 text-white flex items-center justify-center transition shadow-xs"
                            title="Remove image"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* File details bar */}
                        <div className="p-2 text-[11px] bg-slate-50/60 dark:bg-zinc-900/60 flex items-center justify-between gap-1">
                          <span className="truncate font-medium text-slate-700 dark:text-slate-300 max-w-[120px]" title={item.file_name}>
                            {item.file_name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {formatBytes(item.size)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Proof Link Input (For video, staging_url or manual image URL) */}
          {(proofType !== 'screenshot' || useManualUrl) && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {proofType === 'video'
                    ? 'Loom / Video Walkthrough URL'
                    : proofType === 'staging_url'
                    ? 'Staging / Preview URL'
                    : 'Screenshot Image URL'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                {proofType === 'screenshot' && (
                  <button
                    type="button"
                    onClick={() => setUseManualUrl(false)}
                    className="text-[11px] font-semibold text-primary-600 hover:underline"
                  >
                    Switch to Direct Upload
                  </button>
                )}
              </div>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={
                  proofType === 'video'
                    ? 'https://www.loom.com/share/...'
                    : proofType === 'staging_url'
                    ? 'https://staging.myapp.com/feature'
                    : 'https://images.mycdn.com/proof.png'
                }
                className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all font-mono text-xs"
              />
            </div>
          )}

          {/* Label / File Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Proof Title / Label (Optional)
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g. Mobile Responsive & Checkout Flow Verified"
              className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Notes for Client / Reviewer (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe edge cases verified, test credentials, or key verification points..."
              rows={3}
              className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all resize-none"
            />
          </div>
        </form>
      </div>
    </Modal>
  );
}
