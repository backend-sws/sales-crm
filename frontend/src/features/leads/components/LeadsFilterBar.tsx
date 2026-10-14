import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Kanban,
  Table as TableIcon,
  Upload,
  Plus,
  X,
  Clock,
  TrendingUp,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { LeadMetadata } from '@/types/lead.types';

interface LeadsFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  priority: string;
  onPriorityChange: (val: string) => void;
  agent: string;
  onAgentChange: (val: string) => void;
  segment?: string;
  onSegmentChange?: (val: string) => void;
  followupStatus?: string;
  onFollowupStatusChange?: (val: string) => void;
  viewMode: 'kanban' | 'table';
  onViewModeChange: (mode: 'kanban' | 'table') => void;
  metadata: LeadMetadata;
  loading: boolean;
  onRefresh: () => void;
  onOpenCreate: () => void;
  onOpenImport: () => void;
}

export function LeadsFilterBar({
  search,
  onSearchChange,
  priority,
  onPriorityChange,
  agent,
  onAgentChange,
  segment = 'all',
  onSegmentChange,
  followupStatus = 'all',
  onFollowupStatusChange,
  viewMode,
  onViewModeChange,
  metadata,
  loading,
  onRefresh,
  onOpenCreate,
  onOpenImport,
}: LeadsFilterBarProps) {
  const navigate = useNavigate();

  const segmentTabs = [
    { id: 'all', label: 'All Active Leads' },
    { id: 'unassigned', label: '🚨 Unassigned Queue' },
    { id: 'hot', label: '🔥 Hot Deals (> ₹1L)' },
    { id: 'stale', label: '⚠️ Stale / Slipping (> 72h)' },
    { id: 'my_leads', label: '👤 My Leads' },
  ];

  return (
    <div className="bg-white dark:bg-[#111116] p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3.5">
      {/* Top Row: Title, Subtitle, Direct Hub Links & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Deals &amp; Leads Explorer
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
                10k+ Scale Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Multi-dimensional smart segments, automated anti-leakage triage &amp; stage velocity.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Hub Jump: Action Queue & Analytics */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/follow-ups')}
            className="rounded-xl h-8 text-xs gap-1.5 border-slate-200/80 dark:border-white/10 hover:border-amber-400"
            title="Go to Daily Follow-Up Queue"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline">Action Queue</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/leads/analytics')}
            className="rounded-xl h-8 text-xs gap-1.5 border-slate-200/80 dark:border-white/10 hover:border-primary-400"
            title="Go to Anti-Loss Analytics"
          >
            <TrendingUp className="w-3.5 h-3.5 text-primary-500" />
            <span className="hidden md:inline">Analytics</span>
          </Button>

          {/* View Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/5">
            <button
              onClick={() => onViewModeChange('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => onViewModeChange('table')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenImport}
            className="rounded-xl h-8 text-xs gap-1.5 border-slate-200/80 dark:border-white/10"
          >
            <Upload className="w-3.5 h-3.5" />
            Import CSV
          </Button>

          <Button
            size="sm"
            onClick={onOpenCreate}
            className="rounded-xl h-8 text-xs gap-1.5 bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-600/25"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Smart Segment Pills Row */}
      {onSegmentChange && (
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
          {segmentTabs.map((tab) => {
            const isTabActive = segment === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSegmentChange(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isTabActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-white/5 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Filter Row: Search Input, Priority, Follow-Up Status, Agent Filter, Refresh */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search across 10,000+ leads by name, company, phone or city..."
            className="pl-9 pr-8 h-8.5 text-xs rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 focus:border-primary-500 focus:bg-white dark:focus:bg-[#1a1a22]"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={priority}
          onChange={(e) => onPriorityChange(e.target.value)}
          className="h-8.5 px-3 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary-500"
        >
          <option value="all">All Priorities</option>
          <option value="hot">🔥 Hot Priority</option>
          <option value="warm">⚡ Warm Priority</option>
          <option value="cold">❄ Cold Priority</option>
        </select>

        {onFollowupStatusChange && (
          <select
            value={followupStatus}
            onChange={(e) => onFollowupStatusChange(e.target.value)}
            className="h-8.5 px-3 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary-500"
          >
            <option value="all">All Follow-ups</option>
            <option value="overdue">🚨 Overdue Only</option>
            <option value="today">📅 Due Today</option>
            <option value="none">⚠️ No Follow-up (Orphaned)</option>
            <option value="scheduled">✅ Scheduled</option>
          </select>
        )}

        {metadata.agents.length > 0 && (
          <select
            value={agent}
            onChange={(e) => onAgentChange(e.target.value)}
            className="h-8.5 px-3 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary-500"
          >
            <option value="all">All Sales Agents</option>
            {metadata.agents.map((ag) => (
              <option key={ag.id} value={ag.id.toString()}>
                {ag.name}
              </option>
            ))}
          </select>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="h-8.5 w-8.5 p-0 rounded-xl border-slate-200/80 dark:border-white/10 shrink-0"
          title="Refresh pipeline"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </div>
  );
}
