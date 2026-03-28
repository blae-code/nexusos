import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { resolveFleetYardsFleet } from '../_shared/fleetyards/entry.ts';

const NO_STORE = { 'Cache-Control': 'no-store' };
const enc = new TextEncoder();

function toBase64Url(bytes) {
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

function parseCookies(req) {
  const raw = req.headers.get('cookie') || '';
  return raw.split(';').reduce((acc, part) => {
    const t = part.trim();
    if (!t) return acc;
    const idx = t.indexOf('=');
    if (idx === -1) return acc;
    acc[t.slice(0, idx)] = decodeURIComponent(t.slice(idx + 1));
    return acc;
  }, {});
}

async function signValue(value, secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
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

async function requireAdmin(req) {
  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) return null;
  const cookies = parseCookies(req);
  const payload = await decodeSessionToken(cookies['nexus_member_session'], secret);
  if (!payload?.user_id) return null;

  const base44 = createClientFromRequest(req);
  const users = await base44.asServiceRole.entities.NexusUser.filter({ id: payload.user_id });
  const user = users?.[0];
  if (!user || user.key_revoked) return null;

  const rank = String(user.nexus_rank || '').toUpperCase();
  if (rank !== 'PIONEER' && user.is_admin !== true) return null;
  return user;
}

const API_TESTS = {
  UEX_API_KEY: async (apiKey) => {
    const res = await fetch('https://api.uexcorp.space/api/v2/body/Stanton', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return res.ok;
  },
  SC_API_KEY: async (apiKey) => {
    // Key passed as header, matching verseStatus pattern
    const res = await fetch('https://api.starcitizen-api.com/api/v2/live/vehicles', {
      headers: { apikey: apiKey },
    });
    return res.ok;
  },
  FLEETYARDS_AUTH_COOKIE: async (cookie) => {
    const handle = String(Deno.env.get('FLEETYARDS_HANDLE') || '').trim();
    if (!handle) {
      throw new Error('FLEETYARDS_HANDLE not configured');
    }

    const fleet = await resolveFleetYardsFleet(handle, 10000);
    const slug = String(fleet?.slug || handle).trim();
    const res = await fetch(`https://api.fleetyards.net/v1/fleets/${encodeURIComponent(slug)}/vehicles`, {
      headers: {
        Accept: 'application/json',
        Cookie: cookie,
      },
    });
    return res.ok;
  },
};

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: NO_STORE });
    }

    const admin = await requireAdmin(req);
    if (!admin) {
      return Response.json({ error: 'forbidden' }, { status: 403, headers: NO_STORE });
    }

    const { secretId } = await req.json();
    if (!secretId || !API_TESTS[secretId]) {
      return Response.json({ error: 'invalid_secret_id' }, { status: 400, headers: NO_STORE });
    }

    const value = secretId === 'FLEETYARDS_AUTH_COOKIE'
      ? (Deno.env.get('FLEETYARDS_AUTH_COOKIE') || Deno.env.get('FLEETYARDS_COOKIE'))
      : Deno.env.get(secretId);
    if (!value) {
      return Response.json({
        success: false,
        error: 'secret_not_configured',
        secretId,
        timestamp: new Date().toISOString(),
      }, { headers: NO_STORE });
    }

    const isValid = await API_TESTS[secretId](value);
    return Response.json({
      success: isValid,
      secretId,
      timestamp: new Date().toISOString(),
    }, { headers: NO_STORE });
  } catch (error) {
    console.error('[testApiConnection] Error:', error);
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500, headers: NO_STORE });
  }
});
