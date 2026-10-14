/**
 * Centralized TanStack Query Keys Factory
 * Ensures consistent cache keys across queries and mutations.
 */
export const queryKeys = {
  auth: {
    user: ['auth', 'user'] as const,
  },
  leads: {
    all: ['leads'] as const,
    list: (params?: Record<string, any>) => ['leads', 'list', params] as const,
    kanban: (params?: Record<string, any>) => ['leads', 'kanban', params] as const,
    detail: (id: number) => ['leads', 'detail', id] as const,
    timeline: (id: number) => ['leads', 'timeline', id] as const,
    duplicates: (id: number) => ['leads', 'duplicates', id] as const,
    score: (id: number) => ['leads', 'score', id] as const,
    metadata: ['leads', 'metadata'] as const,
    analytics: ['leads', 'analytics'] as const,
  },
  followUps: {
    all: ['followUps'] as const,
    list: (params?: Record<string, any>) => ['followUps', 'list', params] as const,
    today: ['followUps', 'today'] as const,
    overdue: ['followUps', 'overdue'] as const,
    summary: ['followUps', 'summary'] as const,
  },
  dashboard: {
    metrics: ['dashboard', 'metrics'] as const,
  },
};
