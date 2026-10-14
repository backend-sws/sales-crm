import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import type { LeadMetadata } from '@/types/lead.types';

interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  metadata: LeadMetadata;
  onConfirm: (agentId: number) => Promise<void>;
  loading?: boolean;
}

export function BulkAssignModal({
  isOpen,
  onClose,
  selectedCount,
  metadata,
  onConfirm,
  loading = false,
}: BulkAssignModalProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId) return;
    await onConfirm(parseInt(selectedAgentId, 10));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Reassign Leads"
      description={`Assign ${selectedCount} selected lead${selectedCount > 1 ? 's' : ''} to a sales agent`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
            Select Sales Agent
          </label>
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:bg-white dark:focus:bg-[#1a1a24] text-slate-900 dark:text-white outline-none"
            required
          >
            <option value="">Choose an agent...</option>
            {metadata.agents.map((ag) => (
              <option key={ag.id} value={ag.id}>
                {ag.name} ({ag.email})
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/5">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!selectedAgentId || loading}>
            {loading ? 'Reassigning...' : `Reassign ${selectedCount} Leads`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
