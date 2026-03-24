/**
 * POST /auth/login — Issued username + auth key login.
 * Self-contained: all auth helpers inlined to avoid cross-file imports.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const enc = new TextEncoder();
const SESSION_COOKIE_NAME = 'nexus_member_session';
const BROWSER_SESSION_TTL_SECONDS = 60 * 60 * 24;
const REMEMBER_ME_TTL_SECONDS = 60 * 60 * 24 * 30;

function toBase64Url(bytes) {
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
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

async function getSigningKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function signValue(value, secret) {
  const key = await getSigningKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return toBase64Url(new Uint8Array(sig));
}

function getSessionSigningSecret() {
  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) throw new Error('SESSION_SIGNING_SECRET not configured');
  return secret;
}

async function hashAuthKey(authKey, secret) {
  const key = await getSigningKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(authKey));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function createSessionToken(user, secret, rememberMe) {
  const now = Date.now();
  const ttl = rememberMe ? REMEMBER_ME_TTL_SECONDS : BROWSER_SESSION_TTL_SECONDS;
  const payload = {
    user_id: user.id,
    login_name: resolveUserLoginName(user),
    is_admin: isAdminUser(user),
    iat: now,
    exp: now + ttl * 1000,
  };
  const body = toBase64Url(enc.encode(JSON.stringify(payload)));
  const signature = await signValue(body, secret);
  return `${body}.${signature}`;
}

function isSecure(req) {
  const appUrl = Deno.env.get('APP_URL') || '';
  return appUrl.startsWith('https://')
    || new URL(req.url).protocol === 'https:'
    || (req.headers.get('x-forwarded-proto') || '').includes('https');
}

function getRequestHostname(req) {
  const fh = (req.headers.get('x-forwarded-host') || '').split(',')[0]?.trim();
  const hh = (req.headers.get('host') || '').split(',')[0]?.trim();
  const raw = fh || hh || new URL(req.url).hostname || '';
  return raw.split(':')[0].replace(/^www\./, '').toLowerCase();
}

function getCookieDomain(req) {
  const appUrl = Deno.env.get('APP_URL') || '';
  if (!appUrl) return null;
  try {
    const configured = new URL(appUrl).hostname.replace(/^www\./, '').toLowerCase();
    const requestHost = getRequestHostname(req);
    if (!configured || !requestHost) return null;
    if (requestHost === configured || requestHost.endsWith(`.${configured}`)) return configured;
    return null;
  } catch { return null; }
}

function appendSessionCookie(headers, token, req, rememberMe) {
  const parts = [`${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`, 'Path=/', 'SameSite=Lax', 'HttpOnly'];
  const domain = getCookieDomain(req);
  if (domain) parts.push(`Domain=.${domain}`);
  if (isSecure(req)) parts.push('Secure');
  if (rememberMe) parts.push(`Max-Age=${REMEMBER_ME_TTL_SECONDS}`);
  headers.append('Set-Cookie', parts.join('; '));
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
    const aHash = a.auth_key_hash ? 1 : 0;
    const bHash = b.auth_key_hash ? 1 : 0;
    if (aHash !== bHash) return bHash - aHash;
    const aTime = new Date(a.key_issued_at || a.updated_date || a.created_date || 0).getTime();
    const bTime = new Date(b.key_issued_at || b.updated_date || b.created_date || 0).getTime();
    return bTime - aTime;
  });

  return matches[0] || null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: sessionNoStoreHeaders() });
  }

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400, headers: sessionNoStoreHeaders() });
  }

  const username = normalizeLoginName(body?.username || body?.login_name || body?.callsign);
  const authKey = String(body?.key || '').trim();
  const rememberMe = body?.remember_me === true;

  if (!username || !authKey) {
    return Response.json({ error: 'invalid_credentials' }, { status: 400, headers: sessionNoStoreHeaders() });
  }

  try {
    const secret = getSessionSigningSecret();
    const base44 = createClientFromRequest(req);
    const user = await findUserByLoginName(base44, username);

    if (!user) {
      return Response.json({ error: 'invalid_credentials' }, { status: 401, headers: sessionNoStoreHeaders() });
    }

    if (user.key_revoked) {
      return Response.json({ error: 'key_revoked' }, { status: 403, headers: sessionNoStoreHeaders() });
    }

    if (!user.auth_key_hash) {
      return Response.json({ error: 'invalid_credentials' }, { status: 401, headers: sessionNoStoreHeaders() });
    }

    const presentedHash = await hashAuthKey(authKey, secret);
    if (presentedHash !== user.auth_key_hash) {
      return Response.json({ error: 'invalid_credentials' }, { status: 401, headers: sessionNoStoreHeaders() });
    }

    const now = new Date().toISOString();
    const firstLogin = !user.joined_at;
    const nextCallsign = resolveUserCallsign(user);
    const loginName = user.login_name || username;
    const isAdmin = isAdminUser(user);
    const onboardingComplete = isOnboardingComplete(user);

    await base44.asServiceRole.entities.NexusUser.update(user.id, {
      login_name: loginName,
      username: loginName,
      callsign: nextCallsign,
      joined_at: user.joined_at || now,
      last_seen_at: now,
      is_admin: isAdmin,
      key_revoked: false,
      ...(onboardingComplete ? { onboarding_complete: true } : {}),
    });

    const nextUser = {
      ...user,
      login_name: loginName,
      callsign: nextCallsign,
      joined_at: user.joined_at || now,
      last_seen_at: now,
      is_admin: isAdmin,
      onboarding_complete: onboardingComplete,
    };

    const token = await createSessionToken(nextUser, secret, rememberMe);
    const headers = new Headers(sessionNoStoreHeaders());
    appendSessionCookie(headers, token, req, rememberMe);

    return Response.json({
      success: true,
      isNew: firstLogin,
      onboarding_complete: onboardingComplete,
      nexus_rank: nextUser.nexus_rank || 'AFFILIATE',
      is_admin: isAdmin,
      login_name: loginName,
      username: loginName,
      callsign: nextCallsign,
    }, { headers });
  } catch (error) {
    console.error('Error data:', JSON.stringify(error?.response?.data || error?.data || null, null, 2));
    console.error('[auth/login]', error?.message || error);
    return Response.json({ error: 'login_failed' }, { status: 500, headers: sessionNoStoreHeaders() });
  }
});