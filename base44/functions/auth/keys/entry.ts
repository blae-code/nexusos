/**
 * GET/POST /auth/keys — Admin key management (issue, revoke, regenerate, update rank).
 * Self-contained: all auth helpers inlined.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const enc = new TextEncoder();
const SESSION_COOKIE_NAME = 'nexus_member_session';
const KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const VALID_RANKS = new Set(['PIONEER', 'FOUNDER', 'VOYAGER', 'SCOUT', 'VAGRANT', 'AFFILIATE']);

function toBase64Url(bytes) {
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function normalizeLoginName(value) { return String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '-'); }
function normalizeCallsign(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}
function resolveUserLoginName(user) { return normalizeLoginName(String(user.login_name || user.username || user.callsign || '')); }
function resolveUserCallsign(user) { return normalizeCallsign(String(user.callsign || user.login_name || user.username || 'NOMAD')); }
function isAdminUser(user) { return String(user.nexus_rank || '').toUpperCase() === 'PIONEER' || user.is_admin === true; }
function isOnboardingComplete(user) { return user.onboarding_complete === true || user.consent_given === true || Boolean(user.consent_timestamp); }
function sessionNoStoreHeaders() { return { 'Cache-Control': 'no-store' }; }

function parseCookies(req) {
  const raw = req.headers.get('cookie') || '';
  return raw.split(';').reduce((acc, part) => {
    const t = part.trim(); if (!t) return acc;
    const idx = t.indexOf('='); if (idx === -1) return acc;
    acc[t.slice(0, idx)] = decodeURIComponent(t.slice(idx + 1)); return acc;
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

async function hashAuthKey(authKey, secret) {
  const key = await getSigningKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(authKey));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateAuthKey() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => KEY_CHARS[b % KEY_CHARS.length]).join('');
  return `RSN-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

function keyPrefixFromAuthKey(authKey) { return authKey.slice(0, 8); }

async function listNexusUsers(base44) {
  return (await base44.asServiceRole.entities.NexusUser.list('-created_date', 500)) || [];
}

async function findUserById(base44, userId) {
  if (!userId) return null;
  return ((await base44.asServiceRole.entities.NexusUser.filter({ id: userId })) || [])[0] || null;
}

async function findUserByLoginName(base44, loginName) {
  const normalized = normalizeLoginName(loginName);
  if (!normalized) return null;
  const users = await listNexusUsers(base44);
  return users.filter((u) => resolveUserLoginName(u) === normalized)
    .sort((a, b) => {
      const aE = normalizeLoginName(String(a.login_name || a.username || '')) === normalized ? 1 : 0;
      const bE = normalizeLoginName(String(b.login_name || b.username || '')) === normalized ? 1 : 0;
      if (aE !== bE) return bE - aE;
      return 0;
    })[0] || null;
}

function serializeManagedUser(user) {
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

async function requireAdminSession(req) {
  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) return null;
  const cookies = parseCookies(req);
  const payload = await decodeSessionToken(cookies[SESSION_COOKIE_NAME], secret);
  if (!payload?.user_id) return null;
  const base44 = createClientFromRequest(req);
  const user = await findUserById(base44, payload.user_id) || await findUserByLoginName(base44, payload.login_name);
  if (!user || user.key_revoked || !isAdminUser(user)) return null;
  const invalidatedAt = user.session_invalidated_at ? new Date(user.session_invalidated_at).getTime() : 0;
  if (invalidatedAt && invalidatedAt > payload.iat) return null;
  return { user };
}

Deno.serve(async (req) => {
  const adminSession = await requireAdminSession(req);
  if (!adminSession) {
    return Response.json({ error: 'forbidden' }, { status: 403, headers: sessionNoStoreHeaders() });
  }

  const base44 = createClientFromRequest(req);
  const issuedByCallsign = resolveUserCallsign(adminSession.user);

  if (req.method === 'GET') {
    const users = await listNexusUsers(base44);
    const sorted = users.sort((a, b) => {
      const aT = new Date(a.key_issued_at || a.last_seen_at || a.joined_at || 0).getTime();
      const bT = new Date(b.key_issued_at || b.last_seen_at || b.joined_at || 0).getTime();
      return bT - aT;
    });
    return Response.json({ users: sorted.map(serializeManagedUser) }, { headers: sessionNoStoreHeaders() });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: sessionNoStoreHeaders() });
  }

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400, headers: sessionNoStoreHeaders() });
  }

  const action = String(body?.action || '').trim().toLowerCase();
  const now = new Date().toISOString();

  if (action === 'issue') {
    const loginName = normalizeLoginName(body?.username || body?.login_name || body?.callsign);
    const callsign = normalizeCallsign(body?.callsign || body?.username || body?.login_name);
    const rank = String(body?.nexus_rank || '').trim().toUpperCase();

    if (!loginName || !callsign || !VALID_RANKS.has(rank)) {
      return Response.json({ error: 'invalid_issue_request' }, { status: 400, headers: sessionNoStoreHeaders() });
    }

    const users = await listNexusUsers(base44);
    if (users.some((c) => normalizeLoginName(c.login_name || c.username || c.callsign) === loginName)) {
      return Response.json({ error: 'username_taken' }, { status: 409, headers: sessionNoStoreHeaders() });
    }
    if (users.some((c) => normalizeCallsign(c.callsign || '') === callsign)) {
      return Response.json({ error: 'callsign_taken' }, { status: 409, headers: sessionNoStoreHeaders() });
    }

    const secret = Deno.env.get('SESSION_SIGNING_SECRET');
    const authKey = generateAuthKey();
    const authKeyHash = await hashAuthKey(authKey, secret);
    const created = await base44.asServiceRole.entities.NexusUser.create({
      login_name: loginName, username: loginName, callsign,
      auth_key_hash: authKeyHash, key_prefix: keyPrefixFromAuthKey(authKey),
      nexus_rank: rank, key_issued_by: issuedByCallsign, key_issued_at: now,
      key_revoked: false, onboarding_complete: false, is_admin: rank === 'PIONEER',
    });
    return Response.json({ key: authKey, key_prefix: keyPrefixFromAuthKey(authKey), user: serializeManagedUser(created) }, { headers: sessionNoStoreHeaders() });
  }

  if (action === 'revoke') {
    const target = await findUserById(base44, String(body?.user_id || '').trim());
    if (!target) return Response.json({ error: 'not_found' }, { status: 404, headers: sessionNoStoreHeaders() });
    await base44.asServiceRole.entities.NexusUser.update(target.id, { key_revoked: true, revoked_at: now, session_invalidated_at: now });
    return Response.json({ ok: true }, { headers: sessionNoStoreHeaders() });
  }

  if (action === 'regenerate') {
    const target = await findUserById(base44, String(body?.user_id || '').trim());
    if (!target) return Response.json({ error: 'not_found' }, { status: 404, headers: sessionNoStoreHeaders() });
    const secret = Deno.env.get('SESSION_SIGNING_SECRET');
    const authKey = generateAuthKey();
    const authKeyHash = await hashAuthKey(authKey, secret);
    await base44.asServiceRole.entities.NexusUser.update(target.id, {
      login_name: normalizeLoginName(target.login_name || target.username || target.callsign),
      username: normalizeLoginName(target.login_name || target.username || target.callsign),
      auth_key_hash: authKeyHash, key_prefix: keyPrefixFromAuthKey(authKey),
      key_issued_by: issuedByCallsign, key_issued_at: now,
      key_revoked: false, session_invalidated_at: now, revoked_at: null,
    });
    const refreshed = await findUserById(base44, target.id);
    return Response.json({ key: authKey, key_prefix: keyPrefixFromAuthKey(authKey), user: refreshed ? serializeManagedUser(refreshed) : null }, { headers: sessionNoStoreHeaders() });
  }

  if (action === 'update_rank') {
    const rank = String(body?.nexus_rank || '').trim().toUpperCase();
    if (!VALID_RANKS.has(rank)) return Response.json({ error: 'invalid_rank' }, { status: 400, headers: sessionNoStoreHeaders() });
    const target = await findUserById(base44, String(body?.user_id || '').trim());
    if (!target) return Response.json({ error: 'not_found' }, { status: 404, headers: sessionNoStoreHeaders() });
    await base44.asServiceRole.entities.NexusUser.update(target.id, { nexus_rank: rank, is_admin: rank === 'PIONEER', session_invalidated_at: now });
    const refreshed = await findUserById(base44, target.id);
    return Response.json({ ok: true, user: refreshed ? serializeManagedUser(refreshed) : null }, { headers: sessionNoStoreHeaders() });
  }

  return Response.json({ error: 'invalid_action' }, { status: 400, headers: sessionNoStoreHeaders() });
});