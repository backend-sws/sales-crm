import React from 'react';
import { PhoneCall, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FollowUp } from '@/types/followUp.types';

interface TodayFollowUpsCardProps {
  todayFollowUps: FollowUp[];
  onCompleteClick: (followUp: FollowUp) => void;
}

export function TodayFollowUpsCard({
  todayFollowUps,
  onCompleteClick,
}: TodayFollowUpsCardProps) {
  return (
    <div className="bg-white dark:bg-[#121217] rounded-3xl border border-slate-200 dark:border-white/10 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PhoneCall className="w-4 h-4 text-primary-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Today's Action Items ({todayFollowUps.length})
          </h2>
        </div>
      </div>

      <div className="space-y-2.5 max-h-[290px] overflow-y-auto custom-scrollbar">
        {todayFollowUps.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-60" />
            All scheduled follow-ups for today are clear!
          </div>
        ) : (
          todayFollowUps.map((fu) => (
            <div
              key={fu.id}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-white truncate">
                  {fu.lead?.company || fu.lead?.name || 'Lead'}
                </span>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-600 dark:text-primary-400">
                  {fu.type}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(fu.scheduled_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {fu.lead?.phone && <span className="font-mono text-[10px]">{fu.lead.phone}</span>}
              </div>

              <Button
                size="sm"
                onClick={() => onCompleteClick(fu)}
                className="w-full h-7 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1 mt-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                Complete &amp; Note Outcome
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
