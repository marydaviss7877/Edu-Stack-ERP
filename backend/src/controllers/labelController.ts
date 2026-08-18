import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Label } from '../models/Label';
import { Student } from '../models/Student';
import { orgBranchScope } from '../utils/orgBranchScope';

export const labelValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('colorHex').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('colorHex must be a hex color'),
];

export async function listLabels(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const labels = await Label.find(orgBranchScope({ orgId: orgId!, branchId })).sort({ category: 1, name: 1 }).lean();
  res.json({ success: true, data: labels });
}

export async function createLabel(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId } = req.user!;
  const { name, colorHex, category } = req.body;

  const label = await Label.create({ orgId, branchId, name, colorHex, category });
  res.status(201).json({ success: true, data: label });
}

export async function updateLabel(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const allowed = ['name', 'colorHex', 'category'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

  const label = await Label.findOneAndUpdate({ _id: req.params.id, orgId, branchId }, update, { new: true, runValidators: true });
  if (!label) { res.status(404).json({ success: false, message: 'Label not found' }); return; }
  res.json({ success: true, data: label });
}

export async function deleteLabel(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const label = await Label.findOneAndDelete({ _id: req.params.id, orgId, branchId });
  if (!label) { res.status(404).json({ success: false, message: 'Label not found' }); return; }
  await Student.updateMany({ orgId, branchId, labelIds: label._id }, { $pull: { labelIds: label._id } });
  res.json({ success: true, message: 'Label deleted' });
}
