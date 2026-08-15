import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { Organization } from '../models/Organization';
import { Student } from '../models/Student';
import { PeerFeedbackCycle } from '../models/PeerFeedbackCycle';
import { PeerFeedbackResponse } from '../models/PeerFeedbackResponse';
import { PeerFeedbackQuestion } from '../models/PeerFeedbackQuestion';
import { generateQuestions } from '../services/aiQuestionService';
import { orgBranchScope } from '../utils/orgBranchScope';

/** Peer feedback is an opt-in, per-organization add-on — off by default. */
export async function requirePeerFeedbackAddon(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { orgId } = req.user!;
  const org = await Organization.findById(orgId).select('peerFeedbackAddon').lean();
  if (!org?.peerFeedbackAddon) {
    res.status(403).json({ success: false, message: 'Peer feedback add-on is not enabled for this organization' });
    return;
  }
  next();
}

async function getSelfStudent(orgId: string, branchId: string | undefined, userId: string) {
  return Student.findOne({ ...orgBranchScope({ orgId, branchId }), userId })
    .select('classId sectionId')
    .lean();
}

export async function getMyCycle(req: Request, res: Response): Promise<void> {
  const { orgId, branchId, id: userId } = req.user!;
  const self = await getSelfStudent(orgId!, branchId, userId);
  if (!self) { res.json({ success: true, data: null }); return; }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  let cycle = await PeerFeedbackCycle.findOne({
    ...orgBranchScope({ orgId, branchId }),
    classId: self.classId, sectionId: self.sectionId, month, year,
  }).populate('questionIds', 'text category scaleType').lean();

  // Lazily open the cycle if the monthly job hasn't run yet — the feature must work
  // without depending on cron timing, especially in dev.
  if (!cycle) {
    const { questions, source } = await generateQuestions({ count: 6 });
    const created = await PeerFeedbackQuestion.insertMany(
      questions.map((q) => ({ orgId, branchId, text: q.text, category: q.category, scaleType: 'likert5', source }))
    );
    const newCycle = await PeerFeedbackCycle.create({
      orgId, branchId, classId: self.classId, sectionId: self.sectionId, month, year,
      status: 'open', questionIds: created.map((q) => q._id), minResponsesForVisibility: 5,
    });
    cycle = await PeerFeedbackCycle.findById(newCycle._id).populate('questionIds', 'text category scaleType').lean();
  }

  if (!cycle || cycle.status !== 'open') { res.json({ success: true, data: null }); return; }

  const [alreadyRated, classmates] = await Promise.all([
    PeerFeedbackResponse.find({ cycleId: cycle._id, respondentStudentId: self._id }).distinct('targetStudentId'),
    Student.find({
      ...orgBranchScope({ orgId, branchId }),
      classId: self.classId, sectionId: self.sectionId, status: 'active',
      _id: { $ne: self._id },
    }).select('profile.name rollNo').lean(),
  ]);

  const ratedSet = new Set(alreadyRated.map((id) => id.toString()));
  const pendingPeers = classmates.filter((c) => !ratedSet.has(c._id.toString())).slice(0, 5);

  res.json({
    success: true,
    data: {
      cycleId: cycle._id,
      month: cycle.month,
      year: cycle.year,
      questions: cycle.questionIds,
      pendingPeers: pendingPeers.map((p) => ({ _id: p._id, name: p.profile.name, rollNo: p.rollNo })),
    },
  });
}

export const submitResponseValidators = [
  body('cycleId').isMongoId(),
  body('targetStudentId').isMongoId(),
  body('answers').isArray({ min: 1 }),
  body('answers.*.questionId').isMongoId(),
  body('answers.*.value').isInt({ min: 1, max: 5 }),
];

export async function submitResponse(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId, id: userId } = req.user!;
  const { cycleId, targetStudentId, answers } = req.body;

  const self = await getSelfStudent(orgId!, branchId, userId);
  if (!self) { res.status(404).json({ success: false, message: 'Student record not found' }); return; }
  if (targetStudentId === self._id.toString()) {
    res.status(400).json({ success: false, message: 'You cannot rate yourself' });
    return;
  }

  const cycle = await PeerFeedbackCycle.findOne({ _id: cycleId, ...orgBranchScope({ orgId, branchId }) }).lean();
  if (!cycle || cycle.status !== 'open') { res.status(404).json({ success: false, message: 'This feedback cycle is not open' }); return; }

  const target = await Student.findOne({
    _id: targetStudentId, ...orgBranchScope({ orgId, branchId }),
    classId: cycle.classId, sectionId: cycle.sectionId,
  }).select('_id').lean();
  if (!target) { res.status(404).json({ success: false, message: 'Classmate not found in this cycle' }); return; }

  const validQuestionIds = new Set(cycle.questionIds.map((id) => id.toString()));
  const cleanAnswers = (answers as { questionId: string; value: number }[]).filter((a) => validQuestionIds.has(a.questionId));
  if (cleanAnswers.length !== cycle.questionIds.length) {
    res.status(422).json({ success: false, message: 'All questions in this cycle must be answered' });
    return;
  }

  try {
    await PeerFeedbackResponse.create({
      orgId, branchId, cycleId,
      targetStudentId, respondentStudentId: self._id,
      answers: cleanAnswers,
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({ success: false, message: 'You have already rated this classmate this cycle' });
      return;
    }
    throw err;
  }

  res.status(201).json({ success: true, message: 'Feedback submitted' });
}

export async function getSummary(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const { studentId } = req.query;
  if (typeof studentId !== 'string') { res.status(400).json({ success: false, message: 'studentId is required' }); return; }

  const scope = orgBranchScope({ orgId, branchId });
  const responseCount = await PeerFeedbackResponse.countDocuments({ ...scope, targetStudentId: studentId });

  const latestCycle = await PeerFeedbackCycle.findOne({ ...scope })
    .sort({ year: -1, month: -1 })
    .select('minResponsesForVisibility')
    .lean();
  const threshold = latestCycle?.minResponsesForVisibility ?? 5;

  if (responseCount < threshold) {
    res.json({ success: true, data: { visible: false, responseCount, threshold, byCategory: [] } });
    return;
  }

  const byCategory = await PeerFeedbackResponse.aggregate([
    { $match: { orgId: new Types.ObjectId(orgId), targetStudentId: new Types.ObjectId(studentId) } },
    { $unwind: '$answers' },
    { $lookup: { from: 'peerfeedbackquestions', localField: 'answers.questionId', foreignField: '_id', as: 'question' } },
    { $unwind: '$question' },
    { $group: { _id: '$question.category', avgValue: { $avg: '$answers.value' }, count: { $sum: 1 } } },
    { $project: { _id: 0, category: '$_id', avgValue: { $round: ['$avgValue', 2] }, count: 1 } },
    { $sort: { category: 1 } },
  ]);

  res.json({ success: true, data: { visible: true, responseCount, threshold, byCategory } });
}
