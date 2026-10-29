import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  FileCheck,
  FileEdit,
  Upload,
  UploadCloud,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Plus,
  X,
  PenTool,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import type { ClientDocumentItem } from '@/api/clients.api';
import { clientsApi } from '@/api/clients.api';
import { phase5Api } from '@/api/phase5.api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ESignDocumentModal } from './ESignDocumentModal';
import { AgreementEditorModal } from './AgreementEditorModal';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { useAuthStore } from '@/store/authStore';

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface ClientDocumentsPanelProps {
  clientId: number;
  documents: ClientDocumentItem[];
  onRefresh: () => void;
  isClient?: boolean;
  clientName?: string;
  clientCompany?: string;
}

export const ClientDocumentsPanel: React.FC<ClientDocumentsPanelProps> = ({
  clientId,
  documents,
  onRefresh,
  isClient: explicitIsClient,
  clientName,
  clientCompany,
}) => {
  const { user } = useAuthStore();
  const isClient = explicitIsClient !== undefined ? explicitIsClient : Boolean(
    user?.roles?.includes('client') ||
    user?.client_id ||
    (!user?.roles?.some((r) => ['super_admin', 'admin', 'project_manager', 'developer', 'account_manager', 'sales_manager'].includes(r)))
  );
  const isStaff = Boolean(
    user?.roles?.some((r) => ['super_admin', 'admin', 'project_manager', 'developer', 'account_manager', 'sales_manager'].includes(r))
  );

  const [selectedDocToSign, setSelectedDocToSign] = useState<ClientDocumentItem | null>(null);
  const [selectedDocToEdit, setSelectedDocToEdit] = useState<ClientDocumentItem | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  // Form & Upload State
  const [uploadMode, setUploadMode] = useState<'upload' | 'url'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    type: 'contract' as 'contract' | 'proposal' | 'nda' | 'welcome',
    file_url: '',
  });

  const resetAddForm = () => {
    setFormData({ title: '', type: 'contract', file_url: '' });
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setUploadedUrl('');
    setUploadError(null);
    setIsDragOver(false);
    setUploadMode('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadViaPresignedUrl = async (file: File): Promise<string> => {
    setIsUploading(true);
    setUploadProgress(10);
    setUploadError(null);

    try {
      // 1. Request presigned upload metadata from backend
      const presigned = await phase5Api.requestPresignedUpload({
        file_name: file.name,
        file_type: file.type || 'application/pdf',
        file_size_bytes: file.size,
        folder: 'client_documents',
      });

      setUploadProgress(30);
      let finalPublicUrl = presigned.public_url;

      // 2. Perform direct upload
      if (presigned.mode === 's3_presigned') {
        // Direct upload to S3 / Cloudflare R2 presigned URL with real-time progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open(presigned.method || 'PUT', presigned.upload_url, true);

          if (presigned.headers) {
            Object.entries(presigned.headers).forEach(([key, val]) => {
              xhr.setRequestHeader(key, val);
            });
          }

          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              const pct = 30 + Math.round((evt.loaded / evt.total) * 65);
              setUploadProgress(pct);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Presigned S3 upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during presigned S3 upload.'));
          xhr.ontimeout = () => reject(new Error('Presigned upload timed out.'));
          xhr.send(file);
        });
      } else {
        // Fallback: Direct multipart upload to backend endpoint
        setUploadProgress(45);
        const res = await phase5Api.directUploadFile(file, 'client_documents');
        finalPublicUrl = res.public_url;
      }

      setUploadProgress(100);
      setUploadedUrl(finalPublicUrl);
      toast.success(`'${file.name}' uploaded successfully via presigned pipeline!`);
      return finalPublicUrl;
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to upload document file';
      setUploadError(msg);
      toast.error(msg);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const handleFilePicked = (file: File) => {
    // 50MB max file limit check
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size exceeds the 50MB limit.');
      return;
    }

    setSelectedFile(file);
    setUploadedUrl('');
    setUploadError(null);
    setUploadProgress(0);

    // Auto-generate title if currently blank
    if (!formData.title.trim()) {
      const rawName = file.name.replace(/\.[^/.]+$/, '');
      const cleanTitle = rawName
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      setFormData((prev) => ({ ...prev, title: cleanTitle }));
    }

    // Trigger immediate presigned upload
    uploadViaPresignedUrl(file).catch(() => {
      // Error is caught and surfaced inside uploadViaPresignedUrl
    });
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter a document title.');
      return;
    }

    let fileUrl = formData.file_url.trim();

    if (uploadMode === 'upload') {
      if (!selectedFile && !uploadedUrl) {
        toast.error('Please select a document file to upload.');
        return;
      }

      if (uploadedUrl) {
        fileUrl = uploadedUrl;
      } else if (selectedFile) {
        try {
          fileUrl = await uploadViaPresignedUrl(selectedFile);
        } catch {
          return;
        }
      }
    } else {
      if (!fileUrl) {
        toast.error('Please provide a valid document URL or storage link.');
        return;
      }
    }

    try {
      setAdding(true);
      await clientsApi.uploadDocument(clientId, {
        title: formData.title.trim(),
        type: formData.type,
        file_url: fileUrl,
        status: 'pending_signature',
      });
      toast.success('Document uploaded and queued for e-signature!');
      setIsAddOpen(false);
      resetAddForm();
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to upload document');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteDocument = async (docId: number, docTitle: string) => {
    if (!confirm(`Are you sure you want to delete pending document '${docTitle}'?`)) {
      return;
    }
    try {
      await clientsApi.deleteDocument(docId);
      toast.success(`Document '${docTitle}' deleted.`);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete document');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Signed &amp; Legally Binding
          </span>
        );
      case 'pending_signature':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            Pending E-Signature
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 capitalize">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Contracts, NDAs &amp; Signed Agreements
          </h3>
          <p className="text-xs text-slate-500">
            Tamper-proof audit trail compliant with IT Act 2000 &amp; ESIGN legal frameworks.
          </p>
        </div>

        {isStaff && (
          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedDocToEdit(null);
                setIsEditorOpen(true);
              }}
              className="gap-2 border-primary-500/30 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30 font-semibold"
            >
              <FileEdit className="w-4 h-4" />
              <span>Draft in Editor</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                resetAddForm();
                setIsAddOpen(true);
              }}
              className="gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Agreement</span>
            </Button>
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.length === 0 ? (
          <div className="col-span-2 p-8 text-center rounded-2xl bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10">
            <p className="text-xs font-semibold text-slate-400">
              No contracts or documents on file for this client yet.
            </p>
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-primary-500/30 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                    {doc.type}
                  </span>
                  {getStatusBadge(doc.status)}
                </div>

                <div className="flex items-start gap-3 pt-1">
                  <div className="w-9 h-9 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {doc.title}
                    </h4>
                    <span className="text-[11px] text-slate-400 block">
                      Added {formatDate(doc.created_at)}
                    </span>
                  </div>
                </div>

                {/* Audit Trail Details when signed */}
                {doc.status === 'signed' && (
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Legal Signature Audit Record</span>
                    </div>
                    <div className="text-emerald-700/90 dark:text-emerald-300/80">
                      Signer: <span className="font-semibold">{doc.signer_name}</span>
                    </div>
                    <div className="text-emerald-700/90 dark:text-emerald-300/80">
                      Timestamp: {doc.signed_at ? formatDateTime(doc.signed_at) : 'Recorded'}
                    </div>
                    {doc.signer_ip && (
                      <div className="text-emerald-700/90 dark:text-emerald-300/80 font-mono text-[10px]">
                        IP: {doc.signer_ip}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <a
                    href={doc.signed_file_url || doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Document</span>
                  </a>

                  {isStaff && doc.status === 'pending_signature' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDocToEdit(doc);
                        setIsEditorOpen(true);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {doc.status === 'pending_signature' && (
                    isClient ? (
                      <Button
                        size="sm"
                        onClick={() => setSelectedDocToSign(doc)}
                        className="gap-1.5 text-xs bg-primary-600 hover:bg-primary-700 text-white shadow-xs font-semibold"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Sign Document</span>
                      </Button>
                    ) : (
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-xl">
                        🟡 Awaiting Client Signature
                      </span>
                    )
                  )}

                  {isStaff && doc.status === 'pending_signature' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.id, doc.title)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Delete pending document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Document Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          resetAddForm();
        }}
        title={
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Add Document for E-Signature
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                Service contract, NDA, or custom proposal
              </p>
            </div>
          </div>
        }
        maxWidth="md"
      >
        <form onSubmit={handleAddDocument} className="space-y-4">
          {/* Quick Switcher / Banner to Draft in Editor */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-primary-500/10 via-primary-500/5 to-transparent border border-primary-500/20 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <FileEdit className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
              <span className="text-slate-700 dark:text-slate-300">
                Want to write terms directly or load legal templates?
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAddOpen(false);
                setIsEditorOpen(true);
              }}
              className="text-primary-600 dark:text-primary-400 font-bold hover:underline whitespace-nowrap text-xs flex items-center gap-1"
            >
              <span>Open Editor</span> &rarr;
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Document Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              placeholder="e.g., Master Services Agreement (MSA) 2026"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Document Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            >
              <option value="contract">Master Contract</option>
              <option value="proposal">Commercial Proposal</option>
              <option value="nda">Non-Disclosure Agreement (NDA)</option>
              <option value="welcome">Welcome Onboarding Kit</option>
            </select>
          </div>

          {/* Document File / Direct Presigned Upload Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Document File <span className="text-red-500">*</span>
              </label>

              {/* Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setUploadMode('upload')}
                  className={`px-2.5 py-0.5 rounded-md font-medium transition-all ${
                    uploadMode === 'upload'
                      ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Direct Upload
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('url')}
                  className={`px-2.5 py-0.5 rounded-md font-medium transition-all ${
                    uploadMode === 'url'
                      ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  External URL
                </button>
              </div>
            </div>

            {uploadMode === 'upload' ? (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFilePicked(file);
                  }}
                />

                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFilePicked(file);
                    }}
                    className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all flex flex-col items-center justify-center gap-2 ${
                      isDragOver
                        ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-950/20 ring-2 ring-primary-500/20'
                        : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 hover:border-primary-400 hover:bg-slate-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        <span className="text-primary-600 dark:text-primary-400 hover:underline">
                          Click to browse
                        </span>{' '}
                        or drag &amp; drop document
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        PDF, Word (.docx), or scanned docs up to 50MB
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      ⚡ Secure Presigned Direct Upload
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {formatBytes(selectedFile.size)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setUploadedUrl('');
                          setUploadProgress(0);
                          setUploadError(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Progress Bar & Status */}
                    {isUploading && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-primary-600 dark:text-primary-400 font-semibold flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Uploading via Presigned URL...
                          </span>
                          <span className="text-slate-500 font-mono font-bold">
                            {uploadProgress}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-primary-600 transition-all duration-200 rounded-full"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {!isUploading && uploadedUrl && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-zinc-800">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Uploaded via Presigned Pipeline
                        </span>
                        <a
                          href={uploadedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Preview File
                        </a>
                      </div>
                    )}

                    {!isUploading && uploadError && (
                      <div className="flex items-center justify-between pt-1 border-t border-red-100 dark:border-red-900/30">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400 truncate max-w-[220px]">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {uploadError}
                        </span>
                        <button
                          type="button"
                          onClick={() => selectedFile && uploadViaPresignedUrl(selectedFile)}
                          className="text-[11px] font-bold text-primary-600 hover:underline inline-flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Retry
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <input
                  type="url"
                  value={formData.file_url}
                  onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  placeholder="https://agency.com/agreements/doc.pdf"
                />
                <p className="text-[10px] text-slate-400">
                  Direct HTTPS link to agreement PDF hosted on Google Drive, Dropbox, or custom CDN.
                </p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddOpen(false);
                resetAddForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={adding || isUploading}
              className="gap-2 bg-primary-600 hover:bg-primary-700 text-white"
            >
              {adding ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Adding Document...</span>
                </>
              ) : isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading {uploadProgress}%</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Add Document</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* E-Sign Modal */}
      <ESignDocumentModal
        isOpen={Boolean(selectedDocToSign)}
        onClose={() => setSelectedDocToSign(null)}
        document={selectedDocToSign}
        onSuccess={() => {
          setSelectedDocToSign(null);
          onRefresh();
        }}
      />

      {/* Draft / Edit Agreement Editor Modal */}
      <AgreementEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setSelectedDocToEdit(null);
        }}
        clientId={clientId}
        clientName={clientName}
        clientCompany={clientCompany}
        documentToEdit={selectedDocToEdit}
        onSuccess={() => {
          setSelectedDocToEdit(null);
          onRefresh();
        }}
      />
    </div>
  );
};
