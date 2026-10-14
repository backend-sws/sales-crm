import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Phone,
  Mail,
  MapPin,
  Tag,
  Edit3,
  Trash2,
  Flame,
  GitMerge,
  AlertTriangle,
  Sparkles,
  Briefcase,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import type { Lead, LeadActivity, LeadStatus } from '@/types/lead.types';
import type { FollowUp } from '@/types/followUp.types';
import { PIPELINE_STAGES } from '@/constants/crm.constants';
import { LeadTimelineTab } from './LeadTimelineTab';
import { LeadFollowUpsTab } from './LeadFollowUpsTab';
import { LeadScoreBadge } from './LeadScoreBadge';
import { LeadAiSuggestionsTab } from './LeadAiSuggestionsTab';
import { leadsApi } from '@/api/leads.api';
import { queryKeys } from '@/constants/queryKeys';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  timeline: LeadActivity[];
  followUps: FollowUp[];
  loading: boolean;
  onStatusChange: (lead: Lead, status: LeadStatus) => void;
  onOpenSchedule: () => void;
  onOpenComplete: (followUp: FollowUp) => void;
  onOpenMerge?: (leadA: Lead, leadB: Lead) => void;
  onConvertLead?: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (lead: Lead) => void;
  onLeadUpdated?: (lead: Lead) => void;
}

export function LeadDetailDrawer({
  lead,
  isOpen,
  onClose,
  timeline,
  followUps,
  loading,
  onStatusChange,
  onOpenSchedule,
  onOpenComplete,
  onOpenMerge,
  onConvertLead,
  onEditLead,
  onDeleteLead,
  onLeadUpdated,
}: LeadDetailDrawerProps) {
  const navigate = useNavigate();
  const [drawerTab, setDrawerTab] = useState<'timeline' | 'followups' | 'details' | 'ai_suggestions'>('timeline');

  // Query suspected duplicate candidate leads
  const { data: duplicatesRes } = useQuery({
    queryKey: queryKeys.leads.duplicates(lead?.id || 0),
    queryFn: () => (lead?.id ? leadsApi.getDuplicates(lead.id) : null),
    enabled: Boolean(lead?.id && isOpen),
  });

  const duplicates = duplicatesRes?.data || [];

  if (!lead) return null;

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

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex flex-wrap items-center gap-2">
          <span>{lead.company || lead.name}</span>
          {getPriorityBadge(lead.priority)}
          <LeadScoreBadge score={lead.score} leadId={lead.id} size="sm" showLabel />
        </div>
      }
      subtitle={`Pipeline Stage: ${lead.status.toUpperCase()} • Deal: ${formatINR(lead.budget || lead.value)}`}
    >
      <div className="space-y-6">
        {/* Duplicate Detection Alert Banner */}
        {duplicates.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0 text-xs">
                <p className="font-bold">
                  Duplicate Detected: {duplicates.length} matching lead(s) found
                </p>
                <p className="text-amber-800/80 dark:text-amber-300/80 truncate">
                  {duplicates[0].candidate.name} • {duplicates[0].reason}
                </p>
              </div>
            </div>
            {onOpenMerge && (
              <Button
                size="sm"
                type="button"
                onClick={() => onOpenMerge(lead, duplicates[0].candidate)}
                className="shrink-0 h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white border-0 shadow-xs gap-1.5"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>Compare &amp; Merge</span>
              </Button>
            )}
          </div>
        )}

        {/* Phase 3: Client Account Conversion Banner */}
        {lead.converted_client_id ? (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0 text-xs">
                <p className="font-bold">Active Client Account</p>
                <p className="text-emerald-800/80 dark:text-emerald-300/80 truncate">
                  Converted into Client #{lead.converted_client_id}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              type="button"
              onClick={() => {
                onClose();
                navigate(`/clients/${lead.converted_client_id}`);
              }}
              className="shrink-0 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-xs gap-1.5"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Open Client Hub</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-between gap-3 text-primary-900 dark:text-primary-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary-500/20 flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="min-w-0 text-xs">
                <p className="font-bold">Ready for Delivery Handover?</p>
                <p className="text-primary-800/80 dark:text-primary-300/80 truncate">
                  Auto-convert this deal to client account with service tracks &amp; white-label portal.
                </p>
              </div>
            </div>
            {onConvertLead && (
              <Button
                size="sm"
                type="button"
                onClick={() => {
                  onClose();
                  onConvertLead(lead);
                }}
                className="shrink-0 h-8 text-xs bg-primary-600 hover:bg-primary-700 text-white border-0 shadow-xs gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Convert to Client</span>
              </Button>
            )}
          </div>
        )}

        {/* Stage Progress Stepper */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Pipeline Stage Progression:
          </label>
          <div className="grid grid-cols-4 gap-1">
            {PIPELINE_STAGES.map((s) => {
              const isCurrent = lead.status === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => onStatusChange(lead, s.key)}
                  className={`text-[10px] py-1.5 px-1 rounded-lg font-bold border transition-all text-center truncate ${
                    isCurrent
                      ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 border-transparent'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Stat Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-center">
            <span className="text-[10px] text-slate-400 font-semibold block">Deal Value</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">
              {formatINR(lead.budget || lead.value)}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-center flex flex-col items-center justify-center">
            <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Intelligence Score</span>
            <LeadScoreBadge score={lead.score} leadId={lead.id} size="md" />
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-center">
            <span className="text-[10px] text-slate-400 font-semibold block">Assigned To</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
              {lead.assigned_user?.name || 'Unassigned'}
            </span>
          </div>
        </div>

        {/* Drawer Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-white/10 pb-2">
          <button
            onClick={() => setDrawerTab('timeline')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              drawerTab === 'timeline'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Activity Timeline
          </button>
          <button
            onClick={() => setDrawerTab('followups')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              drawerTab === 'followups'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Follow-ups ({followUps.length})
          </button>
          <button
            onClick={() => setDrawerTab('details')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              drawerTab === 'details'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Details &amp; Products
          </button>
          <button
            onClick={() => setDrawerTab('ai_suggestions')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              drawerTab === 'ai_suggestions'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-primary-600 dark:text-primary-400 hover:bg-primary-500/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Suggestions
          </button>
        </div>

        {/* Tab 1: Timeline */}
        {drawerTab === 'timeline' && <LeadTimelineTab timeline={timeline} />}

        {/* Tab 2: Follow-ups */}
        {drawerTab === 'followups' && (
          <LeadFollowUpsTab
            followUps={followUps}
            onOpenSchedule={onOpenSchedule}
            onOpenComplete={onOpenComplete}
          />
        )}

        {/* Tab 3: Details & Products */}
        {drawerTab === 'details' && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/5 space-y-2.5">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="font-mono">{lead.phone || 'No phone provided'}</span>
              </div>
              {lead.alt_phone && (
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="font-mono">Alt: {lead.alt_phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{lead.email || 'No email provided'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{lead.city || 'City not specified'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Tag className="w-4 h-4 text-slate-400" />
                <span>Source: {lead.source}</span>
              </div>
            </div>

            {lead.products && lead.products.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Interested Offerings / Products:
                </span>
                <div className="space-y-1.5">
                  {lead.products.map((prod) => (
                    <div
                      key={prod.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {prod.name}
                      </span>
                      {prod.price_range && (
                        <span className="text-[10px] text-slate-400">{prod.price_range}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lead.notes && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Notes:
                </span>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 leading-relaxed">
                  {lead.notes}
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center gap-2">
              <Button
                onClick={() => onEditLead(lead)}
                className="flex-1 h-9 rounded-xl text-xs gap-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Full Profile
              </Button>
              <Button
                variant="outline"
                onClick={() => onDeleteLead(lead)}
                className="h-9 px-3 rounded-xl text-xs text-red-600 hover:bg-red-50 border-red-200 dark:border-red-950/50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Tab 4: AI Suggestions & Co-Pilot */}
        {drawerTab === 'ai_suggestions' && (
          <LeadAiSuggestionsTab
            lead={lead}
            followUps={followUps}
            onOpenSchedule={onOpenSchedule}
            onStatusChange={onStatusChange}
            onLeadUpdated={onLeadUpdated}
          />
        )}
      </div>
    </Drawer>
  );
}
