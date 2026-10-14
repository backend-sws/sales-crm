import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  MessageCircle,
  Mail,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Zap,
  Send,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, type NotificationLogItem } from '@/api/notifications.api';
import { followUpsApi } from '@/api/followUps.api';
import { queryKeys } from '@/constants/queryKeys';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function NotificationAlertsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Fetch follow-up summary
  const { data: summary } = useQuery({
    queryKey: queryKeys.followUps.summary,
    queryFn: async () => {
      const res = await followUpsApi.getSummary();
      return res.data;
    },
    refetchInterval: 30000,
  });

  // Fetch recent notification delivery logs
  const { data: notificationsRes, isLoading } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () => notificationsApi.getRecent(10),
    enabled: isOpen,
    refetchInterval: isOpen ? 15000 : false,
  });

  const notifications = notificationsRes?.data || [];

  // Test Notification Mutation
  const testMutation = useMutation({
    mutationFn: (channel: 'whatsapp' | 'email') =>
      notificationsApi.sendTest(
        channel,
        `Real-time verified alert dispatched via ${channel.toUpperCase()} engine.`
      ),
    onSuccess: (_, channel) => {
      toast.success(`Test ${channel.toUpperCase()} alert sent & logged!`);
      queryClient.invalidateQueries({ queryKey: ['notifications', 'recent'] });
    },
    onError: () => {
      toast.error('Failed to dispatch test notification.');
    },
  });

  const hasOverdue = Boolean(summary && summary.overdue > 0);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />;
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return <Zap className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
          hasOverdue
            ? 'border-red-300 dark:border-red-900/60 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20'
            : 'border-slate-200/80 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
        }`}
        title={
          hasOverdue
            ? `Critical: ${summary?.overdue} overdue follow-up(s) require action!`
            : 'Automated CRM Alerts & Follow-Ups'
        }
      >
        <Bell className={`w-4 h-4 ${hasOverdue ? 'animate-bounce text-red-600 dark:text-red-400' : ''}`} />
        {hasOverdue ? (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-red-600 text-white shadow-xs animate-pulse">
            {summary?.overdue}
          </span>
        ) : summary && summary.today > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-[#0c0c11]" />
        ) : null}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-primary-500" /> CRM Notifications &amp; Alerts
              </h4>
              <p className="text-[10px] text-slate-400">
                Automated WhatsApp, Email &amp; Follow-up notifications
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={testMutation.isPending}
                onClick={() => testMutation.mutate('whatsapp')}
                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 cursor-pointer transition-all flex items-center gap-1"
                title="Send test WhatsApp alert"
              >
                <Send className="w-2.5 h-2.5" /> WA Test
              </button>
            </div>
          </div>

          {/* Overdue Alert Banner if present */}
          {hasOverdue && (
            <div
              onClick={() => {
                setIsOpen(false);
                navigate('/follow-ups');
              }}
              className="p-3 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between gap-2 cursor-pointer hover:bg-red-500/15 transition-colors"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                <span className="text-xs font-bold text-red-700 dark:text-red-300">
                  {summary?.overdue} Overdue Follow-up(s) Detected
                </span>
              </div>
              <span className="text-[10px] font-bold text-red-600 dark:text-red-400 flex items-center gap-0.5">
                Take Action <ExternalLink className="w-2.5 h-2.5" />
              </span>
            </div>
          )}

          {/* Notifications Feed */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto opacity-70" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">All caught up!</p>
                <p className="text-[10px]">No recent alert logs.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className="p-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {getChannelIcon(item.channel)}
                      <span>{item.channel}</span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="capitalize">{item.type.replace('_', ' ')}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {formatTimeAgo(item.created_at)}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {item.payload.title || 'Notification Alert'}
                  </p>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {item.payload.message}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/follow-ups');
              }}
              className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
            >
              View Full Follow-Up Action Queue →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
