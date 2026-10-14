import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GitMerge,
  ArrowRight,
  ArrowLeftRight,
  ShieldAlert,
  CheckCircle2,
  Building2,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  User,
  Sparkles,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { leadsApi } from '@/api/leads.api';
import { queryKeys } from '@/constants/queryKeys';
import type { Lead } from '@/types/lead.types';
import { toast } from 'sonner';

interface MergeLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadA: Lead | null;
  leadB: Lead | null;
  onMerged?: (master: Lead) => void;
}

export function MergeLeadModal({
  isOpen,
  onClose,
  leadA,
  leadB,
  onMerged,
}: MergeLeadModalProps) {
  const queryClient = useQueryClient();

  // Selected master (default to older lead or leadA)
  const [masterId, setMasterId] = useState<number | null>(null);

  useEffect(() => {
    if (leadA && leadB) {
      // By default, the one with earlier created_at or leadA is master
      setMasterId(leadA.id);
    }
  }, [leadA, leadB]);

  const isAMaster = leadA && masterId === leadA.id;
  const master = isAMaster ? leadA : leadB;
  const duplicate = isAMaster ? leadB : leadA;

  const swapMaster = () => {
    if (!leadA || !leadB) return;
    setMasterId(isAMaster ? leadB.id : leadA.id);
  };

  const mergeMutation = useMutation({
    mutationFn: async () => {
      if (!master || !duplicate) {
        throw new Error('Please select both leads to merge.');
      }
      const res = await leadsApi.mergeLeads(master.id, duplicate.id);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(
        `Leads merged successfully! Duplicate #${duplicate?.id} consolidated into Master #${master?.id}.`
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics });
      queryClient.invalidateQueries({ queryKey: queryKeys.followUps.all });
      onClose();
      if (onMerged) {
        onMerged(data);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to merge leads.');
    },
  });

  if (!isOpen || !leadA || !leadB || !master || !duplicate) return null;

  const formatINR = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Merge & Consolidate Duplicate Leads"
      maxWidth="4xl"
    >
      <div className="space-y-5">
        {/* Warning / Explanation Banner */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-amber-900 dark:text-amber-200">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm">
              Consolidating Lead #{duplicate.id} into Master Record #{master.id}
            </p>
            <p className="text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
              All scheduled follow-ups, activity history, and touchpoints from <strong>{duplicate.name}</strong> will be migrated directly into the Master lead record. The duplicate record will be archived with full audit logging.
            </p>
          </div>
        </div>

        {/* Side-by-Side Comparison Container */}
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Swap Button In the Middle */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={swapMaster}
              className="rounded-full w-10 h-10 p-0 shadow-lg bg-white dark:bg-slate-900 border-2 border-primary-500/40 hover:border-primary-500 hover:scale-110 transition-all cursor-pointer"
              title="Click to swap which lead is Master"
            >
              <ArrowLeftRight className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </Button>
          </div>

          {/* Master Record Column */}
          <div className="p-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04] space-y-3 relative">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                MASTER RECORD (KEPT)
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">
                ID #{master.id}
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {master.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {master.company || 'No Company'}
              </p>
            </div>

            <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-white/5">
              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone
                </span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                  {master.phone || '—'}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[180px]">
                  {master.email || '—'}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-400">Pipeline Stage</span>
                <span className="font-bold text-primary-600 dark:text-primary-400 capitalize">
                  {master.status.replace('_', ' ')}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-400">Budget / Value</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {formatINR(master.budget || master.value || 0)}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-400">Lead Score</span>
                <span className="font-black text-xs px-2 py-0.5 rounded bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300">
                  {master.score} / 100
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Assigned Agent
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {master.assigned_user?.name || 'Unassigned'}
                </span>
              </div>
            </div>
          </div>

          {/* Duplicate Record Column */}
          <div className="p-4 rounded-2xl border border-dashed border-red-300 dark:border-red-900/50 bg-red-500/[0.02] space-y-3 relative opacity-85">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border border-red-300 dark:border-red-800">
                DUPLICATE (CONSOLIDATE &amp; ARCHIVE)
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">
                ID #{duplicate.id}
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                {duplicate.name}
              </h3>
              <p className="text-xs text-slate-400">
                {duplicate.company || 'No Company'}
              </p>
            </div>

            <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-white/5">
              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone
                </span>
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  {duplicate.phone || '—'}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                </span>
                <span className="text-slate-600 dark:text-slate-400 truncate max-w-[180px]">
                  {duplicate.email || '—'}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-400">Pipeline Stage</span>
                <span className="capitalize text-slate-600 dark:text-slate-400">
                  {duplicate.status.replace('_', ' ')}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-400">Budget / Value</span>
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  {formatINR(duplicate.budget || duplicate.value || 0)}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-400">Lead Score</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400">
                  {duplicate.score} / 100
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Assigned Agent
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  {duplicate.assigned_user?.name || 'Unassigned'}
                </span>
              </div>
            </div>

            {/* Mobile Swap Trigger */}
            <div className="md:hidden pt-2 text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={swapMaster}
                className="w-full text-xs gap-1.5"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Make this lead Master instead
              </Button>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={mergeMutation.isPending}
            className="rounded-xl text-xs h-9"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={() => mergeMutation.mutate()}
            disabled={mergeMutation.isPending}
            className="rounded-xl text-xs h-9 bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-600/25 gap-1.5"
          >
            <GitMerge className="w-4 h-4" />
            <span>{mergeMutation.isPending ? 'Merging Records...' : 'Confirm & Consolidate'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
