import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '@/api/leads.api';
import { followUpsApi } from '@/api/followUps.api';
import { queryKeys } from '@/constants/queryKeys';
import type {
  Lead,
  LeadStatus,
  LeadMetadata,
  LeadFilterParams,
  KanbanBoardData,
} from '@/types/lead.types';
import type { FollowUp } from '@/types/followUp.types';
import type { LeadFormValues } from '@/schemas/lead.schema';
import type { ScheduleFollowUpValues, CompleteFollowUpValues } from '@/schemas/followUp.schema';
import { toast } from 'sonner';

export function useLeads() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedSegment, setSelectedSegment] = useState<string>(searchParams.get('segment') || 'all');
  const [selectedFollowupStatus, setSelectedFollowupStatus] = useState<string>(searchParams.get('followup_status') || 'all');

  // Drawer state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Modal visibility states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [completingFollowUp, setCompletingFollowUp] = useState<FollowUp | null>(null);
  const [pendingStatusLead, setPendingStatusLead] = useState<{ lead: Lead; targetStatus: LeadStatus } | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Bulk actions
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false);

  // Query 1: Metadata (cached for 5 minutes)
  const { data: metadata = { sources: [], products: [], agents: [] } } = useQuery<LeadMetadata>({
    queryKey: queryKeys.leads.metadata,
    queryFn: async () => {
      const res = await leadsApi.getMetadata();
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Query Filters Memo
  const filterParams: LeadFilterParams = useMemo(() => {
    const params: LeadFilterParams = {};
    if (search.trim()) params.search = search.trim();
    if (selectedStatus !== 'all') params.status = selectedStatus;
    if (selectedPriority !== 'all') params.priority = selectedPriority;
    if (selectedAgent !== 'all') params.assigned_to = selectedAgent;
    if (selectedSegment !== 'all') params.segment = selectedSegment;
    if (selectedFollowupStatus !== 'all') params.followup_status = selectedFollowupStatus;
    return params;
  }, [search, selectedStatus, selectedPriority, selectedAgent, selectedSegment, selectedFollowupStatus]);

  // Query 2: Kanban Data
  const {
    data: kanbanData = {},
    isLoading: isKanbanLoading,
    refetch: refetchKanban,
  } = useQuery<Partial<KanbanBoardData>>({
    queryKey: queryKeys.leads.kanban(filterParams),
    queryFn: async () => {
      const res = await leadsApi.getKanbanLeads({
        search: filterParams.search,
        assigned_to: filterParams.assigned_to ? String(filterParams.assigned_to) : undefined,
      });
      return res.data || {};
    },
    enabled: viewMode === 'kanban',
  });

  // Query 3: Leads List (Table view)
  const {
    data: leads = [],
    isLoading: isTableLoading,
    refetch: refetchTable,
  } = useQuery<Lead[]>({
    queryKey: queryKeys.leads.list(filterParams),
    queryFn: async () => {
      const res = await leadsApi.getLeads({ ...filterParams, per_page: 50 });
      return res.data || [];
    },
    enabled: viewMode === 'table',
  });

  // Query 4: Drawer Timeline
  const {
    data: timeline = [],
    isLoading: isTimelineLoading,
  } = useQuery({
    queryKey: queryKeys.leads.timeline(selectedLead?.id ?? 0),
    queryFn: async () => {
      if (!selectedLead?.id) return [];
      const res = await leadsApi.getTimeline(selectedLead.id);
      return res.data || [];
    },
    enabled: Boolean(selectedLead?.id),
  });

  // Query 5: Drawer Follow-ups
  const {
    data: followUps = [],
    isLoading: isFollowUpsLoading,
  } = useQuery({
    queryKey: queryKeys.followUps.list({ lead_id: selectedLead?.id ?? 0 }),
    queryFn: async () => {
      if (!selectedLead?.id) return [];
      const res = await followUpsApi.getFollowUps({ lead_id: selectedLead.id });
      return res.data || [];
    },
    enabled: Boolean(selectedLead?.id),
  });

  const loading = viewMode === 'kanban' ? isKanbanLoading : isTableLoading;
  const drawerLoading = isTimelineLoading || isFollowUpsLoading;

  const fetchData = () => {
    if (viewMode === 'kanban') {
      refetchKanban();
    } else {
      refetchTable();
    }
  };

  // Open Lead Drawer
  const openLeadDrawer = (lead: Lead) => {
    setSelectedLead(lead);
  };

  // Mutation 1: Save Lead (Create or Update)
  const saveLeadMutation = useMutation({
    mutationFn: async (values: LeadFormValues) => {
      const payload = {
        ...values,
        source_id: values.source_id ? parseInt(values.source_id, 10) : null,
        assigned_to: values.assigned_to ? parseInt(values.assigned_to, 10) : null,
      };

      if (editingLead) {
        return leadsApi.updateLead(editingLead.id, payload as any);
      }
      return leadsApi.createLead(payload as any);
    },
    onSuccess: (res) => {
      toast.success(editingLead ? 'Lead updated successfully!' : 'Lead created successfully!');
      setIsCreateModalOpen(false);
      setEditingLead(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics });
      if (selectedLead?.id === editingLead?.id && res?.data) {
        setSelectedLead(res.data);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save lead');
    },
  });

  // Mutation 2: Status Change
  const statusChangeMutation = useMutation({
    mutationFn: async ({
      leadId,
      status,
      lostReason,
      lostNotes,
    }: {
      leadId: number;
      status: LeadStatus;
      lostReason?: string;
      lostNotes?: string;
    }) => {
      return leadsApi.updateStatus(leadId, status, lostReason, lostNotes);
    },
    onSuccess: (res, vars) => {
      toast.success(`Lead moved to ${vars.status.replace('_', ' ').toUpperCase()}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics });
      if (selectedLead?.id === vars.leadId && res?.data) {
        setSelectedLead(res.data);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update status');
    },
    onSettled: () => {
      setPendingStatusLead(null);
    },
  });

  const handleRequestStatusChange = (lead: Lead, targetStatus: LeadStatus) => {
    if (targetStatus === 'lost') {
      setPendingStatusLead({ lead, targetStatus });
      return;
    }
    statusChangeMutation.mutate({ leadId: lead.id, status: targetStatus });
  };

  const executeStatusChange = async (
    lead: Lead,
    status: LeadStatus,
    lostReason?: string,
    lostNotes?: string
  ) => {
    await statusChangeMutation.mutateAsync({
      leadId: lead.id,
      status,
      lostReason,
      lostNotes,
    });
  };

  // Mutation 3: Schedule Follow-up
  const scheduleFollowUpMutation = useMutation({
    mutationFn: (values: ScheduleFollowUpValues) => followUpsApi.scheduleFollowUp(values),
    onSuccess: (_, vars) => {
      toast.success('Follow-up scheduled successfully!');
      setIsFollowUpModalOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.followUps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.timeline(vars.lead_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to schedule follow-up');
    },
  });

  // Mutation 4: Complete Follow-up
  const completeFollowUpMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: CompleteFollowUpValues }) =>
      followUpsApi.completeFollowUp(id, values),
    onSuccess: (_, vars) => {
      toast.success(
        vars.values.chain_next
          ? 'Follow-up marked complete & next chained!'
          : 'Follow-up completed!'
      );
      setCompletingFollowUp(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.followUps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to complete follow-up');
    },
  });

  // Mutation 5: Delete Lead
  const deleteLeadMutation = useMutation({
    mutationFn: (id: number) => leadsApi.deleteLead(id),
    onSuccess: () => {
      toast.success('Lead deleted successfully!');
      if (selectedLead?.id === deletingLead?.id) setSelectedLead(null);
      setDeletingLead(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete lead');
    },
  });

  // Mutation 6: Bulk Assign
  const bulkAssignMutation = useMutation({
    mutationFn: (agentId: number) => leadsApi.bulkAssign(selectedLeadIds, agentId),
    onSuccess: (res) => {
      toast.success(res.message || 'Leads reassigned successfully!');
      setIsBulkAssignOpen(false);
      setSelectedLeadIds([]);
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to bulk assign');
    },
  });

  // Mutation 7: Bulk Status
  const bulkStatusMutation = useMutation({
    mutationFn: (status: string) => leadsApi.bulkUpdateStatus(selectedLeadIds, status),
    onSuccess: (res) => {
      toast.success(res.message || 'Leads status updated successfully!');
      setIsBulkStatusOpen(false);
      setSelectedLeadIds([]);
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to bulk update status');
    },
  });

  return {
    viewMode,
    setViewMode,
    loading,
    leads,
    kanbanData,
    search,
    setSearch,
    selectedStatus,
    setSelectedStatus,
    selectedPriority,
    setSelectedPriority,
    selectedAgent,
    setSelectedAgent,
    selectedSegment,
    setSelectedSegment,
    selectedFollowupStatus,
    setSelectedFollowupStatus,
    metadata,
    selectedLead,
    setSelectedLead,
    timeline,
    followUps,
    drawerLoading,
    isCreateModalOpen,
    setIsCreateModalOpen,
    editingLead,
    setEditingLead,
    deletingLead,
    setDeletingLead,
    isFollowUpModalOpen,
    setIsFollowUpModalOpen,
    completingFollowUp,
    setCompletingFollowUp,
    pendingStatusLead,
    setPendingStatusLead,
    isImportModalOpen,
    setIsImportModalOpen,
    selectedLeadIds,
    setSelectedLeadIds,
    isBulkAssignOpen,
    setIsBulkAssignOpen,
    isBulkStatusOpen,
    setIsBulkStatusOpen,
    fetchData,
    openLeadDrawer,
    handleRequestStatusChange,
    executeStatusChange,
    handleSaveLead: async (values: LeadFormValues) => {
      await saveLeadMutation.mutateAsync(values);
    },
    handleScheduleFollowUp: async (values: ScheduleFollowUpValues) => {
      await scheduleFollowUpMutation.mutateAsync(values);
    },
    handleCompleteFollowUp: async (values: CompleteFollowUpValues) => {
      if (completingFollowUp) {
        await completeFollowUpMutation.mutateAsync({
          id: completingFollowUp.id,
          values,
        });
      }
    },
    handleDeleteLead: async () => {
      if (deletingLead) {
        await deleteLeadMutation.mutateAsync(deletingLead.id);
      }
    },
    handleBulkAssign: async (agentId: number) => {
      await bulkAssignMutation.mutateAsync(agentId);
    },
    handleBulkStatus: async (status: string) => {
      await bulkStatusMutation.mutateAsync(status);
    },
  };
}
