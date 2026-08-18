import { Rnd } from 'react-rnd';
import type { TemplatePage, TemplateElement } from '../../services/documentTemplateService';
import { renderElementContent } from './elementContent';

interface Props {
  page: TemplatePage;
  elements: TemplateElement[];
  data: Record<string, string>;
  scale: number; // px per mm
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (elements: TemplateElement[]) => void;
}

export default function TemplateDesignerCanvas({ page, elements, data, scale, selectedId, onSelect, onChange }: Props) {
  const w = page.width * scale;
  const h = page.height * scale;

  function updateElement(id: string, patch: Partial<TemplateElement>) {
    onChange(elements.map((el) => (el.id === id ? { ...el, ...patch } : el)));
  }

  return (
    <div
      onClick={() => onSelect(null)}
      style={{
        position: 'relative',
        width: `${w}px`,
        height: `${h}px`,
        background: page.background || '#ffffff',
        backgroundImage: page.backgroundImageUrl ? `url(${page.backgroundImageUrl})` : undefined,
        backgroundSize: 'cover',
        overflow: 'hidden',
        boxSizing: 'border-box',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }}
    >
      {elements.map((el) => {
        const isSelected = el.id === selectedId;
        const value = el.type === 'field' || el.type === 'qr' ? (data[el.field ?? ''] ?? '') : (el.type === 'image' ? (el.field ? data[el.field] ?? '' : el.src ?? '') : '');
        return (
          <Rnd
            key={el.id}
            bounds="parent"
            size={{ width: el.width * scale, height: el.height * scale }}
            position={{ x: el.x * scale, y: el.y * scale }}
            onDragStop={(_e, d) => updateElement(el.id, { x: d.x / scale, y: d.y / scale })}
            onResizeStop={(_e, _dir, ref, _delta, pos) => {
              updateElement(el.id, {
                width: ref.offsetWidth / scale,
                height: ref.offsetHeight / scale,
                x: pos.x / scale,
                y: pos.y / scale,
              });
            }}
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onSelect(el.id); }}
            style={{
              outline: isSelected ? '1.5px solid #2563eb' : '1px dashed rgba(100,116,139,0.4)',
              cursor: 'move',
            }}
          >
            <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
              {renderElementContent(el, value, scale)}
            </div>
          </Rnd>
        );
      })}
    </div>
  );
}
