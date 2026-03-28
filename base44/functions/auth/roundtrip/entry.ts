/**
 * POST /auth/roundtrip — Admin-only auth schema/persistence diagnostic.
 * Self-contained: no local imports.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const enc = new TextEncoder();
const SESSION_COOKIE_NAME = 'nexus_member_session';
const KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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

const AUTH_CRITICAL_FIELDS = [
  'login_name','username','callsign','nexus_rank','auth_key_hash','key_prefix',
  'key_issued_at','key_revoked','session_invalidated_at','onboarding_complete',
  'consent_given','consent_timestamp','is_admin',
];

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: NO_STORE });
  }

  const base44 = createClientFromRequest(req);
  const admin = await requireAdmin(req, base44);
  if (!admin) {
    return Response.json({ error: 'forbidden' }, { status: 403, headers: NO_STORE });
  }

  const secretPresent = Boolean(Deno.env.get('SESSION_SIGNING_SECRET')?.trim());
  if (!secretPresent) {
    return Response.json({ ok: false, secret_present: false, create_ok: false, readback_ok: false, hash_match_ok: false, cleanup_ok: false, details: {} }, { headers: NO_STORE });
  }

  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  const now = new Date().toISOString();
  const suffix = crypto.randomUUID().slice(0, 8);
  const loginName = `diag-${suffix}`;
  const callsign = `DIAG-${suffix}`.toUpperCase();
  const plainKey = generateAuthKey();
  const authKeyHash = await hashAuthKey(plainKey, secret);

  let created = null;
  let createOk = false, readbackOk = false, hashMatchOk = false, cleanupOk = false;
  const checks = {};

  try {
    created = await base44.asServiceRole.entities.NexusUser.create({
      login_name: loginName, username: loginName, callsign,
      nexus_rank: 'SCOUT', auth_key_hash: authKeyHash, key_prefix: keyPrefixFromAuthKey(plainKey),
      key_issued_at: now, key_revoked: false, session_invalidated_at: now,
      onboarding_complete: true, consent_given: true, consent_timestamp: now, is_admin: false,
      key_issued_by: admin.callsign || 'SYSTEM', joined_at: now, last_seen_at: now,
    });
    createOk = Boolean(created?.id);

    if (created?.id) {
      const readback = await base44.asServiceRole.entities.NexusUser.filter({ id: created.id });
      const u = (readback || [])[0];
      if (u) {
        readbackOk = true;
        hashMatchOk = u.auth_key_hash === authKeyHash;
        AUTH_CRITICAL_FIELDS.forEach(f => { checks[f] = u[f] != null; });
      }
    }
  } catch (e) {
    console.error('[roundtrip]', e);
  } finally {
    if (created?.id) {
      cleanupOk = await base44.asServiceRole.entities.NexusUser.delete(created.id).then(() => true).catch(() => false);
    }
  }

  return Response.json({
    ok: secretPresent && createOk && readbackOk && hashMatchOk && cleanupOk,
    secret_present: secretPresent, create_ok: createOk, readback_ok: readbackOk,
    hash_match_ok: hashMatchOk, cleanup_ok: cleanupOk, details: checks,
  }, { headers: NO_STORE });
});