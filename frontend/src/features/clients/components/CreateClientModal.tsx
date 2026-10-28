import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
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
  Plus,
  Mail,
  Phone,
  User,
  IndianRupee,
  CheckCircle2,
} from 'lucide-react';
import { clientsApi, type ClientItem } from '@/api/clients.api';
import { adminApi, type AdminUserItem } from '@/api/admin.api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (client: ClientItem) => void;
}

export const CreateClientModal: React.FC<CreateClientModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Org & Contact
    name: '',
    company: '',
    email: '',
    phone: '',
    account_manager_id: '' as string | number,

    // Step 2: GST & Billing
    gst_number: '',
    billing_address: '',
    billing_state: 'Maharashtra',

    // Step 3: Service Track
    service_name: 'Dedicated Retainer & Service Track',
    service_type: 'recurring' as 'recurring' | 'fixed_scope' | 'maintenance',
    billing_cycle: 'monthly' as 'monthly' | 'quarterly' | 'yearly' | 'milestone',
    service_value: 25000,
    start_date: new Date().toISOString().split('T')[0],
    service_notes: '',

    // Step 4: Portal & White-label
    create_user: true,
    password: 'Client@123',
    primary_color: '#3B82F6',
  });

  // Load team members for Account Manager dropdown
  useEffect(() => {
    if (isOpen) {
      setLoadingUsers(true);
      adminApi
        .getUsers()
        .then((res) => {
          if (res.data) {
            setUsers(res.data);
          }
        })
        .catch(() => {
          // Non-blocking fallback
        })
        .finally(() => setLoadingUsers(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.name.trim() || !formData.email.trim()) {
        toast.error('Please enter the contact person name and official email.');
        return;
      }
    }
    if (step < 4) {
      setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
      return;
    }

    try {
      setSubmitting(true);
      const payload: Record<string, any> = {
        name: formData.name.trim(),
        company: formData.company.trim() || formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        gst_number: formData.gst_number.trim() || null,
        billing_address: formData.billing_address.trim() || null,
        billing_state: formData.billing_state,
        account_manager_id: formData.account_manager_id ? Number(formData.account_manager_id) : null,
        service_name: formData.service_name.trim() || 'Managed Retainer Track',
        service_type: formData.service_type,
        billing_cycle: formData.billing_cycle,
        service_value: Number(formData.service_value) || 0,
        service_notes: formData.service_notes.trim() || 'Direct client onboarded via CRM',
        create_user: formData.create_user,
        password: formData.password,
        primary_color: formData.primary_color,
      };

      const res = await clientsApi.createClient(payload);
      if (res.data) {
        toast.success(`Client '${res.data.company || res.data.name}' created successfully!`);
        onSuccess(res.data);
        onClose();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to onboard client';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Indian GST Calculation Preview
  const baseValue = Number(formData.service_value) || 0;
  const isMaharashtra = formData.billing_state === 'Maharashtra';
  const gstRate = 0.18;
  const gstAmount = Math.round(baseValue * gstRate);
  const totalAmount = baseValue + gstAmount;

  const colorPresets = [
    { name: 'Blue', hex: '#3B82F6' },
    { name: 'Indigo', hex: '#4F46E5' },
    { name: 'Emerald', hex: '#059669' },
    { name: 'Violet', hex: '#7C3AED' },
    { name: 'Rose', hex: '#E11D48' },
    { name: 'Amber', hex: '#D97706' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#121217] w-full max-w-2xl rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header Banner */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-primary-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Add New Client Account
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200/50 dark:border-primary-800/40">
                  Direct Onboarding
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create a client organization with GST billing, service retainers, and white-label portal access.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-4 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#121217] text-xs font-semibold">
          {[
            { num: 1, label: 'Organization' },
            { num: 2, label: 'Tax & GST' },
            { num: 3, label: 'Retainer Plan' },
            { num: 4, label: 'Portal Access' },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (step === 1 && (!formData.name.trim() || !formData.email.trim())) return;
                setStep(s.num as any);
              }}
              className={`py-3 px-2 text-center transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                step === s.num
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400 bg-primary-50/40 dark:bg-primary-950/20 font-bold'
                  : step > s.num
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === s.num
                    ? 'bg-primary-600 text-white'
                    : step > s.num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {step > s.num ? '✓' : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Step Form Content */}
        <form onSubmit={step === 4 ? handleSubmit : handleNext} className="p-6 flex-1 space-y-4">
          {/* STEP 1: Organization & Primary Contact */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                <Building2 className="w-4 h-4 text-primary-500" />
                <span>Client Organization &amp; Contact Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Company / Business Name *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      placeholder="e.g. Nexus Software Solutions Pvt Ltd"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Contact Person *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      placeholder="e.g. Vikramaditya Deshmukh"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Official Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      placeholder="contact@nexus.in"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone / Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      placeholder="+91 98200 12345"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Dedicated Account Manager
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    value={formData.account_manager_id}
                    onChange={(e) => setFormData({ ...formData, account_manager_id: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  >
                    <option value="">Assign Later (No Account Manager)</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.roles?.join(', ') || 'Team'})
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Responsible for SLA reviews, client meetings, and monthly invoice sign-offs.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Indian GST & Billing */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                <Receipt className="w-4 h-4 text-primary-500" />
                <span>GST Tax Compliance &amp; Invoicing Address</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    GSTIN Identification (15 Alphanumeric)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={formData.gst_number}
                    onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm font-mono uppercase tracking-wider focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    placeholder="27AABCU9603R1ZM"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Optional. Leave empty for un-registered retail clients.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Billing State / UT *
                  </label>
                  <select
                    value={formData.billing_state}
                    onChange={(e) => setFormData({ ...formData, billing_state: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  >
                    <option value="Maharashtra">Maharashtra (Intra-state: CGST 9% + SGST 9%)</option>
                    <option value="Delhi">Delhi (Inter-state: IGST 18%)</option>
                    <option value="Karnataka">Karnataka (Inter-state: IGST 18%)</option>
                    <option value="Telangana">Telangana (Inter-state: IGST 18%)</option>
                    <option value="Tamil Nadu">Tamil Nadu (Inter-state: IGST 18%)</option>
                    <option value="Gujarat">Gujarat (Inter-state: IGST 18%)</option>
                    <option value="Uttar Pradesh">Uttar Pradesh (Inter-state: IGST 18%)</option>
                    <option value="Haryana">Haryana (Inter-state: IGST 18%)</option>
                    <option value="West Bengal">West Bengal (Inter-state: IGST 18%)</option>
                    <option value="Rajasthan">Rajasthan (Inter-state: IGST 18%)</option>
                    <option value="Other">Other State / Overseas (IGST 18%)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Determines whether CGST+SGST or IGST applies.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Registered Invoicing Address
                </label>
                <textarea
                  rows={2}
                  value={formData.billing_address}
                  onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  placeholder="Office suite, Tech Park, City, PIN Code"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Retainer Plan */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                <Layers className="w-4 h-4 text-primary-500" />
                <span>Initial Retainer Plan &amp; Billing Cycle</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Service Track Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.service_name}
                  onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  placeholder="e.g. Dedicated Full-Stack Engineering Retainer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Track Classification *
                  </label>
                  <select
                    value={formData.service_type}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  >
                    <option value="recurring">Recurring Retainer (Monthly / Annual)</option>
                    <option value="fixed_scope">Fixed Scope Deliverable</option>
                    <option value="maintenance">SLA &amp; Annual Maintenance (AMC)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Billing Cadence *
                  </label>
                  <select
                    value={formData.billing_cycle}
                    onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  >
                    <option value="monthly">Monthly Recurring</option>
                    <option value="quarterly">Quarterly Cycle</option>
                    <option value="yearly">Annual Contract</option>
                    <option value="milestone">Milestone Drawdown</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contract Value (₹ INR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min={0}
                      step={500}
                      value={formData.service_value}
                      onChange={(e) => setFormData({ ...formData, service_value: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm font-black focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contract Start Date *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Live Indian GST Breakdown Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Base Taxable Amount:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    ₹{baseValue.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>
                    GST (18% - {isMaharashtra ? 'CGST 9% + SGST 9%' : 'IGST 18%'}):
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    ₹{gstAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/80 dark:border-white/5 flex justify-between font-bold text-sm">
                  <span className="text-slate-900 dark:text-white">Total Gross Invoice Value:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Portal Access & White-Label Branding */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                <Shield className="w-4 h-4 text-primary-500" />
                <span>Client Self-Service Portal Access</span>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-white/[0.02] space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.create_user}
                    onChange={(e) => setFormData({ ...formData, create_user: e.target.checked })}
                    className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block">
                      Generate Client Portal Login Credentials
                    </span>
                    <span className="text-xs text-slate-500">
                      Allows client stakeholders to log in at <code>/client/portal</code> to view tickets, invoices, and deliverables.
                    </span>
                  </div>
                </label>

                {formData.create_user && (
                  <div className="pt-2 border-t border-slate-200/80 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Login Username (Email)
                      </span>
                      <div className="text-xs font-mono bg-white dark:bg-zinc-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-slate-200 truncate">
                        {formData.email || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Initial Temporary Password
                      </span>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required={formData.create_user}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  White-Label Primary Brand Color
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {colorPresets.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setFormData({ ...formData, primary_color: c.hex })}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        formData.primary_color === c.hex
                          ? 'border-slate-900 dark:border-white shadow-xs'
                          : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c.hex }} />
                      <span>{c.name}</span>
                    </button>
                  ))}
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="w-8 h-8 rounded-xl border border-slate-200 dark:border-zinc-800 cursor-pointer p-0.5 bg-transparent"
                    title="Choose custom color"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Navigation Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="gap-1.5 text-xs rounded-xl"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs text-slate-500"
              >
                Cancel
              </Button>
            )}

            {step < 4 ? (
              <Button
                type="submit"
                size="sm"
                className="gap-1.5 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-xs"
              >
                Continue
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20"
              >
                {submitting ? 'Creating Account...' : 'Complete & Onboard Client'}
                <CheckCircle2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
