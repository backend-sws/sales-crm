import React, { isValidElement, type ElementType, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './card';

interface StatCardProps {
  title?: string;
  label?: string; // Fallback for newer implementation
  value: string | number;
  subtitle?: string;
  subtext?: string; // Fallback for newer implementation
  /** Lucide icon component reference OR a pre-rendered ReactNode */
  icon: ElementType | ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
  color?: string; // Support for dynamic colors from UsersPage
}

function isElementType(icon: any): icon is ElementType {
  if (!icon) return false;
  if (isValidElement(icon)) return false;
  return typeof icon === 'function' || typeof icon === 'object';
}

export function StatCard({
  title,
  label,
  value,
  subtitle,
  subtext,
  icon,
  trend,
  isActive,
  onClick,
  className,
  color
}: StatCardProps) {
  const displayTitle = title || label || '';
  const displaySubtitle = subtitle || subtext;

  return (
    <Card 
      className={cn(
        "transition-all duration-300 relative overflow-hidden group bg-white dark:bg-[#111115] border border-slate-200/60 dark:border-white/5 rounded-xl shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] hover:shadow-md hover:border-primary-500/20", 
        onClick && "cursor-pointer hover:-translate-y-0.5",
        isActive && "ring-2 ring-primary-500 border-primary-500",
        className
      )}
      onClick={onClick}
    >
      {/* Dynamic top bar accent on hover */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary-400/30 via-primary-500 to-primary-600/30 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>

      {/* Subtle backdrop mesh gradient glow */}
      <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-primary-500/5 dark:bg-primary-500/10 rounded-full blur-2xl group-hover:bg-primary-500/10 dark:group-hover:bg-primary-500/15 transition-all duration-500"></div>

      <CardContent className="p-4 relative z-10 flex flex-col justify-between h-full min-h-[110px]">
        <div>
          {/* Header Line */}
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-zinc-500 select-none truncate pr-2">
              {displayTitle}
            </span>
            <div className={cn(
              "p-2 rounded-lg transition-all duration-300 flex items-center justify-center shrink-0",
              color ? color : (
                isActive 
                  ? "bg-primary-500 text-white shadow-md shadow-primary-500/20" 
                  : "bg-primary-50/70 dark:bg-primary-500/5 text-primary-500 dark:text-primary-400 group-hover:scale-105 group-hover:bg-primary-100/70 dark:group-hover:bg-primary-500/10"
              )
            )}>
              {isElementType(icon) ? (() => { const Icon = icon as ElementType; return <Icon className="w-4 h-4" />; })() : (
                isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' }) : icon
              )}
            </div>
          </div>

          {/* Value Line */}
          <div className="flex items-baseline">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-display">
              {value}
            </span>
          </div>
        </div>

        {/* Footer Line (Trend / Subtitle) */}
        {(trend || displaySubtitle) && (
          <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
            {trend ? (
              <span className={cn(
                "text-[10px] font-bold tracking-wide flex items-center gap-0.5",
                trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            ) : displaySubtitle ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 truncate" title={displaySubtitle}>
                {displaySubtitle}
              </span>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
