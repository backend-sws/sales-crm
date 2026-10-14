import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center min-h-[300px]", className)}>
      <div className="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-500/10 border border-primary-100/30 dark:border-primary-500/20 flex items-center justify-center text-primary-500 dark:text-primary-400 mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
