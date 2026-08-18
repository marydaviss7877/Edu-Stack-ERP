import type { TemplatePage, TemplateKind, ElementType } from '../services/documentTemplateService';

export interface PagePreset { id: string; label: string; page: TemplatePage; }

export const ID_CARD_PRESETS: PagePreset[] = [
  { id: 'cr80-landscape', label: 'CR80 Landscape (85.6 × 54 mm)', page: { width: 85.6, height: 54, orientation: 'landscape', background: '#ffffff' } },
  { id: 'cr80-portrait', label: 'CR80 Portrait (54 × 85.6 mm)', page: { width: 54, height: 85.6, orientation: 'portrait', background: '#ffffff' } },
];

export const CERTIFICATE_PRESETS: PagePreset[] = [
  { id: 'a4-portrait', label: 'A4 Portrait (210 × 297 mm)', page: { width: 210, height: 297, orientation: 'portrait', background: '#ffffff' } },
  { id: 'a4-landscape', label: 'A4 Landscape (297 × 210 mm)', page: { width: 297, height: 210, orientation: 'landscape', background: '#ffffff' } },
];

export function presetsForKind(kind: TemplateKind): PagePreset[] {
  return kind === 'certificate' ? CERTIFICATE_PRESETS : ID_CARD_PRESETS;
}

/** Sensible default box size (mm) for a freshly-added element, scaled a bit for the bigger certificate canvas. */
export function defaultElementBox(kind: TemplateKind, type: ElementType): { width: number; height: number } {
  const big = kind === 'certificate';
  switch (type) {
    case 'image': return { width: big ? 30 : 18, height: big ? 30 : 22 };
    case 'qr': return { width: big ? 25 : 13, height: big ? 25 : 13 };
    case 'rect': return { width: big ? 60 : 30, height: big ? 15 : 8 };
    default: return { width: big ? 80 : 40, height: big ? 10 : 6 };
  }
}
