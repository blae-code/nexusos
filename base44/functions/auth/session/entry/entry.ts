import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const SESSION_COOKIE_NAME = 'nexus_member_session';
const enc = new TextEncoder();

function toBase64Url(bytes) {
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function getSigningKey() {
  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) throw new Error('SESSION_SIGNING_SECRET is not configured');
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function signValue(value) {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

async function decodeSignedPayload(token) {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = await signValue(body);
  if (signature !== expected) return null;
  try {
    const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
    if (!decoded.exp || decoded.exp < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const raw = req.headers.get('cookie') || '';
  return raw.split(';').reduce((acc, part) => {
    const trimmed = part.trim();
    if (!trimmed) return acc;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return acc;
    const key = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1);
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  try {
    const cookies = parseCookies(req);
    const payload = await decodeSignedPayload(cookies[SESSION_COOKIE_NAME]);

    if (!payload?.discord_id) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const base44 = createClientFromRequest(req);
    const user = (await base44.asServiceRole.entities.NexusUser.filter({ discord_id: String(payload.discord_id) }))?.[0];

    if (!user) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const invalidatedAt = user.session_invalidated_at ? new Date(user.session_invalidated_at).getTime() : 0;
    if (invalidatedAt && invalidatedAt > (payload.iat || 0)) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    return new Response(JSON.stringify({
      authenticated: true,
      user: {
        id: user.id,
        discordId: String(user.discord_id),
        callsign: user.callsign,
        rank: user.nexus_rank || 'AFFILIATE',
        discordRoles: user.discord_roles || [],
        joinedAt: user.joined_at || null,
        onboarding_complete: user.onboarding_complete ?? false,
      },
    }), {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[auth/session]', error);
    return new Response(JSON.stringify({ authenticated: false, error: error.message }), {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
});