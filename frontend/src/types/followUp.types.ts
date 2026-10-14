export type FollowUpType = 'call' | 'whatsapp' | 'email' | 'meeting';
export type FollowUpStatus = 'pending' | 'done' | 'missed' | 'rescheduled' | 'completed';

export interface FollowUp {
  id: number;
  lead_id: number;
  agent_id: number;
  type: FollowUpType;
  scheduled_at: string;
  status: FollowUpStatus;
  outcome: string | null;
  completed_at?: string | null;
  next_follow_up_id?: number | null;
  lead?: {
    id: number;
    name: string;
    company?: string | null;
    phone?: string | null;
  };
  agent?: {
    id: number;
    name: string;
    email?: string;
  };
  next_follow_up?: FollowUp | null;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleFollowUpPayload {
  lead_id: number;
  agent_id?: number;
  type: FollowUpType;
  scheduled_at: string;
}

export interface CompleteFollowUpPayload {
  outcome: string;
  next_type?: FollowUpType;
  next_scheduled_at?: string;
  next_agent_id?: number;
}

export interface FollowUpSummary {
  overdue: number;
  today: number;
  upcoming: number;
  completed_today: number;
}

