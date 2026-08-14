import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeCanvas } from 'qrcode.react';
import api from '../../services/api';
import type { Organization, ApiResponse, UsageMetric, Branch } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import PageHeader from '../../components/ui/PageHeader';
import { cn, formatCurrency } from '../../lib/utils';
import WebsiteBuilderTab from './WebsiteBuilderTab';
import { gatewayService, type GatewayConfig, type TestResult } from '../../services/gatewayService';

// ── Tab definitions ────────────────────────────────────────

type Tab = 'profile' | 'branding' | 'website' | 'mobile' | 'subscription' | 'gateways' | 'danger';

type BrandState = {
  logoUrl: string;
  welcomeMessage: string;
  tagline: string;
  primaryColor: string;
};

const PRESET_COLORS = [
  '#2563eb', '#059669', '#dc2626', '#7c3aed',
  '#d97706', '#0891b2', '#0f172a', '#831843',
];

const TABS: { id: Tab; label: string; icon: React.ReactNode; danger?: boolean }[] = [
  {
    id: 'profile',
    label: 'School Profile',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  },
  {
    id: 'branding',
    label: 'Login Branding',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>,
  },
  {
    id: 'website',
    label: 'Website',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
  },
  {
    id: 'mobile',
    label: 'Mobile App',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  },
  {
    id: 'subscription',
    label: 'Subscription',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  },
  {
    id: 'gateways',
    label: 'Payment Gateways',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  },
  {
    id: 'danger',
    label: 'Danger Zone',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    danger: true,
  },
];

// ── Plan / status display maps ─────────────────────────────

const PLAN_DISPLAY: Record<string, { label: string; badge: string }> = {
  starter:  { label: 'Starter',  badge: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300' },
  growth:   { label: 'Growth',   badge: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  scale:    { label: 'Scale',    badge: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' },
};

const STATUS_DISPLAY: Record<string, { label: string; dot: string; chip: string }> = {
  active:    { label: 'Active',    dot: 'bg-emerald-500', chip: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
  trial:     { label: 'Trial',     dot: 'bg-amber-400',   chip: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' },
  suspended: { label: 'Suspended', dot: 'bg-red-500',     chip: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' },
};

// ── Shared UI primitives ──────────────────────────────────

const inputCls = [
  'w-full rounded-xl border border-gray-200 dark:border-slate-600',
  'bg-white dark:bg-slate-700/50 dark:text-slate-100',
  'px-3.5 py-2.5 text-sm',
  'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
  'transition-all duration-150',
  'placeholder:text-gray-300 dark:placeholder:text-slate-600',
].join(' ');

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1.5">
      {children}{required && <span className="text-red-400 ml-0.5 normal-case tracking-normal font-semibold"> *</span>}
    </label>
  );
}

function SavedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      Saved
    </span>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-slate-700 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] dark:shadow-none overflow-hidden">
      <div className="px-7 py-5 border-b border-gray-100 dark:border-slate-700/70">
        <h3 className="font-semibold text-gray-900 dark:text-slate-50 text-[0.95rem] tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-7 py-6">{children}</div>
    </div>
  );
}

// ── Login page mini-preview ───────────────────────────────

function LoginPreviewCard({ brand, orgName }: { brand: BrandState; orgName: string }) {
  const primary = brand.primaryColor || '#2563eb';
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.15)] dark:shadow-none">
      <div className="flex h-60">

        {/* Left panel — school identity */}
        <div className="w-[42%] bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-4 border-r border-gray-100 dark:border-slate-700 gap-2.5 relative">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt="" className="h-10 w-auto object-contain max-w-[72px]" />
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: primary }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
          )}
          <div className="text-center px-1">
            <p className="text-[9.5px] font-extrabold text-gray-900 dark:text-slate-50 leading-snug line-clamp-2">{orgName}</p>
            {brand.tagline && (
              <p className="text-[7.5px] italic mt-0.5 line-clamp-1" style={{ color: primary }}>{brand.tagline}</p>
            )}
            {brand.welcomeMessage && (
              <p className="text-[7px] text-gray-400 dark:text-slate-500 mt-1 line-clamp-2 leading-snug">{brand.welcomeMessage}</p>
            )}
          </div>
          <p className="absolute bottom-1.5 text-[6px] text-gray-200 dark:text-slate-700">EduStack PK</p>
        </div>

        {/* Right panel — login card */}
        <div className="flex-1 bg-gray-50 dark:bg-slate-800 flex items-center justify-center p-3">
          <div className="w-full bg-white dark:bg-slate-700 rounded-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.12)] dark:shadow-none overflow-hidden">
            <div className="h-[3px]" style={{ backgroundColor: primary }} />
            <div className="px-3 py-3 space-y-2">
              <div>
                <p className="text-[9px] font-bold text-gray-900 dark:text-slate-100">Sign In</p>
                <p className="text-[7px] text-gray-400 dark:text-slate-500">to your school account</p>
              </div>
              <div className="flex gap-3 border-b border-gray-100 dark:border-slate-600">
                {['Admin', 'Teacher', 'Student'].map((r, i) => (
                  <div key={r} className="pb-1" style={i === 0 ? { borderBottom: `1.5px solid ${primary}` } : {}}>
                    <span className="text-[7px] font-semibold" style={{ color: i === 0 ? primary : '#9ca3af' }}>{r}</span>
                  </div>
                ))}
              </div>
              <div className="h-3.5 bg-gray-100 dark:bg-slate-600 rounded" />
              <div className="h-3.5 bg-gray-100 dark:bg-slate-600 rounded" />
              <div className="h-5 rounded-md flex items-center justify-center gap-1" style={{ backgroundColor: primary }}>
                <span className="text-[7.5px] font-bold text-white">Login as Admin</span>
                <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────

export default function GroupSettingsPage() {
  const qc       = useQueryClient();
  const user     = useAuthStore(s => s.user);
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const p = new URLSearchParams(location.search).get('tab') as Tab | null;
    return p && TABS.some(t => t.id === p) ? p : 'profile';
  });

  // Profile form
  const [form, setForm]     = useState({ name: '', contactEmail: '', contactPhone: '', address: '' });
  const [profileSaved, setProfileSaved] = useState(false);

  // Brand form
  const [brand, setBrand]       = useState<BrandState>({ logoUrl: '', welcomeMessage: '', tagline: '', primaryColor: '#2563eb' });
  const [brandSaved, setBrandSaved]     = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError]         = useState('');
  const [isDragging, setIsDragging]       = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // QR state
  const [qrData, setQrData]         = useState<string | null>(null);
  const [qrOrgName, setQrOrgName]   = useState('');
  const [qrGenerating, setQrGenerating] = useState(false);
  const [qrError, setQrError]           = useState('');
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Danger zone
  const [resetConfirm, setResetConfirm] = useState(false);

  // ── Gateway settings state ──
  type GwId = 'jazzcash' | 'easypaisa';
  const [openGw, setOpenGw]           = useState<GwId | null>(null);
  const [gwTestResult, setGwTestResult] = useState<Record<string, TestResult | null>>({});
  const [gwTesting, setGwTesting]       = useState<Record<string, boolean>>({});
  const [jcForm, setJcForm] = useState({ merchantId: '', password: '', integritySalt: '', isSandbox: true });
  const [epForm, setEpForm] = useState({ merchantId: '', storeId: '', hashKey: '', isSandbox: true });

  // ── Fetch org ──
  const { data: org, isLoading } = useQuery({
    queryKey: ['org', user?.orgId],
    queryFn: () =>
      api.get<ApiResponse<Organization>>(`/organizations/${user!.orgId}`).then(r => r.data.data!),
    enabled: !!user?.orgId,
  });

  useEffect(() => {
    if (org) {
      setForm({ name: org.name, contactEmail: org.contactEmail, contactPhone: org.contactPhone ?? '', address: org.address ?? '' });
      setBrand({
        logoUrl: org.logoUrl ?? '',
        welcomeMessage: org.welcomeMessage ?? '',
        tagline: org.tagline ?? '',
        primaryColor: org.primaryColor ?? '#2563eb',
      });
    }
  }, [org]);

  // ── Mutations ──
  const updateProfile = useMutation({
    mutationFn: (body: typeof form) => api.put(`/organizations/${user!.orgId}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['org'] }); setProfileSaved(true); setTimeout(() => setProfileSaved(false), 3000); },
  });

  const updateBrand = useMutation({
    mutationFn: (body: typeof brand) => api.put(`/organizations/${user!.orgId}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['org'] }); setBrandSaved(true); setTimeout(() => setBrandSaved(false), 3000); },
  });

  // ── Gateway queries / mutations ──
  const { data: gwConfigs = [] } = useQuery<GatewayConfig[]>({
    queryKey: ['gateway-configs'],
    queryFn: gatewayService.list,
    enabled: activeTab === 'gateways',
  });

  // ── Usage / billing history (subscription tab) ──
  const { data: usageMetrics = [] } = useQuery({
    queryKey: ['usage-metrics', user?.orgId],
    queryFn: () =>
      api.get<ApiResponse<UsageMetric[]>>(`/organizations/${user!.orgId}/usage-metrics`).then(r => r.data.data ?? []),
    enabled: !!user?.orgId && activeTab === 'subscription',
  });
  const { data: usageBranches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<ApiResponse<Branch[]>>('/branches').then(r => r.data.data ?? []),
    enabled: activeTab === 'subscription',
  });
  const branchNameById = Object.fromEntries(usageBranches.map(b => [b._id, b.name]));

  const gwConfigMap = gwConfigs.reduce<Record<string, GatewayConfig>>((acc, c) => { acc[c.gateway] = c; return acc; }, {});

  const upsertGateway = useMutation({
    mutationFn: gatewayService.upsert,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gateway-configs'] }); setOpenGw(null); },
  });

  const removeGateway = useMutation({
    mutationFn: gatewayService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gateway-configs'] }),
  });

  async function handleTestGateway(gw: GwId) {
    setGwTesting(t => ({ ...t, [gw]: true }));
    setGwTestResult(r => ({ ...r, [gw]: null }));
    try {
      const result = await gatewayService.test(gw);
      setGwTestResult(r => ({ ...r, [gw]: result }));
    } catch {
      setGwTestResult(r => ({ ...r, [gw]: { reachable: false, responseCode: 'ERR', responseDesc: 'Request failed' } }));
    } finally {
      setGwTesting(t => ({ ...t, [gw]: false }));
    }
  }

  // ── Logo upload ──
  const processLogoFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { setLogoError('Please upload an image file (PNG, JPG, SVG, WebP).'); return; }
    if (file.size > 2 * 1024 * 1024) { setLogoError('Image must be under 2 MB.'); return; }
    setLogoError('');
    setLogoUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setBrand(b => ({ ...b, logoUrl: base64 }));
    } catch {
      setLogoError('Failed to read image. Please try again.');
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  // ── QR code ──
  async function handleGenerateQr() {
    setQrError('');
    setQrGenerating(true);
    try {
      const { data } = await api.post<{ success: boolean; data: { qrData: string; org: { name: string; slug: string } } }>(
        `/organizations/${user!.orgId}/generate-qr`
      );
      setQrData(data.data.qrData);
      setQrOrgName(data.data.org.name);
    } catch { setQrError('Failed to generate QR code. Please try again.'); }
    finally { setQrGenerating(false); }
  }

  function handleDownloadQr() {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${qrOrgName || 'school'}-mobile-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  if (!user?.orgId) return null;

  return (
    <div className="p-6 lg:p-8 max-w-[1080px] mx-auto">
      <PageHeader
        title="Settings"
        subtitle="Manage your school group profile, branding, and configuration"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-gray-300 dark:text-slate-600">
          <div className="w-7 h-7 border-[3px] border-current border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="mt-8 flex flex-col lg:flex-row gap-6 lg:gap-8">

          {/* ── Left sidebar ── */}
          <aside className="lg:w-48 flex-shrink-0">
            {/* Mobile: horizontal scroll */}
            <div className="flex lg:hidden gap-1 overflow-x-auto pb-1 -mx-1 px-1">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors flex-shrink-0',
                    activeTab === t.id
                      ? t.danger ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : t.danger ? 'text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50',
                  )}
                >
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            {/* Desktop: vertical list */}
            <nav className="hidden lg:flex flex-col gap-0.5">
              {TABS.map((t) => (
                <div key={t.id}>
                  {/* Divider before Danger Zone */}
                  {t.danger && <div className="my-2 border-t border-gray-200 dark:border-slate-700" />}
                  <button
                    onClick={() => setActiveTab(t.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 text-left',
                      activeTab === t.id
                        ? t.danger
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 shadow-sm'
                          : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm'
                        : t.danger
                          ? 'text-red-400 dark:text-red-500/80 hover:bg-red-50/60 dark:hover:bg-red-900/10 hover:text-red-600'
                          : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100/80 dark:hover:bg-slate-700/50 hover:text-gray-700 dark:hover:text-slate-200',
                    )}
                  >
                    <span className={cn('flex-shrink-0', activeTab === t.id && !t.danger ? 'text-blue-600 dark:text-blue-400' : '')}>{t.icon}</span>
                    {t.label}
                  </button>
                </div>
              ))}
            </nav>
          </aside>

          {/* ── Content area ── */}
          <main className="flex-1 min-w-0 space-y-5">

            {/* ════ PROFILE TAB ════ */}
            {activeTab === 'profile' && (
              <SectionCard title="School Profile" subtitle="Your school group's public identity and contact details.">
                <form
                  onSubmit={e => { e.preventDefault(); updateProfile.mutate(form); }}
                  className="space-y-5"
                >
                  <div>
                    <FieldLabel required>School Group Name</FieldLabel>
                    <input
                      className={inputCls}
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Punjab Grammar Schools"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required>Contact Email</FieldLabel>
                      <input
                        type="email"
                        className={inputCls}
                        value={form.contactEmail}
                        onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                        placeholder="admin@school.pk"
                        required
                      />
                    </div>
                    <div>
                      <FieldLabel>Contact Phone</FieldLabel>
                      <input
                        type="tel"
                        className={inputCls}
                        value={form.contactPhone}
                        onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
                        placeholder="+92 300 0000000"
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Head Office Address</FieldLabel>
                    <input
                      className={inputCls}
                      value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      placeholder="Street, City, Province"
                    />
                  </div>

                  {updateProfile.isError && (
                    <p className="text-xs text-red-500">{(updateProfile.error as any)?.response?.data?.message ?? 'Failed to save changes'}</p>
                  )}

                  <div className="flex items-center gap-4 pt-1">
                    <button
                      type="submit"
                      disabled={updateProfile.isPending}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all shadow-[0_2px_8px_-2px_rgba(59,130,246,0.5)]"
                    >
                      {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                    {profileSaved && <SavedBadge />}
                  </div>
                </form>
              </SectionCard>
            )}

            {/* ════ BRANDING TAB ════ */}
            {activeTab === 'branding' && (
              <SectionCard title="Login Page Builder" subtitle="Customise what staff and students see on your school's login page. Changes preview live.">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) processLogoFile(f); }}
                />
                <form onSubmit={e => { e.preventDefault(); updateBrand.mutate(brand); }}>
                  <div className="flex flex-col xl:flex-row gap-8">

                    {/* ── Controls ── */}
                    <div className="flex-1 min-w-0 space-y-6">

                      {/* Logo */}
                      <div>
                        <FieldLabel>School Logo</FieldLabel>
                        {brand.logoUrl ? (
                          <div className="flex items-center gap-4">
                            <div className="relative group w-20 h-20 rounded-2xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                              <img src={brand.logoUrl} alt="School logo" className="w-full h-full object-contain p-2" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-white text-[10px] font-semibold">Change</button>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-slate-200">Logo uploaded</p>
                              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Shown on your school's login page</p>
                              <div className="flex gap-3 mt-2">
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">Replace</button>
                                <button type="button" onClick={() => setBrand(b => ({ ...b, logoUrl: '' }))} className="text-xs text-red-500 dark:text-red-400 font-medium hover:underline">Remove</button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) processLogoFile(f); }}
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                              'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 py-8 px-6',
                              isDragging
                                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10'
                                : 'border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-slate-500 hover:bg-gray-50/60 dark:hover:bg-slate-700/30',
                            )}
                          >
                            <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center transition-colors', isDragging ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-500' : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500')}>
                              {logoUploading
                                ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                              }
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium text-gray-700 dark:text-slate-200">{isDragging ? 'Drop your logo here' : 'Drag & drop or click to upload'}</p>
                              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">PNG, JPG, SVG or WebP · Max 2 MB</p>
                            </div>
                          </div>
                        )}
                        {logoError && <p className="text-xs text-red-500 mt-1.5">{logoError}</p>}
                      </div>

                      {/* Brand color */}
                      <div>
                        <FieldLabel>Brand Color</FieldLabel>
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Color swatch opens native picker */}
                          <label className="relative cursor-pointer flex-shrink-0">
                            <input
                              type="color"
                              value={brand.primaryColor}
                              onChange={e => setBrand(b => ({ ...b, primaryColor: e.target.value }))}
                              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                            />
                            <div
                              className="w-10 h-10 rounded-xl border-2 border-white dark:border-slate-600 shadow-md ring-1 ring-gray-200 dark:ring-slate-600 hover:scale-105 transition-transform"
                              style={{ backgroundColor: brand.primaryColor }}
                            />
                          </label>
                          {/* Hex input */}
                          <input
                            type="text"
                            value={brand.primaryColor}
                            onChange={e => {
                              const v = e.target.value;
                              if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setBrand(b => ({ ...b, primaryColor: v }));
                            }}
                            maxLength={7}
                            placeholder="#2563eb"
                            className={cn(inputCls, 'font-mono w-28 text-sm')}
                          />
                          {/* Preset swatches */}
                          <div className="flex gap-1.5 flex-wrap">
                            {PRESET_COLORS.map(c => (
                              <button
                                key={c}
                                type="button"
                                title={c}
                                onClick={() => setBrand(b => ({ ...b, primaryColor: c }))}
                                className={cn(
                                  'w-6 h-6 rounded-full transition-all hover:scale-110 ring-offset-2 dark:ring-offset-slate-800',
                                  brand.primaryColor === c ? 'ring-2 ring-gray-500 dark:ring-slate-400' : '',
                                )}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1.5">Applied to your login button, tab underline, and accent bar.</p>
                      </div>

                      {/* Tagline */}
                      <div>
                        <FieldLabel>School Tagline</FieldLabel>
                        <input
                          className={inputCls}
                          value={brand.tagline}
                          onChange={e => setBrand(b => ({ ...b, tagline: e.target.value }))}
                          placeholder="Nurturing excellence since 1985"
                          maxLength={80}
                        />
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1.5">Short motto shown in your brand color beneath the school name.</p>
                      </div>

                      {/* Welcome message */}
                      <div>
                        <FieldLabel>Welcome Message</FieldLabel>
                        <textarea
                          rows={3}
                          className={cn(inputCls, 'resize-none')}
                          value={brand.welcomeMessage}
                          onChange={e => setBrand(b => ({ ...b, welcomeMessage: e.target.value }))}
                          placeholder="Welcome back! Please sign in to continue."
                        />
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1.5">Displayed below your tagline on the login page.</p>
                      </div>

                      {updateBrand.isError && (
                        <p className="text-xs text-red-500">{(updateBrand.error as any)?.response?.data?.message ?? 'Failed to save branding'}</p>
                      )}

                      <div className="flex items-center gap-4 pt-1">
                        <button
                          type="submit"
                          disabled={updateBrand.isPending}
                          className="px-5 py-2.5 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.25)]"
                          style={{ backgroundColor: brand.primaryColor || '#2563eb' }}
                        >
                          {updateBrand.isPending ? 'Saving...' : 'Save Branding'}
                        </button>
                        {brandSaved && <SavedBadge />}
                      </div>
                    </div>

                    {/* ── Live preview ── */}
                    <div className="xl:w-[300px] flex-shrink-0">
                      <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live Preview
                      </p>
                      <LoginPreviewCard brand={brand} orgName={form.name || 'Your School'} />
                      <p className="text-[10.5px] text-gray-400 dark:text-slate-500 mt-2 text-center">Updates as you edit</p>
                    </div>

                  </div>
                </form>
              </SectionCard>
            )}

            {/* ════ WEBSITE TAB ════ */}
            {activeTab === 'website' && (
              org?.websiteAddon ? (
                <WebsiteBuilderTab
                  orgId={org._id}
                  initialSite={org.site}
                  orgSlug={org.slug}
                />
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-slate-700 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] dark:shadow-none overflow-hidden">
                  <div className="px-7 py-5 border-b border-gray-100 dark:border-slate-700/70">
                    <h3 className="font-semibold text-gray-900 dark:text-slate-50 text-[0.95rem] tracking-tight">Public Website</h3>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Launch a branded website at your school's subdomain.</p>
                  </div>
                  <div className="px-7 py-16 flex flex-col items-center text-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-300 dark:text-slate-600">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-slate-100">Website Add-on Not Enabled</p>
                      <p className="text-sm text-gray-400 dark:text-slate-500 mt-1.5 max-w-sm">
                        This is a premium add-on. Contact{' '}
                        <a href="mailto:support@tws.enterprises" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                          support@tws.enterprises
                        </a>{' '}
                        to enable the Website builder for your school.
                      </p>
                    </div>
                  </div>
                </div>
              )
            )}

            {/* ════ MOBILE APP TAB ════ */}
            {activeTab === 'mobile' && (
              <SectionCard
                title="Mobile App Onboarding"
                subtitle="Generate a QR code that connects the EduStack Android app to your school."
              >
                {/* Step indicators */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[
                    { n: 1, title: 'Generate', desc: 'Create your school\'s unique QR code below' },
                    { n: 2, title: 'Open App', desc: 'Staff & students open EduStack on Android' },
                    { n: 3, title: 'Scan & Connect', desc: 'Scan the QR to link the app to your school' },
                  ].map(s => (
                    <div key={s.n} className="relative flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-gray-50 dark:bg-slate-700/40 border border-gray-100 dark:border-slate-700">
                      <div className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold',
                        qrData && s.n <= 1 ? 'bg-emerald-500 text-white' :
                        s.n === 1 ? 'bg-blue-600 text-white' :
                        'bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-400',
                      )}>
                        {qrData && s.n === 1
                          ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          : s.n}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">{s.title}</p>
                        <p className="text-[10.5px] text-gray-400 dark:text-slate-500 mt-0.5 leading-snug">{s.desc}</p>
                      </div>
                      {s.n < 3 && (
                        <div className="hidden sm:block absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-px bg-gray-200 dark:bg-slate-600" />
                      )}
                    </div>
                  ))}
                </div>

                {qrError && (
                  <div className="mb-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
                    {qrError}
                  </div>
                )}

                {qrData ? (
                  /* QR generated state */
                  <div className="flex flex-col sm:flex-row items-center gap-8">
                    <div className="flex-shrink-0 p-5 bg-white dark:bg-white rounded-2xl shadow-[0_4px_24px_-6px_rgba(0,0,0,0.15)] border border-gray-100">
                      <QRCodeCanvas
                        ref={qrCanvasRef}
                        value={qrData}
                        size={180}
                        level="M"
                        includeMargin
                      />
                    </div>
                    <div className="text-center sm:text-left">
                      <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        QR code ready
                      </div>
                      <p className="text-base font-semibold text-gray-900 dark:text-slate-50">{qrOrgName}</p>
                      <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                        Share this code with your staff and students.<br />
                        They scan it once to connect the mobile app.
                      </p>
                      <div className="flex flex-wrap gap-3 mt-5">
                        <button
                          type="button"
                          onClick={handleDownloadQr}
                          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-[0_2px_8px_-2px_rgba(59,130,246,0.5)]"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Download PNG
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerateQr}
                          disabled={qrGenerating}
                          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                        >
                          {qrGenerating ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                          Regenerate
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* No QR yet */
                  <div className="flex flex-col items-center text-center py-4 gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 flex items-center justify-center">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8H3m2 0V6m0 2v2M5 8H3m5-4h2M5 8h.01" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">No QR code yet</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-xs">
                        Generate your school's unique onboarding QR code — each school gets one that never changes unless regenerated.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateQr}
                      disabled={qrGenerating}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all shadow-[0_2px_8px_-2px_rgba(59,130,246,0.5)]"
                    >
                      {qrGenerating
                        ? <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />Generating...</>
                        : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8H3m2 0V6m0 2v2M5 8H3m5-4h2M5 8h.01" /></svg>Generate QR Code</>
                      }
                    </button>
                  </div>
                )}
              </SectionCard>
            )}

            {/* ════ SUBSCRIPTION TAB ════ */}
            {activeTab === 'subscription' && org && (
              <SectionCard title="Subscription" subtitle="Your current plan and account status.">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Plan */}
                  <div className="rounded-xl bg-gray-50 dark:bg-slate-700/40 border border-gray-100 dark:border-slate-700 p-4">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2">Plan</p>
                    <span className={cn('text-sm font-semibold px-2.5 py-1 rounded-lg', (PLAN_DISPLAY[org.plan] ?? PLAN_DISPLAY.starter).badge)}>
                      {(PLAN_DISPLAY[org.plan] ?? { label: org.plan }).label}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="rounded-xl bg-gray-50 dark:bg-slate-700/40 border border-gray-100 dark:border-slate-700 p-4">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2">Status</p>
                    {(() => {
                      const s = STATUS_DISPLAY[org.status] ?? { label: org.status, dot: 'bg-gray-400', chip: 'bg-gray-100 text-gray-600' };
                      return (
                        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg', s.chip)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
                          {s.label}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Trial end date */}
                  {org.trialEndsAt && org.status === 'trial' && (
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 p-4">
                      <p className="text-[10.5px] font-bold uppercase tracking-wider text-amber-500/70 mb-2">Trial ends</p>
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                        {new Date(org.trialEndsAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  )}

                  {/* URL slug */}
                  <div className="rounded-xl bg-gray-50 dark:bg-slate-700/40 border border-gray-100 dark:border-slate-700 p-4">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2">URL slug</p>
                    <p className="text-sm font-mono font-medium text-gray-700 dark:text-slate-300">{org.slug}</p>
                  </div>
                </div>

                <p className="text-xs text-gray-400 dark:text-slate-500 mt-5">
                  To change your plan, contact{' '}
                  <a href="mailto:billing@tws.enterprises" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                    billing@tws.enterprises
                  </a>.
                </p>
              </SectionCard>
            )}

            {/* ════ USAGE / BILLING HISTORY ════ */}
            {activeTab === 'subscription' && org && (
              <SectionCard title="Usage & Billing History" subtitle="Per-branch active-student counts used to calculate your monthly bill.">
                {usageMetrics.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-slate-500">No billing history yet — usage is calculated at the end of each month.</p>
                ) : (
                  (() => {
                    const months = Array.from(new Set(usageMetrics.map(m => m.month))).slice(0, 6);
                    return (
                      <div className="space-y-6">
                        {months.map(month => {
                          const rows = usageMetrics.filter(m => m.month === month);
                          const total = rows.reduce((s, r) => s + r.totalAmount, 0);
                          const totalStudents = rows.reduce((s, r) => s + r.activeStudents, 0);
                          return (
                            <div key={month}>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{month}</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{formatCurrency(total)}</p>
                              </div>
                              <div className="rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                                <table className="w-full text-sm">
                                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {rows.map(r => (
                                      <tr key={r._id}>
                                        <td className="px-4 py-2 text-gray-600 dark:text-slate-300">{branchNameById[r.branchId] ?? 'Branch'}</td>
                                        <td className="px-4 py-2 text-gray-400 dark:text-slate-500 text-xs">{r.activeStudents} students × {formatCurrency(r.ratePerStudent)}</td>
                                        <td className="px-4 py-2 text-right font-medium text-gray-700 dark:text-slate-300">{formatCurrency(r.totalAmount)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">{totalStudents} active students across {rows.length} branch{rows.length !== 1 ? 'es' : ''}</p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </SectionCard>
            )}

            {/* ════ PAYMENT GATEWAYS TAB ════ */}
            {activeTab === 'gateways' && (() => {
              const gateways: { id: GwId; label: string; fields: { key: string; label: string; placeholder: string; type?: string }[] }[] = [
                {
                  id: 'jazzcash',
                  label: 'JazzCash',
                  fields: [
                    { key: 'merchantId',    label: 'Merchant ID',     placeholder: 'MC54996' },
                    { key: 'password',      label: 'API Password',    placeholder: '••••••••', type: 'password' },
                    { key: 'integritySalt', label: 'Integrity Salt',  placeholder: '••••••••', type: 'password' },
                  ],
                },
                {
                  id: 'easypaisa',
                  label: 'EasyPaisa',
                  fields: [
                    { key: 'merchantId', label: 'Merchant ID',  placeholder: 'Your merchant ID' },
                    { key: 'storeId',    label: 'Store ID',     placeholder: 'Your store ID' },
                    { key: 'hashKey',    label: 'Hash Key',     placeholder: '••••••••', type: 'password' },
                  ],
                },
              ];

              return (
                <div className="space-y-4">
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    Each gateway uses your own merchant credentials — fees go directly to your account. Credentials are AES-256 encrypted at rest.
                  </p>
                  {gateways.map(gw => {
                    const config = gwConfigMap[gw.id];
                    const isOpen = openGw === gw.id;
                    const form = gw.id === 'jazzcash' ? jcForm : epForm;
                    const setForm = gw.id === 'jazzcash'
                      ? (fn: (f: typeof jcForm) => typeof jcForm) => setJcForm(fn)
                      : (fn: (f: typeof epForm) => typeof epForm) => setEpForm(fn as any);
                    const testResult = gwTestResult[gw.id];
                    const isTesting  = gwTesting[gw.id] ?? false;

                    return (
                      <div key={gw.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-slate-700 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] dark:shadow-none overflow-hidden">

                        {/* Header row */}
                        <div className="px-6 py-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden p-1',
                              gw.id === 'jazzcash' ? 'bg-[#d50000]' : 'bg-[#00a651]',
                            )}>
                              <img
                                src={gw.id === 'jazzcash'
                                  ? 'https://commons.wikimedia.org/wiki/Special:FilePath/JazzCash_logo_(2025).png'
                                  : 'https://commons.wikimedia.org/wiki/Special:FilePath/Easypaisa_Digital_Bank_logo.png'
                                }
                                alt={gw.id === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  const el = e.currentTarget;
                                  el.style.display = 'none';
                                  const parent = el.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<span class="text-white text-xs font-bold">${gw.id === 'jazzcash' ? 'JC' : 'EP'}</span>`;
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-slate-50">{gw.label}</p>
                              {config ? (
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Configured · {config.isSandbox ? 'Sandbox' : 'Live'}
                                </span>
                              ) : (
                                <span className="text-[10.5px] text-gray-400 dark:text-slate-500">Not configured</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {config && !isOpen && (
                              <button
                                type="button"
                                onClick={() => handleTestGateway(gw.id)}
                                disabled={isTesting}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                              >
                                {isTesting
                                  ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                }
                                Test
                              </button>
                            )}
                            {config && !isOpen && (
                              <button
                                type="button"
                                onClick={() => removeGateway.mutate(gw.id)}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-700/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                Remove
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setOpenGw(isOpen ? null : gw.id);
                                setGwTestResult(r => ({ ...r, [gw.id]: null }));
                              }}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-[0_1px_4px_-1px_rgba(59,130,246,0.5)]"
                            >
                              {isOpen ? 'Cancel' : config ? 'Update Keys' : 'Configure'}
                            </button>
                          </div>
                        </div>

                        {/* Test result banner */}
                        {testResult && !isOpen && (
                          <div className={cn(
                            'mx-6 mb-4 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2',
                            testResult.reachable
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40',
                          )}>
                            {testResult.reachable
                              ? <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              : <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            }
                            <span>
                              {testResult.reachable ? 'Gateway reachable' : 'Connection failed'} — code <code className="font-mono">{testResult.responseCode}</code>
                              {testResult.responseDesc ? ` · ${testResult.responseDesc}` : ''}
                            </span>
                          </div>
                        )}

                        {/* Credential form */}
                        {isOpen && (
                          <div className="px-6 pb-6 border-t border-gray-100 dark:border-slate-700/60 pt-5">
                            <form
                              onSubmit={e => {
                                e.preventDefault();
                                const { isSandbox, ...credentials } = form;
                                upsertGateway.mutate({ gateway: gw.id, isSandbox, credentials });
                              }}
                              className="space-y-4"
                            >
                              {/* Sandbox toggle */}
                              <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-slate-700/40 border border-gray-100 dark:border-slate-700 px-4 py-3">
                                <div>
                                  <p className="text-sm font-medium text-gray-800 dark:text-slate-100">Sandbox Mode</p>
                                  <p className="text-[10.5px] text-gray-400 dark:text-slate-500 mt-0.5">Use test environment — no real payments processed</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setForm((f: any) => ({ ...f, isSandbox: !f.isSandbox }))}
                                  className={cn(
                                    'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
                                    form.isSandbox ? 'bg-blue-500' : 'bg-gray-300 dark:bg-slate-600',
                                  )}
                                >
                                  <span className={cn(
                                    'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                                    form.isSandbox ? 'translate-x-5' : 'translate-x-0.5',
                                  )} />
                                </button>
                              </div>

                              {/* Credential fields */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {gw.fields.map(f => (
                                  <div key={f.key}>
                                    <FieldLabel required>{f.label}</FieldLabel>
                                    <input
                                      type={f.type ?? 'text'}
                                      className={inputCls}
                                      placeholder={f.placeholder}
                                      value={(form as any)[f.key]}
                                      onChange={e => setForm((prev: any) => ({ ...prev, [f.key]: e.target.value }))}
                                      required
                                      autoComplete="off"
                                    />
                                  </div>
                                ))}
                              </div>

                              {upsertGateway.isError && (
                                <p className="text-xs text-red-500">
                                  {(upsertGateway.error as any)?.response?.data?.message ?? 'Failed to save credentials'}
                                </p>
                              )}

                              <div className="flex items-center gap-3 pt-1">
                                <button
                                  type="submit"
                                  disabled={upsertGateway.isPending}
                                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all shadow-[0_2px_8px_-2px_rgba(59,130,246,0.5)]"
                                >
                                  {upsertGateway.isPending ? 'Saving...' : 'Save Credentials'}
                                </button>
                                <p className="text-[10.5px] text-gray-400 dark:text-slate-500">Encrypted with AES-256 before storage</p>
                              </div>
                            </form>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* ════ DANGER ZONE TAB ════ */}
            {activeTab === 'danger' && (
              <div className="rounded-2xl border border-red-200 dark:border-red-800/50 shadow-[0_2px_16px_-4px_rgba(239,68,68,0.08)] overflow-hidden">
                <div className="px-7 py-5 border-b border-red-100 dark:border-red-800/40 bg-red-50/60 dark:bg-red-900/10">
                  <h3 className="font-semibold text-red-700 dark:text-red-400 text-[0.95rem] tracking-tight flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Danger Zone
                  </h3>
                  <p className="text-xs text-red-500/80 dark:text-red-400/70 mt-0.5">
                    Actions here are destructive and may not be reversible. Proceed with caution.
                  </p>
                </div>

                <div className="px-7 py-6 bg-white dark:bg-slate-800 space-y-5">
                  {/* Reset branding */}
                  <div className="flex items-start justify-between gap-6 py-4 border-b border-gray-100 dark:border-slate-700">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">Reset Login Branding</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                        Removes your school logo and welcome message from the login page.
                      </p>
                    </div>
                    {resetConfirm ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium whitespace-nowrap">Sure?</span>
                        <button
                          type="button"
                          onClick={() => {
                            const reset: BrandState = { logoUrl: '', welcomeMessage: '', tagline: '', primaryColor: '#2563eb' };
                            setBrand(reset);
                            updateBrand.mutate(reset);
                            setResetConfirm(false);
                          }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Yes, reset
                        </button>
                        <button
                          type="button"
                          onClick={() => setResetConfirm(false)}
                          className="px-3 py-1.5 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 text-xs font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setResetConfirm(true)}
                        className="flex-shrink-0 px-4 py-2 border border-red-200 dark:border-red-700/60 text-red-600 dark:text-red-400 text-xs font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        Reset Branding
                      </button>
                    )}
                  </div>

                  {/* Placeholder for future destructive actions */}
                  <div className="flex items-start justify-between gap-6 py-4 opacity-50 cursor-not-allowed">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">Archive School Group</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                        Deactivate this school group and all associated branches. Contact support to re-activate.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled
                      className="flex-shrink-0 px-4 py-2 border border-red-200 dark:border-red-700/60 text-red-400 text-xs font-semibold rounded-xl cursor-not-allowed"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      )}
    </div>
  );
}
