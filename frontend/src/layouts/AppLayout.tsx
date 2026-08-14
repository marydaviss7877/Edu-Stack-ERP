import { useState } from 'react';
import { NavLink, useNavigate, Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import type { UserRole, Branch, ApiResponse } from '../types';
import { cn, roleLabel, getInitials } from '../lib/utils';
import { setLanguage } from '../i18n';
import { notificationService } from '../services/notificationService';
import { useSocket } from '../hooks/useSocket';
import { getOrgBranding } from '../services/authService';
import { getOrgSlug } from '../utils/tenant';
import VerifyEmailBanner from '../components/shared/VerifyEmailBanner';
import api from '../services/api';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const SvgIcon = ({ d, d2 }: { d: string; d2?: string }) => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    {d2 && <path strokeLinecap="round" strokeLinejoin="round" d={d2} />}
  </svg>
);

const ALL_NAV: NavItem[] = [
  {
    label: 'nav.dashboard', path: '',
    roles: ['group_admin', 'branch_principal', 'coordinator', 'teacher', 'student', 'accountant', 'it_admin'],
    icon: <SvgIcon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  },
  {
    label: 'nav.branches', path: 'branches',
    roles: ['group_admin'],
    icon: <SvgIcon d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
  },
  {
    label: 'nav.staff', path: 'staff',
    roles: ['group_admin', 'branch_principal'],
    icon: <SvgIcon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 13a3 3 0 100-6 3 3 0 000 6z" />,
  },
  {
    label: 'nav.students', path: 'students',
    roles: ['group_admin', 'branch_principal', 'coordinator', 'teacher'],
    icon: <SvgIcon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
  },
  {
    label: 'nav.admission', path: 'admission',
    roles: ['group_admin', 'branch_principal', 'coordinator', 'it_admin'],
    icon: <SvgIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
  },
  {
    label: 'nav.classFellows', path: 'class-fellows',
    roles: ['student'],
    icon: <SvgIcon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm-9 8a3 3 0 100-6 3 3 0 000 6z" />,
  },
  {
    label: 'nav.profile', path: 'profile',
    roles: ['student'],
    icon: <SvgIcon d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
  {
    label: 'nav.attendance', path: 'attendance',
    roles: ['group_admin', 'branch_principal', 'coordinator', 'teacher', 'student'],
    icon: <SvgIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
  },
  {
    label: 'nav.timetable', path: 'timetable',
    roles: ['group_admin', 'branch_principal', 'coordinator', 'teacher', 'student'],
    icon: <SvgIcon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  },
  {
    label: 'nav.exams', path: 'exams',
    roles: ['group_admin', 'branch_principal', 'coordinator', 'teacher', 'student'],
    icon: <SvgIcon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  },
  {
    label: 'nav.assignments', path: 'assignments',
    roles: ['group_admin', 'branch_principal', 'coordinator', 'teacher', 'student'],
    icon: <SvgIcon d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />,
  },
  {
    label: 'nav.examPaper', path: 'exam-paper',
    roles: ['branch_principal', 'coordinator', 'teacher', 'it_admin'],
    icon: <SvgIcon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" d2="M13 2v6h6" />,
  },
  {
    label: 'nav.weeklyPapers', path: 'papers',
    roles: ['group_admin', 'branch_principal', 'coordinator', 'teacher', 'student', 'it_admin'],
    icon: <SvgIcon d="M9 17v-2a4 4 0 014-4h4m0 0l-3-3m3 3l-3 3M5 7h.01M5 12h.01M5 17h.01M9 7h6" />,
  },
  {
    label: 'nav.resources', path: 'resources',
    roles: ['group_admin', 'branch_principal', 'it_admin', 'teacher', 'student'],
    icon: <SvgIcon d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
  },
  {
    label: 'nav.fees', path: 'fees',
    roles: ['group_admin', 'branch_principal', 'accountant', 'student'],
    icon: <SvgIcon d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />,
  },
  {
    label: 'nav.payroll', path: 'payroll',
    roles: ['group_admin', 'branch_principal', 'accountant', 'teacher'],
    icon: <SvgIcon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
  {
    label: 'nav.sops', path: 'sops',
    roles: ['group_admin', 'branch_principal', 'it_admin', 'teacher', 'student'],
    icon: <SvgIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6m-6 4h3" />,
  },
  {
    label: 'nav.academic', path: 'academic',
    roles: ['group_admin', 'branch_principal', 'it_admin'],
    icon: <SvgIcon d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
  },
  {
    label: 'nav.roles', path: 'roles',
    roles: ['group_admin'],
    icon: <SvgIcon d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
  },
  {
    label: 'nav.settings', path: 'settings',
    roles: ['group_admin', 'branch_principal', 'it_admin'],
    icon: <SvgIcon d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" d2="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
  },
];

const FallbackLogo = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => (
  <div className={cn(
    'bg-amber-500 rounded-xl flex items-center justify-center text-navy-950 shrink-0',
    size === 'sm' ? 'w-8 h-8' : 'w-9 h-9'
  )}>
    <svg className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  </div>
);

const OrgLogo = ({ logoUrl, name, size = 'sm' }: { logoUrl?: string | null; name?: string; size?: 'sm' | 'md' }) => {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name ?? 'School Logo'}
        className={cn(
          'object-contain rounded-lg shrink-0 bg-white',
          size === 'sm' ? 'w-8 h-8' : 'w-9 h-9'
        )}
      />
    );
  }
  return <FallbackLogo size={size} />;
};

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

export default function AppLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const { user, logout, activeBranch, setActiveBranch } = useAuthStore();
  const { isDark, toggle: toggleDark } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const base = (() => {
    if (user?.role === 'group_admin') return '/group';
    if (user?.role === 'coordinator') return '/coordinator';
    if (user?.role === 'teacher')     return '/teacher';
    if (user?.role === 'student')     return '/student';
    return '/dashboard';
  })();

  useSocket();

  const slug = getOrgSlug();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notif-count'],
    queryFn: notificationService.getUnreadCount,
    refetchInterval: 60_000,
  });

  const { data: branding } = useQuery({
    queryKey: ['org-branding', slug],
    queryFn: () => getOrgBranding(slug!),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });

  const schoolName = branding?.name ?? 'EduStack PK';

  const { data: switcherBranches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<ApiResponse<Branch[]>>('/branches').then(r => r.data.data ?? []),
    enabled: user?.role === 'group_admin',
    staleTime: 5 * 60 * 1000,
  });

  const navItems = ALL_NAV.filter((n) => user?.role && n.roles.includes(user.role));
  const primaryTabs = navItems.slice(0, 4);
  const moreItems = navItems.slice(4);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const toggleLang = () => setLanguage(i18n.language === 'en' ? 'ur' : 'en');

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">

      {/* ═══════════════════════════════════════
          DESKTOP SIDEBAR  (hidden on mobile)
      ═══════════════════════════════════════ */}
      <aside className={cn(
        'hidden md:flex flex-col bg-white border-r border-gray-100 shrink-0 transition-all duration-200',
        sidebarOpen ? 'w-64' : 'w-16'
      )}>

        {/* Logo row */}
        <div className={cn(
          'flex items-center h-16 px-4 border-b border-gray-100 gap-3',
          !sidebarOpen && 'justify-center'
        )}>
          <OrgLogo logoUrl={branding?.logoUrl} name={schoolName} />
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm leading-none truncate">{schoolName}</p>
              <p className="text-gray-400 text-[10px] mt-0.5 font-medium">School Management</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              'shrink-0 text-gray-400 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-all',
              !sidebarOpen && 'hidden'
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="shrink-0 text-gray-400 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Notification link */}
        <div className="px-2 pt-3 pb-1">
          <Link
            to={`${base}/notifications`}
            className={cn(
              'sidebar-link sidebar-link-inactive-light relative',
              !sidebarOpen && 'justify-center px-0'
            )}
          >
            <span className="shrink-0 relative">
              <BellIcon />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            {sidebarOpen && (
              <>
                <span className="flex-1">Notifications</span>
                {unreadCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {unreadCount}
                  </span>
                )}
              </>
            )}
          </Link>
          <div className="border-t border-gray-100 mt-2 mb-2" />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll-light px-2 pb-2 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path ? `${base}/${item.path}` : base}
              end={item.path === ''}
              className={({ isActive }) =>
                cn(
                  'sidebar-link',
                  !sidebarOpen && 'justify-center px-0',
                  isActive ? 'sidebar-link-active' : 'sidebar-link-inactive-light'
                )
              }
              title={!sidebarOpen ? t(item.label) : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="truncate">{t(item.label)}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-100 p-3 shrink-0">
          {sidebarOpen ? (
            <>
              {user?.role === 'student' ? (
              <Link to={`${base}/profile`} className="flex items-center gap-3 mb-3 rounded-xl hover:bg-gray-50 transition-colors p-1 -m-1">
                <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-navy-950 text-xs font-bold">
                  {getInitials(user?.name ?? '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{roleLabel(user.role)}</p>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3 mb-3">
                <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-navy-950 text-xs font-bold">
                  {getInitials(user?.name ?? '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400 truncate">{roleLabel(user?.role ?? '')}</p>
                </div>
              </div>
            )}
              <div className="flex gap-2">
                <button
                  onClick={toggleLang}
                  className="flex-1 text-xs text-gray-600 hover:text-gray-900 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  {i18n.language === 'en' ? 'اردو' : 'English'}
                </button>
                <button
                  onClick={toggleDark}
                  title={isDark ? 'Light mode' : 'Dark mode'}
                  className="shrink-0 px-2.5 text-gray-600 hover:text-gray-900 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors flex items-center justify-center"
                >
                  {isDark ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 text-xs text-red-600 hover:text-red-700 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                >
                  {t('auth.logout')}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-navy-950 text-xs font-bold cursor-pointer" title={user?.name}>
                {getInitials(user?.name ?? '?')}
              </div>
              <button
                onClick={toggleDark}
                title={isDark ? 'Light mode' : 'Dark mode'}
                className="text-gray-400 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {isDark ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ═══════════════════════════════════════
          CONTENT COLUMN  (full width on mobile)
      ═══════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* MOBILE TOP BAR (hidden on desktop) */}
        <header className="md:hidden flex items-center h-14 px-4 gap-3 bg-white border-b border-gray-100 shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-gray-500 hover:text-gray-900 p-1 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <OrgLogo logoUrl={branding?.logoUrl} name={schoolName} size="md" />
          </div>

          <Link
            to={`${base}/notifications`}
            className="relative text-gray-500 hover:text-gray-900 transition-colors p-1"
            aria-label="Notifications"
          >
            <BellIcon />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 min-w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {user?.role === 'student' ? (
            <Link to={`${base}/profile`} className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-navy-950 text-xs font-bold shrink-0 hover:opacity-90 transition-opacity" title="My Profile">
              {getInitials(user.name ?? '?')}
            </Link>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-navy-950 text-xs font-bold shrink-0">
              {getInitials(user?.name ?? '?')}
            </div>
          )}
        </header>

        {/* BRANCH CONTEXT SWITCHER — group_admin can pick which branch's data to view from anywhere */}
        {user?.role === 'group_admin' && (
          <div className={cn(
            'shrink-0 flex items-center gap-3 px-4 py-2 border-b',
            activeBranch
              ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/40'
              : 'bg-slate-50 border-slate-200 dark:bg-slate-800/60 dark:border-slate-700/60'
          )}>
            <svg className={cn('w-4 h-4 shrink-0', activeBranch ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className={cn('text-xs font-medium', activeBranch ? 'text-amber-800 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400')}>
              Branch:
            </span>
            <select
              value={activeBranch?.id ?? ''}
              onChange={(e) => {
                const b = switcherBranches.find((x) => x._id === e.target.value);
                setActiveBranch(b ? { id: b._id, name: b.name } : null);
              }}
              className={cn(
                'text-xs font-semibold rounded-lg px-2 py-1 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400/40',
                activeBranch ? 'border border-amber-200 dark:border-amber-700/50 text-amber-900 dark:text-amber-200' : 'border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'
              )}
            >
              <option value="">All branches (org-wide)</option>
              {switcherBranches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
            <span className="flex-1 text-[11px] text-gray-400 dark:text-slate-500 truncate">
              {activeBranch ? "Students, attendance, timetable and other branch pages show this branch's data" : 'Pick a branch to view its students, attendance, timetable, etc.'}
            </span>
          </div>
        )}

        <VerifyEmailBanner />

        {/* MAIN SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto dark:bg-slate-900">
          <Outlet />
        </main>

        {/* MOBILE BOTTOM TAB BAR (hidden on desktop) */}
        <nav className="md:hidden flex items-stretch h-16 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 shrink-0">
          {primaryTabs.map((item) => (
            <NavLink
              key={item.path}
              to={item.path ? `${base}/${item.path}` : base}
              end={item.path === ''}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-150 select-none',
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn(
                    'flex items-center justify-center w-9 h-7 rounded-xl transition-all duration-150',
                    isActive ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'
                  )}>
                    {item.icon}
                  </span>
                  <span className="text-[10px] font-semibold leading-none">
                    {t(item.label)}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          {/* More button — shows when nav items overflow the 4 primary tabs */}
          {moreItems.length > 0 && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-gray-600 transition-colors select-none"
            >
              <span className="flex items-center justify-center w-9 h-7 rounded-xl">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </span>
              <span className="text-[10px] font-semibold leading-none">More</span>
            </button>
          )}
        </nav>
      </div>

      {/* ═══════════════════════════════════════
          MOBILE DRAWER  (slide-in from left)
      ═══════════════════════════════════════ */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer panel */}
          <div className="relative w-72 max-w-[85vw] bg-white flex flex-col h-full shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between h-14 px-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <OrgLogo logoUrl={branding?.logoUrl} name={schoolName} size="md" />
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-sm leading-none truncate">{schoolName}</p>
                  <p className="text-gray-400 text-[10px] mt-0.5">School Management</p>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-gray-400 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Notification shortcut */}
            <div className="px-2 pt-3 pb-1">
              <Link
                to={`${base}/notifications`}
                onClick={() => setDrawerOpen(false)}
                className="sidebar-link sidebar-link-inactive-light relative"
              >
                <span className="shrink-0 relative">
                  <BellIcon />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
                <span className="flex-1">Notifications</span>
                {unreadCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <div className="border-t border-gray-100 mt-2 mb-2" />
            </div>

            {/* All nav items */}
            <nav className="flex-1 overflow-y-auto sidebar-scroll-light px-2 pb-2 space-y-0.5">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path ? `${base}/${item.path}` : base}
                  end={item.path === ''}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'sidebar-link',
                      isActive ? 'sidebar-link-active' : 'sidebar-link-inactive-light'
                    )
                  }
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span>{t(item.label)}</span>
                </NavLink>
              ))}
            </nav>

            {/* User footer */}
            <div className="border-t border-gray-100 p-4 shrink-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-navy-950 text-sm font-bold shrink-0">
                  {getInitials(user?.name ?? '?')}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400">{roleLabel(user?.role ?? '')}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { toggleLang(); setDrawerOpen(false); }}
                  className="flex-1 text-xs text-gray-600 hover:text-gray-900 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  {i18n.language === 'en' ? 'اردو' : 'English'}
                </button>
                <button
                  onClick={toggleDark}
                  title={isDark ? 'Light mode' : 'Dark mode'}
                  className="shrink-0 px-3 text-gray-600 hover:text-gray-900 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors flex items-center justify-center"
                >
                  {isDark ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 text-xs text-red-600 hover:text-red-700 py-2 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                >
                  {t('auth.logout')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
