import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Check,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  Briefcase,
  FolderKanban,
  FileCheck,
  CreditCard,
  BarChart3,
  GitBranch,
  Settings,
} from 'lucide-react';
import { adminApi, type RolesPermissionsResponseData } from '@/api/admin.api';
import { toast } from 'sonner';

const ROLE_META: Record<
  string,
  { label: string; description: string; badgeColor: string }
> = {
  super_admin: {
    label: 'Super Administrator',
    description: 'System owner with root privileges, immutable access to all financial, admin, and audit records.',
    badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  sales_manager: {
    label: 'Sales Manager',
    description: 'Leads sales team, oversees pipeline forecasts, assigns leads, and approves client conversions.',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  sales_agent: {
    label: 'Sales Agent',
    description: 'Focuses strictly on own assigned leads, follow-ups, and customer relationship outreach.',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  project_manager: {
    label: 'Project Manager',
    description: 'Manages project sprints, budgets, team capacity, SOW scope baselines, and milestone invoices.',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  developer: {
    label: 'Developer / Engineer',
    description: 'Works on assigned sprint tasks, logs work hours, collaborates on Slack chat, and commits code.',
    badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
  account_manager: {
    label: 'Account Manager',
    description: 'Oversees post-launch client retainers, handles support tickets, and uploads monthly reports.',
    badgeColor: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  },
  client: {
    label: 'External Client',
    description: 'Client portal guest. Restricted exclusively to own company scope approval, MoM confirmation, and task signoffs.',
    badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  },
};

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Leads & Pipeline': Briefcase,
  'Follow-Ups & Tasks': CheckCircle2,
  'Clients & Service Track': Users,
  'Projects & Sprints': FolderKanban,
  'Scope Governance & MoM': FileCheck,
  'Financials & Time Logs': CreditCard,
  'Analytics & Forecasting': BarChart3,
  'Collaboration & Git': GitBranch,
  'Administration & System': Settings,
};

export function RolePermissionsMatrixPanel() {
  const [data, setData] = useState<RolesPermissionsResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>('sales_manager');
  const [currentPermissions, setCurrentPermissions] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadMatrix = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getRolesPermissions();
      if (res.success && res.data) {
        setData(res.data);
        const initialPerms = res.data.matrix[selectedRole] || [];
        setCurrentPermissions(initialPerms);
        setDirty(false);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load RBAC permissions matrix.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, []);

  const handleSelectRole = (role: string) => {
    if (dirty) {
      if (!window.confirm('You have unsaved permission changes. Switch role anyway?')) {
        return;
      }
    }
    setSelectedRole(role);
    if (data?.matrix) {
      setCurrentPermissions(data.matrix[role] || []);
      setDirty(false);
    }
  };

  const isSuperAdmin = selectedRole === 'super_admin';

  const togglePermission = (permKey: string) => {
    if (isSuperAdmin) {
      toast.info('Super Administrator retains all system permissions and cannot be modified.');
      return;
    }

    setCurrentPermissions((prev) => {
      const next = prev.includes(permKey)
        ? prev.filter((p) => p !== permKey)
        : [...prev, permKey];
      setDirty(true);
      return next;
    });
  };

  const toggleCategory = (permKeys: string[], allActive: boolean) => {
    if (isSuperAdmin) return;
    setCurrentPermissions((prev) => {
      let next: string[];
      if (allActive) {
        // Deselect all in category
        next = prev.filter((p) => !permKeys.includes(p));
      } else {
        // Select all in category
        const combined = new Set([...prev, ...permKeys]);
        next = Array.from(combined);
      }
      setDirty(true);
      return next;
    });
  };

  const handleRevert = () => {
    if (!data) return;
    setCurrentPermissions(data.matrix[selectedRole] || []);
    setDirty(false);
    toast.info('Reverted changes to original database state.');
  };

  const handleSave = async () => {
    if (isSuperAdmin) return;
    try {
      setSaving(true);
      const res = await adminApi.syncRolePermissions({
        role: selectedRole,
        permissions: currentPermissions,
      });

      if (res.success) {
        toast.success(`Role '${ROLE_META[selectedRole]?.label || selectedRole}' permissions updated!`);
        setDirty(false);
        // Refresh local cache
        if (data) {
          setData({
            ...data,
            matrix: {
              ...data.matrix,
              [selectedRole]: currentPermissions,
            },
          });
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to sync permissions.');
    } finally {
      setSaving(false);
    }
  };

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!data?.categories) return {};
    if (!searchQuery.trim()) return data.categories;

    const query = searchQuery.toLowerCase().trim();
    const result: Record<string, Record<string, string>> = {};

    Object.entries(data.categories).forEach(([categoryName, perms]) => {
      const matchingPerms: Record<string, string> = {};
      Object.entries(perms).forEach(([key, label]) => {
        if (key.toLowerCase().includes(query) || label.toLowerCase().includes(query)) {
          matchingPerms[key] = label;
        }
      });
      if (Object.keys(matchingPerms).length > 0) {
        result[categoryName] = matchingPerms;
      }
    });

    return result;
  }, [data, searchQuery]);

  if (loading) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center space-y-3 text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        <span className="text-xs font-medium">Loading RBAC governance schema...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900">
        Unable to load RBAC permissions catalog. Please ensure you have Super Administrator privileges.
      </div>
    );
  }

  const roleMeta = ROLE_META[selectedRole] || {
    label: selectedRole,
    description: 'Custom System Role',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const totalPossible = data.total_permissions || 42;
  const activeCount = isSuperAdmin ? totalPossible : currentPermissions.length;
  const percentage = Math.round((activeCount / totalPossible) * 100);

  return (
    <div className="space-y-6">
      {/* Role Selection Tabs */}
      <div className="p-2 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {data.roles.map((role) => {
          const isSelected = selectedRole === role.name;
          const assignedCount =
            role.name === 'super_admin'
              ? totalPossible
              : (data.matrix[role.name] || []).length;

          return (
            <button
              key={role.id}
              onClick={() => handleSelectRole(role.name)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              {role.name === 'super_admin' && <Lock className="w-3.5 h-3.5 text-purple-500" />}
              <span>{ROLE_META[role.name]?.label || role.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300'
                    : 'bg-slate-200/80 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {assignedCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Role Header Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${roleMeta.badgeColor}`}
            >
              {roleMeta.label}
            </span>
            <span className="text-xs font-mono text-slate-400">role: {selectedRole}</span>
            {isSuperAdmin && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800/40">
                <Lock className="w-3 h-3" /> Root Immunity Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            {roleMeta.description}
          </p>
        </div>

        {/* Permissions Coverage Metric */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Authorization Coverage
            </span>
            <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {activeCount}
              </span>
              <span className="text-xs text-slate-400 font-bold">/ {totalPossible} perms</span>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 ml-1">
                ({percentage}%)
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Shield className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Toolbar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search permissions by keyword or action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5">
          {dirty && (
            <button
              onClick={handleRevert}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Revert
            </button>
          )}

          {!isSuperAdmin && (
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                dirty && !saving
                  ? 'bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white cursor-pointer shadow-indigo-600/20 hover:scale-[1.02]'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed border border-slate-200/80 dark:border-white/5'
              }`}
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save &amp; Sync Permissions</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Object.entries(filteredCategories).map(([categoryTitle, permissionsMap]) => {
          const CategoryIcon = CATEGORY_ICONS[categoryTitle] || ShieldCheck;
          const permKeys = Object.keys(permissionsMap);
          const activeInCat = permKeys.filter(
            (k) => isSuperAdmin || currentPermissions.includes(k)
          ).length;
          const allActive = activeInCat === permKeys.length;
          const someActive = activeInCat > 0 && !allActive;

          return (
            <div
              key={categoryTitle}
              className="rounded-3xl bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs flex flex-col justify-between"
            >
              <div>
                {/* Module Header */}
                <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.01]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <CategoryIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">
                        {categoryTitle}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {activeInCat} / {permKeys.length} enabled
                      </span>
                    </div>
                  </div>

                  {!isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => toggleCategory(permKeys, allActive)}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {allActive ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {/* Permissions List */}
                <div className="p-3 space-y-1.5">
                  {Object.entries(permissionsMap).map(([permKey, permLabel]) => {
                    const isChecked = isSuperAdmin || currentPermissions.includes(permKey);

                    return (
                      <div
                        key={permKey}
                        onClick={() => togglePermission(permKey)}
                        className={`group p-2.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                          isSuperAdmin
                            ? 'cursor-default bg-slate-50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5'
                            : 'cursor-pointer hover:bg-slate-50/80 dark:hover:bg-white/[0.03]'
                        } ${
                          isChecked
                            ? 'border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/20 dark:bg-indigo-950/10'
                            : 'border-slate-100 dark:border-white/5'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <p
                            className={`text-xs font-semibold leading-tight ${
                              isChecked
                                ? 'text-slate-900 dark:text-white'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {permLabel}
                          </p>
                          <span className="text-[10px] font-mono text-slate-400 truncate block">
                            {permKey}
                          </span>
                        </div>

                        <div className="shrink-0 pt-0.5">
                          <div
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                              isChecked
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Module Footer Progress Bar */}
              <div className="px-4 py-2 border-t border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.01]">
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      allActive
                        ? 'bg-emerald-500'
                        : someActive
                        ? 'bg-indigo-500'
                        : 'bg-transparent'
                    }`}
                    style={{
                      width: `${(activeInCat / permKeys.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
