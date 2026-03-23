/**
 * POST /auth/login — Key-based login.
 * Body: { callsign: string, key: string }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const SESSION_COOKIE_NAME = 'nexus_member_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const enc = new TextEncoder();

function toBase64Url(bytes) {
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function getSigningKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function signValue(value, secret) {
  const key = await getSigningKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return toBase64Url(new Uint8Array(sig));
}

async function hmacHash(key, secret) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(key));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function createSessionToken(callsign, is_admin, secret) {
  const payload = { callsign, is_admin: !!is_admin, iat: Date.now(), exp: Date.now() + SESSION_MAX_AGE * 1000 };
  const body = toBase64Url(enc.encode(JSON.stringify(payload)));
  const signature = await signValue(body, secret);
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
    try { parts.push(`Domain=.${new URL(appUrl).hostname.replace(/^www\./, '')}`); } catch { /* ignore */ }
  }
  if (isSecure(req)) parts.push('Secure');
  return parts.join('; ');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  }

  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) {
    return Response.json({ error: 'SESSION_SIGNING_SECRET not configured' }, { status: 500 });
  }

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'invalid_body' }, { status: 400 }); }

  const { callsign, key } = body;
  if (!callsign || !key) {
    return Response.json({ error: 'invalid_credentials' }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  const allUsers = await base44.asServiceRole.entities.NexusUser.list('-created_date', 500);
  const user = (allUsers || []).find(u => u.callsign && u.callsign.toLowerCase() === callsign.trim().toLowerCase());

  if (!user) {
    return Response.json({ error: 'invalid_credentials' }, { status: 401 });
  }

  if (user.key_revoked) {
    return Response.json({ error: 'key_revoked' }, { status: 403 });
  }

  if (!user.auth_key_hash) {
    return Response.json({ error: 'invalid_credentials' }, { status: 401 });
  }

  // Compare HMAC hash
  const keyHash = await hmacHash(key, secret);
  if (keyHash !== user.auth_key_hash) {
    return Response.json({ error: 'invalid_credentials' }, { status: 401 });
  }

  const is_admin = (user.nexus_rank === 'PIONEER' || user.callsign === 'SYSTEM_ADMIN' || user.callsign === 'SYSTEM-ADMIN');

  await base44.asServiceRole.entities.NexusUser.update(user.id, {
    last_seen_at: new Date().toISOString(),
    is_admin,
  });

  const token = await createSessionToken(user.callsign, is_admin, secret);
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', buildCookie(SESSION_COOKIE_NAME, token, req, SESSION_MAX_AGE));

  return Response.json({
    success: true,
    isNew: false,
    onboarding_complete: user.onboarding_complete ?? false,
    nexus_rank: user.nexus_rank || 'AFFILIATE',
    is_admin,
  }, { headers });
});