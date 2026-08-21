export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

/**
 * Thin fetch wrapper for the Nexora backend. Attaches the bearer token,
 * unwraps the response, and throws the backend's error message on failure.
 */
export async function apiFetch<T = any>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('nexora_token') : null;
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}) as any);
  if (!res.ok) {
    throw new Error(
      data?.message || data?.error?.message || `Request failed (${res.status})`,
    );
  }
  // Backend wraps successful payloads in { success, data } once the response
  // interceptor lands; tolerate both shapes for now.
  return (data?.data ?? data) as T;
}
