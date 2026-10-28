import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Search,
  Filter,
  ArrowUpRight,
  ShieldAlert,
  CreditCard,
  Layers,
  HeartHandshake,
  CheckCircle2,
  RefreshCw,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { clientsApi, type ClientItem } from '@/api/clients.api';
import { ClientHealthBadge, CreateClientModal } from '@/features/clients/components';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (search.trim()) params.search = search.trim();
      if (healthFilter !== 'all') params.health_status = healthFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await clientsApi.getClients(params);
      setClients(res.data || []);
    } catch (err: any) {
      toast.error('Failed to load clients directory');
    } finally {
      setLoading(false);
    }
  }, [search, healthFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchClients]);

  // Aggregate Metrics
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === 'active').length;
  const atRiskClients = clients.filter(
    (c) => c.health_score?.status === 'at_risk' || c.health_score?.status === 'churning'
  ).length;

  const totalMRR = clients.reduce((acc, c) => {
    const services = c.services || [];
    const monthlySum = services.reduce((sAcc, s) => {
      if (s.billing_cycle === 'monthly') return sAcc + Number(s.value);
      if (s.billing_cycle === 'quarterly') return sAcc + Number(s.value) / 3;
      if (s.billing_cycle === 'yearly') return sAcc + Number(s.value) / 12;
      return sAcc;
    }, 0);
    return acc + monthlySum;
  }, 0);

  const averageHealth =
    clients.length > 0
      ? Math.round(
          clients.reduce((acc, c) => acc + Number(c.health_score?.score || 100), 0) / clients.length
        )
      : 100;

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary-600/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Client Success &amp; Retainer Tracks
              </h1>
              <p className="text-xs text-slate-500">
                Phase 3 client lifecycle, service SLA monitoring, white-label portals &amp; retainer billing.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchClients}
            disabled={loading}
            className="gap-1.5 text-xs rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/leads')}
            className="gap-1.5 text-xs rounded-xl text-slate-700 dark:text-slate-300"
          >
            <span>Convert Won Lead</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-1.5 text-xs rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Client</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Client Accounts</span>
            <Users className="w-4 h-4 text-primary-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {activeClients} <span className="text-xs font-normal text-slate-400">/ {totalClients} total</span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Estimated Monthly MRR</span>
            <CreditCard className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{Math.round(totalMRR).toLocaleString('en-IN')}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Average Health Score</span>
            <HeartHandshake className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>{averageHealth}/100</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
              Optimal
            </span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">At-Risk Accounts</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {atRiskClients} <span className="text-xs font-normal text-slate-400">need attention</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, contact, email..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Health Filter */}
          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-semibold outline-none"
          >
            <option value="all">All Health Scores</option>
            <option value="healthy">Healthy (80-100)</option>
            <option value="at_risk">At Risk (50-79)</option>
            <option value="churning">Churning (&lt; 50)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-semibold outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Accounts</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Client Directory Table */}
      <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/70 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 px-5">Client / Organization</th>
              <th className="py-3.5 px-4">Health Score</th>
              <th className="py-3.5 px-4">Services &amp; Retainers</th>
              <th className="py-3.5 px-4">Account Manager</th>
              <th className="py-3.5 px-4">Onboarding Progress</th>
              <th className="py-3.5 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-primary-500" />
                    <span>Loading clients directory...</span>
                  </div>
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 flex items-center justify-center mx-auto">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No client accounts found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Onboard a new client organization directly or convert a closed won lead from your sales pipeline.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="gap-1.5 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded-xl"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Client Directly
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/leads')}
                        className="gap-1.5 text-xs rounded-xl"
                      >
                        Convert Won Lead
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              clients.map((client) => {
                const completedSteps = client.onboarding_steps?.filter((s) => s.completed).length || 0;
                const totalSteps = client.onboarding_steps?.length || 4;
                const onboardingPct = Math.round((completedSteps / totalSteps) * 100);

                return (
                  <tr
                    key={client.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    {/* Organization Details */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-xs"
                          style={{
                            backgroundColor: client.branding?.primary_color || '#3B82F6',
                          }}
                        >
                          {client.company.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors">
                            {client.company}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {client.name} • {client.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Health Score */}
                    <td className="py-4 px-4">
                      {client.health_score ? (
                        <ClientHealthBadge
                          score={Number(client.health_score.score)}
                          status={client.health_score.status}
                          size="md"
                        />
                      ) : (
                        <span className="text-slate-400">Not calculated</span>
                      )}
                    </td>

                    {/* Active Services */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {client.services && client.services.length > 0
                            ? client.services[0].service_name
                            : 'No track assigned'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {client.services && client.services.length > 0 ? (
                            <span>
                              ₹{Number(client.services[0].value).toLocaleString('en-IN')} /{' '}
                              {client.services[0].billing_cycle}
                            </span>
                          ) : (
                            'Inactive'
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Account Manager */}
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300 font-medium">
                      {client.account_manager?.name || 'Unassigned'}
                    </td>

                    {/* Onboarding Progress */}
                    <td className="py-4 px-4">
                      <div className="w-36 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-slate-400">{completedSteps}/{totalSteps} Steps</span>
                          <span className={onboardingPct === 100 ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}>
                            {onboardingPct}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              onboardingPct === 100 ? 'bg-emerald-500' : 'bg-primary-500'
                            }`}
                            style={{ width: `${onboardingPct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/clients/${client.id}`);
                        }}
                        className="text-xs gap-1 group-hover:bg-primary-50 dark:group-hover:bg-primary-950/40 text-primary-600 dark:text-primary-400"
                      >
                        <span>View Portal</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <CreateClientModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchClients();
        }}
      />
    </div>
  );
}
