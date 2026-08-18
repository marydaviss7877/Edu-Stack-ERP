import { QRCodeCanvas } from 'qrcode.react';
import type { TemplateElement } from '../../services/documentTemplateService';

/**
 * Renders what a single template element looks like, independent of whether it's
 * sitting inside a static export view or an interactive <Rnd> wrapper in the designer.
 * `value` is the already-resolved display value (literal text, image URL, or QR payload).
 * fontSize/x/y/width/height on the element are stored in mm; `scale` is px-per-mm so the
 * same template renders identically on-screen and inside the html2canvas export capture.
 */
export function renderElementContent(el: TemplateElement, value: string, scale: number): React.ReactNode {
  switch (el.type) {
    case 'text':
    case 'field': {
      const display = el.type === 'text' ? (el.text ?? '') : value;
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
            textAlign: el.align ?? 'left',
            fontSize: `${(el.fontSize ?? 3.2) * scale}px`,
            fontWeight: el.fontWeight ?? 'normal',
            fontStyle: el.fontStyle ?? 'normal',
            color: el.color ?? '#111111',
            lineHeight: el.lineHeight ?? 1.2,
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
            wordBreak: 'break-word',
            fontFamily: 'Helvetica, Arial, sans-serif',
          }}
        >
          {display || (el.type === 'field' ? `{{${el.field}}}` : '')}
        </div>
      );
    }

    case 'image': {
      if (!value) {
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#f0f4fc', border: '1px dashed #c8d2e6', color: '#a8b4cc',
            fontSize: `${2.4 * scale}px`, fontFamily: 'Helvetica, Arial, sans-serif',
          }}>
            IMAGE
          </div>
        );
      }
      return (
        <img
          src={value}
          crossOrigin="anonymous"
          alt=""
          style={{ width: '100%', height: '100%', objectFit: el.fit ?? 'cover', borderRadius: el.radius ? `${el.radius * scale}px` : 0 }}
        />
      );
    }

    case 'qr': {
      const size = Math.round(Math.min(el.width, el.height) * scale);
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
          <QRCodeCanvas value={value || 'preview'} size={size} level="M" includeMargin={false} />
        </div>
      );
    }

    case 'rect':
      return (
        <div style={{
          width: '100%', height: '100%',
          background: el.fill ?? 'transparent',
          border: el.stroke ? `${scale * 0.3}px solid ${el.stroke}` : 'none',
          borderRadius: el.radius ? `${el.radius * scale}px` : 0,
          opacity: el.opacity ?? 1,
        }} />
      );

    default:
      return null;
  }
}
