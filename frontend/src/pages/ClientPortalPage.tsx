import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  Receipt,
  FileCheck,
  Plus,
  RefreshCw,
  ExternalLink,
  Shield,
  Eye,
  LogOut,
  Sparkles,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import { clientsApi, type ClientItem } from '@/api/clients.api';
import { useAuthStore } from '@/store/authStore';
import {
  ClientOnboardingCard,
  ServiceTicketsPanel,
  RetainerInvoicesPanel,
  ClientDocumentsPanel,
} from '@/features/clients/components';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ClientPortalPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isPreviewMode = Boolean(id);

  const [client, setClient] = useState<ClientItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'services' | 'billing' | 'documents' | 'onboarding'>('services');

  const fetchPortalData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (isPreviewMode) {
        // Admin preview mode for specific client
        const res = await clientsApi.getClient(Number(id));
        setClient(res.data);
      } else {
        // Logged-in client's own portal
        const res = await clientsApi.getPortalProfile();
        setClient(res.data);
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'Could not load client portal.';
      setError(errMsg);
      toast.error(errMsg);
      if (isPreviewMode) {
        navigate('/clients');
      }
    } finally {
      setLoading(false);
    }
  }, [id, isPreviewMode, navigate]);

  useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  if (loading) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
        <span className="text-sm font-semibold text-slate-500">Loading your client workspace...</span>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
          <Shield className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-white">Client Portal Account Not Ready</h3>
        <p className="text-xs text-slate-500 max-w-md">
          {error || 'We could not load your organization profile. Please contact your account manager.'}
        </p>
        <Button onClick={fetchPortalData} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </Button>
      </div>
    );
  }

  const primaryColor = client.branding?.primary_color || '#1E40AF';
  const hideVendor = client.branding?.hide_vendor_branding ?? true;

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">
      {/* Admin Preview Banner if opened by an Admin */}
      {isPreviewMode && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Client Portal Live Preview:</span>{' '}
              <span>Viewing white-label workspace as {client.company} (Client #{client.id})</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/clients/${client.id}`)}
            className="text-xs h-8 border-amber-400 text-amber-900 dark:text-amber-200 gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to CRM Workspace</span>
          </Button>
        </div>
      )}

      {/* Branded White-Label Portal Header */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 overflow-hidden shadow-xs">
        {/* Dynamic primary brand color bar */}
        <div
          className="h-28 w-full p-6 flex items-end justify-between transition-colors duration-300"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, #0F172A 100%)`,
          }}
        >
          <div className="flex items-center gap-4">
            {client.branding?.logo_url ? (
              <img
                src={client.branding.logo_url}
                alt={client.company}
                className="h-14 max-w-[140px] object-contain rounded-2xl bg-white/20 backdrop-blur-md p-1.5 border border-white/20"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl text-white border border-white/20 shadow-md">
                {client.company.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="text-white space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight">{client.company}</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider">
                  Client Portal
                </span>
              </div>
              <p className="text-xs opacity-80">
                Welcome back, {client.name} • Dedicated Account Workspace
              </p>
            </div>
          </div>

          {!hideVendor && (
            <span className="text-[10px] font-semibold text-white/70">
              Powered by SalesCRM Platform
            </span>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 overflow-x-auto">
          {[
            { key: 'services', label: 'My Services & Tasks', icon: Layers },
            { key: 'billing', label: 'Invoices & Receipts', icon: Receipt },
            { key: 'documents', label: 'Agreements & E-Sign', icon: FileCheck },
            { key: 'onboarding', label: 'Setup Checklist', icon: Sparkles },
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

      {/* Tab Panels */}
      {activeTab === 'services' && (
        <div className="animate-in fade-in duration-150">
          <ServiceTicketsPanel
            services={client.services || []}
            onRefresh={fetchPortalData}
          />
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="animate-in fade-in duration-150">
          <RetainerInvoicesPanel
            clientId={client.id}
            invoices={client.invoices || []}
            services={client.services || []}
            onRefresh={fetchPortalData}
          />
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="animate-in fade-in duration-150">
          <ClientDocumentsPanel
            clientId={client.id}
            documents={client.documents || []}
            onRefresh={fetchPortalData}
          />
        </div>
      )}

      {activeTab === 'onboarding' && (
        <div className="max-w-2xl animate-in fade-in duration-150">
          <ClientOnboardingCard
            client={client}
            onRefresh={fetchPortalData}
          />
        </div>
      )}
    </div>
  );
}
