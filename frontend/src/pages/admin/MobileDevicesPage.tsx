import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { ApiResponse } from '../../types';
import { schoolUrl } from '../../utils/tenant';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MobileOrgConfig {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'trial' | 'suspended';
  mobileEnabled: boolean;
  activeMobileUsers: number;
  primaryColor: string;
  logoUrl: string | null;
  hasQrSecret: boolean;
}

interface MobileUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  branchName: string | null;
  deviceCount: number;
  registered: boolean;
  lastLoginAt: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  group_admin: 'Group Admin',
  branch_principal: 'Principal',
  coordinator: 'Coordinator',
  teacher: 'Teacher',
  accountant: 'Accountant',
  it_admin: 'IT Admin',
  student: 'Student',
};

const ROLE_ORDER = ['group_admin', 'branch_principal', 'coordinator', 'it_admin', 'accountant', 'teacher', 'student'];

const ROLE_COLORS: Record<string, string> = {
  group_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  branch_principal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  coordinator: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  teacher: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  accountant: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  it_admin: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  student: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  trial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTime(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DeviceDot({ count }: { count: number }) {
  if (count === 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
        <span className="w-2 h-2 rounded-full bg-gray-200 dark:bg-slate-600" />
        Not registered
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      {count} device{count !== 1 ? 's' : ''}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MobileDevicesPage() {
  const qc = useQueryClient();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'registered' | 'pending'>('all');
  const [search, setSearch] = useState('');
  const [confirmRevoke, setConfirmRevoke] = useState<MobileUser | null>(null);

  // Org list
  const { data: orgsData, isLoading: orgsLoading } = useQuery({
    queryKey: ['admin', 'mobile-config'],
    queryFn: () =>
      api.get<ApiResponse<MobileOrgConfig[]>>('/organizations/mobile-config').then((r) => r.data),
  });

  const orgs = orgsData?.data ?? [];
  const selectedOrg = orgs.find((o) => o.id === selectedOrgId) ?? null;

  // Users for selected org
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'mobile-users', selectedOrgId],
    queryFn: () =>
      api
        .get<ApiResponse<MobileUser[]>>(`/organizations/${selectedOrgId}/mobile-users`)
        .then((r) => r.data),
    enabled: !!selectedOrgId,
  });

  const allUsers = usersData?.data ?? [];

  // Toggle mobile access
  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.patch(`/organizations/${id}/mobile-access`, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'mobile-config'] }),
  });

  // Revoke devices
  const revokeMutation = useMutation({
    mutationFn: ({ orgId, userId }: { orgId: string; userId: string }) =>
      api.delete(`/organizations/${orgId}/mobile-users/${userId}/devices`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'mobile-users', selectedOrgId] });
      qc.invalidateQueries({ queryKey: ['admin', 'mobile-config'] });
      setConfirmRevoke(null);
    },
  });

  // Filtered + searched users
  const filteredUsers = allUsers.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter === 'registered' && !u.registered) return false;
    if (statusFilter === 'pending' && u.registered) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.branchName ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Stats for selected org's users
  const registeredCount = allUsers.filter((u) => u.registered).length;
  const pendingCount = allUsers.filter((u) => !u.registered).length;
  const totalDevices = allUsers.reduce((s, u) => s + u.deviceCount, 0);

  // Roles present in this org
  const rolesPresent = [...new Set(allUsers.map((u) => u.role))].sort(
    (a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b)
  );

  // Platform totals
  const platformRegistered = orgs.reduce((s, o) => s + o.activeMobileUsers, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight">
          Mobile Devices
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          View and manage mobile app device registrations across all organizations
        </p>
      </div>

      {/* Platform summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Orgs', value: orgs.length, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' },
          { label: 'Mobile Enabled', value: orgs.filter((o) => o.mobileEnabled).length, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' },
          { label: 'Registered Devices', value: platformRegistered, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-800' },
          { label: 'QR Configured', value: orgs.filter((o) => o.hasQrSecret).length, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.bg}`}>
            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-5">

        {/* ── Left: Org list ─────────────────────────────────────────────── */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
              <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">Organizations</h2>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Select to view devices</p>
            </div>

            {orgsLoading ? (
              <div className="flex items-center justify-center py-10">
                <svg className="animate-spin w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-slate-700">
                {orgs.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      setSelectedOrgId(org.id);
                      setRoleFilter('all');
                      setStatusFilter('all');
                      setSearch('');
                    }}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      selectedOrgId === org.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-600'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-700/40 border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: org.primaryColor }}
                      >
                        {org.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-900 dark:text-slate-100 truncate">{org.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_STYLES[org.status]}`}>
                            {org.status}
                          </span>
                          {org.mobileEnabled ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              📱 {org.activeMobileUsers}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 dark:text-slate-500">disabled</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Detail pane ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {!selectedOrg ? (
            <div className="card flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">Select an organization</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Click any org on the left to see its mobile device registrations</p>
            </div>
          ) : (
            <>
              {/* Org header bar */}
              <div className="card px-5 py-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: selectedOrg.primaryColor }}
                  >
                    {selectedOrg.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-extrabold text-gray-900 dark:text-slate-100">{selectedOrg.name}</h2>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[selectedOrg.status]}`}>
                        {selectedOrg.status}
                      </span>
                      {selectedOrg.hasQrSecret && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                          QR ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{schoolUrl(selectedOrg.slug).replace('https://', '')}</p>
                  </div>
                </div>

                {/* Mini stats */}
                <div className="flex items-center gap-4 text-center shrink-0">
                  <div>
                    <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{registeredCount}</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500">Registered</p>
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-amber-500">{pendingCount}</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500">Pending</p>
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-violet-600 dark:text-violet-400">{totalDevices}</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500">Devices</p>
                  </div>

                  {/* Mobile toggle */}
                  <div className="flex flex-col items-center gap-1 border-l border-gray-100 dark:border-slate-700 pl-4">
                    <button
                      onClick={() =>
                        toggleMutation.mutate({ id: selectedOrg.id, enabled: !selectedOrg.mobileEnabled })
                      }
                      disabled={toggleMutation.isPending}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                        selectedOrg.mobileEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-600'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          selectedOrg.mobileEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500">
                      {selectedOrg.mobileEnabled ? 'App On' : 'App Off'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                {/* Search */}
                <div className="relative flex-1 min-w-48">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search name, email, branch…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Role filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Roles</option>
                  {rolesPresent.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                  ))}
                </select>

                {/* Status filter */}
                <div className="flex rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                  {(['all', 'registered', 'pending'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-2 text-xs font-semibold capitalize transition-colors ${
                        statusFilter === s
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Users table */}
              <div className="card overflow-hidden">
                {/* Table header */}
                <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-5 py-2.5 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                  {['User', 'Role', 'Branch', 'Devices', 'Last Login', ''].map((h) => (
                    <span key={h} className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                      {h}
                    </span>
                  ))}
                </div>

                {usersLoading ? (
                  <div className="flex items-center justify-center gap-3 py-16 text-gray-400 dark:text-slate-500">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-sm">Loading users…</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-sm font-semibold text-gray-600 dark:text-slate-300">No users match</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-slate-700">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] md:items-center gap-2 md:gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors"
                      >
                        {/* User */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-linear-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{user.name}</p>
                            <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{user.email}</p>
                          </div>
                          {!user.active && (
                            <span className="shrink-0 text-[10px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full font-semibold">
                              Inactive
                            </span>
                          )}
                        </div>

                        {/* Role */}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold w-fit ${ROLE_COLORS[user.role] ?? ''}`}>
                          {ROLE_LABELS[user.role] ?? user.role}
                        </span>

                        {/* Branch */}
                        <span className="text-xs text-gray-500 dark:text-slate-400 truncate">
                          {user.branchName ?? <span className="text-gray-300 dark:text-slate-600">—</span>}
                        </span>

                        {/* Device status */}
                        <DeviceDot count={user.deviceCount} />

                        {/* Last login */}
                        <div>
                          {user.lastLoginAt ? (
                            <>
                              <p className="text-xs text-gray-700 dark:text-slate-300">{fmtDate(user.lastLoginAt)}</p>
                              <p className="text-[10px] text-gray-400 dark:text-slate-500">{fmtTime(user.lastLoginAt)}</p>
                            </>
                          ) : (
                            <span className="text-xs text-gray-300 dark:text-slate-600">Never</span>
                          )}
                        </div>

                        {/* Revoke button */}
                        <div className="flex justify-start md:justify-end">
                          {user.registered ? (
                            <button
                              onClick={() => setConfirmRevoke(user)}
                              className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Remove all registered devices"
                            >
                              Revoke
                            </button>
                          ) : (
                            <span className="text-xs text-gray-300 dark:text-slate-700 px-2">—</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer count */}
                {!usersLoading && filteredUsers.length > 0 && (
                  <div className="px-5 py-2.5 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      Showing {filteredUsers.length} of {allUsers.length} users ·{' '}
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{registeredCount} registered</span>{' '}
                      · <span className="text-amber-500 font-medium">{pendingCount} pending</span>
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Revoke confirmation modal ────────────────────────────────────── */}
      {confirmRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-extrabold text-gray-900 dark:text-slate-100 text-center mb-1">Revoke Devices</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 text-center mb-1">
              Remove all {confirmRevoke.deviceCount} registered device{confirmRevoke.deviceCount !== 1 ? 's' : ''} for
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 text-center mb-4">{confirmRevoke.name}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 text-center mb-6">
              They will stop receiving push notifications and will need to re-login on the mobile app.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRevoke(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  revokeMutation.mutate({ orgId: selectedOrgId!, userId: confirmRevoke.id })
                }
                disabled={revokeMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-semibold text-white transition-colors disabled:opacity-50"
              >
                {revokeMutation.isPending ? 'Revoking…' : 'Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
