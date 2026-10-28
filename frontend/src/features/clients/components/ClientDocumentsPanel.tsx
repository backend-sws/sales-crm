import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  FileCheck,
  Upload,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Plus,
  X,
  PenTool,
} from 'lucide-react';
import type { ClientDocumentItem } from '@/api/clients.api';
import { clientsApi } from '@/api/clients.api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ESignDocumentModal } from './ESignDocumentModal';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { useAuthStore } from '@/store/authStore';

interface ClientDocumentsPanelProps {
  clientId: number;
  documents: ClientDocumentItem[];
  onRefresh: () => void;
  isClient?: boolean;
}

export const ClientDocumentsPanel: React.FC<ClientDocumentsPanelProps> = ({
  clientId,
  documents,
  onRefresh,
  isClient: explicitIsClient,
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
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    type: 'contract' as 'contract' | 'proposal' | 'nda' | 'welcome',
    file_url: '',
  });

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAdding(true);
      await clientsApi.uploadDocument(clientId, {
        title: formData.title,
        type: formData.type,
        file_url: formData.file_url || 'https://example.com/agreements/standard-service-agreement.pdf',
        status: 'pending_signature',
      });
      toast.success('Document uploaded and queued for e-signature!');
      setIsAddOpen(false);
      setFormData({ title: '', type: 'contract', file_url: '' });
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to upload document');
    } finally {
      setAdding(false);
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
          <Button
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="gap-2 bg-primary-600 hover:bg-primary-700 text-white"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Agreement</span>
          </Button>
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
                <a
                  href={doc.signed_file_url || doc.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View PDF</span>
                </a>

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
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Document Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Document File URL (or Storage Link)
            </label>
            <input
              type="url"
              value={formData.file_url}
              onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              placeholder="https://agency.com/agreements/doc.pdf"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={adding} className="bg-primary-600 hover:bg-primary-700 text-white">
              Add Document
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
    </div>
  );
};
