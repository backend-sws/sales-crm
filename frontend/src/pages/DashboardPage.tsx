import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import {
  DollarSign,
  Users,
  Award,
  Calendar,
  RefreshCw,
  Layers,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { toast } from 'sonner';

import { dashboardApi } from '@/api/dashboard.api';
import { followUpsApi } from '@/api/followUps.api';
import { leadsApi } from '@/api/leads.api';
import { queryKeys } from '@/constants/queryKeys';
import type { DashboardMetrics } from '@/types/dashboard.types';
import type { FollowUp } from '@/types/followUp.types';
import type { LeadMetadata } from '@/types/lead.types';
import type { CompleteFollowUpValues } from '@/schemas/followUp.schema';
import type { LeadFormValues } from '@/schemas/lead.schema';

import {
  OverdueAlertBanner,
  FunnelDistribution,
  TodayFollowUpsCard,
  RecentLeadsCard,
} from '@/features/dashboard/components';
import { CompleteFollowUpModal, LeadModal } from '@/features/leads/components';

export default function DashboardPage() {
  const { user } = useAuthStore();
  if (user?.roles?.includes('client')) {
    return <Navigate to="/portal" replace />;
  }

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Modals
  const [completingFollowUp, setCompletingFollowUp] = useState<FollowUp | null>(null);
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);

  // TanStack Query 1: Dashboard Metrics
  const {
    data: metrics = null,
    isLoading: isMetricsLoading,
    isRefetching,
    refetch,
  } = useQuery<DashboardMetrics | null>({
    queryKey: queryKeys.dashboard.metrics,
    queryFn: async () => {
      const res = await dashboardApi.getMetrics();
      return res.data;
    },
    staleTime: 60 * 1000, // 1 minute fresh
  });

  // TanStack Query 2: Today's Follow-ups
  const {
    data: todayFollowUps = [],
    isLoading: isTodayLoading,
  } = useQuery<FollowUp[]>({
    queryKey: queryKeys.followUps.today,
    queryFn: async () => {
      const res = await followUpsApi.getTodayFollowUps();
      return res.data;
    },
  });

  // TanStack Query 3: Overdue Follow-ups
  const {
    data: overdueFollowUps = [],
  } = useQuery<FollowUp[]>({
    queryKey: queryKeys.followUps.overdue,
    queryFn: async () => {
      const res = await followUpsApi.getOverdueFollowUps();
      return res.data;
    },
  });

  // TanStack Query 4: Lead Metadata (for Quick Create Lead)
  const {
    data: metadata = { sources: [], products: [], agents: [] },
  } = useQuery<LeadMetadata>({
    queryKey: queryKeys.leads.metadata,
    queryFn: async () => {
      const res = await leadsApi.getMetadata();
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // TanStack Mutation 1: Complete Follow-up
  const completeMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: CompleteFollowUpValues }) => {
      return followUpsApi.completeFollowUp(id, values);
    },
    onSuccess: (_, vars) => {
      toast.success(vars.values.chain_next ? 'Follow-up completed & next chained!' : 'Follow-up completed!');
      setCompletingFollowUp(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.followUps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to complete follow-up');
    },
  });

  // TanStack Mutation 2: Create Lead
  const createLeadMutation = useMutation({
    mutationFn: async (values: LeadFormValues) => {
      const payload = {
        ...values,
        source_id: values.source_id ? parseInt(values.source_id, 10) : null,
        assigned_to: values.assigned_to ? parseInt(values.assigned_to, 10) : null,
      };
      return leadsApi.createLead(payload as any);
    },
    onSuccess: () => {
      toast.success('Lead created successfully!');
      setIsCreateLeadOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create lead');
    },
  });

  const loading = isMetricsLoading || isTodayLoading;

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
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
              Sales Intelligence Hub
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">
            Sales &amp; Pipeline Dashboard
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time telemetry, 8-stage funnel, and automated follow-up chain.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="rounded-xl h-9 text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            onClick={() => navigate('/leads')}
            size="sm"
            variant="outline"
            className="rounded-xl h-9 text-xs gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            Open Kanban
          </Button>

          <Button
            onClick={() => setIsCreateLeadOpen(true)}
            size="sm"
            className="rounded-xl h-9 text-xs gap-1.5 bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/25"
          >
            <Plus className="w-4 h-4" />
            New Lead
          </Button>
        </div>
      </div>

      {/* Overdue Action Banner */}
      <OverdueAlertBanner
        overdueFollowUps={overdueFollowUps}
        onReview={() => navigate('/leads')}
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pipeline Value"
          value={loading ? '...' : formatINR(metrics?.summary?.total_pipeline_value || 0)}
          icon={DollarSign}
          trend={{ value: '+12.5%', isPositive: true }}
          subtitle="Across all deal stages"
          color="indigo"
        />

        <StatCard
          title="Active CRM Leads"
          value={loading ? '...' : String(metrics?.summary?.total_leads || 0)}
          icon={Users}
          trend={{ value: '+8.2%', isPositive: true }}
          subtitle="In active pipeline"
          color="blue"
        />

        <StatCard
          title="Won Deals Value"
          value={loading ? '...' : formatINR(metrics?.summary?.won_deals_value || 0)}
          icon={Award}
          trend={{ value: '+18.4%', isPositive: true }}
          subtitle="Closed successfully"
          color="emerald"
        />

        <StatCard
          title="Today's Follow-ups"
          value={loading ? '...' : String(todayFollowUps.length)}
          icon={Calendar}
          trend={{ value: 'Pending today', isPositive: true }}
          subtitle="Scheduled discussions"
          color="purple"
        />
      </div>

      {/* 2-Column Funnel & Action Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FunnelDistribution
            metrics={metrics}
            onOpenBoard={() => navigate('/leads')}
          />
        </div>

        <div>
          <TodayFollowUpsCard
            todayFollowUps={todayFollowUps}
            onCompleteClick={(fu) => setCompletingFollowUp(fu)}
          />
        </div>
      </div>

      {/* Recent Leads Activity Table */}
      <RecentLeadsCard
        leads={metrics?.recent_leads || []}
        loading={loading}
        onViewAll={() => navigate('/leads')}
      />

      {/* Complete Follow-up Modal */}
      <CompleteFollowUpModal
        isOpen={Boolean(completingFollowUp)}
        onClose={() => setCompletingFollowUp(null)}
        followUp={completingFollowUp}
        onComplete={async (vals) => {
          if (completingFollowUp) {
            await completeMutation.mutateAsync({ id: completingFollowUp.id, values: vals });
          }
        }}
      />

      {/* Create Lead Modal */}
      <LeadModal
        isOpen={isCreateLeadOpen}
        onClose={() => setIsCreateLeadOpen(false)}
        editingLead={null}
        metadata={metadata}
        onSave={async (vals) => {
          await createLeadMutation.mutateAsync(vals);
        }}
      />
    </div>
  );
}
