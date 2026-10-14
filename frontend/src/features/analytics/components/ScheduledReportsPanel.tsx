import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Play,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type ScheduledReportItem } from '@/api/admin.api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';

export function ScheduledReportsPanel() {
  const queryClient = useQueryClient();
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [reportType, setReportType] = useState<'weekly_digest' | 'monthly_executive'>('weekly_digest');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('weekly');

  const { data: reportsRes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'scheduled-reports'],
    queryFn: () => adminApi.getScheduledReports(),
  });

  const reports = reportsRes?.data || [];

  // Generate / Regenerate mutation
  const generateMutation = useMutation({
    mutationFn: (id: number) => adminApi.triggerGenerateReport(id),
    onSuccess: (res) => {
      toast.success(res.message || 'Report generated successfully.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'scheduled-reports'] });
    },
    onError: () => toast.error('Failed to trigger report generation.'),
  });

  // Create Subscription mutation
  const createMutation = useMutation({
    mutationFn: (payload: { report_type: string; frequency: string }) =>
      adminApi.createScheduledReport(payload),
    onSuccess: (res) => {
      toast.success(res.message || 'Report subscription registered.');
      setIsSubscribeOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'scheduled-reports'] });
    },
    onError: () => toast.error('Failed to register report subscription.'),
  });

  const handleDownload = async (fileUrl?: string, reportType?: string) => {
    if (!fileUrl) {
      toast.error('Report file is not yet available.');
      return;
    }
    try {
      toast.info('Downloading report CSV...');
      const response = await fetch(`http://localhost:8000${fileUrl}`);

      if (!response.ok) throw new Error('Failed to download report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType || 'report'}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Report CSV downloaded successfully.');
    } catch (err) {
      toast.error('Could not download report file.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121217] p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> Proactive Executive Reports &amp; Digests
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated intelligence briefs dispatched every Monday 9 AM and monthly on the 1st. On-demand generation and instant CSV export.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-9 text-xs rounded-xl gap-1.5"
            disabled={isFetching}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsSubscribeOpen(true)}
            className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Trigger New Report
          </Button>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary-500" />
            Loading scheduled reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white dark:bg-[#121217] rounded-2xl border border-slate-200 dark:border-white/10">
            No report schedules found. Click "Trigger New Report" to create one.
          </div>
        ) : (
          reports.map((report) => {
            const isWeekly = report.report_type === 'weekly_digest';
            return (
              <div
                key={report.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/20 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isWeekly
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      <FileSpreadsheet className="w-5 h-5" />
                    </span>
                    <Badge
                      variant="outline"
                      className="capitalize text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> {report.status}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white capitalize">
                      {report.report_type.replace('_', ' ')}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Frequency: <span className="font-semibold capitalize">{report.frequency}</span>
                    </p>
                  </div>

                  {report.last_generated_at && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        Last Run:{' '}
                        {new Date(report.last_generated_at).toLocaleString('en-IN', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  )}

                  {report.parameters && (
                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 text-[11px] space-y-1">
                      {report.parameters.period && (
                        <div className="flex justify-between text-slate-500">
                          <span>Period:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {report.parameters.period}
                          </span>
                        </div>
                      )}
                      {report.parameters.won_revenue !== undefined && (
                        <div className="flex justify-between text-slate-500">
                          <span>Revenue:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{Number(report.parameters.won_revenue).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-white/5 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => generateMutation.mutate(report.id)}
                    disabled={generateMutation.isPending}
                    className="flex-1 h-8 text-[11px] rounded-lg gap-1.5"
                  >
                    <Play className="w-3 h-3 text-primary-500" /> Run Now
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleDownload(report.file_url, report.report_type)}
                    className="h-8 text-[11px] px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg gap-1.5"
                  >
                    <Download className="w-3 h-3" /> CSV
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Trigger / Subscribe Modal */}
      {isSubscribeOpen && (
        <Modal
          isOpen={isSubscribeOpen}
          onClose={() => setIsSubscribeOpen(false)}
          title="Generate or Schedule Executive Report"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Report Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReportType('weekly_digest');
                    setFrequency('weekly');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    reportType === 'weekly_digest'
                      ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400'
                      : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="font-bold block mb-0.5">Weekly Sales Digest</span>
                  <span className="text-[10px] text-slate-400 block">
                    Team conversion summary, overdue follow-ups, hot leads
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReportType('monthly_executive');
                    setFrequency('monthly');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    reportType === 'monthly_executive'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="font-bold block mb-0.5">Monthly Executive</span>
                  <span className="text-[10px] text-slate-400 block">
                    Pipeline forecast, deal win/loss, confidence index
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Distribution Frequency
              </label>
              <select
                value={frequency}
                onChange={(e: any) => setFrequency(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-xs"
              >
                <option value="weekly">Weekly (Every Monday 9:00 AM)</option>
                <option value="monthly">Monthly (1st of Month 8:00 AM)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSubscribeOpen(false)}
                className="h-9 px-4 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() =>
                  createMutation.mutate({
                    report_type: reportType,
                    frequency: frequency,
                  })
                }
                disabled={createMutation.isPending}
                className="h-9 px-4 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
              >
                {createMutation.isPending ? 'Generating...' : 'Confirm & Generate'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
