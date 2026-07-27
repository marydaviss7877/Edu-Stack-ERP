import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { SiteConfig } from '../../types';
import { cn } from '../../lib/utils';
import { schoolUrl } from '../../utils/tenant';

type TemplateId = 'classic' | 'modern' | 'minimal';

const DEFAULT_SITE: SiteConfig = {
  published:   false,
  hero:        { enabled: true,  headline: '', subtext: '', ctaText: 'Apply Now' },
  about:       { enabled: true,  body: '', founded: '', principalName: '', principalQuote: '', vision: '', mission: '' },
  stats:       { enabled: false, items: [{ label: 'Students', value: '500+' }, { label: 'Teachers', value: '30+' }, { label: 'Branches', value: '2' }, { label: 'Years', value: '20+' }] },
  admissions:  { enabled: true,  body: '', criteria: '', process: '' },
  contact:     { enabled: true,  address: '', phone: '', email: '', mapUrl: '' },
  news:        { enabled: false, posts: [] },
  policies:    { enabled: false, privacy: '', conduct: '' },
};

// ── Template thumbnails (SVG mockups) ──────────────────────

function ClassicThumb() {
  return (
    <svg viewBox="0 0 280 175" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="280" height="26" fill="#0f172a"/>
      <rect x="10" y="9" width="36" height="8" rx="2" fill="#f59e0b" fillOpacity="0.9"/>
      <rect x="176" y="11" width="22" height="4" rx="1" fill="white" fillOpacity="0.4"/>
      <rect x="203" y="11" width="22" height="4" rx="1" fill="white" fillOpacity="0.4"/>
      <rect x="230" y="11" width="22" height="4" rx="1" fill="white" fillOpacity="0.4"/>
      <rect y="26" width="280" height="70" fill="#1e293b"/>
      <circle cx="140" cy="42" r="8" fill="none" stroke="#f59e0b" strokeWidth="1.5"/>
      <rect x="136" y="39" width="8" height="6" rx="1" fill="#f59e0b"/>
      <rect x="70" y="54" width="140" height="8" rx="2" fill="white" fillOpacity="0.9"/>
      <rect x="95" y="66" width="90" height="5" rx="1" fill="white" fillOpacity="0.5"/>
      <rect x="112" y="75" width="56" height="13" rx="2" fill="#f59e0b"/>
      <rect y="26" width="280" height="2" fill="#f59e0b"/>
      <rect y="94" width="280" height="2" fill="#f59e0b"/>
      <rect y="96" width="280" height="22" fill="#0f172a"/>
      <rect x="20" y="101" width="28" height="5" rx="1" fill="white" fillOpacity="0.8"/>
      <rect x="22" y="110" width="24" height="3" rx="1" fill="white" fillOpacity="0.35"/>
      <rect x="86" y="101" width="28" height="5" rx="1" fill="white" fillOpacity="0.8"/>
      <rect x="88" y="110" width="24" height="3" rx="1" fill="white" fillOpacity="0.35"/>
      <rect x="152" y="101" width="28" height="5" rx="1" fill="white" fillOpacity="0.8"/>
      <rect x="154" y="110" width="24" height="3" rx="1" fill="white" fillOpacity="0.35"/>
      <rect x="218" y="101" width="28" height="5" rx="1" fill="white" fillOpacity="0.8"/>
      <rect x="220" y="110" width="24" height="3" rx="1" fill="white" fillOpacity="0.35"/>
      <rect y="118" width="280" height="49" fill="white"/>
      <rect x="12" y="126" width="120" height="6" rx="1" fill="#1e293b"/>
      <rect x="12" y="136" width="108" height="3" rx="1" fill="#94a3b8"/>
      <rect x="12" y="142" width="95" height="3" rx="1" fill="#94a3b8"/>
      <rect x="12" y="148" width="102" height="3" rx="1" fill="#94a3b8"/>
      <rect x="12" y="154" width="90" height="3" rx="1" fill="#94a3b8"/>
      <rect x="148" y="120" width="120" height="46" rx="4" fill="#0f172a"/>
      <rect x="155" y="128" width="30" height="3" rx="1" fill="#f59e0b" fillOpacity="0.7"/>
      <rect x="155" y="135" width="96" height="3" rx="1" fill="white" fillOpacity="0.5"/>
      <rect x="155" y="141" width="86" height="3" rx="1" fill="white" fillOpacity="0.4"/>
      <rect x="155" y="147" width="92" height="3" rx="1" fill="white" fillOpacity="0.4"/>
      <circle cx="162" cy="158" r="5" fill="#f59e0b"/>
      <rect x="172" y="155" width="50" height="6" rx="1" fill="white" fillOpacity="0.5"/>
      <rect y="167" width="280" height="8" fill="#0f172a"/>
    </svg>
  );
}

function ModernThumb() {
  return (
    <svg viewBox="0 0 280 175" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="280" height="24" fill="white"/>
      <rect y="23" width="280" height="1" fill="#e5e7eb"/>
      <rect x="10" y="8" width="28" height="8" rx="4" fill="#2563eb"/>
      <rect x="100" y="10" width="18" height="4" rx="1" fill="#9ca3af"/>
      <rect x="124" y="10" width="18" height="4" rx="1" fill="#9ca3af"/>
      <rect x="148" y="10" width="18" height="4" rx="1" fill="#9ca3af"/>
      <rect x="237" y="7" width="34" height="10" rx="5" fill="#2563eb"/>
      <rect y="24" width="280" height="80" fill="#eff6ff"/>
      <ellipse cx="210" cy="64" rx="55" ry="40" fill="#bfdbfe" fillOpacity="0.7"/>
      <rect x="163" y="44" width="80" height="5" rx="1" fill="#93c5fd" fillOpacity="0.8"/>
      <rect x="163" y="53" width="64" height="4" rx="1" fill="#93c5fd" fillOpacity="0.6"/>
      <rect x="163" y="61" width="70" height="4" rx="1" fill="#93c5fd" fillOpacity="0.6"/>
      <rect x="10" y="35" width="12" height="5" rx="2.5" fill="#2563eb" fillOpacity="0.15"/>
      <rect x="10" y="44" width="125" height="9" rx="2" fill="#111827"/>
      <rect x="10" y="57" width="105" height="4" rx="1" fill="#6b7280"/>
      <rect x="10" y="65" width="90" height="4" rx="1" fill="#6b7280"/>
      <rect x="10" y="77" width="38" height="12" rx="3" fill="#2563eb"/>
      <rect x="54" y="77" width="32" height="12" rx="3" fill="none" stroke="#2563eb" strokeWidth="1.5"/>
      <rect y="104" width="280" height="28" fill="white"/>
      <rect x="8" y="110" width="58" height="15" rx="4" fill="#eff6ff"/>
      <rect x="74" y="110" width="58" height="15" rx="4" fill="#eff6ff"/>
      <rect x="140" y="110" width="58" height="15" rx="4" fill="#eff6ff"/>
      <rect x="206" y="110" width="66" height="15" rx="4" fill="#eff6ff"/>
      <rect x="16" y="114" width="18" height="4" rx="1" fill="#2563eb"/>
      <rect x="16" y="120" width="26" height="3" rx="1" fill="#9ca3af"/>
      <rect x="82" y="114" width="18" height="4" rx="1" fill="#2563eb"/>
      <rect x="82" y="120" width="26" height="3" rx="1" fill="#9ca3af"/>
      <rect x="148" y="114" width="18" height="4" rx="1" fill="#2563eb"/>
      <rect x="148" y="120" width="26" height="3" rx="1" fill="#9ca3af"/>
      <rect x="214" y="114" width="18" height="4" rx="1" fill="#2563eb"/>
      <rect x="214" y="120" width="26" height="3" rx="1" fill="#9ca3af"/>
      <rect y="132" width="280" height="43" fill="#f9fafb"/>
      <rect x="96" y="138" width="88" height="6" rx="1" fill="#111827"/>
      <rect x="30" y="148" width="220" height="3" rx="1" fill="#d1d5db"/>
      <rect x="50" y="154" width="180" height="3" rx="1" fill="#d1d5db"/>
      <rect x="60" y="160" width="160" height="3" rx="1" fill="#d1d5db"/>
      <rect y="167" width="280" height="8" fill="#1f2937"/>
    </svg>
  );
}

function MinimalThumb() {
  return (
    <svg viewBox="0 0 280 175" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="280" height="22" fill="white"/>
      <rect y="21" width="280" height="1" fill="#f3f4f6"/>
      <rect x="12" y="7" width="22" height="8" rx="1" fill="#111827"/>
      <rect x="12" y="16" width="42" height="2" rx="1" fill="#9ca3af"/>
      <rect x="176" y="9" width="18" height="4" rx="1" fill="#9ca3af"/>
      <rect x="200" y="9" width="18" height="4" rx="1" fill="#9ca3af"/>
      <rect x="224" y="9" width="18" height="4" rx="1" fill="#9ca3af"/>
      <rect x="255" y="8" width="13" height="6" rx="1" fill="none" stroke="#111827" strokeWidth="0.8"/>
      <rect y="22" width="280" height="88" fill="white"/>
      <rect x="12" y="32" width="6" height="6" rx="1" fill="#6366f1"/>
      <rect x="22" y="32" width="50" height="6" rx="1" fill="#374151"/>
      <rect x="12" y="44" width="230" height="14" rx="2" fill="#111827"/>
      <rect x="12" y="62" width="180" height="14" rx="2" fill="#111827"/>
      <rect x="12" y="82" width="200" height="4" rx="1" fill="#9ca3af"/>
      <rect x="12" y="90" width="170" height="4" rx="1" fill="#9ca3af"/>
      <rect x="12" y="100" width="46" height="12" rx="2" fill="#111827"/>
      <rect x="64" y="100" width="40" height="12" rx="2" fill="none" stroke="#d1d5db" strokeWidth="1"/>
      <rect y="110" width="280" height="1" fill="#f3f4f6"/>
      <rect y="111" width="280" height="20" fill="white"/>
      <rect x="12" y="117" width="22" height="6" rx="1" fill="#111827"/>
      <rect x="38" y="119" width="28" height="3" rx="1" fill="#9ca3af"/>
      <rect x="88" y="117" width="22" height="6" rx="1" fill="#111827"/>
      <rect x="114" y="119" width="28" height="3" rx="1" fill="#9ca3af"/>
      <rect x="164" y="117" width="22" height="6" rx="1" fill="#111827"/>
      <rect x="190" y="119" width="28" height="3" rx="1" fill="#9ca3af"/>
      <rect y="131" width="280" height="44" fill="white"/>
      <rect x="12" y="138" width="6" height="3" rx="0.5" fill="#6366f1"/>
      <rect x="22" y="136" width="80" height="6" rx="1" fill="#111827"/>
      <rect x="12" y="147" width="256" height="3" rx="1" fill="#d1d5db"/>
      <rect x="12" y="153" width="230" height="3" rx="1" fill="#d1d5db"/>
      <rect x="12" y="159" width="210" height="3" rx="1" fill="#d1d5db"/>
      <rect x="12" y="165" width="180" height="3" rx="1" fill="#d1d5db"/>
      <rect y="168" width="280" height="1" fill="#e5e7eb"/>
      <rect y="169" width="280" height="6" fill="white"/>
      <rect x="12" y="172" width="55" height="2" rx="1" fill="#9ca3af"/>
      <rect x="200" y="172" width="68" height="2" rx="1" fill="#9ca3af"/>
    </svg>
  );
}

// ── Template definitions ────────────────────────────────────

interface TemplateInfo {
  id: TemplateId;
  name: string;
  tagline: string;
  description: string;
  features: string[];
  Thumb: React.FC;
}

const TEMPLATES: TemplateInfo[] = [
  {
    id: 'classic',
    name: 'Classic',
    tagline: 'Timeless · Formal · Prestigious',
    description: 'A dark, authoritative design inspired by established institutions. Navy header, accent lines, formal two-column body.',
    features: ['Dark navy header & footer', 'Accent-line ornaments', "Principal's dark quote card", 'Stats strip on dark band'],
    Thumb: ClassicThumb,
  },
  {
    id: 'modern',
    name: 'Modern',
    tagline: 'Clean · Bold · Contemporary',
    description: 'A fresh split-hero design with card-based sections. Makes strong use of your brand color throughout.',
    features: ['Split hero with gradient blob', 'Stat cards with icon backgrounds', 'Card-based section layout', 'Brand-colored accents everywhere'],
    Thumb: ModernThumb,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    tagline: 'Simple · Elegant · Refined',
    description: 'Maximum whitespace and typography-first design. Understated accents let the school content speak.',
    features: ['Large bold display typography', 'Maximum breathing room', 'Blockquote principal message', 'Subtle color accents only'],
    Thumb: MinimalThumb,
  },
];

// ── Template gallery ────────────────────────────────────────

function TemplateGallery({
  currentTemplateId,
  onSelect,
}: {
  currentTemplateId?: TemplateId;
  onSelect: (id: TemplateId) => void;
}) {
  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Choose Your Website Template</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1.5">
          Select the design that best fits your school. You can change it at any time.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {TEMPLATES.map(t => {
          const isActive = currentTemplateId === t.id;
          return (
            <div
              key={t.id}
              className={cn(
                'bg-white dark:bg-slate-800 rounded-2xl border overflow-hidden transition-all',
                isActive
                  ? 'border-blue-500 dark:border-blue-400 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]'
                  : 'border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg',
              )}
            >
              <div className="aspect-[16/10] bg-gray-50 dark:bg-slate-900 overflow-hidden">
                <t.Thumb />
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-gray-900 dark:text-slate-100 text-base">{t.name}</h3>
                  {isActive && (
                    <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 mb-2 tracking-wide">{t.tagline}</p>
                <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed mb-4">{t.description}</p>

                <ul className="space-y-1.5 mb-5">
                  {t.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400">
                      <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onSelect(t.id)}
                  className={cn(
                    'w-full py-2.5 rounded-xl text-sm font-semibold transition-all',
                    isActive
                      ? 'bg-blue-600 text-white cursor-default'
                      : 'bg-gray-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-gray-700 dark:hover:bg-white',
                  )}
                >
                  {isActive ? '✓ Currently Active' : `Use ${t.name} Template`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────

interface Props {
  orgId: string;
  initialSite?: SiteConfig;
  orgSlug: string;
}

export default function WebsiteBuilderTab({ orgId, initialSite, orgSlug }: Props) {
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const [site, setSite] = useState<SiteConfig>(initialSite ?? DEFAULT_SITE);
  const [view, setView] = useState<'gallery' | 'launcher'>(() =>
    initialSite?.templateId ? 'launcher' : 'gallery',
  );

  const saveMutation = useMutation({
    mutationFn: (payload: SiteConfig) => api.put(`/organizations/${orgId}/site`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org'] }),
  });

  const handleSelectTemplate = (templateId: TemplateId) => {
    const updated = { ...site, templateId };
    setSite(updated);
    setView('launcher');
    saveMutation.mutate(updated);
  };

  if (view === 'gallery') {
    return <TemplateGallery currentTemplateId={site.templateId} onSelect={handleSelectTemplate} />;
  }

  const activeTemplate = TEMPLATES.find(t => t.id === site.templateId) ?? TEMPLATES[1];

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center flex-wrap gap-3 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-slate-700 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] dark:shadow-none px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wide">
            {activeTemplate.name}
          </span>
          <button
            onClick={() => setView('gallery')}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
            Change
          </button>
          <div className="h-4 w-px bg-gray-200 dark:bg-slate-600" />
          <span className={cn(
            'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full',
            site.published
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400',
          )}>
            <span className={cn('w-1.5 h-1.5 rounded-full', site.published ? 'bg-emerald-500' : 'bg-gray-400')} />
            {site.published ? 'Published' : 'Draft'}
          </span>
          {site.published && (
            <a
              href={schoolUrl(orgSlug)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View Site
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* Editor CTA */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-slate-700 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] dark:shadow-none px-8 py-16 flex flex-col items-center text-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <div>
          <h3 className="font-bold text-gray-900 dark:text-slate-100 text-lg">Website Editor</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1.5 max-w-xs leading-relaxed">
            Edit content, toggle sections, and see your changes live — just like WordPress.
          </p>
        </div>

        <button
          onClick={() => navigate('/group/website-editor')}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-[0_2px_12px_-2px_rgba(59,130,246,0.5)] hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Open Website Editor
        </button>
      </div>
    </div>
  );
}
