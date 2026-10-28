import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Eye,
  Briefcase,
  TrendingUp,
  Search,
  CheckCircle2,
  XCircle,
  Sparkles,
  Phone,
  Mail,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdminUserItem } from '@/api/admin.api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { RolePermissionsMatrixPanel } from '@/features/admin/components/RolePermissionsMatrixPanel';

const ROLE_OPTIONS = [
  { value: 'sales_agent', label: 'Sales Agent (Field / Tele-caller)', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  { value: 'sales_manager', label: 'Sales Manager (Team Lead)', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30' },
  { value: 'super_admin', label: 'Super Administrator (Full Access)', color: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30' },
  { value: 'project_manager', label: 'Project Manager (Delivery Track)', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  { value: 'developer', label: 'Developer / Technical Staff', color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30' },
];

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user: currentUser, impersonate } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'rbac'>('users');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'password123',
    role: 'sales_agent',
  });

  const { data: usersRes, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.getUsers(),
  });

  const users = usersRes?.data || [];

  // Create User Mutation
  const createMutation = useMutation({
    mutationFn: (payload: typeof formData) => adminApi.createUser(payload),
    onSuccess: (res) => {
      toast.success(res.message || 'User created successfully.');
      setIsCreateOpen(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: 'password123',
        role: 'sales_agent',
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create user.');
    },
  });

  // Toggle Active Mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      adminApi.updateUser(id, { is_active }),
    onSuccess: (_, vars) => {
      toast.success(`User status set to ${vars.is_active ? 'Active' : 'Inactive'}.`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: () => toast.error('Failed to update user status.'),
  });

  // Impersonate Mutation
  const impersonateMutation = useMutation({
    mutationFn: async (target: AdminUserItem) => {
      setImpersonatingId(target.id);
      const res = await adminApi.startImpersonation(
        target.id,
        'Super Admin UI test & diagnostics session'
      );
      return { res: res.data, target };
    },
    onSuccess: ({ res, target }) => {
      impersonate(
        {
          id: target.id,
          name: target.name,
          email: target.email,
          phone: target.phone,
          roles: target.roles,
        },
        res.token
      );
      toast.success(`Now viewing CRM as ${target.name} (${target.role}).`);
      navigate('/dashboard');
    },
    onError: (err: any) => {
      setImpersonatingId(null);
      toast.error(err.response?.data?.message || 'Failed to initiate impersonation.');
    },
  });

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const isSuperAdmin = currentUser?.roles?.includes('super_admin');

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-primary-500" /> Team &amp; User Administration
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage sales personnel, assign system roles, view agent pipelines, and initiate secure diagnostics impersonation.
          </p>
        </div>

        {isSuperAdmin && activeAdminTab === 'users' && (
          <Button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="h-10 text-xs bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl gap-2 shadow-md shadow-primary-600/20"
          >
            <UserPlus className="w-4 h-4" /> Add Team Member
          </Button>
        )}
      </div>

      {/* Admin Section Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveAdminTab('users')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeAdminTab === 'users'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Team Members Directory ({users.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('rbac')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeAdminTab === 'rbac'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Role &amp; Permissions Matrix Governance
        </button>
      </div>

      {activeAdminTab === 'users' ? (
        <>
          {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total Staff
          </span>
          <span className="text-2xl font-black text-slate-900 dark:text-white">
            {users.length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 shadow-xs">
          <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider block mb-1">
            Sales Agents
          </span>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {users.filter((u) => u.roles?.includes('sales_agent')).length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 shadow-xs">
          <span className="text-[11px] font-bold text-purple-500 uppercase tracking-wider block mb-1">
            Managers
          </span>
          <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {users.filter((u) => u.roles?.includes('sales_manager')).length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block mb-1">
            Active Accounts
          </span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {users.filter((u) => u.is_active).length}
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 bg-white dark:bg-[#121217] p-2.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs">
        <Search className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search members by name, email, phone, or role..."
          className="bg-transparent border-0 outline-none text-xs w-full text-slate-800 dark:text-white placeholder:text-slate-400"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Active Pipeline</th>
                <th className="py-3 px-4">Won Revenue</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading team members...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No team members found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((item) => {
                  const roleConfig = ROLE_OPTIONS.find((r) => r.value === item.role) || {
                    label: item.role.replace('_', ' '),
                    color: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300',
                  };
                  const isCurrent = currentUser?.id === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold flex items-center justify-center shrink-0 border border-primary-500/20 text-xs">
                            {item.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                              <span>{item.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-300 font-normal">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-400" />
                                {item.email}
                              </span>
                              {item.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {item.phone}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${roleConfig.color}`}
                        >
                          {item.role.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {item.open_deals_count} open deals
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatINR(item.won_revenue)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          disabled={isCurrent}
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: item.id,
                              is_active: !item.is_active,
                            })
                          }
                          className={`inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer transition-opacity ${
                            item.is_active
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400'
                          } ${isCurrent ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                        >
                          {item.is_active ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" /> Inactive
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isSuperAdmin && !isCurrent && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={impersonateMutation.isPending && impersonatingId === item.id}
                              onClick={() => impersonateMutation.mutate(item)}
                              className="h-8 text-xs rounded-xl gap-1.5 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer shadow-xs"
                              title={`View CRM exactly as ${item.name}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>
                                {impersonateMutation.isPending && impersonatingId === item.id
                                  ? 'Switching...'
                                  : 'View As'}
                              </span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      ) : (
        <RolePermissionsMatrixPanel />
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Team Member"
        maxWidth="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Full Name *
            </label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Ankit Singhal"
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Email Address *
              </label>
              <Input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ankit@company.com"
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Phone Number
              </label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Role &amp; Permissions *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 outline-none"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Temporary Password *
              </label>
              <Input
                required
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="password123"
                className="text-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              className="text-xs h-9 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="text-xs h-9 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold"
            >
              {createMutation.isPending ? 'Creating Account...' : 'Create Account'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
