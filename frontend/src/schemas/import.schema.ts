import { z } from 'zod';

export const importProcessSchema = z.object({
  rows: z.array(z.record(z.string(), z.any())).min(1, 'No rows provided to import'),
  column_mapping: z.record(z.string(), z.string()).refine(
    (mapping) => Boolean(mapping.name || mapping.company || mapping.phone),
    { message: 'You must map at least Name, Company, or Phone' }
  ),
  duplicate_strategy: z.enum(['skip', 'update', 'add']).default('skip'),
  assigned_agent_id: z.number().int().positive().optional().nullable(),
});

export type ImportProcessValues = z.infer<typeof importProcessSchema>;
