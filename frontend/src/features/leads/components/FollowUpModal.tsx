import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { scheduleFollowUpSchema, type ScheduleFollowUpValues } from '@/schemas/followUp.schema';
import { FOLLOW_UP_CHANNELS } from '@/constants/crm.constants';
import type { Lead } from '@/types/lead.types';

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSchedule: (data: ScheduleFollowUpValues) => Promise<void>;
  loading?: boolean;
}

export function FollowUpModal({
  isOpen,
  onClose,
  lead,
  onSchedule,
  loading = false,
}: FollowUpModalProps) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 16);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ScheduleFollowUpValues>({
    resolver: zodResolver(scheduleFollowUpSchema) as any,
    defaultValues: {
      lead_id: lead?.id || 0,
      type: 'call',
      scheduled_at: tomorrow,
    },
  });

  const selectedType = watch('type');

  React.useEffect(() => {
    if (lead) {
      setValue('lead_id', lead.id);
    }
  }, [lead, setValue]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Follow-up"
      description={`Set a date, time, and communication channel for ${lead?.company || lead?.name || 'lead'}.`}
    >
      <form onSubmit={handleSubmit(onSchedule)} className="space-y-4 text-xs">
        <div className="space-y-1">
          <label className="font-semibold text-slate-700 dark:text-slate-300">
            Follow-up Channel
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FOLLOW_UP_CHANNELS.map((ch) => (
              <button
                key={ch.key}
                type="button"
                onClick={() => setValue('type', ch.key)}
                className={`py-2 px-3 rounded-xl border font-bold capitalize text-center transition-all ${
                  selectedType === ch.key
                    ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                    : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>
          {errors.type && <p className="text-[10px] text-red-500">{errors.type.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-slate-700 dark:text-slate-300">
            Scheduled Date &amp; Time *
          </label>
          <Input type="datetime-local" {...register('scheduled_at')} />
          {errors.scheduled_at && (
            <p className="text-[10px] text-red-500">{errors.scheduled_at.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold"
          >
            {loading ? 'Scheduling...' : 'Confirm Schedule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
