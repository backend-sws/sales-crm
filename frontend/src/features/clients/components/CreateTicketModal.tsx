import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { clientsApi, type ServiceRequestItem } from '@/api/clients.api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
            <PlusCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Create Service Ticket
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Track: {serviceName}
            </p>
          </div>
        </div>
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Ticket Title / Deliverable <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            placeholder="e.g. Update Homepage Hero banner & CTAs"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            >
              <option value="low">Low (Normal backlog)</option>
              <option value="medium">Medium (Standard SLA)</option>
              <option value="high">High (48h turnaround)</option>
              <option value="urgent">Urgent (24h blocker)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              SLA Target Date
            </label>
            <input
              type="date"
              value={formData.sla_deadline}
              onChange={(e) => setFormData({ ...formData, sla_deadline: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Description &amp; Acceptance Criteria <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            placeholder="Describe deliverables, required assets, and specifications..."
          />
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2.5">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={submitting} className="bg-primary-600 hover:bg-primary-700 text-white">
            Create Ticket
          </Button>
        </div>
      </form>
    </Modal>
  );
};
