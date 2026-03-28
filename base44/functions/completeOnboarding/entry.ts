/**
 * POST /completeOnboarding — Mark user's onboarding as done.
 * Self-contained: no local imports.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const enc = new TextEncoder();
const SESSION_COOKIE_NAME = 'nexus_member_session';
const NO_STORE = { 'Cache-Control': 'no-store' };

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

async function resolveSession(req, base44) {
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
    if (!u || u.key_revoked) return null;
    return u;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: NO_STORE });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await resolveSession(req, base44);
    if (!user) {
      return Response.json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE });
    }

    let body;
    try { body = await req.json(); } catch {
      return Response.json({ error: 'invalid_body' }, { status: 400, headers: NO_STORE });
    }

    if (body?.consent_given !== true) {
      return Response.json({ error: 'consent_required' }, { status: 400, headers: NO_STORE });
    }

    if (user.onboarding_complete) {
      return Response.json({ success: true, already_complete: true }, { headers: NO_STORE });
    }

    const now = new Date().toISOString();
    await base44.asServiceRole.entities.NexusUser.update(user.id, {
      consent_given: true,
      consent_timestamp: now,
      consent_version: body?.consent_version || '1.0',
      ai_features_enabled: body?.ai_features_enabled !== false,
      onboarding_complete: true,
    });

    return Response.json({ success: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('[completeOnboarding]', error);
    return Response.json({ error: 'onboarding_failed' }, { status: 500, headers: NO_STORE });
  }
});