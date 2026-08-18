import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { combinedAssessmentService, type CombinedAssessmentDoc } from '../../services/combinedAssessmentService';
import type { ExamDoc } from '../../services/examService';
import { useAuthStore } from '../../stores/authStore';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { cn } from '../../lib/utils';
import { downloadCombinedResultCardPdf } from '../../lib/resultCardPdf';

// Combined assessments reuse the 'exams' RBAC resource — only branch_principal/coordinator
// have create/update/delete/publish there.
const CAN_MANAGE_ROLES = ['branch_principal', 'coordinator'];

const DEFAULT_GRADING = [
  { grade: 'A+', minPercentage: 90, maxPercentage: 100 },
  { grade: 'A', minPercentage: 80, maxPercentage: 89 },
  { grade: 'B', minPercentage: 70, maxPercentage: 79 },
  { grade: 'C', minPercentage: 60, maxPercentage: 69 },
  { grade: 'D', minPercentage: 50, maxPercentage: 59 },
  { grade: 'F', minPercentage: 0, maxPercentage: 49 },
];

function examName(g: CombinedAssessmentDoc['components'][number]['examId']) {
  return typeof g === 'object' ? g.name : '—';
}

export default function CombinedAssessmentTab({
  classId, sectionId, academicYearId, exams, orgName,
}: {
  classId: string;
  sectionId: string;
  academicYearId?: string;
  exams: ExamDoc[];
  orgName: string;
}) {
  const user = useAuthStore(s => s.user);
  const canManage = CAN_MANAGE_ROLES.includes(user?.role ?? '');
  const qc = useQueryClient();

  const [subView, setSubView] = useState<{ type: 'list' } | { type: 'results'; group: CombinedAssessmentDoc }>({ type: 'list' });
  const [createOpen, setCreateOpen] = useState(false);
  const [apiError, setApiError] = useState('');
  const [name, setName] = useState('');
  const [components, setComponents] = useState<{ examId: string; weight: string }[]>([{ examId: '', weight: '' }, { examId: '', weight: '' }]);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['combined-assessments', classId, academicYearId],
    queryFn: () => combinedAssessmentService.list({ classId, academicYearId: academicYearId! }),
    enabled: !!classId && !!academicYearId,
  });

  const { data: groupDetail } = useQuery({
    queryKey: ['combined-assessment', subView.type === 'results' ? subView.group._id : ''],
    queryFn: () => combinedAssessmentService.get(subView.type === 'results' ? subView.group._id : ''),
    enabled: subView.type === 'results',
  });

  const { data: results = [], isLoading: loadingResults } = useQuery({
    queryKey: ['combined-results', subView.type === 'results' ? subView.group._id : ''],
    queryFn: () => combinedAssessmentService.getResults(subView.type === 'results' ? subView.group._id : ''),
    enabled: subView.type === 'results',
  });

  const createMutation = useMutation({
    mutationFn: () => combinedAssessmentService.create({
      name,
      academicYearId: academicYearId!,
      classId,
      sectionId: sectionId || undefined,
      components: components.filter(c => c.examId && c.weight).map(c => ({ examId: c.examId, weight: Number(c.weight) })),
      gradingConfig: DEFAULT_GRADING,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['combined-assessments'] });
      setCreateOpen(false);
      resetForm();
    },
    onError: (e: { response?: { data?: { message?: string } } }) => setApiError(e?.response?.data?.message ?? 'Failed to create combined assessment'),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => combinedAssessmentService.publish(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['combined-assessments'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => combinedAssessmentService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['combined-assessments'] }),
  });

  function resetForm() {
    setName('');
    setComponents([{ examId: '', weight: '' }, { examId: '', weight: '' }]);
    setApiError('');
  }

  const canSubmit = name.trim() && components.filter(c => c.examId && c.weight).length >= 2;

  if (subView.type === 'results') {
    const componentNames: Record<string, string> = {};
    (groupDetail?.components ?? []).forEach(c => {
      if (typeof c.examId === 'object') componentNames[c.examId._id] = c.examId.name;
    });

    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setSubView({ type: 'list' })} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">{subView.group.name}</h2>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              {(groupDetail?.components ?? subView.group.components).map(c => examName(c.examId)).join(' + ')}
            </p>
          </div>
          {subView.group.isPublished ? (
            <Badge variant="success">Published</Badge>
          ) : (
            canManage && (
              <button
                onClick={() => publishMutation.mutate(subView.group._id)}
                disabled={publishMutation.isPending}
                className="ml-auto text-xs px-3 py-1 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
              >
                Publish
              </button>
            )
          )}
        </div>

        <div className="card overflow-hidden">
          {loadingResults ? (
            <div className="px-5 py-10 text-center text-gray-400 dark:text-slate-500 text-sm">Loading results...</div>
          ) : results.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 dark:text-slate-500 text-sm">No component results entered yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 dark:bg-slate-700/50 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Pos</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Name</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Overall %</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Grade</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {results.map(r => (
                  <tr key={r.studentId} className={cn(!r.isPassed && 'bg-red-50 dark:bg-red-900/20')}>
                    <td className="px-4 py-3 font-mono text-gray-400 dark:text-slate-500">{r.classPosition}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">
                      {r.name ?? '—'} <span className="text-gray-400 dark:text-slate-500 font-normal">({r.rollNo ?? '—'})</span>
                      {r.incompleteComponents > 0 && (
                        <span className="ml-2"><Badge variant="warning">Partial</Badge></span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{r.overallPercentage}%</td>
                    <td className="px-4 py-3 text-center font-bold">{r.grade}</td>
                    <td className="px-4 py-3 text-center">
                      {r.isPassed ? <Badge variant="success">Pass</Badge> : <Badge variant="danger">Fail</Badge>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => downloadCombinedResultCardPdf({ row: r, assessmentName: subView.group.name, orgName, componentNames })}
                        className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                        title="Download Combined Result Card PDF"
                      >
                        ↓ PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Combine two or more exams (e.g. Midterm 40% + Final 60%) into one weighted overall result.
        </p>
        {canManage && (
          <button onClick={() => { setApiError(''); resetForm(); setCreateOpen(true); }} className="btn-primary text-sm flex items-center gap-1.5 whitespace-nowrap">
            <Plus className="w-4 h-4" /> New Group
          </button>
        )}
      </div>

      <div className="card divide-y divide-gray-100 dark:divide-slate-700">
        {!classId ? (
          <div className="px-5 py-10 text-center text-gray-400 dark:text-slate-500 text-sm">Select a class.</div>
        ) : isLoading ? (
          <div className="px-5 py-10 text-center text-gray-400 dark:text-slate-500 text-sm">Loading...</div>
        ) : groups.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 dark:text-slate-500 text-sm">No combined assessments yet.</div>
        ) : groups.map(g => (
          <div key={g._id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/40">
            <div>
              <p className="font-medium text-gray-900 dark:text-slate-100 text-sm">{g.name}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                {g.components.map(c => `${examName(c.examId)} (${c.weight})`).join(' + ')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {g.isPublished ? <Badge variant="success">Published</Badge> : <Badge variant="warning">Draft</Badge>}
              <button onClick={() => setSubView({ type: 'results', group: g })} className="btn-secondary text-xs">View Results</button>
              {canManage && !g.isPublished && (
                <button
                  onClick={() => { if (confirm(`Delete "${g.name}"?`)) deleteMutation.mutate(g._id); }}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); resetForm(); }} title="New Combined Assessment" size="lg">
        <div className="space-y-4">
          {apiError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{apiError}</div>}

          <div>
            <label className="label">Group Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Annual Result 2026" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Component Exams &amp; Weights</label>
              <button onClick={() => setComponents(prev => [...prev, { examId: '', weight: '' }])} className="text-sm text-blue-600 hover:text-blue-700">+ Add Component</button>
            </div>
            <div className="space-y-2">
              {components.map((c, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    className="input flex-1"
                    value={c.examId}
                    onChange={e => setComponents(prev => prev.map((x, idx) => idx === i ? { ...x, examId: e.target.value } : x))}
                  >
                    <option value="">Exam...</option>
                    {exams.map(ex => <option key={ex._id} value={ex._id}>{ex.name}</option>)}
                  </select>
                  <input
                    type="number"
                    className="input w-28"
                    placeholder="Weight"
                    value={c.weight}
                    onChange={e => setComponents(prev => prev.map((x, idx) => idx === i ? { ...x, weight: e.target.value } : x))}
                  />
                  {components.length > 2 && (
                    <button onClick={() => setComponents(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
              Weights don&apos;t need to sum to 100 — the overall percentage is weight-averaged. A
              student missing one component is scored on the remaining weight.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => { setCreateOpen(false); resetForm(); }} className="btn-secondary">Cancel</button>
            <button onClick={() => createMutation.mutate()} disabled={!canSubmit || createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
