import React, { useState } from 'react';
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
  Printer,
  Trash2,
  Sparkles,
  Eye,
  Layers,
} from 'lucide-react';
import type { InvoiceItem, ClientServiceItem } from '@/api/clients.api';
import { clientsApi } from '@/api/clients.api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { CreateCustomInvoiceModal } from './CreateCustomInvoiceModal';
import { InvoiceViewModal } from './InvoiceViewModal';
import { toast } from 'sonner';
import { formatDate, formatDateWithDays } from '@/lib/formatters';
import { useAuthStore } from '@/store/authStore';

interface RetainerInvoicesPanelProps {
  clientId: number;
  clientName?: string;
  clientCompany?: string;
  clientGst?: string | null;
  clientAddress?: string | null;
  clientState?: string | null;
  invoices: InvoiceItem[];
  services: ClientServiceItem[];
  onRefresh: () => void;
  isClient?: boolean;
}

export const RetainerInvoicesPanel: React.FC<RetainerInvoicesPanelProps> = ({
  clientId,
  clientName,
  clientCompany,
  clientGst,
  clientAddress,
  clientState = 'Delhi',
  invoices,
  services,
  onRefresh,
  isClient: explicitIsClient,
}) => {
  const { user } = useAuthStore();
  const isClient = explicitIsClient !== undefined ? explicitIsClient : Boolean(
    user?.roles?.includes('client') ||
    user?.client_id ||
    (!user?.roles?.some((r) => ['super_admin', 'admin', 'project_manager', 'developer', 'account_manager', 'sales_manager'].includes(r)))
  );
  const isStaff = Boolean(
    user?.roles?.some((r) => ['super_admin', 'admin', 'project_manager', 'developer', 'account_manager', 'sales_manager'].includes(r))
  );

  const [generating, setGenerating] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceItem | null>(null);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
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

  const handleDeleteInvoice = async (invoiceId: number) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(invoiceId);
      await clientsApi.deleteInvoice(invoiceId);
      toast.success('Invoice deleted successfully');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete invoice');
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewInvoice = async (inv: InvoiceItem) => {
    setPreviewInvoice(inv);
    try {
      const res = await clientsApi.getInvoice(inv.id);
      if (res?.data) {
        setPreviewInvoice(res.data);
      }
    } catch {
      // keep current inv
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tax Invoices &amp; Retainer Cycles</h3>
          <p className="text-xs text-slate-500">Itemized services, prices, and auto-computed CGST, SGST &amp; IGST tax breakdown.</p>
        </div>

        {isStaff && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsCreateInvoiceOpen(true)}
              className="gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom Invoice</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              isLoading={generating}
              onClick={handleGenerateInvoice}
              className="gap-1.5 text-xs text-slate-600 dark:text-slate-300"
              title="Fast 1-click generation from current retainer contract"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary-500" />
              <span>Quick Retainer</span>
            </Button>
          </div>
        )}
      </div>

      {/* Invoice Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">Invoice #</th>
              <th className="py-3 px-4">Service Scope &amp; Items</th>
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
                <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                  No invoices generated for this client yet.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => {
                const firstItem = inv.line_items && inv.line_items[0];
                const totalItems = inv.line_items?.length || 0;
                const descText = firstItem?.description || inv.notes || 'Professional Deliverables';

                return (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-primary-500" />
                        <span
                          onClick={() => handleViewInvoice(inv)}
                          className="hover:underline hover:text-primary-600 cursor-pointer"
                        >
                          {inv.invoice_number}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 min-w-[200px]">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1" title={descText}>
                        {descText}
                      </div>
                      {totalItems > 1 && (
                        <span className="text-[10px] text-primary-600 dark:text-primary-400 font-medium">
                          +{totalItems - 1} more line item{totalItems > 2 ? 's' : ''}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      <div>Issued: {formatDate(inv.issue_date)}</div>
                      <div className="text-[10px] text-slate-400">Due: {formatDateWithDays(inv.due_date)}</div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      ₹{Number(inv.subtotal).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {Number(inv.cgst_amount) > 0 ? (
                        <div>
                          <div>CGST: ₹{Number(inv.cgst_amount).toLocaleString('en-IN')}</div>
                          <div>SGST: ₹{Number(inv.sgst_amount).toLocaleString('en-IN')}</div>
                        </div>
                      ) : Number(inv.igst_amount) > 0 ? (
                        <div>IGST: ₹{Number(inv.igst_amount).toLocaleString('en-IN')}</div>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-500">
                          Non-GST (0%)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-black text-slate-900 dark:text-white whitespace-nowrap">
                      ₹{Number(inv.total_amount).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4">{getStatusBadge(inv.status)}</td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewInvoice(inv)}
                          className="text-xs gap-1.5 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
                          title="View &amp; Print Tax Invoice"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span>View / Print</span>
                        </Button>

                        {inv.status !== 'paid' ? (
                          isStaff ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openMarkPaid(inv)}
                                className="text-xs text-emerald-600 hover:text-emerald-700 border-emerald-200 dark:border-emerald-800/40 gap-1"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Pay</span>
                              </Button>
                              <button
                                type="button"
                                onClick={() => handleDeleteInvoice(inv.id)}
                                disabled={deletingId === inv.id}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                title="Delete draft invoice"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-lg">
                              Pending
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Custom Invoice Modal */}
      {isCreateInvoiceOpen && (
        <CreateCustomInvoiceModal
          isOpen={isCreateInvoiceOpen}
          onClose={() => setIsCreateInvoiceOpen(false)}
          clientId={clientId}
          clientName={clientName}
          clientCompany={clientCompany}
          clientState={clientState || 'Delhi'}
          services={services}
          onSuccess={() => {
            setIsCreateInvoiceOpen(false);
            onRefresh();
          }}
        />
      )}

      {/* Invoice View & Print Modal */}
      {previewInvoice && (
        <InvoiceViewModal
          isOpen={Boolean(previewInvoice)}
          onClose={() => setPreviewInvoice(null)}
          invoice={previewInvoice}
          clientCompany={clientCompany}
          clientName={clientName}
          clientGst={clientGst}
          clientAddress={clientAddress}
          clientState={clientState}
          isStaff={isStaff}
          onRecordPayment={(inv) => {
            setPreviewInvoice(null);
            openMarkPaid(inv);
          }}
        />
      )}

      {/* Record Payment Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={isMarkPaidOpen}
          onClose={() => setIsMarkPaidOpen(false)}
          title={
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Record Invoice Payment
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                  Invoice #{selectedInvoice.invoice_number} · Total ₹{Number(selectedInvoice.total_amount).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          }
          maxWidth="md"
        >
          <form onSubmit={handleMarkPaidSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Amount Received (₹ INR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                max={Number(selectedInvoice.total_amount)}
                value={paymentData.paid_amount}
                onChange={(e) => setPaymentData({ ...paymentData, paid_amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentData.payment_method}
                onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                <option value="bank_transfer">Direct Bank Transfer / NEFT / RTGS</option>
                <option value="upi">UPI / QR Code</option>
                <option value="credit_card">Corporate Credit Card</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Transaction Notes / Reference
              </label>
              <input
                type="text"
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="e.g., UTR / Reference ID"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2.5">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsMarkPaidOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={paying} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Confirm Payment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
