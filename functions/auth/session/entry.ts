/**
 * GET /auth/session — Validate session cookie, return current user or 401.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const SESSION_COOKIE_NAME = 'nexus_member_session';
const enc = new TextEncoder();

function toBase64Url(bytes) {
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
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

async function decodeToken(token) {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = await signValue(body);
  if (signature !== expected) return null;
  try {
    const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
    if (!decoded.exp || decoded.exp < Date.now()) return null;
    return decoded;
  } catch { return null; }
}

function parseCookies(req) {
  const raw = req.headers.get('cookie') || '';
  return raw.split(';').reduce((acc, part) => {
    const t = part.trim();
    if (!t) return acc;
    const i = t.indexOf('=');
    if (i === -1) return acc;
    acc[t.slice(0, i)] = decodeURIComponent(t.slice(i + 1));
    return acc;
  }, {});
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const cookies = parseCookies(req);
    const payload = await decodeToken(cookies[SESSION_COOKIE_NAME]);

    if (!payload?.callsign) {
      return Response.json({ authenticated: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    const base44 = createClientFromRequest(req);
    const allUsers = await base44.asServiceRole.entities.NexusUser.list('-created_date', 500);
    const user = (allUsers || []).find(u => u.callsign && u.callsign.toLowerCase() === payload.callsign.toLowerCase());

    if (!user) {
      return Response.json({ authenticated: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    // Check session invalidation
    const invalidatedAt = user.session_invalidated_at ? new Date(user.session_invalidated_at).getTime() : 0;
    if (invalidatedAt && invalidatedAt > (payload.iat || 0)) {
      return Response.json({ authenticated: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    // Check if revoked
    if (user.key_revoked) {
      return Response.json({ authenticated: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    // Compute is_admin from rank/callsign
    const is_admin = (user.nexus_rank === 'PIONEER' || user.callsign === 'SYSTEM_ADMIN');

    return Response.json({
      authenticated: true,
      is_admin,
      user: {
        id: user.id,
        callsign: user.callsign,
        rank: user.nexus_rank || 'AFFILIATE',
        joinedAt: user.joined_at || null,
        onboarding_complete: user.onboarding_complete ?? false,
        is_admin,
      },
    }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[auth/session]', error);
    return Response.json({ authenticated: false, error: error.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
});