import React from 'react';
import { Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FollowUp } from '@/types/followUp.types';

interface LeadFollowUpsTabProps {
  followUps: FollowUp[];
  onOpenSchedule: () => void;
  onOpenComplete: (followUp: FollowUp) => void;
}

export function LeadFollowUpsTab({
  followUps,
  onOpenSchedule,
  onOpenComplete,
}: LeadFollowUpsTabProps) {
  return (
    <div className="space-y-4">
      <Button
        onClick={onOpenSchedule}
        className="w-full h-9 rounded-xl text-xs gap-1.5 bg-primary-600 hover:bg-primary-700 text-white"
      >
        <Calendar className="w-3.5 h-3.5" />
        + Schedule Next Follow-up
      </Button>

      <div className="space-y-2.5">
        {followUps.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No follow-ups recorded yet.
          </div>
        ) : (
          followUps.map((fu) => (
            <div
              key={fu.id}
              className="bg-slate-50 dark:bg-white/5 p-3.5 rounded-2xl border border-slate-200 dark:border-white/5 text-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-white/10">
                  {fu.type}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    fu.status === 'done'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {fu.status.toUpperCase()}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Scheduled: {new Date(fu.scheduled_at).toLocaleString()}
              </div>

              {fu.outcome && (
                <div className="p-2 rounded-xl bg-white dark:bg-black/20 text-[11px] text-slate-700 dark:text-slate-300">
                  <b>Outcome:</b> {fu.outcome}
                </div>
              )}

              {fu.status === 'pending' && (
                <Button
                  size="sm"
                  onClick={() => onOpenComplete(fu)}
                  className="w-full h-8 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1 mt-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Mark Done &amp; Record Outcome
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
