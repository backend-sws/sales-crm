import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { leadFormSchema, type LeadFormValues } from '@/schemas/lead.schema';
import type { Lead, LeadMetadata } from '@/types/lead.types';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingLead: Lead | null;
  metadata: LeadMetadata;
  onSave: (data: LeadFormValues) => Promise<void>;
  loading?: boolean;
}

export function LeadModal({
  isOpen,
  onClose,
  editingLead,
  metadata,
  onSave,
  loading = false,
}: LeadModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema) as any,
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      alt_phone: '',
      company: '',
      city: '',
      source: 'Website Form',
      source_id: '',
      priority: 'warm',
      status: 'new',
      budget: 100000,
      notes: '',
      assigned_to: '',
      product_ids: [],
    },
  });

  const selectedProductIds = watch('product_ids') || [];

  useEffect(() => {
    if (editingLead) {
      reset({
        name: editingLead.name,
        email: editingLead.email || '',
        phone: editingLead.phone || '',
        alt_phone: editingLead.alt_phone || '',
        company: editingLead.company || '',
        city: editingLead.city || '',
        source: editingLead.source || 'Website Form',
        source_id: editingLead.source_id?.toString() || '',
        priority: editingLead.priority || 'warm',
        status: editingLead.status || 'new',
        budget: typeof editingLead.budget === 'string' ? parseFloat(editingLead.budget) : (editingLead.budget || 0),
        notes: editingLead.notes || '',
        assigned_to: editingLead.assigned_to?.toString() || '',
        product_ids: editingLead.products?.map((p) => p.id) || [],
      });
    } else {
      reset({
        name: '',
        email: '',
        phone: '',
        alt_phone: '',
        company: '',
        city: '',
        source: 'Website Form',
        source_id: metadata.sources[0]?.id?.toString() || '',
        priority: 'warm',
        status: 'new',
        budget: 100000,
        notes: '',
        assigned_to: '',
        product_ids: [],
      });
    }
  }, [editingLead, isOpen, reset, metadata.sources]);

  const toggleProduct = (productId: number) => {
    if (selectedProductIds.includes(productId)) {
      setValue('product_ids', selectedProductIds.filter((id) => id !== productId));
    } else {
      setValue('product_ids', [...selectedProductIds, productId]);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingLead ? 'Edit Lead Profile' : 'Create New Lead'}
      description="Fill in lead details to add or update pipeline opportunity."
    >
      <form onSubmit={handleSubmit(onSave)} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Contact Person *
            </label>
            <Input {...register('name')} placeholder="e.g. Rahul Sharma" />
            {errors.name && <p className="text-[10px] text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Company Name</label>
            <Input {...register('company')} placeholder="e.g. Acme Corp" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Phone</label>
            <Input {...register('phone')} placeholder="+91 98765 43210" />
            {errors.phone && <p className="text-[10px] text-red-500">{errors.phone.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Alt Phone</label>
            <Input {...register('alt_phone')} placeholder="+91 98111 22334" />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Email</label>
            <Input type="email" {...register('email')} placeholder="lead@company.com" />
            {errors.email && <p className="text-[10px] text-red-500">{errors.email.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">City</label>
            <Input {...register('city')} placeholder="Mumbai, Delhi..." />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Priority</label>
            <select
              {...register('priority')}
              className="w-full h-10 px-3 rounded-md bg-transparent border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200"
            >
              <option value="hot">🔥 Hot</option>
              <option value="warm">⚡ Warm</option>
              <option value="cold">❄ Cold</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Budget (INR ₹)</label>
            <Input type="number" {...register('budget')} placeholder="100000" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Lead Source</label>
            <select
              {...register('source_id')}
              className="w-full h-10 px-3 rounded-md bg-transparent border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200"
            >
              <option value="">Select Source</option>
              {metadata.sources.map((s) => (
                <option key={s.id} value={s.id.toString()}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Assigned Agent</label>
            <select
              {...register('assigned_to')}
              className="w-full h-10 px-3 rounded-md bg-transparent border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200"
            >
              <option value="">Auto / Unassigned</option>
              {metadata.agents.map((ag) => (
                <option key={ag.id} value={ag.id.toString()}>
                  {ag.name} ({ag.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Offerings Multi-select */}
        {metadata.products.length > 0 && (
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Interested Offerings
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
              {metadata.products.map((prod) => {
                const isChecked = selectedProductIds.includes(prod.id);
                return (
                  <label key={prod.id} className="flex items-center gap-2 cursor-pointer text-[11px]">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleProduct(prod.id)}
                      className="rounded"
                    />
                    <span className="truncate">{prod.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="font-semibold text-slate-700 dark:text-slate-300">Initial Notes</label>
          <Textarea
            rows={2}
            {...register('notes')}
            placeholder="Requirement summary, preferred contact times..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold"
          >
            {loading ? 'Saving...' : editingLead ? 'Save Changes' : 'Create Lead'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
