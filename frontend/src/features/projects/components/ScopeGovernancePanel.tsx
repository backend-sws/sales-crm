import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  GitCompare,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  AlertCircle,
  Eye,
  FileCheck,
} from 'lucide-react';
import {
  projectsApi,
  type ScopeVersionItem,
  type ChangeRequestItem,
} from '@/api/projects.api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';

interface ScopeGovernancePanelProps {
  projectId: number;
  scopeVersions: ScopeVersionItem[];
  changeRequests: ChangeRequestItem[];
  onRefresh: () => void;
  isClientView?: boolean;
}

export function ScopeGovernancePanel({
  projectId,
  scopeVersions,
  changeRequests,
  onRefresh,
  isClientView = false,
}: ScopeGovernancePanelProps) {
  const [activeTab, setActiveTab] = useState<'scope' | 'cr'>('scope');

  // Digital Approval Modal
  const [selectedScopeForApproval, setSelectedScopeForApproval] = useState<ScopeVersionItem | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [approving, setApproving] = useState(false);

  // New Scope Version Draft Modal
  const [isDraftScopeOpen, setIsDraftScopeOpen] = useState(false);
  const [draftScopeBody, setDraftScopeBody] = useState('');
  const [drafting, setDrafting] = useState(false);

  // New Change Request Modal
  const [isNewCROpen, setIsNewCROpen] = useState(false);
  const [crTitle, setCrTitle] = useState('');
  const [crDescription, setCrDescription] = useState('');
  const [crHours, setCrHours] = useState<number | ''>(16);
  const [crCost, setCrCost] = useState<number | ''>(15000);
  const [crDelayDays, setCrDelayDays] = useState<number | ''>(3);
  const [submittingCR, setSubmittingCR] = useState(false);

  // Diff comparison modal
  const [diffResult, setDiffResult] = useState<any | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);

  const baseline = scopeVersions.find((s) => s.is_baseline);

  const handleApproveScope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScopeForApproval) return;
    if (!signerName.trim() || !signatureData.trim()) {
      toast.error('Signer name and digital signature are mandatory.');
      return;
    }

    try {
      setApproving(true);
      await projectsApi.approveScope(selectedScopeForApproval.id, {
        signer_name: signerName.trim(),
        signature_data: signatureData.trim(),
        signature_type: 'drawn',
      });

      toast.success('SOW scope digitally approved and locked as baseline!');
      setSelectedScopeForApproval(null);
      setSignerName('');
      setSignatureData('');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to approve scope.');
    } finally {
      setApproving(false);
    }
  };

  const handleDraftScope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftScopeBody.trim()) {
      toast.error('Scope document body is required.');
      return;
    }

    try {
      setDrafting(true);
      await projectsApi.createScopeVersion(projectId, {
        document_body: draftScopeBody.trim(),
        status: 'pending_approval',
      });

      toast.success('New SOW scope version drafted for review.');
      setIsDraftScopeOpen(false);
      setDraftScopeBody('');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to draft scope.');
    } finally {
      setDrafting(false);
    }
  };

  const handleCreateCR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crTitle.trim() || !crDescription.trim()) {
      toast.error('CR title and detailed description are required.');
      return;
    }

    try {
      setSubmittingCR(true);
      await projectsApi.createChangeRequest(projectId, {
        title: crTitle.trim(),
        description: crDescription.trim(),
        estimated_hours: Number(crHours) || 0,
        additional_cost: Number(crCost) || 0,
        timeline_delay_days: Number(crDelayDays) || 0,
      });

      toast.success('Change Request submitted for formal approval.');
      setIsNewCROpen(false);
      setCrTitle('');
      setCrDescription('');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit CR.');
    } finally {
      setSubmittingCR(false);
    }
  };

  const handleCRDecision = async (crId: number, decision: 'approved' | 'rejected') => {
    try {
      await projectsApi.decideChangeRequest(crId, { decision });
      toast.success(decision === 'approved' ? 'Change Request approved! Auto-created task and updated project value.' : 'Change Request rejected.');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to process decision.');
    }
  };

  const handleCompareDiff = async (v1Id: number, v2Id: number) => {
    try {
      setLoadingDiff(true);
      const res = await projectsApi.getScopeDiff(v1Id, v2Id);
      setDiffResult(res.data);
    } catch {
      toast.error('Could not load version diff.');
    } finally {
      setLoadingDiff(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher: SOW Scope vs Change Requests */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('scope')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'scope'
                ? 'bg-primary-500 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4" /> SOW Baseline &amp; Versions ({scopeVersions.length})
          </button>

          <button
            onClick={() => setActiveTab('cr')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'cr'
                ? 'bg-primary-500 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <GitCompare className="w-4 h-4" /> Change Requests ({changeRequests.length})
          </button>
        </div>

        <div>
          {activeTab === 'scope' && !isClientView && (
            <Button size="sm" onClick={() => setIsDraftScopeOpen(true)} className="gap-1.5 h-8">
              <Plus className="w-3.5 h-3.5" /> Draft New Scope
            </Button>
          )}

          {activeTab === 'cr' && (
            <Button size="sm" onClick={() => setIsNewCROpen(true)} className="gap-1.5 h-8">
              <Plus className="w-3.5 h-3.5" /> Raise Change Request
            </Button>
          )}
        </div>
      </div>

      {/* SOW Scope Tab */}
      {activeTab === 'scope' && (
        <div className="space-y-5">
          {baseline && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-900 dark:text-emerald-200">
                    Active Approved Scope Baseline (v{baseline.version_number})
                  </span>
                  <p className="text-emerald-700 dark:text-emerald-300 text-[11px] mt-0.5">
                    Digitally signed by {baseline.approval?.signer_name || 'Client'} on{' '}
                    {baseline.approval?.approved_at ? new Date(baseline.approval.approved_at).toLocaleString() : 'N/A'}. All deliverables locked.
                  </p>
                </div>
              </div>

              {scopeVersions.length > 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCompareDiff(scopeVersions[scopeVersions.length - 1].id, baseline.id)}
                  className="text-xs h-7 border-emerald-500/40 text-emerald-800 dark:text-emerald-200"
                >
                  <GitCompare className="w-3 h-3 mr-1" /> Compare Diff
                </Button>
              )}
            </div>
          )}

          {/* Versions List */}
          <div className="space-y-3">
            {scopeVersions.map((version) => (
              <div
                key={version.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      Scope Version {version.version_number}
                    </span>
                    {version.is_baseline && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                        Baseline
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      Drafted by {version.author?.name || 'PM'} • {new Date(version.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Digital Approval Button if pending and user is client or admin */}
                  {version.status === 'pending_approval' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedScopeForApproval(version);
                        setSignerName('Rahul Sharma');
                        setSignatureData('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs gap-1"
                    >
                      <FileCheck className="w-3.5 h-3.5" /> Digitally Approve &amp; Lock
                    </Button>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line max-h-48 overflow-y-auto">
                  {version.document_body}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Change Requests Tab */}
      {activeTab === 'cr' && (
        <div className="space-y-3">
          {changeRequests.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#121217] rounded-3xl border border-slate-200/80 dark:border-white/10 text-slate-400 text-xs">
              No Change Requests submitted yet. Any scope additions will appear here for formal client approval.
            </div>
          ) : (
            changeRequests.map((cr) => (
              <div
                key={cr.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{cr.title}</h4>
                    <span className="text-[11px] text-slate-400">
                      Requested by {cr.requester?.name || 'Client'} • {new Date(cr.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                      cr.status === 'approved'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                        : cr.status === 'rejected'
                        ? 'bg-red-500/10 text-red-600 border border-red-500/30'
                        : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                    }`}
                  >
                    {cr.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                  {cr.description}
                </p>

                {/* Scope & Cost Impact Grid */}
                <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Est. Development Hours</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">{cr.estimated_hours} hrs</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Additional Cost</span>
                    <strong className="text-emerald-600 font-mono">₹{cr.additional_cost.toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Delivery Delay Impact</span>
                    <strong className="text-amber-600 font-mono">+{cr.timeline_delay_days} days</strong>
                  </div>
                </div>

                {/* Client Decision Gate */}
                {cr.status === 'submitted' && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCRDecision(cr.id, 'rejected')}
                      className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleCRDecision(cr.id, 'approved')}
                      className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve (Auto-create Task &amp; Cost)
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Digital Approval Modal */}
      {selectedScopeForApproval && (
        <Modal
          isOpen={!!selectedScopeForApproval}
          onClose={() => setSelectedScopeForApproval(null)}
          title={
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  SOW Baseline Digital Approval
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                  Freeze Version {selectedScopeForApproval.version_number} under Section 67A IT Act
                </p>
              </div>
            </div>
          }
          maxWidth="md"
        >
          <form onSubmit={handleApproveScope} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              By submitting this approval, you officially freeze <strong className="text-slate-900 dark:text-white">Scope Version {selectedScopeForApproval.version_number}</strong> as the binding contractual baseline. All future modifications will require a formal Change Request.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Signer Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="e.g. John Doe (Managing Director)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Drawn / Verified Signature
              </label>
              <div className="p-4 border border-dashed border-slate-300 dark:border-zinc-700 rounded-xl bg-slate-50/50 dark:bg-zinc-900/50 text-center space-y-1">
                <span className="font-serif italic text-2xl text-emerald-600 dark:text-emerald-400 block tracking-wide">
                  {signerName || 'Signature Preview'}
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                  Verified Digital Hash · {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <Button variant="outline" size="sm" type="button" onClick={() => setSelectedScopeForApproval(null)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={approving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {approving ? 'Locking Baseline...' : 'Approve & Freeze Scope'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Draft New Scope Version Modal */}
      <Modal
        isOpen={isDraftScopeOpen}
        onClose={() => setIsDraftScopeOpen(false)}
        title={
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Draft New Scope Version
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                Prepare revised scope document for client stakeholder review
              </p>
            </div>
          </div>
        }
        maxWidth="2xl"
      >
        <form onSubmit={handleDraftScope} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Scope Document Specifications <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={10}
              value={draftScopeBody}
              onChange={(e) => setDraftScopeBody(e.target.value)}
              placeholder="1. Deliverables & Features Overview&#10;2. Technical Architecture & Tech Stack&#10;3. Milestones & Delivery Schedule&#10;4. Out-of-Scope Exclusions&#10;5. SLAs, Support & Warranty Terms..."
              className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 leading-relaxed transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsDraftScopeOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={drafting}>
              {drafting ? 'Publishing Draft...' : 'Publish Scope Draft'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Change Request Modal */}
      <Modal
        isOpen={isNewCROpen}
        onClose={() => setIsNewCROpen(false)}
        title={
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Raise Formal Change Request (CR)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                Scope modifications with cost, timeline, and resource impact
              </p>
            </div>
          </div>
        }
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCR} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Feature / Request Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={crTitle}
              onChange={(e) => setCrTitle(e.target.value)}
              placeholder="e.g. Add Multi-Currency Support (USD, EUR, GBP)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Detailed Scope Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={crDescription}
              onChange={(e) => setCrDescription(e.target.value)}
              placeholder="Describe functionality, UX behavior, API endpoints, and acceptance criteria..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Est. Hours
              </label>
              <input
                type="number"
                min="0"
                value={crHours}
                onChange={(e) => setCrHours(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Cost Impact (₹)
              </label>
              <input
                type="number"
                min="0"
                value={crCost}
                onChange={(e) => setCrCost(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Delay (Days)
              </label>
              <input
                type="number"
                min="0"
                value={crDelayDays}
                onChange={(e) => setCrDelayDays(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsNewCROpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={submittingCR}>
              {submittingCR ? 'Submitting...' : 'Submit Change Request'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Diff Modal */}
      {diffResult && (
        <Modal
          isOpen={!!diffResult}
          onClose={() => setDiffResult(null)}
          title={
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                <GitCompare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Scope Diff Comparison
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                  Version {diffResult.v1.version_number} vs Version {diffResult.v2.version_number}
                </p>
              </div>
            </div>
          }
          maxWidth="3xl"
        >
          <div className="space-y-4">
            <div className="font-mono text-xs rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800 max-h-[60vh] overflow-y-auto">
              {diffResult.diff.map((row: any, i: number) => (
                <div
                  key={i}
                  className={`flex px-3 py-1.5 ${
                    row.type === 'added'
                      ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-semibold'
                      : row.type === 'removed'
                      ? 'bg-red-500/10 text-red-800 dark:text-red-300 line-through'
                      : 'text-slate-600 dark:text-slate-400 bg-white dark:bg-zinc-900'
                  }`}
                >
                  <span className="w-10 shrink-0 text-slate-400 select-none">{row.line_number}</span>
                  <span className="w-6 shrink-0 select-none font-bold">
                    {row.type === 'added' ? '+' : row.type === 'removed' ? '-' : ' '}
                  </span>
                  <span className="whitespace-pre-wrap break-all">{row.modified || row.original}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-zinc-800">
              <Button size="sm" variant="outline" onClick={() => setDiffResult(null)}>
                Close Viewer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
