import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const enc = new TextEncoder();
const SESSION_COOKIE_NAME = 'nexus_member_session';

function toBase64Url(bytes) {
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function parseCookies(req) {
  const raw = req.headers.get('cookie') || '';
  return raw.split(';').reduce((acc, part) => {
    const trimmed = part.trim();
    if (!trimmed) return acc;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return acc;
    acc[trimmed.slice(0, idx)] = decodeURIComponent(trimmed.slice(idx + 1));
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

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  }

  try {
    const secret = Deno.env.get('SESSION_SIGNING_SECRET');
    if (!secret) {
      return Response.json({ error: 'not_configured' }, { status: 500 });
    }

    // Read body first (contains both session_token and onboarding data)
    let body;
    try { body = await req.json(); } catch {
      return Response.json({ error: 'invalid_body' }, { status: 400 });
    }

    // Get session token from body or cookie
    let sessionToken = body?.session_token || null;
    if (!sessionToken) {
      const cookies = parseCookies(req);
      sessionToken = cookies[SESSION_COOKIE_NAME] || null;
    }

    const sessionPayload = await decodeSessionToken(sessionToken, secret);
    if (!sessionPayload?.user_id) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const consentGiven = body?.consent_given === true;
    const aiEnabled = body?.ai_features_enabled !== false;

    if (!consentGiven) {
      return Response.json({ error: 'consent_required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Fetch the user via service role
    const users = await base44.asServiceRole.entities.NexusUser.filter({ id: sessionPayload.user_id });
    const user = Array.isArray(users) && users.length > 0 ? users[0] : null;

    if (!user) {
      return Response.json({ error: 'user_not_found' }, { status: 404 });
    }

    if (user.onboarding_complete) {
      return Response.json({ success: true, already_complete: true });
    }

    const now = new Date().toISOString();
    await base44.asServiceRole.entities.NexusUser.update(user.id, {
      consent_given: true,
      consent_timestamp: now,
      consent_version: body?.consent_version || '1.0',
      ai_features_enabled: aiEnabled,
      onboarding_complete: true,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error data:', JSON.stringify(error?.response?.data || error?.data || null, null, 2));
    console.error('[completeOnboarding]', error?.message || error);
    return Response.json({ error: 'onboarding_failed' }, { status: 500 });
  }
});