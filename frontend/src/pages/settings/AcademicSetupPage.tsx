import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicService } from '../../services/academicService';
import type { AcademicYear, ClassDoc, SectionDoc, SubjectDoc } from '../../services/academicService';
import { houseService } from '../../services/houseService';
import type { HouseDoc } from '../../services/houseService';
import { labelService } from '../../services/labelService';
import type { LabelDoc } from '../../services/labelService';
import { transportService } from '../../services/transportService';
import type { TransportRouteDoc } from '../../services/transportService';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { cn } from '../../lib/utils';
import AcademicSetupWizard from './AcademicSetupWizard';

const CLASS_LEVELS = [
  { value: 'grade_9', label: 'Grade 9' },
  { value: 'grade_10', label: 'Grade 10' },
  { value: 'grade_11', label: 'Grade 11' },
  { value: 'grade_12', label: 'Grade 12' },
  { value: 'inter_1', label: 'Intermediate Part I' },
  { value: 'inter_2', label: 'Intermediate Part II' },
];

type Tab = 'years' | 'classes' | 'sections' | 'subjects' | 'houses' | 'labels' | 'transport';

export default function AcademicSetupPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('years');
  const [modal, setModal] = useState<{ type: string; data?: Record<string, unknown> } | null>(null);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [wizardDismissed, setWizardDismissed] = useState(false);

  const { data: years = [], isLoading: yearsLoading } = useQuery({ queryKey: ['years'], queryFn: academicService.getYears });
  const { data: classes = [] } = useQuery({ queryKey: ['classes', selectedYearId], queryFn: () => academicService.getClasses(selectedYearId || undefined) });
  const { data: sections = [] } = useQuery({ queryKey: ['sections', selectedClassId], queryFn: () => academicService.getSections(selectedClassId || undefined) });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: () => academicService.getSubjects() });
  const { data: houses = [] } = useQuery({ queryKey: ['houses'], queryFn: houseService.list });
  const { data: labels = [] } = useQuery({ queryKey: ['labels'], queryFn: labelService.list });
  const { data: routes = [] } = useQuery({ queryKey: ['transport-routes'], queryFn: transportService.list });

  const createYear = useMutation({ mutationFn: academicService.createYear, onSuccess: () => { qc.invalidateQueries({ queryKey: ['years'] }); setModal(null); } });
  const createClass = useMutation({ mutationFn: academicService.createClass, onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes'] }); setModal(null); } });
  const createSection = useMutation({ mutationFn: academicService.createSection, onSuccess: () => { qc.invalidateQueries({ queryKey: ['sections'] }); setModal(null); } });
  const createSubject = useMutation({ mutationFn: academicService.createSubject, onSuccess: () => { qc.invalidateQueries({ queryKey: ['subjects'] }); setModal(null); } });
  const deleteClass = useMutation({ mutationFn: academicService.deleteClass, onSuccess: () => qc.invalidateQueries({ queryKey: ['classes'] }) });
  const deleteSection = useMutation({ mutationFn: academicService.deleteSection, onSuccess: () => qc.invalidateQueries({ queryKey: ['sections'] }) });
  const deleteSubject = useMutation({ mutationFn: academicService.deleteSubject, onSuccess: () => qc.invalidateQueries({ queryKey: ['subjects'] }) });

  const createHouse = useMutation({ mutationFn: houseService.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['houses'] }); setModal(null); } });
  const deleteHouse = useMutation({ mutationFn: houseService.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ['houses'] }) });
  const createLabel = useMutation({ mutationFn: labelService.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['labels'] }); setModal(null); } });
  const deleteLabel = useMutation({ mutationFn: labelService.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ['labels'] }) });

  const createRoute = useMutation({ mutationFn: transportService.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['transport-routes'] }); setModal(null); } });
  const deleteRoute = useMutation({ mutationFn: transportService.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ['transport-routes'] }) });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'years', label: 'Academic Years' },
    { id: 'classes', label: 'Classes' },
    { id: 'sections', label: 'Sections' },
    { id: 'subjects', label: 'Subjects' },
    { id: 'houses', label: 'Houses' },
    { id: 'labels', label: 'Labels' },
    { id: 'transport', label: 'Transport' },
  ];

  // Show wizard on first-time setup (no years configured yet)
  const showWizard = !yearsLoading && years.length === 0 && !wizardDismissed;
  if (showWizard) {
    return (
      <AcademicSetupWizard
        years={years} classes={classes} sections={sections} subjects={subjects}
        onExit={() => setWizardDismissed(true)}
      />
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="Academic Setup" subtitle="Configure academic years, classes, sections, and subjects" />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg mb-6 w-fit">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              tab === t.id ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Academic Years */}
      {tab === 'years' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900">Academic Years</h2>
            <button onClick={() => setModal({ type: 'year' })} className="btn-primary">+ Add Year</button>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
            {years.map((y) => (
              <div key={y._id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">{y.label}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{new Date(y.startDate).toLocaleDateString()} – {new Date(y.endDate).toLocaleDateString()}</p>
                </div>
                {y.isCurrent && <Badge variant="success">Current</Badge>}
              </div>
            ))}
            {years.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-slate-500">No academic years yet.</div>}
          </div>
        </div>
      )}

      {/* Classes */}
      {tab === 'classes' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-gray-900 dark:text-slate-100">Classes</h2>
              <select value={selectedYearId} onChange={(e) => setSelectedYearId(e.target.value)}
                className="text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-2 py-1">
                <option value="">All Years</option>
                {years.map(y => <option key={y._id} value={y._id}>{y.label}</option>)}
              </select>
            </div>
            <button onClick={() => setModal({ type: 'class' })} className="btn-primary">+ Add Class</button>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
            {classes.map((c) => (
              <div key={c._id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">{c.name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{CLASS_LEVELS.find(l => l.value === c.level)?.label}</p>
                </div>
                <button onClick={() => deleteClass.mutate(c._id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
              </div>
            ))}
            {classes.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-slate-500">No classes yet.</div>}
          </div>
        </div>
      )}

      {/* Sections */}
      {tab === 'sections' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-gray-900 dark:text-slate-100">Sections</h2>
              <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}
                className="text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-2 py-1">
                <option value="">All Classes</option>
                {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <button onClick={() => setModal({ type: 'section' })} className="btn-primary">+ Add Section</button>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
            {sections.map((s) => (
              <div key={s._id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-gray-900">Section {s.name}</p>
                  {s.capacity && <p className="text-xs text-gray-400">Capacity: {s.capacity}</p>}
                </div>
                <button onClick={() => deleteSection.mutate(s._id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
              </div>
            ))}
            {sections.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-slate-500">No sections yet.</div>}
          </div>
        </div>
      )}

      {/* Subjects */}
      {tab === 'subjects' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900">Subjects</h2>
            <button onClick={() => setModal({ type: 'subject' })} className="btn-primary">+ Add Subject</button>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
            {subjects.map((s) => (
              <div key={s._id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">{s.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{s.code}</p>
                </div>
                <div className="flex items-center gap-3">
                  {s.isElective && <Badge variant="purple">Elective</Badge>}
                  <button onClick={() => deleteSubject.mutate(s._id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                </div>
              </div>
            ))}
            {subjects.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-slate-500">No subjects yet.</div>}
          </div>
        </div>
      )}

      {/* Houses */}
      {tab === 'houses' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-slate-100">Houses</h2>
            <button onClick={() => setModal({ type: 'house' })} className="btn-primary">+ Add House</button>
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">Assign students to a house from their profile. Houses are used for inter-house competitions, sports days, and discipline points.</p>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
            {houses.map((h) => (
              <div key={h._id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full shrink-0 border border-black/10" style={{ background: h.colorHex }} />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-slate-100">{h.name}</p>
                    {h.motto && <p className="text-xs text-gray-400 dark:text-slate-500">{h.motto}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="default">{h.studentCount} students</Badge>
                  <button onClick={() => deleteHouse.mutate(h._id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                </div>
              </div>
            ))}
            {houses.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-slate-500">No houses yet.</div>}
          </div>
        </div>
      )}

      {/* Labels */}
      {tab === 'labels' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-slate-100">Labels</h2>
            <button onClick={() => setModal({ type: 'label' })} className="btn-primary">+ Add Label</button>
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">Free-form tags for students — scholarship holders, sports teams, bus routes, prefects, or anything else worth flagging.</p>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
            {labels.map((l) => (
              <div key={l._id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.colorHex }} />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-slate-100">{l.name}</p>
                    {l.category && <p className="text-xs text-gray-400 dark:text-slate-500">{l.category}</p>}
                  </div>
                </div>
                <button onClick={() => deleteLabel.mutate(l._id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
              </div>
            ))}
            {labels.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-slate-500">No labels yet.</div>}
          </div>
        </div>
      )}

      {/* Transport */}
      {tab === 'transport' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-slate-100">Transport Routes</h2>
            <button onClick={() => setModal({ type: 'route' })} className="btn-primary">+ Add Route</button>
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">Assign students to a route from their profile in Students. The route's monthly fee is added automatically as a line item when challans are generated.</p>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
            {routes.map((r) => (
              <div key={r._id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-slate-100">{r.name}</p>
                    {!r.isActive && <Badge variant="default">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    {r.vehicleNo}{r.driverName ? ` · ${r.driverName}` : ''}{r.driverPhone ? ` (${r.driverPhone})` : ''}
                    {r.stops.length > 0 && ` · Stops: ${r.stops.join(', ')}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="default">{r.studentCount} students</Badge>
                  <span className="font-semibold text-gray-800 dark:text-slate-200">Rs {r.monthlyFee.toLocaleString()}/mo</span>
                  <button onClick={() => deleteRoute.mutate(r._id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                </div>
              </div>
            ))}
            {routes.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-slate-500">No transport routes yet.</div>}
          </div>
        </div>
      )}

      {/* Create Year Modal */}
      <Modal open={modal?.type === 'year'} onClose={() => setModal(null)} title="Add Academic Year">
        <YearForm onSubmit={(d) => createYear.mutate(d)} loading={createYear.isPending} />
      </Modal>

      {/* Create Class Modal */}
      <Modal open={modal?.type === 'class'} onClose={() => setModal(null)} title="Add Class">
        <ClassForm years={years} onSubmit={(d) => createClass.mutate(d)} loading={createClass.isPending} />
      </Modal>

      {/* Create Section Modal */}
      <Modal open={modal?.type === 'section'} onClose={() => setModal(null)} title="Add Section">
        <SectionForm classes={classes} onSubmit={(d) => createSection.mutate(d)} loading={createSection.isPending} />
      </Modal>

      {/* Create Subject Modal */}
      <Modal open={modal?.type === 'subject'} onClose={() => setModal(null)} title="Add Subject">
        <SubjectForm onSubmit={(d) => createSubject.mutate(d)} loading={createSubject.isPending} />
      </Modal>

      {/* Create House Modal */}
      <Modal open={modal?.type === 'house'} onClose={() => setModal(null)} title="Add House">
        <HouseForm onSubmit={(d) => createHouse.mutate(d)} loading={createHouse.isPending} />
      </Modal>

      {/* Create Label Modal */}
      <Modal open={modal?.type === 'label'} onClose={() => setModal(null)} title="Add Label">
        <LabelForm onSubmit={(d) => createLabel.mutate(d)} loading={createLabel.isPending} />
      </Modal>

      {/* Create Route Modal */}
      <Modal open={modal?.type === 'route'} onClose={() => setModal(null)} title="Add Transport Route" size="lg">
        <RouteForm onSubmit={(d) => createRoute.mutate(d)} loading={createRoute.isPending} />
      </Modal>
    </div>
  );
}

function YearForm({ onSubmit, loading }: { onSubmit: (d: Partial<AcademicYear>) => void; loading: boolean }) {
  const [form, setForm] = useState({ label: '', startDate: '', endDate: '', isCurrent: false });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div>
        <label className="label">Year Label (e.g. 2024-25)</label>
        <input className="input" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">Start Date</label><input type="date" className="input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required /></div>
        <div><label className="label">End Date</label><input type="date" className="input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required /></div>
      </div>
      <label className="flex items-center gap-2 text-sm dark:text-slate-300"><input type="checkbox" checked={form.isCurrent} onChange={e => setForm(f => ({ ...f, isCurrent: e.target.checked }))} /> Set as current year</label>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving...' : 'Create Year'}</button>
    </form>
  );
}

function ClassForm({ years, onSubmit, loading }: { years: AcademicYear[]; onSubmit: (d: Partial<ClassDoc>) => void; loading: boolean }) {
  const [form, setForm] = useState({ name: '', level: '', academicYearId: '' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div>
        <label className="label">Class Name</label>
        <input className="input" placeholder="e.g. 9-A Science" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
      </div>
      <div>
        <label className="label">Level</label>
        <select className="input" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} required>
          <option value="">Select level...</option>
          {CLASS_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Academic Year</label>
        <select className="input" value={form.academicYearId} onChange={e => setForm(f => ({ ...f, academicYearId: e.target.value }))} required>
          <option value="">Select year...</option>
          {years.map(y => <option key={y._id} value={y._id}>{y.label}</option>)}
        </select>
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving...' : 'Create Class'}</button>
    </form>
  );
}

function SectionForm({ classes, onSubmit, loading }: { classes: ClassDoc[]; onSubmit: (d: Partial<SectionDoc>) => void; loading: boolean }) {
  const [form, setForm] = useState({ name: '', classId: '', capacity: '' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, capacity: form.capacity ? parseInt(form.capacity) : undefined }); }} className="space-y-4">
      <div>
        <label className="label">Class</label>
        <select className="input" value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))} required>
          <option value="">Select class...</option>
          {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Section Name (e.g. A, B, Science)</label>
        <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
      </div>
      <div>
        <label className="label">Capacity (optional)</label>
        <input type="number" className="input" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving...' : 'Create Section'}</button>
    </form>
  );
}

function SubjectForm({ onSubmit, loading }: { onSubmit: (d: Partial<SubjectDoc>) => void; loading: boolean }) {
  const [form, setForm] = useState({ name: '', code: '', isElective: false });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div>
        <label className="label">Subject Name</label>
        <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
      </div>
      <div>
        <label className="label">Subject Code</label>
        <input className="input" placeholder="e.g. PHY, MATH, ENG" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required />
      </div>
      <label className="flex items-center gap-2 text-sm dark:text-slate-300"><input type="checkbox" checked={form.isElective} onChange={e => setForm(f => ({ ...f, isElective: e.target.checked }))} /> Elective subject</label>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving...' : 'Create Subject'}</button>
    </form>
  );
}

function HouseForm({ onSubmit, loading }: { onSubmit: (d: Partial<HouseDoc>) => void; loading: boolean }) {
  const [form, setForm] = useState({ name: '', colorHex: '#2563eb', motto: '' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div>
        <label className="label">House Name</label>
        <input className="input" placeholder="e.g. Falcon House" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
      </div>
      <div>
        <label className="label">Color</label>
        <input type="color" className="w-full h-10 rounded-lg border border-gray-200 dark:border-slate-600" value={form.colorHex} onChange={e => setForm(f => ({ ...f, colorHex: e.target.value }))} />
      </div>
      <div>
        <label className="label">Motto (optional)</label>
        <input className="input" value={form.motto} onChange={e => setForm(f => ({ ...f, motto: e.target.value }))} />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving...' : 'Create House'}</button>
    </form>
  );
}

function LabelForm({ onSubmit, loading }: { onSubmit: (d: Partial<LabelDoc>) => void; loading: boolean }) {
  const [form, setForm] = useState({ name: '', colorHex: '#6b7280', category: '' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div>
        <label className="label">Label Name</label>
        <input className="input" placeholder="e.g. Scholarship Holder" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
      </div>
      <div>
        <label className="label">Color</label>
        <input type="color" className="w-full h-10 rounded-lg border border-gray-200 dark:border-slate-600" value={form.colorHex} onChange={e => setForm(f => ({ ...f, colorHex: e.target.value }))} />
      </div>
      <div>
        <label className="label">Category (optional)</label>
        <input className="input" placeholder="e.g. Achievement, Transport" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving...' : 'Create Label'}</button>
    </form>
  );
}

function RouteForm({ onSubmit, loading }: { onSubmit: (d: Partial<TransportRouteDoc>) => void; loading: boolean }) {
  const [form, setForm] = useState({ name: '', vehicleNo: '', driverName: '', driverPhone: '', capacity: '', monthlyFee: '' });
  const [stops, setStops] = useState<string[]>([]);
  const [stopInput, setStopInput] = useState('');

  const addStop = () => {
    const s = stopInput.trim();
    if (s) { setStops(prev => [...prev, s]); setStopInput(''); }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit({ ...form, capacity: form.capacity ? Number(form.capacity) : undefined, monthlyFee: Number(form.monthlyFee), stops } as Partial<TransportRouteDoc>);
    }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Route Name</label>
          <input className="input" placeholder="e.g. Route 3 — Gulberg" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        </div>
        <div>
          <label className="label">Vehicle No.</label>
          <input className="input" placeholder="e.g. LEA-1234" value={form.vehicleNo} onChange={e => setForm(f => ({ ...f, vehicleNo: e.target.value }))} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Driver Name (optional)</label>
          <input className="input" value={form.driverName} onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))} />
        </div>
        <div>
          <label className="label">Driver Phone (optional)</label>
          <input className="input" value={form.driverPhone} onChange={e => setForm(f => ({ ...f, driverPhone: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Capacity (optional)</label>
          <input type="number" min={1} className="input" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
        </div>
        <div>
          <label className="label">Monthly Fee (PKR)</label>
          <input type="number" min={0} className="input" value={form.monthlyFee} onChange={e => setForm(f => ({ ...f, monthlyFee: e.target.value }))} required />
        </div>
      </div>
      <div>
        <label className="label">Stops (optional)</label>
        <div className="flex gap-2 mb-2">
          <input className="input flex-1" placeholder="e.g. Model Town Chowk" value={stopInput}
            onChange={e => setStopInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addStop(); } }} />
          <button type="button" onClick={addStop} className="btn-secondary shrink-0">+ Add</button>
        </div>
        {stops.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {stops.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300">
                {s}
                <button type="button" onClick={() => setStops(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 leading-none">×</button>
              </span>
            ))}
          </div>
        )}
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving...' : 'Create Route'}</button>
    </form>
  );
}
