/**
 * POST /auth/bootstrap — SYSTEM-ADMIN repair and recovery.
 * Self-contained: all auth helpers inlined.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const enc = new TextEncoder();
const SESSION_COOKIE_NAME = 'nexus_member_session';
const KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SYSTEM_ADMIN_CALLSIGN = 'SYSTEM-ADMIN';
const SYSTEM_ADMIN_LOGIN = 'system-admin';

function toBase64Url(bytes) {
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function normalizeLoginName(value) { return String(value || '').trim().toLowerCase(); }
function isAdminUser(user) { return String(user.nexus_rank || '').toUpperCase() === 'PIONEER' || user.is_admin === true; }
function sessionNoStoreHeaders() { return { 'Cache-Control': 'no-store' }; }
function resolveUserCallsign(user) {
  return String(user.callsign || user.login_name || user.username || 'NOMAD').trim().toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

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

async function hmacHash(key, secret) {
  const cryptoKey = await getSigningKey(secret);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(key));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateKey() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => KEY_CHARS[b % KEY_CHARS.length]).join('');
  return `RSN-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

async function findUserById(base44, userId) {
  if (!userId) return null;
  return ((await base44.asServiceRole.entities.NexusUser.filter({ id: userId })) || [])[0] || null;
}

async function findUserByLoginName(base44, loginName) {
  const normalized = normalizeLoginName(loginName);
  if (!normalized) return null;
  const users = (await base44.asServiceRole.entities.NexusUser.list('-created_date', 500)) || [];
  return users.filter((u) => normalizeLoginName(String(u.login_name || u.username || u.callsign || '')) === normalized)[0] || null;
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
  const inv = user.session_invalidated_at ? new Date(user.session_invalidated_at).getTime() : 0;
  if (inv && inv > payload.iat) return null;
  return { user };
}

function readBodyField(body, ...keys) {
  for (const key of keys) { const v = body?.[key]; if (typeof v === 'string' && v.trim()) return v.trim(); }
  return '';
}

function readBodyFlag(body, ...keys) {
  for (const key of keys) { const v = body?.[key]; if (v === true || v === 'true' || v === 1 || v === '1') return true; }
  return false;
}

function matchesSystemAdmin(c) {
  return normalizeLoginName(c?.login_name || c?.username || '') === SYSTEM_ADMIN_LOGIN
    || String(c?.callsign || '').trim().toUpperCase() === SYSTEM_ADMIN_CALLSIGN;
}

function pickCanonicalAdmin(candidates) {
  return [...(candidates || [])].sort((a, b) => {
    const aH = a?.auth_key_hash ? 1 : 0; const bH = b?.auth_key_hash ? 1 : 0;
    if (aH !== bH) return bH - aH;
    const aA = a?.key_revoked === true ? 0 : 1; const bA = b?.key_revoked === true ? 0 : 1;
    if (aA !== bA) return bA - aA;
    return new Date(b?.key_issued_at || b?.created_date || 0).getTime() - new Date(a?.key_issued_at || a?.created_date || 0).getTime();
  })[0] || null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: sessionNoStoreHeaders() });
  }

  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) return Response.json({ error: 'SESSION_SIGNING_SECRET not configured' }, { status: 500, headers: sessionNoStoreHeaders() });

  let body = {};
  try { body = await req.json(); } catch { body = {}; }

  const recoveryToken = readBodyField(body, 'recovery_token', 'recoveryToken', 'bootstrap_token', 'bootstrapToken');
  const recoverySecret = String(Deno.env.get('SYSTEM_ADMIN_BOOTSTRAP_SECRET') || '').trim();
  const isRecoveryRequest = Boolean(recoveryToken);
  const recoveryAuthorized = Boolean(recoverySecret) && recoveryToken === recoverySecret;
  const resetRequested = readBodyFlag(body, 'reset', 'force_reset', 'hard_reset');
  const adminSession = await requireAdminSession(req);

  if (!adminSession && !recoveryAuthorized) {
    return Response.json({
      error: 'bootstrap_locked',
      message: 'System Admin bootstrap requires Pioneer clearance or the configured recovery token.',
      recovery_enabled: Boolean(recoverySecret),
      login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN,
    }, { status: 403, headers: sessionNoStoreHeaders() });
  }

  const base44 = createClientFromRequest(req);
  const allUsers = await base44.asServiceRole.entities.NexusUser.list('-created_date', 500);
  const matchingAdmins = (allUsers || []).filter(matchesSystemAdmin);
  let admin = pickCanonicalAdmin(matchingAdmins);
  const now = new Date().toISOString();

  if (resetRequested && !recoveryAuthorized) {
    return Response.json({ error: 'invalid_recovery_token', message: 'Hard reset requires the recovery token.', login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN }, { status: 403, headers: sessionNoStoreHeaders() });
  }

  if (resetRequested) {
    for (const c of matchingAdmins) await base44.asServiceRole.entities.NexusUser.delete(c.id);
    admin = null;
  }

  if (!admin) {
    admin = await base44.asServiceRole.entities.NexusUser.create({
      login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN,
      full_name: 'System Admin', nexus_rank: 'PIONEER', is_admin: true,
      key_revoked: false, onboarding_complete: true, joined_at: now, last_seen_at: now, ai_features_enabled: true,
    });
  } else {
    await base44.asServiceRole.entities.NexusUser.update(admin.id, {
      login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN,
      full_name: admin.full_name || 'System Admin', nexus_rank: 'PIONEER', is_admin: true,
      key_revoked: false, onboarding_complete: true,
      joined_at: admin.joined_at || now, last_seen_at: admin.last_seen_at || now,
      ai_features_enabled: admin.ai_features_enabled ?? true,
    });
  }

  if (admin.auth_key_hash) {
    if (isRecoveryRequest && !recoveryAuthorized) {
      return Response.json({ error: 'invalid_recovery_token', message: 'The recovery token was rejected.', login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN }, { status: 403, headers: sessionNoStoreHeaders() });
    }
    if (!recoveryAuthorized && !adminSession) {
      return Response.json({
        error: 'already_bootstrapped', message: 'Bootstrap already completed.',
        login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN,
        recovery_enabled: Boolean(recoverySecret), duplicates_detected: matchingAdmins.length > 1,
      }, { headers: sessionNoStoreHeaders() });
    }
    await base44.asServiceRole.entities.NexusUser.update(admin.id, { key_revoked: false, session_invalidated_at: now, revoked_at: null });
  }

  const plainKey = generateKey();
  const hash = await hmacHash(plainKey, secret);
  await base44.asServiceRole.entities.NexusUser.update(admin.id, {
    login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN,
    full_name: admin.full_name || 'System Admin',
    auth_key_hash: hash, key_prefix: plainKey.slice(0, 8),
    key_issued_by: SYSTEM_ADMIN_CALLSIGN, key_issued_at: now,
    is_admin: true, nexus_rank: 'PIONEER', key_revoked: false, onboarding_complete: true,
    joined_at: admin.joined_at || now, last_seen_at: now,
    ai_features_enabled: admin.ai_features_enabled ?? true,
    session_invalidated_at: now, revoked_at: null,
  });

  return Response.json({
    success: true, recovered: recoveryAuthorized, reset: resetRequested,
    login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN, key: plainKey,
  }, { headers: sessionNoStoreHeaders() });
});