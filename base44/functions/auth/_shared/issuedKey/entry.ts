import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const enc = new TextEncoder();
const KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const SESSION_COOKIE_NAME = 'nexus_member_session';
export const BROWSER_SESSION_TTL_SECONDS = 60 * 60 * 24;
export const REMEMBER_ME_TTL_SECONDS = 60 * 60 * 24 * 30;

export type NexusUserRecord = {
  id: string;
  callsign?: string | null;
  login_name?: string | null;
  username?: string | null;
  nexus_rank?: string | null;
  op_role?: string | null;
  specialization?: string | null;
  intel_access?: string | null;
  aUEC_balance?: number | null;
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
  uex_handle?: string | null;
  consent_given?: boolean | null;
  consent_timestamp?: string | null;
  created_date?: string | null;
  updated_date?: string | null;
};

export type SessionTokenPayload = {
  user_id: string;
  login_name: string;
  is_admin: boolean;
  iat: number;
  exp: number;
};

type AuthFailureResult = {
  ok: false;
  error: string;
  status: number;
  details?: Record<string, unknown>;
};

type AuthSuccessResult<T extends Record<string, unknown>> = {
  ok: true;
} & T;

type SignInRequestBody = {
  username?: string | null;
  login_name?: string | null;
  callsign?: string | null;
  key?: string | null;
  remember_me?: boolean | null;
};

export const AUTH_CRITICAL_FIELDS = [
  'login_name',
  'username',
  'callsign',
  'nexus_rank',
  'auth_key_hash',
  'key_prefix',
  'key_issued_at',
  'key_revoked',
  'session_invalidated_at',
  'onboarding_complete',
  'consent_given',
  'consent_timestamp',
  'is_admin',
] as const;

export const AUTH_ISSUE_REQUIRED_FIELDS = [
  'login_name',
  'username',
  'callsign',
  'nexus_rank',
  'auth_key_hash',
  'key_prefix',
  'key_issued_at',
  'key_revoked',
  'onboarding_complete',
  'is_admin',
] as const;

export const AUTH_REGENERATE_REQUIRED_FIELDS = [
  ...AUTH_ISSUE_REQUIRED_FIELDS,
  'session_invalidated_at',
] as const;

export const AUTH_ONBOARDING_REQUIRED_FIELDS = [
  'onboarding_complete',
  'consent_given',
  'consent_timestamp',
] as const;

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
  return String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '-');
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

export function resolvePersistedLoginName(user: Partial<NexusUserRecord>): string {
  return normalizeLoginName(String(user.login_name || user.username || ''));
}

export function resolveUserCallsign(user: Partial<NexusUserRecord>): string {
  return normalizeCallsign(String(user.callsign || user.login_name || user.username || 'NOMAD'));
}

export function isAdminUser(user: Partial<NexusUserRecord>): boolean {
  return String(user.nexus_rank || '').toUpperCase() === 'PIONEER' || user.is_admin === true;
}

export function isOnboardingComplete(user: Partial<NexusUserRecord>): boolean {
  return user.onboarding_complete === true || user.consent_given === true || Boolean(user.consent_timestamp);
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

function sameTimestamp(left: unknown, right: unknown): boolean {
  const leftTime = new Date(String(left || '')).getTime();
  const rightTime = new Date(String(right || '')).getTime();

  if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
    return leftTime === rightTime;
  }

  return String(left || '') === String(right || '');
}

function hasExpectedField<T extends object, K extends keyof T>(expected: Partial<T>, field: K): boolean {
  return Object.prototype.hasOwnProperty.call(expected, field);
}

export function missingLoginAuthFields(user: Partial<NexusUserRecord> | null | undefined): string[] {
  const missing = [];

  if (!resolvePersistedLoginName(user || {})) {
    missing.push('login_name');
  }

  if (!String(user?.auth_key_hash || '').trim()) {
    missing.push('auth_key_hash');
  }

  return missing;
}

export function buildAuthFieldChecks(
  user: Partial<NexusUserRecord> | null | undefined,
  expected: Partial<NexusUserRecord> = {},
): Record<string, boolean> {
  const expectedLoginName = resolvePersistedLoginName(expected);
  const expectedCallsign = expected.callsign ? normalizeCallsign(String(expected.callsign)) : '';
  const expectedRank = expected.nexus_rank ? String(expected.nexus_rank).toUpperCase() : '';

  return {
    login_name: expectedLoginName
      ? resolvePersistedLoginName(user || {}) === expectedLoginName
      : Boolean(resolvePersistedLoginName(user || {})),
    username: expectedLoginName
      ? normalizeLoginName(String(user?.username || '')) === expectedLoginName
      : Boolean(normalizeLoginName(String(user?.username || ''))),
    callsign: expectedCallsign
      ? normalizeCallsign(String(user?.callsign || '')) === expectedCallsign
      : Boolean(normalizeCallsign(String(user?.callsign || ''))),
    nexus_rank: expectedRank
      ? String(user?.nexus_rank || '').toUpperCase() === expectedRank
      : Boolean(String(user?.nexus_rank || '').trim()),
    auth_key_hash: hasExpectedField(expected, 'auth_key_hash')
      ? String(user?.auth_key_hash || '') === String(expected.auth_key_hash || '')
      : Boolean(String(user?.auth_key_hash || '').trim()),
    key_prefix: hasExpectedField(expected, 'key_prefix')
      ? String(user?.key_prefix || '') === String(expected.key_prefix || '')
      : Boolean(String(user?.key_prefix || '').trim()),
    key_issued_at: hasExpectedField(expected, 'key_issued_at')
      ? sameTimestamp(user?.key_issued_at, expected.key_issued_at)
      : Boolean(String(user?.key_issued_at || '').trim()),
    key_revoked: hasExpectedField(expected, 'key_revoked')
      ? user?.key_revoked === expected.key_revoked
      : typeof user?.key_revoked === 'boolean',
    session_invalidated_at: hasExpectedField(expected, 'session_invalidated_at')
      ? sameTimestamp(user?.session_invalidated_at, expected.session_invalidated_at)
      : Boolean(String(user?.session_invalidated_at || '').trim()),
    onboarding_complete: hasExpectedField(expected, 'onboarding_complete')
      ? user?.onboarding_complete === expected.onboarding_complete
      : typeof user?.onboarding_complete === 'boolean',
    consent_given: hasExpectedField(expected, 'consent_given')
      ? user?.consent_given === expected.consent_given
      : typeof user?.consent_given === 'boolean',
    consent_timestamp: hasExpectedField(expected, 'consent_timestamp')
      ? sameTimestamp(user?.consent_timestamp, expected.consent_timestamp)
      : Boolean(String(user?.consent_timestamp || '').trim()),
    is_admin: hasExpectedField(expected, 'is_admin')
      ? user?.is_admin === expected.is_admin
      : typeof user?.is_admin === 'boolean',
  };
}

export function requiredAuthFieldsPass(
  checks: Record<string, boolean>,
  requiredFields: readonly string[],
): boolean {
  return requiredFields.every((field) => checks[field] === true);
}

export async function createSessionToken(
  user: Partial<NexusUserRecord> & { id: string },
  secret: string,
  rememberMe: boolean,
): Promise<string> {
  const now = Date.now();
  const payload: SessionTokenPayload = {
    user_id: user.id,
    login_name: resolvePersistedLoginName(user) || resolveUserLoginName(user),
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

export async function verifyAuthUserReadback(
  base44: ReturnType<typeof createClientFromRequest>,
  userId: string,
  expected: Partial<NexusUserRecord>,
  requiredFields: readonly string[],
): Promise<{ ok: boolean; user: NexusUserRecord | null; field_checks: Record<string, boolean> }> {
  const user = await findUserById(base44, userId);
  const fieldChecks = buildAuthFieldChecks(user, expected);

  return {
    ok: Boolean(user?.id) && requiredAuthFieldsPass(fieldChecks, requiredFields),
    user,
    field_checks: fieldChecks,
  };
}

export async function authenticateIssuedKeyCredentials(
  base44: ReturnType<typeof createClientFromRequest>,
  loginName: string,
  authKey: string,
  secret: string,
): Promise<AuthFailureResult | AuthSuccessResult<{ user: NexusUserRecord }>> {
  const user = await findUserByLoginName(base44, loginName);
  if (!user) {
    return { ok: false, error: 'user_not_found', status: 401 };
  }

  if (user.key_revoked) {
    return { ok: false, error: 'key_revoked', status: 403 };
  }

  const missingFields = missingLoginAuthFields(user);
  if (missingFields.length > 0) {
    return {
      ok: false,
      error: 'missing_auth_fields',
      status: 401,
      details: {
        missing_fields: missingFields,
        field_checks: buildAuthFieldChecks(user),
      },
    };
  }

  const presentedHash = await hashAuthKey(authKey, secret);
  if (presentedHash !== user.auth_key_hash) {
    return { ok: false, error: 'hash_mismatch', status: 401 };
  }

  return { ok: true, user };
}

export async function hydrateAuthenticatedUser(
  base44: ReturnType<typeof createClientFromRequest>,
  user: NexusUserRecord,
  fallbackLoginName: string,
): Promise<AuthFailureResult | AuthSuccessResult<{
  user: NexusUserRecord;
  login_name: string;
  callsign: string;
  onboarding_complete: boolean;
  is_admin: boolean;
  isNew: boolean;
}>> {
  const now = new Date().toISOString();
  const isNew = !user.joined_at;
  const loginName = resolvePersistedLoginName(user) || normalizeLoginName(fallbackLoginName);
  const callsign = resolveUserCallsign(user);
  const onboardingComplete = isOnboardingComplete(user);
  const admin = isAdminUser(user);

  await base44.asServiceRole.entities.NexusUser.update(user.id, {
    login_name: loginName,
    username: loginName,
    callsign,
    joined_at: user.joined_at || now,
    last_seen_at: now,
    is_admin: admin,
    key_revoked: false,
    ...(onboardingComplete ? { onboarding_complete: true } : {}),
  });

  const readback = await verifyAuthUserReadback(base44, user.id, {
    login_name: loginName,
    username: loginName,
    callsign,
    auth_key_hash: user.auth_key_hash,
    key_revoked: false,
    is_admin: admin,
  }, ['login_name', 'username', 'callsign', 'auth_key_hash', 'key_revoked', 'is_admin']);

  if (!readback.ok || !readback.user) {
    return {
      ok: false,
      error: 'schema_persist_failed',
      status: 500,
      details: {
        field_checks: readback.field_checks,
      },
    };
  }

  return {
    ok: true,
    user: {
      ...readback.user,
      joined_at: readback.user.joined_at || user.joined_at || now,
      last_seen_at: readback.user.last_seen_at || now,
      onboarding_complete: onboardingComplete,
      is_admin: admin,
    },
    login_name: loginName,
    callsign,
    onboarding_complete: onboardingComplete,
    is_admin: admin,
    isNew,
  };
}

function signInBodyFromRequest(body: SignInRequestBody) {
  return {
    username: normalizeLoginName(String(body?.username || body?.login_name || body?.callsign || '')),
    authKey: String(body?.key || '').trim(),
    rememberMe: body?.remember_me === true,
  };
}

async function parseSignInBody(req: Request): Promise<AuthFailureResult | AuthSuccessResult<{
  username: string;
  authKey: string;
  rememberMe: boolean;
}>> {
  let body: SignInRequestBody;
  try {
    body = await req.json();
  } catch {
    return { ok: false, error: 'invalid_body', status: 400 };
  }

  const parsed = signInBodyFromRequest(body);
  if (!parsed.username || !parsed.authKey) {
    return { ok: false, error: 'invalid_credentials', status: 400 };
  }

  return { ok: true, ...parsed };
}

export async function handleIssuedKeySignIn(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: sessionNoStoreHeaders() });
  }

  const parsedBody = await parseSignInBody(req);
  if (!parsedBody.ok) {
    return Response.json({ error: parsedBody.error }, { status: parsedBody.status, headers: sessionNoStoreHeaders() });
  }

  try {
    const secret = getSessionSigningSecret();
    const base44 = createClientFromRequest(req);
    const authResult = await authenticateIssuedKeyCredentials(base44, parsedBody.username, parsedBody.authKey, secret);

    if (!authResult.ok) {
      return Response.json({
        error: authResult.error,
        ...(authResult.details || {}),
      }, { status: authResult.status, headers: sessionNoStoreHeaders() });
    }

    const hydrated = await hydrateAuthenticatedUser(base44, authResult.user, parsedBody.username);
    if (!hydrated.ok) {
      return Response.json({
        error: hydrated.error,
        ...(hydrated.details || {}),
      }, { status: hydrated.status, headers: sessionNoStoreHeaders() });
    }

    const token = await createSessionToken(hydrated.user, secret, parsedBody.rememberMe);
    const headers = new Headers(sessionNoStoreHeaders());
    appendSessionCookie(headers, token, req, parsedBody.rememberMe);

    return Response.json({
      success: true,
      isNew: hydrated.isNew,
      onboarding_complete: hydrated.onboarding_complete,
      nexus_rank: hydrated.user.nexus_rank || 'AFFILIATE',
      is_admin: hydrated.is_admin,
      login_name: hydrated.login_name,
      username: hydrated.login_name,
      callsign: hydrated.callsign,
    }, { headers });
  } catch (error) {
    if (String(error?.message || '').includes('SESSION_SIGNING_SECRET')) {
      return Response.json({ error: 'session_secret_missing' }, { status: 500, headers: sessionNoStoreHeaders() });
    }

    console.error('[issuedKeySignIn]', error);
    return Response.json({ error: 'login_failed' }, { status: 500, headers: sessionNoStoreHeaders() });
  }
}

export async function handleIssuedKeySession(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: sessionNoStoreHeaders() });
  }

  try {
    const secret = getSessionSigningSecret();
    const cookies = parseCookies(req);
    const payload = await decodeSessionToken(cookies[SESSION_COOKIE_NAME], secret);

    if (!payload?.user_id) {
      return Response.json({ authenticated: false }, { status: 401, headers: sessionNoStoreHeaders() });
    }

    const base44 = createClientFromRequest(req);
    const user = await findUserById(base44, payload.user_id)
      || await findUserByLoginName(base44, payload.login_name);

    if (!user) {
      return Response.json({ authenticated: false, error: 'user_not_found' }, { status: 401, headers: sessionNoStoreHeaders() });
    }

    if (user.key_revoked) {
      return Response.json({ authenticated: false, error: 'key_revoked' }, { status: 401, headers: sessionNoStoreHeaders() });
    }

    const missingFields = missingLoginAuthFields(user);
    if (missingFields.length > 0) {
      return Response.json({
        authenticated: false,
        error: 'missing_auth_fields',
        missing_fields: missingFields,
        field_checks: buildAuthFieldChecks(user),
      }, { status: 401, headers: sessionNoStoreHeaders() });
    }

    if (user.onboarding_complete !== true && isOnboardingComplete(user)) {
      await base44.asServiceRole.entities.NexusUser.update(user.id, { onboarding_complete: true });
      user.onboarding_complete = true;
    }

    const invalidatedAt = user.session_invalidated_at ? new Date(user.session_invalidated_at).getTime() : 0;
    if (invalidatedAt && invalidatedAt > payload.iat) {
      return Response.json({ authenticated: false }, { status: 401, headers: sessionNoStoreHeaders() });
    }

    return Response.json(toSessionResponse(user), { status: 200, headers: sessionNoStoreHeaders() });
  } catch (error) {
    if (String(error?.message || '').includes('SESSION_SIGNING_SECRET')) {
      return Response.json({ authenticated: false, error: 'session_secret_missing' }, { status: 500, headers: sessionNoStoreHeaders() });
    }

    console.error('[issuedKeySession]', error);
    return Response.json({ authenticated: false, error: 'session_unavailable' }, { status: 500, headers: sessionNoStoreHeaders() });
  }
}

export async function handleIssuedKeyLogout(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: sessionNoStoreHeaders() });
  }

  const headers = new Headers(sessionNoStoreHeaders());
  clearSessionCookie(headers, req);
  return Response.json({ success: true }, { headers });
}

export function toSessionResponse(user: NexusUserRecord) {
  const isAdmin = isAdminUser(user);
  const loginName = resolvePersistedLoginName(user) || resolveUserLoginName(user);
  const onboardingComplete = isOnboardingComplete(user);
  const rank = String(user.nexus_rank || 'AFFILIATE').toUpperCase();

  return {
    authenticated: true,
    source: 'member',
    is_admin: isAdmin,
    user: {
      id: user.id,
      login_name: loginName,
      username: loginName,
      callsign: resolveUserCallsign(user),
      rank,
      nexus_rank: rank,
      op_role: String(user.op_role || '').trim() || null,
      aUEC_balance: Number(user.aUEC_balance || 0) || 0,
      joinedAt: user.joined_at || null,
      joined_at: user.joined_at || null,
      onboarding_complete: onboardingComplete,
      notifications_seen_at: user.notifications_seen_at || null,
      uex_handle: String(user.uex_handle || '').trim() || null,
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

  if (user.onboarding_complete !== true && isOnboardingComplete(user)) {
    await base44.asServiceRole.entities.NexusUser.update(user.id, { onboarding_complete: true });
    user.onboarding_complete = true;
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
