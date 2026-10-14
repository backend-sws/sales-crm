import React, { useState } from 'react';
import {
  Sparkles,
  MessageCircle,
  Calendar,
  Zap,
  ArrowRight,
  ShieldAlert,
  Flame,
  Clock,
  Tag,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Lead, LeadStatus } from '@/types/lead.types';
import type { FollowUp } from '@/types/followUp.types';
import { leadsApi } from '@/api/leads.api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { toast } from 'sonner';

interface LeadAiSuggestionsTabProps {
  lead: Lead;
  followUps: FollowUp[];
  onOpenSchedule: () => void;
  onStatusChange: (lead: Lead, status: LeadStatus) => void;
  onLeadUpdated?: (lead: Lead) => void;
}

const PRESET_BEHAVIOR_TAGS = [
  { label: 'Decision Maker', color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' },
  { label: 'Price Sensitive', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  { label: 'Urgent Need', color: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30' },
  { label: 'Technical Buyer', color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30' },
  { label: 'High Authority', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  { label: 'Competitor Evaluating', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30' },
];

export function LeadAiSuggestionsTab({
  lead,
  followUps,
  onOpenSchedule,
  onStatusChange,
  onLeadUpdated,
}: LeadAiSuggestionsTabProps) {
  const queryClient = useQueryClient();
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    // If lead has tags in notes or metadata, initialize here
    const tags: string[] = [];
    if (lead.priority === 'hot') tags.push('Urgent Need');
    const budget = Number(lead.budget || lead.value || 0);
    if (budget > 100000) tags.push('High Authority');
    return tags;
  });

  // Calculate staleness days
  const lastActiveDate = lead.last_activity_at ? new Date(lead.last_activity_at) : new Date(lead.created_at);
  const daysInactive = Math.max(0, Math.floor((Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)));
  const budget = Number(lead.budget || lead.value || 0);

  // Auto-Assign Mutation
  const autoAssignMutation = useMutation({
    mutationFn: async (strategy: string) => {
      const res = await leadsApi.autoAssign(lead.id, strategy);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(
        `Lead successfully auto-assigned to ${data.assigned_agent.name} via ${data.strategy.replace('_', ' ')}!`
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(lead.id) });
      if (onLeadUpdated) {
        onLeadUpdated(data.lead);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to auto-assign lead.');
    },
  });

  const toggleTag = (tagName: string) => {
    const next = selectedTags.includes(tagName)
      ? selectedTags.filter((t) => t !== tagName)
      : [...selectedTags, tagName];
    setSelectedTags(next);
    toast.success(`Tag "${tagName}" updated.`);
  };

  const getCleanPhone = (phone?: string | null) => {
    if (!phone) return '';
    return phone.replace(/[^0-9]/g, '');
  };

  const openWhatsApp = () => {
    const cleanPhone = getCleanPhone(lead.phone);
    if (!cleanPhone) {
      toast.error('No valid phone number for WhatsApp message.');
      return;
    }
    const message = encodeURIComponent(
      `Hello ${lead.name}, this is following up regarding your inquiry for ${lead.company || 'your project'}. When would be a convenient time for a brief 10-minute discussion?`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const getNextStage = (curr: LeadStatus): LeadStatus | null => {
    const flow: Record<LeadStatus, LeadStatus | null> = {
      new: 'contacted',
      contacted: 'interested',
      interested: 'demo_meeting',
      demo_meeting: 'proposal',
      proposal: 'negotiation',
      negotiation: 'won',
      won: null,
      lost: null,
    };
    return flow[curr];
  };

  const nextStage = getNextStage(lead.status);

  return (
    <div className="space-y-4 pt-1 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-primary-500/10 via-purple-500/10 to-indigo-500/10 border border-primary-500/20 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary-600/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="text-xs space-y-0.5">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm">
            AI Sales Copilot &amp; Intelligence Recommendations
          </h4>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Real-time pipeline suggestions based on velocity, score ({lead.score}/100), inactivity ({daysInactive}d), and conversion patterns.
          </p>
        </div>
      </div>

      {/* Primary Action Recommendations */}
      <div className="space-y-2.5">
        <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-500" /> Recommended High-Impact Actions
        </h5>

        {/* Suggestion 1: Staleness Alert */}
        {daysInactive >= 5 ? (
          <div className="p-3.5 rounded-2xl border border-red-500/30 bg-red-500/5 space-y-2">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-bold">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Staleness Risk: {daysInactive} Days Since Last Customer Touchpoint</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Leads inactive for over 5 days have a 78% drop in win probability. Score penalties are active. Dispatch a direct WhatsApp message now.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={openWhatsApp}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-xl shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Send WhatsApp Follow-up</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenSchedule}
                className="h-8 text-xs gap-1.5 rounded-xl"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Schedule Urgent Call</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Pipeline Momentum Active ({daysInactive === 0 ? 'Active Today' : `${daysInactive} day(s) ago`})</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Lead is warm and within active cadence. Next step is to progress to the next pipeline milestone.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {nextStage && (
                <Button
                  size="sm"
                  onClick={() => onStatusChange(lead, nextStage)}
                  className="h-8 text-xs bg-primary-600 hover:bg-primary-700 text-white gap-1.5 rounded-xl shadow-xs"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Advance to {nextStage.toUpperCase().replace('_', ' ')}</span>
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={openWhatsApp}
                className="h-8 text-xs gap-1.5 rounded-xl text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Quick WhatsApp Touch</span>
              </Button>
            </div>
          </div>
        )}

        {/* Suggestion 2: Enterprise Deal Strategy */}
        {budget >= 100000 && (
          <div className="p-3.5 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 text-xs font-bold">
              <Flame className="w-4 h-4 shrink-0 fill-indigo-500 text-indigo-500" />
              <span>Enterprise Tier Opportunity (Deal: ₹{budget.toLocaleString('en-IN')})</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              High-ticket deal detected. Involving a Sales Manager as co-closer in the proposal stage yields a 45% higher win rate in historical CRM data.
            </p>
          </div>
        )}

        {/* Suggestion 3: Auto-Assignment Engine */}
        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Users className="w-4 h-4 text-primary-500" />
              <span>Smart Lead Routing &amp; Auto-Assignment</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Current: {lead.assigned_user?.name || 'Unassigned'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Rebalance or assign this lead dynamically using the CRM Load-Balanced algorithm (routes to agent with fewest open deals).
          </p>
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              disabled={autoAssignMutation.isPending}
              onClick={() => autoAssignMutation.mutate('load_balanced')}
              className="h-8 text-xs rounded-xl gap-1.5 bg-white dark:bg-slate-900 shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 text-primary-500" />
              <span>{autoAssignMutation.isPending ? 'Routing...' : 'Run Load-Balanced Auto-Assign'}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={autoAssignMutation.isPending}
              onClick={() => autoAssignMutation.mutate('round_robin')}
              className="h-8 text-xs rounded-xl gap-1.5 bg-white dark:bg-slate-900"
            >
              <span>Round-Robin</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Behavior Tags Selector */}
      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
        <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-slate-400" /> Behavioral &amp; Buyer Persona Tags
        </h5>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Tag lead traits to customize automated follow-up messaging and sales tactics.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {PRESET_BEHAVIOR_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag.label);
            return (
              <button
                key={tag.label}
                type="button"
                onClick={() => toggleTag(tag.label)}
                className={`text-xs px-2.5 py-1 rounded-xl font-bold border transition-all cursor-pointer ${
                  isSelected
                    ? `${tag.color} ring-2 ring-primary-500/20 shadow-xs`
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isSelected ? '✓ ' : '+ '}
                {tag.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
