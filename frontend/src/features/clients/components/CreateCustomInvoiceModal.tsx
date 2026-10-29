import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Building,
  CheckCircle2,
  FileText,
  CreditCard,
  DollarSign,
  Layers,
} from 'lucide-react';
import { clientsApi, type InvoiceItem, type ClientServiceItem, type InvoiceLineItem } from '@/api/clients.api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';

interface CreateCustomInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number;
  clientName?: string;
  clientCompany?: string;
  clientState?: string;
  services: ClientServiceItem[];
  onSuccess: (invoice: InvoiceItem) => void;
}

export const CreateCustomInvoiceModal: React.FC<CreateCustomInvoiceModalProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  clientCompany,
  clientState = 'Delhi',
  services = [],
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [applyGst, setApplyGst] = useState<boolean>(true);
  const [selectedServiceId, setSelectedServiceId] = useState<number | ''>(
    services.length > 0 ? services[0].id : ''
  );

  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });

  const [notes, setNotes] = useState(
    'Payment due within 15 days of invoice date. Bank transfer via NEFT/RTGS or UPI preferred.'
  );

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(() => {
    if (services.length > 0) {
      const first = services[0];
      return [
        {
          description: `${first.service_name} (${first.billing_cycle || 'milestone'} billing)`,
          hsn_sac: '998314',
          quantity: 1,
          unit_price: Number(first.value) || 25000,
          amount: Number(first.value) || 25000,
        },
      ];
    }
    return [
      {
        description: 'Software Engineering & Cloud Architecture Retainer',
        hsn_sac: '998314',
        quantity: 1,
        unit_price: 25000,
        amount: 25000,
      },
    ];
  });

  // Calculate Subtotal & GST
  const subtotal = lineItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const isHomeState = clientState?.trim().toLowerCase() === 'maharashtra';
  const cgst = applyGst && isHomeState ? Math.round(subtotal * 0.09) : 0;
  const sgst = applyGst && isHomeState ? Math.round(subtotal * 0.09) : 0;
  const igst = applyGst && !isHomeState ? Math.round(subtotal * 0.18) : 0;
  const grandTotal = subtotal + cgst + sgst + igst;

  const handleServiceSelect = (svcId: number | '') => {
    setSelectedServiceId(svcId);
    if (svcId) {
      const svc = services.find((s) => s.id === svcId);
      if (svc) {
        setLineItems([
          {
            description: `${svc.service_name} (${svc.billing_cycle || 'milestone'} deliverable)`,
            hsn_sac: '998314',
            quantity: 1,
            unit_price: Number(svc.value) || 25000,
            amount: Number(svc.value) || 25000,
          },
        ]);
      }
    }
  };

  const handleItemChange = (index: number, field: keyof InvoiceLineItem, val: any) => {
    setLineItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: val };

      // Recalculate amount if qty or unit_price changes
      if (field === 'quantity' || field === 'unit_price') {
        const qty = Number(field === 'quantity' ? val : target.quantity) || 1;
        const price = Number(field === 'unit_price' ? val : target.unit_price) || 0;
        target.amount = Math.round(qty * price);
      }

      copy[index] = target;
      return copy;
    });
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        description: '',
        hsn_sac: '998314',
        quantity: 1,
        unit_price: 5000,
        amount: 5000,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) {
      toast.error('Invoice must contain at least 1 line item');
      return;
    }
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lineItems.length === 0 || subtotal <= 0) {
      toast.error('Please enter valid line items with price greater than 0.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await clientsApi.createCustomInvoice(clientId, {
        client_service_id: selectedServiceId ? Number(selectedServiceId) : null,
        issue_date: issueDate,
        due_date: dueDate,
        apply_gst: applyGst,
        notes: notes,
        line_items: lineItems,
      });

      toast.success(`${applyGst ? 'GST Tax Invoice' : 'Commercial Invoice (Non-GST)'} #${res.data?.invoice_number || 'created'} issued successfully!`);
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            applyGst ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400' : 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-slate-300'
          }`}>
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {applyGst ? 'Create GST Tax Invoice' : 'Create Commercial Invoice (Without GST)'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {applyGst
                ? `Itemize deliverables, set custom prices, and compute 18% GST for ${clientCompany || clientName || 'Client'}`
                : `Itemize deliverables, set custom prices without GST (0% / Exempt) for ${clientCompany || clientName || 'Client'}`}
            </p>
          </div>
        </div>
      }
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tax Mode Toggle: With GST vs Without GST */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
              applyGst ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/25' : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-slate-300'
            }`}>
              {applyGst ? 'GST' : '0%'}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                {applyGst ? 'GST Tax Invoice (18% GST Applicable)' : 'Non-GST / Commercial Bill (0% GST / Exempt)'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {applyGst
                  ? (isHomeState ? 'Intra-state Maharashtra (9% CGST + 9% SGST)' : `Inter-state ${clientState} (18% IGST)`)
                  : 'Total Invoice Amount will equal Base Subtotal (No Tax)'}
              </span>
            </div>
          </div>

          <div className="inline-flex rounded-xl bg-white dark:bg-zinc-900 p-1 border border-slate-200 dark:border-zinc-800 shadow-xs shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setApplyGst(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                applyGst
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              With GST (18%)
            </button>
            <button
              type="button"
              onClick={() => setApplyGst(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !applyGst
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Without GST (0%)
            </button>
          </div>
        </div>

        {/* Meta Row: Service Track, Issue Date, Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Associated Service Track
            </label>
            <select
              value={selectedServiceId}
              onChange={(e) => handleServiceSelect(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">-- Ad-hoc / Custom Scope --</option>
              {services.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.service_name} (₹{svc.value.toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Issue Date
            </label>
            <input
              type="date"
              required
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Due Date
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Itemized Line Items Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Itemized Deliverables &amp; Service Pricing
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addLineItem}
              className="text-xs gap-1.5 h-7 px-2.5 rounded-lg border-primary-500/30 text-primary-600 dark:text-primary-400 hover:bg-primary-500/10"
            >
              <Plus className="w-3 h-3" />
              <span>Add Item</span>
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-zinc-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Service / Deliverable Description</th>
                  <th className="py-2.5 px-2 w-24 text-center">HSN/SAC</th>
                  <th className="py-2.5 px-2 w-16 text-center">Qty</th>
                  <th className="py-2.5 px-3 w-28 text-right">Rate (₹)</th>
                  <th className="py-2.5 px-3 w-28 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {lineItems.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="e.g. CAB SERVICE - Milestone 1 / Cloud Architecture"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder:text-slate-400"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.hsn_sac || ''}
                        onChange={(e) => handleItemChange(index, 'hsn_sac', e.target.value)}
                        placeholder="998314"
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-transparent text-xs text-center font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-transparent text-xs text-center font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-transparent text-xs text-right font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-black text-slate-900 dark:text-white">
                      ₹{(Number(item.amount) || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length === 1}
                        className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                        title="Remove Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes & Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Notes &amp; Payment Instructions
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder:text-slate-400"
              placeholder="e.g. Bank Account: HDFC Bank A/C: 50200088992211, IFSC: HDFC0001234"
            />
          </div>

          <div className="w-full sm:w-64 space-y-2 text-xs self-end justify-self-end">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Base Subtotal:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                ₹{subtotal.toLocaleString('en-IN')}
              </span>
            </div>

            {applyGst ? (
              isHomeState ? (
                <>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Central Tax (CGST 9%):</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      ₹{cgst.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>State Tax (SGST 9%):</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      ₹{sgst.toLocaleString('en-IN')}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Integrated Tax (IGST 18%):</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ₹{igst.toLocaleString('en-IN')}
                  </span>
                </div>
              )
            ) : (
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>GST (0% Non-GST):</span>
                <span className="font-semibold text-slate-500">
                  ₹0 (Exempt)
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex justify-between text-sm font-black text-slate-900 dark:text-white">
              <span>Total Invoice Value:</span>
              <span className="text-primary-600 dark:text-primary-400">
                ₹{grandTotal.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 text-right">
              {applyGst
                ? `Tax Rule: ${isHomeState ? 'Maharashtra Intra-State (CGST+SGST)' : `Inter-State (${clientState})`}`
                : 'Tax Rule: Non-GST / 0% Tax Supply'}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-white/10">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={submitting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={submitting}
            className="text-xs gap-1.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-sm"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Generate &amp; Issue Invoice</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
