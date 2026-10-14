import React, { useState } from 'react';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Filter,
  CheckCircle2,
  Play,
  RotateCcw,
  User,
  Tag,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import type { ClientServiceItem, ServiceRequestItem } from '@/api/clients.api';
import { clientsApi } from '@/api/clients.api';
import { Button } from '@/components/ui/button';
import { CreateTicketModal } from './CreateTicketModal';
import { toast } from 'sonner';

interface ServiceTicketsPanelProps {
  services: ClientServiceItem[];
  onRefresh: () => void;
}

export const ServiceTicketsPanel: React.FC<ServiceTicketsPanelProps> = ({
  services,
  onRefresh,
}) => {
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    services.length > 0 ? services[0].id : null
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const activeService = services.find((s) => s.id === selectedServiceId) || services[0];
  const allTickets = activeService?.requests || [];

  const filteredTickets = allTickets.filter((t) => {
    if (statusFilter === 'all') return true;
    return t.status === statusFilter;
  });

  const handleStatusChange = async (ticketId: number, newStatus: string) => {
    try {
      setUpdatingId(ticketId);
      await clientsApi.updateTicketStatus(ticketId, newStatus);
      toast.success(`Ticket status updated to ${newStatus.replace('_', ' ').toUpperCase()}`);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update ticket status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClientConfirm = async (ticketId: number) => {
    try {
      setUpdatingId(ticketId);
      await clientsApi.confirmTicket(ticketId);
      toast.success('Ticket marked as Confirmed & Closed!');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to confirm ticket');
    } finally {
      setUpdatingId(null);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-500/20">Urgent</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-500 border border-slate-500/20">Low</span>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'open':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">Open</span>;
      case 'in_progress':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">In Progress</span>;
      case 'done':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">Delivered (Pending Client)</span>;
      case 'confirmed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Confirmed ✓</span>;
      case 'closed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-600 dark:bg-white/5 dark:text-slate-400">Closed</span>;
      default:
        return <span>{s}</span>;
    }
  };

  if (!services || services.length === 0) {
    return (
      <div className="p-8 text-center rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
        <p className="text-sm font-semibold text-slate-500">No active service tracks found for this client account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Service Track Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
        {services.map((svc) => (
          <button
            key={svc.id}
            onClick={() => setSelectedServiceId(svc.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeService?.id === svc.id
                ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            <span>{svc.service_name}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeService?.id === svc.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10'
              }`}
            >
              {svc.requests?.length || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Track Overview & Metrics */}
      {activeService && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Track Type</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
              {activeService.service_type.replace('_', ' ')}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Billing Frequency</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
              {activeService.billing_cycle} (₹{activeService.value.toLocaleString('en-IN')})
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Open Tasks</span>
            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
              {allTickets.filter((t) => ['open', 'in_progress'].includes(t.status)).length} Pending
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Next Scheduled Invoicing</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {activeService.next_invoice_date || 'N/A'}
            </span>
          </div>
        </div>
      )}

      {/* Ticket Filter Bar & New Ticket Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['all', 'open', 'in_progress', 'done', 'confirmed', 'closed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          className="gap-2 bg-primary-600 hover:bg-primary-700 text-white shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Ticket / Task</span>
        </Button>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10">
            <p className="text-xs font-semibold text-slate-400">No tickets found in this view.</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-primary-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-400">{ticket.ticket_number}</span>
                  {getStatusBadge(ticket.status)}
                  {getPriorityBadge(ticket.priority)}
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{ticket.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{ticket.description}</p>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                  {ticket.sla_deadline && (
                    <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                      <Clock className="w-3.5 h-3.5" />
                      SLA: {new Date(ticket.sla_deadline).toLocaleDateString()}
                    </span>
                  )}
                  {ticket.assignee && (
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {ticket.assignee.name}
                    </span>
                  )}
                  <span>Created {new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0">
                {ticket.status === 'open' && (
                  <Button
                    size="sm"
                    variant="outline"
                    isLoading={updatingId === ticket.id}
                    onClick={() => handleStatusChange(ticket.id, 'in_progress')}
                    className="text-xs gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 text-blue-500" />
                    <span>Start Task</span>
                  </Button>
                )}

                {ticket.status === 'in_progress' && (
                  <Button
                    size="sm"
                    isLoading={updatingId === ticket.id}
                    onClick={() => handleStatusChange(ticket.id, 'done')}
                    className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Mark Delivered</span>
                  </Button>
                )}

                {ticket.status === 'done' && (
                  <Button
                    size="sm"
                    isLoading={updatingId === ticket.id}
                    onClick={() => handleClientConfirm(ticket.id)}
                    className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Client Confirm</span>
                  </Button>
                )}

                {ticket.status !== 'closed' && ticket.status !== 'open' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    isLoading={updatingId === ticket.id}
                    onClick={() => handleStatusChange(ticket.id, 'closed')}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {activeService && (
        <CreateTicketModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          serviceId={activeService.id}
          serviceName={activeService.service_name}
          onSuccess={() => {
            setIsCreateOpen(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
