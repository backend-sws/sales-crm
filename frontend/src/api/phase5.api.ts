import api from "@/lib/api";

// --- Storage & Presigned Uploads ---
export interface PresignedUploadResponse {
  mode: 's3_presigned' | 'direct_upload';
  storage_path: string;
  upload_url: string;
  public_url: string;
  method: string;
  headers: Record<string, string>;
  expires_at: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
}

export interface UploadedFileResult {
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  storage_path: string;
  public_url: string;
}

// --- Slack Project Chat ---
export interface ProjectChannelItem {
  id: number;
  project_id: number;
  name: string;
  is_internal: boolean;
  topic?: string | null;
  messages_count?: number;
  created_at: string;
}

export interface MessageAttachmentItem {
  id: number;
  message_id: number;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size_bytes: number;
}

export interface MessageReactionItem {
  id: number;
  message_id: number;
  user_id: number;
  emoji: string;
  user: {
    id: number;
    name: string;
  };
}

export interface ProjectMessageItem {
  id: number;
  channel_id: number;
  user_id: number;
  parent_id?: number | null;
  content: string;
  code_snippet?: string | null;
  code_language?: string | null;
  is_internal: boolean;
  created_at: string;
  user: {
    id: number;
    name: string;
    email: string;
    avatar_url?: string | null;
  };
  attachments?: MessageAttachmentItem[];
  reactions?: MessageReactionItem[];
  replies?: ProjectMessageItem[];
}

export interface SendMessagePayload {
  content: string;
  code_snippet?: string;
  code_language?: string;
  parent_id?: number;
  attachments?: {
    file_name: string;
    file_url: string;
    file_type?: string;
    file_size_bytes?: number;
  }[];
}

// --- GitHub Integration & Git Analytics ---
export interface GithubCommitItem {
  id: number;
  sha: string;
  author_github: string;
  author_name: string;
  message: string;
  additions: number;
  deletions: number;
  committed_at: string;
  task?: {
    id: number;
    title: string;
    status: string;
  } | null;
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface GitContributorItem {
  author_name: string;
  commit_count: number;
  total_additions: number;
  total_deletions: number;
}

export interface GitTimelineItem {
  date: string;
  label: string;
  commits: number;
  additions: number;
  deletions: number;
}

export interface GitAnalyticsResponse {
  repo_configured: boolean;
  repo?: {
    id: number;
    repo_full_name: string;
    is_active: boolean;
  };
  total_commits: number;
  total_additions: number;
  total_deletions: number;
  net_lines: number;
  prs_count: number;
  prs_merged: number;
  contributors: GitContributorItem[];
  timeline: GitTimelineItem[];
  recent_commits: GithubCommitItem[];
}

export interface SimulateWebhookPayload {
  type?: 'commit' | 'pull_request';
  task_id?: number;
  message?: string;
  title?: string;
  additions?: number;
  deletions?: number;
  state?: 'open' | 'merged' | 'closed';
}

// --- Google Gemini Generative AI Assistant ---
export interface LeadAiSuggestions {
  summary: string;
  risk_level: 'Low' | 'Medium' | 'High';
  recommended_action: string;
  suggested_channel: string;
  key_talking_points: string[];
  optimal_timing: string;
  powered_by: string;
  provider: string;
}

export interface MeetingAiSummary {
  executive_summary: string;
  key_decisions: string[];
  action_items: {
    title: string;
    suggested_assignee: string;
    priority: string;
    suggested_due_days: number;
  }[];
  powered_by: string;
  provider: string;
}

export interface SprintAiRiskAssessment {
  risk_level: 'Low' | 'Medium' | 'Critical';
  prediction: string;
  risk_factors: string[];
  recommendations: string[];
  metrics: {
    completion_rate: number;
    blocked_tasks: number;
    total_tasks: number;
  };
  powered_by: string;
  provider: string;
}

export interface TaskBreakdownResponse {
  suggested_tasks: {
    title: string;
    description: string;
    priority: string;
    complexity: string;
    story_points: number;
    estimated_hours: number;
  }[];
  powered_by: string;
  provider: string;
}

// --- Developer Performance & Feedback ---
export interface FeedbackItem {
  id: number;
  task_id?: number | null;
  milestone_id?: number | null;
  rating: number;
  quality: number;
  communication: number;
  timeliness: number;
  understanding: number;
  would_work_again: boolean;
  comment?: string | null;
  is_excluded: boolean;
  exclusion_reason?: string | null;
  created_at: string;
  developer?: { id: number; name: string };
  client_user?: { id: number; name: string };
  task?: { id: number; title: string };
}

export interface DeveloperPerformanceTelemetry {
  developer_id: number;
  period: string;
  score: {
    final_score: number;
    client_score: number;
    ontime_score: number;
    rework_score: number;
    pm_score: number;
    estimate_score: number;
    sample_size: number;
    breakdown_json?: any;
  };
  history: {
    period: string;
    final_score: number;
  }[];
  feedbacks: FeedbackItem[];
}

export interface IntegrationSettingsResponse {
  gemini: {
    is_configured: boolean;
    has_cloud_key?: boolean;
    ai_mode?: 'built_in' | 'gemini_cloud';
    masked_key?: string | null;
    model: string;
  };
  github: {
    is_configured: boolean;
    default_org: string;
    has_secret: boolean;
    webhook_url: string;
  };
}

export const phase5Api = {
  // Storage & Direct Uploads
  requestPresignedUpload: async (params: {
    file_name: string;
    file_type: string;
    file_size_bytes: number;
    folder?: string;
  }): Promise<PresignedUploadResponse> => {
    const res = await api.post("/storage/presigned-upload", params);
    return res.data.data;
  },

  directUploadFile: async (file: File, folder?: string): Promise<UploadedFileResult> => {
    const formData = new FormData();
    formData.append("file", file);
    if (folder) formData.append("folder", folder);

    const res = await api.post("/storage/upload-direct", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },

  // Slack Project Chat
  getChannels: async (projectId: number): Promise<ProjectChannelItem[]> => {
    const res = await api.get(`/projects/${projectId}/channels`);
    return res.data.data;
  },

  getMessages: async (channelId: number, perPage: number = 50): Promise<{ data: ProjectMessageItem[] }> => {
    const res = await api.get(`/channels/${channelId}/messages?per_page=${perPage}`);
    return res.data;
  },

  sendMessage: async (channelId: number, payload: SendMessagePayload): Promise<ProjectMessageItem> => {
    const res = await api.post(`/channels/${channelId}/messages`, payload);
    return res.data.data;
  },

  toggleReaction: async (messageId: number, emoji: string): Promise<{ action: string; reactions: MessageReactionItem[] }> => {
    const res = await api.post(`/messages/${messageId}/react`, { emoji });
    return res.data.data;
  },

  // GitHub Integration & Git Analytics
  linkRepo: async (projectId: number, repoFullName: string, secret?: string) => {
    const res = await api.post(`/projects/${projectId}/github/link`, {
      repo_full_name: repoFullName,
      webhook_secret: secret,
    });
    return res.data.data;
  },

  getGitAnalytics: async (projectId: number): Promise<GitAnalyticsResponse> => {
    const res = await api.get(`/projects/${projectId}/github/analytics`);
    return res.data.data;
  },

  simulateGitWebhook: async (projectId: number, payload: SimulateWebhookPayload) => {
    const res = await api.post(`/projects/${projectId}/github/simulate-webhook`, payload);
    return res.data.data;
  },

  // Gemini AI Assistant
  getLeadSuggestions: async (leadId: number): Promise<LeadAiSuggestions> => {
    const res = await api.get(`/ai/leads/${leadId}/suggestions`);
    return res.data.data;
  },

  summarizeMeetingNotes: async (meetingId: number, notes?: string): Promise<MeetingAiSummary> => {
    const res = await api.post(`/ai/meetings/${meetingId}/summarize`, { notes });
    return res.data.data;
  },

  getSprintRisk: async (sprintId: number): Promise<SprintAiRiskAssessment> => {
    const res = await api.get(`/ai/sprints/${sprintId}/risk-assessment`);
    return res.data.data;
  },

  generateTaskBreakdown: async (projectId: number, requirement: string): Promise<TaskBreakdownResponse> => {
    const res = await api.post(`/ai/projects/${projectId}/generate-tasks`, { requirement });
    return res.data.data;
  },

  // Performance & Feedback
  submitTaskFeedback: async (taskId: number, data: {
    rating: number;
    quality?: number;
    communication?: number;
    timeliness?: number;
    understanding?: number;
    would_work_again?: boolean;
    comment?: string;
  }): Promise<FeedbackItem> => {
    const res = await api.post(`/feedback/tasks/${taskId}`, data);
    return res.data.data;
  },

  disputeFeedback: async (feedbackId: number, reason: string): Promise<FeedbackItem> => {
    const res = await api.post(`/feedback/${feedbackId}/dispute`, { reason });
    return res.data.data;
  },

  getDeveloperPerformance: async (developerId: number, period?: string): Promise<DeveloperPerformanceTelemetry> => {
    const url = period ? `/developers/${developerId}/performance?period=${period}` : `/developers/${developerId}/performance`;
    const res = await api.get(url);
    return res.data.data;
  },

  getPerformanceLeaderboard: async (period?: string) => {
    const url = period ? `/admin/performance/leaderboard?period=${period}` : `/admin/performance/leaderboard`;
    const res = await api.get(url);
    return res.data.data;
  },

  // Settings & Integrations
  getIntegrationSettings: async (): Promise<IntegrationSettingsResponse> => {
    const res = await api.get('/settings/integrations');
    return res.data.data;
  },

  updateIntegrationSettings: async (data: {
    ai_mode?: 'built_in' | 'gemini_cloud';
    gemini_api_key?: string;
    gemini_model?: string;
    github_default_org?: string;
    github_webhook_secret?: string;
  }): Promise<{ test_status?: string; ai_mode?: string }> => {
    const res = await api.post('/settings/integrations', data);
    return res.data.data;
  },
};
