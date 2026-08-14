import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Assignment } from '../models/Assignment';
import { Submission } from '../models/Submission';
import { getUploadUrl, getPublicUrl } from '../services/s3Service';
import { orgBranchScope } from '../utils/orgBranchScope';

export const createAssignmentValidators = [
  body('title').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('classId').isMongoId(),
  body('sectionId').isMongoId(),
  body('subjectId').isMongoId(),
  body('dueDate').isISO8601(),
];

export async function createAssignment(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId, id: createdById } = req.user!;
  const assignment = await Assignment.create({ ...req.body, orgId, branchId, createdById });
  res.status(201).json({ success: true, data: assignment });
}

export async function listAssignments(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const { classId, sectionId, subjectId } = req.query;
  const filter: Record<string, unknown> = { ...orgBranchScope({ orgId, branchId }), isActive: true };
  if (classId) filter.classId = classId;
  if (sectionId) filter.sectionId = sectionId;
  if (subjectId) filter.subjectId = subjectId;

  const assignments = await Assignment.find(filter)
    .populate('subjectId', 'name code')
    .populate('createdById', 'name')
    .sort({ dueDate: -1 })
    .lean();

  res.json({ success: true, data: assignments });
}

export async function getAssignment(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const assignment = await Assignment.findOne({ _id: req.params.id, orgId })
    .populate('subjectId', 'name code')
    .populate('classId', 'name')
    .populate('sectionId', 'name');
  if (!assignment) { res.status(404).json({ success: false, message: 'Assignment not found' }); return; }
  res.json({ success: true, data: assignment });
}

export async function updateAssignment(req: Request, res: Response): Promise<void> {
  const { orgId, id: createdById } = req.user!;
  const allowed = ['title', 'description', 'dueDate', 'totalMarks', 'isActive'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

  const assignment = await Assignment.findOneAndUpdate(
    { _id: req.params.id, orgId, createdById },
    update, { new: true }
  );
  if (!assignment) { res.status(404).json({ success: false, message: 'Assignment not found' }); return; }
  res.json({ success: true, data: assignment });
}

// ─── Submissions ─────────────────────────────────────────────────────────────

export const submitAssignmentValidators = [
  body('studentId').isMongoId(),
];

export async function submitAssignment(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId } = req.user!;
  const { assignmentId } = req.params;
  const { studentId, textResponse, fileKey, fileName } = req.body;

  const assignment = await Assignment.findOne({ _id: assignmentId, orgId });
  if (!assignment) { res.status(404).json({ success: false, message: 'Assignment not found' }); return; }

  const isLate = new Date() > assignment.dueDate;

  const submission = await Submission.findOneAndUpdate(
    { assignmentId, studentId, orgId },
    {
      orgId, branchId, assignmentId, studentId,
      textResponse, fileUrl: fileKey ? getPublicUrl(fileKey) : undefined,
      fileName, submittedAt: new Date(),
      status: isLate ? 'late' : 'submitted',
    },
    { upsert: true, new: true }
  );

  res.json({ success: true, data: submission });
}

export async function gradeSubmission(req: Request, res: Response): Promise<void> {
  const { orgId, id: gradedById } = req.user!;
  const { marksAwarded, feedback } = req.body;

  const submission = await Submission.findOneAndUpdate(
    { _id: req.params.submissionId, orgId },
    { marksAwarded, feedback, status: 'graded', gradedById, gradedAt: new Date() },
    { new: true }
  );

  if (!submission) { res.status(404).json({ success: false, message: 'Submission not found' }); return; }
  res.json({ success: true, data: submission });
}

export async function listSubmissions(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const { assignmentId } = req.params;
  const submissions = await Submission.find({ assignmentId, orgId })
    .populate('studentId', 'profile.name rollNo')
    .sort({ submittedAt: -1 })
    .lean();
  res.json({ success: true, data: submissions });
}

export async function getSubmissionUploadUrl(req: Request, res: Response): Promise<void> {
  const { filename, contentType } = req.body;
  const result = await getUploadUrl(`submissions/${req.params.assignmentId}`, filename, contentType);
  if (!result) { res.status(503).json({ success: false, message: 'File storage not configured' }); return; }
  res.json({ success: true, data: result });
}
