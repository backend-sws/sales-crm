import React, { useState, useEffect } from 'react';
import { Calendar, Layers, Clock, ArrowRight, User as UserIcon, CheckCircle2 } from 'lucide-react';
import { projectsApi } from '@/api/projects.api';

interface GanttItem {
  id: string;
  type: 'milestone' | 'task';
  name: string;
  start: string;
  end: string;
  progress: number;
  status: string;
  priority?: string;
  assignee?: string;
  dependencies: string[];
}

interface GanttChartViewProps {
  projectId: number;
}

export function GanttChartView({ projectId }: GanttChartViewProps) {
  const [items, setItems] = useState<GanttItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGantt();
  }, [projectId]);

  const loadGantt = async () => {
    try {
      setLoading(true);
      const res = await projectsApi.getGanttData(projectId);
      setItems(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-72 flex items-center justify-center text-xs text-slate-400">
        Loading Gantt timeline...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#121217] rounded-3xl border border-slate-200/80 dark:border-white/10 text-slate-400 text-xs">
        No milestones or tasks available for Gantt timeline view.
      </div>
    );
  }

  // Calculate timeline bounds
  const dates = items.flatMap((i) => [new Date(i.start).getTime(), new Date(i.end).getTime()]);
  const minTime = Math.min(...dates);
  const maxTime = Math.max(...dates);
  const timeSpan = Math.max(86400000 * 7, maxTime - minTime + 86400000); // at least 7 days

  const getPositionPercent = (dateStr: string) => {
    const time = new Date(dateStr).getTime();
    return Math.max(0, Math.min(100, ((time - minTime) / timeSpan) * 100));
  };

  const getStatusColor = (status: string, isMilestone: boolean) => {
    if (isMilestone) {
      return status === 'completed' || status === 'invoiced'
        ? 'bg-amber-500 text-amber-500'
        : 'bg-slate-400 text-slate-400';
    }
    switch (status) {
      case 'done':
        return 'bg-emerald-500 text-emerald-500';
      case 'client_review':
        return 'bg-amber-500 text-amber-500';
      case 'qa':
        return 'bg-purple-500 text-purple-500';
      case 'in_progress':
        return 'bg-blue-500 text-blue-500';
      default:
        return 'bg-slate-400 text-slate-400';
    }
  };

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary-500" />
            Project Gantt &amp; Dependency Timeline
          </h4>
          <p className="text-xs text-slate-400">
            Timeline schedule showing critical milestones, task durations, and blocking dependencies
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
            <span>◆</span> Milestone
          </span>
          <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> In Progress
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Done
          </span>
        </div>
      </div>

      {/* Gantt Timeline Container */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px] space-y-3">
          {/* Timeline Header Date Bounds */}
          <div className="flex justify-between text-[10px] text-slate-400 font-mono px-44 pb-1 border-b border-slate-100 dark:border-white/5">
            <span>{new Date(minTime).toLocaleDateString()}</span>
            <span>TIMELINE AXIS</span>
            <span>{new Date(maxTime).toLocaleDateString()}</span>
          </div>

          {/* Rows */}
          {items.map((item) => {
            const isMilestone = item.type === 'milestone';
            const leftPercent = getPositionPercent(item.start);
            const rightPercent = getPositionPercent(item.end);
            const widthPercent = isMilestone ? 2 : Math.max(4, rightPercent - leftPercent);

            return (
              <div key={item.id} className="flex items-center gap-3 text-xs py-1 group hover:bg-slate-50 dark:hover:bg-white/[0.02] rounded-xl px-2">
                {/* Left label: Name & Assignee */}
                <div className="w-44 shrink-0 truncate">
                  <div className={`font-semibold truncate ${isMilestone ? 'font-bold text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {item.name}
                  </div>
                  {!isMilestone && (
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <UserIcon className="w-2.5 h-2.5" />
                      <span>{item.assignee || 'Unassigned'}</span>
                      {item.dependencies.length > 0 && (
                        <span className="text-red-500 font-bold ml-1">
                          [Dep: {item.dependencies.length}]
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Timeline Bar Area */}
                <div className="flex-1 relative h-7 bg-slate-100 dark:bg-white/5 rounded-xl overflow-hidden">
                  {isMilestone ? (
                    // Diamond Milestone Marker
                    <div
                      style={{ left: `${leftPercent}%` }}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-amber-500 shadow-md ring-2 ring-white dark:ring-[#121217]"
                      title={`${item.name} (${item.start})`}
                    />
                  ) : (
                    // Task Duration Bar with Progress Fill
                    <div
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                      }}
                      className={`absolute top-1.5 bottom-1.5 rounded-lg shadow-xs overflow-hidden transition-all group-hover:brightness-110 ${
                        item.status === 'done'
                          ? 'bg-emerald-500'
                          : item.status === 'client_review'
                          ? 'bg-amber-500'
                          : item.status === 'qa'
                          ? 'bg-purple-500'
                          : item.status === 'in_progress'
                          ? 'bg-blue-500'
                          : 'bg-slate-400'
                      }`}
                      title={`${item.name} (${item.progress}% complete, ${item.start} → ${item.end})`}
                    >
                      {/* Inner Progress overlay */}
                      <div
                        style={{ width: `${item.progress}%` }}
                        className="h-full bg-white/25 rounded-l-lg"
                      />
                    </div>
                  )}
                </div>

                {/* Right Progress % */}
                <div className="w-12 text-right text-[11px] font-mono font-bold text-slate-500 shrink-0">
                  {isMilestone ? '◆' : `${item.progress}%`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
