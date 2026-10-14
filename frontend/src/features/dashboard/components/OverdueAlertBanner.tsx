import React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FollowUp } from '@/types/followUp.types';

interface OverdueAlertBannerProps {
  overdueFollowUps: FollowUp[];
  onReview: () => void;
}

export function OverdueAlertBanner({ overdueFollowUps, onReview }: OverdueAlertBannerProps) {
  if (overdueFollowUps.length === 0) return null;

  return (
    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-500/30">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-red-900 dark:text-red-200">
            Action Required: {overdueFollowUps.length} Overdue Follow-up{overdueFollowUps.length > 1 ? 's' : ''}!
          </h3>
          <p className="text-[11px] text-red-700 dark:text-red-300 mt-0.5">
            These leads require immediate contact to prevent deal slippage.
          </p>
        </div>
      </div>
      <Button
        size="sm"
        onClick={onReview}
        className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md shrink-0"
      >
        Review Leads <ArrowRight className="w-3.5 h-3.5 ml-1" />
      </Button>
    </div>
  );
}
