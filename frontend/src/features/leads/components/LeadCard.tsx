import React from 'react';
import { Flame, ArrowRight, User } from 'lucide-react';
import type { Lead, LeadStatus } from '@/types/lead.types';
import { PIPELINE_STAGES } from '@/constants/crm.constants';
import { LeadScoreBadge } from './LeadScoreBadge';

interface LeadCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
  onStatusChange: (lead: Lead, newStatus: LeadStatus) => void;
}

export function LeadCard({ lead, onClick, onStatusChange }: LeadCardProps) {
  const formatINR = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'hot':
        return (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <Flame className="w-3 h-3 fill-red-500 text-red-500" /> HOT
          </span>
        );
      case 'warm':
        return (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            WARM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            COLD
          </span>
        );
    }
  };

  // Find next logical stage in pipeline
  const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === lead.status);
  const nextStage = currentIdx >= 0 && currentIdx < PIPELINE_STAGES.length - 2 ? PIPELINE_STAGES[currentIdx + 1] : null;

  return (
    <div
      onClick={() => onClick(lead)}
      className="group bg-white dark:bg-[#16161d] p-3.5 rounded-xl border border-slate-200/90 dark:border-white/10 shadow-xs hover:shadow-md hover:border-primary-500/40 dark:hover:border-primary-500/40 transition-all cursor-pointer relative"
    >
      {/* Header: Company & Priority */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {lead.company || lead.name}
          </h4>
          {lead.company && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {lead.name}
            </p>
          )}
        </div>
        {getPriorityBadge(lead.priority)}
      </div>

      {/* Value & Score */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5">
        <span className="text-xs font-black text-slate-900 dark:text-white tracking-tight">
          {formatINR(lead.budget || lead.value)}
        </span>
        <LeadScoreBadge score={lead.score} leadId={lead.id} size="xs" />
      </div>

      {/* Footer: Assigned Agent & Source + Quick Advance */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 truncate max-w-[140px]">
          <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0">
            <User className="w-2.5 h-2.5 text-slate-500" />
          </div>
          <span className="truncate text-slate-600 dark:text-slate-300 font-medium">
            {lead.assigned_user?.name?.split(' ')[0] || 'Unassigned'}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 px-1 py-0.2 rounded bg-slate-100 dark:bg-white/5 truncate">
            {lead.source}
          </span>
        </div>

        {/* Quick Advance or Stage Selector */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {nextStage && (
            <button
              onClick={() => onStatusChange(lead, nextStage.key)}
              className="p-1 rounded-md bg-slate-100 dark:bg-white/5 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 dark:hover:text-primary-400 transition-colors text-slate-400 flex items-center gap-0.5 text-[10px] font-semibold"
              title={`Move to ${nextStage.label}`}
            >
              <span>{nextStage.label}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          <select
            value={lead.status}
            onChange={(e) => onStatusChange(lead, e.target.value as LeadStatus)}
            className="text-[10px] bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border-0 focus:ring-0 cursor-pointer p-0 w-4 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity"
            title="Change stage"
          >
            {PIPELINE_STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
