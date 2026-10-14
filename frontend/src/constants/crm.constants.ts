import type { LeadStatus, LeadPriority } from '@/types/lead.types';
import type { FollowUpType } from '@/types/followUp.types';

export interface StageDefinition {
  key: LeadStatus;
  label: string;
  badgeClass: string;
  accentBorder: string;
  headerBg: string;
}

export const PIPELINE_STAGES: StageDefinition[] = [
  {
    key: 'new',
    label: 'New Lead',
    badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
    accentBorder: 'border-t-slate-400',
    headerBg: 'bg-slate-500/5',
  },
  {
    key: 'contacted',
    label: 'Contacted',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    accentBorder: 'border-t-blue-500',
    headerBg: 'bg-blue-500/5',
  },
  {
    key: 'interested',
    label: 'Interested',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    accentBorder: 'border-t-purple-500',
    headerBg: 'bg-purple-500/5',
  },
  {
    key: 'demo_meeting',
    label: 'Demo / Meet',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    accentBorder: 'border-t-amber-500',
    headerBg: 'bg-amber-500/5',
  },
  {
    key: 'proposal',
    label: 'Proposal',
    badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    accentBorder: 'border-t-orange-500',
    headerBg: 'bg-orange-500/5',
  },
  {
    key: 'negotiation',
    label: 'Negotiation',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    accentBorder: 'border-t-rose-500',
    headerBg: 'bg-rose-500/5',
  },
  {
    key: 'won',
    label: 'Won',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    accentBorder: 'border-t-emerald-500',
    headerBg: 'bg-emerald-500/5',
  },
  {
    key: 'lost',
    label: 'Lost',
    badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    accentBorder: 'border-t-red-500',
    headerBg: 'bg-red-500/5',
  },
];

export const PRIORITIES: Array<{ key: LeadPriority; label: string; icon: string }> = [
  { key: 'hot', label: 'Hot', icon: '🔥' },
  { key: 'warm', label: 'Warm', icon: '⚡' },
  { key: 'cold', label: 'Cold', icon: '❄' },
];

export const FOLLOW_UP_CHANNELS: Array<{ key: FollowUpType; label: string }> = [
  { key: 'call', label: 'Phone Call' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'Email' },
  { key: 'meeting', label: 'In-person / Virtual Meeting' },
];

export const LOST_REASONS = [
  'Price / Budget Constraints',
  'Lost to Competitor',
  'Ghosted / No Response',
  'Not Needed / Wrong Timing',
  'Wrong Contact / Junk Lead',
  'Other',
] as const;

export const DUPLICATE_STRATEGIES = [
  { id: 'skip', title: 'Skip', desc: 'Ignore incoming duplicates' },
  { id: 'update', title: 'Update', desc: 'Enrich existing record with new details' },
  { id: 'add', title: 'Add Anyway', desc: 'Allow duplicate records' },
] as const;
