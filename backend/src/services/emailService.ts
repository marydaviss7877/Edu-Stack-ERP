import { Resend } from 'resend';
import { env } from '../config/env';

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

export async function sendVerificationEmail(to: string, code: string, orgName: string): Promise<void> {
  if (!resend) {
    // Dev/unset-key fallback — never block signup on missing email config
    console.warn(`[emailService] RESEND_API_KEY not set. Verification code for ${to}: ${code}`);
    return;
  }

  await resend.emails.send({
    from: env.emailFrom,
    to,
    subject: `${code} is your verification code`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #111827; margin: 0 0 8px;">Verify your email</h2>
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">
          Use this code to verify the email address for <strong>${orgName}</strong> on EduStack PK.
        </p>
        <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1e3a5f;">${code}</span>
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
