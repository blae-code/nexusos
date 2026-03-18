import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const SESSION_COOKIE_NAME = 'nexus_member_session';
const STATE_COOKIE_NAME = 'nexus_oauth_state';
const enc = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function getSigningKey() {
  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) return null;
  try {
    return crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    );
  } catch {
    return null;
  }
}

async function signValue(value: string): Promise<string | null> {
  const key = await getSigningKey();
  if (!key) return null;
  try {
    const signature = await crypto.subtle.sign('HMAC', key, enc.encode(value));
    return toBase64Url(new Uint8Array(signature));
  } catch {
    return null;
  }
}

async function decodeSignedPayload(token?: string | null): Promise<{ valid: boolean; payload?: Record<string, any>; reason?: string } | null> {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = await signValue(body);
  if (signature !== expected) return null;
  try {
    const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
    if (!decoded.exp || decoded.exp < Date.now()) return { valid: false, reason: 'expired' };
    return { valid: true, payload: decoded };
  } catch {
    return { valid: false, reason: 'decode_error' };
  }
}

function parseCookies(req: Request): Record<string, string> {
  const raw = req.headers.get('cookie') || '';
  return raw.split(';').reduce<Record<string, string>>((acc, part) => {
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

async function checkEndpoint(url: string) {
  try {
    const response = await fetch(url, { method: 'GET' });
    return { exists: true, status: response.status, ok: response.ok };
  } catch {
    return { exists: false, status: 0, ok: false };
  }
}

async function resolveSession(req: Request): Promise<Record<string, any>> {
  try {
    const cookies = parseCookies(req);
    const token = cookies[SESSION_COOKIE_NAME];

    if (!token) {
      return { valid: false, reason: 'no_session_cookie' };
    }

    const result = await decodeSignedPayload(token);
    if (!result || !result.valid) {
      return { valid: false, reason: result?.reason || 'invalid_signature' };
    }

    const { discord_id } = result.payload || {};
    if (!discord_id) {
      return { valid: false, reason: 'missing_discord_id' };
    }

    const base44 = createClientFromRequest(req);
    const users = await base44.asServiceRole.entities.NexusUser.filter({ discord_id: String(discord_id) });
    const user = users?.[0];

    if (!user) {
      return { valid: false, reason: 'user_not_found' };
    }

    const invalidatedAt = user.session_invalidated_at ? new Date(user.session_invalidated_at).getTime() : 0;
    if (invalidatedAt && invalidatedAt > ((result.payload?.iat as number) || 0)) {
      return { valid: false, reason: 'session_invalidated' };
    }

    return {
      valid: true,
      user: {
        callsign: user.callsign,
        rank: user.nexus_rank || 'AFFILIATE',
        onboarding_complete: user.onboarding_complete ?? false,
      },
    };
  } catch {
    return { valid: false, reason: 'resolution_error' };
  }
}

function buildDiscordAuthorizeUrl(): string | null {
  const clientId = Deno.env.get('DISCORD_CLIENT_ID');
  const redirectUri = Deno.env.get('DISCORD_REDIRECT_URI');

  if (!clientId || !redirectUri) {
    return null;
  }

  const url = new URL('https://discord.com/api/v10/oauth2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'identify guilds.members.read');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', 'DIAGNOSTIC_PLACEHOLDER');

  return url.toString();
}

function sessionNoStoreHeaders(): Record<string, string> {
  return { 'Cache-Control': 'no-store' };
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, {
      status: 405,
      headers: sessionNoStoreHeaders(),
    });
  }

  const appUrl = Deno.env.get('APP_URL') || '';
  const baseUrl = new URL(appUrl || req.url).origin;

  // Environment section
  const environment = {
    DISCORD_CLIENT_ID: Boolean(Deno.env.get('DISCORD_CLIENT_ID')),
    DISCORD_CLIENT_SECRET: Boolean(Deno.env.get('DISCORD_CLIENT_SECRET')),
    DISCORD_REDIRECT_URI: Deno.env.get('DISCORD_REDIRECT_URI') || null,
    DISCORD_GUILD_ID: Boolean(Deno.env.get('DISCORD_GUILD_ID')),
    SESSION_SIGNING_SECRET: Boolean(Deno.env.get('SESSION_SIGNING_SECRET')),
    APP_URL: Deno.env.get('APP_URL') || null,
  };

  // Endpoint health section
  const endpoints = await Promise.all([
    checkEndpoint(`${baseUrl}/api/functions/auth/health/entry`),
    checkEndpoint(`${baseUrl}/api/functions/auth/session/entry`),
    checkEndpoint(`${baseUrl}/api/functions/auth/logout/entry`),
    checkEndpoint(`${baseUrl}/api/functions/auth/discord/start/entry`),
    checkEndpoint(`${baseUrl}/api/functions/auth/discord/callback/entry`),
  ]);

  const endpoint_health = {
    'auth/health': endpoints[0],
    'auth/session': endpoints[1],
    'auth/logout': endpoints[2],
    'auth/discord/start': endpoints[3],
    'auth/discord/callback': endpoints[4],
  };

  // Cookie section
  const cookies = parseCookies(req);
  const cookie_check = {
    nexus_member_session: Boolean(cookies[SESSION_COOKIE_NAME]),
    nexus_session: Boolean(cookies['nexus_session']),
    nexus_oauth_state: Boolean(cookies[STATE_COOKIE_NAME]),
  };

  // Session section
  const session = await resolveSession(req);

  // OAuth section
  const authorizeUrl = buildDiscordAuthorizeUrl();
  const redirectUri = Deno.env.get('DISCORD_REDIRECT_URI') || null;
  const oauth = {
    authorize_url: authorizeUrl ? 'generated' : 'not_available',
    redirect_uri: redirectUri,
    scopes: ['identify', 'guilds.members.read'],
  };

  // Summary section
  const endpointsHealthy = Object.values(endpoint_health).every(e => (e as any).exists && (e as any).ok);
  const oauthConfigured = Boolean(authorizeUrl);

  const summary = {
    oauth_configured: oauthConfigured,
    endpoints_healthy: endpointsHealthy,
    session_working: (session as any).valid,
    ready_for_login: oauthConfigured && endpointsHealthy,
  };

  const report = {
    timestamp: new Date().toISOString(),
    environment,
    endpoint_health,
    cookies: cookie_check,
    session,
    oauth,
    summary,
  };

  return Response.json(report, {
    headers: sessionNoStoreHeaders(),
  });
});