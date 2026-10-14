import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeads } from '@/features/leads/hooks/useLeads';
import {
  LeadsFilterBar,
  KanbanBoard,
  LeadsTable,
  BulkActionToolbar,
  LeadDetailDrawer,
  LeadModal,
  FollowUpModal,
  CompleteFollowUpModal,
  LostReasonModal,
  ImportWizardModal,
  BulkAssignModal,
  BulkStatusModal,
  MergeLeadModal,
} from '@/features/leads/components';
import { ConvertLeadModal } from '@/features/clients/components';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { leadsApi } from '@/api/leads.api';
import type { Lead } from '@/types/lead.types';

export default function LeadsPage() {
  const navigate = useNavigate();
  const {
    viewMode,
    setViewMode,
    loading,
    leads,
    kanbanData,
    search,
    setSearch,
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
    handleSaveLead,
    handleScheduleFollowUp,
    handleCompleteFollowUp,
    handleDeleteLead,
    handleBulkAssign,
    handleBulkStatus,
  } = useLeads();

  // Selected leads for merge
  const [mergingLeads, setMergingLeads] = useState<{ leadA: Lead; leadB: Lead } | null>(null);

  // Selected lead for Phase 3 client conversion
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);

  // Selection handlers for table view
  const handleSelectLead = (id: number, selected: boolean) => {
    setSelectedLeadIds((prev) =>
      selected ? [...prev, id] : prev.filter((leadId) => leadId !== id)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedLeadIds(selected ? leads.map((l) => l.id) : []);
  };

  const handleOpenBulkMerge = () => {
    if (selectedLeadIds.length === 2) {
      const leadA = leads.find((l) => l.id === selectedLeadIds[0]);
      const leadB = leads.find((l) => l.id === selectedLeadIds[1]);
      if (leadA && leadB) {
        setMergingLeads({ leadA, leadB });
      }
    }
  };

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">
      {/* Search, Filter & Action Toolbar */}
      <LeadsFilterBar
        search={search}
        onSearchChange={setSearch}
        priority={selectedPriority}
        onPriorityChange={setSelectedPriority}
        agent={selectedAgent}
        onAgentChange={setSelectedAgent}
        segment={selectedSegment}
        onSegmentChange={setSelectedSegment}
        followupStatus={selectedFollowupStatus}
        onFollowupStatusChange={setSelectedFollowupStatus}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        metadata={metadata}
        loading={loading}
        onRefresh={fetchData}
        onOpenCreate={() => {
          setEditingLead(null);
          setIsCreateModalOpen(true);
        }}
        onOpenImport={() => setIsImportModalOpen(true)}
      />

      {/* Main View: Kanban or Table */}
      {viewMode === 'kanban' ? (
        <KanbanBoard
          kanbanData={kanbanData}
          onLeadClick={openLeadDrawer}
          onStatusChange={handleRequestStatusChange}
        />
      ) : (
        <LeadsTable
          leads={leads}
          selectedLeadIds={selectedLeadIds}
          onSelectLead={handleSelectLead}
          onSelectAll={handleSelectAll}
          onLeadClick={openLeadDrawer}
          onEditLead={(lead) => {
            setEditingLead(lead);
            setIsCreateModalOpen(true);
          }}
          onDeleteLead={(lead) => setDeletingLead(lead)}
          onStatusChange={handleRequestStatusChange}
        />
      )}

      {/* Floating Bulk Action Bar */}
      <BulkActionToolbar
        selectedCount={selectedLeadIds.length}
        onOpenReassign={() => setIsBulkAssignOpen(true)}
        onOpenChangeStage={() => setIsBulkStatusOpen(true)}
        onOpenMerge={handleOpenBulkMerge}
        onClearSelection={() => setSelectedLeadIds([])}
      />

      {/* Slide-over Lead Detail Drawer */}
      <LeadDetailDrawer
        lead={selectedLead}
        isOpen={Boolean(selectedLead)}
        onClose={() => setSelectedLead(null)}
        timeline={timeline}
        followUps={followUps}
        loading={drawerLoading}
        onStatusChange={handleRequestStatusChange}
        onOpenSchedule={() => setIsFollowUpModalOpen(true)}
        onOpenComplete={(item) => setCompletingFollowUp(item)}
        onOpenMerge={(leadA, leadB) => setMergingLeads({ leadA, leadB })}
        onConvertLead={(lead) => setConvertingLead(lead)}
        onEditLead={(lead) => {
          setEditingLead(lead);
          setIsCreateModalOpen(true);
        }}
        onDeleteLead={(lead) => setDeletingLead(lead)}
        onLeadUpdated={(updated) => {
          setSelectedLead(updated);
          fetchData();
        }}
      />

      {/* Create / Edit Lead Modal */}
      <LeadModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingLead(null);
        }}
        editingLead={editingLead}
        metadata={metadata}
        onSave={handleSaveLead}
      />

      {/* Schedule Follow-up Modal */}
      <FollowUpModal
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        lead={selectedLead}
        onSchedule={handleScheduleFollowUp}
      />

      {/* Complete Follow-up & Chain Modal */}
      <CompleteFollowUpModal
        isOpen={Boolean(completingFollowUp)}
        onClose={() => setCompletingFollowUp(null)}
        followUp={completingFollowUp}
        onComplete={handleCompleteFollowUp}
      />

      {/* Required Lost Reason Modal */}
      <LostReasonModal
        isOpen={Boolean(pendingStatusLead)}
        onClose={() => setPendingStatusLead(null)}
        lead={pendingStatusLead?.lead || null}
        onConfirm={async (reason, notes) => {
          if (pendingStatusLead) {
            await executeStatusChange(pendingStatusLead.lead, 'lost', reason, notes);
          }
        }}
      />

      {/* CSV Import Wizard Modal */}
      <ImportWizardModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        metadata={metadata}
        onPreview={(file) => leadsApi.previewImport(file)}
        onExecute={(payload) => leadsApi.processImport(payload)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          fetchData();
        }}
      />

      {/* Bulk Reassign Modal */}
      <BulkAssignModal
        isOpen={isBulkAssignOpen}
        onClose={() => setIsBulkAssignOpen(false)}
        selectedCount={selectedLeadIds.length}
        metadata={metadata}
        onConfirm={handleBulkAssign}
      />

      {/* Bulk Status Modal */}
      <BulkStatusModal
        isOpen={isBulkStatusOpen}
        onClose={() => setIsBulkStatusOpen(false)}
        selectedCount={selectedLeadIds.length}
        onConfirm={handleBulkStatus}
      />

      {/* Merge Leads Modal */}
      <MergeLeadModal
        isOpen={Boolean(mergingLeads)}
        onClose={() => setMergingLeads(null)}
        leadA={mergingLeads?.leadA || null}
        leadB={mergingLeads?.leadB || null}
        onMerged={(master) => {
          setMergingLeads(null);
          setSelectedLeadIds([]);
          fetchData();
          if (selectedLead?.id === master.id || selectedLead?.id === mergingLeads?.leadB.id) {
            setSelectedLead(master);
          }
        }}
      />

      {/* Convert Won Lead to Client Modal */}
      <ConvertLeadModal
        isOpen={Boolean(convertingLead)}
        onClose={() => setConvertingLead(null)}
        lead={convertingLead}
        onSuccess={(client) => {
          setConvertingLead(null);
          fetchData();
          navigate(`/clients/${client.id}`);
        }}
      />

      {/* Delete Lead Confirmation */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingLead)}
        onClose={() => setDeletingLead(null)}
        onConfirm={handleDeleteLead}
        title="Delete Lead"
        description="Are you sure you want to delete this lead? This action can be reversed by an administrator."
        itemName={deletingLead?.name}
      />
    </div>
  );
}
