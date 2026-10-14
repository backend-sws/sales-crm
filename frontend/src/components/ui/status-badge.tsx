import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, Ban, Clock, AlertCircle, TrendingUp, XCircle, FileText, Phone } from 'lucide-react';

export type StatusType = 
  | 'active' | 'suspended' | 'pending' | 'draft' 
  | 'new' | 'contacted' | 'converted' | 'lost'
  | 'default';

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  active: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20', icon: <CheckCircle className="w-3 h-3" /> },
  converted: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20', icon: <TrendingUp className="w-3 h-3" /> },
  suspended: { color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-rose-200 dark:border-rose-500/20', icon: <Ban className="w-3 h-3" /> },
  lost: { color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-rose-200 dark:border-rose-500/20', icon: <XCircle className="w-3 h-3" /> },
  pending: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-500/20', icon: <Clock className="w-3 h-3" /> },
  contacted: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border-blue-200 dark:border-blue-500/20', icon: <Phone className="w-3 h-3" /> },
  new: { color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20', icon: <AlertCircle className="w-3 h-3" /> },
  draft: { color: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300 border-slate-200 dark:border-white/10', icon: <FileText className="w-3 h-3" /> },
  default: { color: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300 border-slate-200 dark:border-white/10', icon: null },
};

export function StatusBadge({ status, label, className, showIcon = true }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  const config = statusConfig[normalizedStatus] || statusConfig.default;
  
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border",
      config.color,
      className
    )}>
      {showIcon && config.icon && <span className="mr-1">{config.icon}</span>}
      {label || status}
    </span>
  );
}
