import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { lostReasonSchema, type LostReasonValues } from '@/schemas/lead.schema';
import { LOST_REASONS } from '@/constants/crm.constants';
import type { Lead } from '@/types/lead.types';

interface LostReasonModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (lostReason: string, lostNotes?: string) => Promise<void>;
  loading?: boolean;
}

export function LostReasonModal({
  lead,
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}: LostReasonModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LostReasonValues>({
    resolver: zodResolver(lostReasonSchema) as any,
    defaultValues: {
      lost_reason: LOST_REASONS[0],
      lost_notes: '',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      reset({
        lost_reason: LOST_REASONS[0],
        lost_notes: '',
      });
    }
  }, [isOpen, reset]);

  const onSubmit = (data: LostReasonValues) => {
    onConfirm(data.lost_reason, data.lost_notes);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reason for Marking Lead as Lost"
      description={`Enterprise CRM requirement: Log lost reasons for ${lead?.company || lead?.name || 'this lead'} to track competitive insights.`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
        <div className="space-y-1">
          <label className="font-semibold text-slate-700 dark:text-slate-300">
            Primary Reason *
          </label>
          <select
            {...register('lost_reason')}
            className="w-full h-10 px-3 rounded-md bg-transparent border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200"
          >
            {LOST_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {errors.lost_reason && (
            <p className="text-[10px] text-red-500">{errors.lost_reason.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-slate-700 dark:text-slate-300">
            Additional Remarks
          </label>
          <Textarea
            rows={3}
            {...register('lost_notes')}
            placeholder="Competitor chosen, price offered, or reason for rejection..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold"
          >
            {loading ? 'Updating...' : 'Confirm Move to Lost'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
