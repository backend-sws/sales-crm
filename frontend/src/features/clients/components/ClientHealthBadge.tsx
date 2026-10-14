import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';
import type { ClientHealthScore } from '@/api/clients.api';

interface ClientHealthBadgeProps {
  health?: ClientHealthScore | null;
  score?: number;
  status?: 'healthy' | 'at_risk' | 'churning';
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

export function ClientHealthBadge({
  health,
  score: explicitScore,
  status: explicitStatus,
  size = 'md',
  showScore = true,
}: ClientHealthBadgeProps) {
  const currentStatus = explicitStatus || health?.status;
  const currentScore = explicitScore !== undefined ? Math.round(explicitScore) : (health ? Math.round(health.score) : null);

  if (!currentStatus || currentScore === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-white/5 text-slate-500 border border-slate-200 dark:border-white/10">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        Unrated
      </span>
    );
  }

  const sizeClasses =
    size === 'sm'
      ? 'text-[10px] px-2 py-0.5 gap-1'
      : size === 'lg'
      ? 'text-xs px-3 py-1 gap-2'
      : 'text-[11px] px-2.5 py-0.5 gap-1.5';

  if (currentStatus === 'healthy') {
    return (
      <span className={`inline-flex items-center rounded-full font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shadow-xs ${sizeClasses}`}>
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Healthy</span>
        {showScore && <span className="font-mono opacity-80">({currentScore}%)</span>}
      </span>
    );
  }

  if (currentStatus === 'at_risk') {
    return (
      <span className={`inline-flex items-center rounded-full font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shadow-xs animate-pulse ${sizeClasses}`}>
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        <span>At Risk</span>
        {showScore && <span className="font-mono opacity-80">({currentScore}%)</span>}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-full font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 shadow-xs ${sizeClasses}`}>
      <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
      <span>Churning</span>
      {showScore && <span className="font-mono opacity-80">({currentScore}%)</span>}
    </span>
  );
}
