import React, { useState, useEffect } from 'react';
import {
  Palette,
  Globe,
  Sliders,
  Check,
  Sparkles,
  Shield,
  Eye,
  Building,
} from 'lucide-react';
import type { ClientBranding } from '@/api/clients.api';
import { clientsApi } from '@/api/clients.api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ClientBrandingEditorProps {
  clientId: number;
  companyName: string;
  branding?: ClientBranding | null;
  onRefresh: () => void;
}

export const ClientBrandingEditor: React.FC<ClientBrandingEditorProps> = ({
  clientId,
  companyName,
  branding,
  onRefresh,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    primary_color: '#1E40AF',
    subdomain: '',
    custom_domain: '',
    logo_url: '',
    hide_vendor_branding: true,
    enabled_features: {
      tickets: true,
      reports: true,
      invoices: true,
      documents: true,
    },
  });

  useEffect(() => {
    if (branding) {
      setFormData({
        primary_color: branding.primary_color || '#1E40AF',
        subdomain: branding.subdomain || '',
        custom_domain: branding.custom_domain || '',
        logo_url: branding.logo_url || '',
        hide_vendor_branding: branding.hide_vendor_branding ?? true,
        enabled_features: {
          tickets: branding.enabled_features?.tickets ?? true,
          reports: branding.enabled_features?.reports ?? true,
          invoices: branding.enabled_features?.invoices ?? true,
          documents: branding.enabled_features?.documents ?? true,
        },
      });
    }
  }, [branding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await clientsApi.updateBranding(clientId, formData);
      toast.success('White-label portal configuration saved successfully!');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update white-label branding.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            White-Label Portal &amp; Client Domain Branding
          </h3>
          <p className="text-xs text-slate-500">
            Customize the look, colors, custom URL, and enabled self-service modules for this client.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Live Portal Preview */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-xs">
          <div className="p-3 bg-slate-100 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Eye className="w-3.5 h-3.5" />
            <span>Client Portal Live Header Preview</span>
          </div>

          <div
            className="p-6 text-white flex items-center justify-between transition-colors duration-300"
            style={{ backgroundColor: formData.primary_color }}
          >
            <div className="flex items-center gap-3">
              {formData.logo_url ? (
                <img
                  src={formData.logo_url}
                  alt="Logo"
                  className="h-10 max-w-[120px] object-contain rounded bg-white/10 p-1"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-lg">
                  {companyName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h4 className="text-base font-black tracking-tight">{companyName}</h4>
                <p className="text-xs opacity-80">
                  {formData.subdomain ? `${formData.subdomain}.agencycrm.io` : 'Client Self-Service Portal'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold opacity-90">
              {formData.enabled_features.tickets && <span>Tickets</span>}
              {formData.enabled_features.invoices && <span>Invoices</span>}
              {formData.enabled_features.documents && <span>Documents</span>}
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Brand Colors */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Palette className="w-4 h-4 text-primary-500" />
              <span>Theme &amp; Brand Colors</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Primary Brand Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 dark:border-white/10 p-1 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-32 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-mono font-bold uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Logo Image URL
              </label>
              <input
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://client.com/logo.png"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
              />
            </div>
          </div>

          {/* Subdomain & Custom URL */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Globe className="w-4 h-4 text-primary-500" />
              <span>Subdomain &amp; Domains</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Portal Subdomain
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                  placeholder="acme"
                  className="w-full px-3.5 py-2.5 rounded-l-xl border border-r-0 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-semibold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                />
                <span className="px-3.5 py-2.5 rounded-r-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/10 text-xs font-medium text-slate-500">
                  .agencycrm.io
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Custom Domain (CNAME Mapping)
              </label>
              <input
                type="text"
                value={formData.custom_domain}
                onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value })}
                placeholder="portal.clientcompany.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Feature Toggles & White-label Mode */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Sliders className="w-4 h-4 text-primary-500" />
            <span>Portal Modules &amp; White-label Enforcement</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5">
              <input
                type="checkbox"
                checked={formData.hide_vendor_branding}
                onChange={(e) => setFormData({ ...formData, hide_vendor_branding: e.target.checked })}
                className="h-4 w-4 rounded text-primary-600"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 dark:text-white block">Hide Vendor "Powered by" Watermarks</span>
                <span className="text-slate-500 text-[11px]">Deliver 100% white-label client experience.</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5">
              <input
                type="checkbox"
                checked={formData.enabled_features.tickets}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    enabled_features: { ...formData.enabled_features, tickets: e.target.checked },
                  })
                }
                className="h-4 w-4 rounded text-primary-600"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 dark:text-white block">Service Tickets &amp; Requests</span>
                <span className="text-slate-500 text-[11px]">Allow client to submit tasks and confirm delivery.</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5">
              <input
                type="checkbox"
                checked={formData.enabled_features.invoices}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    enabled_features: { ...formData.enabled_features, invoices: e.target.checked },
                  })
                }
                className="h-4 w-4 rounded text-primary-600"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 dark:text-white block">Billing &amp; Tax Invoices</span>
                <span className="text-slate-500 text-[11px]">Allow client to view receipts and invoice PDFs.</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5">
              <input
                type="checkbox"
                checked={formData.enabled_features.documents}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    enabled_features: { ...formData.enabled_features, documents: e.target.checked },
                  })
                }
                className="h-4 w-4 rounded text-primary-600"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 dark:text-white block">E-Sign &amp; Agreements</span>
                <span className="text-slate-500 text-[11px]">Allow client to view and e-sign legal contracts.</span>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            isLoading={submitting}
            className="gap-2 bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-500/20 px-6"
          >
            <Check className="w-4 h-4" />
            <span>Save Branding Changes</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
