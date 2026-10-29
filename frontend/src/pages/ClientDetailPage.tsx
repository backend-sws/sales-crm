import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  Mail,
  Phone,
  Receipt,
  FileCheck,
  Palette,
  HeartHandshake,
  Layers,
  History,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Shield,
  Activity,
  Calendar,
  Eye,
} from 'lucide-react';
import { clientsApi, type ClientItem } from '@/api/clients.api';
import {
  ClientHealthBadge,
  ClientOnboardingCard,
  ServiceTicketsPanel,
  RetainerInvoicesPanel,
  ClientDocumentsPanel,
  ClientBrandingEditor,
} from '@/features/clients/components';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clientId = Number(id);

  const [client, setClient] = useState<ClientItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'services' | 'billing' | 'documents' | 'branding' | 'timeline'
  >('overview');

  const fetchClientProfile = useCallback(async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const res = await clientsApi.getClient(clientId);
      setClient(res.data);
    } catch (err: any) {
      toast.error('Failed to load client details');
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  }, [clientId, navigate]);

  useEffect(() => {
    fetchClientProfile();
  }, [fetchClientProfile]);

  if (loading || !client) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
        <span className="text-sm font-semibold text-slate-500">Loading client workspace...</span>
      </div>
    );
  }

  const primaryColor = client.branding?.primary_color || '#3B82F6';

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">
      {/* Back button & Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/clients')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Clients Directory</span>
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchClientProfile}
            className="text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => navigate(`/clients/${client.id}/portal`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 shadow-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview Client Portal</span>
          </Button>
        </div>
      </div>

      {/* Client Profile Header Banner */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 overflow-hidden shadow-xs">
        {/* Top colored accent banner */}
        <div
          className="h-24 w-full transition-colors relative"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, #0F172A 100%)`,
          }}
        />

        <div className="px-6 pb-6 pt-0 relative flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-end gap-4 -mt-10">
            <div
              className="w-20 h-20 rounded-3xl border-4 border-white dark:border-slate-900 flex items-center justify-center font-black text-2xl text-white shadow-lg shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              {client.company.slice(0, 2).toUpperCase()}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 dark:text-white">
                  {client.company}
                </h1>
                {client.health_score && (
                  <ClientHealthBadge
                    score={Number(client.health_score.score)}
                    status={client.health_score.status}
                    size="sm"
                  />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {client.name} (Primary Contact)
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {client.email}
                </span>
                {client.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {client.phone}
                  </span>
                )}
                {client.gst_number && (
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                    GSTIN: {client.gst_number}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
              Account Manager:
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {client.account_manager?.name || 'Unassigned'}
            </span>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="px-6 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 overflow-x-auto">
          {[
            { key: 'overview', label: 'Overview & Health', icon: Activity },
            { key: 'services', label: 'Services & Tickets', icon: Layers },
            { key: 'billing', label: 'Invoices & GST', icon: Receipt },
            { key: 'documents', label: 'Contracts & E-Sign', icon: FileCheck },
            { key: 'branding', label: 'White-Label Portal', icon: Palette },
            { key: 'timeline', label: 'Pre-Sales Journey', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-3.5 px-3 border-b-2 text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT */}

      {/* Tab 1: Overview & Health */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
          {/* Left Column: Onboarding Progress */}
          <div className="lg:col-span-1 space-y-6">
            <ClientOnboardingCard client={client} onRefresh={fetchClientProfile} />

            {/* Billing & Tax Summary */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tax &amp; Legal Address
              </h3>
              <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">State:</span>{' '}
                  {client.billing_state || 'Maharashtra'}
                </div>
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Address:</span>{' '}
                  {client.billing_address || 'Not specified'}
                </div>
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">GSTIN:</span>{' '}
                  {client.gst_number || 'Unregistered'}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Health Score Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Client Health Score Breakdown
                  </h3>
                  <p className="text-xs text-slate-500">
                    Weighted 0–100 composite index calculated daily at 02:00 AM.
                  </p>
                </div>
                {client.health_score && (
                  <ClientHealthBadge
                    score={Number(client.health_score.score)}
                    status={client.health_score.status}
                    size="lg"
                  />
                )}
              </div>

              {client.health_score && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Delivery &amp; Ticket SLA</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {Number(client.health_score.ticket_score)}/100
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Number(client.health_score.ticket_score)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Payment Punctuality</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {Number(client.health_score.payment_score)}/100
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Number(client.health_score.payment_score)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Communication &amp; Feedback</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {Number(client.health_score.feedback_score)}/100
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${Number(client.health_score.feedback_score)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Client Response Time</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {Number(client.health_score.response_score)}/100
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${Number(client.health_score.response_score)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Summary of Active Services */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Subscribed Service Tracks ({client.services?.length || 0})
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveTab('services')}
                  className="text-xs text-primary-600"
                >
                  Manage Services &rarr;
                </Button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {client.services?.map((svc) => (
                  <div key={svc.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{svc.service_name}</div>
                      <div className="text-slate-500 capitalize">
                        {svc.service_type.replace('_', ' ')} • {svc.billing_cycle}
                      </div>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      ₹{Number(svc.value).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Services & Tickets */}
      {activeTab === 'services' && (
        <div className="animate-in fade-in duration-150">
          <ServiceTicketsPanel
            services={client.services || []}
            onRefresh={fetchClientProfile}
          />
        </div>
      )}

      {/* Tab 3: Billing & Invoices */}
      {activeTab === 'billing' && (
        <div className="animate-in fade-in duration-150">
          <RetainerInvoicesPanel
            clientId={client.id}
            clientName={client.name}
            clientCompany={client.company}
            clientGst={client.gst_number}
            clientAddress={client.billing_address}
            clientState={client.billing_state}
            invoices={client.invoices || []}
            services={client.services || []}
            onRefresh={fetchClientProfile}
          />
        </div>
      )}

      {/* Tab 4: Documents & E-Sign */}
      {activeTab === 'documents' && (
        <div className="animate-in fade-in duration-150">
          <ClientDocumentsPanel
            clientId={client.id}
            documents={client.documents || []}
            onRefresh={fetchClientProfile}
            clientName={client.name}
            clientCompany={client.company}
          />
        </div>
      )}

      {/* Tab 5: White-label Portal Branding */}
      {activeTab === 'branding' && (
        <div className="animate-in fade-in duration-150">
          <ClientBrandingEditor
            clientId={client.id}
            companyName={client.company}
            branding={client.branding}
            onRefresh={fetchClientProfile}
          />
        </div>
      )}

      {/* Tab 6: Pre-sales Journey & Timeline */}
      {activeTab === 'timeline' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Pre-Sales Lead History &amp; Handover Timeline
            </h3>
          </div>

          <p className="text-xs text-slate-500">
            Audit trace preserved from Lead #{client.source_lead_id || 'N/A'}. All pre-sale notes and follow-ups are preserved.
          </p>

          <div className="divide-y divide-slate-100 dark:divide-white/5 pt-2">
            {client.source_lead?.activities && client.source_lead.activities.length > 0 ? (
              client.source_lead.activities.map((act: any) => (
                <div key={act.id} className="py-3 flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{act.description}</p>
                    <span className="text-[10px] text-slate-400">
                      {new Date(act.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No archived pre-sale activity logs recorded.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
