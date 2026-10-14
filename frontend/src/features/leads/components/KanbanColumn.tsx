import React from 'react';
import type { Lead, LeadStatus } from '@/types/lead.types';
import type { StageDefinition } from '@/constants/crm.constants';
import { LeadCard } from './LeadCard';

interface KanbanColumnProps {
  stage: StageDefinition;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (lead: Lead, newStatus: LeadStatus) => void;
}

export function KanbanColumn({
  stage,
  leads,
  onLeadClick,
  onStatusChange,
}: KanbanColumnProps) {
  const totalValue = leads.reduce((acc, l) => acc + (parseFloat(l.budget as string) || 0), 0);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getStageDotColor = (key: string) => {
    switch (key) {
      case 'new': return 'bg-slate-400';
      case 'contacted': return 'bg-blue-500';
      case 'interested': return 'bg-purple-500';
      case 'demo_meeting': return 'bg-amber-500';
      case 'proposal': return 'bg-orange-500';
      case 'negotiation': return 'bg-rose-500';
      case 'won': return 'bg-emerald-500';
      case 'lost': return 'bg-red-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className={`w-[280px] min-w-[280px] max-w-[280px] shrink-0 bg-slate-100/70 dark:bg-[#111116] rounded-2xl border border-slate-200/80 dark:border-white/5 flex flex-col max-h-[calc(100vh-230px)] shadow-xs overflow-hidden ${stage.accentBorder} border-t-2`}>
      {/* Column Header */}
      <div className="p-3 border-b border-slate-200/80 dark:border-white/5 bg-white/70 dark:bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${getStageDotColor(stage.key)}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {stage.label}
            </span>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300">
            {leads.length}
          </span>
        </div>
        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 pl-4">
          {formatINR(totalValue)}
        </div>
      </div>

      {/* Cards List */}
      <div className="p-2 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar min-h-[180px]">
        {leads.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
            No leads in this stage
          </div>
        ) : (
          leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={onLeadClick}
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </div>
    </div>
  );
}
