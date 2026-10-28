import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  FileText,
  Clock,
  Layers,
  Send,
  Loader2,
  Copy,
  Check,
  Plus,
  Key,
  Settings,
  ExternalLink,
  X,
  Zap,
} from 'lucide-react';
import {
  phase5Api,
  type TaskBreakdownResponse,
  type SprintAiRiskAssessment,
  type MeetingAiSummary,
} from '@/api/phase5.api';
import { projectsApi, type SprintItem } from '@/api/projects.api';
import { toast } from 'sonner';

interface ProjectAiInsightsPanelProps {
  projectId: number;
  projectTitle: string;
  sprints?: SprintItem[];
  onTaskCreated?: () => void;
}

export function ProjectAiInsightsPanel({
  projectId,
  projectTitle,
  sprints = [],
  onTaskCreated,
}: ProjectAiInsightsPanelProps) {
  // Tab within AI panel: 'breakdown' | 'sprint_risk' | 'mom_summary'
  const [activeTab, setActiveTab] = useState<'breakdown' | 'sprint_risk' | 'mom_summary'>('breakdown');

  // Tool 1: Task Breakdown Generator State
  const [requirementText, setRequirementText] = useState('');
  const [breakdownResult, setBreakdownResult] = useState<TaskBreakdownResponse | null>(null);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [addingTaskId, setAddingTaskId] = useState<number | null>(null);

  // Tool 2: Sprint Risk Predictor State
  const [selectedSprintId, setSelectedSprintId] = useState<number | ''>(
    sprints.length > 0 ? sprints[0].id : ''
  );
  const [sprintRiskResult, setSprintRiskResult] = useState<SprintAiRiskAssessment | null>(null);
  const [analyzingSprint, setAnalyzingSprint] = useState(false);

  // Tool 3: MoM Summarizer State
  const [rawNotesText, setRawNotesText] = useState('');
  const [momSummaryResult, setMomSummaryResult] = useState<MeetingAiSummary | null>(null);
  const [summarizingMom, setSummarizingMom] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // AI Intelligence Engine & Gemini Config State
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [modalMode, setModalMode] = useState<'built_in' | 'gemini_cloud'>('built_in');
  const [aiMode, setAiMode] = useState<'built_in' | 'gemini_cloud'>('built_in');
  const [hasCloudKey, setHasCloudKey] = useState(false);
  const [maskedCloudKey, setMaskedCloudKey] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-1.5-flash');
  const [savingKey, setSavingKey] = useState(false);
  const [isKeyConfigured, setIsKeyConfigured] = useState(true);

  const loadSettings = () => {
    phase5Api.getIntegrationSettings().then((res) => {
      if (res && res.gemini) {
        setIsKeyConfigured(res.gemini.is_configured ?? true);
        setHasCloudKey(Boolean(res.gemini.has_cloud_key));
        setMaskedCloudKey(res.gemini.masked_key || null);
        const mode = res.gemini.ai_mode || (res.gemini.has_cloud_key ? 'gemini_cloud' : 'built_in');
        setAiMode(mode);
        setModalMode(mode);
        if (res.gemini.model) setGeminiModel(res.gemini.model);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleActivateBuiltInAi = async () => {
    try {
      setSavingKey(true);
      await phase5Api.updateIntegrationSettings({
        ai_mode: 'built_in',
      });
      setAiMode('built_in');
      setModalMode('built_in');
      toast.success('Built-in Smart CRM AI activated! Ready for task breakdown & risk prediction.');
      setShowKeyModal(false);
      loadSettings();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to activate built-in AI.');
    } finally {
      setSavingKey(false);
    }
  };

  const handleSaveGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiApiKey.trim() && !hasCloudKey) {
      toast.error('Please enter a valid Gemini API key.');
      return;
    }

    try {
      setSavingKey(true);
      const payload: any = {
        ai_mode: 'gemini_cloud',
        gemini_model: geminiModel,
      };
      if (geminiApiKey.trim()) {
        payload.gemini_api_key = geminiApiKey.trim();
      }

      const res = await phase5Api.updateIntegrationSettings(payload);

      if (res.test_status === 'connected') {
        toast.success('Google Gemini 1.5 Flash connected and verified successfully!');
      } else if (res.test_status === 'invalid_key') {
        toast.warning('Key saved, but Google returned an invalid API key error.');
      } else if (res.test_status === 'connection_error') {
        toast.warning('Key saved, but Google could not be reached. Local fallback will be used if needed.');
      } else {
        toast.success('Gemini Cloud settings saved!');
      }

      setAiMode('gemini_cloud');
      setShowKeyModal(false);
      setGeminiApiKey('');
      loadSettings();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save Gemini API key.');
    } finally {
      setSavingKey(false);
    }
  };

  const handleDisconnectCloudKey = async () => {
    try {
      setSavingKey(true);
      await phase5Api.updateIntegrationSettings({
        ai_mode: 'built_in',
        gemini_api_key: '',
      });
      setAiMode('built_in');
      setModalMode('built_in');
      setHasCloudKey(false);
      setMaskedCloudKey(null);
      setGeminiApiKey('');
      toast.success('Switched back to Built-in Smart AI mode.');
      setShowKeyModal(false);
      loadSettings();
    } catch (err: any) {
      toast.error('Failed to disconnect key.');
    } finally {
      setSavingKey(false);
    }
  };

  // 1. Generate Task Breakdown
  const handleGenerateBreakdown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirementText.trim()) {
      toast.error('Please enter a feature requirement.');
      return;
    }

    try {
      setGeneratingTasks(true);
      const res = await phase5Api.generateTaskBreakdown(projectId, requirementText.trim());
      setBreakdownResult(res);
      toast.success('Task breakdown generated by Gemini AI!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate task breakdown.');
    } finally {
      setGeneratingTasks(false);
    }
  };

  // Convert AI suggested task directly to a project task
  const handleCreateTaskFromAi = async (task: any, index: number) => {
    try {
      setAddingTaskId(index);
      await projectsApi.createTask(projectId, {
        title: task.title,
        description: task.description,
        priority: task.priority || 'medium',
        complexity: task.complexity || 'medium',
        story_points: task.story_points || 3,
        estimated_hours: task.estimated_hours || 4.0,
      });

      toast.success(`Task '${task.title}' added to project board!`);
      if (onTaskCreated) onTaskCreated();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create task.');
    } finally {
      setAddingTaskId(null);
    }
  };

  // 2. Analyze Sprint Risk
  const handleAnalyzeSprint = async () => {
    if (!selectedSprintId) {
      toast.error('Select a sprint to evaluate.');
      return;
    }

    try {
      setAnalyzingSprint(true);
      const res = await phase5Api.getSprintRisk(Number(selectedSprintId));
      setSprintRiskResult(res);
      toast.success('Sprint risk assessment generated!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to analyze sprint risk.');
    } finally {
      setAnalyzingSprint(false);
    }
  };

  // 3. Summarize MoM Notes
  const handleSummarizeMom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawNotesText.trim()) {
      toast.error('Please enter meeting notes to summarize.');
      return;
    }

    try {
      setSummarizingMom(true);
      // Use 0 as virtual meeting id to trigger summarization
      const res = await phase5Api.summarizeMeetingNotes(1, rawNotesText.trim());
      setMomSummaryResult(res);
      toast.success('MoM notes summarized by Gemini AI!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to summarize notes.');
    } finally {
      setSummarizingMom(false);
    }
  };

  const copyMomToClipboard = () => {
    if (!momSummaryResult) return;
    const formatted = `### Executive Summary\n${momSummaryResult.executive_summary}\n\n### Key Decisions\n${momSummaryResult.key_decisions.map(d => `- ${d}`).join('\n')}\n\n### Action Items\n${momSummaryResult.action_items.map(a => `- [ ] ${a.title} (@${a.suggested_assignee}, ${a.priority.toUpperCase()})`).join('\n')}`;
    navigator.clipboard.writeText(formatted);
    setCopiedSummary(true);
    toast.success('Summary copied to clipboard!');
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 bg-white border border-slate-200/90 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
            <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-sm">
                {aiMode === 'gemini_cloud' && hasCloudKey
                  ? 'Google Gemini Generative AI Assistant'
                  : 'SalesCRM Smart AI Assistant'}
              </h3>
              {aiMode === 'gemini_cloud' && hasCloudKey ? (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {geminiModel} (Cloud Connected)
                </span>
              ) : (
                <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-indigo-600" />
                  Built-in Smart Engine (Active & Free)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Advisory intelligence for technical task breakdown, sprint delivery forecast, and meeting synthesis.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setModalMode(aiMode);
              setShowKeyModal(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-600" />
            {aiMode === 'gemini_cloud' && hasCloudKey ? 'Gemini Cloud Configured' : 'Configure AI Engine'}
          </button>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('breakdown')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'breakdown'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Task Breakdown
            </button>
            <button
              onClick={() => setActiveTab('sprint_risk')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'sprint_risk'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sprint Health
            </button>
            <button
              onClick={() => setActiveTab('mom_summary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'mom_summary'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              MoM Summarizer
            </button>
          </div>
        </div>
      </div>

      {/* --- TAB 1: TASK BREAKDOWN GENERATOR --- */}
      {activeTab === 'breakdown' && (
        <div className="space-y-5">
          <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
            <h4 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-indigo-600" />
              Automated Technical Task Breakdown
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Enter a high-level requirement or client change request. Gemini AI will architect the technical subtasks, story points, and estimated hours.
            </p>

            <form onSubmit={handleGenerateBreakdown} className="space-y-3">
              <textarea
                rows={3}
                value={requirementText}
                onChange={(e) => setRequirementText(e.target.value)}
                placeholder="Example: Implement live GPS fleet tracking with WebSockets, battery telemetry, and offline queueing..."
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed font-normal"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {aiMode === 'gemini_cloud' && hasCloudKey
                    ? 'Powered by Google Gemini Cloud with smart heuristic fallback.'
                    : 'Powered by Built-in Smart CRM AI (Local Heuristic Engine - 0 Latency).'}
                </span>
                <button
                  type="submit"
                  disabled={generatingTasks || !requirementText.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition"
                >
                  {generatingTasks ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  Generate Subtasks
                </button>
              </div>
            </form>
          </div>

          {/* Breakdown Results */}
          {breakdownResult && (
            <div className="p-5 bg-white border border-slate-200/90 rounded-2xl space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Suggested Subtasks</h4>
                  <p className="text-xs text-slate-500">{breakdownResult.powered_by}</p>
                </div>
                <span className="text-xs text-emerald-700 font-mono font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  {breakdownResult.suggested_tasks.length} tasks architected
                </span>
              </div>

              <div className="space-y-3">
                {breakdownResult.suggested_tasks.map((task, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50/70 hover:bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">{task.title}</span>
                        <span className="text-[10px] bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded font-mono font-semibold uppercase">
                          {task.complexity}
                        </span>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded font-mono font-semibold">
                          {task.story_points} SP
                        </span>
                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-mono font-semibold">
                          {task.estimated_hours}h
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{task.description}</p>
                    </div>

                    <button
                      onClick={() => handleCreateTaskFromAi(task, idx)}
                      disabled={addingTaskId === idx}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold text-xs flex items-center gap-1.5 shrink-0 transition shadow-2xs"
                    >
                      {addingTaskId === idx ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      Add to Board
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: SPRINT RISK PREDICTOR --- */}
      {activeTab === 'sprint_risk' && (
        <div className="space-y-5">
          <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
            <h4 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Sprint Delivery Risk & Velocity Predictor
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              AI analyzes task velocity, dependencies, rework rates, and remaining hours to forecast delivery delays before they occur.
            </p>

            <div className="flex flex-col md:flex-row items-center gap-3">
              <select
                value={selectedSprintId}
                onChange={(e) => setSelectedSprintId(e.target.value ? Number(e.target.value) : '')}
                className="w-full md:w-80 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="">Select a sprint...</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status.toUpperCase()})
                  </option>
                ))}
              </select>

              <button
                onClick={handleAnalyzeSprint}
                disabled={analyzingSprint || !selectedSprintId}
                className="w-full md:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition"
              >
                {analyzingSprint ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Analyze Sprint Health
              </button>
            </div>
          </div>

          {sprintRiskResult && (
            <div className="p-5 bg-white border border-slate-200/90 rounded-2xl space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      sprintRiskResult.risk_level === 'Low'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : sprintRiskResult.risk_level === 'Medium'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    Risk Level: {sprintRiskResult.risk_level}
                  </span>
                  <span className="text-xs text-slate-500">{sprintRiskResult.powered_by}</span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-600 font-mono font-medium">
                  <span>Completion: <b className="text-slate-900">{sprintRiskResult.metrics.completion_rate}%</b></span>
                  <span>Blocked: <b className="text-rose-600">{sprintRiskResult.metrics.blocked_tasks}</b></span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-xs font-medium text-slate-800 leading-relaxed">
                  {sprintRiskResult.prediction}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-rose-50/40 border border-rose-200/70 rounded-xl">
                  <h5 className="font-bold text-rose-700 text-xs mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Risk Factors
                  </h5>
                  <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                    {sprintRiskResult.risk_factors.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-emerald-50/40 border border-emerald-200/70 rounded-xl">
                  <h5 className="font-bold text-emerald-700 text-xs mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Recommendations
                  </h5>
                  <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                    {sprintRiskResult.recommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: MoM MEETING SUMMARIZER --- */}
      {activeTab === 'mom_summary' && (
        <div className="space-y-5">
          <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
            <h4 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Meeting Minutes (MoM) Auto-Summarizer
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Paste unstructured meeting notes or transcript. Gemini AI will auto-extract Executive Summary, Key Decisions, and Action Items.
            </p>

            <form onSubmit={handleSummarizeMom} className="space-y-3">
              <textarea
                rows={4}
                value={rawNotesText}
                onChange={(e) => setRawNotesText(e.target.value)}
                placeholder="Paste client sync notes, decisions, or raw transcript..."
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 leading-relaxed font-mono font-normal"
              />
              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={summarizingMom || !rawNotesText.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition"
                >
                  {summarizingMom ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  Summarize MoM
                </button>
              </div>
            </form>
          </div>

          {momSummaryResult && (
            <div className="p-5 bg-white border border-slate-200/90 rounded-2xl space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Structured MoM Synthesis</h4>
                  <p className="text-xs text-slate-500">{momSummaryResult.powered_by}</p>
                </div>
                <button
                  onClick={copyMomToClipboard}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSummary ? 'Copied' : 'Copy All'}
                </button>
              </div>

              {/* Executive Summary */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <h5 className="font-bold text-slate-500 text-xs uppercase tracking-wider mb-1.5">
                  Executive Summary
                </h5>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {momSummaryResult.executive_summary}
                </p>
              </div>

              {/* Key Decisions */}
              <div className="p-4 bg-emerald-50/40 border border-emerald-200/70 rounded-xl">
                <h5 className="font-bold text-emerald-700 text-xs uppercase tracking-wider mb-2">
                  Key Decisions
                </h5>
                <ul className="space-y-1.5 text-xs text-slate-800 list-disc list-inside font-medium">
                  {momSummaryResult.key_decisions.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>

              {/* Action Items */}
              <div className="p-4 bg-indigo-50/20 border border-indigo-200/60 rounded-xl">
                <h5 className="font-bold text-indigo-700 text-xs uppercase tracking-wider mb-2">
                  Action Items
                </h5>
                <div className="space-y-2">
                  {momSummaryResult.action_items.map((action, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="text-slate-800 font-semibold">{action.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-semibold">
                          @{action.suggested_assignee}
                        </span>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-mono font-semibold uppercase">
                          {action.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- CONFIGURE AI INTELLIGENCE ENGINE MODAL --- */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-sm">Configure CRM AI Intelligence Engine</h4>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="p-4 pb-0">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalMode('built_in')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    modalMode === 'built_in'
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-indigo-600" />
                  Built-in Smart AI
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">Free</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('gemini_cloud')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    modalMode === 'gemini_cloud'
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                  Google Gemini Cloud
                </button>
              </div>
            </div>

            {/* Tab 1: Built-in Smart AI */}
            {modalMode === 'built_in' ? (
              <div className="p-5 space-y-4">
                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-indigo-600" /> Local Heuristic AI Engine
                    </span>
                    {aiMode === 'built_in' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Currently Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Designed specifically for agile software projects. Operates 100% locally with zero latency, zero quota limits, and no external Google API key needed.
                  </p>
                  <div className="space-y-1.5 pt-1 text-[11px] text-slate-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Automatic technical task & story points breakdown</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Sprint velocity risk assessment & bottleneck forecasts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Meeting notes synthesis, decisions, and action items</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowKeyModal(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={savingKey}
                    onClick={handleActivateBuiltInAi}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition"
                  >
                    {savingKey ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    {aiMode === 'built_in' ? 'Keep Built-in Mode Active' : 'Activate Built-in AI Mode'}
                  </button>
                </div>
              </div>
            ) : (
              /* Tab 2: Google Gemini Cloud */
              <form onSubmit={handleSaveGeminiKey} className="p-5 space-y-4">
                {hasCloudKey && maskedCloudKey && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Key in Database</p>
                      <p className="font-mono text-slate-800 font-semibold mt-0.5">{maskedCloudKey}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDisconnectCloudKey}
                      disabled={savingKey}
                      className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition border border-rose-200"
                    >
                      Disconnect Key
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Google Gemini API Key (Free Tier)
                  </label>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder={hasCloudKey ? 'Enter new key to replace existing...' : 'AIzaSy...'}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <span className="text-slate-400">Free tier quota: 15 RPM / 1M TPM</span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      Get Free Key from Google AI Studio <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gemini Model</label>
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recommended - Fastest & Free)</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  </select>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <p>• Your key is securely stored in <code>app_settings</code> table.</p>
                  <p>• If offline or quota exhausted, the system automatically falls back to analytical heuristics.</p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowKeyModal(false)}
                    className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingKey || (!geminiApiKey.trim() && !hasCloudKey)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition"
                  >
                    {savingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Test Connection & Save Key
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
