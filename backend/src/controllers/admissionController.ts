import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { randomBytes } from 'crypto';
import { Organization } from '../models/Organization';
import { AdmissionProgram } from '../models/AdmissionProgram';
import { Application, ApplicationStatus } from '../models/Application';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { Sequence } from '../models/Sequence';
import { hashPassword } from '../services/authService';
import { getUploadUrl, getPublicUrl } from '../services/s3Service';
import { orgBranchScope } from '../utils/orgBranchScope';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function generateRefNo(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await Sequence.findOneAndUpdate(
    { orgId, key: `admission-app:${year}` },
    { $inc: { value: 1 } },
    { upsert: true, new: true }
  );
  return `APP-${year}-${String(seq!.value).padStart(5, '0')}`;
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

async function generateRollNumber(orgId: string, classId: string, sectionId: string, academicYearId: string): Promise<string> {
  const key = `roll:${classId}:${sectionId}:${academicYearId}`;
  const seq = await Sequence.findOneAndUpdate(
    { orgId, key },
    { $inc: { value: 1 } },
    { upsert: true, new: true }
  );
  return String(seq!.value).padStart(3, '0');
}

function computeMeritScore(app: { academic: { percentage: number }; sibling: { has: boolean; verified: boolean } }): number {
  let score = app.academic.percentage * 0.9;
  if (app.sibling.has && app.sibling.verified) score += 3;
  return Math.round(score * 100) / 100;
}

// ─── Public: Admission Config ────────────────────────────────────────────────

export async function getAdmissionConfig(req: Request, res: Response): Promise<void> {
  const slug = String(req.params.slug).toLowerCase();
  const org = await Organization.findOne({ slug, status: { $in: ['active', 'trial'] } })
    .select('name slug logoUrl primaryColor tagline _id')
    .lean();

  if (!org) {
    res.status(404).json({ success: false, message: 'Institution not found' });
    return;
  }

  const programs = await AdmissionProgram.find({ orgId: org._id, isOpen: true })
    .select('name code description totalSeats quotaSeats branchId sortOrder')
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  const totalOpen = programs.reduce((sum, p) => sum + p.totalSeats, 0);

  res.json({
    success: true,
    data: {
      org: {
        name: org.name,
        slug: org.slug,
        logoUrl: org.logoUrl ?? null,
        primaryColor: org.primaryColor ?? null,
        tagline: org.tagline ?? null,
      },
      programs: programs.map((p) => ({
        _id: p._id,
        name: p.name,
        code: p.code,
        description: p.description ?? null,
        totalSeats: p.totalSeats,
        quotaSeats: p.quotaSeats,
      })),
      totalOpenSeats: totalOpen,
      isOpen: programs.length > 0,
    },
  });
}

// ─── Public: S3 Upload URL ───────────────────────────────────────────────────

export async function getPublicUploadUrl(req: Request, res: Response): Promise<void> {
  const slug = String(req.params.slug).toLowerCase();
  const org = await Organization.findOne({ slug, status: { $in: ['active', 'trial'] } }).select('_id').lean();
  if (!org) { res.status(404).json({ success: false, message: 'Institution not found' }); return; }

  const { filename, contentType } = req.body;
  if (!filename || !contentType) {
    res.status(400).json({ success: false, message: 'filename and contentType required' });
    return;
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowed.includes(contentType)) {
    res.status(400).json({ success: false, message: 'Unsupported file type' });
    return;
  }

  const result = await getUploadUrl(`admissions/${String(org._id)}/docs`, filename, contentType);
  if (!result) {
    res.status(503).json({ success: false, message: 'File storage not configured' });
    return;
  }

  res.json({ success: true, data: result });
}

// ─── Public: Submit Application ──────────────────────────────────────────────

export const submitApplicationValidators = [
  body('preferences').isArray({ min: 1, max: 3 }),
  body('personal.name').trim().notEmpty(),
  body('personal.fatherName').trim().notEmpty(),
  body('personal.dob').isISO8601(),
  body('personal.gender').isIn(['male', 'female']),
  body('personal.address').trim().notEmpty(),
  body('personal.parentPhone').trim().notEmpty(),
  body('academic.previousSchool').trim().notEmpty(),
  body('academic.marksObtained').isFloat({ min: 0 }),
  body('academic.totalMarks').isFloat({ min: 1 }),
];

export async function submitApplication(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const slug = String(req.params.slug).toLowerCase();
  const org = await Organization.findOne({ slug, status: { $in: ['active', 'trial'] } }).select('_id').lean();
  if (!org) { res.status(404).json({ success: false, message: 'Institution not found' }); return; }

  const orgId = String(org._id);
  const { preferences, personal, academic, sibling, quota, documents } = req.body;

  // Validate programs exist and are open
  const programIds = preferences.map((p: { programId: string }) => p.programId);
  const validPrograms = await AdmissionProgram.find({ _id: { $in: programIds }, orgId, isOpen: true }).lean();
  if (validPrograms.length === 0) {
    res.status(400).json({ success: false, message: 'No open programs found for selection' });
    return;
  }

  const programMap = new Map(validPrograms.map((p) => [String(p._id), p.name]));
  const pref = preferences
    .filter((p: { programId: string; rank: number }) => programMap.has(p.programId))
    .map((p: { programId: string; rank: number }) => ({
      programId: p.programId,
      programName: programMap.get(p.programId)!,
      rank: p.rank,
    }));

  const marksObtained = Number(academic.marksObtained);
  const totalMarks = Number(academic.totalMarks);
  const percentage = Math.min(100, Math.round((marksObtained / totalMarks) * 10000) / 100);

  // Resolve S3 public URLs
  const resolveDoc = (doc?: { key?: string }) =>
    doc?.key ? { key: doc.key, url: getPublicUrl(doc.key), verified: false } : { verified: false };

  const refNo = await generateRefNo(orgId);

  const app = await Application.create({
    orgId,
    refNo,
    preferences: pref,
    personal: { ...personal, dob: new Date(personal.dob) },
    academic: { ...academic, marksObtained, totalMarks, percentage },
    sibling: {
      has: !!sibling?.has,
      siblingName: sibling?.siblingName ?? undefined,
      siblingGrNo: sibling?.siblingGrNo ?? undefined,
      verified: false,
    },
    quota: {
      type: quota?.type ?? 'none',
      verified: false,
    },
    documents: {
      photo:      resolveDoc(documents?.photo),
      bForm:      resolveDoc(documents?.bForm),
      resultCard: resolveDoc(documents?.resultCard),
      quotaProof: resolveDoc(documents?.quotaProof),
    },
    status: 'submitted',
    statusHistory: [{ status: 'submitted', changedAt: new Date() }],
    submittedAt: new Date(),
  });

  res.status(201).json({
    success: true,
    data: { refNo: app.refNo, message: 'Application submitted successfully' },
  });
}

// ─── Admin: Programs ─────────────────────────────────────────────────────────

export async function listPrograms(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const programs = await AdmissionProgram.find(orgBranchScope({ orgId, branchId }))
    .sort({ sortOrder: 1, name: 1 })
    .lean();
  res.json({ success: true, data: programs });
}

export const createProgramValidators = [
  body('name').trim().notEmpty(),
  body('code').trim().notEmpty(),
  body('totalSeats').isInt({ min: 1 }),
];

export async function createProgram(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId } = req.user!;
  const resolvedBranchId = req.user!.branchId ?? req.body.branchId;
  if (!resolvedBranchId) {
    res.status(422).json({ success: false, message: 'branchId is required' });
    return;
  }
  const { name, code, description, totalSeats, quotaSeats, isOpen, sortOrder } = req.body;

  const existing = await AdmissionProgram.findOne({ orgId, code: code.toUpperCase() }).lean();
  if (existing) {
    res.status(409).json({ success: false, message: `Program code "${code}" already exists` });
    return;
  }

  const program = await AdmissionProgram.create({
    orgId, branchId: resolvedBranchId, name, code, description,
    totalSeats: Number(totalSeats),
    quotaSeats: {
      sports: Number(quotaSeats?.sports ?? 0),
      staff: Number(quotaSeats?.staff ?? 0),
      army: Number(quotaSeats?.army ?? 0),
    },
    isOpen: isOpen !== false,
    sortOrder: Number(sortOrder ?? 0),
  });

  res.status(201).json({ success: true, data: program });
}

export async function updateProgram(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const allowed = ['name', 'description', 'totalSeats', 'quotaSeats', 'isOpen', 'sortOrder'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

  const program = await AdmissionProgram.findOneAndUpdate(
    { _id: req.params.id, orgId },
    update,
    { new: true, runValidators: true }
  );
  if (!program) { res.status(404).json({ success: false, message: 'Program not found' }); return; }
  res.json({ success: true, data: program });
}

export async function deleteProgram(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const hasApps = await Application.countDocuments({ orgId, 'preferences.programId': req.params.id });
  if (hasApps > 0) {
    res.status(409).json({ success: false, message: 'Cannot delete — applications exist for this program' });
    return;
  }
  await AdmissionProgram.findOneAndDelete({ _id: req.params.id, orgId });
  res.json({ success: true });
}

// ─── Admin: Applications ─────────────────────────────────────────────────────

export async function listApplications(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const { status, programId, quota, search, page = '1', limit = '30' } = req.query;

  const filter: Record<string, unknown> = { orgId };
  if (status) filter.status = status;
  if (quota) filter['quota.type'] = quota;
  if (programId) filter['preferences.programId'] = programId;
  if (search) {
    const re = new RegExp(String(search), 'i');
    filter.$or = [{ 'personal.name': re }, { 'personal.fatherName': re }, { refNo: re }];
  }

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const [applications, total] = await Promise.all([
    Application.find(filter)
      .select('refNo status personal.name personal.fatherName academic.percentage quota sibling preferences allocatedProgramName meritScore submittedAt')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .lean(),
    Application.countDocuments(filter),
  ]);

  res.json({ success: true, data: applications, meta: { total, page: parseInt(page as string) } });
}

export async function getApplication(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const app = await Application.findOne({ _id: req.params.id, orgId })
    .populate('preferences.programId', 'name code totalSeats')
    .lean();
  if (!app) { res.status(404).json({ success: false, message: 'Application not found' }); return; }
  res.json({ success: true, data: app });
}

export async function updateApplicationStatus(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const name = req.user!.doc?.name ?? 'Admin';
  const { status, note } = req.body;
  const validStatuses: ApplicationStatus[] = ['submitted','under_review','docs_verified','shortlisted','offered','accepted','rejected','waitlisted','declined'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ success: false, message: 'Invalid status' });
    return;
  }

  const app = await Application.findOneAndUpdate(
    { _id: req.params.id, orgId },
    {
      status,
      ...(status === 'offered' ? { offerSentAt: new Date() } : {}),
      $push: { statusHistory: { status, changedAt: new Date(), changedByName: name, note } },
    },
    { new: true }
  );
  if (!app) { res.status(404).json({ success: false, message: 'Application not found' }); return; }
  res.json({ success: true, data: app });
}

export async function verifyDocument(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const docType = String(req.params.docType);
  const { verified } = req.body;

  const allowedDocs = ['photo', 'bForm', 'resultCard', 'quotaProof'];
  if (!allowedDocs.includes(docType)) {
    res.status(400).json({ success: false, message: 'Invalid document type' });
    return;
  }

  const update: Record<string, unknown> = { [`documents.${docType}.verified`]: !!verified };
  const app = await Application.findOneAndUpdate({ _id: req.params.id, orgId }, update, { new: true });
  if (!app) { res.status(404).json({ success: false, message: 'Application not found' }); return; }
  res.json({ success: true, data: app.documents });
}

export async function verifySpecialField(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const field = String(req.params.field);
  const { verified } = req.body;

  const allowedFields = ['sibling.verified', 'quota.verified'];
  if (!allowedFields.includes(field)) {
    res.status(400).json({ success: false, message: 'Invalid field' });
    return;
  }

  const app = await Application.findOneAndUpdate(
    { _id: req.params.id, orgId },
    { [field]: !!verified },
    { new: true }
  );
  if (!app) { res.status(404).json({ success: false, message: 'Application not found' }); return; }
  res.json({ success: true });
}

export async function addNote(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const name = req.user!.doc?.name ?? 'Admin';
  const { text } = req.body;
  if (!text?.trim()) { res.status(400).json({ success: false, message: 'Note text required' }); return; }

  const app = await Application.findOneAndUpdate(
    { _id: req.params.id, orgId },
    { $push: { adminNotes: { text: text.trim(), addedByName: name, addedAt: new Date() } } },
    { new: true }
  );
  if (!app) { res.status(404).json({ success: false, message: 'Application not found' }); return; }
  res.json({ success: true, data: app.adminNotes });
}

// ─── Admin: Merit List Engine ─────────────────────────────────────────────────

export async function generateMeritList(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const { programIds, round = 1 } = req.body;

  const programs = await AdmissionProgram.find({ orgId, _id: { $in: programIds } }).lean();
  if (!programs.length) {
    res.status(400).json({ success: false, message: 'No matching programs found' });
    return;
  }

  // Reset allocations from previous run for these programs
  await Application.updateMany(
    { orgId, allocatedProgramId: { $in: programs.map((p) => p._id) } },
    { $unset: { allocatedProgramId: '', allocatedProgramName: '', meritScore: '', meritRound: '' } }
  );

  // Load all shortlisted/docs_verified/submitted applications for these programs
  const eligibleStatuses: ApplicationStatus[] = ['submitted', 'docs_verified', 'shortlisted', 'waitlisted'];
  const applications = await Application.find({
    orgId,
    status: { $in: eligibleStatuses },
    'preferences.programId': { $in: programs.map((p) => p._id) },
  }).lean();

  // Compute merit scores
  const scored = applications.map((app) => ({
    ...app,
    meritScore: computeMeritScore({ academic: app.academic, sibling: app.sibling }),
  }));

  // Track seat occupancy per program per quota pool
  type Pool = { sports: number; staff: number; army: number; general: number };
  const occupancy = new Map<string, Pool>();
  for (const p of programs) {
    occupancy.set(String(p._id), {
      sports: 0,
      staff: 0,
      army: 0,
      general: 0,
    });
  }

  const allocations: { appId: string; programId: string; programName: string; meritScore: number; round: number }[] = [];
  const allocated = new Set<string>();

  // 3 rounds: preference 1 → 2 → 3
  for (let prefRank = 1; prefRank <= 3; prefRank++) {
    for (const program of programs) {
      const pid = String(program._id);
      const pool = occupancy.get(pid)!;
      const generalSeats = program.totalSeats - program.quotaSeats.sports - program.quotaSeats.staff - program.quotaSeats.army;

      // Apps with this preference for this program, not yet allocated, sorted by merit desc
      const candidates = scored
        .filter((app) => !allocated.has(String(app._id)) &&
          app.preferences.some((p) => String(p.programId) === pid && p.rank === prefRank))
        .sort((a, b) => b.meritScore - a.meritScore);

      for (const app of candidates) {
        const qt = app.quota.type;
        let placed = false;

        if (qt === 'sports' && pool.sports < program.quotaSeats.sports) {
          pool.sports++;
          placed = true;
        } else if (qt === 'staff' && pool.staff < program.quotaSeats.staff) {
          pool.staff++;
          placed = true;
        } else if (qt === 'army' && pool.army < program.quotaSeats.army) {
          pool.army++;
          placed = true;
        } else if (pool.general < generalSeats) {
          pool.general++;
          placed = true;
        }

        if (placed) {
          allocated.add(String(app._id));
          allocations.push({ appId: String(app._id), programId: pid, programName: program.name, meritScore: app.meritScore, round: prefRank });
        }
      }
    }
  }

  // Apply allocations in bulk
  if (allocations.length > 0) {
    const ops = allocations.map((a) => ({
      updateOne: {
        filter: { _id: a.appId, orgId },
        update: {
          status: 'shortlisted',
          allocatedProgramId: a.programId,
          allocatedProgramName: a.programName,
          meritScore: a.meritScore,
          meritRound: a.round,
        },
      },
    }));
    await Application.bulkWrite(ops);
  }

  // Mark unallocated as waitlisted
  const unallocatedIds = scored
    .filter((app) => !allocated.has(String(app._id)))
    .map((app) => app._id);

  if (unallocatedIds.length > 0) {
    await Application.updateMany(
      { _id: { $in: unallocatedIds }, orgId },
      { status: 'waitlisted', $unset: { allocatedProgramId: '', allocatedProgramName: '' } }
    );
  }

  res.json({
    success: true,
    data: {
      allocated: allocations.length,
      waitlisted: unallocatedIds.length,
      totalProcessed: scored.length,
    },
  });
}

export async function getMeritList(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const { programId } = req.query;

  const filter: Record<string, unknown> = {
    orgId,
    status: { $in: ['shortlisted', 'offered', 'accepted', 'enrolled', 'waitlisted'] },
  };
  if (programId) filter.allocatedProgramId = programId;

  const apps = await Application.find(filter)
    .select('refNo status personal.name personal.fatherName academic.percentage quota.type sibling.has meritScore allocatedProgramName meritRound')
    .sort({ allocatedProgramId: 1, status: 1, meritScore: -1 })
    .lean();

  res.json({ success: true, data: apps });
}

export async function getSeatOccupancy(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const programs = await AdmissionProgram.find({ orgId }).lean();

  const result = await Promise.all(
    programs.map(async (prog) => {
      const filled = await Application.countDocuments({
        orgId,
        allocatedProgramId: prog._id,
        status: { $in: ['shortlisted', 'offered', 'accepted', 'enrolled'] },
      });
      return {
        ...prog,
        filledSeats: filled,
        availableSeats: Math.max(0, prog.totalSeats - filled),
      };
    })
  );

  res.json({ success: true, data: result });
}

// ─── Admin: Enroll (Application → Student) ───────────────────────────────────

export const enrollValidators = [
  body('classId').isMongoId(),
  body('sectionId').isMongoId(),
  body('academicYearId').isMongoId(),
  body('email').isEmail().normalizeEmail(),
];

export async function enrollApplication(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId } = req.user!;
  const { classId, sectionId, academicYearId, email } = req.body;

  const app = await Application.findOne({ _id: req.params.id, orgId }).lean();
  if (!app) { res.status(404).json({ success: false, message: 'Application not found' }); return; }
  if (app.status !== 'accepted') {
    res.status(400).json({ success: false, message: 'Application must be in accepted status to enroll' });
    return;
  }
  if (app.enrolledStudentId) {
    res.status(409).json({ success: false, message: 'Already enrolled' });
    return;
  }

  const existingUser = await User.findOne({ email, orgId });
  if (existingUser) {
    res.status(409).json({ success: false, message: 'Email already in use' });
    return;
  }

  const rollNo = await generateRollNumber(orgId!, classId, sectionId, academicYearId);
  const admissionNo = await generateAdmissionNumber(orgId!);
  const tempPassword = randomBytes(6).toString('base64url');
  const passwordHash = await hashPassword(tempPassword);

  const session = await mongoose.startSession();
  try {
    const result = await session.withTransaction(async () => {
      const [newUser] = await User.create([{
        orgId, branchId,
        role: 'student',
        name: app.personal.name,
        email,
        passwordHash,
        mustChangePassword: true,
        active: true,
      }], { session });

      const [newStudent] = await Student.create([{
        orgId, branchId,
        userId: newUser._id,
        classId, sectionId, academicYearId,
        rollNo, admissionNo,
        profile: {
          name: app.personal.name,
          dateOfBirth: app.personal.dob,
          gender: app.personal.gender,
          cnicOrBForm: app.documents.bForm?.key ? app.personal.fatherName : '',
          bloodGroup: app.personal.bloodGroup,
          nationality: app.personal.nationality ?? 'Pakistani',
          address: app.personal.address,
          photoUrl: app.documents.photo?.url,
        },
        guardianInfo: {
          fatherName: app.personal.fatherName,
          fatherPhone: app.personal.parentPhone,
          emergencyContact: app.personal.emergencyContact,
          motherName: app.personal.motherName,
        },
        documents: [
          ...(app.documents.photo?.url  ? [{ type: 'photo', url: app.documents.photo.url, uploadedAt: new Date() }] : []),
          ...(app.documents.bForm?.url  ? [{ type: 'b_form', url: app.documents.bForm.url, uploadedAt: new Date() }] : []),
          ...(app.documents.resultCard?.url ? [{ type: 'result_card', url: app.documents.resultCard.url, uploadedAt: new Date() }] : []),
        ],
        status: 'enrolled',
        previousSchool: app.academic.previousSchool,
        admissionDate: new Date(),
      }], { session });

      await Application.findOneAndUpdate(
        { _id: app._id, orgId },
        { status: 'enrolled', enrolledStudentId: newStudent._id, $push: { statusHistory: { status: 'enrolled', changedAt: new Date() } } },
        { session }
      );

      return { student: newStudent, userId: newUser._id };
    });

    res.status(201).json({
      success: true,
      data: {
        admissionNo,
        rollNo,
        studentId: result?.student._id,
        tempPassword,
      },
    });
  } finally {
    await session.endSession();
  }
}

// ─── Admin: Analytics ─────────────────────────────────────────────────────────

export async function getAdmissionStats(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;

  const [statusCounts, programCounts, quotaCounts] = await Promise.all([
    Application.aggregate([
      { $match: { orgId: new mongoose.Types.ObjectId(orgId!) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Application.aggregate([
      { $match: { orgId: new mongoose.Types.ObjectId(orgId!), allocatedProgramId: { $exists: true } } },
      { $group: { _id: '$allocatedProgramName', count: { $sum: 1 } } },
    ]),
    Application.aggregate([
      { $match: { orgId: new mongoose.Types.ObjectId(orgId!) } },
      { $group: { _id: '$quota.type', count: { $sum: 1 } } },
    ]),
  ]);

  const byStatus = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));
  const total = Object.values(byStatus).reduce((sum: number, v) => sum + (v as number), 0);

  res.json({
    success: true,
    data: {
      total,
      byStatus,
      byProgram: Object.fromEntries(programCounts.map((p) => [p._id, p.count])),
      byQuota: Object.fromEntries(quotaCounts.map((q) => [q._id ?? 'none', q.count])),
    },
  });
}
