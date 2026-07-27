import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import { verifyEmail, resendVerification } from '../../services/authService';
import { cn } from '../../lib/utils';

const DISMISS_KEY_PREFIX = 'edustack_verify_dismissed_';

function errorMessage(err: unknown): string | undefined {
  return axios.isAxiosError(err) ? (err.response?.data as { message?: string } | undefined)?.message : undefined;
}

function retryAfterMs(err: unknown): number | undefined {
  return axios.isAxiosError(err) ? (err.response?.data as { retryAfterMs?: number } | undefined)?.retryAfterMs : undefined;
}

export default function VerifyEmailBanner() {
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [dismissed, setDismissed] = useState(
    () => !!user?.id && !!sessionStorage.getItem(DISMISS_KEY_PREFIX + user.id),
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => (c > 1 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const shouldShow = user?.role === 'group_admin' && !user.emailVerifiedAt && !dismissed;

  async function handleVerify(submitted: string) {
    if (!user) return;
    setVerifying(true);
    setError('');
    try {
      const { emailVerifiedAt } = await verifyEmail(submitted);
      setUser({ ...user, emailVerifiedAt });
    } catch (err) {
      setError(errorMessage(err) ?? 'Verification failed. Please try again.');
      setCode('');
      inputRef.current?.focus();
    } finally {
      setVerifying(false);
    }
  }

  function handleCodeChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6) handleVerify(digits);
  }

  async function handleResend() {
    if (!user || cooldown > 0) return;
    setResending(true);
    setError('');
    try {
      await resendVerification();
      setCooldown(60);
      setCode('');
    } catch (err) {
      const ms = retryAfterMs(err);
      if (ms) setCooldown(Math.ceil(ms / 1000));
      setError(errorMessage(err) ?? 'Could not resend code. Please try again.');
    } finally {
      setResending(false);
    }
  }

  function handleDismiss() {
    if (user?.id) sessionStorage.setItem(DISMISS_KEY_PREFIX + user.id, '1');
    setDismissed(true);
  }

  if (!shouldShow) return null;

  return (
    <div className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 bg-blue-50 border-b border-blue-200 dark:bg-blue-900/20 dark:border-blue-700/40">
      <div className="flex items-center gap-2.5 flex-1 min-w-[220px]">
        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span className="text-xs text-blue-900 dark:text-blue-200 font-medium">
          Verify <span className="font-bold">{user!.email}</span> — enter the code we emailed you.
        </span>
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={code}
          onChange={e => handleCodeChange(e.target.value)}
          disabled={verifying}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="6-digit code"
          maxLength={6}
          className={cn(
            'w-28 rounded-lg border bg-white dark:bg-slate-800 text-center font-mono text-sm tracking-[0.2em] py-1.5',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
            'border-blue-200 dark:border-blue-700/60 dark:text-slate-100 disabled:opacity-60',
          )}
        />
        <button
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          className="text-xs text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending...' : 'Resend code'}
        </button>
        <button
          onClick={handleDismiss}
          className="text-blue-400 hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-300 transition-colors"
          aria-label="Dismiss"
          title="Dismiss for now"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && (
        <p className="w-full text-[11px] text-red-600 dark:text-red-400 font-medium">{error}</p>
      )}
    </div>
  );
}
