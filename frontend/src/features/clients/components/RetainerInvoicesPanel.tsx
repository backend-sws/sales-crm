import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Receipt,
  Download,
  CheckCircle2,
  AlertCircle,
  Plus,
  CreditCard,
  Building,
  Calendar,
  X,
  FileText,
} from 'lucide-react';
import type { InvoiceItem, ClientServiceItem } from '@/api/clients.api';
import { clientsApi } from '@/api/clients.api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface RetainerInvoicesPanelProps {
  clientId: number;
  invoices: InvoiceItem[];
  services: ClientServiceItem[];
  onRefresh: () => void;
}

export const RetainerInvoicesPanel: React.FC<RetainerInvoicesPanelProps> = ({
  clientId,
  invoices,
  services,
  onRefresh,
}) => {
  const [generating, setGenerating] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentData, setPaymentData] = useState({
    paid_amount: 0,
    payment_method: 'bank_transfer',
    notes: 'Payment received via NEFT / UPI',
  });

  // Calculate totals
  const totalBilled = invoices.reduce((acc, inv) => acc + Number(inv.total_amount), 0);
  const totalPaid = invoices.reduce((acc, inv) => acc + Number(inv.paid_amount || 0), 0);
  const outstanding = totalBilled - totalPaid;

  const handleGenerateInvoice = async () => {
    if (!services || services.length === 0) {
      toast.error('No service tracks configured to generate an invoice for.');
      return;
    }

    try {
      setGenerating(true);
      const activeSvc = services[0];
      const res = await clientsApi.generateInvoice(activeSvc.id, {
        notes: `Retainer Billing for ${activeSvc.service_name}`,
      });
      toast.success(`Invoice ${res.data?.invoice_number || 'generated'} successfully!`);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate retainer invoice');
    } finally {
      setGenerating(false);
    }
  };

  const openMarkPaid = (inv: InvoiceItem) => {
    setSelectedInvoice(inv);
    setPaymentData({
      paid_amount: Number(inv.total_amount) - Number(inv.paid_amount || 0),
      payment_method: 'bank_transfer',
      notes: 'Payment confirmed in company account',
    });
    setIsMarkPaidOpen(true);
  };

  const handleMarkPaidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      setPaying(true);
      await clientsApi.markInvoicePaid(selectedInvoice.id, {
        paid_amount: Number(paymentData.paid_amount),
        payment_method: paymentData.payment_method,
        notes: paymentData.notes,
      });
      toast.success(`Invoice ${selectedInvoice.invoice_number} marked as paid!`);
      setIsMarkPaidOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to record payment');
    } finally {
      setPaying(false);
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'paid':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Paid</span>;
      case 'sent':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">Sent</span>;
      case 'overdue':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-600 border border-red-500/20">Overdue</span>;
      case 'partially_paid':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">Partially Paid</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300 capitalize">{s}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Billed</span>
          <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
            ₹{totalBilled.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Collected</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
            ₹{totalPaid.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Outstanding Due</span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
            ₹{outstanding.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tax Invoices &amp; Retainer Cycles</h3>
          <p className="text-xs text-slate-500">Includes auto-computed CGST, SGST &amp; IGST tax breakdown.</p>
        </div>

        <Button
          size="sm"
          isLoading={generating}
          onClick={handleGenerateInvoice}
          className="gap-2 bg-primary-600 hover:bg-primary-700 text-white"
        >
          <Plus className="w-4 h-4" />
          <span>Generate Retainer Invoice</span>
        </Button>
      </div>

      {/* Invoice Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">Invoice #</th>
              <th className="py-3 px-4">Dates</th>
              <th className="py-3 px-4">Base Subtotal</th>
              <th className="py-3 px-4">GST (18%)</th>
              <th className="py-3 px-4">Gross Total</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                  No invoices generated for this client yet.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary-500" />
                      <span>{inv.invoice_number}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    <div>Issued: {new Date(inv.issue_date).toLocaleDateString()}</div>
                    <div className="text-[10px] text-slate-400">Due: {new Date(inv.due_date).toLocaleDateString()}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    ₹{Number(inv.subtotal).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {Number(inv.cgst_amount) > 0 ? (
                      <div>
                        <div>CGST: ₹{Number(inv.cgst_amount).toLocaleString('en-IN')}</div>
                        <div>SGST: ₹{Number(inv.sgst_amount).toLocaleString('en-IN')}</div>
                      </div>
                    ) : (
                      <div>IGST: ₹{Number(inv.igst_amount).toLocaleString('en-IN')}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-black text-slate-900 dark:text-white">
                    ₹{Number(inv.total_amount).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(inv.status)}</td>
                  <td className="py-3 px-4 text-right">
                    {inv.status !== 'paid' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openMarkPaid(inv)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 border-emerald-200 dark:border-emerald-800/40 gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Record Payment</span>
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Record Payment Modal */}
      {isMarkPaidOpen && selectedInvoice && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMarkPaidOpen(false);
          }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Invoice Payment</h3>
                <p className="text-xs text-slate-500">Invoice #{selectedInvoice.invoice_number}</p>
              </div>
              <button
                onClick={() => setIsMarkPaidOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMarkPaidSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Amount Received (₹ INR) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={Number(selectedInvoice.total_amount)}
                  value={paymentData.paid_amount}
                  onChange={(e) => setPaymentData({ ...paymentData, paid_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentData.payment_method}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                >
                  <option value="bank_transfer">Direct Bank Transfer / NEFT / RTGS</option>
                  <option value="upi">UPI / QR Code</option>
                  <option value="credit_card">Corporate Credit Card</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Transaction Notes / Reference
                </label>
                <input
                  type="text"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  placeholder="e.g., UTR / Reference ID"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsMarkPaidOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={paying} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Confirm Payment
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
