import { z } from 'zod';

export const leadFormSchema = z.object({
  name: z.string().min(2, 'Contact person name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  phone: z.string().min(7, 'Phone number must be at least 7 digits').optional().or(z.literal('')),
  alt_phone: z.string().optional().or(z.literal('')),
  company: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  source: z.string().default('Website Form'),
  source_id: z.string().optional().or(z.literal('')),
  priority: z.enum(['hot', 'warm', 'cold']).default('warm'),
  status: z.enum([
    'new',
    'contacted',
    'interested',
    'demo_meeting',
    'proposal',
    'negotiation',
    'won',
    'lost',
  ]).default('new'),
  budget: z.coerce.number().min(0, 'Budget must be zero or positive').default(0),
  notes: z.string().optional().or(z.literal('')),
  assigned_to: z.string().optional().or(z.literal('')),
  product_ids: z.array(z.number()).default([]),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

export const lostReasonSchema = z.object({
  lost_reason: z.string().min(1, 'Please select a reason for marking as lost'),
  lost_notes: z.string().optional().or(z.literal('')),
});

export type LostReasonValues = z.infer<typeof lostReasonSchema>;

export const bulkAssignSchema = z.object({
  lead_ids: z.array(z.number()).min(1, 'Please select at least one lead'),
  agent_id: z.number().int().positive('Please select an agent'),
});

export type BulkAssignValues = z.infer<typeof bulkAssignSchema>;

export const bulkStatusSchema = z.object({
  lead_ids: z.array(z.number()).min(1, 'Please select at least one lead'),
  status: z.enum([
    'new',
    'contacted',
    'interested',
    'demo_meeting',
    'proposal',
    'negotiation',
    'won',
    'lost',
  ]),
});

export type BulkStatusValues = z.infer<typeof bulkStatusSchema>;
