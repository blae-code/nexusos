/**
 * POST /auth/login — Key-based login.
 * Body: { callsign: string, key: string }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { compare } from 'npm:bcrypt@0.4.1';

const SESSION_COOKIE_NAME = 'nexus_member_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
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

async function createSessionToken(callsign) {
  const payload = { callsign, iat: Date.now(), exp: Date.now() + SESSION_MAX_AGE * 1000 };
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
    return Response.json({ error: 'invalid_credentials' }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  // Find user by callsign (case-insensitive)
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

  // Compare key against bcrypt hash
  const keyMatch = await compare(key, user.auth_key_hash);
  if (!keyMatch) {
    return Response.json({ error: 'invalid_credentials' }, { status: 401 });
  }

  // Update last_seen
  await base44.asServiceRole.entities.NexusUser.update(user.id, {
    last_seen_at: new Date().toISOString(),
  });

  // Create session
  const token = await createSessionToken(user.callsign);
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', buildCookie(SESSION_COOKIE_NAME, token, req, SESSION_MAX_AGE));

  return Response.json({
    success: true,
    isNew: false,
    onboarding_complete: user.onboarding_complete ?? false,
    nexus_rank: user.nexus_rank || 'AFFILIATE',
  }, { headers });
});