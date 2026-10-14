import React from 'react';
import { AlertCircle, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import type { FollowUpSummary } from '@/types/followUp.types';

interface FollowUpMetricTickerProps {
  summary: FollowUpSummary;
  activeTab: 'overdue' | 'today' | 'upcoming' | 'completed';
  onTabChange: (tab: 'overdue' | 'today' | 'upcoming' | 'completed') => void;
  loading?: boolean;
}

export function FollowUpMetricTicker({
  summary,
  activeTab,
  onTabChange,
  loading = false,
}: FollowUpMetricTickerProps) {
  const cards = [
    {
      id: 'overdue' as const,
      label: 'Overdue (Critical)',
      count: summary.overdue,
      icon: AlertCircle,
      accent: 'text-red-600 dark:text-red-400',
      bgActive: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 ring-2 ring-red-500/20',
      badgeBg: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
      pulse: summary.overdue > 0,
      description: 'Immediate action required',
    },
    {
      id: 'today' as const,
      label: "Today's Schedule",
      count: summary.today,
      icon: Clock,
      accent: 'text-amber-600 dark:text-amber-400',
      bgActive: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20',
      badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
      pulse: false,
      description: 'Scheduled for today',
    },
    {
      id: 'upcoming' as const,
      label: '7-Day Horizon',
      count: summary.upcoming,
      icon: Calendar,
      accent: 'text-indigo-600 dark:text-indigo-400',
      bgActive: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20',
      badgeBg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
      pulse: false,
      description: 'Upcoming touchpoints',
    },
    {
      id: 'completed' as const,
      label: 'Completed Today',
      count: summary.completed_today,
      icon: CheckCircle2,
      accent: 'text-emerald-600 dark:text-emerald-400',
      bgActive: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20',
      badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
      pulse: false,
      description: 'Logged & closed today',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {cards.map((c) => {
        const isSelected = activeTab === c.id;
        const Icon = c.icon;

        return (
          <button
            key={c.id}
            onClick={() => onTabChange(c.id)}
            disabled={loading}
            className={`p-3.5 md:p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
              isSelected
                ? c.bgActive
                : 'bg-white dark:bg-[#111116] border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                {c.label}
              </span>
              <div className="relative">
                <Icon className={`w-4 h-4 ${c.accent} transition-transform group-hover:scale-110`} />
                {c.pulse && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                )}
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {loading ? '...' : c.count}
              </span>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 hidden sm:inline">
                {c.description}
              </span>
            </div>

            {isSelected && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-current opacity-80" />
            )}
          </button>
        );
      })}
    </div>
  );
}
