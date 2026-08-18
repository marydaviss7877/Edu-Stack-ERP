import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, Eye, Pencil, Trash2, Printer, Calendar } from 'lucide-react';
import { academicService } from '../../services/academicService';
import { examService } from '../../services/examService';
import { studentService } from '../../services/studentService';
import { examScheduleService, type ExamScheduleDoc, type ExamScheduleSlot } from '../../services/examScheduleService';
import { topicService } from '../../services/topicService';
import { useAuthStore } from '../../stores/authStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getDayName(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-PK', { weekday: 'long' });
}

function calcDuration(start: string, end: string) {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`;
}

function subjectName(s: ExamScheduleSlot['subjectId']) {
  return typeof s === 'object' ? s.name : '—';
}

function topicChips(topicIds: ExamScheduleSlot['topicIds']) {
  return (topicIds ?? [])
    .filter((t): t is { _id: string; topicName: string; chapterNumber: number } => typeof t === 'object')
    .sort((a, b) => a.chapterNumber - b.chapterNumber)
    .map(t => `Ch.${t.chapterNumber} ${t.topicName}`);
}

function examName(e: ExamScheduleDoc['examId']) {
  return typeof e === 'object' ? e.name : '—';
}

function className(c: ExamScheduleDoc['classId']) {
  if (typeof c === 'object') return c.section ? `${c.name} (${c.section})` : c.name;
  return '—';
}

// ─── Print View Modal ─────────────────────────────────────────────────────────

function PrintModal({ schedule, onClose }: { schedule: ExamScheduleDoc; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Exam Schedule</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
        h2 { margin: 0 0 4px; font-size: 16px; }
        p { margin: 0 0 12px; color: #555; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
        td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
        tr:last-child td { border-bottom: none; }
        .syllabus { color: #555; font-size: 11px; }
      </style>
      </head><body>${printRef.current.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  }

  const slots = schedule.slots.filter(s => s.date);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{examName(schedule.examId)}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{className(schedule.classId)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="btn-secondary text-sm flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={onClose} className="btn-secondary text-sm">Close</button>
          </div>
        </div>

        <div className="overflow-y-auto p-6">
          <div ref={printRef}>
            <h2 style={{ margin: '0 0 4px', fontSize: 16 }}>Exam Schedule — {examName(schedule.examId)}</h2>
            <p style={{ margin: '0 0 12px', color: '#555', fontSize: 12 }}>{className(schedule.classId)}</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  {['Subject', 'Date', 'Day', 'Time', 'Duration', 'Syllabus'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {slots.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400 dark:text-gray-500 text-xs">No slots defined</td></tr>
                ) : (
                  slots
                    .slice()
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((slot, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white">{subjectName(slot.subjectId)}</td>
                        <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{formatDate(slot.date)}</td>
                        <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{getDayName(slot.date)}</td>
                        <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">{slot.startTime} – {slot.endTime}</td>
                        <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{calcDuration(slot.startTime, slot.endTime)}</td>
                        <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 text-xs max-w-xs">
                          {topicChips(slot.topicIds).length > 0 && (
                            <div>{topicChips(slot.topicIds).join(', ')}</div>
                          )}
                          {slot.syllabus && <div className={topicChips(slot.topicIds).length > 0 ? 'mt-0.5 italic' : ''}>{slot.syllabus}</div>}
                          {topicChips(slot.topicIds).length === 0 && !slot.syllabus && '—'}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Editor (early-return sub-view) ──────────────────────────────────

interface SlotDraft {
  subjectId: string;
  subjectName: string;
  date: string;
  startTime: string;
  endTime: string;
  syllabus: string;
  topicIds: string[];
}

function ScheduleEditor({
  existing,
  onBack,
}: {
  existing: ExamScheduleDoc | null;
  onBack: () => void;
}) {
  const qc = useQueryClient();

  const { data: years = [] } = useQuery({ queryKey: ['years'], queryFn: academicService.getYears });
  const currentYear = years.find(y => y.isCurrent) ?? years[0];

  const { data: exams = [] } = useQuery({
    queryKey: ['exams'],
    queryFn: () => examService.list(),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', currentYear?._id],
    queryFn: () => academicService.getClasses(currentYear?._id),
    enabled: !!currentYear,
  });

  const [examId, setExamId] = useState(() =>
    existing ? (typeof existing.examId === 'object' ? existing.examId._id : existing.examId) : ''
  );
  const [classId, setClassId] = useState(() =>
    existing ? (typeof existing.classId === 'object' ? existing.classId._id : existing.classId) : ''
  );
  const [slots, setSlots] = useState<SlotDraft[]>(() => {
    if (existing?.slots?.length) {
      return existing.slots.map(s => ({
        subjectId: typeof s.subjectId === 'object' ? s.subjectId._id : s.subjectId,
        subjectName: typeof s.subjectId === 'object' ? (s.subjectId.name ?? '') : '',
        date: s.date ? s.date.slice(0, 10) : '',
        startTime: s.startTime,
        endTime: s.endTime,
        syllabus: s.syllabus,
        topicIds: (s.topicIds ?? []).map(t => typeof t === 'object' ? t._id : t),
      }));
    }
    return [];
  });
  const [subjectsLoaded, setSubjectsLoaded] = useState(!!existing?.slots?.length);
  const [newTopicName, setNewTopicName] = useState<Record<number, string>>({});

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', classId],
    queryFn: () => academicService.getSubjects(classId || undefined),
    enabled: !!classId,
  });

  const { data: topics = [], refetch: refetchTopics } = useQuery({
    queryKey: ['topics', classId],
    queryFn: () => topicService.list({ classId }),
    enabled: !!classId,
  });

  const createTopicMutation = useMutation({
    mutationFn: ({ subjectId, topicName }: { subjectId: string; topicName: string }) =>
      topicService.create({ classId, subjectId, chapterNumber: 1, topicName }),
  });

  function loadSubjects() {
    if (!subjects.length) return;
    setSlots(subjects.map((sub: { _id: string; name: string }) => ({
      subjectId: sub._id,
      subjectName: sub.name,
      date: '',
      startTime: '',
      endTime: '',
      syllabus: '',
      topicIds: [],
    })));
    setSubjectsLoaded(true);
  }

  function updateSlot(i: number, field: keyof SlotDraft, value: string) {
    setSlots(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  function toggleTopic(i: number, topicId: string) {
    setSlots(prev => prev.map((s, idx) => {
      if (idx !== i) return s;
      const has = s.topicIds.includes(topicId);
      return { ...s, topicIds: has ? s.topicIds.filter(t => t !== topicId) : [...s.topicIds, topicId] };
    }));
  }

  function addTopicToSlot(i: number, subjectId: string) {
    const name = (newTopicName[i] ?? '').trim();
    if (!name) return;
    createTopicMutation.mutate({ subjectId, topicName: name }, {
      onSuccess: (t) => {
        setSlots(prev => prev.map((s, idx) => idx === i ? { ...s, topicIds: [...s.topicIds, t._id] } : s));
        setNewTopicName(prev => ({ ...prev, [i]: '' }));
        refetchTopics();
      },
    });
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: ExamScheduleSlot[] = slots.map(s => ({
        subjectId: s.subjectId,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        syllabus: s.syllabus,
        topicIds: s.topicIds,
      }));
      if (existing) {
        return examScheduleService.update(existing._id, payload);
      }
      return examScheduleService.upsert({ examId, classId, slots: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-schedules'] });
      onBack();
    },
  });

  const canSave = examId && classId && slots.length > 0;
  const isLocked = !!existing;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          {existing ? 'Edit Exam Schedule' : 'New Exam Schedule'}
        </h2>
      </div>

      {/* Pickers */}
      <div className="card p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="label">Exam</label>
            <select
              className="input"
              value={examId}
              onChange={e => setExamId(e.target.value)}
              disabled={isLocked}
            >
              <option value="">Select exam...</option>
              {exams.map((ex: { _id: string; name: string }) => (
                <option key={ex._id} value={ex._id}>{ex.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Class</label>
            <select
              className="input"
              value={classId}
              onChange={e => { setClassId(e.target.value); setSlots([]); setSubjectsLoaded(false); }}
              disabled={isLocked}
            >
              <option value="">Select class...</option>
              {classes.map((c: { _id: string; name: string }) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          {!subjectsLoaded && classId && (
            <button onClick={loadSubjects} className="btn-secondary text-sm" disabled={!subjects.length}>
              Load Subjects
            </button>
          )}
        </div>
      </div>

      {/* Slot Grid */}
      {subjectsLoaded && slots.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Fill in the date and time for each subject paper
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-40">Subject</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Start Time</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">End Time</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-56">Chapters</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Additional Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {slots.map((slot, i) => {
                  const subjectTopics = topics
                    .filter(t => (typeof t.subjectId === 'object' ? t.subjectId._id : t.subjectId) === slot.subjectId)
                    .sort((a, b) => a.chapterNumber - b.chapterNumber);
                  return (
                  <tr key={i} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-white align-top">{slot.subjectName}</td>
                    <td className="px-4 py-2 align-top">
                      <input
                        type="date"
                        className="input text-sm py-1.5"
                        value={slot.date}
                        onChange={e => updateSlot(i, 'date', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2 align-top">
                      <input
                        type="time"
                        className="input text-sm py-1.5 w-28"
                        value={slot.startTime}
                        onChange={e => updateSlot(i, 'startTime', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2 align-top">
                      <input
                        type="time"
                        className="input text-sm py-1.5 w-28"
                        value={slot.endTime}
                        onChange={e => updateSlot(i, 'endTime', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2 align-top">
                      <details className="relative">
                        <summary className="input text-sm py-1.5 cursor-pointer list-none">
                          {slot.topicIds.length > 0 ? `${slot.topicIds.length} chapter${slot.topicIds.length !== 1 ? 's' : ''} selected` : 'Select chapters...'}
                        </summary>
                        <div className="absolute z-10 mt-1 w-64 max-h-56 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-2 space-y-1">
                          {subjectTopics.length === 0 && (
                            <p className="text-xs text-gray-400 px-1 py-1">No chapters defined yet for this subject.</p>
                          )}
                          {subjectTopics.map(t => (
                            <label key={t._id} className="flex items-center gap-2 px-1 py-1 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={slot.topicIds.includes(t._id)}
                                onChange={() => toggleTopic(i, t._id)}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600"
                              />
                              Ch.{t.chapterNumber} — {t.topicName}
                            </label>
                          ))}
                          <div className="flex gap-1 pt-1 border-t border-gray-100 dark:border-gray-700">
                            <input
                              className="input text-xs py-1 flex-1"
                              placeholder="New chapter..."
                              value={newTopicName[i] ?? ''}
                              onChange={e => setNewTopicName(prev => ({ ...prev, [i]: e.target.value }))}
                            />
                            <button
                              type="button"
                              onClick={() => addTopicToSlot(i, slot.subjectId)}
                              disabled={!(newTopicName[i] ?? '').trim()}
                              className="text-xs px-2 py-1 rounded border border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20 disabled:opacity-40"
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                      </details>
                    </td>
                    <td className="px-4 py-2 align-top">
                      <input
                        type="text"
                        className="input text-sm py-1.5"
                        placeholder="e.g. bring calculator, open-book…"
                        value={slot.syllabus}
                        onChange={e => updateSlot(i, 'syllabus', e.target.value)}
                      />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subjectsLoaded && slots.length === 0 && (
        <div className="card px-5 py-10 text-center text-gray-400 dark:text-gray-500 text-sm mb-4">
          No subjects found for this class.
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary">Cancel</button>
        <button
          className="btn-primary"
          disabled={!canSave || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? 'Saving…' : 'Save Schedule'}
        </button>
        {saveMutation.isError && (
          <span className="text-xs text-red-500 self-center">Failed to save. Try again.</span>
        )}
      </div>
    </div>
  );
}

// ─── Student Exam Schedule View ───────────────────────────────────────────────

export function StudentExamScheduleTab() {
  const { data: student } = useQuery({
    queryKey: ['my-profile'],
    queryFn: studentService.getMe,
  });

  const classId = typeof student?.classId === 'object'
    ? (student.classId as { _id: string })._id
    : student?.classId ?? '';

  const { data: exams = [] } = useQuery({
    queryKey: ['exams'],
    queryFn: () => examService.list(),
  });

  const [selectedExamId, setSelectedExamId] = useState('');

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['exam-schedules', selectedExamId, classId],
    queryFn: () => examScheduleService.list({ examId: selectedExamId || undefined, classId: classId || undefined }),
    enabled: !!classId,
  });

  const schedule = schedules[0] ?? null;
  const slots = (schedule?.slots ?? []).filter(s => s.date).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div>
      {/* Filter */}
      <div className="card p-4 mb-5">
        <div className="flex gap-4 items-end">
          <div>
            <label className="label">Filter by Exam</label>
            <select className="input" value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
              <option value="">All exams</option>
              {exams.map((ex: { _id: string; name: string }) => (
                <option key={ex._id} value={ex._id}>{ex.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-gray-400 dark:text-slate-500 text-sm">Loading...</div>
      )}

      {!isLoading && !classId && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3 text-2xl">📅</div>
          <p className="text-sm text-gray-400 dark:text-gray-500">Unable to load your class information.</p>
        </div>
      )}

      {!isLoading && classId && schedules.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3 text-2xl">📅</div>
          <p className="text-sm text-gray-400 dark:text-gray-500">No exam schedule has been set up yet.</p>
        </div>
      )}

      {!isLoading && schedule && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{examName(schedule.examId)}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{className(schedule.classId)}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  {['Subject', 'Date', 'Day', 'Time', 'Duration', 'Syllabus'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {slots.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-xs">No slots defined</td></tr>
                ) : slots.map((slot, i) => (
                  <tr key={i} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{subjectName(slot.subjectId)}</td>
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{formatDate(slot.date)}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{getDayName(slot.date)}</td>
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">{slot.startTime} – {slot.endTime}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{calcDuration(slot.startTime, slot.endTime)}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs max-w-xs">
                      {topicChips(slot.topicIds).length > 0 && (
                        <div>{topicChips(slot.topicIds).join(', ')}</div>
                      )}
                      {slot.syllabus && <div className={topicChips(slot.topicIds).length > 0 ? 'mt-0.5 italic' : ''}>{slot.syllabus}</div>}
                      {topicChips(slot.topicIds).length === 0 && !slot.syllabus && '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Staff Exam Schedule Tab ──────────────────────────────────────────────────

type SubView = { type: 'list' } | { type: 'editor'; record: ExamScheduleDoc | null };

export function ExamScheduleTab() {
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();

  const canEdit = ['branch_principal', 'it_admin', 'group_admin'].includes(user?.role ?? '');

  const [subView, setSubView] = useState<SubView>({ type: 'list' });
  const [printRecord, setPrintRecord] = useState<ExamScheduleDoc | null>(null);
  const [filterExamId, setFilterExamId] = useState('');

  const { data: exams = [] } = useQuery({
    queryKey: ['exams'],
    queryFn: () => examService.list(),
  });

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['exam-schedules', filterExamId],
    queryFn: () => examScheduleService.list(filterExamId ? { examId: filterExamId } : {}),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => examScheduleService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exam-schedules'] }),
  });

  if (subView.type === 'editor') {
    return (
      <ScheduleEditor
        existing={subView.record}
        onBack={() => setSubView({ type: 'list' })}
      />
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <label className="label">Filter by Exam</label>
          <select className="input" value={filterExamId} onChange={e => setFilterExamId(e.target.value)}>
            <option value="">All exams</option>
            {exams.map((ex: { _id: string; name: string }) => (
              <option key={ex._id} value={ex._id}>{ex.name}</option>
            ))}
          </select>
        </div>
        {canEdit && (
          <button
            onClick={() => setSubView({ type: 'editor', record: null })}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New Schedule
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading && (
        <div className="text-center py-12 text-gray-400 dark:text-slate-500 text-sm">Loading...</div>
      )}

      {!isLoading && schedules.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-7 h-7 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No exam schedules yet</p>
          {canEdit && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Click "New Schedule" to create one.</p>}
        </div>
      )}

      {!isLoading && schedules.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Exam</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Class</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Subjects</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date Range</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {schedules.map(sched => {
                const datesWithDate = sched.slots.filter(s => s.date).map(s => new Date(s.date).getTime());
                const minDate = datesWithDate.length ? formatDate(new Date(Math.min(...datesWithDate)).toISOString()) : '—';
                const maxDate = datesWithDate.length ? formatDate(new Date(Math.max(...datesWithDate)).toISOString()) : '—';
                const dateRange = datesWithDate.length ? (minDate === maxDate ? minDate : `${minDate} – ${maxDate}`) : '—';

                return (
                  <tr key={sched._id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{examName(sched.examId)}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{className(sched.classId)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                        {sched.slots.length} subject{sched.slots.length !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{dateRange}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setPrintRecord(sched)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="View / Print"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => setSubView({ type: 'editor', record: sched })}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { if (confirm(`Delete schedule for ${examName(sched.examId)} — ${className(sched.classId)}?`)) deleteMutation.mutate(sched._id); }}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Print Modal */}
      {printRecord && (
        <PrintModal schedule={printRecord} onClose={() => setPrintRecord(null)} />
      )}
    </div>
  );
}
