import type { TemplateElement, TemplatePage, TemplateKind } from '../../services/documentTemplateService';
import { fieldsForKind } from '../../lib/templateFields';
import { presetsForKind } from '../../lib/templatePresets';

interface Props {
  kind: TemplateKind;
  subjectType?: 'student' | 'user';
  page: TemplatePage;
  selected: TemplateElement | null;
  onChangePage: (patch: Partial<TemplatePage>) => void;
  onChangeElement: (patch: Partial<TemplateElement>) => void;
  onDeleteElement: () => void;
  onUploadBackground: (file: File) => void;
  uploadingBackground?: boolean;
}

const swatches = ['#111111', '#ffffff', '#1e3a8a', '#2563eb', '#b45309', '#166534', '#991b1b', '#6b7280'];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">{label}</p>
      {children}
    </div>
  );
}

export default function PropertiesPanel({ kind, subjectType, page, selected, onChangePage, onChangeElement, onDeleteElement, onUploadBackground, uploadingBackground }: Props) {
  if (!selected) {
    const presets = presetsForKind(kind);
    return (
      <div className="space-y-4">
        <Row label="Page size">
          <select
            className="input text-sm"
            value={`${page.width}x${page.height}`}
            onChange={(e) => {
              const p = presets.find((x) => `${x.page.width}x${x.page.height}` === e.target.value);
              if (p) onChangePage(p.page);
            }}
          >
            {presets.map((p) => <option key={p.id} value={`${p.page.width}x${p.page.height}`}>{p.label}</option>)}
          </select>
        </Row>
        <Row label="Background color">
          <input type="color" value={page.background || '#ffffff'} onChange={(e) => onChangePage({ background: e.target.value })} className="w-full h-9 rounded-lg border border-gray-200 dark:border-slate-600" />
        </Row>
        <Row label="Background image">
          <label className="flex items-center justify-center gap-2 text-xs font-medium text-gray-600 dark:text-slate-300 border border-dashed border-gray-300 dark:border-slate-600 rounded-lg py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
            {uploadingBackground ? 'Uploading…' : page.backgroundImageUrl ? 'Replace image' : 'Upload image'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUploadBackground(e.target.files[0])} />
          </label>
          {page.backgroundImageUrl && (
            <button type="button" onClick={() => onChangePage({ backgroundImageUrl: undefined })} className="text-xs text-red-500 hover:text-red-700 mt-1">Remove background image</button>
          )}
        </Row>
        <p className="text-xs text-gray-400 dark:text-slate-500 pt-2 border-t border-gray-100 dark:border-slate-700">Click an element on the canvas to edit it, or use the toolbar above to add one.</p>
      </div>
    );
  }

  const fields = fieldsForKind(kind, subjectType);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wide">{selected.type}</p>
        <button type="button" onClick={onDeleteElement} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
      </div>

      {selected.type === 'text' && (
        <Row label="Text">
          <textarea className="input text-sm" rows={2} value={selected.text ?? ''} onChange={(e) => onChangeElement({ text: e.target.value })} />
        </Row>
      )}

      {(selected.type === 'field' || selected.type === 'image' || selected.type === 'qr') && (
        <Row label="Bound field">
          <select className="input text-sm" value={selected.field ?? ''} onChange={(e) => onChangeElement({ field: e.target.value })}>
            <option value="">Select field…</option>
            {fields.filter((f) => selected.type === 'image' ? f.kind === 'image' : selected.type === 'qr' ? f.key.endsWith('.qr') : true).map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
        </Row>
      )}

      {(selected.type === 'text' || selected.type === 'field') && (
        <>
          <Row label="Font size (mm)">
            <input type="number" step={0.1} min={1} className="input text-sm" value={selected.fontSize ?? 3.2} onChange={(e) => onChangeElement({ fontSize: parseFloat(e.target.value) || 3.2 })} />
          </Row>
          <Row label="Style">
            <div className="flex gap-2">
              <button type="button" onClick={() => onChangeElement({ fontWeight: selected.fontWeight === 'bold' ? 'normal' : 'bold' })}
                className={`flex-1 text-sm font-bold py-1.5 rounded-lg border ${selected.fontWeight === 'bold' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300'}`}>B</button>
              <button type="button" onClick={() => onChangeElement({ fontStyle: selected.fontStyle === 'italic' ? 'normal' : 'italic' })}
                className={`flex-1 text-sm italic py-1.5 rounded-lg border ${selected.fontStyle === 'italic' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300'}`}>I</button>
            </div>
          </Row>
          <Row label="Align">
            <div className="flex gap-2">
              {(['left', 'center', 'right'] as const).map((a) => (
                <button key={a} type="button" onClick={() => onChangeElement({ align: a })}
                  className={`flex-1 text-xs font-semibold py-1.5 rounded-lg border capitalize ${selected.align === a ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300'}`}>{a}</button>
              ))}
            </div>
          </Row>
          <Row label="Color">
            <div className="flex flex-wrap gap-1.5">
              {swatches.map((c) => (
                <button key={c} type="button" onClick={() => onChangeElement({ color: c })} style={{ background: c }}
                  className={`w-6 h-6 rounded-full border ${selected.color === c ? 'ring-2 ring-offset-1 ring-blue-500' : 'border-gray-200'}`} />
              ))}
              <input type="color" value={selected.color ?? '#111111'} onChange={(e) => onChangeElement({ color: e.target.value })} className="w-6 h-6 rounded-full border border-gray-200" />
            </div>
          </Row>
        </>
      )}

      {selected.type === 'image' && (
        <Row label="Fit">
          <div className="flex gap-2">
            {(['cover', 'contain'] as const).map((f) => (
              <button key={f} type="button" onClick={() => onChangeElement({ fit: f })}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-lg border capitalize ${selected.fit === f ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300'}`}>{f}</button>
            ))}
          </div>
        </Row>
      )}

      {selected.type === 'rect' && (
        <>
          <Row label="Fill color">
            <input type="color" value={selected.fill ?? '#2563eb'} onChange={(e) => onChangeElement({ fill: e.target.value })} className="w-full h-9 rounded-lg border border-gray-200 dark:border-slate-600" />
          </Row>
          <Row label="Corner radius (mm)">
            <input type="number" step={0.5} min={0} className="input text-sm" value={selected.radius ?? 0} onChange={(e) => onChangeElement({ radius: parseFloat(e.target.value) || 0 })} />
          </Row>
        </>
      )}
    </div>
  );
}
