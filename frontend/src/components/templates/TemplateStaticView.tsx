import type { TemplatePage, TemplateElement } from '../../services/documentTemplateService';
import { renderElementContent } from './elementContent';

interface Props {
  page: TemplatePage;
  elements: TemplateElement[];
  data: Record<string, string>;
  scale: number; // px per mm
}

/**
 * Pure, non-interactive render of a template + resolved data. Used for the live
 * preview panel in the designer, and as the off-screen node captured by html2canvas
 * when exporting to PDF — every style here is an inline hex value on purpose, since
 * html2canvas cannot parse Tailwind's oklch() CSS variables.
 */
export default function TemplateStaticView({ page, elements, data, scale }: Props) {
  const w = page.width * scale;
  const h = page.height * scale;

  return (
    <div
      style={{
        position: 'relative',
        width: `${w}px`,
        height: `${h}px`,
        background: page.background || '#ffffff',
        backgroundImage: page.backgroundImageUrl ? `url(${page.backgroundImageUrl})` : undefined,
        backgroundSize: 'cover',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {elements.map((el) => {
        const value = el.type === 'field' || el.type === 'qr' ? (data[el.field ?? ''] ?? '') : (el.type === 'image' ? (el.field ? data[el.field] ?? '' : el.src ?? '') : '');
        return (
          <div
            key={el.id}
            style={{
              position: 'absolute',
              left: `${el.x * scale}px`,
              top: `${el.y * scale}px`,
              width: `${el.width * scale}px`,
              height: `${el.height * scale}px`,
              transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
            }}
          >
            {renderElementContent(el, value, scale)}
          </div>
        );
      })}
    </div>
  );
}
