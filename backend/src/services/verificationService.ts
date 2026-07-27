import crypto from 'crypto';
import { IUser } from '../models/User';
import { sendVerificationEmail } from './emailService';

const CODE_TTL_MS = 10 * 60 * 1000;
export const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
export const VERIFICATION_MAX_ATTEMPTS = 5;

function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/** Milliseconds remaining before another code can be sent, 0 if none. */
export function verificationCooldownRemaining(user: IUser): number {
  const last = user.verification?.lastSentAt;
  if (!last) return 0;
  const remaining = VERIFICATION_RESEND_COOLDOWN_MS - (Date.now() - last.getTime());
  return remaining > 0 ? remaining : 0;
}

/** Generates a fresh code, stores its hash on the user, and sends it (fire-and-forget). */
export async function issueVerificationCode(user: IUser, orgName: string): Promise<void> {
  const code = generateCode();
  user.verification = {
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
    attempts: 0,
    lastSentAt: new Date(),
  };
  await user.save();

  // Don't let Resend's latency hold up the HTTP response
  sendVerificationEmail(user.email, code, orgName).catch(err =>
    console.error('[verificationService] failed to send verification email:', err)
  );
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'none' | 'expired' | 'too_many_attempts' | 'incorrect' };

/** Checks a submitted code against the stored hash. Caller is responsible for persisting attempt increments. */
export function checkVerificationCode(user: IUser, submittedCode: string): VerifyResult {
  const v = user.verification;
  if (!v?.codeHash || !v.expiresAt) return { ok: false, reason: 'none' };
  if (v.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };
  if (v.attempts >= VERIFICATION_MAX_ATTEMPTS) return { ok: false, reason: 'too_many_attempts' };
  if (hashCode(submittedCode) !== v.codeHash) return { ok: false, reason: 'incorrect' };
  return { ok: true };
}
