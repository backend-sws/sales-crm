import React from 'react';
import type { Lead, LeadStatus, KanbanBoardData } from '@/types/lead.types';
import { PIPELINE_STAGES } from '@/constants/crm.constants';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  kanbanData: Partial<KanbanBoardData>;
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (lead: Lead, newStatus: LeadStatus) => void;
}

export function KanbanBoard({
  kanbanData,
  onLeadClick,
  onStatusChange,
}: KanbanBoardProps) {
  return (
    <div className="flex gap-3.5 items-start overflow-x-auto pb-6 pt-1 w-full min-h-[calc(100vh-230px)] select-none">
      {PIPELINE_STAGES.map((stage) => {
        const stageLeads = kanbanData[stage.key] || [];
        return (
          <KanbanColumn
            key={stage.key}
            stage={stage}
            leads={stageLeads}
            onLeadClick={onLeadClick}
            onStatusChange={onStatusChange}
          />
        );
      })}
    </div>
  );
}
