import { useState } from 'react';

const SWH_APP_URL = 'https://swh.tws.enterprises';
const EDU_APP_URL = 'https://edu.tws.enterprises';

const PRODUCTS = [
  {
    id: 'edu',
    name: 'EduStack PK',
    tagline: 'School & College ERP',
    desc: 'Complete school management — attendance, timetable, exams, fees, payroll, and more. Built for Pakistani institutions with JazzCash & EasyPaisa built in.',
    status: 'live' as const,
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
    color: 'blue',
    href: EDU_APP_URL,
  },
  {
    id: 'hospital',
    name: 'MediStack PK',
    tagline: 'Hospital & Clinic ERP',
    desc: 'Patient management, OPD/IPD, pharmacy, lab, billing, and staff payroll. Designed for hospitals and clinics across Pakistan.',
    status: 'soon' as const,
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    color: 'red',
    href: null,
  },
  {
    id: 'hr',
    name: 'HRStack PK',
    tagline: 'HR & Payroll ERP',
    desc: 'Employee onboarding, attendance, leave management, payroll processing, appraisals, and compliance — all in one platform.',
    status: 'soon' as const,
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: 'violet',
    href: null,
  },
];

const SERVICES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Custom ERP Development',
    desc: 'End-to-end ERP systems tailored to your industry — HR, finance, inventory, operations, and more.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Web & Mobile Apps',
    desc: 'Production-grade web apps with React and mobile apps with Flutter — shipped fast, built to scale.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'API & Integrations',
    desc: 'REST and WebSocket APIs, third-party integrations (payment gateways, SMS, email, Firebase), and microservices.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
    title: 'Cloud & DevOps',
    desc: 'Railway, Vercel, AWS deployments. CI/CD pipelines, monitoring, multi-tenant infrastructure, and auto-scaling.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Security & Compliance',
    desc: 'RBAC, JWT auth, data encryption, audit logs, multi-tenant isolation, and production hardening.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'Team Augmentation',
    desc: 'Embed WolfStack engineers directly into your team. Sprint-ready, senior-level developers available immediately.',
  },
];

const STACK = [
  { name: 'React', icon: '⚛️' },
  { name: 'Node.js', icon: '🟢' },
  { name: 'MongoDB', icon: '🍃' },
  { name: 'Express', icon: '🚀' },
  { name: 'Flutter', icon: '💙' },
  { name: 'TypeScript', icon: '🔷' },
  { name: 'Redis', icon: '🔴' },
  { name: 'Socket.IO', icon: '⚡' },
];

const COLOR_MAP = {
  blue:   { icon: 'bg-blue-600',   badge: 'bg-blue-100 text-blue-700',     ring: 'ring-blue-100' },
  red:    { icon: 'bg-red-500',    badge: 'bg-red-100 text-red-600',       ring: 'ring-red-100' },
  violet: { icon: 'bg-violet-600', badge: 'bg-violet-100 text-violet-700', ring: 'ring-violet-100' },
};

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans antialiased">

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <span className="font-extrabold text-lg tracking-tight">Wolf<span className="text-amber-500">Stack</span></span>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-500">
            <a href="#services"  className="hover:text-gray-900 transition-colors">Services</a>
            <a href="#products"  className="hover:text-gray-900 transition-colors">Products</a>
            <a href="#stack"     className="hover:text-gray-900 transition-colors">Tech Stack</a>
            <a href="#about"     className="hover:text-gray-900 transition-colors">About</a>
            <a href="#contact"   className="hover:text-gray-900 transition-colors">Contact</a>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <a
              href={SWH_APP_URL}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Software House ERP
            </a>
            <a
              href={EDU_APP_URL}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold transition-colors shadow shadow-amber-500/20"
            >
              EduStack PK →
            </a>
          </div>

          <button
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-3 text-sm font-medium text-gray-600">
            <a href="#services"  onClick={() => setMenuOpen(false)} className="py-1 hover:text-gray-900">Services</a>
            <a href="#products"  onClick={() => setMenuOpen(false)} className="py-1 hover:text-gray-900">Products</a>
            <a href="#stack"     onClick={() => setMenuOpen(false)} className="py-1 hover:text-gray-900">Tech Stack</a>
            <a href="#about"     onClick={() => setMenuOpen(false)} className="py-1 hover:text-gray-900">About</a>
            <a href="#contact"   onClick={() => setMenuOpen(false)} className="py-1 hover:text-gray-900">Contact</a>
            <a href={SWH_APP_URL} className="mt-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-center font-semibold hover:bg-gray-50">
              Software House ERP
            </a>
            <a href={EDU_APP_URL} className="px-4 py-2.5 rounded-xl bg-amber-500 text-white text-center font-bold">
              EduStack PK →
            </a>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gray-950 text-white">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-28 lg:pt-32 lg:pb-36 text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-gray-400 mb-7">
            <span className="w-2 h-2 bg-amber-400 rounded-full" />
            Software House — Lahore, Pakistan
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-none mb-6">
            We build <span className="text-amber-400">ERP platforms</span>
            <br />for Pakistan.
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-400 leading-relaxed mb-10">
            WolfStack designs and ships modern, cloud-based ERP products tailored for Pakistani businesses and institutions — from schools to hospitals to enterprises.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#products"
              className="px-8 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-base transition-colors shadow-xl shadow-amber-500/20"
            >
              Explore Our Products
            </a>
            <a
              href={SWH_APP_URL}
              className="px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-base transition-colors backdrop-blur"
            >
              Software House ERP →
            </a>
            <a
              href="#contact"
              className="px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-semibold text-base transition-colors"
            >
              Get in Touch
            </a>
          </div>
        </div>
      </section>

      {/* ── SOFTWARE HOUSE SECTION ── */}
      <section id="services" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14">
            <div>
              <span className="text-amber-500 font-semibold text-sm uppercase tracking-wide">Software House</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                We don't just sell products.
                <br />We build yours too.
              </h2>
              <p className="mt-3 text-gray-500 text-lg max-w-xl">
                WolfStack is a full-service software house. Beyond our own ERP products, we take on custom projects — web apps, mobile apps, APIs, and enterprise systems — for clients across Pakistan.
              </p>
            </div>
            <a
              href={SWH_APP_URL}
              className="shrink-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm transition-colors shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Open Software House ERP
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map((s) => (
              <div
                key={s.title}
                className="flex gap-4 p-6 rounded-2xl border border-gray-100 hover:border-amber-100 hover:bg-amber-50/30 transition-colors"
              >
                <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                  {s.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Software house ERP highlight banner */}
          <div className="mt-12 rounded-3xl bg-gray-950 text-white p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 text-xs font-semibold uppercase tracking-wide">Live System</span>
              </div>
              <h3 className="text-xl font-extrabold mb-1">WolfStack runs on its own ERP</h3>
              <p className="text-gray-400 text-sm max-w-lg">
                Our internal software house operations — projects, clients, team attendance, HR, invoicing, and payroll — are managed through our own custom-built ERP system at <span className="text-amber-400 font-medium">swh.tws.enterprises</span>.
              </p>
            </div>
            <a
              href={SWH_APP_URL}
              className="shrink-0 px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm transition-colors shadow-lg shadow-amber-500/20 whitespace-nowrap"
            >
              Access Software House ERP →
            </a>
          </div>
        </div>
      </section>

      {/* ── PRODUCTS ── */}
      <section id="products" className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-amber-500 font-semibold text-sm uppercase tracking-wide">Our Products</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Industry-specific ERP platforms
            </h2>
            <p className="mt-3 text-gray-500 text-lg max-w-xl mx-auto">
              Each product is a fully-featured, cloud-hosted platform built for a specific industry in Pakistan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRODUCTS.map((p) => {
              const c = COLOR_MAP[p.color as keyof typeof COLOR_MAP];
              return (
                <div
                  key={p.id}
                  className={`rounded-3xl border bg-white p-7 flex flex-col ring-1 ${c.ring} hover:shadow-xl transition-all duration-200 hover:-translate-y-1 ${p.status === 'soon' ? 'opacity-70' : ''}`}
                >
                  <div className={`w-14 h-14 ${c.icon} rounded-2xl flex items-center justify-center text-white mb-5 shadow-lg`}>
                    {p.icon}
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-extrabold text-gray-900">{p.name}</h3>
                    {p.status === 'live' ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Live</span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Coming Soon</span>
                    )}
                  </div>

                  <p className={`text-sm font-semibold mb-3 ${c.badge.split(' ')[1]}`}>{p.tagline}</p>
                  <p className="text-gray-500 text-sm leading-relaxed flex-1">{p.desc}</p>

                  <div className="mt-6">
                    {p.href ? (
                      <a
                        href={p.href}
                        className={`inline-flex items-center gap-1.5 text-sm font-bold ${c.badge.split(' ')[1]} hover:underline`}
                      >
                        Visit {p.name}
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium">In development</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TECH STACK ── */}
      <section id="stack" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-amber-500 font-semibold text-sm uppercase tracking-wide">Technology</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Modern stack. Production-grade.
            </h2>
            <p className="mt-3 text-gray-500 text-lg max-w-lg mx-auto">
              Every WolfStack product is built on a battle-tested, cloud-native technology stack.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {STACK.map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <span className="text-xl">{s.icon}</span>
                {s.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="py-20 lg:py-28 bg-gray-950 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-amber-500 font-semibold text-sm uppercase tracking-wide">About WolfStack</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
              Built by Pakistanis, for Pakistan.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '🇵🇰', title: 'Pakistan First', desc: 'Every product is designed around Pakistani workflows, payment methods (JazzCash, EasyPaisa), and regulatory requirements.' },
              { icon: '☁️',  title: 'Cloud-Native',   desc: 'Multi-tenant SaaS architecture. Each organisation gets an isolated subdomain and data environment. No shared databases.' },
              { icon: '📱',  title: 'Mobile-Ready',   desc: 'Every platform ships with a Flutter mobile app for Android and iOS, so staff and students can work from anywhere.' },
            ].map((item) => (
              <div key={item.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-bold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="py-20 lg:py-28 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-amber-500 font-semibold text-sm uppercase tracking-wide">Contact</span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
            Want to work with us?
          </h2>
          <p className="text-gray-500 text-lg mb-8">
            Whether you need a custom ERP, want to partner, or just have a question — reach out.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:hello@tws.enterprises"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              hello@tws.enterprises
            </a>
            <a
              href={SWH_APP_URL}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl border-2 border-gray-900 text-gray-900 font-bold hover:bg-gray-50 transition-colors"
            >
              Software House ERP →
            </a>
            <a
              href={EDU_APP_URL}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl border-2 border-amber-500 text-amber-600 font-bold hover:bg-amber-50 transition-colors"
            >
              Try EduStack PK →
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-950 text-gray-500 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-amber-500 rounded-md flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <span className="font-bold text-white text-sm">WolfStack</span>
          </div>

          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            <a href={SWH_APP_URL} className="hover:text-white transition-colors">Software House ERP</a>
            <a href={EDU_APP_URL} className="hover:text-white transition-colors">EduStack PK</a>
            <a href="#services"   className="hover:text-white transition-colors">Services</a>
            <a href="#about"      className="hover:text-white transition-colors">About</a>
            <a href="#contact"    className="hover:text-white transition-colors">Contact</a>
          </nav>

          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} WolfStack. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
