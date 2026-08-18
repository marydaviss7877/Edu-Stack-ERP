import { useState } from 'react';
import type { TemplateElement, TemplateKind } from '../../services/documentTemplateService';
import { fieldsForKind } from '../../lib/templateFields';
import { defaultElementBox } from '../../lib/templatePresets';

interface Props {
  kind: TemplateKind;
  subjectType?: 'student' | 'user';
  onAdd: (el: TemplateElement) => void;
}

function newId(): string {
  return `el_${Math.random().toString(36).slice(2, 10)}`;
}

export default function ElementToolbar({ kind, subjectType, onAdd }: Props) {
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const fields = fieldsForKind(kind, subjectType);

  function addText() {
    const box = defaultElementBox(kind, 'text');
    onAdd({ id: newId(), type: 'text', x: 10, y: 10, ...box, text: 'New text', fontSize: 3.2, color: '#111111', align: 'left' });
  }

  function addField(fieldKey: string, fieldKind: 'text' | 'image') {
    setFieldPickerOpen(false);
    if (fieldKey.endsWith('.qr')) {
      const box = defaultElementBox(kind, 'qr');
      onAdd({ id: newId(), type: 'qr', x: 10, y: 10, ...box, field: fieldKey });
      return;
    }
    if (fieldKind === 'image') {
      const box = defaultElementBox(kind, 'image');
      onAdd({ id: newId(), type: 'image', x: 10, y: 10, ...box, field: fieldKey, fit: 'cover' });
      return;
    }
    const box = defaultElementBox(kind, 'field');
    onAdd({ id: newId(), type: 'field', x: 10, y: 10, ...box, field: fieldKey, fontSize: 3.2, color: '#111111', align: 'left' });
  }

  function addImage() {
    const box = defaultElementBox(kind, 'image');
    onAdd({ id: newId(), type: 'image', x: 10, y: 10, ...box, fit: 'cover' });
  }

  function addRect() {
    const box = defaultElementBox(kind, 'rect');
    onAdd({ id: newId(), type: 'rect', x: 10, y: 10, ...box, fill: '#2563eb', radius: 0, opacity: 1 });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={addText} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200">
        + Text
      </button>

      <div className="relative">
        <button type="button" onClick={() => setFieldPickerOpen((v) => !v)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200">
          + Field ▾
        </button>
        {fieldPickerOpen && (
          <div className="absolute z-20 top-full left-0 mt-1 w-56 max-h-72 overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-xl py-1">
            {fields.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => addField(f.key, f.kind)}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 flex items-center justify-between"
              >
                <span>{f.label}</span>
                <span className="text-[10px] text-gray-400">{f.key.endsWith('.qr') ? 'QR' : f.kind}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button type="button" onClick={addImage} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200">
        + Image
      </button>
      <button type="button" onClick={addRect} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200">
        + Shape
      </button>
    </div>
  );
}
