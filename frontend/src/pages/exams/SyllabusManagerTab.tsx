import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Check, X } from 'lucide-react';
import { academicService } from '../../services/academicService';
import { topicService, type TopicDoc } from '../../services/topicService';
import { useAuthStore } from '../../stores/authStore';

// Topic CRUD is gated server-side by the 'academic_intelligence' RBAC resource, which only
// grants create/update/delete to 'teacher' and 'it_admin' — everyone else gets a read-only view.
const CAN_EDIT_ROLES = ['teacher', 'it_admin'];

export default function SyllabusManagerTab() {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const canEdit = CAN_EDIT_ROLES.includes(user?.role ?? '');

  const { data: years = [] } = useQuery({ queryKey: ['years'], queryFn: academicService.getYears });
  const currentYear = years.find(y => y.isCurrent) ?? years[0];

  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ chapterNumber: '', topicName: '' });
  const [newChapter, setNewChapter] = useState('');
  const [newTopic, setNewTopic] = useState('');

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', currentYear?._id],
    queryFn: () => academicService.getClasses(currentYear?._id),
    enabled: !!currentYear,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', classId],
    queryFn: () => academicService.getSubjects(classId || undefined),
    enabled: !!classId,
  });

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ['topics', classId, subjectId],
    queryFn: () => topicService.list({ classId, subjectId }),
    enabled: !!classId && !!subjectId,
  });

  const sortedTopics = [...topics].sort((a, b) => a.chapterNumber - b.chapterNumber || a.orderIndex - b.orderIndex);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['topics', classId, subjectId] });

  const createMutation = useMutation({
    mutationFn: () => topicService.create({
      classId, subjectId,
      chapterNumber: Number(newChapter) || sortedTopics.length + 1,
      topicName: newTopic.trim(),
      orderIndex: sortedTopics.length,
    }),
    onSuccess: () => { setNewChapter(''); setNewTopic(''); invalidate(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { chapterNumber?: number; topicName?: string; orderIndex?: number } }) =>
      topicService.update(id, data),
    onSuccess: () => { setEditingId(null); invalidate(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => topicService.delete(id),
    onSuccess: invalidate,
  });

  function startEdit(t: TopicDoc) {
    setEditingId(t._id);
    setEditDraft({ chapterNumber: String(t.chapterNumber), topicName: t.topicName });
  }

  function saveEdit(id: string) {
    updateMutation.mutate({ id, data: { chapterNumber: Number(editDraft.chapterNumber) || 1, topicName: editDraft.topicName.trim() } });
  }

  function move(t: TopicDoc, direction: -1 | 1) {
    const idx = sortedTopics.findIndex(x => x._id === t._id);
    const swapWith = sortedTopics[idx + direction];
    if (!swapWith) return;
    updateMutation.mutate({ id: t._id, data: { orderIndex: swapWith.orderIndex } });
    updateMutation.mutate({ id: swapWith._id, data: { orderIndex: t.orderIndex } });
  }

  const canSubmit = classId && subjectId && newTopic.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
          Define the chapter/topic breakdown per class and subject. These chapters can then be
          attached to exam-schedule slots instead of typing syllabus notes freehand.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Class</label>
            <select className="input" value={classId} onChange={e => { setClassId(e.target.value); setSubjectId(''); }}>
              <option value="">Select class...</option>
              {classes.map((c: { _id: string; name: string }) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Subject</label>
            <select className="input" value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!classId}>
              <option value="">Select subject...</option>
              {subjects.map((s: { _id: string; name: string }) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {!classId || !subjectId ? (
        <div className="card px-5 py-12 text-center text-gray-400 dark:text-slate-500 text-sm">
          Select a class and subject to manage its syllabus.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
              {sortedTopics.length} chapter{sortedTopics.length !== 1 ? 's' : ''}
            </p>
          </div>

          {isLoading ? (
            <div className="px-5 py-10 text-center text-gray-400 dark:text-slate-500 text-sm">Loading...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 dark:bg-slate-700/50 dark:border-slate-700">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 dark:text-slate-400 w-20">Ch.</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 dark:text-slate-400">Topic</th>
                  {canEdit && <th className="text-right px-4 py-2.5 font-medium text-gray-500 dark:text-slate-400 w-40">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {sortedTopics.length === 0 && (
                  <tr><td colSpan={canEdit ? 3 : 2} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500 text-xs">No chapters yet{canEdit ? '. Add one below.' : '.'}</td></tr>
                )}
                {sortedTopics.map((t, i) => (
                  <tr key={t._id} className="hover:bg-gray-50/60 dark:hover:bg-slate-700/30">
                    {editingId === t._id && canEdit ? (
                      <>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            className="input text-sm py-1.5 w-16"
                            value={editDraft.chapterNumber}
                            onChange={e => setEditDraft(d => ({ ...d, chapterNumber: e.target.value }))}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            className="input text-sm py-1.5"
                            value={editDraft.topicName}
                            onChange={e => setEditDraft(d => ({ ...d, topicName: e.target.value }))}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => saveEdit(t._id)} className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600" title="Save">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400" title="Cancel">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2.5 font-mono text-gray-500 dark:text-slate-400">Ch.{t.chapterNumber}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-slate-100">{t.topicName}</td>
                        {canEdit && (
                          <td className="px-4 py-2.5">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => move(t, -1)} disabled={i === 0} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 disabled:opacity-30" title="Move up">
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => move(t, 1)} disabled={i === sortedTopics.length - 1} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 disabled:opacity-30" title="Move down">
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => startEdit(t)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 dark:hover:text-slate-300" title="Edit">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => { if (confirm(`Delete "${t.topicName}"?`)) deleteMutation.mutate(t._id); }}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {canEdit && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 flex gap-2 items-center">
            <input
              type="number"
              placeholder="Ch."
              className="input text-sm py-1.5 w-16"
              value={newChapter}
              onChange={e => setNewChapter(e.target.value)}
            />
            <input
              placeholder="New chapter / topic name..."
              className="input text-sm py-1.5 flex-1"
              value={newTopic}
              onChange={e => setNewTopic(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canSubmit) createMutation.mutate(); }}
            />
            <button
              onClick={() => createMutation.mutate()}
              disabled={!canSubmit || createMutation.isPending}
              className="btn-primary text-sm flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          )}
        </div>
      )}
    </div>
  );
}
