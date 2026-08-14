import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Branch } from '../models/Branch';
import {
  generateTokens,
  hashPassword,
  blacklistToken,
  storeRefreshToken,
  rotateRefreshToken,
} from '../services/authService';
import { withoutTenantEnforcement } from '../utils/tenantPlugin';
import {
  issueVerificationCode,
  checkVerificationCode,
  verificationCooldownRemaining,
} from '../services/verificationService';

const COOKIE_DOMAIN = env.isDev ? undefined : `.${env.baseDomain}`;

const ACCESS_COOKIE_OPTS = {
  httpOnly: true,
  secure: !env.isDev,
  sameSite: 'strict' as const,
  maxAge: 15 * 60 * 1000,
  ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
};

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: !env.isDev,
  sameSite: 'strict' as const,
  path: '/api/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
};

export const loginValidators = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
];

export async function login(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }

  const { email, password, slug, loginAs } = req.body;

  // loginAs = 'admin' | 'teacher' — defines which role group the user claims.
  // Validated after credential check so we don't leak which roles exist.
  const ROLE_GROUPS: Record<string, string[]> = {
    admin:   ['group_admin', 'branch_principal', 'coordinator', 'accountant', 'it_admin'],
    teacher: ['teacher'],
    student: ['student'],
  };
  const ROLE_LABELS: Record<string, string> = {
    admin:   'Staff / Admin',
    teacher: 'Teacher',
    student: 'Student',
  };

  try {
    // Resolve slug → orgId, reject suspended orgs
    let orgId: string | undefined;
    if (slug) {
      const org = await Organization.findOne({ slug: String(slug).toLowerCase() }).select('_id status').lean();
      if (!org || org.status === 'suspended') {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }
      orgId = org._id.toString();
    }

    const query: Record<string, unknown> = { email, active: true };
    if (orgId) query.orgId = orgId;

    const user = await withoutTenantEnforcement(
      User.findOne(query).select('+passwordHash')
    );
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    // Role-group check — after credential verification so timing doesn't leak user existence
    if (loginAs && ROLE_GROUPS[loginAs] && !ROLE_GROUPS[loginAs].includes(user.role)) {
      const expected = ROLE_LABELS[loginAs] ?? loginAs;
      res.status(403).json({
        success: false,
        message: `This account is not registered as ${expected}. Please select the correct role and try again.`,
      });
      return;
    }

    if (user.mustChangePassword) {
      res.status(200).json({ success: true, mustChangePassword: true, message: 'Password change required' });
      return;
    }

    user.lastLoginAt = new Date();
    await user.save();

    const isMobile = req.headers['x-client-type'] === 'mobile';

    const tokens = generateTokens(
      {
        userId: user.id,
        role: user.role,
        orgId: user.orgId?.toString(),
        branchId: user.branchId?.toString(),
      },
      isMobile ? '30d' : undefined,
    );

    await storeRefreshToken(user.id, tokens.refreshToken);

    if (isMobile) {
      // Mobile: return tokens in JSON body (Flutter stores in SecureStorage)
      res.json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            orgId: user.orgId,
            branchId: user.branchId,
            photoUrl: user.photoUrl,
            emailVerifiedAt: user.emailVerifiedAt,
          },
        },
      });
      return;
    }

    res.cookie('accessToken', tokens.accessToken, ACCESS_COOKIE_OPTS);
    res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTS);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          orgId: user.orgId,
          branchId: user.branchId,
          photoUrl: user.photoUrl,
          emailVerifiedAt: user.emailVerifiedAt,
        },
      },
    });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  // Blacklist the access token (from cookie or header)
  const token =
    (req.cookies as Record<string, string> | undefined)?.accessToken ??
    req.headers.authorization?.slice(7);
  if (token) await blacklistToken(token);

  res.clearCookie('accessToken', { ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }) });
  res.clearCookie('refreshToken', { path: '/api/auth/refresh', ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }) });
  res.json({ success: true, message: 'Logged out successfully' });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  // Accept token from cookie (web) or body (mobile)
  const refreshToken =
    (req.cookies as Record<string, string> | undefined)?.refreshToken ??
    req.body?.refreshToken;

  if (!refreshToken) {
    res.status(400).json({ success: false, message: 'Refresh token required' });
    return;
  }

  const isMobile = req.headers['x-client-type'] === 'mobile';
  const result = await rotateRefreshToken(refreshToken, isMobile ? '30d' : undefined);
  if (!result) {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    return;
  }

  if (isMobile) {
    res.json({
      success: true,
      data: {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        user: { id: result.user._id.toString(), role: result.user.role },
      },
    });
    return;
  }

  res.cookie('accessToken', result.tokens.accessToken, ACCESS_COOKIE_OPTS);
  res.cookie('refreshToken', result.tokens.refreshToken, REFRESH_COOKIE_OPTS);
  res.json({ success: true, data: { user: { id: result.user._id.toString(), role: result.user.role } } });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user!.id).select('-passwordHash');
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      branchId: user.branchId,
      photoUrl: user.photoUrl,
      emailVerifiedAt: user.emailVerifiedAt,
    },
  });
}

export const changePasswordValidators = [
  body('currentPassword').isLength({ min: 6 }),
  body('newPassword').isLength({ min: 8 }),
];

export async function changePassword(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }

  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user!.id).select('+passwordHash');
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    res.status(400).json({ success: false, message: 'Current password is incorrect' });
    return;
  }

  user.passwordHash = await hashPassword(newPassword);
  user.passwordChangedAt = new Date();
  user.mustChangePassword = false;
  await user.save();

  res.json({ success: true, message: 'Password changed successfully' });
}

export const registerOrgValidators = [
  body('orgName').trim().notEmpty().withMessage('School name is required'),
  body('slug').trim().matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase letters, numbers and hyphens only'),
  body('contactEmail').isEmail().normalizeEmail().withMessage('Valid contact email required'),
  body('contactPhone').optional().trim(),
  body('adminName').trim().notEmpty().withMessage('Your name is required'),
  body('adminEmail').isEmail().normalizeEmail().withMessage('Valid admin email required'),
  body('adminPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

/** Public: self-service school registration — creates org + group admin + returns tokens */
export async function registerOrg(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }

  const { orgName, slug, contactEmail, contactPhone, adminName, adminEmail, adminPassword } = req.body;

  const [existingSlug, existingEmail] = await Promise.all([
    Organization.findOne({ slug }),
    withoutTenantEnforcement(User.findOne({ email: adminEmail })),
  ]);

  if (existingSlug) {
    res.status(409).json({ success: false, message: 'This URL slug is already taken. Try a different one.' });
    return;
  }
  if (existingEmail) {
    // Deliberately vague to prevent email enumeration
    res.status(409).json({ success: false, message: 'Registration failed. Please verify your details and try again.' });
    return;
  }

  const { PlatformSettings } = await import('../models/PlatformSettings');
  const platformSettings = await PlatformSettings.findOne();
  const trialDays = platformSettings?.trialDays ?? 30;
  const passwordHash = await hashPassword(adminPassword);

  const session = await mongoose.startSession();
  try {
    const result = await session.withTransaction(async () => {
      const [org] = await Organization.create([{
        name: orgName,
        slug,
        contactEmail,
        contactPhone,
        plan: 'starter',
        status: 'trial',
        trialEndsAt: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
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
    const tokens = generateTokens({
      userId: adminUser._id.toString(),
      role: 'group_admin',
      orgId: org._id.toString(),
    });

    await storeRefreshToken(adminUser._id.toString(), tokens.refreshToken);

    res.cookie('accessToken', tokens.accessToken, ACCESS_COOKIE_OPTS);
    res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTS);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: adminUser._id.toString(),
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          orgId: org._id,
          emailVerifiedAt: null,
        },
        trialEndsAt: org.trialEndsAt,
        trialDays,
      },
    });

    // Fire off the verification code after responding — full app access is
    // never blocked on this; it's a soft nudge, not a signup gate.
    issueVerificationCode(adminUser, org.name).catch(err =>
      console.error('[registerOrg] failed to issue verification code:', err)
    );
  } finally {
    await session.endSession();
  }
}

export const verifyEmailValidators = [
  body('code').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('Enter the 6-digit code'),
];

/** Verifies the authenticated user's email against a previously issued code. Idempotent. */
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }

  const user = await User.findById(req.user!.id).select('+verification.codeHash');
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  if (user.emailVerifiedAt) {
    res.json({ success: true, message: 'Email already verified', data: { emailVerifiedAt: user.emailVerifiedAt } });
    return;
  }

  const result = checkVerificationCode(user, req.body.code);

  if (!result.ok) {
    const messages: Record<typeof result.reason, string> = {
      none: 'No verification code pending. Please request a new one.',
      expired: 'This code has expired. Please request a new one.',
      too_many_attempts: 'Too many incorrect attempts. Please request a new code.',
      incorrect: 'Incorrect code. Please try again.',
    };

    if (result.reason === 'incorrect' && user.verification) {
      user.verification.attempts += 1;
      await user.save();
    }

    res.status(400).json({ success: false, message: messages[result.reason], reason: result.reason });
    return;
  }

  user.emailVerifiedAt = new Date();
  user.verification = undefined;
  await user.save();

  res.json({ success: true, message: 'Email verified successfully', data: { emailVerifiedAt: user.emailVerifiedAt } });
}

/** Resends a fresh verification code, subject to a per-user cooldown. */
export async function resendVerification(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user!.id);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  if (user.emailVerifiedAt) {
    res.status(400).json({ success: false, message: 'Email already verified' });
    return;
  }

  const cooldownMs = verificationCooldownRemaining(user);
  if (cooldownMs > 0) {
    res.status(429).json({
      success: false,
      message: `Please wait ${Math.ceil(cooldownMs / 1000)}s before requesting another code.`,
      retryAfterMs: cooldownMs,
    });
    return;
  }

  const org = user.orgId ? await Organization.findById(user.orgId).select('name').lean() : null;
  await issueVerificationCode(user, org?.name ?? 'your school');

  res.json({ success: true, message: 'Verification code sent' });
}
