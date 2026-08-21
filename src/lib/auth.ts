export interface JwtClaims {
  sub?: string;
  email?: string;
  roles?: string[];
  isPlatformAdmin?: boolean;
  [key: string]: unknown;
}

export function setToken(token: string): void {
  localStorage.setItem('nexora_token', token);
}

export function getToken(): string | null {
  return typeof window !== 'undefined'
    ? localStorage.getItem('nexora_token')
    : null;
}

export function clearToken(): void {
  localStorage.removeItem('nexora_token');
}

export function decodeJwt(token: string): JwtClaims | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

/** Super-admin = platform admin OR the super_admin role (matches the backend guard). */
export function isSuperAdmin(): boolean {
  const t = getToken();
  if (!t) return false;
  const c = decodeJwt(t);
  if (!c) return false;
  return (
    c.isPlatformAdmin === true ||
    (Array.isArray(c.roles) && c.roles.includes('super_admin'))
  );
}
