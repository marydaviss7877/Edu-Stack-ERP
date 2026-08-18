import type { TemplateElement, TemplatePage } from '../services/documentTemplateService';

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  page: TemplatePage;
  elements: TemplateElement[];
}

function newElementId(): string {
  return `el_${Math.random().toString(36).slice(2, 10)}`;
}

const CARD_PAGE: TemplatePage = { width: 85.6, height: 54, orientation: 'landscape', background: '#ffffff' };

function textEl(overrides: Partial<TemplateElement>): TemplateElement {
  return { id: newElementId(), type: 'text', x: 0, y: 0, width: 10, height: 5, fontSize: 3.2, color: '#111111', align: 'left', ...overrides };
}
function fieldEl(overrides: Partial<TemplateElement>): TemplateElement {
  return { id: newElementId(), type: 'field', x: 0, y: 0, width: 10, height: 5, fontSize: 3.2, color: '#111111', align: 'left', ...overrides };
}
function imageEl(overrides: Partial<TemplateElement>): TemplateElement {
  return { id: newElementId(), type: 'image', x: 0, y: 0, width: 10, height: 10, fit: 'cover', ...overrides };
}
function rectEl(overrides: Partial<TemplateElement>): TemplateElement {
  return { id: newElementId(), type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: '#2563eb', radius: 0, opacity: 1, ...overrides };
}
function qrEl(overrides: Partial<TemplateElement>): TemplateElement {
  return { id: newElementId(), type: 'qr', x: 0, y: 0, width: 10, height: 10, ...overrides };
}

/**
 * Starting points for the student ID card designer — every element below binds to the
 * same field/style schema as the manual editor, so once picked they're fully personalizable
 * (colors, fonts, positions, images) rather than being a fixed, unchangeable look.
 */
export const STUDENT_ID_CARD_STARTERS: StarterTemplate[] = [
  {
    id: 'navy-classic',
    name: 'Navy Classic',
    description: 'Formal header band, framed photo, and a clean detail grid.',
    accentColor: '#1e3a8a',
    page: CARD_PAGE,
    elements: [
      rectEl({ x: 0, y: 0, width: 85.6, height: 15.6, fill: '#1e3a8a' }),
      rectEl({ x: 0, y: 15.6, width: 85.6, height: 0.8, fill: '#c9a227' }),
      imageEl({ field: 'org.logo', x: 3, y: 2.6, width: 8, height: 8, fit: 'contain' }),
      fieldEl({ field: 'org.name', x: 12.5, y: 1.6, width: 57, height: 7.2, fontSize: 2.7, fontWeight: 'bold', color: '#ffffff', lineHeight: 1.1 }),
      textEl({ text: 'STUDENT IDENTITY CARD', x: 12.5, y: 10.8, width: 57, height: 3, fontSize: 1.7, color: '#a9bbdd' }),
      rectEl({ x: 3.5, y: 18.6, width: 20, height: 22.4, fill: '#ffffff', stroke: '#1e3a8a', radius: 1.5 }),
      imageEl({ field: 'student.photo', x: 4.3, y: 19.4, width: 18.4, height: 20.8, fit: 'cover', radius: 1 }),
      fieldEl({ field: 'student.name', x: 26, y: 18.8, width: 57, height: 6, fontSize: 3.9, fontWeight: 'bold', color: '#111827' }),
      textEl({ text: 'CLASS / SEC', x: 26, y: 25.8, width: 20, height: 3, fontSize: 1.7, color: '#6b7280' }),
      fieldEl({ field: 'student.class', x: 26, y: 28.6, width: 20, height: 4.3, fontSize: 2.6, fontWeight: 'bold', color: '#1f2937' }),
      textEl({ text: '/', x: 46, y: 28.6, width: 4, height: 4.3, fontSize: 2.6, color: '#9ca3af', align: 'center' }),
      fieldEl({ field: 'student.section', x: 50, y: 28.6, width: 10, height: 4.3, fontSize: 2.6, fontWeight: 'bold', color: '#1f2937' }),
      textEl({ text: 'ROLL NO.', x: 26, y: 34, width: 20, height: 3, fontSize: 1.7, color: '#6b7280' }),
      fieldEl({ field: 'student.rollNo', x: 26, y: 36.8, width: 20, height: 4.3, fontSize: 2.6, fontWeight: 'bold', color: '#1f2937' }),
      rectEl({ x: 4, y: 42.2, width: 60, height: 0.35, fill: '#e5e7eb' }),
      textEl({ text: 'BLOOD GROUP', x: 4, y: 43.6, width: 22, height: 3, fontSize: 1.6, color: '#6b7280' }),
      fieldEl({ field: 'student.bloodGroup', x: 4, y: 46.3, width: 22, height: 4.3, fontSize: 2.8, fontWeight: 'bold', color: '#b91c1c' }),
      textEl({ text: 'EMERGENCY CONTACT', x: 26, y: 43.6, width: 32, height: 3, fontSize: 1.6, color: '#6b7280' }),
      fieldEl({ field: 'guardian.phone', x: 26, y: 46.3, width: 30, height: 4.1, fontSize: 2.4, color: '#1f2937' }),
      qrEl({ field: 'issue.qr', x: 69.5, y: 40.3, width: 11.7, height: 11.7 }),
      fieldEl({ field: 'issue.serialNo', x: 62, y: 52.3, width: 20, height: 1.4, fontSize: 1.1, color: '#9ca3af', align: 'center' }),
    ],
  },
  {
    id: 'sunrise-modern',
    name: 'Sunrise Modern',
    description: 'Coral header with a photo that breaks the banner, plus a soft class pill.',
    accentColor: '#fb7185',
    page: CARD_PAGE,
    elements: [
      rectEl({ x: 0, y: 0, width: 85.6, height: 11, fill: '#fb7185' }),
      rectEl({ x: 0, y: 11, width: 42, height: 4.2, fill: '#0d9488' }),
      rectEl({ x: 72, y: 1, width: 9, height: 9, fill: '#ffffff', radius: 4.5 }),
      imageEl({ field: 'org.logo', x: 73, y: 2, width: 7, height: 7, fit: 'contain' }),
      fieldEl({ field: 'org.name', x: 28, y: 0.6, width: 41, height: 6.8, fontSize: 2.5, fontWeight: 'bold', color: '#ffffff', lineHeight: 1.05 }),
      textEl({ text: 'STUDENT ID CARD', x: 28, y: 7.6, width: 41, height: 2.6, fontSize: 1.5, color: '#ffe4e6' }),
      rectEl({ x: 3.5, y: 6, width: 23, height: 23, fill: '#ffffff', radius: 11.5 }),
      imageEl({ field: 'student.photo', x: 4.7, y: 7.2, width: 20.6, height: 20.6, fit: 'cover', radius: 10.3 }),
      fieldEl({ field: 'student.name', x: 4, y: 29, width: 77.6, height: 6, fontSize: 4.4, fontWeight: 'bold', color: '#111827' }),
      rectEl({ x: 4, y: 35.8, width: 28, height: 5.2, fill: '#fff1f2', radius: 2.6 }),
      fieldEl({ field: 'student.class', x: 6, y: 36.7, width: 12, height: 3.6, fontSize: 2.4, fontWeight: 'bold', color: '#e11d48' }),
      rectEl({ x: 18.3, y: 37, width: 0.3, height: 3, fill: '#fda4af' }),
      fieldEl({ field: 'student.section', x: 19.5, y: 36.7, width: 10, height: 3.6, fontSize: 2.4, fontWeight: 'bold', color: '#e11d48' }),
      textEl({ text: 'ROLL NO.', x: 35, y: 36.2, width: 20, height: 3, fontSize: 1.7, color: '#6b7280' }),
      fieldEl({ field: 'student.rollNo', x: 35, y: 39, width: 20, height: 4, fontSize: 2.6, fontWeight: 'bold', color: '#111827' }),
      rectEl({ x: 4, y: 44.3, width: 60, height: 0.35, fill: '#e5e7eb' }),
      textEl({ text: 'BLOOD GROUP', x: 4, y: 46, width: 20, height: 3, fontSize: 1.6, color: '#6b7280' }),
      fieldEl({ field: 'student.bloodGroup', x: 4, y: 48.8, width: 20, height: 4, fontSize: 2.6, fontWeight: 'bold', color: '#e11d48' }),
      textEl({ text: 'GUARDIAN PHONE', x: 27, y: 46, width: 34, height: 3, fontSize: 1.6, color: '#6b7280' }),
      fieldEl({ field: 'guardian.phone', x: 27, y: 48.8, width: 34, height: 4, fontSize: 2.3, color: '#111827' }),
      qrEl({ field: 'issue.qr', x: 67.5, y: 38, width: 13.5, height: 13.5 }),
      fieldEl({ field: 'issue.serialNo', x: 64, y: 52, width: 18, height: 1.6, fontSize: 1.1, color: '#9ca3af', align: 'center' }),
    ],
  },
  {
    id: 'mono-minimal',
    name: 'Mono Minimal',
    description: 'Editorial and understated — a single accent stripe and thin rules.',
    accentColor: '#10b981',
    page: CARD_PAGE,
    elements: [
      rectEl({ x: 0, y: 0, width: 4, height: 54, fill: '#10b981' }),
      imageEl({ field: 'org.logo', x: 8, y: 4, width: 8, height: 8, fit: 'contain' }),
      fieldEl({ field: 'org.name', x: 18, y: 4.5, width: 45, height: 4.5, fontSize: 2.6, fontWeight: 'bold', color: '#111827' }),
      textEl({ text: 'STUDENT', x: 66, y: 4.5, width: 16, height: 3, fontSize: 1.8, color: '#9ca3af', align: 'right' }),
      rectEl({ x: 8, y: 13, width: 70, height: 0.3, fill: '#e5e7eb' }),
      imageEl({ field: 'student.photo', x: 8, y: 16, width: 16, height: 16, fit: 'cover', radius: 0.5 }),
      fieldEl({ field: 'student.name', x: 28, y: 16.5, width: 50, height: 6, fontSize: 4, fontWeight: 'bold', color: '#111827' }),
      textEl({ text: 'CLASS', x: 28, y: 23.5, width: 14, height: 3, fontSize: 1.7, color: '#9ca3af' }),
      fieldEl({ field: 'student.class', x: 28, y: 26.3, width: 20, height: 4, fontSize: 2.6, color: '#111827' }),
      textEl({ text: 'SECTION', x: 46, y: 23.5, width: 14, height: 3, fontSize: 1.7, color: '#9ca3af' }),
      fieldEl({ field: 'student.section', x: 46, y: 26.3, width: 12, height: 4, fontSize: 2.6, color: '#111827' }),
      textEl({ text: 'ROLL NO', x: 60, y: 23.5, width: 20, height: 3, fontSize: 1.7, color: '#9ca3af' }),
      fieldEl({ field: 'student.rollNo', x: 60, y: 26.3, width: 18, height: 4, fontSize: 2.6, color: '#111827' }),
      rectEl({ x: 8, y: 32.5, width: 70, height: 0.3, fill: '#e5e7eb' }),
      textEl({ text: 'DATE OF BIRTH', x: 8, y: 34.3, width: 24, height: 3, fontSize: 1.6, color: '#9ca3af' }),
      fieldEl({ field: 'student.dob', x: 8, y: 37, width: 26, height: 4, fontSize: 2.3, color: '#374151' }),
      textEl({ text: 'BLOOD GROUP', x: 36, y: 34.3, width: 20, height: 3, fontSize: 1.6, color: '#9ca3af' }),
      fieldEl({ field: 'student.bloodGroup', x: 36, y: 37, width: 18, height: 4, fontSize: 2.3, fontWeight: 'bold', color: '#111827' }),
      rectEl({ x: 8, y: 42.8, width: 70, height: 0.3, fill: '#e5e7eb' }),
      textEl({ text: 'GUARDIAN CONTACT', x: 8, y: 44.2, width: 40, height: 2.6, fontSize: 1.5, color: '#9ca3af' }),
      fieldEl({ field: 'guardian.phone', x: 8, y: 46.7, width: 40, height: 4, fontSize: 2.2, color: '#374151' }),
      qrEl({ field: 'issue.qr', x: 68, y: 40, width: 10, height: 10 }),
      fieldEl({ field: 'issue.serialNo', x: 8, y: 50, width: 40, height: 3, fontSize: 1.4, color: '#9ca3af' }),
    ],
  },
  {
    id: 'split-panel-bold',
    name: 'Split Panel Bold',
    description: 'A bold color-blocked panel for the photo, with structured details alongside.',
    accentColor: '#4338ca',
    page: CARD_PAGE,
    elements: [
      rectEl({ x: 0, y: 0, width: 28, height: 54, fill: '#4338ca' }),
      rectEl({ x: 4, y: 6, width: 20, height: 20, fill: '#ffffff', radius: 2 }),
      imageEl({ field: 'student.photo', x: 4.8, y: 6.8, width: 18.4, height: 18.4, fit: 'cover', radius: 1.5 }),
      fieldEl({ field: 'student.name', x: 2, y: 28, width: 24, height: 9, fontSize: 2.9, fontWeight: 'bold', color: '#ffffff', align: 'center' }),
      rectEl({ x: 5, y: 37.5, width: 18, height: 4.5, fill: '#6366f1', radius: 2.25 }),
      fieldEl({ field: 'student.class', x: 5, y: 38.3, width: 10, height: 3, fontSize: 2, fontWeight: 'bold', color: '#ffffff', align: 'center' }),
      fieldEl({ field: 'student.section', x: 15, y: 38.3, width: 6, height: 3, fontSize: 2, fontWeight: 'bold', color: '#ffffff', align: 'center' }),
      imageEl({ field: 'org.logo', x: 9, y: 45, width: 10, height: 7, fit: 'contain' }),
      fieldEl({ field: 'org.name', x: 32, y: 4, width: 50, height: 5, fontSize: 3.2, fontWeight: 'bold', color: '#111827' }),
      textEl({ text: 'STUDENT IDENTITY CARD', x: 32, y: 9, width: 50, height: 3, fontSize: 1.8, color: '#6b7280' }),
      rectEl({ x: 32, y: 13.5, width: 49.6, height: 0.3, fill: '#e5e7eb' }),
      textEl({ text: 'ROLL NO.', x: 32, y: 16, width: 16, height: 3, fontSize: 1.8, color: '#9ca3af' }),
      fieldEl({ field: 'student.rollNo', x: 32, y: 19, width: 22, height: 4.5, fontSize: 2.8, fontWeight: 'bold', color: '#111827' }),
      textEl({ text: 'ADMISSION NO.', x: 56, y: 16, width: 25, height: 3, fontSize: 1.8, color: '#9ca3af' }),
      fieldEl({ field: 'student.admissionNo', x: 56, y: 19, width: 25, height: 4.5, fontSize: 2.4, color: '#111827' }),
      textEl({ text: 'DATE OF BIRTH', x: 32, y: 25, width: 20, height: 3, fontSize: 1.8, color: '#9ca3af' }),
      fieldEl({ field: 'student.dob', x: 32, y: 28, width: 24, height: 4.5, fontSize: 2.4, color: '#111827' }),
      textEl({ text: 'BLOOD GROUP', x: 58, y: 25, width: 20, height: 3, fontSize: 1.8, color: '#9ca3af' }),
      fieldEl({ field: 'student.bloodGroup', x: 58, y: 28, width: 20, height: 4.5, fontSize: 2.8, fontWeight: 'bold', color: '#dc2626' }),
      rectEl({ x: 32, y: 34, width: 49.6, height: 0.3, fill: '#e5e7eb' }),
      textEl({ text: 'GUARDIAN', x: 32, y: 36, width: 20, height: 3, fontSize: 1.8, color: '#9ca3af' }),
      fieldEl({ field: 'guardian.name', x: 32, y: 39, width: 32, height: 4, fontSize: 2.4, color: '#111827' }),
      textEl({ text: 'CONTACT', x: 32, y: 43.5, width: 20, height: 3, fontSize: 1.8, color: '#9ca3af' }),
      fieldEl({ field: 'guardian.phone', x: 32, y: 46.5, width: 32, height: 4, fontSize: 2.4, color: '#111827' }),
      qrEl({ field: 'issue.qr', x: 71, y: 39, width: 12, height: 12 }),
      fieldEl({ field: 'issue.serialNo', x: 64, y: 51.5, width: 19, height: 1.8, fontSize: 1.3, color: '#9ca3af', align: 'center' }),
    ],
  },
];

/** Deep-clones a starter's page/elements with freshly generated element ids, so picking the
 * same starter twice in one session never produces two templates sharing element identities. */
export function instantiateStarter(starter: StarterTemplate): { name: string; page: TemplatePage; elements: TemplateElement[] } {
  return {
    name: starter.name,
    page: { ...starter.page },
    elements: starter.elements.map((el) => ({ ...el, id: newElementId() })),
  };
}
