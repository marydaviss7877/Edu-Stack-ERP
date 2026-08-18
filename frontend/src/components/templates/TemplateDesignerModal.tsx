import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { documentTemplateService } from '../../services/documentTemplateService';
import type { TemplateElement, TemplatePage, TemplateKind, CertificateDocType, DocumentTemplateDoc } from '../../services/documentTemplateService';
import { presetsForKind } from '../../lib/templatePresets';
import { resolveOrgBranchData, SAMPLE_STUDENT_DATA, SAMPLE_STAFF_DATA, SAMPLE_ISSUE_DATA } from '../../lib/templateFields';
import ElementToolbar from './ElementToolbar';
import TemplateDesignerCanvas from './TemplateDesignerCanvas';
import PropertiesPanel from './PropertiesPanel';
import { getOrgBranding } from '../../services/authService';
import { getOrgSlug } from '../../utils/tenant';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../lib/utils';

const CERT_DOC_TYPES: { value: CertificateDocType; label: string }[] = [
  { value: 'offer_letter', label: 'Offer Letter' },
  { value: 'transfer_certificate', label: 'Transfer Certificate' },
  { value: 'character_certificate', label: 'Character Certificate' },
  { value: 'experience_letter', label: 'Staff Experience Letter' },
  { value: 'clearance_letter', label: 'Staff Clearance Letter' },
  { value: 'custom', label: 'Custom Letter / Certificate' },
];

interface Props {
  kind: TemplateKind;
  templateId?: string;
  initial?: { name: string; page: TemplatePage; elements: TemplateElement[] };
  onClose: () => void;
  onSaved: () => void;
}

function pill(active: boolean) {
  return cn('px-3 py-1 rounded-md text-xs font-semibold transition-colors', active ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400');
}

/** Loads the existing template (if editing) before mounting the form, so form state can be
 * initialized directly from real data on mount — no effect-based sync needed. */
export default function TemplateDesignerModal({ kind, templateId, initial, onClose, onSaved }: Props) {
  const { data: existing, isLoading } = useQuery({ queryKey: ['document-template', templateId], queryFn: () => documentTemplateService.get(templateId!), enabled: !!templateId });

  if (templateId && isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <TemplateDesignerForm key={templateId ?? 'new'} kind={kind} templateId={templateId} initial={initial} existing={existing ?? null} onClose={onClose} onSaved={onSaved} />;
}

function TemplateDesignerForm({ kind, templateId, initial, existing, onClose, onSaved }: Props & { existing: DocumentTemplateDoc | null }) {
  const qc = useQueryClient();
  const slug = getOrgSlug();
  const activeBranch = useAuthStore((s) => s.activeBranch);
  const { data: branding } = useQuery({ queryKey: ['org-branding', slug], queryFn: () => getOrgBranding(slug!), enabled: !!slug });

  const presets = presetsForKind(kind);
  const [name, setName] = useState(existing?.name ?? initial?.name ?? '');
  const [documentType, setDocumentType] = useState<CertificateDocType>(existing?.documentType ?? 'custom');
  const [isDefault, setIsDefault] = useState(existing?.isDefault ?? false);
  const [page, setPage] = useState<TemplatePage>(existing?.page ?? initial?.page ?? presets[0].page);
  const [elements, setElements] = useState<TemplateElement[]>(existing?.elements ?? initial?.elements ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState<'student' | 'user'>(kind === 'id_card_staff' ? 'user' : 'student');
  const [uploadingBg, setUploadingBg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const scale = 3.6; // px per mm on-screen; html2canvas captures at a higher pixel density on export
  const effectiveSubject: 'student' | 'user' = kind === 'id_card_staff' ? 'user' : kind === 'id_card_student' ? 'student' : previewSubject;

  const sampleData = useMemo(() => ({
    ...(effectiveSubject === 'user' ? SAMPLE_STAFF_DATA : SAMPLE_STUDENT_DATA),
    ...resolveOrgBranchData(branding ? { name: branding.name, logoUrl: branding.logoUrl } : undefined, activeBranch ? { name: activeBranch.name } : undefined),
    ...SAMPLE_ISSUE_DATA,
  }), [effectiveSubject, branding, activeBranch]);

  const selected = elements.find((e) => e.id === selectedId) ?? null;

  function updateElement(patch: Partial<TemplateElement>) {
    if (!selectedId) return;
    setElements((els) => els.map((e) => (e.id === selectedId ? { ...e, ...patch } : e)));
  }
  function deleteElement() {
    if (!selectedId) return;
    setElements((els) => els.filter((e) => e.id !== selectedId));
    setSelectedId(null);
  }
  function addElement(el: TemplateElement) {
    setElements((els) => [...els, el]);
    setSelectedId(el.id);
  }

  async function handleUploadBackground(file: File) {
    setUploadingBg(true);
    try {
      const { uploadUrl, publicUrl } = await documentTemplateService.getUploadUrl(file.name, file.type);
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      setPage((p) => ({ ...p, backgroundImageUrl: publicUrl }));
    } catch {
      setError('Could not upload image. Please try again.');
    } finally {
      setUploadingBg(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) { setError('Give this template a name first.'); return; }
    setError('');
    setSaving(true);
    try {
      const payload = { name: name.trim(), kind, documentType: kind === 'certificate' ? documentType : undefined, isDefault, page, elements };
      if (templateId) await documentTemplateService.update(templateId, payload);
      else await documentTemplateService.create(payload);
      qc.invalidateQueries({ queryKey: ['document-templates'] });
      onSaved();
    } catch {
      setError('Could not save the template. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col">
      <div className="flex items-center gap-3 px-5 h-14 border-b border-gray-100 dark:border-slate-700 shrink-0">
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Untitled template"
          className="text-sm font-semibold bg-transparent outline-none flex-1 min-w-0 max-w-xs text-gray-900 dark:text-slate-100 placeholder:text-gray-400"
        />
        {kind === 'certificate' && (
          <select className="input text-sm w-48 shrink-0" value={documentType} onChange={(e) => setDocumentType(e.target.value as CertificateDocType)}>
            {CERT_DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        )}
        {kind === 'certificate' && (
          <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 p-0.5 rounded-lg shrink-0">
            <button onClick={() => setPreviewSubject('student')} className={pill(previewSubject === 'student')}>Student</button>
            <button onClick={() => setPreviewSubject('user')} className={pill(previewSubject === 'user')}>Staff</button>
          </div>
        )}
        <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 shrink-0">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> Default
        </label>
        {error && <span className="text-xs text-red-500 shrink-0">{error}</span>}
        <div className="flex-1" />
        <button onClick={onClose} className="btn-secondary text-sm shrink-0">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm shrink-0">{saving ? 'Saving…' : 'Save Template'}</button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700 shrink-0">
            <ElementToolbar kind={kind} subjectType={effectiveSubject} onAdd={addElement} />
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-100 dark:bg-slate-950 p-10">
            <TemplateDesignerCanvas page={page} elements={elements} data={sampleData} scale={scale} selectedId={selectedId} onSelect={setSelectedId} onChange={setElements} />
          </div>
        </div>
        <div className="w-72 shrink-0 border-l border-gray-100 dark:border-slate-700 overflow-y-auto p-4">
          <PropertiesPanel
            kind={kind}
            subjectType={effectiveSubject}
            page={page}
            selected={selected}
            onChangePage={(patch) => setPage((p) => ({ ...p, ...patch }))}
            onChangeElement={updateElement}
            onDeleteElement={deleteElement}
            onUploadBackground={handleUploadBackground}
            uploadingBackground={uploadingBg}
          />
        </div>
      </div>
    </div>
  );
}
