import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { cn } from '../lib/utils';
import UserAvatar from '../components/ui/UserAvatar';
import { getMe } from '../services/authService';

const NavIcon = ({ d, d2 }: { d: string; d2?: string }) => (
  <svg className="w-4.5 h-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    {d2 && <path strokeLinecap="round" strokeLinejoin="round" d={d2} />}
  </svg>
);

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    path: '/',
    icon: <NavIcon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  },
  {
    label: 'Organizations',
    path: '/organizations',
    icon: <NavIcon d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
  },
  {
    label: 'Users',
    path: '/users',
    icon: <NavIcon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
  },
  {
    label: 'Usage & Billing',
    path: '/billing',
    icon: <NavIcon d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
  },
  {
    label: 'Mobile Devices',
    path: '/mobile-devices',
    icon: <NavIcon d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />,
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: <NavIcon d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" d2="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
  },
];

export default function SuperAdminLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuthStore();
  const { isDark, toggle: toggleDark } = useThemeStore();

  useEffect(() => {
    getMe().then(setUser).catch(() => {});
  }, [setUser]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 dark:bg-slate-900">
      {/* Dark sidebar */}
      <aside className="w-64 flex flex-col bg-navy-950 border-r border-white/6 shrink-0">

        {/* Logo */}
        <div className="flex items-center gap-3 h-16 px-5 border-b border-white/6">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-navy-950 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-sm leading-none">EduStack PK</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-md leading-none">
                SUPER ADMIN
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-white/55 hover:bg-white/[0.07] hover:text-white'
                )
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Platform status strip */}
        <div className="mx-3 mb-3 px-3 py-2.5 rounded-xl bg-white/4 border border-white/6">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
            <p className="text-xs text-green-400 font-medium">Platform Online</p>
          </div>
          <p className="text-[10px] text-white/30 mt-0.5">All systems operational</p>
        </div>

        {/* User footer */}
        <div className="border-t border-white/6 p-4 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <UserAvatar name={user?.name ?? 'SA'} photoUrl={user?.photoUrl} className="w-9 h-9 rounded-xl text-xs" fallbackClassName="bg-amber-500 text-navy-950" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-white/40">WolfStack Admin</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleDark}
              title={isDark ? 'Light mode' : 'Dark mode'}
              className="shrink-0 px-2.5 py-2 text-slate-400 hover:text-white rounded-lg border border-white/15 hover:bg-navy-900 transition-colors flex items-center justify-center"
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
              className="flex-1 text-xs text-red-400 hover:text-red-300 py-2 rounded-lg border border-red-900/40 hover:bg-red-900/20 transition-colors"
            >
              {t('auth.logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
        <Outlet />
      </main>
    </div>
  );
}
