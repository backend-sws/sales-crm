import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  GitCompare,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  IndianRupee,
  AlertCircle,
  Eye,
  FileCheck,
  PenTool,
  Eraser,
  Copy,
  Check,
  Lock,
  Building,
  AlertTriangle,
  RotateCcw,
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
  project?: any;
  scopeVersions: ScopeVersionItem[];
  changeRequests: ChangeRequestItem[];
  onRefresh: () => void;
  isClientView?: boolean;
}

export function ScopeGovernancePanel({
  projectId,
  project,
  scopeVersions,
  changeRequests,
  onRefresh,
  isClientView = false,
}: ScopeGovernancePanelProps) {
  const [activeTab, setActiveTab] = useState<'scope' | 'cr'>('scope');

  // Digital Approval Modal & Canvas Signature Pad State
  const [selectedScopeForApproval, setSelectedScopeForApproval] = useState<ScopeVersionItem | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerDesignation, setSignerDesignation] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [approving, setApproving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

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
  const clientCompany = project?.client?.company || 'Client';
  const defaultClientName = project?.client?.name || project?.client?.primary_contact_name || '';

  // Reset signature canvas when modal opens
  useEffect(() => {
    if (selectedScopeForApproval) {
      setSignerName(defaultClientName || '');
      setSignerDesignation(isClientView ? 'Authorized Signatory' : 'Client Representative');
      setConsentGiven(false);
      setHasDrawn(false);
      setTimeout(() => clearCanvas(), 50);
    }
  }, [selectedScopeForApproval, defaultClientName, isClientView]);

  // Canvas drawing functions
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1E3A8A'; // Legal blue signature ink
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleApproveScope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScopeForApproval) return;

    if (!signerName.trim()) {
      toast.error('Signer full legal name is required.');
      return;
    }

    if (!hasDrawn || !canvasRef.current) {
      toast.error('Please manually draw your signature in the signature box using your pencil/mouse/touch.');
      return;
    }

    if (!consentGiven) {
      toast.error('Please check the legal consent declaration box.');
      return;
    }

    // Export real drawn signature as high-res PNG base64
    const signatureBase64 = canvasRef.current.toDataURL('image/png');

    try {
      setApproving(true);
      await projectsApi.approveScope(selectedScopeForApproval.id, {
        signer_name: signerDesignation.trim()
          ? `${signerName.trim()} (${signerDesignation.trim()})`
          : signerName.trim(),
        signature_data: signatureBase64,
        signature_type: 'drawn',
      });

      toast.success('SOW Scope digitally signed and officially locked as baseline!');
      setSelectedScopeForApproval(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to approve scope.');
    } finally {
      setApproving(false);
    }
  };

  const handleCopySigningLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Direct SOW review link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
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

      toast.success('New SOW scope version drafted and sent for client signature.');
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
      toast.success(`Change Request ${decision === 'approved' ? 'Approved' : 'Rejected'}!`);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to process CR decision.');
    }
  };

  const handleCompareDiff = async (v1Id: number, v2Id: number) => {
    try {
      setLoadingDiff(true);
      const res = await projectsApi.getScopeDiff(v1Id, v2Id);
      setDiffResult(res.data);
    } catch {
      toast.error('Failed to load version diff comparison.');
    } finally {
      setLoadingDiff(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Scope Sub-Navigation & Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('scope')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'scope'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            SOW Baseline &amp; Versions ({scopeVersions.length})
          </button>
          <button
            onClick={() => setActiveTab('cr')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'cr'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            Change Requests ({changeRequests.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
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
          {/* Active Approved Scope Baseline with Real Drawn Signature */}
          {baseline && (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3.5 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/20">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-emerald-950 dark:text-emerald-100">
                        Active Approved Scope Baseline (v{baseline.version_number})
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Locked Baseline
                      </span>
                    </div>
                    <p className="text-emerald-800 dark:text-emerald-300 text-xs mt-0.5">
                      Contractually approved by client. Any scope additions now require a formal Change Request (CR).
                    </p>
                  </div>
                </div>

                {scopeVersions.length > 1 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCompareDiff(scopeVersions[scopeVersions.length - 1].id, baseline.id)}
                    className="text-xs h-7 border-emerald-500/40 text-emerald-800 dark:text-emerald-200 shrink-0"
                  >
                    <GitCompare className="w-3 h-3 mr-1" /> Compare Diff
                  </Button>
                )}
              </div>

              {/* Real Drawn Digital Signature Audit Strip */}
              {baseline.approval && (
                <div className="p-3.5 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                      <PenTool className="w-3 h-3" /> Client Authorized Digital Signature
                    </span>
                    <div className="bg-white dark:bg-black rounded-lg p-2 border border-slate-200 dark:border-zinc-800 inline-block shadow-2xs">
                      {baseline.approval.signature_data?.startsWith('data:image') ? (
                        <img
                          src={baseline.approval.signature_data}
                          alt={`Signature of ${baseline.approval.signer_name}`}
                          className="h-10 max-w-[220px] object-contain"
                        />
                      ) : (
                        <span className="font-serif italic text-lg text-emerald-700 dark:text-emerald-400">
                          {baseline.approval.signer_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-600 dark:text-slate-300 space-y-0.5 self-start sm:self-auto">
                    <p className="font-bold text-slate-800 dark:text-white">
                      Signer: {baseline.approval.signer_name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Signed on {new Date(baseline.approval.approved_at).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      IP: {baseline.approval.ip_address || '127.0.0.1'} • Method: {baseline.approval.signature_type || 'drawn pencil'}
                    </p>
                  </div>
                </div>
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
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

                  {/* Role-based Action: Client signs, Admin monitors */}
                  {version.status === 'pending_approval' && (
                    <div className="flex items-center gap-2">
                      {isClientView ? (
                        <Button
                          size="sm"
                          onClick={() => setSelectedScopeForApproval(version)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1.5 shadow-sm shadow-emerald-600/20"
                        >
                          <PenTool className="w-3.5 h-3.5" /> Review &amp; Digitally Sign SOW
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                            <Clock className="w-3.5 h-3.5 animate-pulse text-amber-500" />
                            <span>Awaiting Client Signature</span>
                          </span>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedScopeForApproval(version)}
                            className="h-7 text-[11px] gap-1 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                            title="Open digital signature pad for in-person client sign-off"
                          >
                            <PenTool className="w-3 h-3 text-primary-500" />
                            <span>Client In-Person Signing Pad</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCopySigningLink}
                            className="h-7 text-[11px] gap-1 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
                            title="Copy link to send to client"
                          >
                            {copiedLink ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedLink ? 'Copied Link' : 'Copy Link'}</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line max-h-48 overflow-y-auto leading-relaxed">
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
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      CR-{cr.id}: {cr.title}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Requested by {cr.requester?.name || 'Client'} on {new Date(cr.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[10px] uppercase font-black ${
                      cr.status === 'approved'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : cr.status === 'rejected'
                        ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                        : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    }`}
                  >
                    {cr.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{cr.description}</p>

                <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02]">
                    <span className="text-[10px] text-slate-400 font-medium">Added Hours</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{cr.estimated_hours}h</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02]">
                    <span className="text-[10px] text-slate-400 font-medium">Added Cost</span>
                    <p className="font-bold text-primary-600 dark:text-primary-400 mt-0.5">₹{cr.additional_cost.toLocaleString()}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02]">
                    <span className="text-[10px] text-slate-400 font-medium">Timeline Impact</span>
                    <p className="font-bold text-orange-600 dark:text-orange-400 mt-0.5">+{cr.timeline_delay_days} days</p>
                  </div>
                </div>

                {cr.status === 'submitted' && !isClientView && (
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCRDecision(cr.id, 'rejected')}
                      className="text-xs h-7 text-red-600 border-red-500/30 hover:bg-red-50"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Reject CR
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleCRDecision(cr.id, 'approved')}
                      className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve CR &amp; Adjust SOW
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* SOW Baseline Digital Pencil Signature Pad Modal */}
      {selectedScopeForApproval && (
        <Modal
          isOpen={!!selectedScopeForApproval}
          onClose={() => setSelectedScopeForApproval(null)}
          title={
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <PenTool className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Statement of Work (SOW) Digital Signature
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                  Contractual Baseline Sign-off for Scope Version {selectedScopeForApproval.version_number}
                </p>
              </div>
            </div>
          }
          maxWidth="2xl"
        >
          <form onSubmit={handleApproveScope} className="space-y-4 pt-1">
            {/* Notice banner */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <p>
                <strong>Client Organization:</strong> {clientCompany}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Please review the specifications below and draw your authorized digital signature in the box using your mouse, stylus, or touch screen. Once signed, this scope version becomes the legally locked baseline.
              </p>
            </div>

            {/* Scope Document Preview Snippet */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Scope Specifications Summary</span>
                <span className="text-[10px] text-slate-400 font-normal">v{selectedScopeForApproval.version_number}</span>
              </label>
              <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-white/[0.02] border border-slate-200 dark:border-zinc-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 max-h-32 overflow-y-auto whitespace-pre-line leading-relaxed">
                {selectedScopeForApproval.document_body}
              </div>
            </div>

            {/* Signer Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Authorized Signer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Designation / Role
                </label>
                <input
                  type="text"
                  value={signerDesignation}
                  onChange={(e) => setSignerDesignation(e.target.value)}
                  placeholder="e.g. Managing Director / Founder"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Interactive HTML5 Canvas Signature Pad */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-primary-500" />
                  Draw Digital Signature (Mouse / Touch / Pencil) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-[11px] font-semibold text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Clear / Redraw
                </button>
              </div>

              {/* Canvas Box */}
              <div className="relative rounded-2xl border-2 border-dashed border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 overflow-hidden shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={580}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[150px] touch-none cursor-crosshair block"
                />

                {/* Signing baseline guide watermark */}
                <div className="absolute bottom-6 left-6 right-6 border-b border-slate-300 dark:border-zinc-800 pointer-events-none flex items-center justify-between text-[11px] text-slate-400 pb-1 select-none">
                  <span className="font-serif italic font-bold">✖ Authorized Signatory Baseline</span>
                  <span className="text-[10px]">Sign with Mouse / Stylus</span>
                </div>

                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-xs">
                    <span className="bg-white/80 dark:bg-zinc-950/80 px-3 py-1 rounded-full border border-slate-200 dark:border-zinc-800">
                      ✍️ Draw your signature here
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Legal Consent Checkbox */}
            <label className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                I, <strong>{signerName || 'the undersigned'}</strong>, confirm that I am the authorized representative of{' '}
                <strong>{clientCompany}</strong>. By drawing my signature above, I legally approve and lock this Statement of Work (SOW) Scope Version {selectedScopeForApproval.version_number}.
              </span>
            </label>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <Button variant="outline" size="sm" type="button" onClick={() => setSelectedScopeForApproval(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                type="submit"
                disabled={approving || !hasDrawn || !consentGiven || !signerName.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {approving ? 'Locking Scope Baseline...' : 'Confirm & Sign SOW Baseline'}
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
              placeholder="1. Deliverables &amp; Features Overview&#10;2. Technical Architecture &amp; Tech Stack&#10;3. Milestones &amp; Delivery Schedule&#10;4. Out-of-Scope Exclusions&#10;5. SLAs, Support &amp; Warranty Terms..."
              className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 leading-relaxed transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsDraftScopeOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={drafting}>
              {drafting ? 'Publishing Draft...' : 'Publish Scope Draft for Client'}
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
              placeholder="e.g. Add Multi-Payment Gateway (UPI, Razorpay, Netbanking)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Detailed Scope &amp; Deliverables Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={crDescription}
              onChange={(e) => setCrDescription(e.target.value)}
              placeholder="Explain the required additions, UI flows, and why this modification is needed..."
              className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Estimated Hours
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
                Additional Cost (₹)
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
                Timeline Delay (Days)
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
