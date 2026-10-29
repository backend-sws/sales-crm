import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Image as ImageIcon,
  ZoomIn,
  ExternalLink,
  Eye,
  X,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import type { ClientServiceItem, ServiceRequestItem } from '@/api/clients.api';
import { clientsApi } from '@/api/clients.api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { CreateTicketModal } from './CreateTicketModal';
import { AcceptTicketModal } from './AcceptTicketModal';
import { toast } from 'sonner';
import { formatDate, formatDateWithDays } from '@/lib/formatters';
import { useAuthStore } from '@/store/authStore';

interface ServiceTicketsPanelProps {
  services: ClientServiceItem[];
  onRefresh: () => void;
  isClient?: boolean;
}

const stripHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<br\s*[\/]?>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, ' ')
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractImages = (html: string): string[] => {
  if (!html) return [];
  const matches = html.match(/<img[^>]+src=["']([^"']+)["']/gi);
  if (!matches) return [];
  const urls: string[] = [];
  for (const m of matches) {
    const src = m.match(/src=["']([^"']+)["']/i);
    if (src && src[1] && !urls.includes(src[1])) {
      urls.push(src[1]);
    }
  }
  return urls;
};

export const ServiceTicketsPanel: React.FC<ServiceTicketsPanelProps> = ({
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

  const navigate = useNavigate();
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    services.length > 0 ? services[0].id : null
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<ServiceRequestItem | null>(null);
  const [ticketToAccept, setTicketToAccept] = useState<ServiceRequestItem | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus as any } : null));
      }
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update ticket status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRejectTicket = async (ticketId: number) => {
    const reason = window.prompt('Enter reason for declining this ticket (e.g. out-of-scope, invalid, duplicate):');
    if (reason === null) return;
    try {
      setUpdatingId(ticketId);
      await clientsApi.rejectTicket(ticketId, reason);
      toast.info('Ticket declined and marked closed.');
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket((prev) => (prev ? { ...prev, status: 'closed' } : null));
      }
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to decline ticket');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClientConfirm = async (ticketId: number) => {
    try {
      setUpdatingId(ticketId);
      await clientsApi.confirmTicket(ticketId);
      toast.success('Ticket marked as Confirmed & Closed!');
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket((prev) => (prev ? { ...prev, status: 'confirmed' } : null));
      }
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to confirm ticket');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRequestRevision = async (ticketId: number) => {
    try {
      setUpdatingId(ticketId);
      await clientsApi.updateTicketStatus(ticketId, 'in_progress');
      toast.info('Revision requested! Ticket returned to development team.');
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket((prev) => (prev ? { ...prev, status: 'in_progress' } : null));
      }
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to request revision');
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
              {formatDateWithDays(activeService.next_invoice_date)}
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
          filteredTickets.map((ticket) => {
            const ticketImages = extractImages(ticket.description);
            const plainExcerpt = stripHtml(ticket.description);

            return (
              <div
                key={ticket.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-primary-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">{ticket.ticket_number}</span>
                    {getStatusBadge(ticket.status)}
                    {getPriorityBadge(ticket.priority)}
                    {ticketImages.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        <ImageIcon className="w-3 h-3" />
                        <span>{ticketImages.length} {ticketImages.length === 1 ? 'screenshot' : 'screenshots'}</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h4
                      onClick={() => setSelectedTicket(ticket)}
                      className="text-sm font-bold text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer transition-colors"
                    >
                      {ticket.title}
                    </h4>
                    <p
                      onClick={() => setSelectedTicket(ticket)}
                      className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors mt-0.5"
                    >
                      {plainExcerpt || 'No description provided'}
                    </p>
                  </div>

                  {/* Screenshots mini gallery preview in card */}
                  {ticketImages.length > 0 && (
                    <div className="flex items-center gap-2 pt-0.5">
                      {ticketImages.slice(0, 4).map((imgUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxImage(imgUrl);
                          }}
                          className="relative group w-12 h-9 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 shrink-0 hover:border-primary-500 transition-all shadow-xs"
                          title="Click to zoom screenshot"
                        >
                          <img src={imgUrl} alt="Screenshot" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <ZoomIn className="w-3 h-3" />
                          </div>
                        </button>
                      ))}
                      {ticketImages.length > 4 && (
                        <button
                          type="button"
                          onClick={() => setSelectedTicket(ticket)}
                          className="text-[10px] font-bold text-slate-500 hover:text-primary-600 cursor-pointer px-1.5 py-1 rounded bg-slate-100 dark:bg-white/5"
                        >
                          +{ticketImages.length - 4} more
                        </button>
                      )}
                    </div>
                  )}

                  {/* Linked Kanban Task Badge */}
                  {ticket.task && (
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (ticket.task?.project_id) {
                            navigate(`/projects/${ticket.task.project_id}`);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 transition-all group"
                        title="Open this task in Project Kanban Board"
                      >
                        <Layers className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Kanban Task #{ticket.task.id}</span>
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                          {ticket.task.status.replace('_', ' ')}
                        </span>
                        <ExternalLink className="w-3 h-3 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                      {ticket.task.project && (
                        <span className="text-[11px] text-slate-400">
                          in Project: <strong className="text-slate-600 dark:text-slate-300">{ticket.task.project.name}</strong>
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-0.5">
                    {ticket.sla_deadline && (
                      <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                        <Clock className="w-3.5 h-3.5" />
                        SLA: {formatDate(ticket.sla_deadline)}
                      </span>
                    )}
                    {ticket.assignee && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {ticket.assignee.name}
                      </span>
                    )}
                    <span>Created {formatDate(ticket.created_at)}</span>
                  </div>
                </div>

                {/* Status Action Buttons with Strict Role Governance */}
                <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedTicket(ticket)}
                    className="text-xs gap-1.5"
                    title="View full ticket details and rich acceptance criteria"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>View</span>
                  </Button>

                  {ticket.status === 'open' && (
                    isStaff ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setTicketToAccept(ticket)}
                          className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                          title="Verify genuine ticket, assign developer, and route to Kanban board"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Accept & Send to Kanban</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          isLoading={updatingId === ticket.id}
                          onClick={() => handleRejectTicket(ticket.id)}
                          className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                          title="Decline ticket as out-of-scope or invalid"
                        >
                          Reject
                        </Button>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Queued (Awaiting Super Admin Review)</span>
                      </span>
                    )
                  )}

                  {ticket.status === 'in_progress' && (
                    isStaff ? (
                      <Button
                        size="sm"
                        isLoading={updatingId === ticket.id}
                        onClick={() => handleStatusChange(ticket.id, 'done')}
                        className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Mark Delivered</span>
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <Play className="w-3.5 h-3.5 text-blue-500" />
                        <span>In Progress by Team</span>
                      </span>
                    )
                  )}

                  {ticket.status === 'done' && (
                    isClient ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          isLoading={updatingId === ticket.id}
                          onClick={() => handleClientConfirm(ticket.id)}
                          className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accept & Confirm</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={updatingId === ticket.id}
                          onClick={() => handleRequestRevision(ticket.id)}
                          className="text-xs gap-1.5 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 font-semibold"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                          <span>Request Revision</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>Awaiting Client Sign-off</span>
                        </span>
                        {user?.roles?.includes('super_admin') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            isLoading={updatingId === ticket.id}
                            onClick={() => handleClientConfirm(ticket.id)}
                            className="text-[10px] text-slate-400 hover:text-slate-600"
                            title="Super Admin Override: Sign-off on behalf of client"
                          >
                            Override Confirm
                          </Button>
                        )}
                      </div>
                    )
                  )}

                  {ticket.status === 'confirmed' && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Confirmed by Client ✓</span>
                      </span>
                      {isStaff && (
                        <Button
                          size="sm"
                          variant="ghost"
                          isLoading={updatingId === ticket.id}
                          onClick={() => handleStatusChange(ticket.id, 'closed')}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          Archive
                        </Button>
                      )}
                    </div>
                  )}

                  {ticket.status === 'closed' && (
                    <span className="text-xs text-slate-400 font-semibold px-2">
                      Closed
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Ticket Details & Rich Preview Modal */}
      {selectedTicket && (
        <Modal
          isOpen={Boolean(selectedTicket)}
          onClose={() => setSelectedTicket(null)}
          title={
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-400">
                    {selectedTicket.ticket_number}
                  </span>
                  {getStatusBadge(selectedTicket.status)}
                  {getPriorityBadge(selectedTicket.priority)}
                  <span className="text-[11px] font-semibold text-slate-400">
                    • Track: {activeService?.service_name}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 break-words">
                  {selectedTicket.title}
                </h3>
              </div>
            </div>
          }
          maxWidth="3xl"
          footer={
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
              <div className="text-xs text-slate-400">
                Created on {formatDate(selectedTicket.created_at)}
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {selectedTicket.status === 'open' && isStaff && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => setTicketToAccept(selectedTicket)}
                      className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Accept & Send to Kanban</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      isLoading={updatingId === selectedTicket.id}
                      onClick={() => handleRejectTicket(selectedTicket.id)}
                      className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      Reject
                    </Button>
                  </>
                )}

                {selectedTicket.status === 'in_progress' && isStaff && (
                  <Button
                    size="sm"
                    isLoading={updatingId === selectedTicket.id}
                    onClick={() => handleStatusChange(selectedTicket.id, 'done')}
                    className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Mark Delivered</span>
                  </Button>
                )}

                {selectedTicket.status === 'done' && (
                  isClient ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        isLoading={updatingId === selectedTicket.id}
                        onClick={() => handleClientConfirm(selectedTicket.id)}
                        className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Accept & Confirm</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={updatingId === selectedTicket.id}
                        onClick={() => handleRequestRevision(selectedTicket.id)}
                        className="text-xs gap-1.5 text-amber-700 dark:text-amber-300 font-semibold"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Request Revision</span>
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      Awaiting Client Sign-off
                    </span>
                  )
                )}

                {selectedTicket.status === 'confirmed' && isStaff && (
                  <Button
                    size="sm"
                    variant="outline"
                    isLoading={updatingId === selectedTicket.id}
                    onClick={() => handleStatusChange(selectedTicket.id, 'closed')}
                    className="text-xs"
                  >
                    Archive
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedTicket(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Linked Kanban Task Card in Details */}
            {selectedTicket.task && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                        Kanban Task #{selectedTicket.task.id}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-indigo-200/60 dark:bg-indigo-800/60 text-indigo-800 dark:text-indigo-200">
                        {selectedTicket.task.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                      Assigned Project: <span className="font-semibold">{selectedTicket.task.project?.name || 'Client Delivery Project'}</span>
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (selectedTicket.task?.project_id) {
                      navigate(`/projects/${selectedTicket.task.project_id}`);
                    }
                  }}
                  className="text-xs gap-1.5 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/50 self-start sm:self-auto shrink-0"
                >
                  <span>Open Kanban Board</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {/* Ticket Meta Details Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Priority
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                  {selectedTicket.priority}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  SLA Deadline
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedTicket.sla_deadline ? formatDate(selectedTicket.sla_deadline) : 'None set'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Assigned Specialist
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedTicket.assignee?.name || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Logged By
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                  {selectedTicket.added_by_type === 'client' ? 'Client' : 'Internal Staff'}
                </span>
              </div>
            </div>

            {/* Rich Description Box */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Deliverable Scope & Acceptance Criteria
              </label>
              <div
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-xs leading-relaxed overflow-x-auto [&_img]:rounded-xl [&_img]:border [&_img]:border-slate-200 dark:[&_img]:border-white/10 [&_img]:cursor-zoom-in [&_img]:shadow-xs hover:[&_img]:opacity-95"
                dangerouslySetInnerHTML={{ __html: selectedTicket.description }}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.tagName.toLowerCase() === 'img') {
                    const src = (target as HTMLImageElement).src;
                    if (src) setLightboxImage(src);
                  }
                }}
              />
            </div>

            {/* Gallery of Extracted Screenshots */}
            {(() => {
              const modalImages = extractImages(selectedTicket.description);
              if (modalImages.length === 0) return null;
              return (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Attached Screenshots & Proofs ({modalImages.length})
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Click any screenshot to zoom in
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {modalImages.map((imgUrl, i) => (
                      <div
                        key={i}
                        className="group relative rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-100 dark:bg-zinc-800"
                      >
                        <img
                          src={imgUrl}
                          alt={`Screenshot ${i + 1}`}
                          className="w-full h-32 object-cover transition-transform group-hover:scale-105 cursor-pointer"
                          onClick={() => setLightboxImage(imgUrl)}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setLightboxImage(imgUrl)}
                            className="p-2 rounded-lg bg-white/90 text-slate-800 hover:bg-white transition-all shadow-md"
                            title="Enlarge screenshot"
                          >
                            <ZoomIn className="w-4 h-4" />
                          </button>
                          <a
                            href={imgUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg bg-white/90 text-slate-800 hover:bg-white transition-all shadow-md"
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* Fullscreen Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <a
              href={lightboxImage}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Original</span>
            </a>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            className="max-w-[90vw] max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage}
              alt="Enlarged Screenshot"
              className="max-w-full max-h-[85vh] object-contain block mx-auto select-none"
            />
          </div>
        </div>
      )}

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

      {ticketToAccept && (
        <AcceptTicketModal
          isOpen={Boolean(ticketToAccept)}
          onClose={() => setTicketToAccept(null)}
          ticket={ticketToAccept}
          serviceName={activeService?.service_name}
          onSuccess={(updatedTicket) => {
            setTicketToAccept(null);
            if (selectedTicket && selectedTicket.id === updatedTicket.id) {
              setSelectedTicket(updatedTicket);
            }
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
