import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { admissionService, type Application, type ApplicationDetail } from '../../services/admissionService';
import { downloadOfferLetterPdf } from '../../lib/offerLetterPdf';
import { downloadProvisionalCertPdf } from '../../lib/provisionalCertPdf';
import { downloadStudentIdCardPdf } from '../../lib/studentIdCardPdf';
import { useAuthStore } from '../../stores/authStore';
import { schoolUrl } from '../../utils/tenant';
import api from '../../services/api';
import type { ApiResponse } from '../../types';
import type { Branch } from '../../types';

// ─── Types ─────────────────────────────────────────────────────────────────

type Tab = 'applications' | 'merit' | 'programs' | 'analytics';

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted', under_review: 'Under Review', docs_verified: 'Docs Verified',
  shortlisted: 'Shortlisted', offered: 'Offered', accepted: 'Accepted',
  enrolled: 'Enrolled', rejected: 'Rejected', waitlisted: 'Waitlisted', declined: 'Declined',
};

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-gray-100 text-gray-700',
  under_review: 'bg-blue-100 text-blue-700',
  docs_verified: 'bg-cyan-100 text-cyan-700',
  shortlisted: 'bg-indigo-100 text-indigo-700',
  offered: 'bg-amber-100 text-amber-700',
  accepted: 'bg-green-100 text-green-700',
  enrolled: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  waitlisted: 'bg-orange-100 text-orange-700',
  declined: 'bg-slate-100 text-slate-600',
};

const inp = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full';
const sel = `${inp} bg-white`;
const btn = (v: string) => `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${v}`;

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── Application List Tab ─────────────────────────────────────────────────

function ApplicationsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Application | null>(null);

  const { data } = useQuery({
    queryKey: ['admission-apps', search, statusFilter],
    queryFn: () => admissionService.listApplications({
      ...(search ? { search } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    }),
  });

  const apps = data?.data ?? [];

  return (
    <div className="flex gap-4 min-h-0 h-full">
      {/* List */}
      <div className={`flex flex-col gap-3 ${selected ? 'w-80 shrink-0' : 'flex-1'}`}>
        <div className="flex gap-2">
          <input className={inp} placeholder="Search name / ref no…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={`${sel} w-44`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {apps.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              No applications found
            </div>
          )}
          {apps.map((app) => (
            <button key={app._id} onClick={() => setSelected(app)} className={`w-full text-left border rounded-xl p-3 transition-all hover:shadow-sm ${selected?._id === app._id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{app.personal.name}</p>
                  <p className="text-xs text-gray-500 truncate">{app.personal.fatherName}</p>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">{app.refNo}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <StatusBadge status={app.status} />
                  <span className="text-xs text-gray-400">{app.academic.percentage}%</span>
                </div>
              </div>
              {app.allocatedProgramName && (
                <p className="text-xs text-indigo-600 font-medium mt-1.5">→ {app.allocatedProgramName}</p>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-right">{apps.length} result{apps.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Detail Panel */}
      {selected && (
        <ApplicationDetailPanel
          appId={selected._id}
          onClose={() => setSelected(null)}
          onRefresh={() => { qc.invalidateQueries({ queryKey: ['admission-apps'] }); setSelected(null); }}
        />
      )}
    </div>
  );
}

// ─── Application Detail Panel ─────────────────────────────────────────────

function ApplicationDetailPanel({ appId, onClose, onRefresh }: { appId: string; onClose: () => void; onRefresh: () => void }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [enrollData, setEnrollData] = useState({ email: '', classId: '', sectionId: '', academicYearId: '' });
  const [enrollResult, setEnrollResult] = useState<{ admissionNo: string; tempPassword: string } | null>(null);
  const [newNote, setNewNote] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  const { data: app, isLoading } = useQuery({
    queryKey: ['admission-app', appId],
    queryFn: () => admissionService.getApplication(appId),
  });

  const statusMut = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) => admissionService.updateStatus(appId, status, note),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admission-app', appId] }); onRefresh(); setNewStatus(''); setStatusNote(''); },
  });

  const docMut = useMutation({
    mutationFn: ({ docType, verified }: { docType: string; verified: boolean }) => admissionService.verifyDocument(appId, docType, verified),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admission-app', appId] }),
  });

  const noteMut = useMutation({
    mutationFn: (text: string) => admissionService.addNote(appId, text),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admission-app', appId] }); setNewNote(''); },
  });

  const enrollMut = useMutation({
    mutationFn: () => admissionService.enroll(appId, enrollData),
    onSuccess: (data) => { setEnrollResult(data); onRefresh(); },
  });

  if (isLoading || !app) return (
    <div className="flex-1 flex items-center justify-center border border-gray-200 rounded-xl">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const canEnroll = app.status === 'accepted' && !app.enrolledStudentId;

  return (
    <div className="flex-1 flex flex-col border border-gray-200 rounded-xl bg-white overflow-hidden min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
        <div>
          <p className="font-bold text-gray-900">{app.personal.name}</p>
          <p className="text-xs font-mono text-gray-400">{app.refNo}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={app.status} />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* PDF Actions */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => downloadOfferLetterPdf(app, user?.name ?? 'Institution')} className={btn('bg-blue-50 text-blue-700 hover:bg-blue-100')}>
            Offer Letter PDF
          </button>
          <button onClick={() => downloadProvisionalCertPdf(app, user?.name ?? 'Institution')} className={btn('bg-indigo-50 text-indigo-700 hover:bg-indigo-100')}>
            Provisional Cert PDF
          </button>
          {app.enrolledStudentId && (
            <button onClick={() => downloadStudentIdCardPdf(app as ApplicationDetail & { grNo?: string }, user?.name ?? 'Institution')} className={btn('bg-green-50 text-green-700 hover:bg-green-100')}>
              ID Card PDF
            </button>
          )}
        </div>

        {/* Personal */}
        <Section title="Personal Information">
          <Grid2>
            <Row label="Name" value={app.personal.name} />
            <Row label="Father" value={app.personal.fatherName} />
            <Row label="Mother" value={app.personal.motherName} />
            <Row label="DOB" value={app.personal.dob ? new Date(app.personal.dob).toLocaleDateString('en-PK') : '—'} />
            <Row label="Gender" value={app.personal.gender} />
            <Row label="Blood Group" value={app.personal.bloodGroup} />
            <Row label="Phone" value={app.personal.parentPhone} />
            <Row label="Address" value={app.personal.address} />
          </Grid2>
        </Section>

        {/* Academic */}
        <Section title="Academic History">
          <Grid2>
            <Row label="School" value={app.academic.previousSchool} />
            <Row label="Board" value={app.academic.board} />
            <Row label="Marks" value={`${app.academic.marksObtained} / ${app.academic.totalMarks}`} />
            <Row label="Percentage" value={`${app.academic.percentage}%`} />
          </Grid2>
        </Section>

        {/* Programs */}
        <Section title="Program Preferences">
          <div className="space-y-1">
            {app.preferences.map((p) => (
              <div key={p.programId} className="flex items-center gap-2 text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">{p.rank}</span>
                <span className="text-gray-700">{p.programName}</span>
              </div>
            ))}
            {app.allocatedProgramName && (
              <p className="text-indigo-600 font-medium text-sm mt-2">→ Allocated: {app.allocatedProgramName} (Round {app.meritRound})</p>
            )}
            {app.meritScore !== undefined && (
              <p className="text-gray-500 text-xs">Merit Score: {app.meritScore.toFixed(2)}</p>
            )}
          </div>
        </Section>

        {/* Sibling + Quota */}
        <Section title="Sibling & Quota">
          <Grid2>
            <Row label="Sibling" value={app.sibling.has ? `${app.sibling.siblingName ?? '—'} (${app.sibling.siblingGrNo ?? 'GR?'})` : 'None'} />
            {app.sibling.has && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Verified:</span>
                <input type="checkbox" checked={app.sibling.verified}
                  onChange={(e) => admissionService.verifyField(appId, 'sibling.verified', e.target.checked)}
                  className="accent-blue-600" />
              </div>
            )}
            <Row label="Quota" value={app.quota.type === 'none' ? 'None' : app.quota.type} />
            {app.quota.type !== 'none' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Verified:</span>
                <input type="checkbox" checked={app.quota.verified}
                  onChange={(e) => admissionService.verifyField(appId, 'quota.verified', e.target.checked)}
                  className="accent-blue-600" />
              </div>
            )}
          </Grid2>
        </Section>

        {/* Documents */}
        <Section title="Documents">
          <div className="space-y-2">
            {(['photo', 'bForm', 'resultCard', 'quotaProof'] as const).map((k) => {
              const doc = app.documents[k];
              const label = k === 'photo' ? 'Photo' : k === 'bForm' ? 'B-Form / CNIC' : k === 'resultCard' ? 'Result Card' : 'Quota Proof';
              if (!doc?.url) return null;
              return (
                <div key={k} className="flex items-center gap-3 border border-gray-100 rounded-lg p-2">
                  <a href={doc.url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline flex-1">{label}</a>
                  <button
                    onClick={() => docMut.mutate({ docType: k, verified: !doc.verified })}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${doc.verified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {doc.verified ? '✓ Verified' : 'Mark Verified'}
                  </button>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Status Change */}
        <Section title="Update Status">
          <div className="flex gap-2">
            <select className={`${sel} flex-1`} value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="">Select new status…</option>
              {Object.entries(STATUS_LABELS).filter(([v]) => v !== 'enrolled').map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          {newStatus && (
            <div className="mt-2 flex gap-2">
              <input className={`${inp} flex-1`} placeholder="Note (optional)" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
              <button onClick={() => statusMut.mutate({ status: newStatus, note: statusNote })} disabled={statusMut.isPending}
                className={btn('bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 shrink-0')}>
                Update
              </button>
            </div>
          )}
        </Section>

        {/* Enroll */}
        {canEnroll && !enrollResult && (
          <Section title="Enroll as Student">
            <div className="grid grid-cols-2 gap-2">
              <input className={inp} placeholder="Email address *" value={enrollData.email} onChange={(e) => setEnrollData({ ...enrollData, email: e.target.value })} />
              <input className={inp} placeholder="Class ID *" value={enrollData.classId} onChange={(e) => setEnrollData({ ...enrollData, classId: e.target.value })} />
              <input className={inp} placeholder="Section ID *" value={enrollData.sectionId} onChange={(e) => setEnrollData({ ...enrollData, sectionId: e.target.value })} />
              <input className={inp} placeholder="Academic Year ID *" value={enrollData.academicYearId} onChange={(e) => setEnrollData({ ...enrollData, academicYearId: e.target.value })} />
            </div>
            <button onClick={() => enrollMut.mutate()} disabled={enrollMut.isPending || !enrollData.email || !enrollData.classId}
              className={`${btn('bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60')} mt-2 w-full`}>
              {enrollMut.isPending ? 'Creating student record…' : 'Convert to Student'}
            </button>
            {enrollMut.isError && <p className="text-red-500 text-sm mt-1">Enrollment failed. Check IDs.</p>}
          </Section>
        )}

        {enrollResult && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="font-semibold text-emerald-800 mb-2">Student Enrolled!</p>
            <p className="text-sm text-emerald-700">Admission No: <strong>{enrollResult.admissionNo}</strong></p>
            <p className="text-sm text-emerald-700">Temp Password: <strong className="font-mono">{enrollResult.tempPassword}</strong></p>
            <p className="text-xs text-emerald-600 mt-1">Share this password with the student for first login.</p>
          </div>
        )}

        {/* Notes */}
        <Section title="Admin Notes">
          <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
            {app.adminNotes.length === 0 && <p className="text-xs text-gray-400">No notes yet</p>}
            {app.adminNotes.map((n, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-2.5 text-sm">
                <p className="text-gray-800">{n.text}</p>
                <p className="text-gray-400 text-xs mt-1">{n.addedByName} · {new Date(n.addedAt).toLocaleDateString('en-PK')}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className={`${inp} flex-1`} placeholder="Add a note…" value={newNote} onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newNote.trim() && noteMut.mutate(newNote)} />
            <button onClick={() => noteMut.mutate(newNote)} disabled={!newNote.trim() || noteMut.isPending}
              className={btn('bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 shrink-0')}>
              Add
            </button>
          </div>
        </Section>

        {/* History */}
        <Section title="Status History">
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {app.statusHistory.map((h, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <StatusBadge status={h.status} />
                <span className="text-gray-400">{new Date(h.changedAt).toLocaleDateString('en-PK')}</span>
                {h.changedByName && <span className="text-gray-500">by {h.changedByName}</span>}
                {h.note && <span className="text-gray-400 italic">— {h.note}</span>}
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

// ─── Merit List Tab ───────────────────────────────────────────────────────

function MeritListTab() {
  const qc = useQueryClient();
  const [programFilter, setProgramFilter] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ allocated: number; waitlisted: number } | null>(null);

  const { data: occupancy } = useQuery({
    queryKey: ['seat-occupancy'],
    queryFn: admissionService.getSeatOccupancy,
  });

  const { data: meritList } = useQuery({
    queryKey: ['merit-list', programFilter],
    queryFn: () => admissionService.getMeritList(programFilter || undefined),
  });

  async function handleGenerate() {
    if (!occupancy?.length) return;
    setGenerating(true);
    try {
      const ids = occupancy.filter((p) => p.isOpen).map((p) => p._id);
      const r = await admissionService.generateMeritList(ids);
      setResult(r);
      qc.invalidateQueries({ queryKey: ['merit-list'] });
      qc.invalidateQueries({ queryKey: ['seat-occupancy'] });
      qc.invalidateQueries({ queryKey: ['admission-apps'] });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Seat Occupancy */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Seat Occupancy</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(occupancy ?? []).map((prog) => {
            const pct = prog.totalSeats > 0 ? Math.round((prog.filledSeats / prog.totalSeats) * 100) : 0;
            const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-blue-500';
            return (
              <div key={prog._id} className="border border-gray-200 rounded-xl p-4 bg-white">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{prog.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prog.isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {prog.isOpen ? 'Open' : 'Closed'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-mono text-gray-600 shrink-0">{prog.filledSeats}/{prog.totalSeats}</span>
                </div>
                <div className="flex gap-3 text-xs text-gray-400">
                  <span>Sports: {prog.quotaSeats.sports}</span>
                  <span>Staff: {prog.quotaSeats.staff}</span>
                  <span>Army: {prog.quotaSeats.army}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Generate */}
      <div className="flex items-center gap-4">
        <button onClick={handleGenerate} disabled={generating}
          className={`${btn('bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60')} flex items-center gap-2`}>
          {generating && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {generating ? 'Generating…' : 'Run Merit List Engine'}
        </button>
        {result && (
          <div className="text-sm text-gray-600 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
            ✓ Allocated: <strong>{result.allocated}</strong> · Waitlisted: <strong>{result.waitlisted}</strong>
          </div>
        )}
      </div>

      {/* Merit List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Merit List</h3>
          <select className={`${sel} w-48`} value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
            <option value="">All programs</option>
            {(occupancy ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs font-semibold">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Program</th>
                <th className="px-4 py-3 text-right">Marks%</th>
                <th className="px-4 py-3 text-right">Score</th>
                <th className="px-4 py-3 text-center">Quota</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {(meritList ?? []).length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No merit list data. Run the engine first.</td></tr>
              )}
              {(meritList ?? []).map((entry, i) => (
                <tr key={entry._id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-900">{(entry as unknown as Record<string, string>)['personal.name']}</p>
                    <p className="text-xs text-gray-400">{entry.refNo}</p>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{entry.allocatedProgramName ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{(entry as unknown as Record<string, number>)['academic.percentage']}%</td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-800">{entry.meritScore?.toFixed(2) ?? '—'}</td>
                  <td className="px-4 py-2.5 text-center">
                    {(entry as unknown as Record<string, string>)['quota.type'] !== 'none' && (
                      <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full capitalize">
                        {(entry as unknown as Record<string, string>)['quota.type']}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center"><StatusBadge status={entry.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Programs Tab ─────────────────────────────────────────────────────────

function ProgramsTab() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isGroupAdmin = user?.role === 'group_admin';
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', code: '', description: '', totalSeats: '', isOpen: true,
    branchId: '',
    quotaSeats: { sports: '0', staff: '0', army: '0' },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: () => api.get<ApiResponse<Branch[]>>('/branches').then(r => r.data.data ?? []),
    enabled: isGroupAdmin,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['admission-programs'],
    queryFn: admissionService.listPrograms,
  });

  const createMut = useMutation({
    mutationFn: () => admissionService.createProgram({
      ...form, totalSeats: Number(form.totalSeats),
      ...(isGroupAdmin && form.branchId ? { branchId: form.branchId } : {}),
      quotaSeats: {
        sports: Number(form.quotaSeats.sports),
        staff: Number(form.quotaSeats.staff),
        army: Number(form.quotaSeats.army),
      },
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admission-programs'] }); resetForm(); },
  });

  const updateMut = useMutation({
    mutationFn: () => admissionService.updateProgram(editing!, {
      name: form.name, description: form.description, totalSeats: Number(form.totalSeats),
      isOpen: form.isOpen,
      quotaSeats: { sports: Number(form.quotaSeats.sports), staff: Number(form.quotaSeats.staff), army: Number(form.quotaSeats.army) },
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admission-programs'] }); resetForm(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => admissionService.deleteProgram(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admission-programs'] }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isOpen }: { id: string; isOpen: boolean }) => admissionService.updateProgram(id, { isOpen }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admission-programs'] }),
  });

  function resetForm() { setForm({ name: '', code: '', description: '', totalSeats: '', isOpen: true, branchId: '', quotaSeats: { sports: '0', staff: '0', army: '0' } }); setShowForm(false); setEditing(null); }

  function startEdit(p: (typeof programs)[0]) {
    setForm({ name: p.name, code: p.code, description: p.description ?? '', totalSeats: String(p.totalSeats), isOpen: p.isOpen, branchId: '', quotaSeats: { sports: String(p.quotaSeats.sports), staff: String(p.quotaSeats.staff), army: String(p.quotaSeats.army) } });
    setEditing(p._id);
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      {!showForm && (
        <button onClick={() => setShowForm(true)} className={btn('bg-blue-600 text-white hover:bg-blue-700')}>
          + Add Program
        </button>
      )}

      {showForm && (
        <div className="border border-blue-200 rounded-xl p-5 bg-blue-50 space-y-3">
          <h3 className="font-semibold text-gray-900">{editing ? 'Edit Program' : 'New Program'}</h3>
          <div className="grid grid-cols-2 gap-3">
            {isGroupAdmin && !editing && (
              <select className={`${inp} col-span-2`} value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                <option value="">Select Branch *</option>
                {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            )}
            <input className={inp} placeholder="Program Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={inp} placeholder="Code * (e.g. FSC-PREMED)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!editing} />
            <input className={inp} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input type="number" className={inp} placeholder="Total Seats *" value={form.totalSeats} onChange={(e) => setForm({ ...form, totalSeats: e.target.value })} />
            <input type="number" className={inp} placeholder="Sports Quota seats" value={form.quotaSeats.sports} onChange={(e) => setForm({ ...form, quotaSeats: { ...form.quotaSeats, sports: e.target.value } })} />
            <input type="number" className={inp} placeholder="Staff Children seats" value={form.quotaSeats.staff} onChange={(e) => setForm({ ...form, quotaSeats: { ...form.quotaSeats, staff: e.target.value } })} />
            <input type="number" className={inp} placeholder="Army/Govt seats" value={form.quotaSeats.army} onChange={(e) => setForm({ ...form, quotaSeats: { ...form.quotaSeats, army: e.target.value } })} />
            <label className="flex items-center gap-2 text-sm col-span-1">
              <input type="checkbox" className="accent-blue-600" checked={form.isOpen} onChange={(e) => setForm({ ...form, isOpen: e.target.checked })} />
              Admissions open
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={() => editing ? updateMut.mutate() : createMut.mutate()}
              disabled={!form.name || !form.code || Number(form.totalSeats) < 1 || (isGroupAdmin && !editing && !form.branchId) || createMut.isPending || updateMut.isPending}
              className={btn('bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60')}>
              {editing ? 'Update Program' : 'Create Program'}
            </button>
            <button onClick={resetForm} className={btn('border border-gray-300 text-gray-600 hover:bg-gray-50')}>Cancel</button>
          </div>
          {(createMut.isError || updateMut.isError) && (
            <p className="text-sm text-red-600">
              {(() => {
                const err = (createMut.error ?? updateMut.error) as { response?: { data?: { errors?: { msg: string }[]; message?: string } } };
                const d = err?.response?.data;
                return d?.errors?.[0]?.msg ?? d?.message ?? 'Something went wrong. Please try again.';
              })()}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {programs.map((prog) => (
          <div key={prog._id} className="border border-gray-200 rounded-xl p-4 bg-white">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="font-semibold text-gray-900">{prog.name}</p>
                <p className="text-xs text-gray-400 font-mono">{prog.code}</p>
              </div>
              <button
                onClick={() => toggleMut.mutate({ id: prog._id, isOpen: !prog.isOpen })}
                className={`text-xs px-2.5 py-1 rounded-full font-semibold ${prog.isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
              >
                {prog.isOpen ? 'Open' : 'Closed'}
              </button>
            </div>
            <div className="flex gap-4 text-xs text-gray-500 mb-3">
              <span>Total: <strong className="text-gray-800">{prog.totalSeats}</strong></span>
              <span>Sports: {prog.quotaSeats.sports}</span>
              <span>Staff: {prog.quotaSeats.staff}</span>
              <span>Army: {prog.quotaSeats.army}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(prog)} className={btn('border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs py-1')}>Edit</button>
              <button onClick={() => window.confirm('Delete this program?') && deleteMut.mutate(prog._id)}
                className={btn('border border-red-200 text-red-600 hover:bg-red-50 text-xs py-1')}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Analytics Tab ─────────────────────────────────────────────────────────

function AnalyticsTab() {
  const { data: stats } = useQuery({
    queryKey: ['admission-stats'],
    queryFn: admissionService.getStats,
  });

  if (!stats) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const funnel = [
    { label: 'Submitted', key: 'submitted', color: 'bg-gray-400' },
    { label: 'Docs Verified', key: 'docs_verified', color: 'bg-cyan-500' },
    { label: 'Shortlisted', key: 'shortlisted', color: 'bg-indigo-500' },
    { label: 'Offered', key: 'offered', color: 'bg-amber-500' },
    { label: 'Accepted', key: 'accepted', color: 'bg-green-500' },
    { label: 'Enrolled', key: 'enrolled', color: 'bg-emerald-600' },
  ];

  const max = Math.max(...funnel.map((f) => stats.byStatus[f.key] ?? 0), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Stat cards */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Overview</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Applications" value={stats.total} color="bg-blue-50 text-blue-700" />
          <StatCard label="Enrolled" value={stats.byStatus.enrolled ?? 0} color="bg-emerald-50 text-emerald-700" />
          <StatCard label="Shortlisted" value={stats.byStatus.shortlisted ?? 0} color="bg-indigo-50 text-indigo-700" />
          <StatCard label="Rejected" value={stats.byStatus.rejected ?? 0} color="bg-red-50 text-red-700" />
        </div>
      </div>

      {/* Funnel */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Admission Funnel</h3>
        <div className="space-y-2">
          {funnel.map((f) => {
            const count = stats.byStatus[f.key] ?? 0;
            const pct = Math.round((count / max) * 100);
            return (
              <div key={f.key}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{f.label}</span>
                  <span className="font-semibold">{count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div className={`h-full rounded-full ${f.color} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* By Program */}
      {Object.keys(stats.byProgram ?? {}).length > 0 && (
        <div className="md:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Applications by Program</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(stats.byProgram ?? {}).map(([prog, count]) => (
              <div key={prog} className="border border-gray-200 rounded-xl p-3 bg-white">
                <p className="text-sm font-medium text-gray-800">{prog}</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">{count as number}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared helpers ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h4>
      {children}
    </div>
  );
}
function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-1">{children}</div>;
}
function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="text-xs py-0.5">
      <span className="text-gray-400">{label}: </span>
      <span className="text-gray-800 font-medium">{value || '—'}</span>
    </div>
  );
}
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function AdmissionPage() {
  const [tab, setTab] = useState<Tab>('applications');
  const slug = window.location.hostname.split('.')[0];

  const tabs: { key: Tab; label: string }[] = [
    { key: 'applications', label: 'Applications' },
    { key: 'merit', label: 'Merit List' },
    { key: 'programs', label: 'Programs Setup' },
    { key: 'analytics', label: 'Analytics' },
  ];

  return (
    <div className="p-6 flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admission Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Public portal: <a href={schoolUrl(slug, '/admission')} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{schoolUrl(slug, '/admission').replace('https://', '')}</a>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === 'applications' && <ApplicationsTab />}
        {tab === 'merit' && <MeritListTab />}
        {tab === 'programs' && <ProgramsTab />}
        {tab === 'analytics' && <AnalyticsTab />}
      </div>
    </div>
  );
}
