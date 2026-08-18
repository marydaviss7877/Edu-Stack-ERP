import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import TemplateStaticView from '../components/templates/TemplateStaticView';
import type { TemplatePage, TemplateElement } from '../services/documentTemplateService';

const CAPTURE_SCALE = 6; // px per mm — high enough for crisp print output

/** Renders a template off-screen (with real image loads awaited) and rasterizes it to a PNG data URL. */
async function renderToDataUrl(page: TemplatePage, elements: TemplateElement[], data: Record<string, string>): Promise<string> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  document.body.appendChild(container);

  const root = createRoot(container);
  await new Promise<void>((resolve) => {
    root.render(<TemplateStaticView page={page} elements={elements} data={data} scale={CAPTURE_SCALE} />);
    // Give React a tick to commit before we read the DOM
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(images.map((img) => img.complete ? Promise.resolve() : new Promise<void>((res) => {
    img.onload = () => res();
    img.onerror = () => res();
    setTimeout(() => res(), 4000);
  })));

  const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
    scale: 1, useCORS: true, backgroundColor: page.background || '#ffffff', logging: false,
  });
  const dataUrl = canvas.toDataURL('image/png');

  root.unmount();
  document.body.removeChild(container);
  return dataUrl;
}

export interface ExportItem {
  data: Record<string, string>;
}

/** One document per subject, each its own PDF page sized exactly to the template's page dimensions. */
export async function exportDocumentsPdf(page: TemplatePage, elements: TemplateElement[], items: ExportItem[], filename: string): Promise<void> {
  const pdf = new jsPDF({ orientation: page.orientation, unit: 'mm', format: [page.width, page.height] });

  for (let i = 0; i < items.length; i++) {
    if (i > 0) pdf.addPage([page.width, page.height], page.orientation);
    const dataUrl = await renderToDataUrl(page, elements, items[i].data);
    pdf.addImage(dataUrl, 'PNG', 0, 0, page.width, page.height);
  }

  pdf.save(filename);
}

/** Multiple small cards tiled onto A4 print sheets — the realistic way ID cards get printed and cut. */
export async function exportCardsPdf(page: TemplatePage, elements: TemplateElement[], items: ExportItem[], filename: string): Promise<void> {
  const A4_W = 210;
  const A4_H = 297;
  const margin = 10;
  const gutter = 5;

  const cols = Math.max(1, Math.floor((A4_W - margin * 2 + gutter) / (page.width + gutter)));
  const rows = Math.max(1, Math.floor((A4_H - margin * 2 + gutter) / (page.height + gutter)));
  const perPage = cols * rows;

  const gridW = cols * page.width + (cols - 1) * gutter;
  const gridH = rows * page.height + (rows - 1) * gutter;
  const startX = (A4_W - gridW) / 2;
  const startY = (A4_H - gridH) / 2;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  for (let i = 0; i < items.length; i++) {
    const posInPage = i % perPage;
    if (i > 0 && posInPage === 0) pdf.addPage('a4', 'portrait');

    const col = posInPage % cols;
    const row = Math.floor(posInPage / cols);
    const x = startX + col * (page.width + gutter);
    const y = startY + row * (page.height + gutter);

    const dataUrl = await renderToDataUrl(page, elements, items[i].data);
    pdf.addImage(dataUrl, 'PNG', x, y, page.width, page.height);
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineDashPattern([1, 1], 0);
    pdf.rect(x, y, page.width, page.height);
    pdf.setLineDashPattern([], 0);
  }

  pdf.save(filename);
}
