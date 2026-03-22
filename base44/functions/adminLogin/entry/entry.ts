// Admin login bypass — email-allowlist based, no Discord required.
// Allowed emails are hardcoded here; submit email to receive a NexusOS session.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const SESSION_COOKIE_NAME = 'nexus_member_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const enc = new TextEncoder();

// ── Allowlist ─────────────────────────────────────────────────────────────────
const ADMIN_ALLOWLIST = [
  { email: 'blae@katrasoluta.com',  callsign: 'BLAE',   rank: 'PIONEER' },
  { email: 'nicdel26@gmail.com',    callsign: 'NICDEL', rank: 'PIONEER' },
];

// ── Crypto helpers ─────────────────────────────────────────────────────────────

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

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email) {
    return Response.json({ error: 'Email is required' }, { status: 400 });
  }

  // Check allowlist
  const adminEntry = ADMIN_ALLOWLIST.find(a => a.email.toLowerCase() === email);
  if (!adminEntry) {
    return Response.json({ error: 'Access denied — email not authorised' }, { status: 403 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const syntheticDiscordId = `admin:${email.replace(/[^a-z0-9]/g, '_')}`;
    const now = new Date().toISOString();

    // Upsert NexusUser record
    const existing = (await base44.asServiceRole.entities.NexusUser.filter({ discord_id: syntheticDiscordId }))?.[0];
    if (!existing) {
      await base44.asServiceRole.entities.NexusUser.create({
        discord_id: syntheticDiscordId,
        callsign: adminEntry.callsign,
        discord_handle: email,
        discord_avatar: null,
        discord_roles: ['SYSADMIN'],
        nexus_rank: adminEntry.rank,
        joined_at: now,
        roles_synced_at: now,
        onboarding_complete: true,
      });
    }

    // Issue session cookie
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

    const headers = new Headers({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json' });
    headers.append('Set-Cookie', cookieParts.join('; '));

    return new Response(JSON.stringify({
      ok: true,
      callsign: existing?.callsign || adminEntry.callsign,
      rank: adminEntry.rank,
      redirect: '/app/industry',
    }), { status: 200, headers });

  } catch (error) {
    console.error('[adminLogin]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});