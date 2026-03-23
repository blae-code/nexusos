/**
 * POST /auth/register — First-time registration using a pre-issued key.
 * Body: { callsign: string, key: string }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

const SESSION_COOKIE_NAME = 'nexus_member_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const enc = new TextEncoder();

function toBase64Url(bytes) {
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function getSigningKey() {
  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) throw new Error('SESSION_SIGNING_SECRET not configured');
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function signValue(value) {
  const key = await getSigningKey();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return toBase64Url(new Uint8Array(sig));
}

async function createSessionToken(callsign, is_admin) {
  const payload = { callsign, is_admin: !!is_admin, iat: Date.now(), exp: Date.now() + SESSION_MAX_AGE * 1000 };
  const body = toBase64Url(enc.encode(JSON.stringify(payload)));
  const signature = await signValue(body);
  return `${body}.${signature}`;
}

function isSecure(req) {
  const appUrl = Deno.env.get('APP_URL') || '';
  return appUrl.startsWith('https://') || new URL(req.url).protocol === 'https:' || (req.headers.get('x-forwarded-proto') || '').includes('https');
}

function buildCookie(name, value, req, maxAge) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Lax', 'HttpOnly', `Max-Age=${maxAge}`];
  const appUrl = Deno.env.get('APP_URL');
  if (appUrl) {
    try { parts.push(`Domain=.${new URL(appUrl).hostname.replace(/^www\./, '')}`); } catch {}
  }
  if (isSecure(req)) parts.push('Secure');
  return parts.join('; ');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  }

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'invalid_body' }, { status: 400 }); }

  const { callsign, key } = body;
  if (!callsign || !key) {
    return Response.json({ error: 'invalid_key' }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  // Find user by callsign
  const allUsers = await base44.asServiceRole.entities.NexusUser.list('-created_date', 500);
  const user = (allUsers || []).find(u => u.callsign && u.callsign.toLowerCase() === callsign.trim().toLowerCase());

  if (!user) {
    return Response.json({ error: 'invalid_key' }, { status: 401 });
  }

  if (user.key_revoked) {
    return Response.json({ error: 'key_revoked' }, { status: 403 });
  }

  // If user has already registered (has joined_at set)
  if (user.joined_at) {
    return Response.json({ error: 'already_registered' }, { status: 409 });
  }

  if (!user.auth_key_hash) {
    return Response.json({ error: 'invalid_key' }, { status: 401 });
  }

  const keyMatch = await bcrypt.compare(key, user.auth_key_hash);
  if (!keyMatch) {
    return Response.json({ error: 'invalid_key' }, { status: 401 });
  }

  // Compute admin flag
  const is_admin = (user.nexus_rank === 'PIONEER' || user.callsign === 'SYSTEM_ADMIN');

  // Mark as registered and sync is_admin
  const now = new Date().toISOString();
  await base44.asServiceRole.entities.NexusUser.update(user.id, {
    joined_at: now,
    last_seen_at: now,
    is_admin,
  });

  // Create session
  const token = await createSessionToken(user.callsign, is_admin);
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', buildCookie(SESSION_COOKIE_NAME, token, req, SESSION_MAX_AGE));

  return Response.json({
    success: true,
    isNew: true,
    onboarding_complete: false,
    nexus_rank: user.nexus_rank || 'AFFILIATE',
    is_admin,
  }, { headers });
});