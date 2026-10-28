import React from 'react';
import { CheckCircle2, Circle, Sparkles, ArrowRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi, type OnboardingStepItem, type ClientItem } from '@/api/clients.api';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

interface ClientOnboardingCardProps {
  client?: ClientItem | null;
  clientId?: number;
  completed?: boolean;
  steps?: OnboardingStepItem[];
  onRefresh?: () => void;
  onStepChange?: () => void;
  isClient?: boolean;
}

export function ClientOnboardingCard({
  client,
  clientId: explicitClientId,
  completed: explicitCompleted,
  steps: explicitSteps,
  onRefresh,
  onStepChange,
  isClient: explicitIsClient,
}: ClientOnboardingCardProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isClient = explicitIsClient !== undefined ? explicitIsClient : Boolean(
    user?.roles?.includes('client') ||
    user?.client_id ||
    (!user?.roles?.some((r) => ['super_admin', 'admin', 'project_manager', 'developer', 'account_manager', 'sales_manager'].includes(r)))
  );
  const isStaff = !isClient;

  const clientId = explicitClientId || client?.id || 0;
  const completed = explicitCompleted !== undefined ? explicitCompleted : (client?.onboarding_completed ?? false);
  const steps = explicitSteps || client?.onboarding_steps || [];

  const toggleMutation = useMutation({
    mutationFn: ({ stepKey, nextState }: { stepKey: string; nextState: boolean }) =>
      clientsApi.updateOnboardingStep(clientId, stepKey, nextState),
    onSuccess: (res) => {
      toast.success(res.message || 'Onboarding checklist updated.');
      queryClient.invalidateQueries({ queryKey: ['clients', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      onRefresh?.();
      onStepChange?.();
    },
    onError: () => {
      toast.error('Failed to update onboarding step.');
    },
  });

  const total = steps.length;
  const completedCount = steps.filter((s) => s.completed).length;
  const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 100;

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              Client Onboarding Readiness
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {completed
                ? 'Onboarding 100% completed. Account fully operational.'
                : `${completedCount} of ${total} steps completed (${percentage}%)`}
            </span>
          </div>
        </div>

        <span
          className={`font-mono text-xs font-black px-2.5 py-1 rounded-xl ${
            percentage === 100
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
          }`}
        >
          {percentage}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            percentage === 100 ? 'bg-emerald-500' : 'bg-primary-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-2 pt-1">
        {steps.map((s) => (
          isStaff ? (
            <button
              key={s.key}
              type="button"
              disabled={toggleMutation.isPending}
              onClick={() =>
                toggleMutation.mutate({
                  stepKey: s.key,
                  nextState: !s.completed,
                })
              }
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left group"
            >
              <div className="flex items-center gap-2.5">
                {s.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-primary-500 shrink-0" />
                )}
                <span
                  className={`text-xs font-semibold ${
                    s.completed
                      ? 'text-slate-400 line-through'
                      : 'text-slate-700 dark:text-slate-200 group-hover:text-primary-600'
                  }`}
                >
                  {s.label}
                </span>
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ) : (
            <div
              key={s.key}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 text-left"
            >
              <div className="flex items-center gap-2.5">
                {s.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                )}
                <span
                  className={`text-xs font-semibold ${
                    s.completed
                      ? 'text-slate-400 line-through'
                      : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                s.completed ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
              }`}>
                {s.completed ? 'Completed' : 'Pending Team Action'}
              </span>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
