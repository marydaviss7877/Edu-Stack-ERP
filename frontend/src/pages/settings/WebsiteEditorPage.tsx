import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import type { Organization, ApiResponse, SiteConfig, SiteNewsPost, PublicSiteData } from '../../types';
import SchoolSitePage from '../public/SchoolSitePage';
import { cn } from '../../lib/utils';
import { schoolUrl } from '../../utils/tenant';

// ── Types + constants ────────────────────────────────────────

type Device     = 'desktop' | 'tablet' | 'mobile';
type TemplateId = 'classic' | 'modern' | 'minimal';
type SectionId  = 'hero' | 'about' | 'stats' | 'admissions' | 'contact' | 'news' | 'policies';

const DEVICE_WIDTHS: Record<Device, number> = { desktop: 1280, tablet: 768, mobile: 390 };

const TEMPLATE_NAMES: Record<TemplateId, string> = {
  classic: 'Classic',
  modern:  'Modern',
  minimal: 'Minimal',
};

const SECTIONS: { id: SectionId; label: string; desc: string }[] = [
  { id: 'hero',       label: 'Hero Banner',    desc: 'Headline, tagline, call-to-action' },
  { id: 'about',      label: 'About School',   desc: "History, mission, principal's message" },
  { id: 'stats',      label: 'Key Stats',      desc: 'Students, teachers, branches, years' },
  { id: 'admissions', label: 'Admissions',     desc: 'Criteria, how to apply' },
  { id: 'contact',    label: 'Contact',        desc: 'Address, phone, email' },
  { id: 'news',       label: 'News & Updates', desc: 'Announcements and posts' },
  { id: 'policies',   label: 'Policies',       desc: 'Privacy & code of conduct' },
];

const DEFAULT_SITE: SiteConfig = {
  published:  false,
  templateId: 'modern',
  hero:        { enabled: true,  headline: '', subtext: '', ctaText: 'Apply Now' },
  about:       { enabled: true,  body: '', founded: '', principalName: '', principalQuote: '', vision: '', mission: '' },
  stats:       { enabled: false, items: [{ label: 'Students', value: '500+' }, { label: 'Teachers', value: '30+' }, { label: 'Branches', value: '2' }, { label: 'Years', value: '20+' }] },
  admissions:  { enabled: true,  body: '', criteria: '', process: '' },
  contact:     { enabled: true,  address: '', phone: '', email: '', mapUrl: '' },
  news:        { enabled: false, posts: [] },
  policies:    { enabled: false, privacy: '', conduct: '' },
};

// ── Shared editor UI ─────────────────────────────────────────

const inputCls = [
  'w-full rounded-xl border border-gray-200 dark:border-slate-600',
  'bg-white dark:bg-slate-700/50 dark:text-slate-100',
  'px-3.5 py-2.5 text-sm',
  'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
  'transition-all duration-150 placeholder:text-gray-300 dark:placeholder:text-slate-600',
].join(' ');

function FL({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1.5">
        {children}
      </span>
      {hint && <span className="block text-xs text-gray-400 dark:text-slate-500 mb-1.5 -mt-1">{hint}</span>}
    </label>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={cn(
        'w-9 h-5 rounded-full transition-colors duration-200 relative flex-shrink-0 cursor-pointer',
        checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-600',
      )}
    >
      <span className={cn(
        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
        checked ? 'translate-x-4' : 'translate-x-0.5',
      )} />
    </div>
  );
}

// ── Section editors ──────────────────────────────────────────

function HeroEditor({ site, set }: { site: SiteConfig; set: (s: SiteConfig) => void }) {
  const h = site.hero;
  const up = (patch: Partial<typeof h>) => set({ ...site, hero: { ...h, ...patch } });
  return (
    <div className="space-y-4">
      <div><FL>Main Headline</FL>
        <input className={inputCls} value={h.headline} onChange={e => up({ headline: e.target.value })} placeholder="Shaping Tomorrow's Leaders" />
      </div>
      <div><FL hint="Shown below the headline">Subtext / Welcome Message</FL>
        <textarea rows={3} className={cn(inputCls, 'resize-none')} value={h.subtext} onChange={e => up({ subtext: e.target.value })} placeholder="We are committed to providing quality education..." />
      </div>
      <div><FL hint="Text on the primary button">CTA Button Label</FL>
        <input className={inputCls} value={h.ctaText} onChange={e => up({ ctaText: e.target.value })} placeholder="Apply Now" />
      </div>
    </div>
  );
}

function AboutEditor({ site, set }: { site: SiteConfig; set: (s: SiteConfig) => void }) {
  const a = site.about;
  const up = (patch: Partial<typeof a>) => set({ ...site, about: { ...a, ...patch } });
  return (
    <div className="space-y-4">
      <div><FL>About Text</FL>
        <textarea rows={5} className={cn(inputCls, 'resize-none')} value={a.body} onChange={e => up({ body: e.target.value })} placeholder="Tell visitors about your school..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><FL>Year Founded</FL>
          <input className={inputCls} value={a.founded} onChange={e => up({ founded: e.target.value })} placeholder="1985" />
        </div>
        <div><FL>Principal Name</FL>
          <input className={inputCls} value={a.principalName} onChange={e => up({ principalName: e.target.value })} placeholder="Mr. Ahmed Khan" />
        </div>
      </div>
      <div><FL>Principal's Quote</FL>
        <textarea rows={3} className={cn(inputCls, 'resize-none')} value={a.principalQuote} onChange={e => up({ principalQuote: e.target.value })} placeholder="Education is the most powerful weapon..." />
      </div>
      <div><FL>Mission</FL>
        <textarea rows={2} className={cn(inputCls, 'resize-none')} value={a.mission} onChange={e => up({ mission: e.target.value })} placeholder="To nurture every student..." />
      </div>
      <div><FL>Vision</FL>
        <textarea rows={2} className={cn(inputCls, 'resize-none')} value={a.vision} onChange={e => up({ vision: e.target.value })} placeholder="A generation of confident, ethical leaders..." />
      </div>
    </div>
  );
}

function StatsEditor({ site, set }: { site: SiteConfig; set: (s: SiteConfig) => void }) {
  const s = site.stats;
  const upItem = (i: number, patch: Partial<{ label: string; value: string }>) => {
    const items = s.items.map((it, idx) => idx === i ? { ...it, ...patch } : it);
    set({ ...site, stats: { ...s, items } });
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 dark:text-slate-500">Up to 4 stats shown as large numbers across the page.</p>
      {s.items.map((item, i) => (
        <div key={i} className="grid grid-cols-2 gap-3">
          <div><FL>Value</FL><input className={inputCls} value={item.value} onChange={e => upItem(i, { value: e.target.value })} placeholder="500+" /></div>
          <div><FL>Label</FL><input className={inputCls} value={item.label} onChange={e => upItem(i, { label: e.target.value })} placeholder="Students" /></div>
        </div>
      ))}
    </div>
  );
}

function AdmissionsEditor({ site, set }: { site: SiteConfig; set: (s: SiteConfig) => void }) {
  const a = site.admissions;
  const up = (patch: Partial<typeof a>) => set({ ...site, admissions: { ...a, ...patch } });
  return (
    <div className="space-y-4">
      <div><FL hint="Intro paragraph">Description</FL>
        <textarea rows={3} className={cn(inputCls, 'resize-none')} value={a.body} onChange={e => up({ body: e.target.value })} placeholder="We welcome applications for all grades..." />
      </div>
      <div><FL hint="Age, grade, documents required">Eligibility Criteria</FL>
        <textarea rows={3} className={cn(inputCls, 'resize-none')} value={a.criteria} onChange={e => up({ criteria: e.target.value })} placeholder="Students aged 4–16 may apply..." />
      </div>
      <div><FL hint="Step-by-step">How to Apply</FL>
        <textarea rows={4} className={cn(inputCls, 'resize-none')} value={a.process} onChange={e => up({ process: e.target.value })} placeholder="1. Visit the school office&#10;2. Fill in the application form..." />
      </div>
    </div>
  );
}

function ContactEditor({ site, set }: { site: SiteConfig; set: (s: SiteConfig) => void }) {
  const c = site.contact;
  const up = (patch: Partial<typeof c>) => set({ ...site, contact: { ...c, ...patch } });
  return (
    <div className="space-y-4">
      <div><FL>Address</FL>
        <input className={inputCls} value={c.address} onChange={e => up({ address: e.target.value })} placeholder="123 Model Town, Lahore, Punjab" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><FL>Phone</FL>
          <input type="tel" className={inputCls} value={c.phone} onChange={e => up({ phone: e.target.value })} placeholder="+92 300 0000000" />
        </div>
        <div><FL>Email</FL>
          <input type="email" className={inputCls} value={c.email} onChange={e => up({ email: e.target.value })} placeholder="info@school.pk" />
        </div>
      </div>
    </div>
  );
}

function NewsEditor({ site, set }: { site: SiteConfig; set: (s: SiteConfig) => void }) {
  const n = site.news;
  const addPost = () => {
    const p: SiteNewsPost = {
      id:   Date.now().toString(),
      title: '',
      body:  '',
      date:  new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }),
    };
    set({ ...site, news: { ...n, posts: [p, ...n.posts] } });
  };
  const removePost = (id: string) =>
    set({ ...site, news: { ...n, posts: n.posts.filter(p => p.id !== id) } });
  const upPost = (id: string, patch: Partial<SiteNewsPost>) =>
    set({ ...site, news: { ...n, posts: n.posts.map(p => p.id === id ? { ...p, ...patch } : p) } });

  return (
    <div className="space-y-5">
      <button type="button" onClick={addPost}
        className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-xl text-sm font-medium text-gray-500 dark:text-slate-400 hover:border-blue-300 hover:text-blue-600 dark:hover:border-blue-600 dark:hover:text-blue-400 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
        Add Post
      </button>
      {n.posts.map(post => (
        <div key={post.id} className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <FL>Post Title</FL>
            <button type="button" onClick={() => removePost(post.id)} className="text-red-400 hover:text-red-600 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
          <input className={inputCls} value={post.title} onChange={e => upPost(post.id, { title: e.target.value })} placeholder="Annual Results 2025" />
          <div><FL>Date</FL><input className={inputCls} value={post.date} onChange={e => upPost(post.id, { date: e.target.value })} placeholder="15 Jun 2025" /></div>
          <div><FL>Content</FL><textarea rows={3} className={cn(inputCls, 'resize-none')} value={post.body} onChange={e => upPost(post.id, { body: e.target.value })} placeholder="We are pleased to announce..." /></div>
        </div>
      ))}
      {n.posts.length === 0 && (
        <p className="text-center text-xs text-gray-400 dark:text-slate-500 py-4">No posts yet.</p>
      )}
    </div>
  );
}

function PoliciesEditor({ site, set }: { site: SiteConfig; set: (s: SiteConfig) => void }) {
  const p = site.policies;
  const up = (patch: Partial<typeof p>) => set({ ...site, policies: { ...p, ...patch } });
  return (
    <div className="space-y-4">
      <div><FL>Privacy Policy</FL>
        <textarea rows={5} className={cn(inputCls, 'resize-none')} value={p.privacy} onChange={e => up({ privacy: e.target.value })} placeholder="We collect personal information only for educational purposes..." />
      </div>
      <div><FL>Code of Conduct</FL>
        <textarea rows={5} className={cn(inputCls, 'resize-none')} value={p.conduct} onChange={e => up({ conduct: e.target.value })} placeholder="All students are expected to maintain respect and discipline..." />
      </div>
    </div>
  );
}

// ── Page loader ──────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────

export default function WebsiteEditorPage() {
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const user      = useAuthStore(s => s.user);

  // ── Org data ──
  const { data: org, isLoading } = useQuery({
    queryKey: ['org', user?.orgId],
    queryFn: () =>
      api.get<ApiResponse<Organization>>(`/organizations/${user!.orgId}`).then(r => r.data.data!),
    enabled: !!user?.orgId,
  });

  // ── Site state ──
  const [site,      setSite]      = useState<SiteConfig>(DEFAULT_SITE);
  const [savedSite, setSavedSite] = useState<SiteConfig>(DEFAULT_SITE);

  useEffect(() => {
    if (org?.site) {
      setSite(org.site);
      setSavedSite(org.site);
    }
  }, [org]);

  // ── Editor state ──
  const [device,           setDevice]          = useState<Device>('desktop');
  const [panelLevel,       setPanelLevel]      = useState<0 | 1>(0);
  const [activeSection,    setActiveSection]   = useState<SectionId>('hero');
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  // ── Preview scaling ──
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  useEffect(() => {
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const deviceWidth = DEVICE_WIDTHS[device];
  const scale       = Math.min(1, (containerWidth - 32) / deviceWidth);

  // ── Dirty tracking ──
  const isDirty = JSON.stringify(site) !== JSON.stringify(savedSite);

  // ── Preview data ──
  const previewSite: PublicSiteData = {
    ...site,
    orgName:        org?.name          ?? 'School Name',
    slug:           org?.slug          ?? '',
    logoUrl:        org?.logoUrl       ?? null,
    tagline:        org?.tagline       ?? null,
    primaryColor:   org?.primaryColor  ?? null,
    welcomeMessage: org?.welcomeMessage ?? null,
  };

  // ── Save mutation ──
  const saveMutation = useMutation({
    mutationFn: (payload: SiteConfig) =>
      api.put(`/organizations/${user!.orgId}/site`, payload),
    onSuccess: (_, payload) => {
      qc.invalidateQueries({ queryKey: ['org'] });
      setSavedSite({ ...payload });
    },
  });

  // ── Publish toggle ──
  const handlePublish = () => {
    const updated = { ...site, published: !site.published };
    setSite(updated);
    saveMutation.mutate(updated);
  };

  // ── Section toggle ──
  const toggleSection = useCallback((id: SectionId, enabled: boolean) => {
    setSite(s => ({ ...s, [id]: { ...(s[id] as object), enabled } }));
  }, []);

  // ── Click-to-edit ──
  const previewRef = useRef<HTMLDivElement>(null);

  const handlePreviewClick = useCallback((e: React.MouseEvent) => {
    let target = e.target as HTMLElement | null;
    while (target) {
      const section = target.getAttribute?.('data-section') as SectionId | null;
      if (section && SECTIONS.some(s => s.id === section)) {
        e.preventDefault();
        e.stopPropagation();
        setActiveSection(section);
        setPanelLevel(1);
        return;
      }
      if (target === previewRef.current) break;
      target = target.parentElement;
    }
  }, []);

  // Highlight active section in preview
  useEffect(() => {
    if (!previewRef.current) return;
    previewRef.current.querySelectorAll('[data-section]').forEach(el =>
      el.classList.remove('section-active'),
    );
    if (panelLevel === 1) {
      previewRef.current.querySelector(`[data-section="${activeSection}"]`)
        ?.classList.add('section-active');
    }
  }, [activeSection, panelLevel]);

  // Close template menu on outside click
  useEffect(() => {
    if (!showTemplateMenu) return;
    const handler = () => setShowTemplateMenu(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showTemplateMenu]);

  if (!user?.orgId) return null;
  if (isLoading)     return <PageLoader />;

  const activeTemplate = (site.templateId ?? 'modern') as TemplateId;
  const activeSectionInfo = SECTIONS.find(s => s.id === activeSection)!;

  // ── Render ──
  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-950 overflow-hidden">

      {/* Injected preview styles */}
      <style>{`
        .site-preview-editor [data-section] { cursor: pointer !important; }
        .site-preview-editor [data-section]:hover {
          outline: 2px solid #3b82f6 !important;
          outline-offset: -2px !important;
        }
        .site-preview-editor [data-section].section-active {
          outline: 2px dashed #3b82f6 !important;
          outline-offset: -2px !important;
        }
      `}</style>

      {/* ── TOP BAR ── */}
      <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950">

        {/* Left: back + template picker */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate('/group/settings?tab=website')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="h-5 w-px bg-gray-200 dark:bg-slate-700 flex-shrink-0" />

          {/* Template dropdown */}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowTemplateMenu(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              {TEMPLATE_NAMES[activeTemplate]}
              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showTemplateMenu && (
              <div className="absolute top-full left-0 mt-1.5 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-lg py-1 z-50 min-w-[130px]">
                {(['classic', 'modern', 'minimal'] as TemplateId[]).map(tid => (
                  <button
                    key={tid}
                    onClick={() => { setSite(s => ({ ...s, templateId: tid })); setShowTemplateMenu(false); }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors',
                      activeTemplate === tid ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-slate-200',
                    )}
                  >
                    {activeTemplate === tid && (
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {activeTemplate !== tid && <span className="w-3.5" />}
                    {TEMPLATE_NAMES[tid]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: device toggles */}
        <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
          {([
            { id: 'desktop' as Device, label: 'Desktop',
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
            { id: 'tablet' as Device, label: 'Tablet',
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /> },
            { id: 'mobile' as Device, label: 'Mobile',
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /> },
          ]).map(d => (
            <button
              key={d.id}
              title={d.label}
              onClick={() => setDevice(d.id)}
              className={cn(
                'p-2 rounded-md transition-all',
                device === d.id
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300',
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                {d.icon}
              </svg>
            </button>
          ))}
        </div>

        {/* Right: unsaved + save + publish */}
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="hidden sm:flex items-center gap-1.5 text-amber-500 dark:text-amber-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Unsaved
            </span>
          )}

          {saveMutation.isError && (
            <span className="hidden sm:block text-xs text-red-500">
              Save failed
            </span>
          )}

          <button
            onClick={() => saveMutation.mutate(site)}
            disabled={saveMutation.isPending}
            className="px-3.5 py-2 text-sm font-semibold rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save Draft'}
          </button>

          <button
            onClick={handlePublish}
            disabled={saveMutation.isPending}
            className={cn(
              'px-3.5 py-2 text-sm font-semibold rounded-xl disabled:opacity-50 transition-all',
              site.published
                ? 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-[0_2px_8px_-2px_rgba(59,130,246,0.5)]',
            )}
          >
            {site.published ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT PANEL ── */}
        <aside className="w-72 flex-shrink-0 border-r border-gray-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-950 overflow-hidden">

          {/* Two-level slide container */}
          <div className="relative flex-1 overflow-hidden">

            {/* Level 0 — section list */}
            <div className={cn(
              'absolute inset-0 flex flex-col transition-transform duration-200 ease-in-out',
              panelLevel === 0 ? 'translate-x-0' : '-translate-x-full',
            )}>
              <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">Sections</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Click a section to edit it</p>
              </div>

              <div className="flex-1 overflow-y-auto">
                {SECTIONS.map(s => {
                  const sec = site[s.id] as { enabled: boolean };
                  return (
                    <div
                      key={s.id}
                      onClick={() => { setActiveSection(s.id); setPanelLevel(1); }}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3.5 cursor-pointer border-b border-gray-50 dark:border-slate-800/70 last:border-0 transition-colors group',
                        activeSection === s.id && panelLevel === 1
                          ? 'bg-blue-50 dark:bg-blue-900/10'
                          : 'hover:bg-gray-50 dark:hover:bg-slate-800/50',
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium truncate',
                          activeSection === s.id && panelLevel === 1
                            ? 'text-blue-700 dark:text-blue-300'
                            : 'text-gray-700 dark:text-slate-200',
                        )}>
                          {s.label}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">{s.desc}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div onClick={e => { e.stopPropagation(); toggleSection(s.id, !sec.enabled); }}>
                          <Toggle checked={sec.enabled} onChange={v => toggleSection(s.id, v)} />
                        </div>
                        <svg className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-gray-400 dark:group-hover:text-slate-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Level 1 — section editor */}
            <div className={cn(
              'absolute inset-0 flex flex-col transition-transform duration-200 ease-in-out',
              panelLevel === 1 ? 'translate-x-0' : 'translate-x-full',
            )}>
              {/* Panel header */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex-shrink-0 flex items-center gap-2">
                <button
                  onClick={() => setPanelLevel(0)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-500 dark:text-slate-400 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">
                    {activeSectionInfo?.label}
                  </p>
                </div>
                <div
                  onClick={() => toggleSection(activeSection, !(site[activeSection] as { enabled: boolean }).enabled)}
                  className="flex-shrink-0"
                >
                  <Toggle
                    checked={(site[activeSection] as { enabled: boolean }).enabled}
                    onChange={v => toggleSection(activeSection, v)}
                  />
                </div>
              </div>

              {/* Editor content */}
              <div className={cn(
                'flex-1 overflow-y-auto p-4',
                !(site[activeSection] as { enabled: boolean }).enabled && 'opacity-40 pointer-events-none',
              )}>
                {activeSection === 'hero'       && <HeroEditor       site={site} set={setSite} />}
                {activeSection === 'about'      && <AboutEditor      site={site} set={setSite} />}
                {activeSection === 'stats'      && <StatsEditor      site={site} set={setSite} />}
                {activeSection === 'admissions' && <AdmissionsEditor site={site} set={setSite} />}
                {activeSection === 'contact'    && <ContactEditor    site={site} set={setSite} />}
                {activeSection === 'news'       && <NewsEditor       site={site} set={setSite} />}
                {activeSection === 'policies'   && <PoliciesEditor   site={site} set={setSite} />}
              </div>
            </div>
          </div>

          {/* Panel footer — site URL when published */}
          {site.published && org?.slug && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 flex-shrink-0">
              <a
                href={schoolUrl(org.slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline truncate"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                {schoolUrl(org.slug).replace('https://', '')}
                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </aside>

        {/* ── PREVIEW AREA ── */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-gray-100 dark:bg-slate-900"
        >
          {/* Preview label */}
          <div className="sticky top-0 z-10 flex items-center justify-center gap-2 py-1.5 bg-gray-100/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-gray-200/60 dark:border-slate-800/60">
            <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
              {device === 'desktop' ? '1280px' : device === 'tablet' ? '768px' : '390px'}
            </span>
            <span className="text-gray-300 dark:text-slate-700 text-[10px]">·</span>
            <span className={cn(
              'text-[10px] font-semibold uppercase tracking-widest',
              site.published ? 'text-emerald-500' : 'text-gray-400 dark:text-slate-500',
            )}>
              {site.published ? 'Live' : 'Draft'}
            </span>
          </div>

          {/* Scaled preview */}
          <div className="flex justify-center py-4 px-4">
            <div
              ref={previewRef}
              className="site-preview-editor origin-top"
              style={({ width: `${deviceWidth}px`, zoom: scale }) as React.CSSProperties}
              onClickCapture={handlePreviewClick}
            >
              <SchoolSitePage site={previewSite} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
