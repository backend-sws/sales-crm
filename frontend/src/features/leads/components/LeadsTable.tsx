import React from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import type { Lead, LeadStatus } from '@/types/lead.types';
import { PIPELINE_STAGES } from '@/constants/crm.constants';
import { LeadScoreBadge } from './LeadScoreBadge';

interface LeadsTableProps {
  leads: Lead[];
  selectedLeadIds: number[];
  onSelectLead: (id: number, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onLeadClick: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (lead: Lead) => void;
  onStatusChange: (lead: Lead, newStatus: LeadStatus) => void;
}

export function LeadsTable({
  leads,
  selectedLeadIds,
  onSelectLead,
  onSelectAll,
  onLeadClick,
  onEditLead,
  onDeleteLead,
  onStatusChange,
}: LeadsTableProps) {
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
          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            HOT
          </span>
        );
      case 'warm':
        return (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            WARM
          </span>
        );
      default:
        return (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            COLD
          </span>
        );
    }
  };

  const isAllSelected = leads.length > 0 && selectedLeadIds.length === leads.length;

  return (
    <div className="bg-white dark:bg-[#121217] rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="p-4 w-10">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="rounded border-slate-300 dark:border-white/10"
                />
              </th>
              <th className="p-4">Contact / Company</th>
              <th className="p-4">Phone / City</th>
              <th className="p-4">Priority &amp; Score</th>
              <th className="p-4">Pipeline Stage</th>
              <th className="p-4">Budget</th>
              <th className="p-4">Assigned Agent</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  No leads match your filter criteria.
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const isSelected = selectedLeadIds.includes(lead.id);
                return (
                  <tr
                    key={lead.id}
                    className={`hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors cursor-pointer ${
                      isSelected ? 'bg-primary-50/50 dark:bg-primary-950/20' : ''
                    }`}
                    onClick={() => onLeadClick(lead)}
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onSelectLead(lead.id, e.target.checked)}
                        className="rounded border-slate-300 dark:border-white/10"
                      />
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {lead.company || lead.name}
                      </div>
                      <div className="text-[11px] text-slate-500">{lead.name}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                        {lead.phone || '—'}
                      </div>
                      <div className="text-[11px] text-slate-500">{lead.city || '—'}</div>
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {getPriorityBadge(lead.priority)}
                        <LeadScoreBadge score={lead.score} leadId={lead.id} size="xs" />
                      </div>
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.status}
                        onChange={(e) => onStatusChange(lead, e.target.value as LeadStatus)}
                        className="text-xs bg-slate-100 dark:bg-white/5 rounded-lg px-2 py-1 font-semibold border-0 focus:ring-1 focus:ring-primary-500"
                      >
                        {PIPELINE_STAGES.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4 font-black text-slate-900 dark:text-white">
                      {formatINR(lead.budget || lead.value)}
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {lead.assigned_user?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onEditLead(lead)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                          title="Edit Lead"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteLead(lead)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
