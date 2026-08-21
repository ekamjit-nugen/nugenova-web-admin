'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { setToken, isSuperAdmin } from '@/lib/auth';

/**
 * Passwordless email-OTP login (Phase 0 shell). Wired to the backend's
 * /auth/send-otp + /auth/verify-otp — fully functional once the auth module
 * lands in Phase 1. In dev the OTP is 000000 (DEV_OTP_BYPASS).
 */
export default function LoginPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'email' | 'otp' | 'mfa'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [challenge, setChallenge] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setPhase('otp');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{
        accessToken?: string;
        route?: string;
        mfaRequired?: boolean;
        mfaChallengeToken?: string;
      }>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      });
      if (res?.mfaRequired && res?.mfaChallengeToken) {
        // TOTP second factor — hand off to the MFA step.
        setChallenge(res.mfaChallengeToken);
        setPhase('mfa');
      } else if (res?.accessToken) {
        setToken(res.accessToken);
        // The backend returns the canonical app route (e.g. /platform), but this
        // thin admin frontend only ships /admin/playbooks + /dashboard so far —
        // map super admins to the playbooks console, everyone else to the
        // dashboard. Richer routes light up as later modules land.
        router.push(isSuperAdmin() ? '/admin/playbooks' : '/dashboard');
      } else {
        setError('Unexpected response from server.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleMfa(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ accessToken?: string }>(
        '/auth/mfa/authenticate',
        {
          method: 'POST',
          body: JSON.stringify({ mfaChallengeToken: challenge, code: mfaCode }),
        },
      );
      if (res?.accessToken) {
        setToken(res.accessToken);
        router.push(isSuperAdmin() ? '/admin/playbooks' : '/dashboard');
      } else {
        setError('Unexpected response from server.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="card">
        <h1>Sign in to Nexora</h1>
        <p className="sub">
          {phase === 'email'
            ? 'Enter your email — we’ll send you a one-time code.'
            : phase === 'otp'
              ? `Enter the 6-digit code sent to ${email}.`
              : 'Enter the code from your authenticator app.'}
        </p>

        {phase === 'email' ? (
          <form onSubmit={handleSendOtp}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send code'}
            </button>
          </form>
        ) : phase === 'otp' ? (
          <form onSubmit={handleVerifyOtp}>
            <label htmlFor="otp">One-time code</label>
            <input
              id="otp"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              required
              autoFocus
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <p className="hint">
              <a href="#" onClick={(e) => { e.preventDefault(); setPhase('email'); setOtp(''); }}>
                ← Use a different email
              </a>
            </p>
          </form>
        ) : (
          <form onSubmit={handleMfa}>
            <label htmlFor="mfa">Authenticator code</label>
            <input
              id="mfa"
              inputMode="numeric"
              maxLength={8}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\s/g, ''))}
              placeholder="123456"
              required
              autoFocus
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <p className="hint">
              <a href="#" onClick={(e) => { e.preventDefault(); setPhase('email'); setOtp(''); setMfaCode(''); setChallenge(''); }}>
                ← Start over
              </a>
            </p>
          </form>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
