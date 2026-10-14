import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, PlusCircle, AlertCircle, Calendar, Flag } from 'lucide-react';
import { clientsApi, type ServiceRequestItem } from '@/api/clients.api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: number;
  serviceName: string;
  onSuccess: (ticket: ServiceRequestItem) => void;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  serviceId,
  serviceName,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    sla_deadline: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await clientsApi.createTicket(serviceId, {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        sla_deadline: formData.sla_deadline ? `${formData.sla_deadline} 18:00:00` : null,
      });

      toast.success(`Ticket #${res.data?.ticket_number || 'created'} logged successfully!`);
      onSuccess(res.data);
      onClose();
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        sla_deadline: '',
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to create ticket.';
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
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-lg overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Create Service Ticket / Task
              </h3>
              <p className="text-xs text-slate-500">Track: {serviceName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ticket Title / Deliverable *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
              placeholder="e.g., Update Homepage Hero banner & CTAs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
              >
                <option value="low">Low (Normal backlog)</option>
                <option value="medium">Medium (Standard SLA)</option>
                <option value="high">High (48h turnaround)</option>
                <option value="urgent">Urgent (24h blocker)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                SLA Target Date
              </label>
              <input
                type="date"
                value={formData.sla_deadline}
                onChange={(e) => setFormData({ ...formData, sla_deadline: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description &amp; Acceptance Criteria *
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
              placeholder="Describe deliverables, required assets, and specifications..."
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={submitting} className="bg-primary-600 hover:bg-primary-700 text-white">
              Create Ticket
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
