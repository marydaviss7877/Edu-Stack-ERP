import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { TransportRoute } from '../models/TransportRoute';
import { Student } from '../models/Student';
import { orgBranchScope } from '../utils/orgBranchScope';

export const transportRouteValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('vehicleNo').trim().notEmpty().withMessage('Vehicle number is required'),
  body('monthlyFee').isFloat({ min: 0 }).withMessage('monthlyFee must be a positive number'),
  body('stops').optional().isArray(),
];

export async function listTransportRoutes(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const routes = await TransportRoute.find(orgBranchScope({ orgId: orgId!, branchId }))
    .sort({ name: 1 })
    .lean();

  const counts = await Student.aggregate([
    { $match: { orgId, ...(branchId ? { branchId } : {}), 'transport.routeId': { $ne: null } } },
    { $group: { _id: '$transport.routeId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  res.json({ success: true, data: routes.map((r) => ({ ...r, studentCount: countMap.get(String(r._id)) ?? 0 })) });
}

export async function createTransportRoute(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId } = req.user!;
  const { name, vehicleNo, driverName, driverPhone, capacity, monthlyFee, stops } = req.body;

  const route = await TransportRoute.create({
    orgId, branchId, name, vehicleNo, driverName, driverPhone,
    capacity: capacity || undefined, monthlyFee, stops: stops ?? [],
  });
  res.status(201).json({ success: true, data: route });
}

export async function updateTransportRoute(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const allowed = ['name', 'vehicleNo', 'driverName', 'driverPhone', 'capacity', 'monthlyFee', 'stops', 'isActive'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

  const route = await TransportRoute.findOneAndUpdate({ _id: req.params.id, orgId, branchId }, update, { new: true, runValidators: true });
  if (!route) { res.status(404).json({ success: false, message: 'Transport route not found' }); return; }
  res.json({ success: true, data: route });
}

export async function deleteTransportRoute(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const route = await TransportRoute.findOneAndDelete({ _id: req.params.id, orgId, branchId });
  if (!route) { res.status(404).json({ success: false, message: 'Transport route not found' }); return; }
  await Student.updateMany({ orgId, branchId, 'transport.routeId': route._id }, { $unset: { transport: '' } });
  res.json({ success: true, message: 'Transport route deleted' });
}
