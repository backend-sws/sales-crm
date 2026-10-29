import React, { useState, useRef } from 'react';
import {
  PlusCircle,
  Image as ImageIcon,
  Upload,
  X,
  Check,
  CheckCircle2,
  Loader2,
  Eye,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Code,
  Quote,
  Paperclip,
  ExternalLink,
  ZoomIn,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { clientsApi, type ServiceRequestItem } from '@/api/clients.api';
import { phase5Api } from '@/api/phase5.api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: number;
  serviceName: string;
  onSuccess: (ticket: ServiceRequestItem) => void;
}

interface UploadedScreenshot {
  id: string;
  name: string;
  size: number;
  url: string;
  previewUrl: string;
  isUploading: boolean;
  error?: string;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  serviceId,
  serviceName,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    sla_deadline: '',
  });

  // Rich WYSIWYG Editor State
  const [editorMode, setEditorMode] = useState<'visual' | 'code' | 'preview'>('visual');
  const [htmlContent, setHtmlContent] = useState('');
  const visualEditorRef = useRef<HTMLDivElement>(null);
  const internalHtmlRef = useRef<string>('');

  // Screenshots State
  const [screenshots, setScreenshots] = useState<UploadedScreenshot[]>([]);
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync content into visual editor
  const updateVisualContent = (html: string) => {
    internalHtmlRef.current = html;
    setHtmlContent(html);
    if (visualEditorRef.current && visualEditorRef.current.innerHTML !== html) {
      visualEditorRef.current.innerHTML = html;
    }
  };

  const handleVisualInput = () => {
    if (visualEditorRef.current) {
      const html = visualEditorRef.current.innerHTML;
      internalHtmlRef.current = html;
      setHtmlContent(html);
    }
  };

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (visualEditorRef.current) {
      visualEditorRef.current.focus();
    }
    document.execCommand(command, false, value);
    handleVisualInput();
  };

  const insertSnippet = (snippetHtml: string) => {
    if (visualEditorRef.current) {
      visualEditorRef.current.focus();
    }
    const success = document.execCommand('insertHTML', false, snippetHtml);
    if (!success && visualEditorRef.current) {
      const newHtml = internalHtmlRef.current + snippetHtml;
      updateVisualContent(newHtml);
    } else {
      handleVisualInput();
    }
  };

  // Upload single screenshot file via presigned URL pipeline
  const uploadImageFile = async (file: File): Promise<string> => {
    // 1. Request presigned upload metadata from backend
    const presigned = await phase5Api.requestPresignedUpload({
      file_name: file.name,
      file_type: file.type || 'image/png',
      file_size_bytes: file.size,
      folder: 'ticket_attachments',
    });

    let finalUrl = presigned.public_url;

    // 2. Direct upload to Cloudflare R2 / S3 or backend fallback
    if (presigned.mode === 's3_presigned') {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(presigned.method || 'PUT', presigned.upload_url, true);
        if (presigned.headers) {
          Object.entries(presigned.headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Presigned upload failed: HTTP ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Network error during presigned S3 upload'));
        xhr.send(file);
      });
    } else {
      const res = await phase5Api.directUploadFile(file, 'ticket_attachments');
      finalUrl = res.public_url;
    }

    return finalUrl;
  };

  // Handle files selected via file input or drag-and-drop
  const handleFilesSelected = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      toast.error('Please select valid image files (PNG, JPG, WebP, GIF).');
      return;
    }

    // Create placeholder entries with local preview
    const newItems: UploadedScreenshot[] = fileArray.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: file.name,
      size: file.size,
      url: '',
      previewUrl: URL.createObjectURL(file),
      isUploading: true,
    }));

    setScreenshots((prev) => [...prev, ...newItems]);

    // Upload each file asynchronously
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const itemId = newItems[i].id;

      try {
        const uploadedUrl = await uploadImageFile(file);
        setScreenshots((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, url: uploadedUrl, isUploading: false }
              : item
          )
        );
        toast.success(`'${file.name}' uploaded successfully!`);
      } catch (err: any) {
        const msg = err?.message || 'Upload failed';
        setScreenshots((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, isUploading: false, error: msg }
              : item
          )
        );
        toast.error(`Failed to upload '${file.name}'`);
      }
    }
  };

  // Handle pasting screenshot from clipboard (Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          toast.info('Pasted screenshot detected! Uploading...');
          handleFilesSelected([file]);
        }
      }
    }
  };

  const removeScreenshot = (id: string) => {
    setScreenshots((prev) => prev.filter((item) => item.id !== id));
  };

  // Insert image tag directly into visual editor
  const insertImageIntoEditor = (item: UploadedScreenshot) => {
    if (!item.url) return;
    const imgHtml = `<p><img src="${item.url}" alt="${item.name}" style="max-width: 100%; border-radius: 8px; margin: 8px 0; border: 1px solid #e2e8f0;" /></p><p></p>`;
    insertSnippet(imgHtml);
    toast.success('Screenshot embedded in description!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter a ticket title.');
      return;
    }

    const baseDescription = internalHtmlRef.current.trim();
    if (!baseDescription || baseDescription === '<p><br></p>') {
      toast.error('Please provide a ticket description or acceptance criteria.');
      return;
    }

    // Check if any screenshot is still uploading
    if (screenshots.some((s) => s.isUploading)) {
      toast.error('Please wait for screenshots to finish uploading.');
      return;
    }

    try {
      setSubmitting(true);

      // Compile description with attached screenshots section if any exist
      let finalDescription = baseDescription;
      const validScreenshots = screenshots.filter((s) => s.url);

      if (validScreenshots.length > 0) {
        finalDescription += `
<div class="ticket-attachments-section" style="margin-top: 20px; padding-top: 14px; border-top: 1px dashed #cbd5e1;">
  <p style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 8px;">Attached Issue Screenshots (${validScreenshots.length}):</p>
  <div style="display: flex; flex-wrap: wrap; gap: 10px;">
    ${validScreenshots
      .map(
        (s) => `
      <a href="${s.url}" target="_blank" rel="noreferrer" style="text-decoration: none;">
        <img src="${s.url}" alt="${s.name}" style="width: 140px; height: 95px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.08);" />
      </a>`
      )
      .join('')}
  </div>
</div>`;
      }

      const res = await clientsApi.createTicket(serviceId, {
        title: formData.title.trim(),
        description: finalDescription,
        priority: formData.priority,
        sla_deadline: formData.sla_deadline ? `${formData.sla_deadline} 18:00:00` : null,
      });

      toast.success(`Ticket #${res.data?.ticket_number || 'created'} logged successfully!`);
      onSuccess(res.data);
      onClose();

      // Reset Form
      setFormData({
        title: '',
        priority: 'medium',
        sla_deadline: '',
      });
      setScreenshots([]);
      updateVisualContent('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to create ticket.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isUploadingAny = screenshots.some((s) => s.isUploading);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Create Service Ticket
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                Track: {serviceName}
              </p>
            </div>
          </div>
        }
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ticket Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Ticket Title / Deliverable <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-semibold"
              placeholder="e.g. Broken checkout button on mobile viewport / Hero banner update"
            />
          </div>

          {/* Priority & SLA Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              >
                <option value="low">Low (Normal backlog)</option>
                <option value="medium">Medium (Standard SLA)</option>
                <option value="high">High (48h turnaround)</option>
                <option value="urgent">Urgent (24h blocker)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                SLA Target Date
              </label>
              <input
                type="date"
                value={formData.sla_deadline}
                onChange={(e) => setFormData({ ...formData, sla_deadline: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
            </div>
          </div>

          {/* Rich WYSIWYG Description Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Problem Description &amp; Acceptance Criteria <span className="text-red-500">*</span>
              </label>

              {/* Mode switch */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setEditorMode('visual')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    editorMode === 'visual'
                      ? 'bg-white dark:bg-zinc-900 text-primary-600 dark:text-primary-400 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  WYSIWYG
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('code')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    editorMode === 'code'
                      ? 'bg-white dark:bg-zinc-900 text-primary-600 dark:text-primary-400 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                  title="Source HTML Code"
                >
                  HTML Code
                </button>
              </div>
            </div>

            {/* Formatting Toolbar */}
            <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => executeCommand('bold')}
                  className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors font-bold"
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('italic')}
                  className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors italic"
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('underline')}
                  className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors underline"
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('strikeThrough')}
                  className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                  title="Strikethrough"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>

                <div className="h-4 w-px bg-slate-200 dark:bg-zinc-700 mx-1" />

                <button
                  type="button"
                  onClick={() => executeCommand('insertUnorderedList')}
                  className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('insertOrderedList')}
                  className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                  title="Numbered List"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>

                <div className="h-4 w-px bg-slate-200 dark:bg-zinc-700 mx-1" />

                {/* Quick Bug Templates */}
                <button
                  type="button"
                  onClick={() =>
                    insertSnippet(
                      `<p><strong>Steps to Reproduce:</strong></p><ol><li>Navigate to...</li><li>Click on...</li><li>Observed unexpected behavior: ...</li></ol>`
                    )
                  }
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100"
                >
                  + Steps to Reproduce
                </button>

                <button
                  type="button"
                  onClick={() =>
                    insertSnippet(
                      `<p><strong>Expected:</strong> The system should...</p><p><strong>Actual:</strong> Instead, it displays error...</p>`
                    )
                  }
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100"
                >
                  + Expected vs Actual
                </button>
              </div>

              {/* Attach Screenshot Trigger */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Attach Screenshot</span>
              </button>
            </div>

            {/* WYSIWYG Editable Box */}
            <div className={editorMode === 'visual' ? 'block' : 'hidden'}>
              <div
                ref={visualEditorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleVisualInput}
                onPaste={handlePaste}
                data-placeholder="Describe deliverables, steps to reproduce, or paste screenshot (Ctrl+V)..."
                className="min-h-[140px] max-h-[240px] overflow-y-auto p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all prose prose-sm dark:prose-invert max-w-none
                [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_h3]:font-bold [&_h3]:text-sm [&_h3]:mt-2 [&_h3]:mb-1 [&_strong]:font-bold"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 mt-1">
                <span>Tip: Paste screenshots directly from your clipboard with <strong>Ctrl+V</strong></span>
                <span>WYSIWYG Editor</span>
              </div>
            </div>

            {/* HTML Source Code Mode */}
            {editorMode === 'code' && (
              <div className="space-y-1">
                <textarea
                  rows={6}
                  value={internalHtmlRef.current}
                  onChange={(e) => {
                    internalHtmlRef.current = e.target.value;
                    setHtmlContent(e.target.value);
                  }}
                  className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-zinc-900 text-emerald-400 text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-y"
                />
                <div className="text-[11px] text-slate-400 px-1">
                  &lt;&gt; Raw HTML View. Switch back to WYSIWYG above when done.
                </div>
              </div>
            )}
          </div>

          {/* Screenshot Attachments Gallery */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFilesSelected(e.target.files);
                }
              }}
            />

            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-primary-600" />
                <span>Issue Screenshots / Mockups ({screenshots.length})</span>
              </label>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                <Upload className="w-3 h-3" />
                <span>Upload Images</span>
              </button>
            </div>

            {screenshots.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-900 cursor-pointer text-center space-y-1 transition-all"
              >
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                  <span>Click to attach problem screenshots, or paste with <strong>Ctrl+V</strong></span>
                </div>
                <p className="text-[10px] text-slate-400">
                  ⚡ Uploads directly to Cloud Storage via Secure Presigned URL (PNG, JPG, WebP)
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {screenshots.map((item) => (
                  <div
                    key={item.id}
                    className="relative group rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs p-1.5 space-y-1"
                  >
                    <div className="relative h-24 w-full bg-slate-100 dark:bg-zinc-800 rounded-lg overflow-hidden flex items-center justify-center">
                      <img
                        src={item.previewUrl || item.url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />

                      {/* Upload Spinner Overlay */}
                      {item.isUploading && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex flex-col items-center justify-center text-white text-[11px] gap-1">
                          <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
                          <span>Uploading...</span>
                        </div>
                      )}

                      {/* Error State */}
                      {item.error && (
                        <div className="absolute inset-0 bg-red-900/80 p-2 text-white text-[10px] flex items-center justify-center text-center">
                          {item.error}
                        </div>
                      )}

                      {/* Zoom & Delete Controls */}
                      {!item.isUploading && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveLightboxImg(item.previewUrl || item.url)}
                            className="p-1.5 rounded-lg bg-white/90 text-slate-800 hover:bg-white transition-transform hover:scale-105"
                            title="Zoom Screenshot"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertImageIntoEditor(item)}
                            className="p-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-500 transition-transform hover:scale-105"
                            title="Insert into text description"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeScreenshot(item.id)}
                            className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-transform hover:scale-105"
                            title="Remove image"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] px-1">
                      <span className="truncate font-medium text-slate-700 dark:text-slate-300 max-w-[100px]">
                        {item.name}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {formatBytes(item.size)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {screenshots.length > 0 && (
                <span>
                  <b>{screenshots.filter((s) => !s.isUploading && !s.error).length}</b> screenshot(s) attached
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || isUploadingAny}
                className="gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating Ticket...</span>
                  </>
                ) : isUploadingAny ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading Images...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Create Ticket</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Screenshot Lightbox Zoom Modal */}
      {activeLightboxImg && (
        <Modal
          isOpen={Boolean(activeLightboxImg)}
          onClose={() => setActiveLightboxImg(null)}
          maxWidth="4xl"
          title={
            <div className="flex items-center justify-between w-full pr-6">
              <span className="text-sm font-bold">Screenshot Preview</span>
              <a
                href={activeLightboxImg}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary-600 flex items-center gap-1 font-semibold hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Open original in new tab
              </a>
            </div>
          }
        >
          <div className="p-2 flex items-center justify-center bg-black/5 dark:bg-black/40 rounded-xl overflow-hidden max-h-[70vh]">
            <img
              src={activeLightboxImg}
              alt="Screenshot Preview"
              className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
            />
          </div>
        </Modal>
      )}
    </>
  );
};
