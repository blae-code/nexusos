/**
 * GET/POST /auth/keys — Admin key management (issue, revoke, regenerate, update rank).
 * Self-contained: no local imports (each function deploys independently).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const enc = new TextEncoder();
const SESSION_COOKIE_NAME = 'nexus_member_session';
const KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const VALID_RANKS = new Set(['PIONEER', 'FOUNDER', 'QUARTERMASTER', 'VOYAGER', 'SCOUT', 'VAGRANT', 'AFFILIATE']);
const NO_STORE = { 'Cache-Control': 'no-store' };

function toBase64Url(bytes) {
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}
function normalizeLoginName(v) { return String(v || '').trim().toLowerCase().replace(/[_\s]+/g, '-'); }
function normalizeCallsign(v) { return String(v || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '').slice(0, 40); }
function resolveUserLoginName(u) { return normalizeLoginName(String(u.login_name || u.username || u.callsign || '')); }
function resolvePersistedLoginName(u) { return normalizeLoginName(String(u.login_name || u.username || '')); }
function resolveUserCallsign(u) { return normalizeCallsign(String(u.callsign || u.login_name || u.username || 'NOMAD')); }
function isAdminUser(u) { return String(u.nexus_rank || '').toUpperCase() === 'PIONEER' || u.is_admin === true; }

function dedupeUsers(users) {
  const seen = new Set();
  return (users || []).filter((user) => {
    const id = String(user?.id || '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

async function safeFilterUsers(base44, filter) {
  try {
    return (await base44.asServiceRole.entities.NexusUser.filter(filter)) || [];
  } catch {
    return [];
  }
}

async function findExistingUser(base44, loginName, callsign) {
  const normalizedLoginName = normalizeLoginName(loginName);
  const normalizedCallsign = normalizeCallsign(callsign);

  const exactMatches = dedupeUsers([
    ...(normalizedLoginName ? await safeFilterUsers(base44, { login_name: normalizedLoginName }) : []),
    ...(normalizedLoginName ? await safeFilterUsers(base44, { username: normalizedLoginName }) : []),
    ...(normalizedCallsign ? await safeFilterUsers(base44, { callsign: normalizedCallsign }) : []),
  ]);

  if (exactMatches.length) {
    return exactMatches[0] || null;
  }

  const users = await base44.asServiceRole.entities.NexusUser.list('-created_date', 500);
  return (users || []).find((user) =>
    resolveUserLoginName(user) === normalizedLoginName
    || normalizeCallsign(user.callsign || '') === normalizedCallsign,
  ) || null;
}

function parseCookies(req) {
  const raw = req.headers.get('cookie') || '';
  return raw.split(';').reduce((acc, part) => {
    const t = part.trim(); if (!t) return acc;
    const i = t.indexOf('='); if (i === -1) return acc;
    acc[t.slice(0, i)] = decodeURIComponent(t.slice(i + 1)); return acc;
  }, {});
}

async function signValue(value, secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return toBase64Url(new Uint8Array(sig));
}

async function hashAuthKey(authKey, secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(authKey));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateAuthKey() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, b => KEY_CHARS[b % KEY_CHARS.length]).join('');
  return `RSN-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

function keyPrefixFromAuthKey(k) { return k.slice(0, 8); }

function serializeManagedUser(u) {
  return {
    id: u.id,
    login_name: resolveUserLoginName(u),
    username: resolveUserLoginName(u),
    callsign: resolveUserCallsign(u),
    nexus_rank: String(u.nexus_rank || 'AFFILIATE').toUpperCase(),
    key_prefix: u.key_prefix || null,
    key_issued_by: u.key_issued_by || null,
    key_issued_at: u.key_issued_at || null,
    key_revoked: u.key_revoked === true,
    joined_at: u.joined_at || null,
    onboarding_complete: u.onboarding_complete ?? false,
    last_seen_at: u.last_seen_at || null,
    notifications_seen_at: u.notifications_seen_at || null,
    is_admin: isAdminUser(u),
  };
}

async function requireAdmin(req, base44) {
  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) return null;
  const token = parseCookies(req)[SESSION_COOKIE_NAME];
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  if (sig !== await signValue(body, secret)) return null;
  try {
    const d = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
    if (!d.exp || d.exp < Date.now() || !d.user_id) return null;
    const users = await base44.asServiceRole.entities.NexusUser.filter({ id: d.user_id });
    const u = (users || [])[0];
    if (!u || u.key_revoked) return null;
    if (!isAdminUser(u)) return null;
    return u;
  } catch { return null; }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await requireAdmin(req, base44);
    if (!admin) {
      return Response.json({ error: 'forbidden' }, { status: 403, headers: NO_STORE });
    }

    const issuedByCallsign = resolveUserCallsign(admin);

    if (req.method === 'GET') {
      const users = await base44.asServiceRole.entities.NexusUser.list('-created_date', 500);
      const sorted = (users || []).sort((a, b) => {
        const at = new Date(a.key_issued_at || a.last_seen_at || a.joined_at || 0).getTime();
        const bt = new Date(b.key_issued_at || b.last_seen_at || b.joined_at || 0).getTime();
        return bt - at;
      });
      return Response.json({ users: sorted.map(serializeManagedUser) }, { headers: NO_STORE });
    }

    if (req.method !== 'POST') {
      return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: NO_STORE });
    }

    let body;
    try { body = await req.json(); } catch {
      return Response.json({ error: 'invalid_body' }, { status: 400, headers: NO_STORE });
    }

    const action = String(body?.action || '').trim().toLowerCase();
    const now = new Date().toISOString();
    const secret = Deno.env.get('SESSION_SIGNING_SECRET');

    if (action === 'issue') {
      const loginName = normalizeLoginName(body?.username || body?.login_name || body?.callsign);
      const callsign = normalizeCallsign(body?.callsign || body?.username || body?.login_name);
      const rank = String(body?.nexus_rank || '').trim().toUpperCase();

      if (!loginName || !callsign || !VALID_RANKS.has(rank)) {
        return Response.json({ error: 'invalid_issue_request' }, { status: 400, headers: NO_STORE });
      }

      const existing = await findExistingUser(base44, loginName, callsign);
      if (existing) {
        const loginTaken = resolveUserLoginName(existing) === loginName;
        const callsignTaken = normalizeCallsign(existing.callsign || '') === callsign;
        return Response.json({ error: loginTaken ? 'username_taken' : callsignTaken ? 'callsign_taken' : 'duplicate_user' }, { status: 409, headers: NO_STORE });
      }

      const authKey = generateAuthKey();
      const authKeyHash = await hashAuthKey(authKey, secret);
      const created = await base44.asServiceRole.entities.NexusUser.create({
        login_name: loginName, username: loginName, callsign,
        auth_key_hash: authKeyHash, key_prefix: keyPrefixFromAuthKey(authKey),
        nexus_rank: rank, key_issued_by: issuedByCallsign, key_issued_at: now,
        key_revoked: false, onboarding_complete: false, is_admin: rank === 'PIONEER',
      });

      return Response.json({
        key: authKey, key_prefix: keyPrefixFromAuthKey(authKey),
        user: created ? serializeManagedUser(created) : null,
      }, { headers: NO_STORE });
    }

    if (action === 'revoke') {
      const targetId = String(body?.user_id || '').trim();
      const targets = await base44.asServiceRole.entities.NexusUser.filter({ id: targetId });
      const target = (targets || [])[0];
      if (!target) return Response.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });

      await base44.asServiceRole.entities.NexusUser.update(target.id, {
        key_revoked: true, session_invalidated_at: now,
      });
      return Response.json({ ok: true }, { headers: NO_STORE });
    }

    if (action === 'regenerate') {
      const targetId = String(body?.user_id || '').trim();
      const targets = await base44.asServiceRole.entities.NexusUser.filter({ id: targetId });
      const target = (targets || [])[0];
      if (!target) return Response.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });

      const authKey = generateAuthKey();
      const authKeyHash = await hashAuthKey(authKey, secret);
      const loginName = normalizeLoginName(target.login_name || target.username || target.callsign);
      const callsign = normalizeCallsign(target.callsign || target.login_name || target.username);

      await base44.asServiceRole.entities.NexusUser.update(target.id, {
        login_name: loginName, username: loginName, callsign,
        auth_key_hash: authKeyHash, key_prefix: keyPrefixFromAuthKey(authKey),
        key_issued_by: issuedByCallsign, key_issued_at: now,
        key_revoked: false, session_invalidated_at: now,
        is_admin: isAdminUser(target),
      });

      const refreshed = await base44.asServiceRole.entities.NexusUser.filter({ id: target.id });
      return Response.json({
        key: authKey, key_prefix: keyPrefixFromAuthKey(authKey),
        user: (refreshed || [])[0] ? serializeManagedUser(refreshed[0]) : null,
      }, { headers: NO_STORE });
    }

    if (action === 'update_rank') {
      const rank = String(body?.nexus_rank || '').trim().toUpperCase();
      if (!VALID_RANKS.has(rank)) {
        return Response.json({ error: 'invalid_rank' }, { status: 400, headers: NO_STORE });
      }
      const targetId = String(body?.user_id || '').trim();
      const targets = await base44.asServiceRole.entities.NexusUser.filter({ id: targetId });
      const target = (targets || [])[0];
      if (!target) return Response.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });

      await base44.asServiceRole.entities.NexusUser.update(target.id, {
        nexus_rank: rank, is_admin: rank === 'PIONEER', session_invalidated_at: now,
      });

      const refreshed = await base44.asServiceRole.entities.NexusUser.filter({ id: target.id });
      return Response.json({
        ok: true,
        user: (refreshed || [])[0] ? serializeManagedUser(refreshed[0]) : null,
      }, { headers: NO_STORE });
    }

    return Response.json({ error: 'invalid_action' }, { status: 400, headers: NO_STORE });
  } catch (error) {
    console.error('[keys]', error);
    return Response.json({ error: 'internal_error' }, { status: 500, headers: NO_STORE });
  }
});
