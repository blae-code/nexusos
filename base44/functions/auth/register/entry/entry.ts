import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const enc = new TextEncoder();
const SESSION_COOKIE_NAME = 'nexus_member_session';
const BROWSER_SESSION_TTL_SECONDS = 60 * 60 * 24;
const REMEMBER_ME_TTL_SECONDS = 60 * 60 * 24 * 30;

function toBase64Url(bytes) {
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function normalizeLoginName(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeCallsign(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '').slice(0, 40);
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

function isSecure(req) {
  const appUrl = Deno.env.get('APP_URL') || '';
  return appUrl.startsWith('https://') || new URL(req.url).protocol === 'https:' || (req.headers.get('x-forwarded-proto') || '').includes('https');
}

function getCookieDomain(req) {
  const appUrl = Deno.env.get('APP_URL') || '';
  if (!appUrl) return null;
  try {
    const configuredHost = new URL(appUrl).hostname.replace(/^www\./, '').toLowerCase();
    const forwardedHost = (req.headers.get('x-forwarded-host') || '').split(',')[0]?.trim();
    const hostHeader = (req.headers.get('host') || '').split(',')[0]?.trim();
    const requestHost = (forwardedHost || hostHeader || new URL(req.url).hostname || '').split(':')[0].replace(/^www\./, '').toLowerCase();
    if (requestHost === configuredHost || requestHost.endsWith(`.${configuredHost}`)) return configuredHost;
    return null;
  } catch { return null; }
}

async function getSigningKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function signValue(value, secret) {
  const key = await getSigningKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return toBase64Url(new Uint8Array(sig));
}

async function hashAuthKey(authKey, secret) {
  const key = await getSigningKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(authKey));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function listNexusUsers(base44) {
  return (await base44.asServiceRole.entities.NexusUser.list('-created_date', 500)) || [];
}

async function findUserByLoginName(base44, loginName) {
  const normalized = normalizeLoginName(loginName);
  if (!normalized) return null;
  const users = await listNexusUsers(base44);
  const matches = users.filter((c) => resolveUserLoginName(c) === normalized);
  if (matches.length === 0) return null;
  matches.sort((left, right) => {
    const le = normalizeLoginName(String(left.login_name || left.username || '')) === normalized ? 1 : 0;
    const re = normalizeLoginName(String(right.login_name || right.username || '')) === normalized ? 1 : 0;
    if (le !== re) return re - le;
    const la = left.key_revoked === true ? 0 : 1;
    const ra = right.key_revoked === true ? 0 : 1;
    if (la !== ra) return ra - la;
    return new Date(right.key_issued_at || right.updated_date || 0).getTime() - new Date(left.key_issued_at || left.updated_date || 0).getTime();
  });
  return matches[0] || null;
}

function appendSessionCookie(headers, token, req, rememberMe) {
  const parts = [`${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`, 'Path=/', 'SameSite=Lax', 'HttpOnly'];
  const domain = getCookieDomain(req);
  if (domain) parts.push(`Domain=.${domain}`);
  if (isSecure(req)) parts.push('Secure');
  if (rememberMe) parts.push(`Max-Age=${REMEMBER_ME_TTL_SECONDS}`);
  headers.append('Set-Cookie', parts.join('; '));
}

async function createSessionToken(user, secret, rememberMe) {
  const now = Date.now();
  const ttl = rememberMe ? REMEMBER_ME_TTL_SECONDS : BROWSER_SESSION_TTL_SECONDS;
  const payload = { user_id: user.id, login_name: resolveUserLoginName(user), is_admin: isAdminUser(user), iat: now, exp: now + ttl * 1000 };
  const body = toBase64Url(enc.encode(JSON.stringify(payload)));
  const sig = await signValue(body, secret);
  return `${body}.${sig}`;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: { 'Cache-Control': 'no-store' } });
  }

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const username = normalizeLoginName(body?.username || body?.login_name || body?.callsign);
  const authKey = String(body?.key || '').trim();
  const rememberMe = body?.remember_me === true;

  if (!username || !authKey) {
    return Response.json({ error: 'invalid_key' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const secret = Deno.env.get('SESSION_SIGNING_SECRET');
    if (!secret) throw new Error('SESSION_SIGNING_SECRET not configured');

    const base44 = createClientFromRequest(req);
    const user = await findUserByLoginName(base44, username);

    if (!user) return Response.json({ error: 'invalid_key' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    if (user.key_revoked) return Response.json({ error: 'key_revoked' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    if (!user.auth_key_hash) return Response.json({ error: 'invalid_key' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });

    const presentedHash = await hashAuthKey(authKey, secret);
    if (presentedHash !== user.auth_key_hash) {
      return Response.json({ error: 'invalid_key' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    const now = new Date().toISOString();
    const firstLogin = !user.joined_at;
    const nextCallsign = resolveUserCallsign(user);
    const loginName = user.login_name || username;
    const admin = isAdminUser(user);

    await base44.asServiceRole.entities.NexusUser.update(user.id, {
      login_name: loginName, username: loginName, callsign: nextCallsign,
      joined_at: user.joined_at || now, last_seen_at: now, is_admin: admin, key_revoked: false,
    });

    const nextUser = { ...user, login_name: loginName, callsign: nextCallsign, joined_at: user.joined_at || now, last_seen_at: now, is_admin: admin };

    const token = await createSessionToken(nextUser, secret, rememberMe);
    const headers = new Headers({ 'Cache-Control': 'no-store' });
    appendSessionCookie(headers, token, req, rememberMe);

    return Response.json({
      success: true, isNew: firstLogin,
      onboarding_complete: nextUser.onboarding_complete ?? false,
      nexus_rank: nextUser.nexus_rank || 'AFFILIATE',
      is_admin: admin, login_name: loginName, username: loginName, callsign: nextCallsign,
    }, { headers });
  } catch (error) {
    console.error('[auth/register]', error);
    return Response.json({ error: 'registration_failed' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
});