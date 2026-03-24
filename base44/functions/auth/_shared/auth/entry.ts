const enc = new TextEncoder();

export const SESSION_COOKIE_NAME = 'nexus_member_session';
export const STATE_COOKIE_NAME = 'nexus_oauth_state';

function toBase64Url(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function removedAuthError() {
  return new Error('Discord OAuth has been removed from NexusOS');
}

type SignedPayload = {
  exp?: number;
  iat?: number;
  [key: string]: unknown;
};

export async function encodeSignedPayload(payload: SignedPayload): Promise<string> {
  return toBase64Url(enc.encode(JSON.stringify(payload)));
}

export async function decodeSignedPayload<T extends SignedPayload>(token?: string | null): Promise<T | null> {
  if (!token) return null;

  try {
    const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(token))) as T;
    if (decoded?.exp && decoded.exp < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function parseCookies(req: Request): Record<string, string> {
  const raw = req.headers.get('cookie') || '';
  return raw.split(';').reduce<Record<string, string>>((acc, part) => {
    const trimmed = part.trim();
    if (!trimmed) return acc;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return acc;
    acc[trimmed.slice(0, idx)] = decodeURIComponent(trimmed.slice(idx + 1));
    return acc;
  }, {});
}

function cookieParts(name: string, value: string, req: Request, options: { maxAge?: number; path?: string } = {}) {
  const secure = new URL(req.url).protocol === 'https:' || (req.headers.get('x-forwarded-proto') || '').includes('https');
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path || '/'}`,
    'SameSite=Lax',
    'HttpOnly',
  ];

  if (typeof options.maxAge === 'number') {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  if (secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function setCookie(headers: Headers, name: string, value: string, req: Request, options?: { maxAge?: number; path?: string }) {
  headers.append('Set-Cookie', cookieParts(name, value, req, options));
}

export function clearCookie(headers: Headers, name: string, req: Request) {
  headers.append('Set-Cookie', cookieParts(name, '', req, { maxAge: 0 }));
}

export function normalizeRedirectTo(raw: string | null): string {
  if (!raw) return '/app/industry';
  if (!raw.startsWith('/')) return '/app/industry';
  if (raw.startsWith('//')) return '/app/industry';
  if (!raw.startsWith('/app') && raw !== '/onboarding') return '/app/industry';
  return raw;
}

export function normalizeAppBase(raw: string | null): string {
  if (!raw || raw === '/') return '';
  if (!raw.startsWith('/')) return '';
  if (raw.startsWith('//')) return '';
  if (raw.includes('?') || raw.includes('#')) return '';

  const trimmed = raw.endsWith('/') ? raw.slice(0, -1) : raw;
  return trimmed === '/' ? '' : trimmed;
}

export async function buildDiscordAuthorizeUrl() {
  throw removedAuthError();
}

export async function exchangeDiscordCode() {
  throw removedAuthError();
}

export async function fetchDiscordUser() {
  throw removedAuthError();
}

export async function fetchGuildMember() {
  throw removedAuthError();
}

export async function mapGuildRolesToRank() {
  throw removedAuthError();
}

export function deriveSeedCallsign() {
  throw removedAuthError();
}

export async function upsertNexusUser() {
  throw removedAuthError();
}

export async function createSessionCookieValue() {
  throw removedAuthError();
}

export async function resolveMemberSession() {
  return null;
}

export function sessionNoStoreHeaders() {
  return {
    'Cache-Control': 'no-store',
  };
}

function resolveGateUrl(req: Request, appBase = '') {
  const base = normalizeAppBase(appBase);
  const target = new URL(req.url);
  target.pathname = base ? `${base}/` : '/';
  target.search = '';
  return target;
}

function resolveAppUrl(targetPath: string, req: Request) {
  return new URL(targetPath, new URL(req.url).origin);
}

export function gateErrorRedirect(errorCode: string, req: Request, headers = new Headers(), appBase = '') {
  const target = resolveGateUrl(req, appBase);
  target.searchParams.set('error', errorCode);
  headers.set('Location', target.toString());
  return new Response(null, { status: 302, headers });
}

export function appRedirect(targetPath: string, req: Request, headers = new Headers()) {
  const target = resolveAppUrl(targetPath, req);
  headers.set('Location', target.toString());
  return new Response(null, { status: 302, headers });
}
