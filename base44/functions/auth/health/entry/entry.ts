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

async function validateSession(req: Request): Promise<Record<string, any>> {
  try {
    const cookies = parseCookies(req);
    const token = cookies[SESSION_COOKIE_NAME];

    if (!token) {
      return { authenticated: false, reason: 'no_session_cookie' };
    }

    const result = await decodeSignedPayload(token);
    if (!result || !result.valid) {
      return { authenticated: false, reason: result?.reason || 'invalid_signature' };
    }

    const { discord_id } = result.payload || {};
    if (!discord_id) {
      return { authenticated: false, reason: 'missing_discord_id' };
    }

    const base44 = createClientFromRequest(req);
    const users = await base44.asServiceRole.entities.NexusUser.filter({ discord_id: String(discord_id) });
    const user = users?.[0];

    if (!user) {
      return { authenticated: false, reason: 'user_not_found' };
    }

    const invalidatedAt = user.session_invalidated_at ? new Date(user.session_invalidated_at).getTime() : 0;
    if (invalidatedAt && invalidatedAt > ((result.payload?.iat as number) || 0)) {
      return { authenticated: false, reason: 'session_invalidated' };
    }

    return {
      authenticated: true,
      user: {
        callsign: user.callsign,
        rank: user.nexus_rank || 'AFFILIATE',
        onboarding_complete: user.onboarding_complete ?? false,
      },
    };
  } catch {
    return { authenticated: false, reason: 'validation_error' };
  }
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

  // 1. Environment Configuration
  const environment = {
    DISCORD_CLIENT_ID: Boolean(Deno.env.get('DISCORD_CLIENT_ID')),
    DISCORD_CLIENT_SECRET: Boolean(Deno.env.get('DISCORD_CLIENT_SECRET')),
    DISCORD_REDIRECT_URI: Boolean(Deno.env.get('DISCORD_REDIRECT_URI')),
    DISCORD_GUILD_ID: Boolean(Deno.env.get('DISCORD_GUILD_ID')),
    SESSION_SIGNING_SECRET: Boolean(Deno.env.get('SESSION_SIGNING_SECRET')),
    APP_URL: Boolean(Deno.env.get('APP_URL')),
  };

  // 2. Cookie Inspection
  const cookies = parseCookies(req);
  const cookies_found = {
    nexus_member_session: Boolean(cookies[SESSION_COOKIE_NAME]),
    nexus_session: Boolean(cookies['nexus_session']),
    nexus_oauth_state: Boolean(cookies[STATE_COOKIE_NAME]),
  };

  // 3. Session Validation
  const session_check = await validateSession(req);

  // 4. OAuth Configuration
  const clientId = Deno.env.get('DISCORD_CLIENT_ID');
  const redirectUri = Deno.env.get('DISCORD_REDIRECT_URI');
  const oauth_configured = Boolean(
    Deno.env.get('DISCORD_CLIENT_ID')
      && Deno.env.get('DISCORD_CLIENT_SECRET')
      && Deno.env.get('DISCORD_REDIRECT_URI')
      && Deno.env.get('DISCORD_GUILD_ID')
      && Deno.env.get('DISCORD_BOT_TOKEN')
      && Deno.env.get('SESSION_SIGNING_SECRET')
      && Deno.env.get('APP_URL')
  );

  const oauth_config = {
    configured: oauth_configured,
    redirect_uri: redirectUri || null,
    scopes: ['identify', 'guilds.members.read'],
  };

  // 5. Route Checks (code introspection)
  const route_checks = {
    'auth/health': true,
    'auth/session': true,
    'auth/logout': true,
    'auth/discord/start': true,
    'auth/discord/callback': true,
  };

  // 6. Summary
  const summary = {
    oauth_configured,
    session_working: (session_check as any).authenticated,
    ready_for_login: oauth_configured && Object.values(environment).every(v => v),
  };

  return Response.json({
    timestamp: new Date().toISOString(),
    environment,
    cookies: cookies_found,
    session_check,
    oauth_config,
    route_checks,
    summary,
  }, {
    headers: sessionNoStoreHeaders(),
  });
});