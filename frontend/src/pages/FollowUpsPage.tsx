import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  RefreshCw,
  Phone,
  MessageSquare,
  Mail,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CalendarDays,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

import { followUpsApi } from '@/api/followUps.api';
import { queryKeys } from '@/constants/queryKeys';
import type { FollowUp, FollowUpSummary, FollowUpType } from '@/types/followUp.types';
import type { CompleteFollowUpValues } from '@/schemas/followUp.schema';

import { FollowUpMetricTicker, FollowUpItemCard } from '@/features/followUps/components';
import { CompleteFollowUpModal } from '@/features/leads/components/CompleteFollowUpModal';

export default function FollowUpsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'overdue' | 'today' | 'upcoming' | 'completed'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [completingFollowUp, setCompletingFollowUp] = useState<FollowUp | null>(null);

  // 1. Fetch Follow-up Summary Counts
  const {
    data: summary = { overdue: 0, today: 0, upcoming: 0, completed_today: 0 },
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useQuery<FollowUpSummary>({
    queryKey: queryKeys.followUps.summary,
    queryFn: async () => {
      const res = await followUpsApi.getSummary();
      return res.data;
    },
    refetchInterval: 30000, // Live poll every 30s
  });

  // Automatically default to 'overdue' tab if overdue items exist on initial load
  React.useEffect(() => {
    if (summary.overdue > 0 && activeTab === 'today') {
      setActiveTab('overdue');
    }
  }, [summary.overdue]);

  // 2. Fetch Follow-ups for the active tab
  const {
    data: followUpsList = [],
    isLoading: isListLoading,
    isRefetching,
    refetch: refetchList,
  } = useQuery<FollowUp[]>({
    queryKey: [...queryKeys.followUps.all, activeTab],
    queryFn: async () => {
      if (activeTab === 'overdue') {
        const res = await followUpsApi.getOverdueFollowUps();
        return res.data;
      }
      if (activeTab === 'today') {
        const res = await followUpsApi.getTodayFollowUps();
        return res.data;
      }
      if (activeTab === 'completed') {
        const res = await followUpsApi.getFollowUps({ status: 'completed' });
        return res.data;
      }
      // 'upcoming': all pending follow-ups
      const res = await followUpsApi.getFollowUps({ status: 'pending' });
      const now = new Date();
      return res.data.filter((item) => new Date(item.scheduled_at) > now);
    },
  });

  // 3. Mutation: Complete Follow-up
  const completeMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: CompleteFollowUpValues }) => {
      return followUpsApi.completeFollowUp(id, values);
    },
    onSuccess: (_, vars) => {
      toast.success(
        vars.values.chain_next
          ? 'Follow-up logged and next touchpoint scheduled!'
          : 'Follow-up marked as completed!'
      );
      setCompletingFollowUp(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.followUps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to complete follow-up');
    },
  });

  const handleRefreshAll = () => {
    refetchSummary();
    refetchList();
  };

  // 4. Client-side Search & Type Filter
  const filteredList = useMemo(() => {
    return followUpsList.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.lead?.name?.toLowerCase().includes(q) ||
        item.lead?.company?.toLowerCase().includes(q) ||
        item.lead?.phone?.includes(q) ||
        item.outcome?.toLowerCase().includes(q);

      const matchesType = selectedType === 'all' || item.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [followUpsList, searchQuery, selectedType]);

  const typeOptions: { label: string; value: string; icon: any }[] = [
    { label: 'All Channels', value: 'all', icon: Filter },
    { label: 'Calls', value: 'call', icon: Phone },
    { label: 'WhatsApp', value: 'whatsapp', icon: MessageSquare },
    { label: 'Emails', value: 'email', icon: Mail },
    { label: 'Meetings', value: 'meeting', icon: Users },
  ];

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
              ⚡ Action Command Center
            </span>
            {summary.overdue > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300 border border-red-200 dark:border-red-800 animate-pulse">
                🚨 {summary.overdue} Overdue
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">
            Follow-Up &amp; Call Action Queue
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Zero-leakage daily dispatch: triage overdue calls, engage on WhatsApp, and auto-chain next touches.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isRefetching}
            className="rounded-xl h-9 text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/leads')}
            className="rounded-xl h-9 text-xs gap-1.5 bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-600/25"
          >
            <span>View All Leads Pipeline</span>
          </Button>
        </div>
      </div>

      {/* Overdue Warning Alert Banner */}
      {summary.overdue > 0 && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-3 text-red-900 dark:text-red-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-bold">
                Critical SLA Warning: {summary.overdue} follow-up{summary.overdue > 1 ? 's are' : ' is'} overdue!
              </p>
              <p className="text-xs text-red-700/80 dark:text-red-300/80 mt-0.5">
                Leads not contacted within SLA timeframes cool down rapidly. Please clear overdue queue first.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setActiveTab('overdue')}
            className="shrink-0 h-8 text-xs bg-red-600 hover:bg-red-700 text-white border-0 shadow-xs"
          >
            Open Overdue Queue
          </Button>
        </div>
      )}

      {/* 4 Interactive Ticker Cards */}
      <FollowUpMetricTicker
        summary={summary}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        loading={isSummaryLoading}
      />

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-[#111116] p-3 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lead name, company, phone or notes..."
            className="pl-9 h-9 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10"
          />
        </div>

        {/* Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
          {typeOptions.map((opt) => {
            const isOptActive = selectedType === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setSelectedType(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isOptActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-white/5 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Follow-up Queue Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <span className="font-semibold capitalize">
            Showing {filteredList.length} {activeTab} task{filteredList.length !== 1 ? 's' : ''}
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-primary-600 hover:underline cursor-pointer"
            >
              Clear search filter
            </button>
          )}
        </div>

        {isListLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-24 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse border border-slate-200/60 dark:border-white/5"
              />
            ))}
          </div>
        ) : filteredList.length > 0 ? (
          <div className="space-y-3">
            {filteredList.map((item) => (
              <FollowUpItemCard
                key={item.id}
                followUp={item}
                onComplete={(followUp) => setCompletingFollowUp(followUp)}
                onViewLead={(leadId) => navigate(`/leads?id=${leadId}`)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-white dark:bg-[#111116] rounded-2xl border border-dashed border-slate-200 dark:border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900 dark:text-white">
                Queue is completely clear!
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery || selectedType !== 'all'
                  ? 'No follow-ups match your current search/filter criteria.'
                  : `You have no ${activeTab} follow-ups pending right now. Great job keeping the pipeline warm!`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/leads')}
              className="rounded-xl h-8 text-xs gap-1.5"
            >
              Explore Leads Pipeline
            </Button>
          </div>
        )}
      </div>

      {/* Complete & Auto-Chain Follow-up Modal */}
      {completingFollowUp && (
        <CompleteFollowUpModal
          isOpen={!!completingFollowUp}
          onClose={() => setCompletingFollowUp(null)}
          followUp={completingFollowUp}
          onComplete={async (values: CompleteFollowUpValues) => {
            await completeMutation.mutateAsync({
              id: completingFollowUp.id,
              values,
            });
          }}
          loading={completeMutation.isPending}
        />
      )}
    </div>
  );
}
