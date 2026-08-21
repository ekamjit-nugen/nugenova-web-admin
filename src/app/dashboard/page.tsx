'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getToken, clearToken, isSuperAdmin } from '@/lib/auth';

interface Me {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  setupStage: string;
  mfaEnabled: boolean;
  defaultOrganizationId: string | null;
  organizations: string[];
}

/**
 * Minimal authenticated landing for the new stack. Confirms the JWT resolves a
 * real user via GET /auth/me (reading from Postgres). Fuller dashboards arrive
 * with later modules; Phase 1 just proves end-to-end login works.
 */
export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    apiFetch<Me>('/auth/me')
      .then(setMe)
      .catch((e) => {
        setError((e as Error).message);
        clearToken();
        router.replace('/login');
      });
  }, [router]);

  const logout = useCallback(() => {
    apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
    clearToken();
    router.replace('/login');
  }, [router]);

  if (error) return null;
  if (!me) return null;

  return (
    <div className="pb-wrap">
      <div className="pb-topbar">
        <div>
          <strong style={{ fontSize: 18 }}>Nexora</strong>
          <div className="who">{me.email}</div>
        </div>
        <button onClick={logout}>Sign out</button>
      </div>

      <div className="card" style={{ maxWidth: '100%' }}>
        <h1 style={{ fontSize: 22, marginTop: 0 }}>
          Welcome, {me.firstName || me.email}
        </h1>
        <p style={{ color: 'var(--muted)' }}>
          You&apos;re signed in on the Postgres stack. This identity was read
          live from <code>/auth/me</code>.
        </p>
        <p className="pb-meta">
          roles: {me.roles?.join(', ') || '—'} · setup: {me.setupStage} · MFA:{' '}
          {me.mfaEnabled ? 'on' : 'off'} · orgs: {me.organizations?.length ?? 0}
        </p>
        {isSuperAdmin() && (
          <p style={{ marginTop: 16 }}>
            <a href="/admin/playbooks">→ Open Module Playbooks (super admin)</a>
          </p>
        )}
      </div>
    </div>
  );
}
