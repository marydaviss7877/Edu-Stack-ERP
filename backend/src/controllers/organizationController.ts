import { Request, Response } from 'express';
import { body, validationResult, param } from 'express-validator';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { Organization } from '../models/Organization';
import { Branch } from '../models/Branch';
import { User } from '../models/User';
import { hashPassword, generateTokens, storeRefreshToken } from '../services/authService';
import { getUploadUrl, getPublicUrl } from '../services/s3Service';
import { env } from '../config/env';
import { withoutTenantEnforcement } from '../utils/tenantPlugin';

export const createOrgValidators = [
  body('name').trim().notEmpty(),
  body('slug').trim().isSlug(),
  body('contactEmail').isEmail().normalizeEmail(),
  body('adminName').trim().notEmpty(),
  body('adminEmail').isEmail().normalizeEmail(),
  body('adminPassword').isLength({ min: 8 }),
];

/** Super Admin: create a new tenant organization with its first Group Admin */
export async function createOrganization(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }

  const { name, slug, contactEmail, contactPhone, adminName, adminEmail, adminPassword, plan } = req.body;

  const existingSlug = await Organization.findOne({ slug });
  if (existingSlug) {
    res.status(409).json({ success: false, message: 'Slug already taken' });
    return;
  }

  const existingEmail = await User.findOne({ email: adminEmail });
  if (existingEmail) {
    res.status(409).json({ success: false, message: 'Admin email already registered' });
    return;
  }

  const passwordHash = await hashPassword(adminPassword);
  const session = await mongoose.startSession();
  try {
    const result = await session.withTransaction(async () => {
      const [org] = await Organization.create([{
        name,
        slug,
        contactEmail,
        contactPhone,
        plan: plan ?? 'starter',
        status: 'trial',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }], { session });

      const [adminUser] = await User.create([{
        orgId: org._id,
        role: 'group_admin',
        name: adminName,
        email: adminEmail,
        passwordHash,
        active: true,
      }], { session });

      await Branch.create([{
        orgId: org._id,
        name: 'Main Branch',
        code: 'MAIN',
        address: '-',
        city: '-',
      }], { session });

      return { org, adminUser };
    });

    const { org, adminUser } = result!;
    res.status(201).json({
      success: true,
      data: { organization: org, adminUser: { id: adminUser._id.toString(), email: adminUser.email } },
    });
  } finally {
    await session.endSession();
  }
}

export async function listOrganizations(req: Request, res: Response): Promise<void> {
  const { page = '1', limit = '20', status } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const { Student } = await import('../models/Student');

  const orgs = await Organization.find(filter).skip(skip).limit(parseInt(limit as string)).sort({ createdAt: -1 }).lean();
  const orgIds = orgs.map(o => o._id);

  const [total, studentCounts] = await Promise.all([
    Organization.countDocuments(filter),
    Student.aggregate([
      { $match: { orgId: { $in: orgIds }, status: 'active' } },
      { $group: { _id: '$orgId', count: { $sum: 1 } } },
    ]),
  ]);

  const countMap: Record<string, number> = {};
  for (const entry of studentCounts) {
    countMap[entry._id.toString()] = entry.count;
  }

  const enriched = orgs.map(org => ({
    ...org,
    usageBilling: {
      ...org.usageBilling,
      activeStudents: countMap[org._id.toString()] ?? 0,
    },
  }));

  res.json({ success: true, data: enriched, meta: { total, page: parseInt(page as string) } });
}

export async function getOrganization(req: Request, res: Response): Promise<void> {
  const callerRole = req.user!.role;
  const { id } = req.params;

  if (callerRole !== 'super_admin' && req.user!.orgId?.toString() !== id) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  const { Student } = await import('../models/Student');

  const [org, activeCount] = await Promise.all([
    Organization.findById(id).lean(),
    Student.countDocuments({ orgId: id, status: 'active' }),
  ]);

  if (!org) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }

  res.json({
    success: true,
    data: {
      ...org,
      usageBilling: { ...org.usageBilling, activeStudents: activeCount },
    },
  });
}

export async function updateOrganization(req: Request, res: Response): Promise<void> {
  const callerRole = req.user!.role;
  const { id } = req.params;

  if (callerRole !== 'super_admin' && req.user!.orgId?.toString() !== id) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  // group_admin cannot change plan or status — only super_admin can
  const allowedFields = callerRole === 'super_admin'
    ? ['name', 'contactEmail', 'contactPhone', 'address', 'status', 'plan', 'settings', 'logoUrl', 'welcomeMessage', 'tagline', 'primaryColor', 'websiteAddon', 'peerFeedbackAddon']
    : ['name', 'contactEmail', 'contactPhone', 'address', 'settings', 'logoUrl', 'welcomeMessage', 'tagline', 'primaryColor'];

  const update: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }

  const org = await Organization.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  if (!org) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }
  res.json({ success: true, data: org });
}

export async function updateSite(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  if (req.user!.orgId?.toString() !== id && req.user!.role !== 'super_admin') {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  const org = await Organization.findById(id).select('websiteAddon').lean();
  if (!org) { res.status(404).json({ success: false, message: 'Organization not found' }); return; }
  if (!org.websiteAddon) { res.status(403).json({ success: false, message: 'Website add-on not enabled for this organization' }); return; }

  const updated = await Organization.findByIdAndUpdate(
    id,
    { $set: { site: req.body } },
    { new: true, runValidators: true },
  );
  res.json({ success: true, data: updated?.site ?? null });
}

/**
 * Super Admin: recompute UsageMetric for a given month on demand, instead of waiting
 * for the 1st-of-month cron (jobs/index.ts). Runs the same aggregation synchronously —
 * it's a single indexed pass over Attendance, fast enough to await in-request.
 */
export async function recalculateUsageMetrics(req: Request, res: Response): Promise<void> {
  const { month } = req.body as { month?: string };
  if (month !== undefined && !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ success: false, message: 'month must be in YYYY-MM format' });
    return;
  }

  const forMonth = month ? new Date(`${month}-01T00:00:00.000Z`) : undefined;

  const { countActiveStudents } = await import('../jobs/handlers/billingHandler');
  await countActiveStudents(forMonth);

  res.json({ success: true, message: `Usage metrics recalculated for ${month ?? 'the current month'}.` });
}

export async function getUsageMetrics(req: Request, res: Response): Promise<void> {
  const { month } = req.query;
  const filter: Record<string, unknown> = {};
  if (month) filter.month = month;

  const { UsageMetric } = await import('../models/UsageMetric');
  // Cross-org by design — this is the super-admin platform-wide view, not scoped to one tenant.
  const metrics = await withoutTenantEnforcement(UsageMetric.find(filter).sort({ month: -1 })).lean();

  res.json({ success: true, data: metrics });
}

/** Group admin's own-org usage/billing history — per-branch, per-month. Read-only. */
export async function getOwnUsageMetrics(req: Request, res: Response): Promise<void> {
  const callerRole = req.user!.role;
  const { id } = req.params;

  if (callerRole !== 'super_admin' && req.user!.orgId?.toString() !== id) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  const { month } = req.query;
  const filter: Record<string, unknown> = { orgId: id };
  if (month) filter.month = month;

  const { UsageMetric } = await import('../models/UsageMetric');
  const metrics = await UsageMetric.find(filter).sort({ month: -1 }).lean();

  res.json({ success: true, data: metrics });
}

export async function getLogoUploadUrl(req: Request, res: Response): Promise<void> {
  const callerRole = req.user!.role;
  const { id } = req.params;

  if (callerRole !== 'super_admin' && req.user!.orgId?.toString() !== id) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  const { filename, contentType } = req.body;
  if (!filename || !contentType) {
    res.status(400).json({ success: false, message: 'filename and contentType required' });
    return;
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
  if (!allowed.includes(contentType)) {
    res.status(400).json({ success: false, message: 'Only image files are allowed' });
    return;
  }

  const result = await getUploadUrl('org-logos', filename, contentType);
  if (!result) {
    res.status(503).json({ success: false, message: 'File storage not configured' });
    return;
  }

  res.json({ success: true, data: { uploadUrl: result.uploadUrl, publicUrl: getPublicUrl(result.key) } });
}

/**
 * Group Admin / Super Admin: generate a printable QR payload for mobile onboarding.
 * The QR encodes a signed JSON payload that the Flutter app decodes on scan.
 */
export async function generateMobileQr(req: Request, res: Response): Promise<void> {
  const callerRole = req.user!.role;
  const { id } = req.params;

  if (callerRole !== 'super_admin' && req.user!.orgId?.toString() !== id) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  const org = await Organization.findById(id).lean();
  if (!org) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }

  // Generate a stable qrSecret for this org if not set
  let qrSecret = org.mobile?.qrSecret;
  if (!qrSecret) {
    qrSecret = crypto.randomBytes(16).toString('hex');
    await Organization.findByIdAndUpdate(id, { 'mobile.qrSecret': qrSecret });
  }

  // QR payload — Flutter decodes this JSON on scan
  // NOTE: logoUrl intentionally excluded — base64 logos exceed QR capacity; app fetches it via API
  const payload = {
    v: 1,                                    // version
    slug: org.slug,
    name: org.name,
    primaryColor: org.settings?.primaryColor ?? '#1e3a5f',
    apiUrl: env.frontendUrl.replace('5173', '5000'), // backend URL
  };

  // Sign payload with HMAC so app can verify it wasn't tampered with
  const payloadStr = JSON.stringify(payload);
  const sig = crypto
    .createHmac('sha256', qrSecret)
    .update(payloadStr)
    .digest('hex')
    .slice(0, 16);

  const qrData = Buffer.from(JSON.stringify({ ...payload, sig })).toString('base64');

  res.json({ success: true, data: { qrData, org: { name: org.name, slug: org.slug } } });
}

/** Super Admin: list all orgs with mobile configuration status */
export async function getMobileConfig(req: Request, res: Response): Promise<void> {
  const { User: UserModel } = await import('../models/User');

  const orgs = await Organization.find({}).select('name slug status mobile settings.primaryColor logoUrl').lean();

  // Count users with FCM tokens per org (active mobile users)
  const orgIds = orgs.map(o => o._id);
  const fcmCounts = await UserModel.aggregate([
    { $match: { orgId: { $in: orgIds }, fcmTokens: { $not: { $size: 0 } } } },
    { $group: { _id: '$orgId', count: { $sum: 1 } } },
  ]);
  const fcmMap: Record<string, number> = {};
  for (const entry of fcmCounts) fcmMap[entry._id.toString()] = entry.count;

  const result = orgs.map(org => ({
    id: org._id,
    name: org.name,
    slug: org.slug,
    status: org.status,
    mobileEnabled: org.mobile?.enabled ?? true,
    activeMobileUsers: fcmMap[org._id.toString()] ?? 0,
    primaryColor: (org.settings as Record<string, unknown>)?.primaryColor ?? '#1e3a5f',
    logoUrl: org.logoUrl ?? null,
    hasQrSecret: !!org.mobile?.qrSecret,
  }));

  res.json({ success: true, data: result });
}

/** Super Admin: list all users for an org with their device (FCM) registration status */
export async function getOrgMobileUsers(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const org = await Organization.findById(id).select('name slug mobile settings.primaryColor').lean();
  if (!org) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }

  const users = await User.find({ orgId: id })
    .select('name email role active fcmTokens lastLoginAt branchId')
    .populate<{ branchId: { name: string } | null }>('branchId', 'name')
    .sort({ role: 1, name: 1 })
    .lean();

  const result = users.map(u => ({
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    branchName: (u.branchId as unknown as { name: string } | null)?.name ?? null,
    deviceCount: u.fcmTokens.length,
    registered: u.fcmTokens.length > 0,
    lastLoginAt: u.lastLoginAt ?? null,
  }));

  res.json({ success: true, data: result });
}

/** Super Admin: revoke all FCM tokens for a specific user (remove device) */
export async function revokeUserDevices(req: Request, res: Response): Promise<void> {
  const { id, userId } = req.params;

  const user = await User.findOne({ _id: userId, orgId: id });
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found in this organization' });
    return;
  }

  user.fcmTokens = [];
  await user.save();

  res.json({ success: true, message: 'All devices removed for this user' });
}

/** Super Admin: toggle mobile access for an org */
export async function toggleMobileAccess(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    res.status(400).json({ success: false, message: 'enabled (boolean) is required' });
    return;
  }

  const org = await Organization.findByIdAndUpdate(id, { 'mobile.enabled': enabled }, { new: true });
  if (!org) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }

  res.json({ success: true, data: { id: org._id, mobileEnabled: org.mobile?.enabled } });
}
