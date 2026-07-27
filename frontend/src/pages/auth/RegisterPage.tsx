import { useState } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { schoolUrl, adminLoginUrl, BASE_DOMAIN } from '../../utils/tenant';
import type { AuthUser } from '../../types';
import { cn } from '../../lib/utils';

// ── Types ─────────────────────────────────────────────────

type Step = 1 | 2;

interface FormData {
  orgName: string;
  slug: string;
  contactEmail: string;
  contactPhone: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
}

const EMPTY: FormData = {
  orgName: '', slug: '', contactEmail: '', contactPhone: '',
  adminName: '', adminEmail: '', adminPassword: '', confirmPassword: '',
};

function autoSlug(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Left panel data ────────────────────────────────────────

const FEATURES = [
  {
    label: 'Attendance & Timetable',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
  },
  {
    label: 'Fee Management & Payroll',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  },
  {
    label: 'Exams, Results & Assignments',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>,
  },
  {
    label: 'Student & Staff Management',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    label: 'Mobile App for Android',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  },
];

const SCHOOL_SEEDS = [
  { initials: 'PG', color: 'bg-violet-500' },
  { initials: 'BH', color: 'bg-blue-500' },
  { initials: 'FS', color: 'bg-emerald-500' },
  { initials: 'AC', color: 'bg-amber-500' },
];

// ── Icons ──────────────────────────────────────────────────

function IcoSchool() {
  return <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>;
}
function IcoGlobe() {
  return <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>;
}
function IcoMail() {
  return <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
}
function IcoPhone() {
  return <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
}
function IcoUser() {
  return <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
}
function IcoLock() {
  return <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
}
function IcoEye({ open }: { open: boolean }) {
  return open
    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
}
function IcoCheck() {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
}
function IcoWarn() {
  return <svg className="w-3 h-3 flex-shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
}

// ── Shared primitives ──────────────────────────────────────

function InlineError({ msg }: { msg: string }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400 pl-1 mt-1">
      <IcoWarn />{msg}
    </p>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const score =
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const bars   = ['', 'bg-red-400', 'bg-amber-400', 'bg-blue-500', 'bg-emerald-500'];
  const texts  = ['', 'text-red-500', 'text-amber-500', 'text-blue-600', 'text-emerald-500'];
  return (
    <div className="flex items-center gap-2 px-1 mt-1.5">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={cn('h-[3px] flex-1 rounded-full transition-all duration-300', i <= score ? bars[score] : 'bg-gray-200 dark:bg-slate-600')} />
        ))}
      </div>
      {score > 0 && <span className={cn('text-[10px] font-semibold w-9 text-right', texts[score])}>{labels[score]}</span>}
    </div>
  );
}

// ── Floating label input ──────────────────────────────────
// Technique: placeholder=" " (space) + peer-placeholder-shown: for sunk state
// Input padding: pt-6 pb-2.5 creates room for the floated label at top

const BASE_INPUT = [
  'peer w-full rounded-xl border bg-white dark:bg-slate-700/50 dark:text-slate-100',
  'text-[0.9rem] pt-6 pb-2.5 transition-all duration-200',
  'focus:outline-none focus:ring-2',
  'placeholder:text-transparent', // hide the space placeholder visually
].join(' ');

const BASE_LABEL = [
  'absolute pointer-events-none select-none transition-all duration-200 origin-left',
  // ── Floated (default — value present, not focused) ──
  'top-[0.42rem] text-[10.5px] font-semibold tracking-wide text-gray-400 dark:text-slate-500',
  // ── Sunk (empty, not focused) ──
  'peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2',
  'peer-placeholder-shown:text-[0.875rem] peer-placeholder-shown:font-normal peer-placeholder-shown:tracking-normal',
  'peer-placeholder-shown:text-gray-400 dark:peer-placeholder-shown:text-slate-500',
  // ── Floated on focus (overrides sunk state) ──
  'peer-focus:top-[0.42rem] peer-focus:translate-y-0',
  'peer-focus:text-[10.5px] peer-focus:font-semibold peer-focus:tracking-wide peer-focus:text-blue-500 dark:peer-focus:text-blue-400',
].join(' ');

interface FloatFieldProps {
  id: string;
  label: string;
  required?: boolean;
  type?: string;
  icon: React.ReactNode;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  error?: string;
  hint?: string;
  suffix?: React.ReactNode; // right-side button (e.g. eye toggle)
  inputClassName?: string;
  autoFocus?: boolean;
}

function FloatField({
  id, label, required, type = 'text', icon, value,
  onChange, onBlur, error, hint, suffix, inputClassName, autoFocus,
}: FloatFieldProps) {
  const hasErr = !!error;
  return (
    <div>
      <div className="relative">
        {/* Leading icon */}
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-350 dark:text-slate-500 pointer-events-none z-10 text-gray-400">
          {icon}
        </div>
        <input
          id={id}
          type={type}
          placeholder=" "
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          autoFocus={autoFocus}
          className={cn(
            BASE_INPUT,
            'pl-[2.6rem]',
            suffix ? 'pr-11' : 'pr-4',
            hasErr
              ? 'border-red-400 dark:border-red-500 focus:ring-red-400/30 focus:border-red-400'
              : 'border-gray-200 dark:border-slate-600 focus:ring-blue-500/20 focus:border-blue-500',
            inputClassName,
          )}
        />
        {/* Floating label */}
        <label htmlFor={id} className={cn(BASE_LABEL, 'left-[2.6rem]')}>
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {/* Trailing action (e.g. eye toggle) */}
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>
        )}
      </div>
      {hasErr
        ? <InlineError msg={error!} />
        : hint
          ? <p className="text-xs text-gray-400 dark:text-slate-500 pl-1 mt-1">{hint}</p>
          : null}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────

export default function RegisterPage() {
  const setSession = useAuthStore(s => s.setSession);
  const { isDark, toggle } = useThemeStore();

  const [step, setStep]       = useState<Step>(1);
  const [form, setForm]       = useState<FormData>(EMPTY);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [slugManual, setSlugManual] = useState(false);
  const [showPwd, setShowPwd]       = useState(false);
  const [showCfm, setShowCfm]       = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});

  function set<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }
  function touch(key: keyof FormData) {
    setTouched(t => ({ ...t, [key]: true }));
  }

  function handleOrgNameChange(name: string) {
    set('orgName', name);
    if (!slugManual) set('slug', autoSlug(name));
  }

  function fieldErr(key: keyof FormData): string {
    if (!touched[key]) return '';
    switch (key) {
      case 'orgName':          return !form.orgName.trim() ? 'School name is required' : '';
      case 'slug':             return !form.slug.trim() ? 'URL slug is required' : !/^[a-z0-9-]+$/.test(form.slug) ? 'Only lowercase letters, numbers, and hyphens' : '';
      case 'contactEmail':     return !form.contactEmail.trim() ? 'Contact email is required' : '';
      case 'adminName':        return !form.adminName.trim() ? 'Your name is required' : '';
      case 'adminEmail':       return !form.adminEmail.trim() ? 'Email is required' : '';
      case 'adminPassword':    return form.adminPassword.length > 0 && form.adminPassword.length < 8 ? 'Minimum 8 characters' : '';
      case 'confirmPassword':  return form.confirmPassword.length > 0 && form.confirmPassword !== form.adminPassword ? 'Passwords do not match' : '';
      default:                 return '';
    }
  }

  function validateStep1(): string {
    if (!form.orgName.trim()) return 'School name is required.';
    if (!form.slug.trim()) return 'URL slug is required.';
    if (!/^[a-z0-9-]+$/.test(form.slug)) return 'Slug can only contain lowercase letters, numbers and hyphens.';
    if (!form.contactEmail.trim()) return 'Contact email is required.';
    return '';
  }

  function validateStep2(): string {
    if (!form.adminName.trim()) return 'Your name is required.';
    if (!form.adminEmail.trim()) return 'Admin email is required.';
    if (form.adminPassword.length < 8) return 'Password must be at least 8 characters.';
    if (form.adminPassword !== form.confirmPassword) return 'Passwords do not match.';
    return '';
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    setTouched(t => ({ ...t, orgName: true, slug: true, contactEmail: true }));
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(t => ({ ...t, adminName: true, adminEmail: true, adminPassword: true, confirmPassword: true }));
    const err = validateStep2();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        orgName: form.orgName, slug: form.slug,
        contactEmail: form.contactEmail, contactPhone: form.contactPhone,
        adminName: form.adminName, adminEmail: form.adminEmail,
        adminPassword: form.adminPassword,
      });
      setSession(data.data.user as AuthUser, form.slug);
      window.location.href = schoolUrl(form.slug, '/group');
    } catch (err: any) {
      const msg = err?.response?.data?.message
        ?? err?.response?.data?.errors?.[0]?.msg
        ?? 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // ── password confirm state helpers ──
  const cfmMatches = form.confirmPassword.length > 0 && form.confirmPassword === form.adminPassword;
  const cfmMismatch = form.confirmPassword.length > 0 && form.confirmPassword !== form.adminPassword;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ══════════════════ LEFT BRAND PANEL ══════════════════ */}
      <div className="lg:w-[46%] bg-slate-900 text-white flex flex-col lg:min-h-screen">

        {/* Mobile compact header */}
        <div className="lg:hidden flex items-center gap-3 px-6 py-4 border-b border-white/10">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
          </div>
          <div>
            <div className="font-bold text-base leading-none">EduStack PK</div>
            <div className="text-slate-500 text-xs mt-0.5">by WolfStack</div>
          </div>
        </div>

        {/* Desktop full panel */}
        <div className="hidden lg:flex flex-col flex-1 px-12 py-12 justify-between">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-14">
              <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
              </div>
              <div>
                <div className="font-bold text-[1.1rem] leading-none tracking-tight">EduStack PK</div>
                <div className="text-slate-500 text-xs mt-0.5">by WolfStack</div>
              </div>
            </div>

            {/* Headline */}
            <div className="mb-10">
              <h1 className="text-[2rem] font-bold leading-tight text-white mb-3">
                Modern school management<br />
                <span className="text-blue-400">built for Pakistan.</span>
              </h1>
              <p className="text-slate-400 text-xl font-light" dir="rtl" lang="ur">
                اپنے اسکول کو ڈیجیٹل بنائیں
              </p>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-10">
              {FEATURES.map(f => (
                <li key={f.label} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center flex-shrink-0">
                    {f.icon}
                  </div>
                  <span className="text-slate-300 text-sm">{f.label}</span>
                </li>
              ))}
            </ul>

            {/* Social proof */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex -space-x-2">
                {SCHOOL_SEEDS.map(s => (
                  <div key={s.initials} className={cn('w-7 h-7 rounded-full border-2 border-slate-900 flex items-center justify-center text-white text-[10px] font-bold', s.color)}>
                    {s.initials}
                  </div>
                ))}
              </div>
              <p className="text-slate-400 text-sm">
                Trusted by <span className="text-white font-semibold">500+ schools</span> across Pakistan
              </p>
            </div>

            {/* Pricing */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-slate-500 uppercase tracking-widest font-medium">Pricing</div>
                <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2.5 py-0.5 font-medium">
                  Free trial
                </span>
              </div>
              <div className="text-white font-semibold">30 days completely free</div>
              <div className="text-slate-400 text-sm mt-0.5">
                Then from <span className="text-white font-medium">PKR 2,999 / month</span>
              </div>
              <div className="text-xs text-slate-600 mt-2">No credit card required &middot; Cancel anytime</div>
            </div>
          </div>

          <div className="text-xs text-slate-700 mt-8">
            &copy; {new Date().getFullYear()} WolfStack &middot; EduStack PK
          </div>
        </div>
      </div>

      {/* ══════════════════ RIGHT FORM PANEL ══════════════════ */}
      <div className="flex-1 bg-[#f3f4f8] dark:bg-[#0d0f14] flex items-center justify-center relative px-4 py-10 lg:py-0">

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-400 flex items-center justify-center transition-colors"
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark
            ? <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M18.364 18.364l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            : <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          }
        </button>

        {/* ── Centered form container ── */}
        <div className="w-full max-w-[440px]">

          {/* ── Step tracker ── */}
          <div className="flex items-center mb-7">
            {([1, 2] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 flex-shrink-0',
                    step === s  ? 'bg-blue-600 text-white shadow-[0_0_0_4px_rgba(59,130,246,0.18)]' :
                    step > s    ? 'bg-emerald-500 text-white' :
                    'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500'
                  )}>
                    {step > s ? <IcoCheck /> : s}
                  </div>
                  <div className={cn('hidden sm:block leading-tight', step === s ? 'text-gray-800 dark:text-slate-100' : 'text-gray-400 dark:text-slate-600')}>
                    <div className="text-[11px] font-bold uppercase tracking-wider">{s === 1 ? 'Step 1' : 'Step 2'}</div>
                    <div className="text-[12px]">{s === 1 ? 'School Info' : 'Admin Account'}</div>
                  </div>
                </div>
                {i === 0 && (
                  <div className="w-10 sm:w-14 h-px mx-4 bg-gray-200 dark:bg-slate-700 relative overflow-hidden rounded-full">
                    <div className={cn('absolute inset-0 bg-emerald-500 transition-transform duration-500 origin-left', step > 1 ? 'scale-x-100' : 'scale-x-0')} />
                  </div>
                )}
              </div>
            ))}
            <span className="ml-auto text-[11px] font-medium text-gray-400 dark:text-slate-600">
              {step === 1 ? '~2 min' : 'Almost done'}
            </span>
          </div>

          {/* ── Form card ── */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-gray-200/70 dark:border-slate-700/80 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] dark:shadow-none p-8">

            {/* Card header */}
            <div className="mb-7">
              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-slate-50">
                {step === 1 ? 'School Information' : 'Admin Account'}
              </h2>
              <p className="text-[13px] text-gray-400 dark:text-slate-500 mt-1">
                {step === 1 ? "Tell us about your school." : "This account will have full control of your school."}
              </p>
            </div>

            {/* Global error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 text-red-700 dark:text-red-400 rounded-xl px-3.5 py-3 text-[13px] mb-6">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {error}
              </div>
            )}

            {/* ─── STEP 1 ─── */}
            {step === 1 && (
              <form onSubmit={handleNext} className="space-y-5">

                <FloatField
                  id="orgName"
                  label="School / College Name"
                  required
                  icon={<IcoSchool />}
                  value={form.orgName}
                  onChange={e => handleOrgNameChange(e.target.value)}
                  onBlur={() => touch('orgName')}
                  error={fieldErr('orgName')}
                  autoFocus
                />

                {/* ── URL slug — custom layout ── */}
                <div>
                  <div className={cn(
                    'flex items-stretch rounded-xl border overflow-hidden transition-all duration-200',
                    'focus-within:ring-2',
                    fieldErr('slug')
                      ? 'border-red-400 focus-within:ring-red-400/25 focus-within:border-red-400'
                      : 'border-gray-200 dark:border-slate-600 focus-within:ring-blue-500/20 focus-within:border-blue-500',
                  )}>
                    {/* Prefix */}
                    <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-700/60 px-3 text-[11px] text-gray-400 dark:text-slate-500 border-r border-gray-200 dark:border-slate-600 font-mono whitespace-nowrap select-none">
                      <IcoGlobe />
                      {BASE_DOMAIN}/
                    </span>
                    {/* Slug input with its own float label */}
                    <div className="relative flex-1">
                      <input
                        id="slug"
                        placeholder=" "
                        value={form.slug}
                        onChange={e => { setSlugManual(true); set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }}
                        onBlur={() => touch('slug')}
                        className={cn(
                          'peer w-full bg-white dark:bg-slate-700/50 dark:text-slate-100',
                          'text-[0.9rem] font-mono pt-6 pb-2.5 px-3',
                          'focus:outline-none transition-all placeholder:text-transparent',
                        )}
                        required
                      />
                      <label htmlFor="slug" className={cn(
                        BASE_LABEL,
                        'left-3',
                        // override left position only
                      )}>
                        Your URL slug <span className="text-red-400">*</span>
                      </label>
                    </div>
                  </div>
                  {fieldErr('slug')
                    ? <InlineError msg={fieldErr('slug')} />
                    : form.slug
                      ? (
                        <p className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-slate-500 pl-1 mt-1.5">
                          <svg className="w-3 h-3 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                          <span className="font-medium text-blue-500">{form.slug}</span>
                          <span>.{BASE_DOMAIN}</span>
                        </p>
                      )
                      : <p className="text-[11px] text-gray-400 dark:text-slate-500 pl-1 mt-1.5">Staff and students will log in at this address</p>
                  }
                </div>

                <FloatField
                  id="contactEmail"
                  label="School Contact Email"
                  required
                  type="email"
                  icon={<IcoMail />}
                  value={form.contactEmail}
                  onChange={e => set('contactEmail', e.target.value)}
                  onBlur={() => touch('contactEmail')}
                  error={fieldErr('contactEmail')}
                />

                <FloatField
                  id="contactPhone"
                  label="Contact Phone"
                  type="tel"
                  icon={<IcoPhone />}
                  value={form.contactPhone}
                  onChange={e => set('contactPhone', e.target.value)}
                  hint="Optional — for account recovery and support"
                />

                <button type="submit" className={CTA}>
                  Continue
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </button>
              </form>
            )}

            {/* ─── STEP 2 ─── */}
            {step === 2 && (
              <form onSubmit={handleSubmit} className="space-y-5">

                <FloatField
                  id="adminName"
                  label="Your Full Name"
                  required
                  icon={<IcoUser />}
                  value={form.adminName}
                  onChange={e => set('adminName', e.target.value)}
                  onBlur={() => touch('adminName')}
                  error={fieldErr('adminName')}
                  autoFocus
                />

                <FloatField
                  id="adminEmail"
                  label="Your Email Address"
                  required
                  type="email"
                  icon={<IcoMail />}
                  value={form.adminEmail}
                  onChange={e => set('adminEmail', e.target.value)}
                  onBlur={() => touch('adminEmail')}
                  error={fieldErr('adminEmail')}
                />

                {/* Password */}
                <div>
                  <FloatField
                    id="adminPassword"
                    label="Password"
                    required
                    type={showPwd ? 'text' : 'password'}
                    icon={<IcoLock />}
                    value={form.adminPassword}
                    onChange={e => set('adminPassword', e.target.value)}
                    onBlur={() => touch('adminPassword')}
                    error={fieldErr('adminPassword')}
                    suffix={
                      <button
                        type="button"
                        onClick={() => setShowPwd(v => !v)}
                        tabIndex={-1}
                        className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                      >
                        <IcoEye open={showPwd} />
                      </button>
                    }
                  />
                  {form.adminPassword.length > 0 && <PasswordStrength password={form.adminPassword} />}
                </div>

                {/* Confirm password */}
                <div>
                  <div className="relative">
                    {/* leading icon */}
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none z-10">
                      <IcoLock />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showCfm ? 'text' : 'password'}
                      placeholder=" "
                      value={form.confirmPassword}
                      onChange={e => set('confirmPassword', e.target.value)}
                      onBlur={() => touch('confirmPassword')}
                      required
                      className={cn(
                        BASE_INPUT,
                        'pl-[2.6rem] pr-[4.5rem]',
                        cfmMismatch
                          ? 'border-red-400 dark:border-red-500 focus:ring-red-400/30 focus:border-red-400'
                          : cfmMatches
                            ? 'border-emerald-400 dark:border-emerald-500 focus:ring-emerald-400/30 focus:border-emerald-500'
                            : 'border-gray-200 dark:border-slate-600 focus:ring-blue-500/20 focus:border-blue-500',
                      )}
                    />
                    <label htmlFor="confirmPassword" className={cn(BASE_LABEL, 'left-[2.6rem]')}>
                      Confirm Password <span className="text-red-400">*</span>
                    </label>
                    {/* Right-side icons */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      {cfmMatches && (
                        <span className="text-emerald-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowCfm(v => !v)}
                        tabIndex={-1}
                        className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                      >
                        <IcoEye open={showCfm} />
                      </button>
                    </div>
                  </div>
                  {fieldErr('confirmPassword') && <InlineError msg={fieldErr('confirmPassword')} />}
                </div>

                {/* Back + Submit */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(''); }}
                    className="flex-shrink-0 w-[86px] flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 py-3 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={cn(CTA, 'flex-1')}
                  >
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />Creating...</>
                      : <>Create Account <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg></>
                    }
                  </button>
                </div>

                <p className="text-[11px] text-gray-400 dark:text-slate-600 text-center leading-relaxed">
                  By registering you agree to our Terms of Service.{' '}
                  Your school starts on a <span className="font-medium text-gray-500 dark:text-slate-500">30-day free trial</span>.
                </p>
              </form>
            )}
          </div>

          {/* Below card */}
          <p className="text-center text-[13px] text-gray-400 dark:text-slate-600 mt-6">
            Already registered?{' '}
            <a href={adminLoginUrl()} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              Sign in to your school
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── CTA button ────────────────────────────────────────────

const CTA = [
  'w-full flex items-center justify-center gap-2',
  'rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99]',
  'text-white text-sm font-semibold py-3',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  'transition-all duration-150 shadow-[0_2px_12px_-2px_rgba(59,130,246,0.5)]',
].join(' ');
