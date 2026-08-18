import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentService } from '../../services/studentService';
import type { CreateStudentPayload } from '../../services/studentService';
import { academicService } from '../../services/academicService';
import { houseService } from '../../services/houseService';
import { transportService } from '../../services/transportService';
import { branchHeaderService } from '../../services/branchHeaderService';
import { downloadTransferCertPdf } from '../../lib/transferCertPdf';
import { downloadCharacterCertPdf } from '../../lib/characterCertPdf';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { formatDate, formatCurrency } from '../../lib/utils';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';
import UserAvatar from '../../components/ui/UserAvatar';

const STATUS_VARIANTS = { applied: 'warning', enrolled: 'info', active: 'success', leaving: 'warning', graduated: 'default', transferred: 'purple', withdrawn: 'danger' } as const;

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide font-medium">{label}</span>
      <span className="text-sm text-gray-800 dark:text-slate-200">{value}</span>
    </div>
  );
}

function StudentProfileView() {
  const { data: student, isLoading } = useQuery({ queryKey: ['my-profile'], queryFn: studentService.getMe });

  if (isLoading) return <div className="p-6 text-center text-gray-400 text-sm">Loading profile...</div>;
  if (!student) return <div className="p-6 text-center text-gray-400 text-sm">Profile not found.</div>;

  const className = typeof student.classId === 'object' ? student.classId.name : '—';
  const sectionName = typeof student.sectionId === 'object' ? student.sectionId.name : '—';

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader title="My Profile" />

      {/* Identity card */}
      <div className="card p-5 mb-4 flex items-center gap-5">
        <UserAvatar
          name={student.profile.name}
          photoUrl={student.profile.photoUrl}
          className="w-16 h-16 rounded-full text-xl"
          fallbackClassName="bg-blue-100 text-blue-600"
        />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{student.profile.name}</h2>
          <p className="text-sm text-gray-500">{className} — Section {sectionName}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-mono text-gray-400">Roll No: {student.rollNo}</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs font-mono text-gray-400">Adm: {student.admissionNo}</span>
            <Badge variant={STATUS_VARIANTS[student.status as keyof typeof STATUS_VARIANTS] ?? 'default'}>{student.status}</Badge>
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="card p-5 mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Personal Information</p>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Date of Birth" value={formatDate(student.profile.dateOfBirth)} />
          <InfoRow label="Gender" value={student.profile.gender.charAt(0).toUpperCase() + student.profile.gender.slice(1)} />
          <InfoRow label="CNIC / B-Form" value={student.profile.cnicOrBForm} />
          <InfoRow label="Admission Date" value={formatDate(student.admissionDate)} />
          {student.profile.address && <div className="col-span-2"><InfoRow label="Address" value={student.profile.address} /></div>}
        </div>
      </div>

      {/* Guardian info */}
      <div className="card p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Guardian Information</p>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Father's Name" value={student.guardianInfo.fatherName} />
          <InfoRow label="Father's Phone" value={student.guardianInfo.fatherPhone} />
          {student.guardianInfo.fatherCnic && <InfoRow label="Father's CNIC" value={student.guardianInfo.fatherCnic} />}
        </div>
      </div>
    </div>
  );
}

export default function StudentsPage() {
  const user = useAuthStore(s => s.user);
  if (user?.role === 'student') return <StudentProfileView />;
  return <StaffStudentsView />;
}

function StaffStudentsView() {
  const qc = useQueryClient();
  const orgSlug = useAuthStore(s => s.orgSlug);
  const [showAdd, setShowAdd] = useState(false);
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [addResult, setAddResult] = useState<{ tempPassword: string; admissionNo: string } | null>(null);
  const [leavingStudent, setLeavingStudent] = useState<import('../../services/studentService').StudentDoc | null>(null);
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [editingFeeValue, setEditingFeeValue] = useState('');
  const [editingHouseId, setEditingHouseId] = useState<string | null>(null);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);

  const { data: houses = [] } = useQuery({ queryKey: ['houses'], queryFn: houseService.list });
  const houseMap = new Map(houses.map(h => [h._id, h]));

  const { data: routes = [] } = useQuery({ queryKey: ['transport-routes'], queryFn: transportService.list });
  const routeMap = new Map(routes.map(r => [r._id, r]));

  const { data: branchHeader } = useQuery({ queryKey: ['branch-header'], queryFn: branchHeaderService.get });
  const orgName = branchHeader?.schoolName ?? orgSlug ?? 'School';

  const { data: years = [] } = useQuery({ queryKey: ['years'], queryFn: academicService.getYears });
  const currentYear = years.find(y => y.isCurrent) ?? years[0];
  const { data: classes = [] } = useQuery({ queryKey: ['classes', currentYear?._id], queryFn: () => academicService.getClasses(currentYear?._id), enabled: !!currentYear });
  const { data: sections = [] } = useQuery({ queryKey: ['sections', classFilter], queryFn: () => academicService.getSections(classFilter || undefined) });

  const params: Record<string, string> = {};
  if (classFilter) params.classId = classFilter;
  if (sectionFilter) params.sectionId = sectionFilter;
  if (statusFilter) params.status = statusFilter;
  if (currentYear) params.academicYearId = currentYear._id;

  const { data: result, isLoading } = useQuery({
    queryKey: ['students', params],
    queryFn: () => studentService.list(params),
    enabled: !!currentYear,
  });

  const students = result?.data ?? [];
  const total = result?.meta?.total ?? 0;

  const createStudent = useMutation({
    mutationFn: studentService.create,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['students'] });
      setShowAdd(false);
      if (data) setAddResult({ tempPassword: data.tempPassword, admissionNo: data.student.admissionNo });
    },
  });

  const updateFee = useMutation({
    mutationFn: ({ id, fee }: { id: string; fee: number | null }) => studentService.updateMonthlyFee(id, fee),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); setEditingFeeId(null); },
  });

  const assignHouse = useMutation({
    mutationFn: ({ id, houseId }: { id: string; houseId: string }) => studentService.update(id, { houseId: (houseId || null) as unknown as string | undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); qc.invalidateQueries({ queryKey: ['houses'] }); setEditingHouseId(null); },
  });

  const assignRoute = useMutation({
    mutationFn: ({ id, routeId }: { id: string; routeId: string }) => studentService.update(id, { transport: routeId ? { routeId } : null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); qc.invalidateQueries({ queryKey: ['transport-routes'] }); setEditingRouteId(null); },
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Students"
        subtitle={`${total} students`}
        actions={
          <button onClick={() => setShowAdd(true)} className="btn-primary">+ Admit Student</button>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <select value={classFilter} onChange={e => { setClassFilter(e.target.value); setSectionFilter(''); }} className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} disabled={!classFilter} className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 disabled:opacity-50">
          <option value="">All Sections</option>
          {sections.map(s => <option key={s._id} value={s._id}>Section {s.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200">
          <option value="">All Status</option>
          {['applied', 'enrolled', 'active', 'leaving', 'graduated', 'transferred', 'withdrawn'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Roll No</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Class / Section</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">House</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Route</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Guardian</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Admitted</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Monthly Fee</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {isLoading && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500">Loading...</td></tr>
            )}
            {!isLoading && students.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500">No students found.</td></tr>
            )}
            {students.map((s) => (
              <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors">
                <td className="px-4 py-3 font-mono text-gray-600 dark:text-slate-300">{s.rollNo}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={s.profile.name}
                      photoUrl={s.profile.photoUrl}
                      className="h-9 w-9 rounded-xl text-xs"
                      fallbackClassName="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    />
                    <Link to={s._id} className="font-medium text-gray-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 hover:underline">
                      {s.profile.name}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                  {typeof s.classId === 'object' ? s.classId.name : '—'}
                  {typeof s.sectionId === 'object' ? ` / ${s.sectionId.name}` : ''}
                </td>
                <td className="px-4 py-3">
                  {editingHouseId === s._id ? (
                    <select
                      autoFocus
                      className="text-xs border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200"
                      defaultValue={s.houseId ?? ''}
                      onChange={(e) => assignHouse.mutate({ id: s._id, houseId: e.target.value })}
                      onBlur={() => setEditingHouseId(null)}
                    >
                      <option value="">— None —</option>
                      {houses.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                    </select>
                  ) : (
                    <button onClick={() => setEditingHouseId(s._id)} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-300 hover:text-blue-600 transition-colors">
                      {s.houseId && houseMap.get(s.houseId) ? (
                        <>
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: houseMap.get(s.houseId)!.colorHex }} />
                          {houseMap.get(s.houseId)!.name}
                        </>
                      ) : (
                        <span className="text-gray-300 dark:text-slate-600 italic">Assign</span>
                      )}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingRouteId === s._id ? (
                    <select
                      autoFocus
                      className="text-xs border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200"
                      defaultValue={s.transport?.routeId ?? ''}
                      onChange={(e) => assignRoute.mutate({ id: s._id, routeId: e.target.value })}
                      onBlur={() => setEditingRouteId(null)}
                    >
                      <option value="">— None —</option>
                      {routes.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                    </select>
                  ) : (
                    <button onClick={() => setEditingRouteId(s._id)} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-300 hover:text-blue-600 transition-colors">
                      {s.transport?.routeId && routeMap.get(s.transport.routeId) ? (
                        routeMap.get(s.transport.routeId)!.name
                      ) : (
                        <span className="text-gray-300 dark:text-slate-600 italic">Assign</span>
                      )}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                  <p>{s.guardianInfo.fatherName}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{s.guardianInfo.fatherPhone}</p>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{formatDate(s.admissionDate)}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANTS[s.status as keyof typeof STATUS_VARIANTS] ?? 'default'}>
                    {s.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {editingFeeId === s._id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        className="w-24 text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100"
                        value={editingFeeValue}
                        onChange={e => setEditingFeeValue(e.target.value)}
                        placeholder="0"
                        autoFocus
                        min={0}
                      />
                      <button
                        onClick={() => updateFee.mutate({ id: s._id, fee: editingFeeValue ? Number(editingFeeValue) : null })}
                        disabled={updateFee.isPending}
                        className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {updateFee.isPending ? '...' : '✓'}
                      </button>
                      <button onClick={() => setEditingFeeId(null)} className="text-xs px-1.5 py-1 rounded border border-gray-200 dark:border-slate-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingFeeId(s._id); setEditingFeeValue(s.monthlyFee ? String(s.monthlyFee) : ''); }}
                      className={cn('text-sm group flex items-center gap-1.5 hover:text-blue-600 transition-colors', s.monthlyFee ? 'text-gray-800 dark:text-slate-200 font-medium' : 'text-gray-400 dark:text-slate-500 italic')}
                      title="Click to edit monthly fee"
                    >
                      {s.monthlyFee ? formatCurrency(s.monthlyFee) : 'Per structure'}
                      <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Link
                      to={s._id}
                      title="View Profile"
                      className="text-xs px-2 py-1 rounded border border-blue-200 dark:border-blue-700/40 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => downloadTransferCertPdf(s, orgName)}
                      title="Download Transfer Certificate"
                      className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      ↓ TC
                    </button>
                    {!['transferred', 'withdrawn', 'graduated'].includes(s.status) && (
                      <button
                        onClick={() => setLeavingStudent(s)}
                        title="Initiate Leaving Process"
                        className="text-xs px-2 py-1 rounded border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors"
                      >
                        Leave
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Admission form */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Admit New Student" size="xl">
        <AdmissionForm
          classes={classes}
          sections={sections}
          years={years}
          selectedClassId={classFilter}
          onClassChange={setClassFilter}
          onSubmit={(d) => createStudent.mutate(d)}
          loading={createStudent.isPending}
        />
      </Modal>

      {/* Success result */}
      {addResult && (
        <Modal open={!!addResult} onClose={() => setAddResult(null)} title="Student Admitted Successfully">
          <div className="space-y-3">
            <p className="text-sm text-gray-600">The student has been registered. Share these login credentials:</p>
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm space-y-1">
              <p><span className="text-gray-500">Admission No:</span> <strong>{addResult.admissionNo}</strong></p>
              <p><span className="text-gray-500">Temp Password:</span> <strong>{addResult.tempPassword}</strong></p>
            </div>
            <p className="text-xs text-gray-400">Student should change password on first login.</p>
            <button onClick={() => setAddResult(null)} className="btn-primary w-full">Done</button>
          </div>
        </Modal>
      )}

      {/* Leaving modal */}
      {leavingStudent && (
        <Modal open={!!leavingStudent} onClose={() => { setLeavingStudent(null); qc.invalidateQueries({ queryKey: ['students'] }); }} title={`Leaving Process — ${leavingStudent.profile.name}`} size="xl">
          <LeavingModal student={leavingStudent} orgName={orgName} onDone={() => { setLeavingStudent(null); qc.invalidateQueries({ queryKey: ['students'] }); }} />
        </Modal>
      )}
    </div>
  );
}

interface AdmissionFormProps {
  classes: import('../../services/academicService').ClassDoc[];
  sections: import('../../services/academicService').SectionDoc[];
  years: import('../../services/academicService').AcademicYear[];
  selectedClassId: string;
  onClassChange: (id: string) => void;
  onSubmit: (d: CreateStudentPayload) => void;
  loading: boolean;
}

function AdmissionForm({ classes, sections, years, selectedClassId, onClassChange, onSubmit, loading }: AdmissionFormProps) {
  const [form, setForm] = useState({
    email: '',
    classId: selectedClassId,
    sectionId: '',
    academicYearId: years.find(y => y.isCurrent)?._id ?? years[0]?._id ?? '',
    previousSchool: '',
    monthlyFee: '',
    profile: { name: '', dateOfBirth: '', gender: 'male' as 'male' | 'female' | 'other', cnicOrBForm: '', address: '' },
    guardianInfo: { fatherName: '', fatherPhone: '', fatherCnic: '', motherName: '', motherPhone: '' },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { monthlyFee, ...rest } = form;
    onSubmit({ ...rest, ...(monthlyFee ? { monthlyFee: Number(monthlyFee) } : {}) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">Student Information</p></div>

        <div><label className="label">Full Name *</label><input className="input" value={form.profile.name} onChange={e => setForm(f => ({ ...f, profile: { ...f.profile, name: e.target.value } }))} required /></div>
        <div><label className="label">Login Email *</label><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
        <div><label className="label">Date of Birth *</label><input type="date" className="input" value={form.profile.dateOfBirth} onChange={e => setForm(f => ({ ...f, profile: { ...f.profile, dateOfBirth: e.target.value } }))} required /></div>
        <div>
          <label className="label">Gender *</label>
          <select className="input" value={form.profile.gender} onChange={e => setForm(f => ({ ...f, profile: { ...f.profile, gender: e.target.value as 'male' | 'female' | 'other' } }))}>
            <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
          </select>
        </div>
        <div><label className="label">CNIC / B-Form *</label><input className="input" value={form.profile.cnicOrBForm} onChange={e => setForm(f => ({ ...f, profile: { ...f.profile, cnicOrBForm: e.target.value } }))} required /></div>
        <div><label className="label">Previous School</label><input className="input" value={form.previousSchool} onChange={e => setForm(f => ({ ...f, previousSchool: e.target.value }))} /></div>

        <div className="col-span-2 border-t border-gray-100 dark:border-slate-700 pt-4"><p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">Enrollment</p></div>

        <div>
          <label className="label">Academic Year *</label>
          <select className="input" value={form.academicYearId} onChange={e => setForm(f => ({ ...f, academicYearId: e.target.value }))} required>
            {years.map(y => <option key={y._id} value={y._id}>{y.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Class *</label>
          <select className="input" value={form.classId} onChange={e => { setForm(f => ({ ...f, classId: e.target.value, sectionId: '' })); onClassChange(e.target.value); }} required>
            <option value="">Select class...</option>
            {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Section *</label>
          <select className="input" value={form.sectionId} onChange={e => setForm(f => ({ ...f, sectionId: e.target.value }))} required>
            <option value="">Select section...</option>
            {sections.map(s => <option key={s._id} value={s._id}>Section {s.name}</option>)}
          </select>
        </div>

        <div className="col-span-2">
          <label className="label">Monthly Fee (PKR)</label>
          <input
            type="number"
            className="input"
            value={form.monthlyFee}
            onChange={e => setForm(f => ({ ...f, monthlyFee: e.target.value }))}
            placeholder="Leave blank to use class fee structure"
            min={0}
          />
          <p className="text-xs text-gray-400 mt-1">Optional — overrides the class fee structure for this student only (e.g. scholarship, sibling concession).</p>
        </div>

        <div className="col-span-2 border-t border-gray-100 dark:border-slate-700 pt-4"><p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">Guardian Information</p></div>

        <div><label className="label">Father's Name *</label><input className="input" value={form.guardianInfo.fatherName} onChange={e => setForm(f => ({ ...f, guardianInfo: { ...f.guardianInfo, fatherName: e.target.value } }))} required /></div>
        <div><label className="label">Father's Phone *</label><input className="input" value={form.guardianInfo.fatherPhone} onChange={e => setForm(f => ({ ...f, guardianInfo: { ...f.guardianInfo, fatherPhone: e.target.value } }))} required /></div>
        <div><label className="label">Father's CNIC</label><input className="input" value={form.guardianInfo.fatherCnic} onChange={e => setForm(f => ({ ...f, guardianInfo: { ...f.guardianInfo, fatherCnic: e.target.value } }))} /></div>
        <div><label className="label">Mother's Name</label><input className="input" value={form.guardianInfo.motherName} onChange={e => setForm(f => ({ ...f, guardianInfo: { ...f.guardianInfo, motherName: e.target.value } }))} /></div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3">
        {loading ? 'Registering...' : 'Register Student'}
      </button>
    </form>
  );
}

// ── Leaving flow ─────────────────────────────────────────────────────────────

type LeavingStep = 'init' | 'dues' | 'certs';

const LEAVING_REASONS = [
  { value: 'withdrawal', label: 'Withdrawal by parent/guardian' },
  { value: 'migration', label: 'Migration to another city/school' },
  { value: 'completed', label: 'Completed course / Graduated' },
  { value: 'fee_nonpayment', label: 'Fee non-payment' },
  { value: 'expelled', label: 'Expelled / Disciplinary action' },
  { value: 'other', label: 'Other' },
];

function LeavingModal({
  student,
  orgName,
  onDone,
}: {
  student: import('../../services/studentService').StudentDoc;
  orgName: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState<LeavingStep>('init');
  const [reason, setReason] = useState('withdrawal');
  const [duesResult, setDuesResult] = useState<{ financeCleared: boolean; outstandingChallans: number } | null>(null);
  const [tcIssued, setTcIssued] = useState(false);
  const [charCertIssued, setCharCertIssued] = useState(false);

  const { data: leavingStatus } = useQuery({
    queryKey: ['leaving-status', student._id],
    queryFn: () => studentService.getLeavingStatus(student._id),
  });

  const currentStudent = leavingStatus?.student ?? student;
  const leavingInfo = leavingStatus?.student?.leavingInfo;

  useEffect(() => {
    if (leavingInfo?.initiatedAt && step === 'init') setStep('dues');
    if (leavingInfo?.financeCleared && step === 'dues') setStep('certs');
  }, [leavingInfo, step]);

  const initiate = useMutation({
    mutationFn: () => studentService.initiateLeavingProcess(student._id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaving-status', student._id] });
      setStep('dues');
    },
  });

  const checkDues = useMutation({
    mutationFn: (override: boolean) => studentService.clearFinanceDues(student._id, override),
    onSuccess: (data) => {
      setDuesResult(data ?? null);
      if (data?.financeCleared) {
        qc.invalidateQueries({ queryKey: ['leaving-status', student._id] });
      }
    },
  });

  const issueTcMut = useMutation({
    mutationFn: () => studentService.issueTc(student._id),
    onSuccess: (data) => {
      setTcIssued(true);
      qc.invalidateQueries({ queryKey: ['leaving-status', student._id] });
      downloadTransferCertPdf(data ?? currentStudent, orgName);
    },
  });

  const issueCharMut = useMutation({
    mutationFn: () => studentService.issueCharCert(student._id),
    onSuccess: () => {
      setCharCertIssued(true);
      qc.invalidateQueries({ queryKey: ['leaving-status', student._id] });
      downloadCharacterCertPdf(currentStudent, orgName);
    },
  });

  if (step === 'init') {
    return (
      <div className="space-y-5">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">⚠ This will initiate the student leaving workflow.</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">The student status will change to "leaving". You will be guided through finance clearance and certificate issuance.</p>
        </div>
        <div>
          <label className="label">Reason for Leaving *</label>
          <select className="input" value={reason} onChange={e => setReason(e.target.value)}>
            {LEAVING_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <button onClick={() => initiate.mutate()} disabled={initiate.isPending} className="btn-primary w-full">
          {initiate.isPending ? 'Processing...' : 'Initiate Leaving Process'}
        </button>
      </div>
    );
  }

  if (step === 'dues') {
    const cleared = duesResult?.financeCleared ?? !!(leavingInfo?.financeCleared);
    const outstanding = duesResult?.outstandingChallans ?? leavingStatus?.outstandingChallans ?? 0;
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-700 rounded-lg p-4">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center shrink-0">
            <span className="text-blue-600 dark:text-blue-300 text-sm font-bold">2</span>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Finance Clearance</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Check and clear all outstanding fee challans before issuing certificates.</p>
          </div>
        </div>

        {cleared ? (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
            <span className="text-green-600 text-lg">✓</span>
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">Finance cleared — no outstanding dues.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {duesResult !== null && outstanding > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 space-y-2">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">⚠ {outstanding} outstanding challan(s) found.</p>
                <p className="text-xs text-red-500 dark:text-red-400">Finance dues must be cleared before issuing TC. You can override if the matter is being handled separately.</p>
                <button
                  onClick={() => checkDues.mutate(true)}
                  disabled={checkDues.isPending}
                  className="text-xs px-3 py-1.5 rounded border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
                >
                  Override & Mark Finance Cleared
                </button>
              </div>
            )}
            <button onClick={() => checkDues.mutate(false)} disabled={checkDues.isPending} className="btn-primary w-full">
              {checkDues.isPending ? 'Checking...' : 'Check Finance Status'}
            </button>
          </div>
        )}

        {cleared && (
          <button onClick={() => setStep('certs')} className="btn-primary w-full">
            Continue to Certificates →
          </button>
        )}
      </div>
    );
  }

  // step === 'certs'
  const tcIssuedAt = leavingInfo?.tcIssuedAt;
  const charCertIssuedAt = leavingInfo?.charCertIssuedAt;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-700 rounded-lg p-4">
        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center shrink-0">
          <span className="text-green-600 dark:text-green-300 text-sm font-bold">3</span>
        </div>
        <div>
          <p className="text-sm font-medium text-green-800 dark:text-green-300">Issue Certificates</p>
          <p className="text-xs text-green-600 dark:text-green-400">Issue and download the Transfer Certificate and Character Certificate.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-gray-200 dark:border-slate-600 rounded-lg p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">Transfer Certificate</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Official TC for school records.</p>
          </div>
          {(tcIssuedAt || tcIssued) ? (
            <div className="space-y-2">
              <p className="text-xs text-green-600 dark:text-green-400">✓ Issued {tcIssuedAt ? formatDate(tcIssuedAt) : 'just now'}</p>
              <button onClick={() => downloadTransferCertPdf(currentStudent, orgName)} className="text-xs px-3 py-1.5 w-full rounded border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">
                ↓ Download Again
              </button>
            </div>
          ) : (
            <button onClick={() => issueTcMut.mutate()} disabled={issueTcMut.isPending} className="btn-primary w-full text-sm py-2">
              {issueTcMut.isPending ? 'Issuing...' : 'Issue TC & Download'}
            </button>
          )}
        </div>

        <div className="border border-gray-200 dark:border-slate-600 rounded-lg p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">Character Certificate</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Official character certificate for the student.</p>
          </div>
          {(charCertIssuedAt || charCertIssued) ? (
            <div className="space-y-2">
              <p className="text-xs text-green-600 dark:text-green-400">✓ Issued {charCertIssuedAt ? formatDate(charCertIssuedAt) : 'just now'}</p>
              <button onClick={() => downloadCharacterCertPdf(currentStudent, orgName)} className="text-xs px-3 py-1.5 w-full rounded border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">
                ↓ Download Again
              </button>
            </div>
          ) : (
            <button onClick={() => issueCharMut.mutate()} disabled={issueCharMut.isPending} className="btn-primary w-full text-sm py-2">
              {issueCharMut.isPending ? 'Issuing...' : 'Issue Cert & Download'}
            </button>
          )}
        </div>
      </div>

      <button onClick={onDone} className="w-full text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors py-2">
        Close & Finish
      </button>
    </div>
  );
}
