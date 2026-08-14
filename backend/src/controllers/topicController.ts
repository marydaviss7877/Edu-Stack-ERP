import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { SubjectTopic } from '../models/SubjectTopic';
import { orgBranchScope } from '../utils/orgBranchScope';

export const createTopicValidators = [
  body('classId').isMongoId(),
  body('subjectId').isMongoId(),
  body('chapterNumber').isInt({ min: 1 }),
  body('topicName').trim().notEmpty(),
  body('orderIndex').optional().isInt({ min: 0 }),
];

export async function listTopics(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const { subjectId, classId } = req.query;

  const filter: Record<string, unknown> = orgBranchScope({ orgId, branchId });
  if (subjectId) filter.subjectId = subjectId;
  if (classId) filter.classId = classId;

  const topics = await SubjectTopic.find(filter)
    .populate('subjectId', 'name code')
    .populate('classId', 'name level')
    .sort({ chapterNumber: 1, orderIndex: 1, topicName: 1 })
    .lean();

  res.json({ success: true, data: topics });
}

export async function createTopic(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId, id: createdById } = req.user!;

  // Upsert by unique key — safe for inline creation from paper form
  const topic = await SubjectTopic.findOneAndUpdate(
    {
      orgId, branchId,
      classId: req.body.classId,
      subjectId: req.body.subjectId,
      topicName: req.body.topicName.trim(),
    },
    { $setOnInsert: { orgId, branchId, createdById }, $set: { chapterNumber: req.body.chapterNumber, orderIndex: req.body.orderIndex ?? 0 } },
    { upsert: true, new: true, runValidators: true }
  );

  res.status(201).json({ success: true, data: topic });
}

export async function updateTopic(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const allowed = ['chapterNumber', 'topicName', 'orderIndex'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

  const topic = await SubjectTopic.findOneAndUpdate({ _id: req.params.id, orgId }, update, { new: true });
  if (!topic) { res.status(404).json({ success: false, message: 'Topic not found' }); return; }
  res.json({ success: true, data: topic });
}

export async function deleteTopic(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const topic = await SubjectTopic.findOneAndDelete({ _id: req.params.id, orgId });
  if (!topic) { res.status(404).json({ success: false, message: 'Topic not found' }); return; }
  res.json({ success: true, message: 'Topic deleted' });
}
