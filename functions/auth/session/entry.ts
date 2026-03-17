import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createHmac } from 'node:crypto';

function getSessionCookie(req) {
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split('=');
    acc[name] = decodeURIComponent(value || '');
    return acc;
  }, {});
  return cookies.nexus_session || '';
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

  return new Response(JSON.stringify({
    authenticated: true,
    user: sessionData,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});