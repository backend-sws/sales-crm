import { z } from 'zod';

export const scheduleFollowUpSchema = z.object({
  lead_id: z.number().int().positive(),
  type: z.enum(['call', 'whatsapp', 'email', 'meeting']),
  scheduled_at: z.string().min(1, 'Please select a scheduled date and time'),
  agent_id: z.number().int().positive().optional(),
});

export type ScheduleFollowUpValues = z.infer<typeof scheduleFollowUpSchema>;

export const completeFollowUpSchema = z.object({
  outcome: z.string().min(3, 'Discussion outcome notes must be at least 3 characters'),
  chain_next: z.boolean().default(false),
  next_type: z.enum(['call', 'whatsapp', 'email', 'meeting']).optional(),
  next_scheduled_at: z.string().optional(),
  next_agent_id: z.number().int().positive().optional(),
}).refine(
  (data) => {
    if (data.chain_next) {
      return Boolean(data.next_type && data.next_scheduled_at);
    }
    return true;
  },
  {
    message: 'Next channel and date/time are required when chaining follow-ups',
    path: ['next_scheduled_at'],
  }
);

export type CompleteFollowUpValues = z.infer<typeof completeFollowUpSchema>;
