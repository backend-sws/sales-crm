import api from "@/lib/api";

export interface ProjectItem {
  id: number;
  name: string;
  description?: string | null;
  status: 'draft' | 'scope_approved' | 'in_dev' | 'client_review' | 'on_hold' | 'completed' | 'closed';
  client: {
    id: number;
    name: string;
    company: string;
    email: string;
    branding?: {
      primary_color?: string;
      logo_url?: string;
    };
  };
  service?: {
    id: number;
    service_name: string;
  } | null;
  project_manager?: {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    phone?: string | null;
  } | null;
  active_sprint?: {
    id: number;
    name: string;
    status: string;
  } | null;
  start_date?: string | null;
  target_end_date?: string | null;
  total_value: number;
  total_budget: number;
  sprint_duration_days?: number;
  tasks_count?: number;
  completed_tasks_count?: number;
  progress_percent?: number;
  milestones?: ProjectMilestoneItem[];
  sprints?: SprintItem[];
  tasks?: TaskItem[];
  budget_snapshot?: BudgetSnapshot;
  capacity_matrix?: CapacityDeveloper[];
  created_at: string;
}

export interface ProjectMilestoneItem {
  id: number;
  project_id: number;
  title: string;
  description?: string | null;
  amount: number;
  due_date?: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'invoiced';
  completed_at?: string | null;
}

export interface TaskItem {
  id: number;
  project_id: number;
  sprint_id?: number | null;
  milestone_id?: number | null;
  source_type: 'scope' | 'change_request' | 'meeting_action' | 'ad_hoc';
  source_id?: number | null;
  title: string;
  description?: string | null;
  assignee?: {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    hourly_rate?: number;
  } | null;
  status: 'backlog' | 'in_progress' | 'qa' | 'client_review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  complexity: 'easy' | 'medium' | 'hard';
  story_points?: number | null;
  estimated_hours?: number | null;
  actual_hours?: number;
  is_blocked?: boolean;
  due_date?: string | null;
  completed_at?: string | null;
  rework_count: number;
  is_proof_attached: boolean;
  client_rating?: number | null;
  client_feedback?: string | null;
  depends_on?: { id: number; title: string; status: string }[];
  blocking?: { id: number; title: string; status: string }[];
  attachments?: TaskAttachmentItem[];
  sprint?: { id: number; name: string; status: string } | null;
}

export interface TaskAttachmentItem {
  id: number;
  task_id: number;
  file_name: string;
  file_type?: string | null;
  url?: string | null;
  is_proof: boolean;
  notes?: string | null;
  created_at?: string;
}

export interface SprintItem {
  id: number;
  name: string;
  goal?: string | null;
  start_date: string;
  end_date: string;
  status: 'planned' | 'active' | 'completed';
  velocity_target?: number | null;
  velocity_achieved?: number | null;
  tasks_count?: number;
  completed_tasks_count?: number;
  total_story_points?: number;
  completed_story_points?: number;
  retrospective_notes?: string | null;
}

export interface BurndownData {
  sprint_id: number;
  sprint_name: string;
  total_scope: number;
  total_days: number;
  burndown_points: {
    day: string;
    date: string;
    ideal_remaining: number;
    actual_remaining: number | null;
  }[];
}

export interface BudgetSnapshot {
  total_budget: number;
  total_value: number;
  estimated_cost: number;
  actual_cost: number;
  budget_consumed_percent: number;
  is_over_budget: boolean;
  is_alert_threshold: boolean;
  gross_margin: number;
  gross_margin_percent: number;
}

export interface CapacityDeveloper {
  developer: {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    hourly_rate?: number;
  };
  open_tasks_count: number;
  remaining_hours: number;
  available_week_1: number;
  available_week_2: number;
  utilization_percent: number;
  is_over_allocated: boolean;
}

export interface TimeEntryItem {
  id: number;
  task?: { id: number; title: string; status: string; project_id?: number };
  user: { id: number; name: string; email: string; avatar?: string | null; hourly_rate?: number };
  started_at: string;
  ended_at?: string | null;
  duration_minutes: number;
  hours: number;
  is_billable: boolean;
  cost?: number;
  description?: string | null;
}

export interface ScopeVersionItem {
  id: number;
  version_number: number;
  document_body: string;
  pdf_snapshot_url?: string | null;
  is_baseline: boolean;
  status: 'draft' | 'pending_approval' | 'approved' | 'superseded';
  author?: { id: number; name: string; email: string };
  approval?: {
    id: number;
    signer_name: string;
    signature_data: string;
    ip_address?: string;
    approved_at: string;
    user?: { id: number; name: string };
  };
  created_at: string;
}

export interface ChangeRequestItem {
  id: number;
  title: string;
  description: string;
  estimated_hours: number;
  additional_cost: number;
  timeline_delay_days: number;
  status: 'submitted' | 'approved' | 'rejected' | 'implemented';
  decision_notes?: string | null;
  requester?: { id: number; name: string };
  decider?: { id: number; name: string };
  client_decision_at?: string | null;
  created_at: string;
}

export interface ProjectMeetingItem {
  id: number;
  title: string;
  agenda?: string | null;
  mom_body?: string | null;
  recording_url?: string | null;
  scheduled_at: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  is_auto_accepted: boolean;
  auto_accepted_at?: string | null;
  creator?: { id: number; name: string };
  action_items?: {
    id: number;
    title: string;
    due_date?: string | null;
    status: 'pending' | 'in_progress' | 'completed';
    assignee?: { id: number; name: string };
    converted_task_id?: number | null;
  }[];
}

export const projectsApi = {
  // Projects
  listProjects: async (filters: { client_id?: number; pm_id?: number; status?: string; search?: string } = {}) => {
    const res = await api.get('/projects', { params: filters });
    return res.data;
  },

  getProject: async (id: number) => {
    const res = await api.get(`/projects/${id}`);
    return res.data;
  },

  createProject: async (data: any) => {
    const res = await api.post('/projects', data);
    return res.data;
  },

  updateProject: async (id: number, data: any) => {
    const res = await api.patch(`/projects/${id}`, data);
    return res.data;
  },

  getBudget: async (id: number) => {
    const res = await api.get(`/projects/${id}/budget`);
    return res.data;
  },

  getCapacity: async (id: number) => {
    const res = await api.get(`/projects/${id}/capacity`);
    return res.data;
  },

  createMilestone: async (projectId: number, data: { title: string; amount: number; due_date?: string; description?: string }) => {
    const res = await api.post(`/projects/${projectId}/milestones`, data);
    return res.data;
  },

  invoiceMilestone: async (milestoneId: number) => {
    const res = await api.post(`/milestones/${milestoneId}/invoice`);
    return res.data;
  },

  // Tasks & Kanban
  listTasks: async (projectId: number, filters: any = {}) => {
    const res = await api.get(`/projects/${projectId}/tasks`, { params: filters });
    return res.data;
  },

  createTask: async (projectId: number, data: any) => {
    const res = await api.post(`/projects/${projectId}/tasks`, data);
    return res.data;
  },

  updateTask: async (id: number, data: any) => {
    const res = await api.patch(`/tasks/${id}`, data);
    return res.data;
  },

  updateTaskStatus: async (id: number, status: string) => {
    const res = await api.patch(`/tasks/${id}/status`, { status });
    return res.data;
  },

  addDependency: async (id: number, depends_on_task_id: number) => {
    const res = await api.post(`/tasks/${id}/dependencies`, { depends_on_task_id });
    return res.data;
  },

  removeDependency: async (id: number, dependsOnTaskId: number) => {
    const res = await api.delete(`/tasks/${id}/dependencies/${dependsOnTaskId}`);
    return res.data;
  },

  attachProof: async (id: number, data: { file_name?: string; file_type?: string; url?: string; notes?: string }) => {
    const res = await api.post(`/tasks/${id}/proof`, data);
    return res.data;
  },

  clientDecision: async (id: number, data: { action: 'accept' | 'reject'; reason?: string; rating?: number }) => {
    const res = await api.post(`/tasks/${id}/client-decision`, data);
    return res.data;
  },

  getGanttData: async (projectId: number) => {
    const res = await api.get(`/projects/${projectId}/gantt`);
    return res.data;
  },

  // Time Tracking
  getActiveTimer: async () => {
    const res = await api.get('/time-entries/active');
    return res.data;
  },

  startTimer: async (taskId: number) => {
    const res = await api.post(`/tasks/${taskId}/timer/start`);
    return res.data;
  },

  stopTimer: async (id: number, description?: string) => {
    const res = await api.post(`/time-entries/${id}/stop`, { description });
    return res.data;
  },

  logManualTime: async (taskId: number, data: any) => {
    const res = await api.post(`/tasks/${taskId}/time-entries`, data);
    return res.data;
  },

  getProjectWorklogs: async (projectId: number) => {
    const res = await api.get(`/projects/${projectId}/worklogs`);
    return res.data;
  },

  // Sprints
  listSprints: async (projectId: number) => {
    const res = await api.get(`/projects/${projectId}/sprints`);
    return res.data;
  },

  createSprint: async (projectId: number, data: any) => {
    const res = await api.post(`/projects/${projectId}/sprints`, data);
    return res.data;
  },

  assignTasksToSprint: async (sprintId: number, taskIds: number[]) => {
    const res = await api.post(`/sprints/${sprintId}/tasks`, { task_ids: taskIds });
    return res.data;
  },

  getBurndown: async (sprintId: number) => {
    const res = await api.get(`/sprints/${sprintId}/burndown`);
    return res.data;
  },

  closeSprint: async (sprintId: number, retrospective_notes?: string) => {
    const res = await api.patch(`/sprints/${sprintId}/close`, { retrospective_notes });
    return res.data;
  },

  // Scope & Governance
  listScopeVersions: async (projectId: number) => {
    const res = await api.get(`/projects/${projectId}/scope-versions`);
    return res.data;
  },

  createScopeVersion: async (projectId: number, data: any) => {
    const res = await api.post(`/projects/${projectId}/scope-versions`, data);
    return res.data;
  },

  approveScope: async (id: number, data: { signer_name: string; signature_data: string; signature_type?: string }) => {
    const res = await api.post(`/scope-versions/${id}/approve`, data);
    return res.data;
  },

  getScopeDiff: async (v1: number, v2: number) => {
    const res = await api.get(`/scope-versions/${v1}/diff/${v2}`);
    return res.data;
  },

  listChangeRequests: async (projectId: number) => {
    const res = await api.get(`/projects/${projectId}/change-requests`);
    return res.data;
  },

  createChangeRequest: async (projectId: number, data: any) => {
    const res = await api.post(`/projects/${projectId}/change-requests`, data);
    return res.data;
  },

  decideChangeRequest: async (id: number, data: { decision: 'approved' | 'rejected'; notes?: string }) => {
    const res = await api.patch(`/change-requests/${id}/decision`, data);
    return res.data;
  },

  // Meetings & MoM
  listMeetings: async (projectId: number) => {
    const res = await api.get(`/projects/${projectId}/meetings`);
    return res.data;
  },

  createMeeting: async (projectId: number, data: any) => {
    const res = await api.post(`/projects/${projectId}/meetings`, data);
    return res.data;
  },

  confirmMoM: async (meetingId: number) => {
    const res = await api.post(`/meetings/${meetingId}/confirm`);
    return res.data;
  },

  convertActionItem: async (actionItemId: number) => {
    const res = await api.post(`/meeting-action-items/${actionItemId}/convert`);
    return res.data;
  },
};
