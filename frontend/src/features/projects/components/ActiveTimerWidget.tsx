import React, { useState, useEffect } from 'react';
import { Square, Clock } from 'lucide-react';
import { projectsApi, type TimeEntryItem } from '@/api/projects.api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function ActiveTimerWidget() {
  const [activeTimer, setActiveTimer] = useState<TimeEntryItem | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopNotes, setStopNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Poll or check active timer on mount
  const checkActiveTimer = async () => {
    try {
      const res = await projectsApi.getActiveTimer();
      if (res.data) {
        setActiveTimer(res.data);
        const started = new Date(res.data.started_at).getTime();
        const now = new Date().getTime();
        setElapsedSeconds(Math.max(0, Math.floor((now - started) / 1000)));
      } else {
        setActiveTimer(null);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    checkActiveTimer();
    const interval = setInterval(checkActiveTimer, 30000); // sync every 30s
    return () => clearInterval(interval);
  }, []);

  // Ticking stopwatch
  useEffect(() => {
    if (!activeTimer) return;
    const ticker = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(ticker);
  }, [activeTimer]);

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStop = async () => {
    if (!activeTimer) return;
    try {
      setLoading(true);
      await projectsApi.stopTimer(activeTimer.id, stopNotes);
      toast.success('Timer stopped and session logged!');
      setActiveTimer(null);
      setShowStopModal(false);
      setStopNotes('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to stop timer.');
    } finally {
      setLoading(false);
    }
  };

  if (!activeTimer) {
    return null; // Silent when no timer is running
  }

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 shadow-xs">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="text-xs font-semibold truncate max-w-[120px] sm:max-w-[180px] text-slate-800 dark:text-slate-200">
          {activeTimer.task?.title || 'Active Task'}
        </span>
        <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60">
          {formatTimer(elapsedSeconds)}
        </span>
        <button
          onClick={() => setShowStopModal(true)}
          className="w-5 h-5 rounded-md bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all hover:scale-105 shadow-xs"
          title="Stop Timer & Log Time"
        >
          <Square className="w-2 h-2 fill-current" />
        </button>
      </div>

      {/* Stop Session Modal */}
      <Modal
        isOpen={showStopModal}
        onClose={() => setShowStopModal(false)}
        maxWidth="md"
        title={
          <div className="flex items-center justify-between w-full pr-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <span>Stop Live Work Session</span>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              {formatTimer(elapsedSeconds)}
            </span>
          </div>
        }
        description={
          <span>
            Task: <strong className="text-slate-800 dark:text-slate-200">{activeTimer.task?.title}</strong>
          </span>
        }
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setShowStopModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleStop}
              disabled={loading}
              className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-sm shadow-rose-600/20"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              {loading ? 'Saving...' : 'Stop & Log Time'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 pt-1">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            What did you accomplish in this session? (Optional)
          </label>
          <textarea
            value={stopNotes}
            onChange={(e) => setStopNotes(e.target.value)}
            placeholder="e.g. Implemented JWT authentication and fixed token refresh bug..."
            rows={3}
            className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all resize-none"
          />
        </div>
      </Modal>
    </>
  );
}
