import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { Attendance } from '../models/Attendance';
import { Student } from '../models/Student';
import { Branch } from '../models/Branch';
import { StaffAttendance } from '../models/StaffAttendance';
import { User } from '../models/User';
import { Class } from '../models/Class';
import { Section } from '../models/Section';
import { Subject } from '../models/Subject';
import { AcademicYear } from '../models/AcademicYear';
import { orgBranchScope } from '../utils/orgBranchScope';
import { emitToBranch } from '../socket';
import { pushNotification } from './notificationController';

export const markAttendanceValidators = [
  body('classId').isMongoId(),
  body('sectionId').isMongoId(),
  body('date').isISO8601(),
  body('records').isArray({ min: 1 }),
  body('records.*.studentId').isMongoId(),
  body('records.*.status').isIn(['present', 'absent', 'late', 'excused']),
];

/** Notifies students newly marked absent (fire-and-forget from markAttendance). */
async function notifyAbsentStudents(opts: {
  orgId: string; branchId: string; studentIds: string[]; date: Date; subjectId?: string; senderId: string;
}): Promise<void> {
  const { orgId, branchId, studentIds, date, subjectId, senderId } = opts;

  const [students, subject] = await Promise.all([
    Student.find({ orgId, branchId, _id: { $in: studentIds } }).select('userId profile.name').lean(),
    subjectId ? Subject.findById(subjectId).select('name').lean() : Promise.resolve(null),
  ]);

  const dateLabel = date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  const subjectSuffix = subject ? ` (${subject.name})` : '';

  await Promise.all(students.map((s) => pushNotification({
    orgId: new Types.ObjectId(orgId),
    branchId: new Types.ObjectId(branchId),
    recipientId: s.userId,
    senderId: new Types.ObjectId(senderId),
    type: 'attendance_absent',
    title: 'Marked Absent',
    message: `${s.profile.name} was marked absent on ${dateLabel}${subjectSuffix}.`,
    link: '/student/attendance',
  })));
}

export async function markAttendance(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId, id: markedById } = req.user!;
  const { classId, sectionId, date, periodNo, subjectId, records } = req.body;

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const filter = { orgId, branchId, classId, sectionId, date: { $gte: dayStart, $lte: dayEnd }, periodNo: periodNo ?? null };

  // Snapshot the prior state so we only notify students who *newly* became absent —
  // re-saving the same day's attendance shouldn't re-fire notifications.
  const previous = await Attendance.findOne(filter).select('records').lean();
  const prevStatusMap = new Map((previous?.records ?? []).map((r) => [String(r.studentId), r.status]));

  const existing = await Attendance.findOneAndUpdate(
    filter,
    { orgId, branchId, classId, sectionId, date: dayStart, periodNo, subjectId, markedById, records },
    { upsert: true, new: true, runValidators: true }
  );

  emitToBranch(orgId!, branchId!, 'attendance:updated', {
    classId, sectionId, date: dayStart.toISOString().split('T')[0],
  });

  const newlyAbsentIds = (records as { studentId: string; status: string }[])
    .filter((r) => r.status === 'absent' && prevStatusMap.get(String(r.studentId)) !== 'absent')
    .map((r) => r.studentId);

  if (newlyAbsentIds.length > 0) {
    await notifyAbsentStudents({
      orgId: orgId!, branchId: branchId!, studentIds: newlyAbsentIds, date: dayStart, subjectId, senderId: markedById,
    }).catch((err) => console.error('Failed to send absent notifications:', err));
  }

  res.json({ success: true, data: existing });
}

export async function getAttendance(req: Request, res: Response): Promise<void> {
  const { orgId, branchId, role } = req.user!;

  // Students see only their own attendance via the dedicated endpoint
  if (role === 'student') {
    return getMyAttendance(req, res);
  }

  const { classId, sectionId, date, startDate, endDate } = req.query;

  const filter: Record<string, unknown> = orgBranchScope({ orgId, branchId });
  if (classId) filter.classId = classId;
  if (sectionId) filter.sectionId = sectionId;

  if (date) {
    const d = new Date(date as string);
    d.setHours(0, 0, 0, 0);
    const e = new Date(date as string);
    e.setHours(23, 59, 59, 999);
    filter.date = { $gte: d, $lte: e };
  } else if (startDate && endDate) {
    filter.date = { $gte: new Date(startDate as string), $lte: new Date(endDate as string) };
  }

  const records = await Attendance.find(filter)
    .populate('records.studentId', 'profile.name rollNo')
    .sort({ date: -1 })
    .lean();

  res.json({ success: true, data: records });
}

export async function getStudentMonthlySummary(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const { studentId, month, year } = req.query;

  if (!studentId || !month || !year) {
    res.status(400).json({ success: false, message: 'studentId, month, and year are required' });
    return;
  }

  const monthStart = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
  const monthEnd = new Date(parseInt(year as string), parseInt(month as string), 0);

  const records = await Attendance.find({
    ...orgBranchScope({ orgId, branchId }),
    date: { $gte: monthStart, $lte: monthEnd },
    'records.studentId': new Types.ObjectId(studentId as string),
  }).lean();

  let present = 0, absent = 0, late = 0, excused = 0;

  for (const att of records) {
    const r = att.records.find((rec) => String(rec.studentId) === studentId);
    if (!r) continue;
    if (r.status === 'present') present++;
    else if (r.status === 'absent') absent++;
    else if (r.status === 'late') late++;
    else if (r.status === 'excused') excused++;
  }

  const total = present + absent + late + excused;
  const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  // Get branch threshold
  const branch = await Branch.findOne({ orgId, _id: branchId }).lean();
  const threshold = branch?.settings?.attendanceThreshold ?? 75;
  const isShortage = total > 0 && percentage < threshold;

  res.json({
    success: true,
    data: { studentId, month, year, present, absent, late, excused, total, percentage, threshold, isShortage },
  });
}

export async function getMyAttendance(req: Request, res: Response): Promise<void> {
  const { orgId, branchId, id: userId } = req.user!;
  const { month, year } = req.query;

  if (!month || !year) {
    res.status(400).json({ success: false, message: 'month and year are required' });
    return;
  }

  const student = await Student.findOne({ orgId, branchId, userId }).lean();
  if (!student) {
    res.status(404).json({ success: false, message: 'Student profile not found' });
    return;
  }

  const monthStart = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
  const monthEnd = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59);

  const attendanceDocs = await Attendance.find({
    orgId, branchId,
    date: { $gte: monthStart, $lte: monthEnd },
    'records.studentId': student._id,
  }).lean();

  const records: { date: string; status: string }[] = [];
  let present = 0, absent = 0, late = 0, excused = 0;

  for (const att of attendanceDocs) {
    const r = att.records.find((rec) => String(rec.studentId) === String(student._id));
    if (!r) continue;
    records.push({ date: att.date.toISOString().split('T')[0], status: r.status });
    if (r.status === 'present') present++;
    else if (r.status === 'absent') absent++;
    else if (r.status === 'late') late++;
    else if (r.status === 'excused') excused++;
  }

  const total = present + absent + late + excused;
  const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  const branch = await Branch.findOne({ orgId, _id: branchId }).lean();
  const threshold = branch?.settings?.attendanceThreshold ?? 75;

  res.json({
    success: true,
    data: { records, stats: { present, absent, late, excused, total, percentage, threshold, isShortage: total > 0 && percentage < threshold } },
  });
}

export async function getSectionSummary(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const { sectionId, month, year } = req.query;

  if (!sectionId || !month || !year) {
    res.status(400).json({ success: false, message: 'sectionId, month, and year required' });
    return;
  }

  const sid = sectionId as string;
  const monthStart = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
  const monthEnd = new Date(parseInt(year as string), parseInt(month as string), 0);

  const [students, aggResult, branch] = await Promise.all([
    Student.find({ orgId, branchId, sectionId: sid, status: 'active' }).lean(),
    Attendance.aggregate([
      {
        $match: {
          orgId: new Types.ObjectId(orgId!),
          branchId: new Types.ObjectId(branchId!),
          sectionId: new Types.ObjectId(sid),
          date: { $gte: monthStart, $lte: monthEnd },
        },
      },
      { $unwind: '$records' },
      {
        $group: {
          _id: '$records.studentId',
          present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$records.status', 'absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$records.status', 'late'] }, 1, 0] } },
          excused: { $sum: { $cond: [{ $eq: ['$records.status', 'excused'] }, 1, 0] } },
        },
      },
    ]),
    Branch.findOne({ orgId, _id: branchId }).lean(),
  ]);

  const threshold = branch?.settings?.attendanceThreshold ?? 75;
  const statsMap = new Map(aggResult.map(r => [r._id.toString(), r]));

  const summary = students.map((student) => {
    const s = statsMap.get(student._id.toString()) ?? { present: 0, absent: 0, late: 0, excused: 0 };
    const total = s.present + s.absent + s.late + s.excused;
    const percentage = total > 0 ? Math.round(((s.present + s.late) / total) * 100) : 0;
    return {
      studentId: student._id,
      name: student.profile.name,
      rollNo: student.rollNo,
      present: s.present, absent: s.absent, late: s.late, excused: s.excused,
      total, percentage,
      isShortage: total > 0 && percentage < threshold,
    };
  });

  res.json({ success: true, data: summary });
}

/** Live "who has marked attendance today" board — powers the real-time attendance dashboard. */
export async function getTodayAttendanceStatus(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const dateParam = (req.query.date as string) ?? new Date().toISOString().split('T')[0];

  const dayStart = new Date(dateParam);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dateParam);
  dayEnd.setHours(23, 59, 59, 999);

  const currentYear = await AcademicYear.findOne({ orgId, branchId, isCurrent: true }).lean();
  const classFilter: Record<string, unknown> = { orgId, branchId };
  if (currentYear) classFilter.academicYearId = currentYear._id;

  const classes = await Class.find(classFilter).select('name displayOrder').sort({ displayOrder: 1 }).lean();
  const classIds = classes.map((c) => c._id);
  const sections = await Section.find({ orgId, branchId, classId: { $in: classIds } }).select('name classId').lean();
  const sectionIds = sections.map((s) => s._id);

  const [studentCounts, attendanceToday] = await Promise.all([
    Student.aggregate([
      { $match: { orgId: new Types.ObjectId(orgId!), branchId: new Types.ObjectId(branchId!), sectionId: { $in: sectionIds }, status: 'active' } },
      { $group: { _id: '$sectionId', count: { $sum: 1 } } },
    ]),
    Attendance.aggregate([
      { $match: { orgId: new Types.ObjectId(orgId!), branchId: new Types.ObjectId(branchId!), sectionId: { $in: sectionIds }, date: { $gte: dayStart, $lte: dayEnd } } },
      { $unwind: '$records' },
      {
        $group: {
          _id: '$sectionId',
          present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$records.status', 'absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$records.status', 'late'] }, 1, 0] } },
          excused: { $sum: { $cond: [{ $eq: ['$records.status', 'excused'] }, 1, 0] } },
          lastMarkedAt: { $max: '$updatedAt' },
          markedById: { $last: '$markedById' },
        },
      },
    ]),
  ]);

  const countMap = new Map(studentCounts.map((c) => [c._id.toString(), c.count as number]));
  const attMap = new Map(attendanceToday.map((a) => [a._id.toString(), a]));
  const classInfoMap = new Map(classes.map((c) => [String(c._id), { name: c.name, order: c.displayOrder }]));

  const markedByIds = attendanceToday.map((a) => a.markedById).filter(Boolean);
  const teachers = await User.find({ _id: { $in: markedByIds } }).select('name').lean();
  const teacherNameMap = new Map(teachers.map((t) => [String(t._id), t.name]));

  const rows = sections
    .map((section) => {
      const cls = classInfoMap.get(String(section.classId));
      const att = attMap.get(String(section._id));
      const totalStudents = countMap.get(String(section._id)) ?? 0;
      const present = att?.present ?? 0, absent = att?.absent ?? 0, late = att?.late ?? 0, excused = att?.excused ?? 0;
      const marked = present + absent + late + excused;
      return {
        classId: section.classId,
        className: cls?.name ?? 'Unknown',
        classOrder: cls?.order ?? 0,
        sectionId: section._id,
        sectionName: section.name,
        totalStudents,
        marked,
        present, absent, late, excused,
        isMarked: marked > 0,
        percentage: marked > 0 ? Math.round(((present + late) / marked) * 100) : 0,
        markedByName: att?.markedById ? (teacherNameMap.get(String(att.markedById)) ?? null) : null,
        lastMarkedAt: att?.lastMarkedAt ?? null,
      };
    })
    .sort((a, b) => a.classOrder - b.classOrder || a.sectionName.localeCompare(b.sectionName));

  res.json({
    success: true,
    data: {
      date: dateParam,
      sections: rows,
      summary: { totalSections: rows.length, markedSections: rows.filter((r) => r.isMarked).length },
    },
  });
}

type ProgressGroupBy = 'teacher' | 'class' | 'subject';

interface ProgressAggRow {
  _id: Types.ObjectId | { classId: Types.ObjectId; sectionId: Types.ObjectId } | null;
  present: number; absent: number; late: number; excused: number;
  sessions: Types.ObjectId[];
}

function buildProgressRow(key: string, label: string, sublabel: string | undefined, a: ProgressAggRow, threshold: number) {
  const total = a.present + a.absent + a.late + a.excused;
  const percentage = total > 0 ? Math.round(((a.present + a.late) / total) * 100) : 0;
  return {
    key, label, sublabel,
    present: a.present, absent: a.absent, late: a.late, excused: a.excused,
    total, sessionsMarked: a.sessions.length,
    percentage, isShortage: total > 0 && percentage < threshold,
  };
}

/** Teacher-wise / class-wise / subject-wise attendance progress report. */
export async function getAttendanceProgressReport(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const { groupBy = 'class', month, year, classId, sectionId, subjectId, teacherId } = req.query;

  if (!month || !year) {
    res.status(400).json({ success: false, message: 'month and year are required' });
    return;
  }
  if (!['teacher', 'class', 'subject'].includes(groupBy as string)) {
    res.status(400).json({ success: false, message: 'groupBy must be teacher, class, or subject' });
    return;
  }
  const groupByVal = groupBy as ProgressGroupBy;

  const monthStart = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
  const monthEnd = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59);

  const match: Record<string, unknown> = {
    orgId: new Types.ObjectId(orgId!),
    branchId: new Types.ObjectId(branchId!),
    date: { $gte: monthStart, $lte: monthEnd },
  };
  if (classId) match.classId = new Types.ObjectId(classId as string);
  if (sectionId) match.sectionId = new Types.ObjectId(sectionId as string);
  if (subjectId) match.subjectId = new Types.ObjectId(subjectId as string);
  if (teacherId) match.markedById = new Types.ObjectId(teacherId as string);

  const groupId =
    groupByVal === 'teacher' ? '$markedById' :
    groupByVal === 'subject' ? '$subjectId' :
    { classId: '$classId', sectionId: '$sectionId' };

  const [agg, branch] = await Promise.all([
    Attendance.aggregate<ProgressAggRow>([
      { $match: match },
      { $unwind: '$records' },
      {
        $group: {
          _id: groupId,
          present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$records.status', 'absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$records.status', 'late'] }, 1, 0] } },
          excused: { $sum: { $cond: [{ $eq: ['$records.status', 'excused'] }, 1, 0] } },
          sessions: { $addToSet: '$_id' },
        },
      },
    ]),
    Branch.findOne({ orgId, _id: branchId }).lean(),
  ]);

  const threshold = branch?.settings?.attendanceThreshold ?? 75;
  let rows: ReturnType<typeof buildProgressRow>[];

  if (groupByVal === 'teacher') {
    const teacherIds = agg.map((a) => a._id).filter(Boolean) as Types.ObjectId[];
    const teachers = await User.find({ _id: { $in: teacherIds } }).select('name').lean();
    const nameMap = new Map(teachers.map((t) => [String(t._id), t.name]));
    rows = agg
      .filter((a) => a._id)
      .map((a) => buildProgressRow(String(a._id), nameMap.get(String(a._id)) ?? 'Unknown', undefined, a, threshold));
  } else if (groupByVal === 'subject') {
    const subjectIds = agg.map((a) => a._id).filter(Boolean) as Types.ObjectId[];
    const subjects = await Subject.find({ _id: { $in: subjectIds } }).select('name').lean();
    const nameMap = new Map(subjects.map((s) => [String(s._id), s.name]));
    rows = agg.map((a) =>
      buildProgressRow(
        a._id ? String(a._id) : 'none',
        a._id ? (nameMap.get(String(a._id)) ?? 'Unknown') : 'No Subject',
        undefined, a, threshold
      )
    );
  } else {
    const composite = agg as unknown as { _id: { classId: Types.ObjectId; sectionId: Types.ObjectId }; present: number; absent: number; late: number; excused: number; sessions: Types.ObjectId[] }[];
    const classIds = composite.map((a) => a._id.classId).filter(Boolean);
    const sectionIds = composite.map((a) => a._id.sectionId).filter(Boolean);
    const [classDocs, sectionDocs] = await Promise.all([
      Class.find({ _id: { $in: classIds } }).select('name').lean(),
      Section.find({ _id: { $in: sectionIds } }).select('name').lean(),
    ]);
    const classNameMap = new Map(classDocs.map((c) => [String(c._id), c.name]));
    const sectionNameMap = new Map(sectionDocs.map((s) => [String(s._id), s.name]));
    rows = composite.map((a) =>
      buildProgressRow(
        `${a._id.classId}:${a._id.sectionId}`,
        classNameMap.get(String(a._id.classId)) ?? 'Unknown',
        sectionNameMap.get(String(a._id.sectionId)) ? `Section ${sectionNameMap.get(String(a._id.sectionId))}` : undefined,
        a, threshold
      )
    );
  }

  rows.sort((x, y) => x.percentage - y.percentage);
  res.json({ success: true, data: rows });
}

// ─── Staff Attendance ─────────────────────────────────────────────────────────

export const markStaffAttendanceValidators = [
  body('date').isISO8601(),
  body('records').isArray({ min: 1 }),
  body('records.*.staffId').isMongoId(),
  body('records.*.status').isIn(['present', 'absent', 'late', 'on_leave']),
  body('records.*.checkInTime').optional().isString(),
  body('records.*.checkOutTime').optional().isString(),
  body('records.*.note').optional().isString(),
];

export async function markStaffAttendance(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId, id: markedById } = req.user!;
  const { date, records } = req.body;

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const ops = (records as { staffId: string; status: string; checkInTime?: string; checkOutTime?: string; note?: string }[]).map(r => ({
    updateOne: {
      filter: {
        orgId: new Types.ObjectId(orgId!),
        branchId: new Types.ObjectId(branchId!),
        staffId: new Types.ObjectId(r.staffId),
        date: dayStart,
      },
      update: {
        $set: {
          orgId: new Types.ObjectId(orgId!),
          branchId: new Types.ObjectId(branchId!),
          staffId: new Types.ObjectId(r.staffId),
          date: dayStart,
          status: r.status as 'present' | 'absent' | 'late' | 'on_leave',
          checkInTime: r.checkInTime,
          checkOutTime: r.checkOutTime,
          note: r.note,
          markedById: new Types.ObjectId(markedById),
        },
      },
      upsert: true,
    },
  }));

  await StaffAttendance.bulkWrite(ops);
  res.json({ success: true, message: `Saved ${records.length} staff attendance records for ${date}` });
}

export async function getStaffAttendance(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const { date, month, year } = req.query;

  const filter: Record<string, unknown> = orgBranchScope({ orgId, branchId });

  if (date) {
    const d = new Date(date as string);
    d.setHours(0, 0, 0, 0);
    const e = new Date(date as string);
    e.setHours(23, 59, 59, 999);
    filter.date = { $gte: d, $lte: e };
  } else if (month && year) {
    const monthStart = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
    const monthEnd = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59);
    filter.date = { $gte: monthStart, $lte: monthEnd };
  }

  const records = await StaffAttendance.find(filter)
    .populate('staffId', 'name role')
    .sort({ date: -1 })
    .lean();

  res.json({ success: true, data: records });
}

export async function getStaffMonthlySummary(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const { month, year } = req.query;

  if (!month || !year) {
    res.status(400).json({ success: false, message: 'month and year required' });
    return;
  }

  const monthStart = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
  const monthEnd = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59);

  const [staff, agg] = await Promise.all([
    User.find({ ...orgBranchScope({ orgId, branchId }), role: { $nin: ['student', 'super_admin', 'group_admin'] }, active: true })
      .select('name role').lean(),
    StaffAttendance.aggregate([
      { $match: {
          orgId: new Types.ObjectId(orgId!),
          ...(branchId ? { branchId: new Types.ObjectId(branchId) } : {}),
          date: { $gte: monthStart, $lte: monthEnd },
        } },
      { $group: {
        _id: '$staffId',
        present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        absent:  { $sum: { $cond: [{ $eq: ['$status', 'absent'] },  1, 0] } },
        late:    { $sum: { $cond: [{ $eq: ['$status', 'late'] },    1, 0] } },
        on_leave:{ $sum: { $cond: [{ $eq: ['$status', 'on_leave'] },1, 0] } },
      }},
    ]),
  ]);

  const statsMap = new Map(agg.map(r => [r._id.toString(), r]));

  const summary = staff.map(s => {
    const st = statsMap.get(s._id.toString()) ?? { present: 0, absent: 0, late: 0, on_leave: 0 };
    const total = st.present + st.absent + st.late + st.on_leave;
    return {
      staffId: s._id,
      name: s.name,
      role: s.role,
      present: st.present, absent: st.absent, late: st.late, on_leave: st.on_leave, total,
    };
  });

  res.json({ success: true, data: summary });
}
