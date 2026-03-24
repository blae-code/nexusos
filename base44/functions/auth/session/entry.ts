/**
 * GET /auth/session — Validate session cookie, return user data.
 * Self-contained: all auth helpers inlined.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const enc = new TextEncoder();
const SESSION_COOKIE_NAME = 'nexus_member_session';

function toBase64Url(bytes) {
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function normalizeLoginName(value) {
  return String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '-');
}

function normalizeCallsign(value) {
  return String(value || '').trim().toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function resolveUserLoginName(user) {
  return normalizeLoginName(String(user.login_name || user.username || user.callsign || ''));
}

function resolveUserCallsign(user) {
  return normalizeCallsign(String(user.callsign || user.login_name || user.username || 'NOMAD'));
}

function isAdminUser(user) {
  return String(user.nexus_rank || '').toUpperCase() === 'PIONEER' || user.is_admin === true;
}

function isOnboardingComplete(user) {
  return user.onboarding_complete === true || user.consent_given === true || Boolean(user.consent_timestamp);
}

function sessionNoStoreHeaders() {
  return { 'Cache-Control': 'no-store' };
}

function parseCookies(req) {
  const raw = req.headers.get('cookie') || '';
  return raw.split(';').reduce((acc, part) => {
    const trimmed = part.trim();
    if (!trimmed) return acc;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return acc;
    acc[trimmed.slice(0, idx)] = decodeURIComponent(trimmed.slice(idx + 1));
    return acc;
  }, {});
}

async function getSigningKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function signValue(value, secret) {
  const key = await getSigningKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return toBase64Url(new Uint8Array(sig));
}

async function decodeSessionToken(token, secret) {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = await signValue(body, secret);
  if (signature !== expected) return null;
  try {
    const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
    if (!decoded.exp || decoded.exp < Date.now()) return null;
    return decoded;
  } catch { return null; }
}

async function findUserById(base44, userId) {
  if (!userId) return null;
  return ((await base44.asServiceRole.entities.NexusUser.filter({ id: userId })) || [])[0] || null;
}

async function findUserByLoginName(base44, loginName) {
  const normalized = normalizeLoginName(loginName);
  if (!normalized) return null;
  const users = (await base44.asServiceRole.entities.NexusUser.list('-created_date', 500)) || [];
  const matches = users.filter((u) => resolveUserLoginName(u) === normalized);
  if (matches.length === 0) return null;
  matches.sort((a, b) => {
    const aExact = normalizeLoginName(String(a.login_name || a.username || '')) === normalized ? 1 : 0;
    const bExact = normalizeLoginName(String(b.login_name || b.username || '')) === normalized ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;
    const aActive = a.key_revoked === true ? 0 : 1;
    const bActive = b.key_revoked === true ? 0 : 1;
    if (aActive !== bActive) return bActive - aActive;
    return 0;
  });
  return matches[0] || null;
}

function toSessionResponse(user) {
  const isAdmin = isAdminUser(user);
  const loginName = resolveUserLoginName(user);
  const onboardingComplete = isOnboardingComplete(user);
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
      onboarding_complete: onboardingComplete,
      notifications_seen_at: user.notifications_seen_at || null,
      is_admin: isAdmin,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: sessionNoStoreHeaders() });
  }

  try {
    const secret = Deno.env.get('SESSION_SIGNING_SECRET');
    if (!secret) {
      return Response.json({ authenticated: false, error: 'not_configured' }, { status: 500, headers: sessionNoStoreHeaders() });
    }

    const cookies = parseCookies(req);
    const payload = await decodeSessionToken(cookies[SESSION_COOKIE_NAME], secret);
    if (!payload?.user_id) {
      return Response.json({ authenticated: false }, { status: 401, headers: sessionNoStoreHeaders() });
    }

    const base44 = createClientFromRequest(req);
    const user = await findUserById(base44, payload.user_id)
      || await findUserByLoginName(base44, payload.login_name);

    if (!user || user.key_revoked) {
      return Response.json({ authenticated: false }, { status: 401, headers: sessionNoStoreHeaders() });
    }

    // Auto-complete onboarding flag if consent was previously given
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
    console.error('[auth/session]', error);
    return Response.json({ authenticated: false, error: 'session_unavailable' }, { status: 500, headers: sessionNoStoreHeaders() });
  }
});