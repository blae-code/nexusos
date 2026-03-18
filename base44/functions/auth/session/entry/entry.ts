import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createHmac } from 'node:crypto';

function getSessionCookie(req) {
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split('=');
    acc[name] = decodeURIComponent(value || '');
    return acc;
  }, {});
  return cookies.nexus_member_session || '';
}

function validateSessionSignature(sessionToken, secret) {
  if (!sessionToken || !secret) return false;

  const parts = sessionToken.split('.');
  if (parts.length !== 2) return false;

  const [payload, signature] = parts;
  const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');
  
  return signature === expectedSignature;
}

function parseSessionPayload(payload) {
  try {
    const decoded = Buffer.from(payload, 'hex').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const sessionToken = getSessionCookie(req);
  const sessionSecret = Deno.env.get('SESSION_SIGNING_SECRET');

  if (!sessionToken || !sessionSecret) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!validateSessionSignature(sessionToken, sessionSecret)) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parts = sessionToken.split('.');
  const sessionData = parseSessionPayload(parts[0]);

  if (!sessionData) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Reject expired sessions. Sessions created before this fix won't have exp,
  // so we only enforce expiry when the field is present.
  if (sessionData.exp && sessionData.exp < Date.now()) {
    return new Response(JSON.stringify({ authenticated: false, reason: 'session_expired' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Normalize field names to match what SessionContext.jsx expects.
  // The callback stores nexus_rank (snake_case) and discord_id (snake_case).
  // The frontend reads rank and discordId (camelCase).
  const normalizedUser = {
    id: sessionData.id,
    discordId: sessionData.discord_id,
    callsign: sessionData.callsign,
    rank: sessionData.nexus_rank || 'AFFILIATE',
    discordRoles: sessionData.discord_roles || [],
    joinedAt: sessionData.joined_at || null,
    onboarding_complete: sessionData.onboarding_complete ?? false,
  };

  return new Response(JSON.stringify({
    authenticated: true,
    user: normalizedUser,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});