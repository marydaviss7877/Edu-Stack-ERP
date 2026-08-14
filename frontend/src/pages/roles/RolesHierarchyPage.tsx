import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { roleLabel, cn } from '../../lib/utils';
import type { UserRole } from '../../types';
import UserAvatar from '../../components/ui/UserAvatar';

// ── Types ─────────────────────────────────────────────────────────────
interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  branchId?: { name: string } | string;
  lastLoginAt?: string;
  profilePhotoUrl?: string;
}

interface UsersResponse {
  data: UserRow[];
  meta: { total: number; page: number };
}

// ── Permission matrix (mirrors backend permissions.ts) ───────────────
type Access = 'full' | 'read' | 'send' | 'mark' | 'none';

interface ModuleAccess {
  module: string;
  access: Record<string, Access>;
}

const ROLES_ORDERED: UserRole[] = [
  'super_admin', 'group_admin', 'branch_principal',
  'coordinator', 'accountant', 'it_admin', 'teacher', 'student',
];

const MODULE_MATRIX: ModuleAccess[] = [
  {
    module: 'Students',
    access: {
      super_admin: 'read', group_admin: 'read', branch_principal: 'full',
      coordinator: 'full', accountant: 'none', it_admin: 'none',
      teacher: 'read', student: 'read',
    },
  },
  {
    module: 'Attendance',
    access: {
      super_admin: 'none', group_admin: 'read', branch_principal: 'read',
      coordinator: 'full', accountant: 'none', it_admin: 'none',
      teacher: 'mark', student: 'read',
    },
  },
  {
    module: 'Exams',
    access: {
      super_admin: 'none', group_admin: 'read', branch_principal: 'full',
      coordinator: 'full', accountant: 'none', it_admin: 'none',
      teacher: 'read', student: 'read',
    },
  },
  {
    module: 'Exam Papers',
    access: {
      super_admin: 'none', group_admin: 'none', branch_principal: 'full',
      coordinator: 'full', accountant: 'none', it_admin: 'read',
      teacher: 'full', student: 'none',
    },
  },
  {
    module: 'Assignments',
    access: {
      super_admin: 'none', group_admin: 'none', branch_principal: 'read',
      coordinator: 'mark', accountant: 'none', it_admin: 'none',
      teacher: 'full', student: 'read',
    },
  },
  {
    module: 'Timetable',
    access: {
      super_admin: 'none', group_admin: 'read', branch_principal: 'full',
      coordinator: 'read', accountant: 'none', it_admin: 'full',
      teacher: 'read', student: 'read',
    },
  },
  {
    module: 'Fees',
    access: {
      super_admin: 'read', group_admin: 'read', branch_principal: 'read',
      coordinator: 'none', accountant: 'full', it_admin: 'none',
      teacher: 'none', student: 'read',
    },
  },
  {
    module: 'Payroll',
    access: {
      super_admin: 'none', group_admin: 'read', branch_principal: 'read',
      coordinator: 'none', accountant: 'full', it_admin: 'none',
      teacher: 'read', student: 'none',
    },
  },
  {
    module: 'Notifications',
    access: {
      super_admin: 'send', group_admin: 'send', branch_principal: 'send',
      coordinator: 'send', accountant: 'read', it_admin: 'read',
      teacher: 'send', student: 'read',
    },
  },
  {
    module: 'User Management',
    access: {
      super_admin: 'full', group_admin: 'full', branch_principal: 'full',
      coordinator: 'none', accountant: 'none', it_admin: 'full',
      teacher: 'none', student: 'none',
    },
  },
  {
    module: 'Settings',
    access: {
      super_admin: 'full', group_admin: 'full', branch_principal: 'read',
      coordinator: 'none', accountant: 'none', it_admin: 'full',
      teacher: 'none', student: 'none',
    },
  },
];

// ── Role hierarchy tree data ──────────────────────────────────────────
interface TreeNode {
  role: UserRole;
  color: string;
  children?: TreeNode[];
}

const TREE: TreeNode = {
  role: 'super_admin', color: 'bg-purple-600',
  children: [{
    role: 'group_admin', color: 'bg-blue-600',
    children: [
      {
        role: 'branch_principal', color: 'bg-indigo-500',
        children: [
          { role: 'coordinator', color: 'bg-teal-500', children: [{ role: 'teacher', color: 'bg-green-500' }] },
          { role: 'teacher', color: 'bg-green-500' },
          { role: 'student', color: 'bg-amber-500' },
          { role: 'accountant', color: 'bg-orange-500' },
          { role: 'it_admin', color: 'bg-slate-500' },
        ],
      },
    ],
  }],
};

// ── Access badge ──────────────────────────────────────────────────────
function AccessBadge({ access }: { access: Access }) {
  if (access === 'none') return (
    <span className="inline-flex items-center gap-0.5 text-slate-400 dark:text-slate-600 text-xs">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </span>
  );
  const styles: Record<string, string> = {
    full: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    read: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    send: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    mark: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  const labels: Record<string, string> = {
    full: 'Full', read: 'Read', send: 'Send', mark: 'Mark',
  };
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold', styles[access])}>
      {labels[access]}
    </span>
  );
}

// ── Tree node component ───────────────────────────────────────────────
function TreeNodeCard({ node }: { node: TreeNode; isLast?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={cn(
        'px-4 py-2 rounded-xl text-white text-xs font-bold shadow-lg whitespace-nowrap',
        node.color
      )}>
        {roleLabel(node.role)}
      </div>

      {node.children && node.children.length > 0 && (
        <>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-600" />
          <div className="flex items-start gap-0 relative">
            {node.children.length > 1 && (
              <div className="absolute top-0 left-0 right-0 h-px bg-slate-300 dark:bg-slate-600" style={{
                left: `calc(100% / ${node.children.length} / 2)`,
                right: `calc(100% / ${node.children.length} / 2)`,
              }} />
            )}
            {node.children.map((child, i) => (
              <div key={`${child.role}-${i}`} className="flex flex-col items-center px-2">
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-600" />
                <TreeNodeCard node={child} isLast={i === node.children!.length - 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Role colour mapping for user table badges ─────────────────────────
const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  group_admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  branch_principal: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  coordinator: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  teacher: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  student: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  accountant: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  it_admin: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

const AVATAR_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-500',  group_admin: 'bg-blue-500',
  branch_principal: 'bg-indigo-500', coordinator: 'bg-teal-500',
  teacher: 'bg-green-500', student: 'bg-amber-500',
  accountant: 'bg-orange-500', it_admin: 'bg-slate-500',
};

// ── Main page ─────────────────────────────────────────────────────────
export default function RolesHierarchyPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const LIMIT = 20;

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['org-users', page, search, filterRole],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(search ? { search } : {}),
        ...(filterRole ? { role: filterRole } : {}),
      });
      const res = await api.get<{ success: boolean; data: UserRow[]; meta: { total: number; page: number } }>(
        `/users?${params}`
      );
      return res.data;
    },
    staleTime: 60_000,
  });

  const users = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Roles & Hierarchy</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Organisational structure, access levels, and all users in your school group.
        </p>
      </div>

      {/* ── Org Tree ────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-6 uppercase tracking-wider">
          Reporting Hierarchy
        </h2>
        <div className="overflow-x-auto pb-2">
          <div className="flex justify-center min-w-max">
            <TreeNodeCard node={TREE} />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-slate-700">
          {ROLES_ORDERED.filter(r => r !== 'super_admin').map((role) => (
            <div key={role} className="flex items-center gap-1.5">
              <div className={cn('w-2.5 h-2.5 rounded-full', AVATAR_COLORS[role])} />
              <span className="text-xs text-gray-500 dark:text-slate-400">{roleLabel(role)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Permission Matrix ────────────────────────────────────────── */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
            Module Access Matrix
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-700/50">
                <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-slate-400 w-36 sticky left-0 bg-gray-50 dark:bg-slate-700/50 z-10">
                  Module
                </th>
                {ROLES_ORDERED.map((role) => (
                  <th key={role} className="text-center py-3 px-2 font-semibold text-gray-600 dark:text-slate-400 min-w-[80px]">
                    <div className="flex flex-col items-center gap-1">
                      <div className={cn('w-2 h-2 rounded-full', AVATAR_COLORS[role])} />
                      <span className="text-[10px] leading-tight">{roleLabel(role)}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {MODULE_MATRIX.map((row) => (
                <tr key={row.module} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="py-2.5 px-4 font-medium text-gray-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-800 z-10">
                    {row.module}
                  </td>
                  {ROLES_ORDERED.map((role) => (
                    <td key={role} className="py-2.5 px-2 text-center">
                      <AccessBadge access={row.access[role] ?? 'none'} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-100 dark:border-slate-700 flex flex-wrap gap-4">
          {[
            { label: 'Full (Create, Read, Update, Delete)', color: 'bg-emerald-100 text-emerald-700' },
            { label: 'Read only', color: 'bg-blue-100 text-blue-700' },
            { label: 'Send (Notifications)', color: 'bg-violet-100 text-violet-700' },
            { label: 'Mark (Grade/Attendance)', color: 'bg-amber-100 text-amber-700' },
            { label: 'No access', color: 'text-slate-400' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-slate-400">
              <span className={cn('px-1.5 py-0.5 rounded font-semibold text-[10px]', color)}>
                {label.split(' ')[0]}
              </span>
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* ── Users Table ─────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
              All Users
            </h2>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{total} total</p>
          </div>
          <div className="sm:ml-auto flex gap-2">
            {/* Role filter */}
            <select
              value={filterRole}
              onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
              className="text-xs border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All roles</option>
              {ROLES_ORDERED.map((r) => (
                <option key={r} value={r}>{roleLabel(r)}</option>
              ))}
            </select>
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="text-xs border border-gray-200 dark:border-slate-600 rounded-lg pl-8 pr-3 py-1.5 w-52 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400 dark:text-slate-500">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="text-left py-3 px-4">User</th>
                  <th className="text-left py-3 px-4">Role</th>
                  <th className="text-left py-3 px-4 hidden md:table-cell">Branch</th>
                  <th className="text-left py-3 px-4 hidden lg:table-cell">Last Login</th>
                  <th className="text-left py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={u.name}
                          photoUrl={u.profilePhotoUrl}
                          className="w-8 h-8 rounded-lg text-xs"
                          fallbackClassName={cn('text-white', AVATAR_COLORS[u.role] ?? 'bg-slate-500')}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 dark:text-white truncate">{u.name}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        'inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold',
                        ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600'
                      )}>
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-500 dark:text-slate-400 text-xs">
                      {typeof u.branchId === 'object' && u.branchId !== null
                        ? (u.branchId as { name: string }).name
                        : '—'}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-gray-500 dark:text-slate-400 text-xs">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Never'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        'inline-flex items-center gap-1 text-xs font-medium',
                        u.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', u.active ? 'bg-emerald-500' : 'bg-red-400')} />
                        {u.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Page {page} of {totalPages} · {total} users
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-slate-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-slate-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
