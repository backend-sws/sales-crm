import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  Calendar,
  Eye,
  Clock,
  Layers,
  FileText,
  UserCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, type AuditLogItem } from '@/api/admin.api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';

export default function AdminAuditLogsPage() {
  const { token } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [inspectLog, setInspectLog] = useState<AuditLogItem | null>(null);

  const { data: logsRes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'audit-logs', selectedCategory, dateFrom, dateTo],
    queryFn: () =>
      adminApi.getAuditLogs({
        log_name: selectedCategory !== 'all' ? selectedCategory : undefined,
        date_from: dateFrom ? `${dateFrom} 00:00:00` : undefined,
        date_to: dateTo ? `${dateTo} 23:59:59` : undefined,
        per_page: 50,
      }),
  });

  const logs = logsRes?.data || [];

  const filteredLogs = logs.filter((log) => {
    const q = searchTerm.toLowerCase();
    return (
      log.description.toLowerCase().includes(q) ||
      (log.log_name && log.log_name.toLowerCase().includes(q)) ||
      (log.subject_type && log.subject_type.toLowerCase().includes(q))
    );
  });

  const handleExportCSV = async () => {
    try {
      toast.info('Downloading audit trail CSV...');
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('log_name', selectedCategory);
      if (dateFrom) params.append('date_from', `${dateFrom} 00:00:00`);
      if (dateTo) params.append('date_to', `${dateTo} 23:59:59`);

      const res = await fetch(`http://localhost:8000/api/v1/admin/audit-logs/export?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to export audit logs');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_trail_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Audit trail CSV exported successfully.');
    } catch (err) {
      toast.error('Could not download audit log export.');
    }
  };

  const getCategoryBadge = (name: string) => {
    switch (name) {
      case 'auth':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">Auth & Security</Badge>;
      case 'users':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">User Control</Badge>;
      case 'leads':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">Leads Pipeline</Badge>;
      case 'reports':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Intelligence Reports</Badge>;
      default:
        return <Badge variant="outline" className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30">{name || 'General'}</Badge>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-500" /> Immutable Audit Trail Explorer
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Read-only chronological record of all administrative operations, impersonation events, and critical pipeline mutations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            className="h-10 text-xs rounded-xl gap-2 border-slate-200 dark:border-white/10"
            disabled={isFetching}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>

          <Button
            type="button"
            onClick={handleExportCSV}
            className="h-10 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-2 shadow-md shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" /> Export Audit CSV
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total Logged Events
          </span>
          <span className="text-2xl font-black text-slate-900 dark:text-white">
            {logs.length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 shadow-xs">
          <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block mb-1">
            Auth & Security
          </span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {logs.filter((l) => l.log_name === 'auth').length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 shadow-xs">
          <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider block mb-1">
            User Operations
          </span>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {logs.filter((l) => l.log_name === 'users').length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block mb-1">
            Intelligence Reports
          </span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {logs.filter((l) => l.log_name === 'reports').length}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search description, entity class, or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Selector */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
            {['all', 'auth', 'users', 'reports', 'leads'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${
                  selectedCategory === cat
                    ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 px-2 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-300"
            />
            <span>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 px-2 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-300"
            />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121217] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/75 dark:bg-white/[0.02]">
                <th className="py-3 px-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16">
                  ID
                </th>
                <th className="py-3 px-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-36">
                  Category
                </th>
                <th className="py-3 px-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Event Description
                </th>
                <th className="py-3 px-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-40">
                  Target Entity
                </th>
                <th className="py-3 px-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-28">
                  Causer
                </th>
                <th className="py-3 px-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-44">
                  Timestamp
                </th>
                <th className="py-3 px-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right w-24">
                  Inspect
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary-500" />
                    Loading immutable audit logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                    No audit records match the current filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-400">
                      #{log.id}
                    </td>
                    <td className="py-3 px-4">
                      {getCategoryBadge(log.log_name)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                      {log.description}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                      {log.subject_type ? (
                        <span>
                          {log.subject_type.split('\\').pop()} #{log.subject_id}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {log.causer_id ? (
                        <span className="font-mono bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded text-[11px]">
                          User #{log.causer_id}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">System</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setInspectLog(log)}
                        className="h-7 w-7 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
                        title="View Full Properties & Metadata"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Log Modal */}
      {inspectLog && (
        <Modal
          isOpen={!!inspectLog}
          onClose={() => setInspectLog(null)}
          title={`Audit Record #${inspectLog.id} Inspector`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-200">Category:</span>
                {getCategoryBadge(inspectLog.log_name)}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-200">Description:</span>
                <span className="text-slate-600 dark:text-slate-400 text-right">{inspectLog.description}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-200">Timestamp:</span>
                <span className="font-mono text-slate-600 dark:text-slate-400">{inspectLog.created_at}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-200">Causer:</span>
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  {inspectLog.causer_type ? `${inspectLog.causer_type} (#${inspectLog.causer_id})` : 'System Daemon'}
                </span>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Structured Event Properties &amp; Diff Payload (JSON):
              </span>
              <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed border border-slate-800">
                {JSON.stringify(inspectLog.properties || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInspectLog(null)}
                className="h-9 px-4 text-xs rounded-xl"
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
