import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, Flame, Zap, Snowflake } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '@/api/leads.api';
import { queryKeys } from '@/constants/queryKeys';
import type { LeadScoreBreakdown } from '@/types/lead.types';
import { toast } from 'sonner';
import ReactDOM from 'react-dom';

interface LeadScoreBadgeProps {
  score: number;
  leadId?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  interactive?: boolean;
}

export function LeadScoreBadge({
  score,
  leadId,
  size = 'sm',
  showLabel = false,
  interactive = true,
}: LeadScoreBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const [breakdown, setBreakdown] = useState<LeadScoreBreakdown | null>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  /** Calculate position so the portal floats near the badge without being clipped.
   *  Uses position:fixed so coords are always viewport-relative — no scroll offset needed. */
  const updatePosition = () => {
    if (!badgeRef.current) return;
    const rect = badgeRef.current.getBoundingClientRect();
    const POPOVER_W = 288; // w-72 = 18rem
    const spaceBelow = window.innerHeight - rect.bottom;

    // Default: open below the badge
    let top = rect.bottom + 8;
    let left = rect.left;
    let transform: string | undefined;

    // Flip above the badge when there is not enough space below
    if (spaceBelow < 280) {
      top = rect.top - 8;
      transform = 'translateY(-100%)';
    }

    // Prevent the popover from overflowing the right edge of the viewport
    if (left + POPOVER_W > window.innerWidth - 8) {
      left = Math.max(8, rect.right - POPOVER_W);
    }

    setPopoverStyle({ position: 'fixed', top, left, zIndex: 9999, ...(transform ? { transform } : {}) });
  };

  // Close on outside click or any scroll
  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        badgeRef.current && !badgeRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const onScroll = () => setIsOpen(false);
    if (isOpen) {
      document.addEventListener('mousedown', onOutside);
      window.addEventListener('scroll', onScroll, true);
    }
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [isOpen]);

  const recalculateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await leadsApi.recalculateScore(id);
      return res.data;
    },
    onSuccess: (data) => {
      setBreakdown(data);
      toast.success(`Score refreshed: ${data.score} (${data.grade.toUpperCase()})`);
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics });
    },
    onError: () => {
      toast.error('Failed to recalculate lead score');
    },
  });

  const handleOpenBreakdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!interactive || !leadId) return;
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
      if (!breakdown) recalculateMutation.mutate(leadId);
    } else {
      setIsOpen(false);
    }
  };

  const getTier = (s: number) => {
    if (s >= 80) return {
      label: 'Hot Deal', icon: Flame,
      badgeBg: 'bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300',
      dot: 'bg-amber-500 animate-pulse',
    };
    if (s >= 50) return {
      label: 'Warm Intent', icon: Zap,
      badgeBg: 'bg-indigo-500/10 border-indigo-500/25 text-indigo-700 dark:text-indigo-300',
      dot: 'bg-indigo-500',
    };
    if (s >= 25) return {
      label: 'Cool / Normal', icon: Snowflake,
      badgeBg: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300',
      dot: 'bg-blue-400',
    };
    return {
      label: 'Cold / At-Risk', icon: AlertTriangle,
      badgeBg: 'bg-red-500/10 border-red-500/25 text-red-700 dark:text-red-300',
      dot: 'bg-red-500',
    };
  };

  const tier = getTier(score);

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[9px] gap-1',
    sm: 'px-2 py-0.5 text-[10px] gap-1.5 font-bold',
    md: 'px-2.5 py-1 text-xs gap-1.5 font-bold',
    lg: 'px-3 py-1.5 text-sm gap-2 font-black',
  };

  /** Popover rendered via portal to document.body — escapes overflow:hidden Kanban columns */
  const portalPopover = isOpen
    ? ReactDOM.createPortal(
        <div
          ref={popoverRef}
          style={popoverStyle}
          onClick={(e) => e.stopPropagation()}
          className="w-72 p-4 bg-white dark:bg-[#121217] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl text-left"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Intelligence Score: {score}/100
              </span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); leadId && recalculateMutation.mutate(leadId); }}
              disabled={recalculateMutation.isPending}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              title="Recalculate now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recalculateMutation.isPending ? 'animate-spin text-primary-500' : ''}`} />
            </button>
          </div>

          {/* Factors */}
          <div className="py-2.5 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
            {recalculateMutation.isPending && !breakdown ? (
              <p className="text-xs text-slate-400 py-3 text-center">Calculating factor weights...</p>
            ) : breakdown?.factors && breakdown.factors.length > 0 ? (
              breakdown.factors.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-300 truncate pr-2">{f.label}</span>
                  <span className={`font-mono font-bold shrink-0 ${f.points > 0 ? 'text-emerald-600 dark:text-emerald-400' : f.points < 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-400'}`}>
                    {f.points > 0 ? `+${f.points}` : f.points}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">
                Click refresh to fetch detailed points breakdown.
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Tier: <strong className="text-slate-700 dark:text-slate-200 capitalize">{tier.label}</strong></span>
            <span className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold">Dynamic Engine</span>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="relative inline-block" ref={badgeRef}>
      <button
        type="button"
        onClick={handleOpenBreakdown}
        disabled={!interactive || !leadId}
        className={`inline-flex items-center rounded-lg border font-mono tracking-tight transition-all select-none ${tier.badgeBg} ${sizeClasses[size]} ${interactive && leadId ? 'cursor-pointer hover:scale-105 hover:shadow-xs' : 'cursor-default'}`}
        title={interactive && leadId ? 'Click to inspect score factors' : `Score: ${score}/100`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${tier.dot}`} />
        <span className="font-extrabold">{score}</span>
        {showLabel && <span className="font-sans font-medium opacity-90 truncate">{tier.label}</span>}
      </button>

      {portalPopover}
    </div>
  );
}