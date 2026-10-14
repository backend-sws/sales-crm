import React from 'react';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
export interface RecentLeadItem {
  id: number;
  name: string;
  email?: string;
  company?: string;
  status: string;
  priority?: string;
  score?: number;
  value?: string | number;
  budget?: string | number;
  created_at?: string;
}

interface RecentLeadsCardProps {
  leads: RecentLeadItem[];
  loading: boolean;
  onViewAll: () => void;
}

export function RecentLeadsCard({ leads, loading, onViewAll }: RecentLeadsCardProps) {
  const formatINR = (val: number | string | undefined) => {
    if (!val) return '₹0';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getStageBadgeClass = (status?: string) => {
    switch (status) {
      case 'won':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'lost':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
      case 'negotiation':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
      case 'proposal':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20';
      case 'demo_meeting':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'interested':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20';
      case 'contacted':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20';
    }
  };

  return (
    <div className="bg-white dark:bg-[#121217] rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
      <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Recent Leads &amp; Pipeline Opportunities
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time pipeline tracking and activity
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewAll}
          className="text-xs text-primary-600 dark:text-primary-400 gap-1 rounded-xl"
        >
          Open Full Pipeline <ArrowUpRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-white/5 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100 dark:border-white/5">
            <tr>
              <th className="py-3.5 px-5">Lead / Contact</th>
              <th className="py-3.5 px-5">Company</th>
              <th className="py-3.5 px-5">Deal Value</th>
              <th className="py-3.5 px-5">Stage</th>
              <th className="py-3.5 px-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary-500" />
                  Loading pipeline...
                </td>
              </tr>
            ) : !leads?.length ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No leads in CRM. Create your first lead to begin!
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={onViewAll}
                  className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">
                    {lead.name}
                  </td>
                  <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300">
                    {lead.company || '—'}
                  </td>
                  <td className="py-3.5 px-5 font-semibold text-slate-800 dark:text-slate-200">
                    {formatINR(lead.budget ?? lead.value)}
                  </td>
                  <td className="py-3.5 px-5">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStageBadgeClass(
                        lead.status
                      )}`}
                    >
                      {lead.status?.replace('_', ' ') || 'NEW'}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-primary-600 dark:text-primary-400"
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
