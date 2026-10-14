import React from 'react';
import type { LeadActivity } from '@/types/lead.types';

interface LeadTimelineTabProps {
  timeline: LeadActivity[];
}

export function LeadTimelineTab({ timeline }: LeadTimelineTabProps) {
  if (timeline.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        No activity logs recorded yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10">
      {timeline.map((act) => (
        <div key={act.id} className="relative group">
          <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-primary-500 ring-4 ring-white dark:ring-[#111115]" />
          <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-200 dark:border-white/5 text-xs">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-semibold uppercase text-primary-600 dark:text-primary-400">
                {act.type.replace('_', ' ')}
              </span>
              <span>{new Date(act.created_at).toLocaleString()}</span>
            </div>
            {act.payload && (
              <div className="mt-1 text-slate-700 dark:text-slate-300">
                {act.payload.old_status && (
                  <span>
                    Stage changed from <b>{act.payload.old_status}</b> to <b>{act.payload.new_status}</b>
                  </span>
                )}
                {act.payload.outcome && (
                  <p className="italic text-slate-500 dark:text-slate-400 mt-0.5">
                    "{act.payload.outcome}"
                  </p>
                )}
                {act.payload.message && <span>{act.payload.message}</span>}
                {act.payload.to && <span>Assigned to {act.payload.to}</span>}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
