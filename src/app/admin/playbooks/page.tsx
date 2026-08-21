'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { isSuperAdmin, getToken } from '@/lib/auth';

interface PlaybookSummary {
  module: string;
  title?: string;
  status?: string;
  migration?: string;
  ci?: { status?: string; coverage?: number; runUrl?: string };
  scenarios?: number;
}

/**
 * Super-admin-only Module Playbooks viewer (Phase 0 shell). Lists every
 * migrated module with live migration/CI/scenario status; a detail view (added
 * with the first module) renders the module's PLAYBOOK.md. Route-guarded on the
 * JWT super_admin / isPlatformAdmin claim — the backend enforces it too.
 */
export default function PlaybooksPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<PlaybookSummary[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken() || !isSuperAdmin()) {
      router.replace('/login');
      return;
    }
    setReady(true);
    apiFetch<PlaybookSummary[]>('/admin/playbooks')
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((e) => setError((e as Error).message));
  }, [router]);

  if (!ready) return null;

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Module Playbooks</h1>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>
        Migration runbooks for every module on the new Postgres stack.
      </p>

      {error && <p className="error">Could not load playbooks: {error}</p>}

      {items.length === 0 && !error && (
        <div className="card" style={{ maxWidth: '100%', marginTop: 20 }}>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            No modules migrated yet. The first module (auth) will appear here with
            its playbook and live test status.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
        {items.map((m) => (
          <div key={m.module} className="card" style={{ maxWidth: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 16 }}>{m.title || m.module}</strong>
              <span className={`badge ${m.ci?.status === 'passing' ? 'ok' : 'pending'}`}>
                {m.ci?.status || 'no ci'}
              </span>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '8px 0 0' }}>
              migration: {m.migration || 'unknown'} · scenarios: {m.scenarios ?? '—'}
              {typeof m.ci?.coverage === 'number' ? ` · coverage: ${m.ci.coverage}%` : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
