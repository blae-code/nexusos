// Admin login bypass — for system admins who are not Discord guild members.
// Authenticates via Base44 platform role (admin) and issues a NexusOS session directly.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const SESSION_COOKIE_NAME = 'nexus_member_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const enc = new TextEncoder();

function toBase64Url(bytes) {
  const binary = Array.from(bytes, b => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function getSigningKey() {
  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) throw new Error('SESSION_SIGNING_SECRET not set');
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function signValue(value) {
  const key = await getSigningKey();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return toBase64Url(new Uint8Array(sig));
}

async function encodeSignedPayload(payload) {
  const body = toBase64Url(enc.encode(JSON.stringify(payload)));
  const sig = await signValue(body);
  return `${body}.${sig}`;
}

function isSecure(req) {
  const appUrl = Deno.env.get('APP_URL') || '';
  return appUrl.startsWith('https://') ||
    new URL(req.url).protocol === 'https:' ||
    (req.headers.get('x-forwarded-proto') || '').includes('https');
}

function apexOrigin() {
  const appUrl = Deno.env.get('APP_URL') || '';
  if (!appUrl) throw new Error('APP_URL not set');
  return new URL(appUrl).origin;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  // 1. Must be an authenticated Base44 admin
  let platformUser;
  try {
    const base44 = createClientFromRequest(req);
    platformUser = await base44.auth.me();
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!platformUser || platformUser.role !== 'admin') {
    return Response.json({ error: 'Forbidden — admin role required' }, { status: 403 });
  }

  try {
    const base44 = createClientFromRequest(req);

    // 2. Synthetic discord_id for admin: "admin:<base44_user_id>"
    const syntheticDiscordId = `admin:${platformUser.id}`;
    const now = new Date().toISOString();

    // 3. Upsert a NexusUser record for this admin
    const existing = (await base44.asServiceRole.entities.NexusUser.filter({ discord_id: syntheticDiscordId }))?.[0];

    if (!existing) {
      await base44.asServiceRole.entities.NexusUser.create({
        discord_id: syntheticDiscordId,
        callsign: 'SYSADMIN',
        discord_handle: platformUser.email || 'sysadmin',
        discord_avatar: null,
        discord_roles: ['SYSADMIN'],
        nexus_rank: 'PIONEER',
        joined_at: now,
        roles_synced_at: now,
        onboarding_complete: true,
      });
    }

    // 4. Issue a NexusOS session cookie
    const sessionValue = await encodeSignedPayload({
      discord_id: syntheticDiscordId,
      iat: Date.now(),
      exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    });

    const cookieParts = [
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionValue)}`,
      'Path=/',
      'SameSite=Lax',
      `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
      'HttpOnly',
    ];
    if (isSecure(req)) cookieParts.push('Secure');

    const headers = new Headers({
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
    });
    headers.append('Set-Cookie', cookieParts.join('; '));

    return new Response(JSON.stringify({
      ok: true,
      callsign: existing?.callsign || 'SYSADMIN',
      rank: 'PIONEER',
      redirect: '/app/industry',
    }), { status: 200, headers });

  } catch (error) {
    console.error('[adminLogin]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});