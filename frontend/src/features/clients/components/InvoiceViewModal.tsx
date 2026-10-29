import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  X,
  CheckCircle2,
  Building,
  CreditCard,
  FileText,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import type { InvoiceItem } from '@/api/clients.api';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/formatters';

interface InvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceItem | null;
  clientCompany?: string;
  clientName?: string;
  clientGst?: string | null;
  clientAddress?: string | null;
  clientState?: string | null;
  onRecordPayment?: (invoice: InvoiceItem) => void;
  isStaff?: boolean;
}

// Convert numbers to Indian English Words
const numberToWords = (num: number): string => {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen ',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = ('000000000' + Math.floor(num)).substr(-9);
  const match = n.match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!match) return '';

  let str = '';
  const crore = Number(match[1]);
  const lakh = Number(match[2]);
  const thousand = Number(match[3]);
  const hundred = Number(match[4]);
  const tens = Number(match[5]);

  str += crore !== 0 ? (a[crore] || `${b[Math.floor(crore / 10)]} ${a[crore % 10]}`) + 'Crore ' : '';
  str += lakh !== 0 ? (a[lakh] || `${b[Math.floor(lakh / 10)]} ${a[lakh % 10]}`) + 'Lakh ' : '';
  str += thousand !== 0 ? (a[thousand] || `${b[Math.floor(thousand / 10)]} ${a[thousand % 10]}`) + 'Thousand ' : '';
  str += hundred !== 0 ? a[hundred] + 'Hundred ' : '';
  str += tens !== 0 ? ((str !== '' ? 'and ' : '') + (a[tens] || `${b[Math.floor(tens / 10)]} ${a[tens % 10]}`)) : '';

  return str.trim() ? `Indian Rupees ${str.trim()} Only` : 'Indian Rupees Zero Only';
};

const formatINR = (num: number): string => {
  return Number(num || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  isOpen,
  onClose,
  invoice,
  clientCompany,
  clientName,
  clientGst,
  clientAddress,
  clientState,
  onRecordPayment,
  isStaff = false,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const lineItems = invoice.line_items && invoice.line_items.length > 0
    ? invoice.line_items
    : [
      {
        description: invoice.notes || (invoice.service?.service_name ? `${invoice.service.service_name} (${invoice.service.billing_cycle || 'milestone'})` : 'Professional Software Engineering Services'),
        hsn_sac: '998314',
        quantity: 1,
        unit_price: Number(invoice.subtotal),
        amount: Number(invoice.subtotal),
      },
    ];

  const subtotal = Number(invoice.subtotal) || 0;
  const cgst = Number(invoice.cgst_amount) || 0;
  const sgst = Number(invoice.sgst_amount) || 0;
  const igst = Number(invoice.igst_amount) || 0;
  const hasGst = cgst > 0 || sgst > 0 || igst > 0;
  const total = Number(invoice.total_amount) || (subtotal + cgst + sgst + igst);
  const paid = Number(invoice.paid_amount) || 0;
  const balanceDue = Math.max(0, total - paid);

  const isPaid = invoice.status === 'paid' || balanceDue <= 0;

  const resolvedCompany = clientCompany || invoice.client?.company || 'Client Organization';
  const resolvedName = clientName || invoice.client?.name || 'Authorized Signatory';
  const resolvedGst = clientGst || invoice.client?.gst_number || 'Unregistered / Non-GST';
  const resolvedAddress = clientAddress || invoice.client?.billing_address || null;
  const resolvedState = clientState || invoice.client?.billing_state || 'Delhi (State Code: 07)';

  const banking = invoice.banking_details;
  const hasBankingDetails = Boolean(
    banking && (banking.bank_name || banking.bank_account_no || banking.bank_ifsc || banking.bank_upi_id)
  );

  // Renders the clean, professional corporate invoice layout
  const renderInvoiceDocument = (isPrint: boolean) => (
    <div className={`w-full bg-white text-slate-900 ${isPrint ? 'p-0 text-[11px] leading-normal' : 'p-6 sm:p-10 text-xs dark:bg-slate-950 dark:text-slate-100'} font-sans`}>
      {/* 1. Header: Brand Info & Invoice Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5 mb-5">
        <div className="space-y-1.5 max-w-[60%]">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm tracking-wider">
              SC
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                SalesCRM Digital Solutions Pvt. Ltd.
              </h1>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                Enterprise Software Engineering &amp; Retainer Advisory
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Corporate Office: Tech Park, Sector 62, Noida (NCR) &amp; BKC, Mumbai - 400051<br />
            {hasGst && <><span className="font-bold text-slate-800 dark:text-slate-200">GSTIN: 27AABCS1429B1Z8</span> • </>}
            <span className="font-semibold text-slate-700 dark:text-slate-300">PAN: AABCS1429B</span> • CIN: U72200MH2024PTC123456<br />
            Email: billing@salescrm.com • Website: www.salescrm.com
          </p>
        </div>

        <div className="text-right">
          <div className="inline-block mb-1.5">
            <span className={`inline-block px-3 py-1 rounded-md text-[11px] font-black tracking-widest uppercase border ${
              hasGst 
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900' 
                : 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-slate-200'
            }`}>
              {hasGst ? 'TAX INVOICE' : 'COMMERCIAL INVOICE'}
            </span>
            <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">
              {hasGst ? 'Original for Recipient' : 'Bill of Supply (Non-GST)'}
            </div>
          </div>

          <div className="mt-2 space-y-0.5 text-xs">
            <div className="font-mono text-sm font-black text-slate-900 dark:text-white">
              {invoice.invoice_number}
            </div>
            <div className="text-slate-600 dark:text-slate-400 text-[11px]">
              <span className="font-medium">Date: </span>
              <strong className="text-slate-900 dark:text-white">{formatDate(invoice.issue_date)}</strong>
            </div>
            <div className="text-slate-600 dark:text-slate-400 text-[11px]">
              <span className="font-medium">Due Date: </span>
              <strong className="text-amber-700 dark:text-amber-400">{formatDate(invoice.due_date)}</strong>
            </div>
            <div>
              {isPaid ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-2.5 h-2.5" /> PAID IN FULL
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                  <Clock className="w-2.5 h-2.5" /> PAYMENT PENDING
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Client & Place of Supply Grid */}
      <div className="grid grid-cols-2 gap-6 bg-slate-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-slate-200 dark:border-white/10 mb-5">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
            BILLED TO (BUYER / CUSTOMER):
          </span>
          <h2 className="text-sm font-black text-slate-900 dark:text-white">
            {resolvedCompany}
          </h2>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-0.5">
            Attn: {resolvedName}
          </p>
          {resolvedAddress && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 whitespace-pre-line leading-relaxed">
              {resolvedAddress}
            </p>
          )}
          <div className="mt-1.5 space-y-0.5 text-[11px]">
            <p className="text-slate-600 dark:text-slate-400">
              State / UT: <strong className="text-slate-800 dark:text-slate-200">{resolvedState}</strong>
            </p>
            <p className="text-slate-600 dark:text-slate-400 font-mono">
              GSTIN / Tax ID: <strong className="text-slate-800 dark:text-slate-200">{resolvedGst}</strong>
            </p>
          </div>
        </div>

        <div className="border-l border-slate-200 dark:border-white/10 pl-6 space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
            SUPPLY &amp; ENGAGEMENT METRICS:
          </span>
          <div className="text-[11px] space-y-1">
            <div className="flex justify-between py-0.5 border-b border-slate-200/60 dark:border-white/5">
              <span className="text-slate-500">Place of Supply:</span>
              <strong className="text-slate-800 dark:text-slate-200">{resolvedState}</strong>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-200/60 dark:border-white/5">
              <span className="text-slate-500">Service Category:</span>
              <strong className="text-slate-800 dark:text-slate-200">Information Technology &amp; Retainer Services</strong>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-200/60 dark:border-white/5">
              <span className="text-slate-500">Invoice Classification:</span>
              <strong className="text-slate-800 dark:text-slate-200">{hasGst ? 'GST Tax Invoice (18%)' : 'Commercial Bill (Non-GST / 0%)'}</strong>
            </div>
            {invoice.paid_at && (
              <div className="flex justify-between py-0.5 text-emerald-700 dark:text-emerald-400">
                <span>Payment Received Date:</span>
                <strong>{formatDate(invoice.paid_at)}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Itemized Services Table */}
      <div className="mb-5 border border-slate-300 dark:border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
              <th className="py-2.5 px-3 w-10 text-center border-r border-slate-800">#</th>
              <th className="py-2.5 px-4 border-r border-slate-800">Description of Services / Deliverable</th>
              <th className="py-2.5 px-3 w-20 text-center border-r border-slate-800">HSN/SAC</th>
              <th className="py-2.5 px-3 w-14 text-center border-r border-slate-800">Qty</th>
              <th className="py-2.5 px-4 w-28 text-right border-r border-slate-800">Unit Rate (₹)</th>
              <th className="py-2.5 px-4 w-32 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10 text-xs">
            {lineItems.map((item: any, i: number) => {
              const qty = Number(item.quantity) || 1;
              const rate = Number(item.unit_price) || (Number(item.amount) / qty);
              const amt = Number(item.amount) || (qty * rate);

              return (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 text-center font-mono text-slate-500 border-r border-slate-200 dark:border-white/5">
                    {i + 1}
                  </td>
                  <td className="py-3 px-4 border-r border-slate-200 dark:border-white/5">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {item.description}
                    </span>
                    <span className="text-[10px] text-slate-400">Deliverable scope verified &amp; approved</span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-white/5">
                    {item.hsn_sac || (hasGst ? '998314' : 'Exempt')}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-white/5">
                    {qty}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-white/5">
                    {formatINR(rate)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                    {formatINR(amt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 4. Financial Calculations & Words/Remittance Grid */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="space-y-3">
          {/* Amount in words */}
          <div className="p-3 bg-slate-50 dark:bg-zinc-900/40 rounded-xl border border-slate-200 dark:border-white/10 text-xs">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">
              TOTAL AMOUNT IN WORDS (INR):
            </span>
            <p className="font-bold text-slate-900 dark:text-slate-100 italic">
              {numberToWords(total)}
            </p>
          </div>

          {/* Dynamic Bank Remittance Box (Rendered ONLY if admin configured in Settings) */}
          {hasBankingDetails && banking && (
            <div className="p-3 bg-slate-50 dark:bg-zinc-900/40 rounded-xl border border-slate-200 dark:border-white/10 text-[11px] space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                REMITTANCE &amp; BANK TRANSFER DETAILS:
              </span>
              {(banking.bank_name || banking.bank_branch) && (
                <p className="text-slate-800 dark:text-slate-200">
                  {banking.bank_name && <><strong>Bank Name:</strong> {banking.bank_name}</>}
                  {banking.bank_branch && <> • <strong>Branch:</strong> {banking.bank_branch}</>}
                </p>
              )}
              {banking.bank_account_name && (
                <p className="text-slate-800 dark:text-slate-200">
                  <strong>Account Name:</strong> {banking.bank_account_name}
                </p>
              )}
              {(banking.bank_account_no || banking.bank_ifsc) && (
                <p className="text-slate-800 dark:text-slate-200 font-mono">
                  {banking.bank_account_no && <><strong>A/C No:</strong> {banking.bank_account_no}</>}
                  {banking.bank_ifsc && <> • <strong>IFSC:</strong> {banking.bank_ifsc}</>}
                </p>
              )}
              {banking.bank_upi_id && (
                <p className="text-slate-800 dark:text-slate-200">
                  <strong>UPI VPA:</strong> {banking.bank_upi_id}
                </p>
              )}
            </div>
          )}

          {/* Commercial Notes / Terms */}
          <div className="text-[10.5px] text-slate-500 leading-relaxed space-y-0.5">
            <strong className="text-slate-700 dark:text-slate-300 block text-[11px]">Terms &amp; Conditions:</strong>
            <p>1. Please quote invoice number during wire transfer or remittance.</p>
            <p>2. Payment is due within the stipulated period. Discrepancies if any must be raised within 48 hours.</p>
            {invoice.notes && <p className="font-medium text-slate-700 dark:text-slate-300">Note: {invoice.notes}</p>}
          </div>
        </div>

        {/* Right Financials Table */}
        <div className="space-y-2 text-xs">
          <div className="bg-slate-50 dark:bg-zinc-900/40 rounded-xl p-3.5 border border-slate-200 dark:border-white/10 space-y-2">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="font-medium">{hasGst ? 'Taxable Subtotal:' : 'Base Subtotal:'}</span>
              <strong className="text-slate-900 dark:text-white font-mono">₹{formatINR(subtotal)}</strong>
            </div>

            {hasGst ? (
              cgst > 0 ? (
                <>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                    <span>Central Tax (CGST @ 9%):</span>
                    <strong className="text-slate-900 dark:text-white font-mono">₹{formatINR(cgst)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                    <span>State Tax (SGST @ 9%):</span>
                    <strong className="text-slate-900 dark:text-white font-mono">₹{formatINR(sgst)}</strong>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                  <span>Integrated Tax (IGST @ 18%):</span>
                  <strong className="text-slate-900 dark:text-white font-mono">₹{formatINR(igst)}</strong>
                </div>
              )
            ) : (
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Goods &amp; Services Tax (GST 0%):</span>
                <span className="font-semibold text-slate-500">₹0.00 (Exempt / Non-GST)</span>
              </div>
            )}

            <div className="pt-2 border-t-2 border-slate-800 dark:border-white/20 flex justify-between items-baseline text-sm">
              <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Total Invoice Value:</span>
              <span className="font-black text-base text-slate-900 dark:text-white font-mono">
                ₹{formatINR(total)}
              </span>
            </div>

            {paid > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold pt-1 text-[11px]">
                <span>Amount Paid:</span>
                <span className="font-mono">₹{formatINR(paid)}</span>
              </div>
            )}

            {balanceDue > 0 && paid > 0 && (
              <div className="flex justify-between text-amber-800 dark:text-amber-400 font-black pt-1 border-t border-dashed text-xs">
                <span>Balance Due:</span>
                <span className="font-mono">₹{formatINR(balanceDue)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Footer & Authorized Signatory */}
      <div className="flex justify-between items-end border-t border-slate-300 dark:border-white/10 pt-4 mt-6">
        <div className="text-[10px] text-slate-400 max-w-sm leading-relaxed">
          <p className="flex items-center gap-1 font-bold text-slate-500 uppercase tracking-wider mb-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Statutory Compliance Note
          </p>
          This is an official electronic tax document generated pursuant to Section 31 of CGST Act, 2017 &amp; Information Technology Act, 2000.
        </div>

        <div className="text-right">
          <div className="inline-block text-center pt-2">
            <span className="font-bold text-slate-900 dark:text-white block text-xs">
              For SalesCRM Digital Solutions Pvt. Ltd.
            </span>
            <div className="my-1.5 py-1 px-3 rounded border border-emerald-600/30 bg-emerald-50 text-emerald-800 text-[10px] font-bold tracking-wider uppercase inline-block">
              ✓ Digitally Authorized &amp; Signed
            </div>
            <span className="text-[10px] text-slate-400 block">
              Authorized Signatory
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(
    <>
      {/* ========================================================================= */}
      {/* 1. INTERACTIVE ON-SCREEN MODAL (Hidden in print) */}
      {/* ========================================================================= */}
      <div
        className="print:hidden fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-5 overflow-hidden animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="relative w-full max-w-4xl bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Action Bar */}
          <div className="shrink-0 px-4 sm:px-6 py-3 bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-600 flex items-center justify-center font-bold text-xs shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {hasGst ? `Tax Invoice ${invoice.invoice_number}` : `Commercial Invoice ${invoice.invoice_number}`}
                  </h3>
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5" /> PAID
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">
                      <Clock className="w-2.5 h-2.5" /> PAYMENT PENDING
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  Billed to <span className="font-semibold text-slate-700 dark:text-slate-300">{resolvedCompany}</span> · Due {formatDate(invoice.due_date)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 shadow-sm text-xs font-semibold h-8 px-3.5 rounded-xl"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </Button>

              {isStaff && !isPaid && onRecordPayment && (
                <Button
                  size="sm"
                  onClick={() => onRecordPayment(invoice)}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs font-semibold h-8 px-3 rounded-xl"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </Button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors ml-1"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* On-Screen Scrollable Document Container */}
          <div className="overflow-y-auto p-4 sm:p-8 bg-slate-100/80 dark:bg-zinc-950/80 custom-scrollbar flex-1 flex justify-center">
            <div className="w-full max-w-3xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl shadow-md border border-slate-200 dark:border-white/10">
              {renderInvoiceDocument(false)}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DEDICATED PRINTABLE DOCUMENT (Hidden on screen, Visible ONLY in print) */}
      {/* ========================================================================= */}
      <div id="invoice-printable-document" className="hidden print:block">
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm 12mm 10mm 12mm;
            }
            html, body {
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #0f172a !important;
              overflow: visible !important;
            }
            body > *:not(#invoice-printable-document) {
              display: none !important;
            }
            #invoice-printable-document {
              display: block !important;
              position: static !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #0f172a !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            table {
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            thead {
              display: table-header-group;
            }
          }
        `}</style>
        {renderInvoiceDocument(true)}
      </div>
    </>,
    document.body
  );
};
