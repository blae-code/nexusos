/**
 * generateKey — Legacy admin-only invite issuance endpoint.
 * Self-contained: no local imports.
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

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const admin = await requireAdmin(req, base44);
  if (!admin) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 });
  }

  const loginName = normalizeLoginName(body.username || body.login_name || body.callsign);
  const callsign = normalizeCallsign(body.callsign || body.username || body.login_name);
  const nexusRank = String(body.nexus_rank || '').trim().toUpperCase();
  if (!loginName || !callsign || !VALID_RANKS.has(nexusRank)) {
    return Response.json({ error: 'missing_required_fields' }, { status: 400 });
  }

  const allUsers = await base44.asServiceRole.entities.NexusUser.list('-created_date', 500);
  const existing = (allUsers || []).find(u =>
    normalizeLoginName(u.login_name || u.username || u.callsign) === loginName
    || normalizeCallsign(u.callsign || '') === callsign
  );
  if (existing) {
    return Response.json({ error: 'callsign_taken' }, { status: 409 });
  }

  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) return Response.json({ error: 'session_secret_missing' }, { status: 500 });

  const authKey = generateAuthKey();
  const authKeyHash = await hashAuthKey(authKey, secret);
  const now = new Date().toISOString();
  const issuedBy = normalizeCallsign(body.issued_by_callsign || admin.callsign || admin.login_name || 'SYSTEM');

  const created = await base44.asServiceRole.entities.NexusUser.create({
    login_name: loginName, username: loginName, callsign,
    auth_key_hash: authKeyHash, key_prefix: keyPrefixFromAuthKey(authKey),
    nexus_rank: nexusRank, key_issued_by: issuedBy, key_issued_at: now,
    key_revoked: false, onboarding_complete: false,
    is_admin: nexusRank === 'PIONEER' && callsign === 'SYSTEM-ADMIN',
  });

  return Response.json({
    key: authKey, key_prefix: keyPrefixFromAuthKey(authKey), user_id: created?.id || null,
  });
});
