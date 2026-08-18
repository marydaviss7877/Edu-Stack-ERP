import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { randomBytes } from 'crypto';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { Sequence } from '../models/Sequence';
import { Challan } from '../models/Challan';
import { hashPassword } from '../services/authService';
import { getUploadUrl, getPublicUrl } from '../services/s3Service';
import { orgBranchScope } from '../utils/orgBranchScope';

async function generateRollNumber(orgId: string, classId: string, sectionId: string, academicYearId: string): Promise<string> {
  const key = `roll:${classId}:${sectionId}:${academicYearId}`;
  const seq = await Sequence.findOneAndUpdate(
    { orgId, key },
    { $inc: { value: 1 } },
    { upsert: true, new: true }
  );
  return String(seq!.value).padStart(3, '0');
}

async function generateAdmissionNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await Sequence.findOneAndUpdate(
    { orgId, key: `admission:${year}` },
    { $inc: { value: 1 } },
    { upsert: true, new: true }
  );
  return `${year}-${String(seq!.value).padStart(4, '0')}`;
}

export const createStudentValidators = [
  body('profile.name').trim().notEmpty(),
  body('profile.dateOfBirth').isISO8601(),
  body('profile.gender').isIn(['male', 'female', 'other']),
  body('profile.cnicOrBForm').trim().notEmpty(),
  body('guardianInfo.fatherName').trim().notEmpty(),
  body('guardianInfo.fatherPhone').trim().notEmpty(),
  body('classId').isMongoId(),
  body('sectionId').isMongoId(),
  body('academicYearId').isMongoId(),
  body('email').isEmail().normalizeEmail(),
];

export async function createStudent(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId } = req.user!;
  const { profile, guardianInfo, classId, sectionId, academicYearId, email, previousSchool, monthlyFee, admissionDate } = req.body;

  const existing = await User.findOne({ email, orgId });
  if (existing) { res.status(409).json({ success: false, message: 'Email already in use' }); return; }

  const rollNo = await generateRollNumber(orgId!, classId, sectionId, academicYearId);
  const admissionNo = await generateAdmissionNumber(orgId!);
  const tempPassword = randomBytes(6).toString('base64url');
  const passwordHash = await hashPassword(tempPassword);

  const session = await mongoose.startSession();
  try {
    const created = await session.withTransaction(async () => {
      const [newUser] = await User.create([{
        orgId,
        branchId,
        role: 'student',
        name: profile.name,
        email,
        passwordHash,
        mustChangePassword: true,
        active: true,
      }], { session });

      const [newStudent] = await Student.create([{
        orgId,
        branchId,
        userId: newUser._id,
        classId,
        sectionId,
        academicYearId,
        rollNo,
        admissionNo,
        profile,
        guardianInfo,
        status: 'enrolled',
        previousSchool,
        ...(monthlyFee != null && monthlyFee > 0 ? { monthlyFee: Number(monthlyFee) } : {}),
        admissionDate: admissionDate ?? new Date(),
      }], { session });

      return { userId: newUser.id, student: newStudent };
    });

    res.status(201).json({
      success: true,
      // tempPassword returned once — never stored in plain text again
      data: { student: created?.student, tempPassword, userId: created?.userId },
    });
  } finally {
    await session.endSession();
  }
}

export async function listStudents(req: Request, res: Response): Promise<void> {
  const { orgId, branchId, role } = req.user!;
  const { classId, sectionId, academicYearId, status, page = '1', limit = '30' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const filter: Record<string, unknown> = orgBranchScope({ orgId: orgId!, branchId });
  if (classId) filter.classId = classId;
  if (sectionId) filter.sectionId = sectionId;
  if (academicYearId) filter.academicYearId = academicYearId;
  if (status) filter.status = status;

  // Students can only see their own record
  if (role === 'student') filter.userId = req.user!.id;

  const [students, total] = await Promise.all([
    Student.find(filter)
      .populate('classId', 'name level')
      .populate('sectionId', 'name')
      .sort({ rollNo: 1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .lean(),
    Student.countDocuments(filter),
  ]);

  res.json({ success: true, data: students, meta: { total, page: parseInt(page as string) } });
}

export async function getStudent(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const student = await Student.findOne({ _id: req.params.id, orgId })
    .populate('classId', 'name level')
    .populate('sectionId', 'name')
    .populate('userId', 'email active lastLoginAt');

  if (!student) { res.status(404).json({ success: false, message: 'Student not found' }); return; }
  res.json({ success: true, data: student });
}

export async function updateStudent(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const allowed = ['profile', 'guardianInfo', 'classId', 'sectionId', 'status', 'previousSchool', 'monthlyFee', 'houseId', 'labelIds', 'transport'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

  const student = await Student.findOneAndUpdate({ _id: req.params.id, orgId }, update, { new: true, runValidators: true });
  if (!student) { res.status(404).json({ success: false, message: 'Student not found' }); return; }
  res.json({ success: true, data: student });
}

export async function getDocumentUploadUrl(req: Request, res: Response): Promise<void> {
  const { filename, contentType } = req.body;
  if (!filename || !contentType) {
    res.status(400).json({ success: false, message: 'filename and contentType required' });
    return;
  }

  const owned = await Student.findOne({ _id: req.params.id, orgId: req.orgId }).lean();
  if (!owned) { res.status(404).json({ success: false, message: 'Student not found' }); return; }

  const result = await getUploadUrl(`students/${req.params.id}/documents`, filename, contentType);

  if (!result) {
    res.status(503).json({ success: false, message: 'File storage not configured' });
    return;
  }

  res.json({ success: true, data: result });
}

export async function addDocument(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const { type, key } = req.body;

  const student = await Student.findOneAndUpdate(
    { _id: req.params.id, orgId },
    { $push: { documents: { type, url: getPublicUrl(key), uploadedAt: new Date() } } },
    { new: true }
  );

  if (!student) { res.status(404).json({ success: false, message: 'Student not found' }); return; }
  res.json({ success: true, data: student.documents });
}

export async function getMyProfile(req: Request, res: Response): Promise<void> {
  const student = await Student.findOne({ userId: req.user!.id, orgId: req.orgId })
    .populate('classId', 'name level')
    .populate('sectionId', 'name');

  if (!student) { res.status(404).json({ success: false, message: 'Student profile not found' }); return; }
  res.json({ success: true, data: student });
}

// ─── Student Leaving Flow ─────────────────────────────────────────────────────

export async function initiateLeavingProcess(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const name = req.user!.doc?.name ?? 'Admin';
  const { reason } = req.body;
  if (!reason?.trim()) { res.status(400).json({ success: false, message: 'Leaving reason required' }); return; }

  const student = await Student.findOne({ _id: req.params.id, orgId });
  if (!student) { res.status(404).json({ success: false, message: 'Student not found' }); return; }
  if (['transferred', 'withdrawn', 'graduated'].includes(student.status)) {
    res.status(400).json({ success: false, message: 'Student has already left' });
    return;
  }

  student.status = 'leaving';
  student.leavingInfo = {
    initiatedAt: new Date(),
    initiatedByName: name ?? 'Admin',
    reason: reason.trim(),
    financeCleared: false,
  };
  await student.save();
  res.json({ success: true, data: student });
}

export async function checkAndClearFinanceDues(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;

  const student = await Student.findOne({ _id: req.params.id, orgId });
  if (!student) { res.status(404).json({ success: false, message: 'Student not found' }); return; }
  if (student.status !== 'leaving') {
    res.status(400).json({ success: false, message: 'Leaving process not initiated' });
    return;
  }

  // Check for outstanding fee dues
  const outstanding = await Challan.countDocuments({
    orgId,
    studentId: student._id,
    status: { $in: ['unpaid', 'partial', 'overdue'] },
  });

  if (outstanding > 0 && !req.body.override) {
    res.json({
      success: true,
      data: { financeCleared: false, outstandingChallans: outstanding },
    });
    return;
  }

  if (!student.leavingInfo) {
    res.status(400).json({ success: false, message: 'Leaving process not initiated' });
    return;
  }
  student.leavingInfo.financeCleared = true;
  student.leavingInfo.financeClearedAt = new Date();
  await student.save();

  res.json({ success: true, data: { financeCleared: true, outstandingChallans: 0 } });
}

export async function issueTc(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;

  const student = await Student.findOne({ _id: req.params.id, orgId });
  if (!student) { res.status(404).json({ success: false, message: 'Student not found' }); return; }
  if (student.status !== 'leaving') {
    res.status(400).json({ success: false, message: 'Leaving process not initiated' });
    return;
  }
  if (!student.leavingInfo?.financeCleared) {
    res.status(400).json({ success: false, message: 'Finance dues not cleared. Cannot issue TC.' });
    return;
  }

  const reason = student.leavingInfo.reason ?? 'withdrawal';
  const statusMap: Record<string, 'transferred' | 'withdrawn' | 'graduated'> = {
    migration: 'transferred',
    transfer: 'transferred',
    'completed course': 'graduated',
  };
  const finalStatus = statusMap[reason.toLowerCase()] ?? 'withdrawn';

  student.status = finalStatus;
  student.leavingInfo!.tcIssuedAt = new Date();
  student.leavingInfo!.leftAt = new Date();
  await student.save();

  res.json({ success: true, data: student });
}

export async function issueCharacterCert(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;

  const student = await Student.findOne({ _id: req.params.id, orgId });
  if (!student) { res.status(404).json({ success: false, message: 'Student not found' }); return; }
  if (!student.leavingInfo) {
    res.status(400).json({ success: false, message: 'Leaving process not initiated' });
    return;
  }

  student.leavingInfo!.charCertIssuedAt = new Date();
  await student.save();
  res.json({ success: true, data: { charCertIssuedAt: student.leavingInfo!.charCertIssuedAt } });
}

export async function getLeavingStatus(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;

  const student = await Student.findOne({ _id: req.params.id, orgId })
    .populate('classId', 'name level')
    .populate('sectionId', 'name');
  if (!student) { res.status(404).json({ success: false, message: 'Student not found' }); return; }

  const outstanding = student.status === 'leaving'
    ? await Challan.countDocuments({ orgId, studentId: student._id, status: { $in: ['unpaid', 'partial', 'overdue'] } })
    : 0;

  res.json({ success: true, data: { student, outstandingChallans: outstanding } });
}
