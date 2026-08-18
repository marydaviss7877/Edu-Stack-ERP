import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { House } from '../models/House';
import { Student } from '../models/Student';
import { orgBranchScope } from '../utils/orgBranchScope';

export const houseValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('colorHex').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('colorHex must be a hex color'),
];

export async function listHouses(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const houses = await House.find(orgBranchScope({ orgId: orgId!, branchId }))
    .populate('headTeacherId', 'name')
    .sort({ name: 1 })
    .lean();

  // Attach live student counts per house
  const counts = await Student.aggregate([
    { $match: { orgId, ...(branchId ? { branchId } : {}), houseId: { $ne: null } } },
    { $group: { _id: '$houseId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  res.json({ success: true, data: houses.map((h) => ({ ...h, studentCount: countMap.get(String(h._id)) ?? 0 })) });
}

export async function createHouse(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId } = req.user!;
  const { name, colorHex, motto, headTeacherId } = req.body;

  const house = await House.create({ orgId, branchId, name, colorHex, motto, headTeacherId: headTeacherId || undefined });
  res.status(201).json({ success: true, data: house });
}

export async function updateHouse(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const allowed = ['name', 'colorHex', 'motto', 'headTeacherId'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k] || undefined;

  const house = await House.findOneAndUpdate({ _id: req.params.id, orgId, branchId }, update, { new: true, runValidators: true });
  if (!house) { res.status(404).json({ success: false, message: 'House not found' }); return; }
  res.json({ success: true, data: house });
}

export async function deleteHouse(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const house = await House.findOneAndDelete({ _id: req.params.id, orgId, branchId });
  if (!house) { res.status(404).json({ success: false, message: 'House not found' }); return; }
  await Student.updateMany({ orgId, branchId, houseId: house._id }, { $unset: { houseId: '' } });
  res.json({ success: true, message: 'House deleted' });
}
