const BASE = import.meta.env.VITE_BASE_DOMAIN ?? 'edu.tws.enterprises';

export const BASE_DOMAIN = BASE;

// Subdomains that are never org slugs
const RESERVED = new Set(['admin', 'api', 'www', 'app']);

export function getOrgSlug(): string | null {
  const host = window.location.hostname;
  if (host === 'localhost' || /^\d/.test(host)) return null;
  if (host === BASE || host === `www.${BASE}`) return null;
  if (!host.endsWith(`.${BASE}`)) return null;
  const sub = host.slice(0, -(BASE.length + 1));
  if (RESERVED.has(sub)) return null;
  return sub;
}

export function isAdminDomain(): boolean {
  const host = window.location.hostname;
  return host === `admin.${BASE}` || host === 'localhost';
}

export function schoolUrl(slug: string, path = ''): string {
  return `https://${slug}.${BASE}${path}`;
}

export function adminLoginUrl(): string {
  return `https://admin.${BASE}/login`;
}
