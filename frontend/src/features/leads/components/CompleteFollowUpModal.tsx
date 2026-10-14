import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { completeFollowUpSchema, type CompleteFollowUpValues } from '@/schemas/followUp.schema';
import { FOLLOW_UP_CHANNELS } from '@/constants/crm.constants';
import type { FollowUp } from '@/types/followUp.types';

interface CompleteFollowUpModalProps {
  followUp: FollowUp | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: CompleteFollowUpValues) => Promise<void>;
  loading?: boolean;
}

export function CompleteFollowUpModal({
  followUp,
  isOpen,
  onClose,
  onComplete,
  loading = false,
}: CompleteFollowUpModalProps) {
  const threeDaysLater = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CompleteFollowUpValues>({
    resolver: zodResolver(completeFollowUpSchema) as any,
    defaultValues: {
      outcome: '',
      chain_next: true,
      next_type: 'call',
      next_scheduled_at: threeDaysLater,
    },
  });

  const chainNext = watch('chain_next');
  const nextType = watch('next_type');

  React.useEffect(() => {
    if (isOpen) {
      reset({
        outcome: '',
        chain_next: true,
        next_type: 'call',
        next_scheduled_at: threeDaysLater,
      });
    }
  }, [isOpen, reset, threeDaysLater]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Follow-up &amp; Record Outcome"
      description="Mandatory discussion notes ensure full team accountability."
    >
      <form onSubmit={handleSubmit(onComplete)} className="space-y-4 text-xs">
        <div className="space-y-1">
          <label className="font-semibold text-slate-700 dark:text-slate-300">
            Discussion Outcome *
          </label>
          <Textarea
            rows={3}
            {...register('outcome')}
            placeholder="Key discussion points, objections, next milestone agreed upon..."
          />
          {errors.outcome && <p className="text-[10px] text-red-500">{errors.outcome.message}</p>}
        </div>

        {/* Chained Follow-up toggle */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
            <input type="checkbox" {...register('chain_next')} className="rounded" />
            <span>Chain Next Follow-up (Best practice)</span>
          </label>

          {chainNext && (
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/5">
              <div className="space-y-1">
                <label className="text-slate-500 font-medium">Next Channel</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {FOLLOW_UP_CHANNELS.map((ch) => (
                    <button
                      key={ch.key}
                      type="button"
                      onClick={() => setValue('next_type', ch.key)}
                      className={`py-1.5 px-2 rounded-lg border font-bold capitalize text-center text-[11px] ${
                        nextType === ch.key
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-medium">Next Scheduled Date &amp; Time *</label>
                <Input type="datetime-local" {...register('next_scheduled_at')} />
                {errors.next_scheduled_at && (
                  <p className="text-[10px] text-red-500">{errors.next_scheduled_at.message}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {loading ? 'Saving...' : 'Save & Complete'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
