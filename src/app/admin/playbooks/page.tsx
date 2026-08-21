'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiFetch } from '@/lib/api';
import { isSuperAdmin, getToken, clearToken, decodeJwt } from '@/lib/auth';

interface CiStatus {
  status: 'passing' | 'failing' | 'unknown';
  passed?: number;
  failed?: number;
  total?: number;
  coverage?: number | null;
  runUrl?: string | null;
}
interface PlaybookSummary {
  module: string;
  title: string;
  status: string;
  phase?: number;
  migratedAt?: string | null;
  scenarioCount: number;
  ci: CiStatus;
}
interface Scenario {
  feature: string;
  name: string;
  tags: string[];
}
interface PlaybookDetail extends PlaybookSummary {
  markdown: string;
  scenarios: Scenario[];
}

function ciBadgeClass(s?: string) {
  if (s === 'passing') return 'badge ok';
  if (s === 'failing') return 'badge fail';
  return 'badge pending';
}

/**
 * Super-admin-only Module Playbooks viewer. Lists every migrated module with
 * live migration/CI/scenario status and renders each module's PLAYBOOK.md.
 * Route-guarded on the JWT super_admin / isPlatformAdmin claim; the backend
 * enforces the same guard on /admin/playbooks.
 */
export default function PlaybooksPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<PlaybookSummary[]>([]);
  const [detail, setDetail] = useState<PlaybookDetail | null>(null);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token || !isSuperAdmin()) {
      router.replace('/login');
      return;
    }
    setEmail((decodeJwt(token)?.email as string) || '');
    setReady(true);
    apiFetch<PlaybookSummary[]>('/admin/playbooks')
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((e) => setError((e as Error).message));
  }, [router]);

  const open = useCallback((module: string) => {
    setError('');
    apiFetch<PlaybookDetail>(`/admin/playbooks/${module}`)
      .then(setDetail)
      .catch((e) => setError((e as Error).message));
  }, []);

  const logout = useCallback(() => {
    apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
    clearToken();
    router.replace('/login');
  }, [router]);

  if (!ready) return null;

  return (
    <div className="pb-wrap">
      <div className="pb-topbar">
        <div>
          <strong style={{ fontSize: 18 }}>Nexora · Platform</strong>
          <div className="who">{email} · super admin</div>
        </div>
        <button onClick={logout}>Sign out</button>
      </div>

      {!detail ? (
        <>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Module Playbooks</h1>
          <p style={{ color: 'var(--muted)', marginTop: 0 }}>
            Migration runbooks for every module on the Postgres stack — overview,
            endpoints, migration steps, rollback, and live test status.
          </p>

          {error && <p className="error">Could not load playbooks: {error}</p>}

          {items.length === 0 && !error && (
            <div className="card" style={{ maxWidth: '100%', marginTop: 20 }}>
              <p style={{ color: 'var(--muted)', margin: 0 }}>
                No modules migrated yet.
              </p>
            </div>
          )}

          <div className="pb-list">
            {items.map((m) => (
              <button key={m.module} className="pb-item" onClick={() => open(m.module)}>
                <div className="pb-row">
                  <strong style={{ fontSize: 16 }}>
                    {m.title}
                    {m.phase != null && (
                      <span style={{ color: 'var(--muted)', fontWeight: 400 }}>
                        {'  '}· Phase {m.phase}
                      </span>
                    )}
                  </strong>
                  <span style={{ display: 'flex', gap: 8 }}>
                    <span className={`badge ${m.status === 'live' ? 'live' : 'pending'}`}>
                      {m.status}
                    </span>
                    <span className={ciBadgeClass(m.ci?.status)}>
                      {m.ci?.status === 'passing'
                        ? `tests ${m.ci.passed ?? ''}✓`
                        : m.ci?.status === 'failing'
                          ? `tests ${m.ci.failed ?? ''}✗`
                          : 'tests pending'}
                    </span>
                  </span>
                </div>
                <p className="pb-meta">
                  {m.scenarioCount} scenario{m.scenarioCount === 1 ? '' : 's'}
                  {typeof m.ci?.coverage === 'number' ? ` · ${m.ci.coverage}% coverage` : ''}
                  {m.migratedAt ? ` · migrated ${String(m.migratedAt).slice(0, 10)}` : ''}
                </p>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button className="pb-back" onClick={() => setDetail(null)}>
            ← All modules
          </button>
          <div className="pb-row" style={{ marginBottom: 16 }}>
            <h1 style={{ fontSize: 24, margin: 0 }}>{detail.title}</h1>
            <span className={ciBadgeClass(detail.ci?.status)}>
              {detail.ci?.status === 'passing'
                ? `${detail.ci.passed ?? 0}/${detail.ci.total ?? detail.ci.passed ?? 0} tests passing`
                : detail.ci?.status === 'failing'
                  ? `${detail.ci.failed ?? 0} failing`
                  : 'CI status pending'}
            </span>
          </div>

          {detail.scenarios.length > 0 && (
            <>
              <h2 style={{ fontSize: 18 }}>Scenarios ({detail.scenarios.length})</h2>
              <div className="pb-scenarios">
                {detail.scenarios.map((s, i) => (
                  <div key={i} className="pb-scenario">
                    {s.tags.map((t) => (
                      <span
                        key={t}
                        className={`pb-tag ${t === '@bug' ? 'bug' : ''}`}
                      >
                        {t}
                      </span>
                    ))}
                    <span>{s.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {error && <p className="error">{error}</p>}

          <div className="md">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {detail.markdown}
            </ReactMarkdown>
          </div>
        </>
      )}
    </div>
  );
}
