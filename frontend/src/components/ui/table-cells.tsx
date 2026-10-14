import React from 'react';
import { StatusBadge } from './status-badge';
import { Select } from './select';
import {
  MessageSquare, Phone, Mail, Edit2, Trash2, ArrowUpRight, Building2
} from 'lucide-react';

interface MetaCellProps {
  title: string;
  subtitle?: React.ReactNode;
  contactsCount?: number;
  outcomeStatus?: string;
}

export function MetaCell({ title, subtitle, contactsCount, outcomeStatus }: MetaCellProps) {
  return (
    <div>
      <p className="font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      <div className="flex items-center gap-2 mt-0.5">
        {contactsCount !== undefined && contactsCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <MessageSquare className="w-3 h-3" />
            {contactsCount} contact{contactsCount > 1 ? 's' : ''}
          </span>
        )}
        {outcomeStatus && (
          <StatusBadge 
            status={outcomeStatus} 
            label={outcomeStatus.replace('_', ' ')}
            className="mt-0.5" 
          />
        )}
        {subtitle && <span className="text-[11px] text-slate-400">{subtitle}</span>}
      </div>
    </div>
  );
}

interface ContactCellProps {
  name: string;
  phone?: string | null;
  email?: string | null;
}

export function ContactCell({ name, phone, email }: ContactCellProps) {
  return (
    <div>
      <p className="font-medium text-slate-700 dark:text-slate-300">{name}</p>
      <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 mt-1">
        {phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3"/>{phone}</span>}
        {email && <span className="flex items-center gap-1"><Mail className="w-3 h-3"/>{email}</span>}
      </div>
    </div>
  );
}

interface ActionCellProps {
  onEdit: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onDelete: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isDeleting?: boolean;
}

export function ActionCell({ onEdit, onDelete, isDeleting }: ActionCellProps) {
  return (
    <div className="flex justify-end items-center gap-1.5" onClick={e => e.stopPropagation()}>
      <button
        onClick={onEdit}
        className="p-1.5 rounded-md text-slate-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Edit2 className="w-4 h-4" />
      </button>
      <button
        onClick={onDelete}
        disabled={isDeleting}
        className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 ml-1" />
    </div>
  );
}

interface StatusSelectOption {
  value: string;
  label: string;
}

interface StatusSelectCellProps {
  value: string;
  onChange: (newValue: string, e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: StatusSelectOption[];
  themeMap?: Record<string, string>;
}

const defaultThemes: Record<string, string> = {
  converted: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30',
  lost: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30',
  contacted: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
  new: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/20'
};

export function StatusSelectCell({ value, onChange, options, themeMap = defaultThemes }: StatusSelectCellProps) {
  const themeClass = themeMap[value] || themeMap.new || '';
  return (
    <div onClick={e => e.stopPropagation()}>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value, e)}
        className={`h-7 py-0 pl-2.5 pr-6 rounded-full text-xs font-semibold tracking-wide border cursor-pointer focus:ring-0 ${themeClass}`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </Select>
    </div>
  );
}

interface BusinessCellProps {
  name: string;
  gstNumber?: string | null;
  logoPath?: string | null;
}

export function BusinessCell({ name, gstNumber, logoPath }: BusinessCellProps) {
  return (
    <div className="flex items-center gap-3">
      {logoPath ? (
        <img src={logoPath} alt="Logo" className="w-8 h-8 rounded-md object-contain bg-white/10 shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-md bg-primary-50 dark:bg-primary-500/10 border border-primary-100/50 dark:border-primary-500/20 flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-primary-500 dark:text-primary-400" />
        </div>
      )}
      <div>
        <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{name}</p>
        {gstNumber && (
          <p className="text-[10px] text-slate-500 font-medium tracking-wider mt-0.5">GST: {gstNumber}</p>
        )}
      </div>
    </div>
  );
}
