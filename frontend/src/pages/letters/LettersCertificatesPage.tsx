import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentTemplateService } from '../../services/documentTemplateService';
import type { DocumentTemplateDoc, CertificateDocType } from '../../services/documentTemplateService';
import { documentIssuanceService } from '../../services/documentIssuanceService';
import { studentService } from '../../services/studentService';
import type { StudentDoc } from '../../services/studentService';
import { userService } from '../../services/userService';
import type { UserDoc } from '../../services/userService';
import { academicService } from '../../services/academicService';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import TemplateStaticView from '../../components/templates/TemplateStaticView';
import TemplateDesignerModal from '../../components/templates/TemplateDesignerModal';
import { resolveStudentData, resolveStaffData, resolveOrgBranchData, resolveIssueMeta, SAMPLE_STUDENT_DATA, SAMPLE_ISSUE_DATA } from '../../lib/templateFields';
import { exportDocumentsPdf } from '../../lib/templateExport';
import { getOrgBranding } from '../../services/authService';
import { getOrgSlug } from '../../utils/tenant';
import { useAuthStore } from '../../stores/authStore';
import { cn, formatDate, roleLabel } from '../../lib/utils';

type Tab = 'templates' | 'issue' | 'log';

const DOC_TYPE_LABEL: Record<CertificateDocType, string> = {
  offer_letter: 'Offer Letter',
  transfer_certificate: 'Transfer Certificate',
  character_certificate: 'Character Certificate',
  experience_letter: 'Experience Letter',
  clearance_letter: 'Clearance Letter',
  custom: 'Custom',
};

function ThumbPreview({ template, sampleData }: { template: DocumentTemplateDoc; sampleData: Record<string, string> }) {
  const boxW = 200;
  const scale = boxW / template.page.width;
  return (
    <div style={{ width: boxW, height: template.page.height * scale, overflow: 'hidden', borderRadius: 6, pointerEvents: 'none' }} className="border border-gray-200 dark:border-slate-600">
      <TemplateStaticView page={template.page} elements={template.elements} data={sampleData} scale={scale} />
    </div>
  );
}

export default function LettersCertificatesPage() {
  const qc = useQueryClient();
  const slug = getOrgSlug();
  const activeBranch = useAuthStore((s) => s.activeBranch);
  const [tab, setTab] = useState<Tab>('templates');
  const [designer, setDesigner] = useState<{ open: boolean; templateId?: string }>({ open: false });

  const { data: branding } = useQuery({ queryKey: ['org-branding', slug], queryFn: () => getOrgBranding(slug!), enabled: !!slug });
  const { data: templates = [] } = useQuery({ queryKey: ['document-templates', 'certificate'], queryFn: () => documentTemplateService.list('certificate') });

  const deleteTemplate = useMutation({
    mutationFn: documentTemplateService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document-templates'] }),
  });

  const orgBranchData = useMemo(
    () => resolveOrgBranchData(branding ? { name: branding.name, logoUrl: branding.logoUrl } : undefined, activeBranch ? { name: activeBranch.name } : undefined),
    [branding, activeBranch]
  );
  const sampleData = useMemo(() => ({ ...SAMPLE_STUDENT_DATA, ...orgBranchData, ...SAMPLE_ISSUE_DATA }), [orgBranchData]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Letters & Certificates"
        subtitle="Design letterhead templates, issue documents, and keep a verifiable issuance record"
        actions={tab === 'templates' ? <button onClick={() => setDesigner({ open: true })} className="btn-primary">+ New Template</button> : undefined}
      />

      <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg w-fit mb-6">
        {(['templates', 'issue', 'log'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              tab === t ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400')}>
            {t === 'log' ? 'Issuance Log' : t === 'issue' ? 'Issue Document' : 'Templates'}
          </button>
        ))}
      </div>

      {tab === 'templates' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((t) => (
            <div key={t._id} className="card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-center bg-gray-50 dark:bg-slate-900 rounded-lg p-3">
                <ThumbPreview template={t} sampleData={sampleData} />
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-slate-100 truncate">{t.name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{t.page.width} × {t.page.height} mm</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {t.documentType && <Badge variant="info">{DOC_TYPE_LABEL[t.documentType]}</Badge>}
                  {t.isDefault && <Badge variant="success">Default</Badge>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDesigner({ open: true, templateId: t._id })} className="flex-1 text-xs font-semibold py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700">Edit</button>
                <button onClick={() => { if (confirm(`Delete "${t.name}"?`)) deleteTemplate.mutate(t._id); }} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">Delete</button>
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="col-span-full text-center py-16 text-sm text-gray-400 dark:text-slate-500">
              No letter/certificate templates yet. Click "+ New Template" to design an offer letter, transfer certificate, character certificate, or custom letter.
            </div>
          )}
        </div>
      )}

      {tab === 'issue' && <IssueDocumentTab templates={templates} orgBranchData={orgBranchData} />}
      {tab === 'log' && <IssuanceLogTab />}

      {designer.open && (
        <TemplateDesignerModal
          kind="certificate"
          templateId={designer.templateId}
          onClose={() => setDesigner({ open: false })}
          onSaved={() => setDesigner({ open: false })}
        />
      )}
    </div>
  );
}

function IssueDocumentTab({ templates, orgBranchData }: { templates: DocumentTemplateDoc[]; orgBranchData: Record<string, string> }) {
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState<'student' | 'staff'>('student');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const template = templates.find((t) => t._id === templateId) ?? templates.find((t) => t.isDefault) ?? templates[0];

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => academicService.getClasses(), enabled: subject === 'student' });
  const { data: sections = [] } = useQuery({ queryKey: ['sections', classId], queryFn: () => academicService.getSections(classId || undefined), enabled: subject === 'student' && !!classId });

  const { data: studentResult } = useQuery({
    queryKey: ['students', classId, sectionId],
    queryFn: () => studentService.list({ ...(classId ? { classId } : {}), ...(sectionId ? { sectionId } : {}) }),
    enabled: subject === 'student',
  });
  const students = studentResult?.data ?? [];

  const { data: staff = [] } = useQuery({ queryKey: ['staff-for-cards'], queryFn: () => userService.list(), enabled: subject === 'staff' });
  const staffList = staff.filter((u) => u.role !== 'student');

  const subjects: (StudentDoc | UserDoc)[] = subject === 'student' ? students : staffList;

  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function toggleAll() {
    setSelected((s) => (s.size === subjects.length ? new Set() : new Set(subjects.map((x) => x._id))));
  }

  async function handleGenerate() {
    if (!template || selected.size === 0) return;
    const chosen = subjects.filter((x) => selected.has(x._id));
    setBusy(true);

    try {
      const items = chosen.map((x) => {
        const base = subject === 'student' ? resolveStudentData(x as StudentDoc) : resolveStaffData(x as UserDoc);
        const name = subject === 'student' ? (x as StudentDoc).profile.name : (x as UserDoc).name;
        return {
          templateId: template._id,
          kind: 'certificate' as const,
          documentType: template.documentType,
          subjectType: (subject === 'student' ? 'student' : 'user') as 'student' | 'user',
          subjectId: x._id,
          subjectName: name,
          dataSnapshot: { ...base, ...orgBranchData },
        };
      });

      const issuances = await documentIssuanceService.issueBulk(items);
      const exportItems = issuances.map((iss) => {
        const verifyUrl = `${window.location.origin}/verify/${iss.verificationCode}`;
        return { data: { ...iss.dataSnapshot, ...resolveIssueMeta(iss.serialNo, verifyUrl) } };
      });

      await exportDocumentsPdf(template.page, template.elements, exportItems, `${template.documentType ?? 'Documents'}_${formatDate(new Date()).replace(/\s/g, '')}.pdf`);
      setSelected(new Set());
    } finally {
      setBusy(false);
    }
  }

  if (templates.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-slate-500 py-10 text-center">Create a letter/certificate template first, in the Templates tab.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Template</label>
          <select className="input text-sm" value={template?._id ?? ''} onChange={(e) => setTemplateId(e.target.value)}>
            {templates.map((t) => <option key={t._id} value={t._id}>{t.name}{t.documentType ? ` — ${DOC_TYPE_LABEL[t.documentType]}` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Issue To</label>
          <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg">
            <button onClick={() => setSubject('student')} className={cn('px-3 py-1 rounded-md text-xs font-semibold', subject === 'student' ? 'bg-white dark:bg-slate-800 shadow-sm text-gray-900 dark:text-slate-100' : 'text-gray-500 dark:text-slate-400')}>Students</button>
            <button onClick={() => setSubject('staff')} className={cn('px-3 py-1 rounded-md text-xs font-semibold', subject === 'staff' ? 'bg-white dark:bg-slate-800 shadow-sm text-gray-900 dark:text-slate-100' : 'text-gray-500 dark:text-slate-400')}>Staff</button>
          </div>
        </div>
        {subject === 'student' && (
          <>
            <div>
              <label className="label">Class</label>
              <select className="input text-sm" value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}>
                <option value="">All Classes</option>
                {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Section</label>
              <select className="input text-sm" value={sectionId} onChange={(e) => setSectionId(e.target.value)} disabled={!classId}>
                <option value="">All Sections</option>
                {sections.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          </>
        )}
        <div className="flex-1" />
        <button onClick={handleGenerate} disabled={!template || selected.size === 0 || busy} className="btn-primary text-sm">
          {busy ? 'Generating…' : `Generate ${selected.size || ''} Document${selected.size === 1 ? '' : 's'}`}
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
              <th className="w-10 px-4 py-3"><input type="checkbox" checked={subjects.length > 0 && selected.size === subjects.length} onChange={toggleAll} /></th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">{subject === 'student' ? 'Class / Section' : 'Role'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {subjects.map((x) => (
              <tr key={x._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40 cursor-pointer" onClick={() => toggle(x._id)}>
                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.has(x._id)} onChange={() => toggle(x._id)} /></td>
                <td className="px-4 py-2.5 text-gray-800 dark:text-slate-200">{subject === 'student' ? (x as StudentDoc).profile.name : (x as UserDoc).name}</td>
                <td className="px-4 py-2.5 text-gray-500 dark:text-slate-400">
                  {subject === 'student'
                    ? `${typeof (x as StudentDoc).classId === 'object' ? ((x as StudentDoc).classId as { name: string }).name : ''} ${typeof (x as StudentDoc).sectionId === 'object' ? `/ ${((x as StudentDoc).sectionId as { name: string }).name}` : ''}`
                    : roleLabel((x as UserDoc).role)}
                </td>
              </tr>
            ))}
            {subjects.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500">No {subject === 'student' ? 'students' : 'staff'} found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IssuanceLogTab() {
  const qc = useQueryClient();
  const { data: issuances = [] } = useQuery({ queryKey: ['document-issuance', 'certificate'], queryFn: () => documentIssuanceService.list({ kind: 'certificate' }) });
  const revoke = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => documentIssuanceService.revoke(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document-issuance'] }),
  });

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
            <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Serial No.</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Document</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Name</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Issued</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Status</th>
            <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
          {issuances.map((iss) => (
            <tr key={iss._id}>
              <td className="px-4 py-2.5 font-mono text-xs text-gray-600 dark:text-slate-300">{iss.serialNo}</td>
              <td className="px-4 py-2.5 text-gray-600 dark:text-slate-300">{iss.documentType ? DOC_TYPE_LABEL[iss.documentType] : '—'}</td>
              <td className="px-4 py-2.5 text-gray-800 dark:text-slate-200">{iss.subjectName}</td>
              <td className="px-4 py-2.5 text-gray-500 dark:text-slate-400">{formatDate(iss.issuedAt)}</td>
              <td className="px-4 py-2.5"><Badge variant={iss.status === 'issued' ? 'success' : 'danger'}>{iss.status}</Badge></td>
              <td className="px-4 py-2.5 text-right">
                {iss.status === 'issued' && (
                  <button
                    onClick={() => { const reason = prompt('Reason for revoking this document?'); if (reason) revoke.mutate({ id: iss._id, reason }); }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Revoke
                  </button>
                )}
              </td>
            </tr>
          ))}
          {issuances.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500">No documents issued yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
