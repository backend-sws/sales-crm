import React from 'react';
import {
  Phone,
  MessageSquare,
  Mail,
  Users,
  CheckCircle2,
  Calendar,
  Building2,
  MapPin,
  Clock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { FollowUp, FollowUpType } from '@/types/followUp.types';

interface FollowUpItemCardProps {
  followUp: FollowUp;
  onComplete: (item: FollowUp) => void;
  onViewLead?: (leadId: number) => void;
}

export function FollowUpItemCard({
  followUp,
  onComplete,
  onViewLead,
}: FollowUpItemCardProps) {
  const isOverdue =
    followUp.status === 'pending' && new Date(followUp.scheduled_at) < new Date();
  const isCompleted = followUp.status === 'done' || followUp.status === 'completed';

  const getTypeIcon = (type: FollowUpType) => {
    switch (type) {
      case 'call':
        return <Phone className="w-3.5 h-3.5 text-blue-500" />;
      case 'whatsapp':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />;
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-amber-500" />;
      case 'meeting':
        return <Users className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getCleanPhone = (phone?: string | null) => {
    if (!phone) return null;
    return phone.replace(/[^0-9]/g, '');
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = getCleanPhone(followUp.lead?.phone);
    if (!phone) return;
    const cleanNumber = phone.startsWith('91') ? phone : `91${phone}`;
    const text = encodeURIComponent(
      `Hello ${followUp.lead?.name || 'Sir/Madam'}, following up regarding our discussion at SalesCRM. Are you available for a brief touchpoint?`
    );
    window.open(`https://wa.me/${cleanNumber}?text=${text}`, '_blank');
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (followUp.lead?.phone) {
      window.location.href = `tel:${followUp.lead.phone}`;
    }
  };

  const formatScheduledTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div
      className={`p-4 rounded-2xl border transition-all duration-200 bg-white dark:bg-[#111116] shadow-xs hover:shadow-md ${
        isOverdue
          ? 'border-red-500/40 bg-red-500/[0.02] dark:border-red-500/30'
          : isCompleted
          ? 'border-emerald-500/30 dark:border-emerald-500/20'
          : 'border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Side: Lead Info & Scheduled Badge */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              onClick={() => onViewLead && followUp.lead_id && onViewLead(followUp.lead_id)}
              className="text-sm md:text-base font-bold text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer transition-colors truncate"
            >
              {followUp.lead?.name || `Lead #${followUp.lead_id}`}
            </span>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 capitalize">
              {getTypeIcon(followUp.type)}
              <span>{followUp.type}</span>
            </div>

            {isOverdue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300 border border-red-200 dark:border-red-800 animate-pulse">
                🚨 Overdue
              </span>
            )}

            {isCompleted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            {followUp.lead?.company && (
              <div className="flex items-center gap-1 truncate max-w-[200px]">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{followUp.lead.company}</span>
              </div>
            )}
            {followUp.lead?.phone && (
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{followUp.lead.phone}</span>
              </div>
            )}
            {followUp.agent?.name && (
              <div className="text-[11px] text-slate-400 hidden md:inline">
                Agent: <span className="font-semibold text-slate-600 dark:text-slate-300">{followUp.agent.name}</span>
              </div>
            )}
          </div>

          {/* Time & History Notes */}
          <div className="flex items-center gap-2 pt-0.5 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Scheduled: <strong className={isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}>{formatScheduledTime(followUp.scheduled_at)}</strong></span>
            {followUp.completed_at && (
              <span className="text-slate-400 text-[11px]">
                • Completed: {formatScheduledTime(followUp.completed_at)}
              </span>
            )}
          </div>

          {followUp.outcome && (
            <div className="mt-1.5 p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300 italic">
              "{followUp.outcome}"
            </div>
          )}
        </div>

        {/* Right Side: Quick Action Runner Buttons */}
        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
          {followUp.lead?.phone && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCall}
                className="h-8 px-2.5 rounded-xl text-xs gap-1 border-slate-200 hover:border-blue-400 hover:text-blue-600 dark:border-white/10"
                title="Call phone directly"
              >
                <Phone className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden md:inline">Call</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleWhatsApp}
                className="h-8 px-2.5 rounded-xl text-xs gap-1 border-slate-200 hover:border-emerald-400 hover:text-emerald-600 dark:border-white/10"
                title="Chat on WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden md:inline">WhatsApp</span>
              </Button>
            </>
          )}

          {!isCompleted && (
            <Button
              size="sm"
              onClick={() => onComplete(followUp)}
              className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 bg-primary-600 hover:bg-primary-700 text-white shadow-xs shadow-primary-600/20 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Log &amp; Chain</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
