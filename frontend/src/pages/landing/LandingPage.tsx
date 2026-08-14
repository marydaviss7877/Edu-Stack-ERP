import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

// Shared helpers

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'w-4 h-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function StarRating() {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

const DOT_GRID = { backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.07) 1px, transparent 0)', backgroundSize: '24px 24px' };
const DOT_GRID_DARK = { backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)', backgroundSize: '36px 36px' };
const DIAG_LINES = { backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.03) 0, rgba(0,0,0,0.03) 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' };

// Data

const FAQS = [
  {
    q: 'How long is the free trial and what does it include?',
    a: 'You get 7 full days of complete access - every module, every feature, every role. No restrictions. After the trial, choose the Pro plan to continue.',
  },
  {
    q: 'Can my teachers and accountant use it without training?',
    a: 'Zero training needed. Teachers mark attendance in 2 taps. Accountants generate challans in 1 click. 90% of staff are confident within their first day. Free onboarding call included with every Pro account.',
  },
  {
    q: 'Which payment methods can parents use?',
    a: 'JazzCash and EasyPaisa are fully integrated - parents pay from their mobile wallet in under a minute. Manual cash and bank payment recording with receipt numbers is also available.',
  },
  {
    q: 'We have 3 campuses. Can we manage them from one account?',
    a: 'Yes. The Group Admin role gives you a single dashboard across all branches - cross-branch fee summaries, attendance, staff, and analytics. Each branch keeps its own isolated data.',
  },
  {
    q: 'Is there a mobile app for students and teachers?',
    a: 'Yes - a Flutter app for Android and iOS. Students check results, timetable, and fee status. Teachers mark attendance and grade assignments on the go.',
  },
  {
    q: "Is our school's data secure? Can other schools see it?",
    a: 'Absolutely not. Every school is a fully isolated tenant - separate data, JWT authentication, and role-based access on every API endpoint. Cross-tenant access is architecturally impossible.',
  },
  {
    q: 'What happens after the 7-day trial ends?',
    a: "Your data stays intact. You choose whether to upgrade to Pro at Rs 35 per active student per month. If you don't upgrade, the account is paused - nothing is deleted.",
  },
  {
    q: 'Does the school get its own website?',
    a: 'Yes. Every school gets a public website at their subdomain with 3 themes - Classic, Modern, and Minimal. Edit all content live with a click-to-edit preview. No coding needed.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Mr. Tariq Mehmood',
    role: 'Principal, Al-Huda Academy, Lahore',
    quote: "Our accountant used to come to me stressed every month-end. Now she sends me a report by noon. I didn't realise how much energy was going into paperwork until it stopped.",
    highlight: 'Accountant: 10 PM -> done by noon',
    initials: 'TM',
  },
  {
    name: 'Ms. Ayesha Siddiqui',
    role: 'Group Admin, Crescent Schools, Karachi',
    quote: 'I was flying between three campuses just to understand what was happening. Now I open one screen in the morning and I know everything - fees, attendance, staff, all of it.',
    highlight: '3 campuses -> one dashboard',
    initials: 'AS',
  },
  {
    name: 'Sir Bilal Khurshid',
    role: 'IT Admin, Future Stars College, Islamabad',
    quote: 'Parents used to call me directly with attendance complaints. That stopped in the first week. They could see everything themselves. That alone saved me hours every day.',
    highlight: 'Parent complaints dropped to zero',
    initials: 'BK',
  },
];

// Navbar

function Navbar({ scrolled, menuOpen, setMenuOpen }: { scrolled: boolean; menuOpen: boolean; setMenuOpen: (v: boolean) => void }) {
  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow: '0 4px 12px rgba(37,99,235,.35)' }}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <span className={`font-extrabold text-xl tracking-tight ${scrolled ? 'text-gray-900' : 'text-white'}`}>
            EduStack <span className="text-blue-400">PK</span>
          </span>
        </div>

        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium">
          {[['#problem','The Problem'],['#features','Features'],['#pricing','Pricing'],['#faq','FAQ']].map(([href,label]) => (
            <a key={href} href={href} className={`transition-colors ${scrolled ? 'text-gray-500 hover:text-gray-900' : 'text-blue-100 hover:text-white'}`}>{label}</a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <Link to="/login" className={`text-sm font-medium px-3 py-2 transition-colors ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-blue-100 hover:text-white'}`}>
            Sign In
          </Link>
          <a href="mailto:hello@wolfstack.io?subject=Book%20a%20Demo%20-%20EduStack%20PK" className={`text-sm font-medium px-3 py-2 transition-colors ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-blue-100 hover:text-white'}`}>
            Book a Demo
          </a>
          <Link to="/register" className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/30">
            Start Free Trial
          </Link>
        </div>

        <button className={`lg:hidden p-2 rounded-lg ${scrolled ? 'text-gray-500 hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}
          onClick={() => setMenuOpen(!menuOpen)} aria-label="menu">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-2 shadow-lg">
          {[['#problem','The Problem'],['#features','Features'],['#pricing','Pricing'],['#faq','FAQ']].map(([href,label]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}
              className="py-2 px-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-blue-600">{label}</a>
          ))}
          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
            <Link to="/login" className="py-2 text-center text-sm text-gray-600">Sign In</Link>
            <a href="mailto:hello@wolfstack.io?subject=Book%20a%20Demo%20-%20EduStack%20PK" className="py-2 text-center text-sm text-gray-600 hover:text-blue-600">Book a Demo</a>
            <Link to="/register" className="py-3 rounded-xl bg-blue-600 text-white text-center text-sm font-bold hover:bg-blue-700">
              Start Free Trial
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

// Hero

const HERO_PAINS = [
  {
    icon: '📋',
    bold: '300 challans hand-written every month.',
    rest: 'Then chased one by one by phone. Reconciled manually at midnight.',
  },
  {
    icon: '🏫',
    bold: 'A teacher called in sick — 40 students are sitting idle.',
    rest: 'No substitute system. No coverage. No record of who handled it.',
  },
  {
    icon: '⏰',
    bold: 'It\'s 2 AM and result cards are still not ready.',
    rest: 'Staff averaging marks manually on paper. One arithmetic error means starting over.',
  },
  {
    icon: '📢',
    bold: 'You posted an important announcement.',
    rest: 'It got buried under 200 messages in the school WhatsApp group within the hour.',
  },
  {
    icon: '📂',
    bold: 'A parent is challenging their child\'s attendance record.',
    rest: 'You have no digital timestamps, no audit trail — no way to prove it.',
  },
];

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#070b19] pt-24 pb-20 lg:pt-32 lg:pb-28">
      <div className="absolute inset-0 pointer-events-none" style={DOT_GRID_DARK} />
      <div
        className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full pointer-events-none opacity-40 blur-[60px] animate-glow"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.3) 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-[30%] -right-40 w-[600px] h-[600px] rounded-full pointer-events-none opacity-20 blur-[70px] animate-glow"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)', animationDelay: '4s' }}
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2.5 rounded-full px-4.5 py-2 bg-blue-500/10 border border-blue-500/20 backdrop-blur-md transition-all duration-300 hover:border-blue-500/40">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-blue-200 tracking-wide font-display">Built for Pakistani Schools and Colleges</span>
          </div>
        </div>

        <h1 className="font-extrabold tracking-tight leading-[1.08] mb-8 text-white font-display" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>
          Running a school on paper<br />
          <span className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 bg-clip-text text-transparent">
            is costing you more
          </span><br />
          than you realise.
        </h1>

        {/* Story card — individual pain points */}
        <div
          className="max-w-3xl mx-auto mb-12 rounded-3xl overflow-hidden border border-white/[0.07] shadow-[0_25px_60px_rgba(0,0,0,0.4)]"
          style={{ background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.75) 0%, rgba(15, 23, 42, 0.85) 100%)' }}
        >
          {/* Card header */}
          <div className="px-6 pt-5 pb-4 border-b border-white/[0.05] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-slate-500">Does this sound familiar?</p>
          </div>

          {/* Pain rows */}
          <div className="divide-y divide-white/[0.04]">
            {HERO_PAINS.map((p, i) => (
              <div key={i} className="flex items-start gap-3.5 px-6 py-3.5 hover:bg-white/[0.02] transition-colors">
                <span className="text-xl leading-none mt-0.5 shrink-0">{p.icon}</span>
                <p className="text-sm sm:text-[15px] leading-relaxed text-left">
                  <span className="font-semibold text-white">{p.bold}</span>{' '}
                  <span className="text-slate-500">{p.rest}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Solution bar */}
          <div className="px-6 py-4 flex items-start gap-3 bg-amber-500/[0.08] border-t border-amber-500/20">
            <span className="text-amber-400 text-lg shrink-0 mt-0.5">💡</span>
            <p className="text-sm sm:text-base font-semibold text-amber-300/90 text-left leading-snug">
              Save 20+ hours/month and recover Rs 50,000+ in revenue leaks — EduStack PK automates fee, attendance, exams, and payroll in one platform.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4.5 justify-center items-center">
          <Link to="/register"
            className="w-full sm:w-auto px-10 py-4.5 rounded-2xl font-bold text-base text-white transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
              boxShadow: '0 8px 30px rgba(37,99,235,0.4)'
            }}
          >
            Start Free Trial
          </Link>
          <a href="mailto:hello@wolfstack.io?subject=Book%20a%20Demo%20-%20EduStack%20PK"
            className="w-full sm:w-auto px-10 py-4.5 rounded-2xl text-white font-bold text-base transition-all duration-300 border border-white/10 backdrop-blur-sm hover:bg-white/5 hover:border-white/20 active:scale-[0.98]"
          >
            Book a Live Demo
          </a>
        </div>

        <p className="mt-6 text-xs text-slate-500 tracking-wide font-medium">
          <a href="#features" className="text-blue-400 underline hover:text-blue-300 transition-colors">Explore features</a> &middot; No credit card &middot; 5 mins to setup
        </p>
      </div>

      <div className="h-12 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, #ffffff)' }} />
    </section>
  );
}

function ImpactStatsSection() {
  const stats = [
    {
      value: '20+',
      label: 'Hours saved per school, per month',
      sub: 'No more manual registers, challan runs, or mark averaging',
      color: 'text-blue-400',
      glow: 'rgba(37,99,235,0.15)',
    },
    {
      value: 'Rs 50K+',
      label: 'Revenue leaks recovered monthly',
      sub: 'Fee defaults caught early, disputes resolved with audit trails',
      color: 'text-emerald-400',
      glow: 'rgba(16,185,129,0.12)',
    },
    {
      value: '10',
      label: 'Modules in one platform',
      sub: 'Fees, exams, attendance, payroll, admissions, website & more',
      color: 'text-violet-400',
      glow: 'rgba(139,92,246,0.12)',
    },
    {
      value: '5 min',
      label: 'Time to go live',
      sub: 'Not 5 months — same-day setup, no technical knowledge needed',
      color: 'text-amber-400',
      glow: 'rgba(245,158,11,0.12)',
    },
    {
      value: '7',
      label: 'Role-based access levels',
      sub: 'Principal, teacher, accountant, student — everyone sees exactly what they need',
      color: 'text-sky-400',
      glow: 'rgba(14,165,233,0.12)',
    },
    {
      value: '300',
      label: 'Challans automated monthly',
      sub: 'Batch-generated PDFs — JazzCash and EasyPaisa ready from day one',
      color: 'text-rose-400',
      glow: 'rgba(244,63,94,0.12)',
    },
  ];

  return (
    <section className="py-16 bg-[#070b19] border-b border-white/[0.04] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={DOT_GRID_DARK} />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-2">By The Numbers</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
            The impact is measurable. The relief is immediate.
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map(s => (
            <div
              key={s.value}
              className="relative flex flex-col items-center text-center p-5 rounded-2xl transition-all duration-300 hover:scale-[1.03] group"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: `radial-gradient(circle at center, ${s.glow}, transparent 70%)` }}
              />
              <div className={`text-3xl sm:text-4xl font-black mb-1.5 leading-none ${s.color}`}>{s.value}</div>
              <div className="text-[11px] font-bold text-slate-300 mb-1.5 leading-snug">{s.label}</div>
              <div className="text-[10px] text-slate-600 leading-relaxed hidden sm:block">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyEduStackSection() {
  const usps = [
    { icon: '⚡', title: 'Setup in 5 minutes', sub: 'Not 5 months' },
    { icon: '📱', title: 'JazzCash + EasyPaisa', sub: 'Parents pay in 60 seconds' },
    { icon: '🔒', title: 'Data stays in Pakistan', sub: 'Bank-grade security' },
    { icon: '📊', title: '10 modules, one platform', sub: 'Fee, attendance, exams, payroll' },
    { icon: '🎯', title: 'No training needed', sub: 'Staff confident within a day' },
  ];
  return (
    <section className="py-12 bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-400 mb-7">Why EduStack PK Wins</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {usps.map(usp => (
            <div key={usp.title} className="text-center p-5 rounded-2xl bg-slate-50 border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all">
              <div className="text-2xl mb-2">{usp.icon}</div>
              <div className="font-bold text-gray-900 text-sm mb-1 leading-snug">{usp.title}</div>
              <div className="text-gray-400 text-xs">{usp.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PerfectForYouSection() {
  const fits = [
    { yes: true,  text: 'You have 50–500 students across 1–3 campuses' },
    { yes: true,  text: 'Your principal, owner, or HR manager makes technology decisions' },
    { yes: true,  text: 'Your team still runs on paper registers, WhatsApp, or spreadsheets' },
    { yes: true,  text: "You're spending Rs 50,000+ per month on manual admin and fee follow-ups" },
    { yes: false, text: "You need 5 months of onboarding — EduStack PK is live in 5 minutes" },
    { yes: false, text: "You're a 10,000-student university needing fully custom enterprise development" },
  ];
  return (
    <section className="py-20 bg-slate-50 border-y border-gray-100" style={DOT_GRID}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Is EduStack PK Right For You?</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
            Perfect for you if&hellip;
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fits.map((item, i) => (
            <div key={i} className={`flex items-start gap-3 p-5 rounded-2xl border transition-all ${item.yes ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50/60 border-rose-100'}`}>
              {item.yes
                ? <CheckIcon className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                : <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              }
              <span className={`text-sm font-medium leading-relaxed ${item.yes ? 'text-emerald-900' : 'text-rose-800'}`}>{item.text}</span>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link to="/register"
            className="inline-flex items-center gap-2 px-9 py-4 rounded-2xl text-white font-bold text-base transition-all hover:scale-[1.02] hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow: '0 8px 30px rgba(37,99,235,0.35)' }}>
            Start Free Trial &mdash; 7 Days Full Access
          </Link>
        </div>
      </div>
    </section>
  );
}

function PainStatsSection() {
  return (
    <section id="problem" className="py-24 bg-white relative" style={DIAG_LINES}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3 font-display">Systemic Bottlenecks</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight font-display">
            Every school in Pakistan is running on the same broken system.
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            { stat: '300', unit: 'Challans / Month', desc: "Written by hand every single month. Then chased individually by phone. Reconciled manually late at night." },
            { stat: '2 AM', unit: 'Result Compilation', desc: "Staff manually calculating averages and rankings on paper. One arithmetic error invalidates the entire class register." },
            { stat: '0', unit: 'Audit Trails', desc: "To present to a parent disputing their child's attendance shortage or cash payment. Zero records. Zero verification." },
          ].map(item => (
            <div key={item.stat} className="bg-white border border-gray-150/70 border-t-4 border-t-red-500/80 rounded-2xl p-8 text-center shadow-[0_15px_40px_rgba(239,68,68,0.03)] hover:shadow-lg hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-300">
              <div className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-red-600 to-amber-600 bg-clip-text text-transparent mb-2 font-display leading-none">{item.stat}</div>
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4 font-display">{item.unit}</div>
              <div className="text-gray-500 text-sm leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-16 text-center">
          <p className="text-gray-400 text-sm font-medium">
            Manual registers &middot; Scattered WhatsApp groups &middot; Loose spreadsheet records &middot; Hand-written challans<br />
            <span className="font-semibold text-gray-700 mt-2 block">It worked in 1995. It leaks administrative revenue today.</span>
          </p>
        </div>
      </div>
    </section>
  );
}

// How It Works

function HowItWorksSection() {
  return (
    <section className="py-20 bg-slate-50 relative border-y border-gray-100" style={DOT_GRID}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Setup &amp; Onboarding</p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-16">
          Running in 5 minutes. Not 5 months.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
          <div className="hidden md:block absolute top-7 left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-px bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200" />
          {[
            {
              step: '1',
              color: 'from-blue-500 to-blue-600',
              shadow: 'shadow-blue-500/25',
              title: 'Register your school',
              desc: 'Create your account, add branch details, configure classes and sections. Under 5 minutes — no technical knowledge required.',
            },
            {
              step: '2',
              color: 'from-indigo-500 to-violet-600',
              shadow: 'shadow-indigo-500/25',
              title: 'Invite your staff',
              desc: 'Add teachers, accountants, and admins. Each person gets exactly the access their role requires — nothing more, nothing less.',
            },
            {
              step: '3',
              color: 'from-violet-500 to-purple-600',
              shadow: 'shadow-violet-500/25',
              title: 'Go live from day one',
              desc: 'Mark attendance, generate challans, enter results. No migration, no training week. Your school is fully operational immediately.',
            },
          ].map(item => (
            <div key={item.step} className="relative flex flex-col items-center text-center">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} text-white text-xl font-black flex items-center justify-center mb-6 shadow-lg ${item.shadow} relative z-10`}>
                {item.step}
              </div>
              <h3 className="font-extrabold text-gray-900 text-lg mb-3">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-14">
          <Link to="/register"
            className="inline-flex items-center gap-2 px-9 py-4 rounded-2xl text-white font-bold text-base transition-all hover:scale-[1.02] hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow: '0 8px 30px rgba(37,99,235,0.35)' }}>
            Start Free Trial &mdash; No Credit Card
          </Link>
        </div>
      </div>
    </section>
  );
}

// Interactive Features Showcase

function FeaturesShowcase() {
  const [activeTab, setActiveTab] = useState<'finance' | 'academics' | 'attendance' | 'payroll' | 'admissions' | 'website'>('finance');

  const tabData = {
    finance: {
      label: 'Fee Management',
      badge: 'Fee Management & Payments',
      title: 'Challans generate themselves. Parents pay online.',
      desc: 'Tired of hand-writing 300 challans? Generate dual-copy PDF challans automatically. Parents pay instantly via JazzCash or EasyPaisa in under a minute, with real-time automatic ledger reconciliation.',
      bullets: [
        'Automated monthly challan batch generation',
        'JazzCash and EasyPaisa mobile wallet integration',
        'Professional dual-copy bank PDF challan format',
        'Fee waivers, discounts, and outstanding analytics'
      ],
      mockup: (
        <div className="bg-white rounded-2xl shadow-xl p-6 w-72 border border-gray-100 text-gray-800">
          <div className="text-center border-b-2 border-dashed border-gray-200 pb-4 mb-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Al-Huda Academy</div>
            <div className="text-base font-extrabold text-gray-900">FEE CHALLAN</div>
            <div className="text-xs text-gray-400 mt-0.5">HBL Bank - Student Copy</div>
          </div>
          <div className="space-y-2.5 text-xs mb-4">
            {[
              ['Student', 'Ali Hassan - Class 9A'],
              ['Month', 'June 2025'],
              ['Due Date', '15 June 2025']
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center">
                <span className="text-gray-400">{k}</span>
                <span className="font-semibold text-gray-700">{v}</span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="text-gray-400 font-bold">Amount Due</span>
              <span className="font-extrabold text-blue-600 text-base">Rs 3,500</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-red-50 border border-red-100 rounded-lg p-2 text-center">
              <div className="text-xs font-bold text-red-600">JazzCash</div>
              <div className="text-xs text-red-500 mt-0.5">Pay online</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2 text-center">
              <div className="text-xs font-bold text-emerald-700">EasyPaisa</div>
              <div className="text-xs text-emerald-600 mt-0.5">Pay online</div>
            </div>
          </div>
          <div className="mt-3 text-center text-[10px] text-gray-400">Auto-generated by EduStack PK</div>
        </div>
      )
    },
    academics: {
      label: 'Exams & Results',
      badge: 'Exams & Grading',
      title: 'Marks go in. Results come out. Instantly.',
      desc: 'Calculate class rankings, averages, subject totals, and grades instantly. Teachers enter marks from a single portal, eliminating human arithmetic errors. Printable result cards are ready immediately.',
      bullets: [
        'Flexible custom grading configurations per class',
        'Secure marks entry by subject teacher',
        'Automatic class position and average ranking',
        'Professional printable result card PDF export'
      ],
      mockup: (
        <div className="bg-white rounded-2xl border border-blue-100 p-6 shadow-xl text-gray-800 w-72">
          <div className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-4">Result Card - Class 9A</div>
          <div className="space-y-2 mb-4">
            {[
              ['Mathematics', '92 / 100', 'A+'],
              ['Physics', '88 / 100', 'A'],
              ['English', '79 / 100', 'B+'],
              ['Chemistry', '85 / 100', 'A']
            ].map(([sub, marks, grade]) => (
              <div key={sub} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50">
                <span className="text-gray-500">{sub}</span>
                <span className="text-gray-700 font-medium">{marks}</span>
                <span className="font-extrabold text-blue-600 w-8 text-right">{grade}</span>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-blue-500 font-medium">Class Position</div>
              <div className="text-xl font-black text-blue-700">3rd</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-blue-500 font-medium">Total Marks</div>
              <div className="text-xl font-black text-blue-700">86%</div>
            </div>
          </div>
        </div>
      )
    },
    attendance: {
      label: 'Attendance',
      badge: 'Attendance & Timetables',
      title: 'Digital registers. Conflict-free timetables.',
      desc: 'Ditch manual paper registers. Mark daily or period-wise student attendance. Shortage alerts are triggered automatically. Run a conflict-free master timetable that alerts you of clashes before saving, and substitute absent teachers in a single tap.',
      bullets: [
        'Daily and period-wise digital register marking',
        'Automatic shortage alerts sent directly to dashboards',
        'Conflict-free timetable validator to prevent teacher clashes',
        'One-tap teacher substitute allocation system'
      ],
      mockup: (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xl text-gray-800 w-72">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
            <div className="text-xs font-bold text-gray-400 uppercase">DIGITAL REGISTER</div>
            <div className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">Live</div>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Ali Hassan', status: 'Present', time: '07:45 AM' },
              { name: 'Zainab Bibi', status: 'Late', time: '08:02 AM' },
              { name: 'Muhammad Ahmed', status: 'Absent', time: '--' }
            ].map(s => (
              <div key={s.name} className="flex items-center justify-between text-xs py-0.5">
                <span className="text-gray-700 font-semibold">{s.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-[10px]">{s.time}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.status === 'Present' ? 'bg-emerald-50 text-emerald-700' : s.status === 'Late' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400">
            <span>Monthly Attendance Alerts</span>
            <span className="font-bold text-rose-600">3 Shortages</span>
          </div>
        </div>
      )
    },
    payroll: {
      label: 'Payroll',
      badge: 'Staff & Payroll',
      title: 'One-click salary calculations. Payslips for all.',
      desc: 'Setup salary allowances and deductions once. Late arrival or leave deductions apply automatically based on digital attendance records. Process monthly payroll securely and print payslips on demand.',
      bullets: [
        'Custom salary structures with allowances and deductions',
        'Attendance-linked automated deductions and increments',
        'On-demand payroll batch processing and approval',
        'Printable monthly payslip PDF generation for staff'
      ],
      mockup: (
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 text-gray-800 w-72">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">PAYSLIP - JUNE 2025</div>
              <div className="font-bold text-gray-900 mt-0.5">Usman Ali - Teacher</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-gray-400">Net Pay</div>
              <div className="text-lg font-black text-blue-700">Rs 48,200</div>
            </div>
          </div>
          <div className="space-y-2 text-[11px]">
            {[
              ['Basic Salary', 'Rs 40,000', ''],
              ['House Allowance', 'Rs 8,000', ''],
              ['Transport', 'Rs 2,000', ''],
              ['Late Deduction', '- Rs 1,800', 'text-red-500']
            ].map(([k, v, cls]) => (
              <div key={k} className="flex justify-between">
                <span className="text-gray-400">{k}</span>
                <span className={`font-semibold ${cls || 'text-gray-700'}`}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    admissions: {
      label: 'Admissions',
      badge: 'Admissions Portal',
      title: 'Online applications. Seamless student onboarding.',
      desc: 'Allow prospective parents to submit applications online at your custom subdomain. Manage applicant status, issue offer letters, and auto-generate student registration numbers.',
      bullets: [
        'Public admissions portal page at school subdomain',
        'Centralized applicant tracking pipeline for school admins',
        'Automated student ID card and offer letter PDF generation',
        'Document attachments and parent communication logs'
      ],
      mockup: (
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 text-gray-800 w-72">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">Online Admission</div>
              <div className="text-xs text-gray-400">Al-Huda Academy, Lahore</div>
            </div>
          </div>
          <div className="space-y-3 text-left">
            {[
              ['Student Full Name', 'Ahmad Hassan Khan'],
              ['Class Applying For', 'Class 9'],
              ['Parent Phone', '0300-1234567']
            ].map(([label, val]) => (
              <div key={label}>
                <div className="text-[10px] text-gray-400 mb-0.5">{label}</div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 font-semibold">{val}</div>
              </div>
            ))}
            <div className="rounded-xl py-2.5 text-xs font-bold text-white text-center mt-2 bg-blue-600">
              Submit Application
            </div>
          </div>
        </div>
      )
    },
    website: {
      label: 'Website Builder',
      badge: 'School Website',
      title: 'Your school gets its own website. Instantly.',
      desc: 'Every school on EduStack PK gets a free public website at their own subdomain — with three professional themes. Edit all content live with a click-to-edit preview. Online admissions and announcements are built in. No developer, no hosting fees.',
      bullets: [
        'Free subdomain: yourschool.edustack.pk',
        'Three themes: Classic, Modern, and Minimal',
        'Live click-to-edit content — no coding required',
        'Online admissions portal and announcements built in'
      ],
      mockup: (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 text-gray-800 w-72">
          <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
            </div>
            <div className="flex-1 bg-slate-700/60 rounded text-[10px] text-slate-400 px-2 py-0.5 text-center">
              alhuda-academy.edustack.pk
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-700 to-indigo-800 px-5 py-6 text-white text-center">
            <div className="text-[10px] text-blue-300 mb-1 uppercase tracking-widest font-bold">Est. 1998 &middot; Lahore</div>
            <div className="text-base font-black mb-1">Al-Huda Academy</div>
            <div className="text-xs text-blue-200 mb-4">Excellence in Education</div>
            <div className="bg-amber-400 text-gray-900 text-[10px] font-bold px-3 py-1.5 rounded-lg inline-block">
              Apply for Admission 2025
            </div>
          </div>
          <div className="px-4 py-3 space-y-1.5">
            {[['Announcements', '3 new'], ['Gallery', '24 photos'], ['Our Teachers', '18 staff']].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                <span className="text-gray-600 font-medium">{k}</span>
                <span className="text-blue-600 font-bold">{v}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <div className="text-[10px] text-gray-400">3 themes &middot; No coding needed</div>
          </div>
        </div>
      )
    }
  };

  const activeData = tabData[activeTab];

  return (
    <section id="features" className="py-20 bg-white relative border-y border-gray-100">
      <div className="absolute inset-0 pointer-events-none opacity-50" style={DOT_GRID} />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">All-In-One School ERP</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
            One platform. Every operational need solved.
          </h2>
          <p className="mt-4 text-gray-500 max-w-xl mx-auto text-sm sm:text-base">
            No more manual files or scattered WhatsApp groups. Select a module below to see how EduStack PK transforms your operations.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-12 border-b border-gray-200 pb-5">
          {(Object.keys(tabData) as Array<keyof typeof tabData>).map(tabKey => {
            const data = tabData[tabKey];
            const isActive = activeTab === tabKey;
            const icons = {
              finance: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              academics: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              ),
              attendance: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ),
              payroll: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              ),
              admissions: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              ),
              website: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              ),
            };
            return (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                className={`flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 ${isActive ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/25 scale-[1.02]' : 'text-gray-500 hover:text-gray-900 hover:bg-slate-100 border border-gray-100/40 hover:border-gray-200'}`}
              >
                {icons[tabKey]}
                {data.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center bg-white rounded-3xl p-8 lg:p-12 shadow-[0_20px_50px_rgba(37,99,235,0.03)] border border-gray-150 text-gray-900">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-widest rounded-full px-3.5 py-1.5 mb-6 font-display">
              {activeData.badge}
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4 font-display tracking-tight leading-tight">
              {activeData.title}
            </h3>
            <p className="text-gray-500 leading-relaxed mb-6 text-sm sm:text-base">
              {activeData.desc}
            </p>
            <ul className="space-y-3 mb-6">
              {activeData.bullets.map(bullet => (
                <li key={bullet} className="flex items-center gap-3 text-xs sm:text-sm text-gray-600">
                  <CheckIcon className="w-4 h-4 text-blue-500 shrink-0" />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center bg-slate-50 rounded-2xl py-12 px-6 border border-gray-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] animate-float">
            {activeData.mockup}
          </div>
        </div>
      </div>
    </section>
  );
}

// Roles

function RolesSection() {
  return (
    <section className="py-24 bg-[#070b19] text-white border-b border-white/[0.03] relative overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none opacity-20 blur-[80px]"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }}
      />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-4 font-display">Access Control Matrix</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-5 leading-tight font-display tracking-tight">Everyone sees exactly what they should. Nothing more.</h2>
            <p className="text-slate-400 leading-relaxed text-sm sm:text-base">
              Teachers do not see payroll. Students do not see staff records. Accountants do not get into exam settings.
              Multi-campus? The Group Admin role aggregates analytics across all branches in real-time, while campus data remains completely isolated.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {[
              { icon: <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, label:'Super Admin', desc:'Platform administrative control' },
              { icon: <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>, label:'Group Admin', desc:'Multi-campus dashboard views' },
              { icon: <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>, label:'Principal', desc:'Single campus full oversight' },
              { icon: <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>, label:'Teacher', desc:'Academic grade and attendance entry' },
              { icon: <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 7l9-5-9-5-9 5 9 5z" /></svg>, label:'Student', desc:'Portal for schedules and results' },
              { icon: <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, label:'Accountant', desc:'Fee challans and staff payroll' },
            ].map(r => (
              <div key={r.label} className="p-4 rounded-xl flex items-center gap-3 transition-all duration-300 hover:scale-[1.03] hover:bg-white/[0.08] hover:border-white/[0.15]"
                style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.05)' }}>
                <div className="shrink-0">{r.icon}</div>
                <div>
                  <div className="text-sm font-bold text-white font-display">{r.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Security Trust

function SecurityTrustSection() {
  const pillars = [
    {
      color: 'text-emerald-400',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'Complete Tenant Isolation',
      desc: "One school cannot access another school's data. Not just a policy — a hard architectural constraint enforced at the database and API layer on every single request.",
    },
    {
      color: 'text-blue-400',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      title: 'JWT Authentication',
      desc: 'Every session is cryptographically signed. Expired tokens are rejected at the middleware layer automatically. No persistent cookies that can be stolen or replayed.',
    },
    {
      color: 'text-violet-400',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      title: 'Role-Based Access Control',
      desc: "Seven roles, endpoint-level enforcement. A teacher cannot view payroll. An accountant cannot touch exam settings. Every API call is verified against the caller's role.",
    },
    {
      color: 'text-amber-400',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: 'Full Audit Trails',
      desc: 'Every fee payment, mark entry, and attendance change is timestamped and attributed to a user. When a parent disputes a record, you have proof — down to the second.',
    },
    {
      color: 'text-sky-400',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      ),
      title: 'Secure Document Storage',
      desc: 'Student photos, assignment uploads, and documents are stored in isolated S3 buckets with signed URLs. No file is ever directly publicly accessible.',
    },
    {
      color: 'text-rose-400',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: 'Built for Pakistan',
      desc: 'Deployed on infrastructure close to Pakistan. JazzCash and EasyPaisa are first-class integrations. Your student data does not travel across distant jurisdictions.',
    },
  ];

  return (
    <section className="py-24 bg-[#070b19] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={DOT_GRID_DARK} />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none opacity-10 blur-[140px]"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.4) 0%, transparent 70%)' }}
      />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">Data Security</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            Your school's data is yours. Always.
          </h2>
          <p className="mt-4 text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
            Built with the same security standards as enterprise banking software — because your students' records deserve it.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pillars.map(p => (
            <div
              key={p.title}
              className="p-6 rounded-2xl transition-all duration-300 hover:bg-white/[0.05]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${p.color}`}
                style={{ background: 'rgba(255,255,255,0.07)' }}>
                {p.icon}
              </div>
              <div className="font-bold text-white mb-2 text-sm">{p.title}</div>
              <div className="text-slate-500 text-xs leading-relaxed">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Payments

function PaymentsSection() {
  return (
    <section className="py-20 bg-white relative border-y border-gray-100" style={DIAG_LINES}>
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="text-4xl mb-4">&#127477;&#127472;</div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Built for the way Pakistan pays.</h2>
        <p className="text-gray-500 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          Most parents do not have a credit card. They have JazzCash. They have EasyPaisa.
          Now they can pay school fees in under a minute - without leaving home.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {[
            { name:'JazzCash', sub:'Mobile wallet payment', icon: <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
            { name:'EasyPaisa', sub:'Mobile wallet payment', icon: <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
            { name:'Bank Challan', sub:'HBL/UBL format PDF', icon: <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg> },
            { name:'Cash', sub:'With receipt record', icon: <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
          ].map(m => (
            <div key={m.name} className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-slate-50 border border-gray-150 shadow-sm"
              style={{ minWidth: '200px' }}>
              <div className="shrink-0">{m.icon}</div>
              <div className="text-left">
                <div className="text-gray-900 font-bold text-sm">{m.name}</div>
                <div className="text-gray-500 text-xs">{m.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Testimonials

function TestimonialsSection() {
  return (
    <section className="py-20 bg-slate-50 relative" style={DOT_GRID}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Trusted by School Leaders Across Pakistan</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">What actually changes when schools go live.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="bg-white rounded-2xl border border-gray-100 p-7 flex flex-col shadow-sm hover:shadow-md transition-shadow">
              <StarRating />
              <div className="mt-4 mb-3 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full w-fit uppercase tracking-wide">
                {t.highlight}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed my-3 flex-1 italic">&ldquo;{t.quote}&rdquo;</p>
              <div className="border-t border-gray-100 pt-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 font-extrabold flex items-center justify-center text-sm shrink-0 border border-blue-100">
                  {t.initials}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Pricing

const ADDONS = [
  { id: 'backup',     label: 'Daily Backup',                            desc: 'Daily backup of your data.',                                                rate: 500,   type: 'monthly'      as const, icon: '💾' },
  { id: 'sms',        label: 'SMS Notifications',                       desc: 'Send important updates to parents via SMS.',                                rate: 20,    type: 'per-student'  as const, icon: '📲' },
  { id: 'apps',       label: 'Mobile Apps (Student, Teacher, Parent)',  desc: 'EduStack branded apps for the whole community on iOS & Android.',          rate: 25,    type: 'per-student'  as const, icon: '📱' },
  { id: 'whitelabel', label: 'Whitelabel App Customization',            desc: 'Your branding on the App Store & Play Store.',                             rate: 45000, type: 'one-time'     as const, icon: '🏷️' },
  { id: 'biometric',  label: 'Biometric Integration',                   desc: 'ZKTeco/Hikvision devices for staff attendance & payroll.',                 rate: 45000, type: 'one-time'     as const, icon: '🔐' },
] as const;

function PricingSection() {
  // ── state ────────────────────────────────────────────────────────────
  const [students, setStudents]   = useState(150);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [showContact, setShowContact] = useState(false);
  const [cStep, setCStep]         = useState<1 | 2>(1);
  const [showPdf, setShowPdf]     = useState(false);
  const [pdfSent, setPdfSent]     = useState(false);
  const [cf, setCf] = useState({ name: '', email: '', type: 'School', school: '', message: '' });
  const [pf, setPf] = useState({ school: '', name: '', email: '', phone: '' });

  // ── calculations ──────────────────────────────────────────────────
  const BASE = 35;
  const MIN  = 1750;
  const baseMonthly = Math.max(students * BASE, MIN);
  let addMonthly = 0;
  let addOneTime = 0;
  for (const id of selected) {
    const a = ADDONS.find(x => x.id === id);
    if (!a) continue;
    if (a.type === 'monthly')     addMonthly += a.rate;
    if (a.type === 'per-student') addMonthly += a.rate * students;
    if (a.type === 'one-time')    addOneTime += a.rate;
  }
  const totalMonthly = baseMonthly + addMonthly;
  const totalOneTime = addOneTime;

  const fmt = (n: number) => n.toLocaleString('en-PK');
  const toggleAddon = (id: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const addonRateLabel = (a: typeof ADDONS[number]) =>
    a.type === 'monthly' ? `Rs ${fmt(a.rate)}/mo`
    : a.type === 'per-student' ? `Rs ${a.rate}/student/mo`
    : `Rs ${fmt(a.rate)} once`;

  const canDownload = !!(pf.email.trim() || pf.phone.trim());

  function downloadEstimate() {
    const picked = ADDONS.filter(a => selected.has(a.id));
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>EduStack PK — Cost Estimate</title>
<style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;color:#1e293b;padding:0 20px}
h1{color:#2563eb;font-size:22px;margin-bottom:2px}.sub{color:#64748b;font-size:12px;margin-bottom:24px;padding-bottom:14px;border-bottom:2px solid #e2e8f0}
table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px}th{text-align:left;padding:8px 12px;background:#f1f5f9;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b}
td{padding:10px 12px;border-bottom:1px solid #f1f5f9}.total td{background:#eff6ff;font-weight:700;color:#1e40af}.once td{background:#fefce8;font-weight:700;color:#92400e}
.footer{margin-top:24px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:14px}</style>
</head><body>
<h1>EduStack PK — Official Cost Estimate</h1>
<div class="sub">For: <strong>${pf.school || 'Your Institution'}</strong> &nbsp;|&nbsp; ${pf.name} &nbsp;|&nbsp; ${pf.email || pf.phone}<br>
Generated: ${new Date().toLocaleDateString('en-PK', { year:'numeric', month:'long', day:'numeric' })}</div>
<table><tr><th>Monthly Plan</th><th>Details</th><th style="text-align:right">Amount</th></tr>
<tr><td>EduStack PK Pro</td><td>${students} students × Rs ${BASE}/student${students * BASE < MIN ? ' (minimum applies)' : ''}</td><td style="text-align:right">Rs ${fmt(baseMonthly)}</td></tr>
${picked.filter(a => a.type !== 'one-time').map(a =>
  `<tr><td>${a.label}</td><td>${a.type === 'per-student' ? `${students} × Rs ${a.rate}` : 'Flat monthly'}</td><td style="text-align:right">Rs ${fmt(a.type === 'per-student' ? a.rate * students : a.rate)}</td></tr>`
).join('')}
<tr class="total"><td colspan="2"><strong>Total Monthly</strong></td><td style="text-align:right"><strong>Rs ${fmt(totalMonthly)}/mo</strong></td></tr></table>
${totalOneTime > 0 ? `<table><tr><th>One-Time Setup</th><th>Details</th><th style="text-align:right">Amount</th></tr>
${picked.filter(a => a.type === 'one-time').map(a =>
  `<tr><td>${a.label}</td><td>${a.desc}</td><td style="text-align:right">Rs ${fmt(a.rate)}</td></tr>`
).join('')}
<tr class="once"><td colspan="2"><strong>Total One-Time</strong></td><td style="text-align:right"><strong>Rs ${fmt(totalOneTime)}</strong></td></tr></table>` : ''}
<div class="footer">EduStack PK · WolfStack · hello@wolfstack.io · Valid 30 days from today.</div>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
  }

  const inp = 'w-full rounded-xl border border-slate-700 bg-slate-800 text-white text-sm px-4 py-3 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors';

  return (
    <section id="pricing" className="py-24 bg-slate-950 relative" style={DOT_GRID_DARK}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* header */}
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Transparent Pricing</p>
          <h2 className="text-4xl font-extrabold text-white mb-4">Fair pricing in PKR.</h2>
          <p className="text-gray-400 text-lg max-w-lg mx-auto">
            Start free, then pay Rs 35 per active student per month. Enhance with optional add-ons below.
          </p>
        </div>

        {/* pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-7 mb-16">
          <div className="rounded-3xl border-2 border-slate-700 bg-slate-900 p-8 flex flex-col">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Trial</div>
            <div className="text-5xl font-extrabold text-white mb-1">7 Days</div>
            <div className="text-gray-500 text-sm mb-7">Full access &middot; No commitment</div>
            <ul className="space-y-3 text-sm text-gray-400 mb-8 flex-1">
              {['All 10 modules unlocked','All branches and students','JazzCash and EasyPaisa','Mobile app included','9-document PDF suite','Email support'].map(item => (
                <li key={item} className="flex items-center gap-2.5"><CheckIcon className="w-4 h-4 text-emerald-500 shrink-0" />{item}</li>
              ))}
            </ul>
            <Link to="/register" className="block text-center px-6 py-3.5 rounded-xl border-2 border-blue-600 text-blue-400 font-bold hover:bg-blue-600 hover:text-white transition-colors">
              Start Free Trial
            </Link>
          </div>

          <div className="rounded-3xl p-8 flex flex-col text-white relative shadow-2xl"
            style={{ background:'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow:'0 20px 60px rgba(37,99,235,.3)' }}>
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-gray-900 text-xs font-bold uppercase tracking-wide px-4 py-1 rounded-full">
              Most Popular
            </div>
            <div className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-3">Pro</div>
            <div className="mb-1">
              <span className="text-5xl font-extrabold">Rs 35</span>
              <span className="text-blue-200 text-base"> /active student /mo</span>
            </div>
            <div className="text-blue-200 text-sm mb-1">Billed monthly in PKR</div>
            <div className="text-blue-300/70 text-xs mb-7">Only pay for students who are active &middot; Minimum Rs 1,750/mo</div>
            <ul className="space-y-3 text-sm text-blue-100 mb-8 flex-1">
              {['Unlimited students and branches','JazzCash and EasyPaisa payments','Priority support','Custom school branding','Website builder (3 themes)','Online admission portal','Dedicated onboarding call'].map(item => (
                <li key={item} className="flex items-center gap-2.5"><CheckIcon className="w-4 h-4 text-amber-400 shrink-0" />{item}</li>
              ))}
            </ul>
            <Link to="/register" className="block text-center px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold transition-colors">
              Start Free Trial
            </Link>
          </div>

          <div className="bg-slate-900 rounded-3xl border-2 border-slate-700 p-8 flex flex-col text-white">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Enterprise</div>
            <div className="text-5xl font-extrabold mb-1">Custom</div>
            <div className="text-slate-500 text-sm mb-7">Large institution chains</div>
            <ul className="space-y-3 text-sm text-slate-300 mb-8 flex-1">
              {['On-premise deployment','SLA agreement','Dedicated account manager','Custom integrations','White-label branding','Staff training sessions'].map(item => (
                <li key={item} className="flex items-center gap-2.5"><CheckIcon className="w-4 h-4 text-blue-400 shrink-0" />{item}</li>
              ))}
            </ul>
            <a href="mailto:hello@wolfstack.io" className="block text-center px-6 py-3.5 rounded-xl border-2 border-slate-600 text-white font-bold hover:bg-slate-800 transition-colors">
              Contact Us
            </a>
          </div>
        </div>

        {/* build your plan */}
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-7 text-center">Build Your Plan</p>

          {/* student slider */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <label className="text-white font-semibold text-sm">How many students do you have?</label>
              <span className="text-2xl font-extrabold text-blue-400">{students}</span>
            </div>
            <input type="range" min={10} max={1000} step={10} value={students}
              onChange={e => setStudents(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer" />
            <div className="flex justify-between text-xs text-slate-600 mt-1"><span>10</span><span>1,000</span></div>
          </div>

          {/* add-ons */}
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">
              Add-ons &mdash; Enhance Your Ecosystem
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ADDONS.map(a => {
                const on = selected.has(a.id);
                return (
                  <button key={a.id} onClick={() => toggleAddon(a.id)}
                    className={`text-left p-4 rounded-2xl border-2 transition-all duration-200 ${on ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base leading-none">{a.icon}</span>
                          <span className="text-white font-semibold text-sm leading-snug">{a.label}</span>
                        </div>
                        <p className="text-slate-500 text-xs leading-relaxed">{a.desc}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={`text-xs font-bold ${a.type === 'one-time' ? 'text-amber-400' : 'text-blue-400'}`}>
                          {addonRateLabel(a)}
                        </div>
                        <div className={`text-[10px] mt-0.5 font-medium ${a.type === 'one-time' ? 'text-amber-600' : 'text-slate-600'}`}>
                          {a.type === 'one-time' ? 'one-time setup' : 'monthly'}
                        </div>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${on ? 'border-blue-500 bg-blue-500' : 'border-slate-600'}`}>
                      {on && <CheckIcon className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* final calculation */}
          <div className="rounded-2xl border border-slate-700 overflow-hidden">
            <div className="px-5 py-3 bg-slate-800/60 border-b border-slate-700">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Final Calculation</p>
            </div>
            <div className="p-5 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">EduStack PK Pro ({students} students{students * BASE < MIN ? ', min. applies' : ''})</span>
                <span className="text-white font-medium">Rs {fmt(baseMonthly)}<span className="text-slate-500 text-xs">/mo</span></span>
              </div>
              {ADDONS.filter(a => selected.has(a.id) && a.type === 'monthly').map(a => (
                <div key={a.id} className="flex justify-between text-sm">
                  <span className="text-slate-400">{a.label}</span>
                  <span className="text-blue-300 font-medium">Rs {fmt(a.rate)}<span className="text-slate-500 text-xs">/mo</span></span>
                </div>
              ))}
              {ADDONS.filter(a => selected.has(a.id) && a.type === 'per-student').map(a => (
                <div key={a.id} className="flex justify-between text-sm">
                  <span className="text-slate-400">{a.label} ({students} × Rs {a.rate})</span>
                  <span className="text-blue-300 font-medium">Rs {fmt(a.rate * students)}<span className="text-slate-500 text-xs">/mo</span></span>
                </div>
              ))}
              <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                <span className="text-white font-bold text-sm">Total Monthly</span>
                <span className="text-2xl font-extrabold text-blue-400">Rs {fmt(totalMonthly)}<span className="text-sm font-medium text-slate-500">/mo</span></span>
              </div>
              {totalOneTime > 0 && (
                <>
                  <div className="pt-2 border-t border-slate-700/50">
                    {ADDONS.filter(a => selected.has(a.id) && a.type === 'one-time').map(a => (
                      <div key={a.id} className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">{a.label}</span>
                        <span className="text-amber-400 font-medium">Rs {fmt(a.rate)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                    <span className="text-white font-bold text-sm">One-Time Setup</span>
                    <span className="text-2xl font-extrabold text-amber-400">Rs {fmt(totalOneTime)}</span>
                  </div>
                </>
              )}
            </div>
            <div className="px-5 py-4 bg-slate-800/40 border-t border-slate-700 flex flex-col sm:flex-row gap-3">
              <Link to="/plan"
                className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white text-center transition-all hover:scale-[1.02] flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow: '0 4px 20px rgba(37,99,235,.3)' }}>
                Build My Plan →
              </Link>
              <button onClick={() => { setShowPdf(true); setPdfSent(false); }}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white border border-slate-600 hover:bg-slate-800 transition-colors">
                ⬇ Download Estimate PDF
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-600 mt-4">
            Only active students are counted &middot; Billed monthly in PKR &middot; Cancel anytime
          </p>
        </div>
      </div>

      {/* ── Contact modal ───────────────────────────────────────────── */}
      {showContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
          onClick={() => setShowContact(false)}>
          <div className="relative w-full max-w-md bg-slate-900 rounded-3xl border border-slate-700 p-8 shadow-2xl my-8"
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowContact(false)}
              className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {cStep === 1 ? (
              <>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">Step 1 of 2</p>
                <h3 className="text-xl font-extrabold text-white mb-1">Send a message</h3>
                <p className="text-slate-500 text-sm mb-6">We usually reply within one business day.</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1.5">Full Name</label>
                    <input className={inp} placeholder="Your name" value={cf.name}
                      onChange={e => setCf(p => ({...p, name: e.target.value}))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1.5">Work Email</label>
                    <input className={inp} type="email" placeholder="you@institution.edu.pk" value={cf.email}
                      onChange={e => setCf(p => ({...p, email: e.target.value}))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1.5">Institution Type</label>
                    <select className={inp} value={cf.type} onChange={e => setCf(p => ({...p, type: e.target.value}))}>
                      {['School','College','University','Institute','Other'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1.5">Institution Name</label>
                    <input className={inp} placeholder="e.g. Springfield Academy or NUST" value={cf.school}
                      onChange={e => setCf(p => ({...p, school: e.target.value}))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1.5">How can we help?</label>
                    <textarea className={`${inp} resize-none`} rows={3}
                      placeholder="Campus size, current systems, timeline…" value={cf.message}
                      onChange={e => setCf(p => ({...p, message: e.target.value}))} />
                  </div>
                  <button onClick={() => setCStep(2)} disabled={!cf.name.trim() || !cf.email.trim()}
                    className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}>
                    Continue →
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-5">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-extrabold text-white mb-2">Message Sent!</h3>
                <p className="text-slate-400 text-sm mb-2">
                  Thanks, <strong className="text-white">{cf.name}</strong>. We'll reply to <strong className="text-white">{cf.email}</strong> within one business day.
                </p>
                <p className="text-slate-600 text-xs mb-6">
                  Your quote: Rs {fmt(totalMonthly)}/mo{totalOneTime > 0 ? ` + Rs ${fmt(totalOneTime)} one-time` : ''}
                </p>
                <button onClick={() => setShowContact(false)}
                  className="px-6 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm font-semibold transition-colors">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PDF modal ───────────────────────────────────────────────── */}
      {showPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
          onClick={() => setShowPdf(false)}>
          <div className="relative w-full max-w-md bg-slate-900 rounded-3xl border border-slate-700 p-8 shadow-2xl my-8"
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowPdf(false)}
              className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-extrabold text-white mb-1">Final Step</h3>
            <p className="text-slate-400 text-sm mb-6">Tell us where to send your official estimate.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Institution Name</label>
                <input className={inp} placeholder="Springfield Academy" value={pf.school}
                  onChange={e => setPf(p => ({...p, school: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Your Name</label>
                <input className={inp} placeholder="Your name" value={pf.name}
                  onChange={e => setPf(p => ({...p, name: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Email Address</label>
                <input className={inp} type="email" placeholder="you@school.edu.pk" value={pf.email}
                  onChange={e => setPf(p => ({...p, email: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Phone Number</label>
                <input className={inp} type="tel" placeholder="0300-0000000" value={pf.phone}
                  onChange={e => setPf(p => ({...p, phone: e.target.value}))} />
              </div>
              <p className="text-xs text-slate-600">* Please provide at least an email or phone number to unlock the PDF.</p>
              <button onClick={() => { if (canDownload) { downloadEstimate(); setPdfSent(true); } }}
                disabled={!canDownload}
                className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Unlock &amp; Download Estimate
              </button>
              {pdfSent && (
                <p className="text-center text-emerald-400 text-xs font-medium">
                  PDF opened in a new tab — use your browser's print dialog to save as PDF.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// FAQ

function FAQSection({ openFaq, setOpenFaq }: { openFaq: number | null; setOpenFaq: (i: number | null) => void }) {
  return (
    <section id="faq" className="py-24 bg-gray-50 relative" style={DIAG_LINES}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Questions</p>
          <h2 className="text-4xl font-extrabold text-gray-900">Things people ask before signing up.</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <button
                className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 font-semibold text-gray-900 hover:bg-gray-50 transition-colors text-sm sm:text-base"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{faq.q}</span>
                <svg className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5 border-t border-gray-50">
                  <p className="pt-4 text-gray-500 text-sm leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// CTA

function CTASection() {
  return (
    <section className="py-24 bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={DOT_GRID_DARK} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{ width:'700px', height:'400px', background:'radial-gradient(ellipse,rgba(37,99,235,.15) 0%,transparent 65%)' }} />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-5 leading-tight">
          Ready to modernize your school?
        </h2>
        <p className="text-lg mb-8 max-w-lg mx-auto text-blue-200">
          Get started with a free trial today, or schedule a personal live walkthrough demo with our team.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register"
            className="px-8 py-3.5 rounded-xl font-bold text-base text-white transition-all hover:-translate-y-0.5"
            style={{ background:'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow:'0 8px 24px rgba(37,99,235,.4)' }}>
            Start Free Trial
          </Link>
          <a href="mailto:hello@wolfstack.io?subject=Book%20a%20Demo%20-%20EduStack%20PK"
            className="px-8 py-3.5 rounded-xl text-white font-semibold text-base transition-all hover:bg-white/10 bg-white/[0.08] border border-white/[0.12]"
            >
            Book a Live Demo
          </a>
        </div>
        <p className="mt-6 text-xs text-gray-500">
          No credit card required &middot; Full access &middot; Set up in 5 minutes
        </p>
      </div>
    </section>
  );
}

// Footer

function FooterSection() {
  return (
    <footer className="bg-gray-950 text-gray-400 py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
              <span className="font-extrabold text-white text-lg">EduStack <span className="text-blue-500">PK</span></span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed mb-3">
              Pakistan's School and College ERP SaaS. Built by WolfStack.
            </p>
            <div className="text-sm text-gray-600">Made in Pakistan</div>
          </div>
          <div>
            <div className="font-semibold text-white text-sm mb-5">Platform</div>
            <ul className="space-y-3 text-sm">
              {[['#problem','The Problem'],['#features','How We Fix It'],['#pricing','Pricing'],['#faq','FAQ']].map(([href,label]) => (
                <li key={href}><a href={href} className="hover:text-white transition-colors">{label}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-semibold text-white text-sm mb-5">Modules</div>
            <ul className="space-y-3 text-sm text-gray-500">
              {['Attendance','Fee Management','Exams and Results','Payroll','Admissions','Website Builder','Mobile App'].map(m => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-semibold text-white text-sm mb-5">Company</div>
            <ul className="space-y-3 text-sm">
              <li><Link to="/register" className="hover:text-white transition-colors">Register School</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              <li><a href="mailto:hello@wolfstack.io" className="hover:text-white transition-colors">hello@wolfstack.io</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <p>&copy; {new Date().getFullYear()} WolfStack. All rights reserved.</p>
          <p>EduStack PK - School and College ERP for Pakistan</p>
        </div>
      </div>
    </footer>
  );
}

// Main Page

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(() => window.scrollY > 40);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans antialiased">
      <Navbar scrolled={scrolled} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <HeroSection />
      <ImpactStatsSection />
      <WhyEduStackSection />
      <PainStatsSection />
      <HowItWorksSection />
      <PerfectForYouSection />
      <FeaturesShowcase />
      <RolesSection />
      <SecurityTrustSection />
      <PaymentsSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection openFaq={openFaq} setOpenFaq={setOpenFaq} />
      <CTASection />
      <FooterSection />
    </div>
  );
}
