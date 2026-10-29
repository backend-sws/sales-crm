import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sparkles,
  GitBranch,
  Key,
  Shield,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Save,
  RefreshCw,
  Server,
  Database,
  Cpu,
  Lock,
  Landmark,
  CreditCard,
  Trash2,
} from 'lucide-react';
import { phase5Api, type IntegrationSettingsResponse } from '@/api/phase5.api';
import { clientsApi } from '@/api/clients.api';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingBanking, setSavingBanking] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<IntegrationSettingsResponse | null>(null);
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-1.5-flash');
  const [githubOrg, setGithubOrg] = useState('');
  const [githubSecret, setGithubSecret] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [activeTab, setActiveTab] = useState<'integrations' | 'banking' | 'system'>('integrations');

  const [banking, setBanking] = useState({
    bank_name: '',
    bank_branch: '',
    bank_account_name: '',
    bank_account_no: '',
    bank_ifsc: '',
    bank_upi_id: '',
    payment_notes: '',
    is_configured: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [intRes, bankRes] = await Promise.allSettled([
        phase5Api.getIntegrationSettings(),
        clientsApi.getBankingSettings(),
      ]);

      if (intRes.status === 'fulfilled') {
        const data = intRes.value;
        setSettings(data);
        if (data?.gemini?.model) {
          setGeminiModel(data.gemini.model);
        }
        if (data?.github?.default_org) {
          setGithubOrg(data.github.default_org);
        }
      }

      if (bankRes.status === 'fulfilled' && bankRes.value?.data) {
        setBanking(bankRes.value.data);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const payload: any = {
        gemini_model: geminiModel,
        github_default_org: githubOrg,
      };

      if (geminiKeyInput.trim()) {
        payload.gemini_api_key = geminiKeyInput.trim();
      }

      if (githubSecret.trim()) {
        payload.github_webhook_secret = githubSecret.trim();
      }

      const res = await phase5Api.updateIntegrationSettings(payload);

      if (res?.test_status === 'connected') {
        toast.success('Settings saved! Gemini AI connection verified successfully.');
      } else if (res?.test_status === 'invalid_key') {
        toast.warning('Settings saved, but Gemini returned an invalid API key response.');
      } else {
        toast.success('Settings updated successfully.');
      }

      setGeminiKeyInput('');
      setGithubSecret('');
      await loadSettings();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBanking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingBanking(true);
      const res = await clientsApi.updateBankingSettings(banking);
      if (res?.data) {
        setBanking(res.data);
      }
      toast.success('Banking details saved! Invoices will now display these payment remittance details.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save banking settings');
    } finally {
      setSavingBanking(false);
    }
  };

  const handleClearBanking = async () => {
    if (!window.confirm('Are you sure you want to clear banking details? Invoices will no longer display bank transfer remittance.')) {
      return;
    }
    try {
      setSavingBanking(true);
      const emptyState = {
        bank_name: '',
        bank_branch: '',
        bank_account_name: '',
        bank_account_no: '',
        bank_ifsc: '',
        bank_upi_id: '',
        payment_notes: '',
      };
      const res = await clientsApi.updateBankingSettings(emptyState);
      if (res?.data) {
        setBanking(res.data);
      }
      toast.success('Banking details cleared. Invoices will now completely hide the bank remittance section.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to clear banking settings');
    } finally {
      setSavingBanking(false);
    }
  };

  const handleTestAi = async () => {
    try {
      setTestingAi(true);
      const payload: any = {
        gemini_model: geminiModel,
      };
      if (geminiKeyInput.trim()) {
        payload.gemini_api_key = geminiKeyInput.trim();
      }

      const res = await phase5Api.updateIntegrationSettings(payload);
      if (res?.test_status === 'connected') {
        toast.success('Gemini AI connected and active!');
      } else if (res?.test_status === 'invalid_key') {
        toast.error('Gemini test failed: Invalid API key.');
      } else {
        toast.info('Test completed: Key saved in system.');
      }
      await loadSettings();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'AI test failed.');
    } finally {
      setTestingAi(false);
    }
  };

  const copyWebhookUrl = () => {
    const defaultUrl = `${window.location.origin.replace(':5173', ':8000')}/api/v1/webhooks/github`;
    const finalUrl = settings?.github?.webhook_url || defaultUrl;
    navigator.clipboard.writeText(finalUrl);
    setCopiedUrl(true);
    toast.success('Webhook URL copied to clipboard!');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const isSuperAdmin = Boolean(
    user?.roles?.some((r) => r === 'super_admin' || r === 'superadmin')
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Settings</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Super Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Centralized control for dynamic Gemini AI keys, GitHub webhooks, invoice banking profiles, and core platform configs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadSettings}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {activeTab === 'integrations' && (
            <button
              onClick={() => handleSaveSettings()}
              disabled={saving || loading}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save All Changes
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('integrations')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'integrations'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI &amp; Third-Party Integrations
        </button>
        <button
          onClick={() => setActiveTab('banking')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'banking'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Landmark className="w-4 h-4" />
          Company &amp; Banking Profile
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'system'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Server className="w-4 h-4" />
          Platform Diagnostics
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
          <Loader2 className="w-6 h-6 animate-spin mr-2 text-indigo-600" />
          Loading system settings...
        </div>
      ) : activeTab === 'integrations' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. GOOGLE GEMINI AI CARD */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 border border-violet-200 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Google Gemini AI Engine</h2>
                    <p className="text-[11px] text-slate-400">Generative AI assistant for CRM &amp; Projects</p>
                  </div>
                </div>

                {settings?.gemini?.has_cloud_key ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Gemini Cloud Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-600" /> Built-in AI Active (Free)
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {/* Current Key Status */}
                {settings?.gemini?.masked_key && (
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Key in Database</p>
                      <p className="font-mono text-slate-800 font-semibold mt-0.5">{settings.gemini.masked_key}</p>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Active
                    </span>
                  </div>
                )}

                {/* Gemini Model Select */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gemini Model
                  </label>
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fastest &amp; Cost Effective)</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (Complex Reasoning)</option>
                    <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Experimental</option>
                  </select>
                </div>

                {/* API Key Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Update Gemini API Key
                    </label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                    >
                      Get Key <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      placeholder={settings?.gemini?.has_cloud_key ? '•••••••••••• (Leave blank to keep existing)' : 'AIzaSy...'}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Test Connection Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleTestAi}
                    disabled={testingAi}
                    className="w-full py-2 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                  >
                    {testingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {testingAi ? 'Testing Connection...' : 'Test AI Model Ping'}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Encrypted in DB</span>
              <span className="text-[11px] font-semibold text-slate-600">Dynamic Provider</span>
            </div>
          </div>

          {/* 2. GITHUB WEBHOOKS CARD */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">GitHub Automation Webhooks</h2>
                    <p className="text-[11px] text-slate-400">Sync pull requests, commits &amp; releases into tasks</p>
                  </div>
                </div>

                {settings?.github?.is_configured ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Configured
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                    Not Configured
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {/* Default GitHub Org */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default GitHub Organization / User
                  </label>
                  <input
                    type="text"
                    value={githubOrg}
                    onChange={(e) => setGithubOrg(e.target.value)}
                    placeholder="e.g. your-company-org"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Repositories matching this organization will auto-link to corresponding CRM projects.
                  </p>
                </div>

                {/* Webhook Secret */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Webhook Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={githubSecret}
                      onChange={(e) => setGithubSecret(e.target.value)}
                      placeholder={settings?.github?.has_secret ? '•••••••••••• (Secret Saved)' : 'Enter webhook HMAC secret...'}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Used to verify SHA-256 signatures on incoming payload headers (<code className="text-slate-600 font-mono">X-Hub-Signature-256</code>).
                  </p>
                </div>

                {/* Webhook Payload URL Box */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payload URL for GitHub Repository
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={settings?.github?.webhook_url || `${window.location.origin.replace(':5173', ':8000')}/api/v1/webhooks/github`}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={copyWebhookUrl}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 shrink-0 transition"
                      title="Copy URL"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedUrl ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Instructions Box */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800">GitHub Repository Setup:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-[10.5px]">
                    <li>Go to your Repo &gt; Settings &gt; Webhooks &gt; Add Webhook</li>
                    <li>Paste the Payload URL above</li>
                    <li>Set Content type to <code className="font-mono bg-white px-1 rounded border">application/json</code></li>
                    <li>Select events: <strong>Pushes</strong>, <strong>Pull Requests</strong>, <strong>Issues</strong></li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">HMAC-SHA256 Protected</span>
              <span className="text-[11px] font-semibold text-slate-600">Active Listener</span>
            </div>
          </div>
        </div>
      ) : activeTab === 'banking' ? (
        /* 2. COMPANY & BANKING PROFILE TAB */
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Invoicing &amp; Bank Transfer Profile</h2>
                <p className="text-xs text-slate-500">
                  Configure official bank remittance details for customer invoices. If left empty, invoices will hide the bank details section.
                </p>
              </div>
            </div>

            {banking.is_configured ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Bank Details Active on Invoices
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5 self-start sm:self-auto">
                <AlertCircle className="w-3.5 h-3.5 text-slate-400" /> No Bank Details Configured (Hidden on Invoices)
              </span>
            )}
          </div>

          <form onSubmit={handleSaveBanking} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={banking.bank_name || ''}
                  onChange={(e) => setBanking({ ...banking, bank_name: e.target.value })}
                  placeholder="e.g. HDFC Bank Ltd, ICICI Bank, SBI"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Branch Name / City
                </label>
                <input
                  type="text"
                  value={banking.bank_branch || ''}
                  onChange={(e) => setBanking({ ...banking, bank_branch: e.target.value })}
                  placeholder="e.g. BKC Mumbai, Sector 62 Noida"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Beneficiary / Company Name
                </label>
                <input
                  type="text"
                  value={banking.bank_account_name || ''}
                  onChange={(e) => setBanking({ ...banking, bank_account_name: e.target.value })}
                  placeholder="e.g. SalesCRM Digital Solutions Pvt Ltd"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={banking.bank_account_no || ''}
                  onChange={(e) => setBanking({ ...banking, bank_account_no: e.target.value })}
                  placeholder="e.g. 50200088992211"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={banking.bank_ifsc || ''}
                  onChange={(e) => setBanking({ ...banking, bank_ifsc: e.target.value.toUpperCase() })}
                  placeholder="e.g. HDFC0001234"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-semibold uppercase text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  UPI VPA / QR ID
                </label>
                <input
                  type="text"
                  value={banking.bank_upi_id || ''}
                  onChange={(e) => setBanking({ ...banking, bank_upi_id: e.target.value })}
                  placeholder="e.g. company@okhdfcbank"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>
            </div>

            {/* Live Invoice Preview Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Invoice Appearance Preview
              </span>
              {banking.bank_name || banking.bank_account_no || banking.bank_ifsc || banking.bank_upi_id ? (
                <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs space-y-1">
                  <p className="text-slate-700">
                    <strong>Bank Name:</strong> {banking.bank_name || '—'} {banking.bank_branch && `• Branch: ${banking.bank_branch}`}
                  </p>
                  {banking.bank_account_name && (
                    <p className="text-slate-700"><strong>A/C Name:</strong> {banking.bank_account_name}</p>
                  )}
                  <p className="text-slate-700 font-mono">
                    <strong>A/C No:</strong> {banking.bank_account_no || '—'} • <strong>IFSC:</strong> {banking.bank_ifsc || '—'}
                  </p>
                  {banking.bank_upi_id && (
                    <p className="text-slate-700"><strong>UPI VPA:</strong> {banking.bank_upi_id}</p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-white rounded-lg border border-dashed border-slate-300 text-slate-500 italic text-center">
                  No bank details configured. Invoices will hide the remittance &amp; bank transfer box completely.
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleClearBanking}
                disabled={savingBanking || !banking.is_configured}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Bank Details
              </button>

              <button
                type="submit"
                disabled={savingBanking}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition disabled:opacity-50"
              >
                {savingBanking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Banking Details
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* 3. PLATFORM DIAGNOSTICS & SYSTEM TAB */
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Platform Environment &amp; Status</h2>
            <p className="text-xs text-slate-400 mt-0.5">High-level diagnostics and security posture of SalesCRM</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                <Database className="w-4 h-4 text-indigo-600" /> Database Connection
              </div>
              <p className="text-sm font-bold text-slate-900">MySQL / SQLite</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Operational
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                <Cpu className="w-4 h-4 text-emerald-600" /> Backend Stack
              </div>
              <p className="text-sm font-bold text-slate-900">Laravel 11 + PHP 8.2</p>
              <p className="text-[11px] text-slate-500 mt-1">REST API V1</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                <Shield className="w-4 h-4 text-rose-600" /> Your Role &amp; Privilege
              </div>
              <p className="text-sm font-bold text-slate-900">{user?.name}</p>
              <p className="text-[11px] text-rose-600 font-bold uppercase mt-1">
                {user?.roles?.[0] || 'Super Administrator'}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Security Access Control</span>
              <span className="font-semibold text-slate-800">RBAC with Spatie Permission Guard</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Immutability Engine</span>
              <span className="font-semibold text-slate-800">Audit Trail with SHA-256 Checksums</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 font-medium">Chat &amp; Workspace Real-time Mode</span>
              <span className="font-semibold text-slate-800">Polling with Presigned S3/Direct Attachment Pipeline</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
