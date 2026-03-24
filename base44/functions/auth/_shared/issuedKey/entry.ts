import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const enc = new TextEncoder();
const KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SYSTEM_ADMIN_BREAKGLASS_LOGIN = 'system-admin';
const SYSTEM_ADMIN_BREAKGLASS_CALLSIGN = 'SYSTEM-ADMIN';
const SYSTEM_ADMIN_BREAKGLASS_KEY_SHA256 = '0953b1cc84a2528bc71593b7efff66a546d12960245a746d0ddaee305f7d3f65';

export const SESSION_COOKIE_NAME = 'nexus_member_session';
export const BROWSER_SESSION_TTL_SECONDS = 60 * 60 * 24;
export const REMEMBER_ME_TTL_SECONDS = 60 * 60 * 24 * 30;

type NexusUserRecord = {
  id: string;
  callsign?: string | null;
  login_name?: string | null;
  username?: string | null;
  nexus_rank?: string | null;
  joined_at?: string | null;
  onboarding_complete?: boolean | null;
  key_revoked?: boolean | null;
  auth_key_hash?: string | null;
  session_invalidated_at?: string | null;
  is_admin?: boolean | null;
  key_prefix?: string | null;
  key_issued_by?: string | null;
  key_issued_at?: string | null;
  last_seen_at?: string | null;
  notifications_seen_at?: string | null;
  created_date?: string | null;
  updated_date?: string | null;
};

type SessionTokenPayload = {
  user_id: string;
  login_name: string;
  is_admin: boolean;
  iat: number;
  exp: number;
};

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

export function normalizeLoginName(value: string): string {
  return String(value || '').trim().toLowerCase();
}

export function normalizeCallsign(value: string): string {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export function resolveUserLoginName(user: Partial<NexusUserRecord>): string {
  return normalizeLoginName(String(user.login_name || user.username || user.callsign || ''));
}

export function resolveUserCallsign(user: Partial<NexusUserRecord>): string {
  return normalizeCallsign(String(user.callsign || user.login_name || user.username || 'NOMAD'));
}

export function isAdminUser(user: Partial<NexusUserRecord>): boolean {
  return String(user.nexus_rank || '').toUpperCase() === 'PIONEER' || user.is_admin === true;
}

function sessionTtlSeconds(rememberMe: boolean): number {
  return rememberMe ? REMEMBER_ME_TTL_SECONDS : BROWSER_SESSION_TTL_SECONDS;
}

export function sessionNoStoreHeaders(): HeadersInit {
  return { 'Cache-Control': 'no-store' };
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

function isSecure(req: Request): boolean {
  const appUrl = Deno.env.get('APP_URL') || '';
  return appUrl.startsWith('https://')
    || new URL(req.url).protocol === 'https:'
    || (req.headers.get('x-forwarded-proto') || '').includes('https');
}

function getRequestHostname(req: Request): string {
  const forwardedHost = (req.headers.get('x-forwarded-host') || '').split(',')[0]?.trim();
  const hostHeader = (req.headers.get('host') || '').split(',')[0]?.trim();
  const rawHost = forwardedHost || hostHeader || new URL(req.url).hostname || '';
  return rawHost.split(':')[0].replace(/^www\./, '').toLowerCase();
}

function getCookieDomain(req: Request): string | null {
  const appUrl = Deno.env.get('APP_URL') || '';
  if (!appUrl) return null;

  try {
    const configuredHost = new URL(appUrl).hostname.replace(/^www\./, '').toLowerCase();
    const requestHost = getRequestHostname(req);

    if (!configuredHost || !requestHost) {
      return null;
    }

    if (requestHost === configuredHost || requestHost.endsWith(`.${configuredHost}`)) {
      return configuredHost;
    }

    // When the request is coming from a different host, fall back to a host-only
    // cookie so Base44 development domains can authenticate independently.
    return null;
  } catch {
    return null;
  }
}

function cookieParts(name: string, value: string, req: Request): string[] {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Lax', 'HttpOnly'];
  const domain = getCookieDomain(req);
  if (domain) {
    parts.push(`Domain=.${domain}`);
  }
  if (isSecure(req)) {
    parts.push('Secure');
  }
  return parts;
}

export function appendSessionCookie(headers: Headers, token: string, req: Request, rememberMe: boolean): void {
  const parts = cookieParts(SESSION_COOKIE_NAME, token, req);
  if (rememberMe) {
    parts.push(`Max-Age=${sessionTtlSeconds(true)}`);
  }
  headers.append('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(headers: Headers, req: Request): void {
  const parts = cookieParts(SESSION_COOKIE_NAME, '', req);
  parts.push('Max-Age=0');
  headers.append('Set-Cookie', parts.join('; '));
}

async function getSigningKey(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function signValue(value: string, secret: string): Promise<string> {
  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

export function getSessionSigningSecret(): string {
  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) {
    throw new Error('SESSION_SIGNING_SECRET not configured');
  }
  return secret;
}

export async function hashAuthKey(authKey: string, secret: string): Promise<string> {
  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(authKey));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function generateAuthKey(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (byte) => KEY_CHARS[byte % KEY_CHARS.length]).join('');
  return `RSN-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

export function keyPrefixFromAuthKey(authKey: string): string {
  return authKey.slice(0, 8);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function isSystemAdminBreakglassCredential(loginName: string, authKey: string): Promise<boolean> {
  if (normalizeLoginName(loginName) !== SYSTEM_ADMIN_BREAKGLASS_LOGIN) {
    return false;
  }

  return (await sha256Hex(String(authKey || '').trim())) === SYSTEM_ADMIN_BREAKGLASS_KEY_SHA256;
}

export async function createSessionToken(
  user: Partial<NexusUserRecord> & { id: string },
  secret: string,
  rememberMe: boolean,
): Promise<string> {
  const now = Date.now();
  const payload: SessionTokenPayload = {
    user_id: user.id,
    login_name: resolveUserLoginName(user),
    is_admin: isAdminUser(user),
    iat: now,
    exp: now + sessionTtlSeconds(rememberMe) * 1000,
  };
  const body = toBase64Url(enc.encode(JSON.stringify(payload)));
  const signature = await signValue(body, secret);
  return `${body}.${signature}`;
}

export async function decodeSessionToken(token: string | null | undefined, secret: string): Promise<SessionTokenPayload | null> {
  if (!token) return null;

  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = await signValue(body, secret);
  if (signature !== expected) return null;

  try {
    const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionTokenPayload;
    if (!decoded.exp || decoded.exp < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function listNexusUsers(base44: ReturnType<typeof createClientFromRequest>): Promise<NexusUserRecord[]> {
  return (await base44.asServiceRole.entities.NexusUser.list('-created_date', 500)) || [];
}

export async function findUserById(
  base44: ReturnType<typeof createClientFromRequest>,
  userId: string,
): Promise<NexusUserRecord | null> {
  if (!userId) return null;
  return ((await base44.asServiceRole.entities.NexusUser.filter({ id: userId })) || [])[0] || null;
}

export async function findUserByLoginName(
  base44: ReturnType<typeof createClientFromRequest>,
  loginName: string,
): Promise<NexusUserRecord | null> {
  const normalized = normalizeLoginName(loginName);
  if (!normalized) return null;

  const users = await listNexusUsers(base44);
  const matches = users.filter((candidate) => resolveUserLoginName(candidate) === normalized);
  if (matches.length === 0) {
    return null;
  }

  const scoreCandidate = (candidate: NexusUserRecord) => {
    const exactLoginName = normalizeLoginName(String(candidate.login_name || candidate.username || '')) === normalized ? 1 : 0;
    const hasActiveKey = candidate.key_revoked === true ? 0 : 1;
    const hasKeyHash = candidate.auth_key_hash ? 1 : 0;
    const freshness = new Date(
      candidate.key_issued_at
      || candidate.updated_date
      || candidate.last_seen_at
      || candidate.created_date
      || candidate.joined_at
      || 0,
    ).getTime();

    return [exactLoginName, hasActiveKey, hasKeyHash, freshness];
  };

  matches.sort((left, right) => {
    const leftScore = scoreCandidate(left);
    const rightScore = scoreCandidate(right);

    for (let index = 0; index < leftScore.length; index += 1) {
      if (leftScore[index] !== rightScore[index]) {
        return rightScore[index] - leftScore[index];
      }
    }

    return String(right.id || '').localeCompare(String(left.id || ''));
  });

  return matches[0] || null;
}

export async function ensureSystemAdminUser(
  base44: ReturnType<typeof createClientFromRequest>,
  secret: string,
  authKey: string,
): Promise<NexusUserRecord> {
  const users = await listNexusUsers(base44);
  const matches = users.filter((candidate) =>
    normalizeLoginName(String(candidate.login_name || candidate.username || '')) === SYSTEM_ADMIN_BREAKGLASS_LOGIN
    || String(candidate.callsign || '').trim().toUpperCase() === SYSTEM_ADMIN_BREAKGLASS_CALLSIGN,
  );

  const freshness = (candidate: NexusUserRecord) => new Date(
    candidate.key_issued_at
    || candidate.updated_date
    || candidate.last_seen_at
    || candidate.created_date
    || candidate.joined_at
    || 0,
  ).getTime();

  matches.sort((left, right) => freshness(right) - freshness(left));

  let canonical = matches[0] || null;
  const duplicates = matches.slice(1);
  for (const duplicate of duplicates) {
    await base44.asServiceRole.entities.NexusUser.delete(duplicate.id);
  }

  const now = new Date().toISOString();
  const authKeyHash = await hashAuthKey(authKey, secret);
  const updatePayload = {
    login_name: SYSTEM_ADMIN_BREAKGLASS_LOGIN,
    username: SYSTEM_ADMIN_BREAKGLASS_LOGIN,
    callsign: SYSTEM_ADMIN_BREAKGLASS_CALLSIGN,
    full_name: 'System Admin',
    nexus_rank: 'PIONEER',
    is_admin: true,
    auth_key_hash: authKeyHash,
    key_prefix: keyPrefixFromAuthKey(authKey),
    key_issued_by: SYSTEM_ADMIN_BREAKGLASS_CALLSIGN,
    key_issued_at: now,
    key_revoked: false,
    onboarding_complete: true,
    joined_at: canonical?.joined_at || now,
    last_seen_at: now,
    ai_features_enabled: true,
    session_invalidated_at: null,
    revoked_at: null,
  };

  if (!canonical) {
    canonical = await base44.asServiceRole.entities.NexusUser.create(updatePayload);
  } else {
    await base44.asServiceRole.entities.NexusUser.update(canonical.id, updatePayload);
    canonical = await findUserById(base44, canonical.id);
  }

  if (!canonical) {
    throw new Error('Failed to repair system-admin account');
  }

  return canonical;
}

export function toSessionResponse(user: NexusUserRecord) {
  const isAdmin = isAdminUser(user);
  const loginName = resolveUserLoginName(user);

  return {
    authenticated: true,
    source: 'member',
    is_admin: isAdmin,
    user: {
      id: user.id,
      login_name: loginName,
      username: loginName,
      callsign: resolveUserCallsign(user),
      rank: String(user.nexus_rank || 'AFFILIATE').toUpperCase(),
      joinedAt: user.joined_at || null,
      onboarding_complete: user.onboarding_complete ?? false,
      notifications_seen_at: user.notifications_seen_at || null,
      is_admin: isAdmin,
    },
  };
}

export async function resolveIssuedKeySession(req: Request): Promise<{ user: NexusUserRecord, payload: SessionTokenPayload } | null> {
  const secret = getSessionSigningSecret();
  const cookies = parseCookies(req);
  const payload = await decodeSessionToken(cookies[SESSION_COOKIE_NAME], secret);

  if (!payload?.user_id) {
    return null;
  }

  const base44 = createClientFromRequest(req);
  const user = await findUserById(base44, payload.user_id)
    || await findUserByLoginName(base44, payload.login_name);

  if (!user || user.key_revoked) {
    return null;
  }

  const invalidatedAt = user.session_invalidated_at ? new Date(user.session_invalidated_at).getTime() : 0;
  if (invalidatedAt && invalidatedAt > payload.iat) {
    return null;
  }

  return { user, payload };
}

export async function requireAdminSession(req: Request): Promise<{ user: NexusUserRecord } | null> {
  const resolved = await resolveIssuedKeySession(req);
  if (!resolved || !isAdminUser(resolved.user)) {
    return null;
  }
  return { user: resolved.user };
}

export function serializeManagedUser(user: NexusUserRecord) {
  return {
    id: user.id,
    login_name: resolveUserLoginName(user),
    username: resolveUserLoginName(user),
    callsign: resolveUserCallsign(user),
    nexus_rank: String(user.nexus_rank || 'AFFILIATE').toUpperCase(),
    key_prefix: user.key_prefix || null,
    key_issued_by: user.key_issued_by || null,
    key_issued_at: user.key_issued_at || null,
    key_revoked: user.key_revoked === true,
    joined_at: user.joined_at || null,
    onboarding_complete: user.onboarding_complete ?? false,
    last_seen_at: user.last_seen_at || null,
    notifications_seen_at: user.notifications_seen_at || null,
    is_admin: isAdminUser(user),
  };
}
