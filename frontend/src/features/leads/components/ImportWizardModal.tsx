import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  ChevronRight,
  Upload,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { DUPLICATE_STRATEGIES } from '@/constants/crm.constants';
import type { LeadMetadata } from '@/types/lead.types';

interface ImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: LeadMetadata;
  onPreview: (file: File) => Promise<any>;
  onExecute: (data: {
    rows: any[];
    column_mapping: Record<string, string>;
    duplicate_strategy: string;
    assigned_agent_id?: number | null;
  }) => Promise<any>;
  onSuccess: () => void;
}

export function ImportWizardModal({
  isOpen,
  onClose,
  metadata,
  onPreview,
  onExecute,
  onSuccess,
}: ImportWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [strategy, setStrategy] = useState<'skip' | 'update' | 'add'>('skip');
  const [agentId, setAgentId] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setStep(1);
      setImportFile(null);
      setPreviewData(null);
      setMapping({});
      setStrategy('skip');
      setAgentId('');
      setResult(null);
    }
  }, [isOpen]);

  const handleFileUpload = async (file: File) => {
    setImportFile(file);
    setLoading(true);
    try {
      const data = await onPreview(file);
      setPreviewData(data);
      setMapping(data.suggested_mapping || {});
      setStep(2);
    } catch {
      // toast handled in parent
    } finally {
      setLoading(false);
    }
  };

  const handleRunImport = async () => {
    if (!previewData?.sample_rows) return;
    setLoading(true);
    try {
      const res = await onExecute({
        rows: previewData.sample_rows,
        column_mapping: mapping,
        duplicate_strategy: strategy,
        assigned_agent_id: agentId ? parseInt(agentId) : null,
      });
      setResult(res);
      setStep(4);
    } catch {
      // toast handled in parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Excel / CSV Lead Import Wizard"
      description="Upload, map columns, configure deduplication rules, and ingest leads in bulk."
    >
      <div className="space-y-4 text-xs">
        {/* Stepper Header */}
        <div className="flex items-center justify-between text-[11px] font-bold pb-2 border-b border-slate-200 dark:border-white/10">
          <span className={step === 1 ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}>
            1. Upload File
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className={step === 2 ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}>
            2. Map Columns
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className={step === 3 ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}>
            3. Rules &amp; Assign
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className={step === 4 ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}>
            4. Summary
          </span>
        </div>

        {/* STEP 1: Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
              }}
              className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl p-8 text-center hover:border-primary-500/50 transition-colors"
            >
              <FileSpreadsheet className="w-10 h-10 mx-auto text-primary-500 mb-2 opacity-80" />
              <p className="font-bold text-slate-800 dark:text-slate-200">
                Drag and drop your .csv file here
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Supports CSV with header row (Name, Phone, Email, Company, Budget)
              </p>
              <label className="mt-4 inline-block">
                <span className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary-600 text-white cursor-pointer hover:bg-primary-700 shadow-md">
                  {loading ? 'Uploading...' : 'Browse Computer'}
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                  }}
                />
              </label>
            </div>
          </div>
        )}

        {/* STEP 2: Column Mapping */}
        {step === 2 && previewData && (
          <div className="space-y-3">
            <p className="text-slate-500">
              Found {previewData.sample_count} sample rows in <b>{previewData.filename}</b>. Verify column mappings:
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
              {['name', 'phone', 'email', 'company', 'city', 'budget', 'source', 'priority'].map(
                (field) => (
                  <div key={field} className="space-y-1">
                    <label className="text-[11px] font-bold capitalize text-slate-700 dark:text-slate-300">
                      {field} {field === 'name' && '*'}
                    </label>
                    <select
                      value={mapping[field] || ''}
                      onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                      className="w-full h-8 px-2 rounded-lg bg-white dark:bg-[#18181f] border border-slate-200 dark:border-white/10 text-xs"
                    >
                      <option value="">(Skip)</option>
                      {previewData.headers?.map((h: string) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              )}
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} className="bg-primary-600 text-white">
                Continue to Rules
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Deduplication & Assignment */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Duplicate Handling Strategy
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DUPLICATE_STRATEGIES.map((strat) => (
                  <button
                    key={strat.id}
                    type="button"
                    onClick={() => setStrategy(strat.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      strategy === strat.id
                        ? 'bg-primary-50 dark:bg-primary-950/30 border-primary-500 text-primary-900 dark:text-primary-100 font-semibold'
                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-bold">{strat.title}</div>
                    <div className="text-[10px] opacity-70">{strat.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Assign Imported Leads To
              </label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-transparent border border-slate-200 dark:border-white/10"
              >
                <option value="">Leave Unassigned / Round-Robin</option>
                {metadata.agents.map((ag) => (
                  <option key={ag.id} value={ag.id.toString()}>
                    {ag.name} ({ag.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                onClick={handleRunImport}
                disabled={loading}
                className="bg-primary-600 hover:bg-primary-700 text-white font-semibold"
              >
                {loading ? 'Processing Import...' : 'Start Import Batch'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Summary */}
        {step === 4 && result && (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">Import Completed!</h3>
              <p className="text-xs text-slate-500 mt-0.5">Batch execution results breakdown:</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Imported</span>
                <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                  {result.imported_count}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <span className="text-[10px] font-bold text-amber-600 uppercase">Duplicates</span>
                <div className="text-lg font-black text-amber-700 dark:text-amber-300">
                  {result.duplicate_count}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                <span className="text-[10px] font-bold text-red-600 uppercase">Errors</span>
                <div className="text-lg font-black text-red-700 dark:text-red-300">
                  {result.error_count}
                </div>
              </div>
            </div>

            <Button
              onClick={() => {
                onClose();
                onSuccess();
              }}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold"
            >
              Close &amp; View Leads
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
