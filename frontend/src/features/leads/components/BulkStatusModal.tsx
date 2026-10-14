import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { PIPELINE_STAGES } from '@/constants/crm.constants';

interface BulkStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onConfirm: (status: string) => Promise<void>;
  loading?: boolean;
}

export function BulkStatusModal({
  isOpen,
  onClose,
  selectedCount,
  onConfirm,
  loading = false,
}: BulkStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('contacted');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus) return;
    await onConfirm(selectedStatus);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Stage Transition"
      description={`Move ${selectedCount} selected lead${selectedCount > 1 ? 's' : ''} to a new pipeline stage`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
            Target Pipeline Stage
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:bg-white dark:focus:bg-[#1a1a24] text-slate-900 dark:text-white outline-none"
          >
            {PIPELINE_STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/5">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!selectedStatus || loading}>
            {loading ? 'Updating...' : `Move ${selectedCount} Leads`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
