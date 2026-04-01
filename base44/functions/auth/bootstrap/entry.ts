/**
 * POST /auth/bootstrap — SYSTEM-ADMIN repair and recovery.
 * Self-contained: no local imports.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const enc = new TextEncoder();
const SESSION_COOKIE_NAME = 'nexus_member_session';
const KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const NO_STORE = { 'Cache-Control': 'no-store' };
const SYSTEM_ADMIN_CALLSIGN = 'SYSTEM-ADMIN';
const SYSTEM_ADMIN_LOGIN = 'system-admin';

function toBase64Url(bytes) {
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}
function normalizeLoginName(v) { return String(v || '').trim().toLowerCase().replace(/[_\s]+/g, '-'); }
function isAdminUser(u) { return String(u.nexus_rank || '').toUpperCase() === 'PIONEER' || u.is_admin === true; }

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
function parseSecretList(value) {
  return String(value || '').split(/[\n,]/).map((entry) => entry.trim()).filter(Boolean);
}
function dedupeSecrets(secrets) {
  const seen = new Set();
  return (secrets || []).filter((secret) => {
    if (!secret || seen.has(secret)) return false;
    seen.add(secret);
    return true;
  });
}
function getAuthKeyPrimarySecret() {
  const explicitSecret = String(Deno.env.get('AUTH_KEY_HASH_SECRET') || '').trim();
  const sessionSecret = String(Deno.env.get('SESSION_SIGNING_SECRET') || '').trim();
  const primary = explicitSecret || sessionSecret;
  if (!primary) throw new Error('AUTH_KEY_HASH_SECRET or SESSION_SIGNING_SECRET not configured');
  dedupeSecrets([
    ...(explicitSecret && sessionSecret && explicitSecret !== sessionSecret ? [sessionSecret] : []),
    ...parseSecretList(Deno.env.get('AUTH_KEY_HASH_FALLBACK_SECRETS')),
  ]);
  return primary;
}
function generateAuthKey() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, b => KEY_CHARS[b % KEY_CHARS.length]).join('');
  return `RSN-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}
function keyPrefixFromAuthKey(k) { return k.slice(0, 8); }

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
    if (!u || u.key_revoked || !isAdminUser(u)) return null;
    return u;
  } catch { return null; }
}

function readBodyField(body, ...keys) {
  for (const k of keys) { const v = body?.[k]; if (typeof v === 'string' && v.trim()) return v.trim(); }
  return '';
}
function readBodyFlag(body, ...keys) {
  for (const k of keys) { const v = body?.[k]; if (v === true || v === 'true' || v === 1 || v === '1') return true; }
  return false;
}
function matchesSystemAdmin(c) {
  return normalizeLoginName(c?.login_name || c?.username || '') === SYSTEM_ADMIN_LOGIN
    || String(c?.callsign || '').trim().toUpperCase() === SYSTEM_ADMIN_CALLSIGN;
}
function pickCanonicalAdmin(candidates) {
  return [...(candidates || [])].sort((a, b) => {
    const ah = a?.auth_key_hash ? 1 : 0, bh = b?.auth_key_hash ? 1 : 0;
    if (ah !== bh) return bh - ah;
    const aa = a?.key_revoked === true ? 0 : 1, ba = b?.key_revoked === true ? 0 : 1;
    if (aa !== ba) return ba - aa;
    return new Date(b?.key_issued_at || b?.created_date || 0).getTime() - new Date(a?.key_issued_at || a?.created_date || 0).getTime();
  })[0] || null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: NO_STORE });
  }

  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) return Response.json({ error: 'session_secret_missing' }, { status: 500, headers: NO_STORE });
  const authKeySecret = getAuthKeyPrimarySecret();

  let body = {};
  try { body = await req.json(); } catch { body = {}; }

  const base44 = createClientFromRequest(req);
  const recoveryToken = readBodyField(body, 'recovery_token', 'recoveryToken', 'bootstrap_token', 'bootstrapToken');
  const recoverySecret = String(Deno.env.get('SYSTEM_ADMIN_BOOTSTRAP_SECRET') || '').trim();
  const recoveryAuthorized = Boolean(recoverySecret) && recoveryToken === recoverySecret;
  const resetRequested = readBodyFlag(body, 'reset', 'force_reset', 'hard_reset');
  const adminSession = await requireAdmin(req, base44);

  // --- fix-user-rank action ---
  const action = readBodyField(body, 'action');
  if (action === 'fix-user-rank') {
    if (!adminSession && !recoveryAuthorized) {
      return Response.json({ error: 'forbidden' }, { status: 403, headers: NO_STORE });
    }
    const target = readBodyField(body, 'target');
    if (target === 'BLAE') {
      const allUsers = await base44.asServiceRole.entities.NexusUser.list('-created_date', 500);
      const blae = (allUsers || []).find(u => String(u.callsign || '').toUpperCase() === 'BLAE');
      if (!blae) {
        return Response.json({ error: 'user_not_found', target }, { status: 404, headers: NO_STORE });
      }
      await base44.asServiceRole.entities.NexusUser.update(blae.id, {
        is_admin: false,
        nexus_rank: 'VOYAGER',
      });
      return Response.json({ success: true, callsign: 'BLAE', nexus_rank: 'VOYAGER', is_admin: false }, { headers: NO_STORE });
    }
    return Response.json({ error: 'unknown_target', target }, { status: 400, headers: NO_STORE });
  }

  if (!adminSession && !recoveryAuthorized) {
    return Response.json({
      error: 'bootstrap_locked',
      message: 'System Admin bootstrap requires Pioneer clearance or the configured recovery token.',
      recovery_enabled: Boolean(recoverySecret),
      login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN,
    }, { status: 403, headers: NO_STORE });
  }

  const allUsers = await base44.asServiceRole.entities.NexusUser.list('-created_date', 500);
  const matchingAdmins = (allUsers || []).filter(matchesSystemAdmin);
  let admin = pickCanonicalAdmin(matchingAdmins);
  const now = new Date().toISOString();

  if (resetRequested && !recoveryAuthorized) {
    return Response.json({ error: 'invalid_recovery_token', message: 'Hard reset requires the recovery token.',
      login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN,
    }, { status: 403, headers: NO_STORE });
  }

  if (resetRequested) {
    for (const c of matchingAdmins) { await base44.asServiceRole.entities.NexusUser.delete(c.id); }
    admin = null;
  }

  if (!admin) {
    admin = await base44.asServiceRole.entities.NexusUser.create({
      login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN,
      full_name: 'System Admin', nexus_rank: 'PIONEER', is_admin: true, key_revoked: false,
      onboarding_complete: true, joined_at: now, last_seen_at: now, ai_features_enabled: true,
    });
  } else {
    await base44.asServiceRole.entities.NexusUser.update(admin.id, {
      login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN,
      nexus_rank: 'PIONEER', is_admin: true, key_revoked: false, onboarding_complete: true,
      joined_at: admin.joined_at || now, last_seen_at: admin.last_seen_at || now,
    });
  }

  if (admin.auth_key_hash && !recoveryAuthorized && !adminSession) {
    return Response.json({
      error: 'already_bootstrapped', message: 'Bootstrap already completed.',
      login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN,
      recovery_enabled: Boolean(recoverySecret), duplicates_detected: matchingAdmins.length > 1,
    }, { headers: NO_STORE });
  }

  if (admin.auth_key_hash) {
    await base44.asServiceRole.entities.NexusUser.update(admin.id, {
      key_revoked: false, session_invalidated_at: now, revoked_at: null,
    });
  }

  const plainKey = generateAuthKey();
  const hash = await hashAuthKey(plainKey, authKeySecret);
  await base44.asServiceRole.entities.NexusUser.update(admin.id, {
    login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN,
    auth_key_hash: hash, key_prefix: keyPrefixFromAuthKey(plainKey),
    key_issued_by: SYSTEM_ADMIN_CALLSIGN, key_issued_at: now,
    is_admin: true, nexus_rank: 'PIONEER', key_revoked: false, onboarding_complete: true,
    joined_at: admin.joined_at || now, last_seen_at: now,
    session_invalidated_at: now, revoked_at: null,
  });

  return Response.json({
    success: true, recovered: recoveryAuthorized, reset: resetRequested,
    login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN,
    key: plainKey,
  }, { headers: NO_STORE });
});
