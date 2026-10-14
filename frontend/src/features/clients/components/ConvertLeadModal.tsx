import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Building2,
  Receipt,
  UserCheck,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  CreditCard,
  Calendar,
  Lock,
} from 'lucide-react';
import { clientsApi, type ClientItem } from '@/api/clients.api';
import type { Lead } from '@/types/lead.types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ConvertLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess: (client: ClientItem) => void;
}

export const ConvertLeadModal: React.FC<ConvertLeadModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Org & Tax Details
    name: '',
    company: '',
    email: '',
    phone: '',
    gst_number: '',
    billing_address: '',
    billing_state: 'Maharashtra',

    // Step 2: Service Track
    service_name: 'Managed Service & Retainer',
    service_type: 'recurring' as 'recurring' | 'one_time' | 'software_project',
    billing_cycle: 'monthly' as 'monthly' | 'quarterly' | 'yearly' | 'milestone',
    value: 25000,
    start_date: new Date().toISOString().split('T')[0],

    // Step 3: Portal & Security
    create_user: true,
    password: 'Client@123',
    primary_color: '#3B82F6',
  });

  // Populate data when lead changes
  useEffect(() => {
    if (lead) {
      setFormData((prev) => ({
        ...prev,
        name: lead.name || '',
        company: lead.company || lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        value: lead.budget && Number(lead.budget) > 0 ? Number(lead.budget) : (lead.value && Number(lead.value) > 0 ? Number(lead.value) : 25000),
      }));
      setStep(1);
    }
  }, [lead]);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep((s) => (s + 1) as 2 | 3);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        gst_number: formData.gst_number || null,
        billing_address: formData.billing_address || null,
        billing_state: formData.billing_state,
        primary_color: formData.primary_color,
        create_user: formData.create_user,
        password: formData.password,
        services: [
          {
            service_name: formData.service_name,
            service_type: formData.service_type,
            billing_cycle: formData.billing_cycle,
            value: Number(formData.value) || 0,
            start_date: formData.start_date,
            notes: `Converted from Lead #${lead.id} (${lead.company || lead.name})`,
          },
        ],
      };

      const res = await clientsApi.convertLead(lead.id, payload);
      toast.success(`Won Lead successfully converted into Client '${res.data?.company || formData.company}'!`);
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to convert lead to client.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Multi-step indicator */}
        <div className="p-6 bg-gradient-to-br from-primary-600/10 via-primary-500/5 to-transparent border-b border-slate-200 dark:border-white/10 relative">
          <button
            onClick={onClose}
            type="button"
            className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Convert Won Deal to Client Account
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lead: <span className="font-semibold text-slate-700 dark:text-slate-300">{lead.company || lead.name}</span> • ID #{lead.id}
              </p>
            </div>
          </div>

          {/* Stepper Dots */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {[
              { num: 1, title: 'Company & Tax' },
              { num: 2, title: 'Service Track' },
              { num: 3, title: 'Portal & Launch' },
            ].map((s) => (
              <div
                key={s.num}
                onClick={() => setStep(s.num as 1 | 2 | 3)}
                className={`cursor-pointer pb-2 border-b-2 text-xs font-semibold flex items-center gap-2 transition-all ${
                  step === s.num
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : step > s.num
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-slate-200 dark:border-white/10 text-slate-400'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
                    step === s.num
                      ? 'bg-primary-600 text-white'
                      : step > s.num
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </div>
                <span>{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* STEP 1: Company & Tax */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                <Building2 className="w-4 h-4 text-primary-500" />
                <span>Organization &amp; Invoicing Profile</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    placeholder="Acme Technologies Pvt Ltd"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Primary Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    placeholder="Contact person"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Billing Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    placeholder="billing@company.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    placeholder="+91 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    GSTIN Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.gst_number}
                    onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium uppercase focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none font-mono"
                    placeholder="27ABCDE1234F1Z5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Billing State * (For Indian GST)
                  </label>
                  <select
                    value={formData.billing_state}
                    onChange={(e) => setFormData({ ...formData, billing_state: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  >
                    <option value="Maharashtra">Maharashtra (Intra-state: CGST 9% + SGST 9%)</option>
                    <option value="Karnataka">Karnataka (Inter-state: IGST 18%)</option>
                    <option value="Delhi">Delhi (Inter-state: IGST 18%)</option>
                    <option value="Tamil Nadu">Tamil Nadu (Inter-state: IGST 18%)</option>
                    <option value="Gujarat">Gujarat (Inter-state: IGST 18%)</option>
                    <option value="Telangana">Telangana (Inter-state: IGST 18%)</option>
                    <option value="Uttar Pradesh">Uttar Pradesh (Inter-state: IGST 18%)</option>
                    <option value="West Bengal">West Bengal (Inter-state: IGST 18%)</option>
                    <option value="Other">Other State (IGST 18%)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Billing Address
                </label>
                <textarea
                  rows={2}
                  value={formData.billing_address}
                  onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  placeholder="Street address, City, Pincode"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Service Track */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                <Layers className="w-4 h-4 text-primary-500" />
                <span>Service Track &amp; Retainer Plan</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Service Track Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.service_name}
                  onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  placeholder="e.g., Monthly Digital Retainer & SEO"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Track Type *
                  </label>
                  <select
                    value={formData.service_type}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  >
                    <option value="recurring">Recurring Retainer (Subscription)</option>
                    <option value="one_time">One-Time Project / Deliverable</option>
                    <option value="software_project">Software Project / Milestone</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Billing Cycle *
                  </label>
                  <select
                    value={formData.billing_cycle}
                    onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  >
                    <option value="monthly">Monthly Cycle</option>
                    <option value="quarterly">Quarterly Cycle</option>
                    <option value="yearly">Yearly Cycle (Annual Contract)</option>
                    <option value="milestone">Milestone Invoicing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Base Retainer Amount (₹ INR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min={0}
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Service Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  />
                </div>
              </div>

              {/* Tax estimation preview */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="text-slate-500">Estimated First Invoice with GST:</span>
                  <div className="font-semibold text-slate-700 dark:text-slate-300">
                    Base ₹{formData.value.toLocaleString('en-IN')} + 18% GST (₹{(formData.value * 0.18).toLocaleString('en-IN')})
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Total Gross</span>
                  <span className="text-base font-extrabold text-primary-600 dark:text-primary-400">
                    ₹{(formData.value * 1.18).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Portal & Launch */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                <Shield className="w-4 h-4 text-primary-500" />
                <span>Client White-Label Portal &amp; Access</span>
              </div>

              {/* User account toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="create_user"
                  checked={formData.create_user}
                  onChange={(e) => setFormData({ ...formData, create_user: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="create_user" className="cursor-pointer text-xs space-y-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Create Client Portal Login Credentials
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 block">
                    Enables client self-service ticketing, invoice downloads, and docu-signing under their branded portal.
                  </span>
                </label>
              </div>

              {formData.create_user && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Login Email
                    </label>
                    <input
                      type="email"
                      readOnly
                      disabled
                      value={formData.email}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/10 text-slate-500 text-sm font-medium cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Default Initial Password *
                    </label>
                    <input
                      type="text"
                      required={formData.create_user}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Portal Color Customization */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Client Primary Brand Color
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
                  <div
                    className="h-8 flex-1 rounded-xl flex items-center px-4 text-xs font-bold text-white shadow-xs"
                    style={{ backgroundColor: formData.primary_color }}
                  >
                    Portal Header Preview
                  </div>
                </div>
              </div>

              {/* Summary Banner */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Pre-Sales Journey Preserved
                </div>
                <p className="text-emerald-700/80 dark:text-emerald-300/80">
                  All past interactions, notes, and activity timeline from Lead #{lead.id} will be permanently linked to this client account for seamless delivery handover.
                </p>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => (s - 1) as 1 | 2)}
                className="gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
            )}

            <Button
              type="submit"
              size="sm"
              isLoading={submitting}
              className="gap-2 bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-500/20 px-5"
            >
              {step < 3 ? (
                <>
                  <span>Next Step</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Execute Conversion</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
