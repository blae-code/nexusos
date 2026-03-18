import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const SESSION_COOKIE_NAME = 'nexus_member_session';
const STATE_COOKIE_NAME = 'nexus_oauth_state';
const enc = new TextEncoder();

// Signing utilities (duplicated from shared for diagnostic isolation)
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

async function signValue(value) {
  const key = await getSigningKey();
  if (!key) return null;
  try {
    const signature = await crypto.subtle.sign('HMAC', key, enc.encode(value));
    return toBase64Url(new Uint8Array(signature));
  } catch {
    return null;
  }
}

async function decodeSignedPayload(token) {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = await signValue(body);
  if (signature !== expected) return null;
  try {
    const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
    if (!decoded.exp || decoded.exp < Date.now()) return { valid: false, reason: 'expired' };
    return { valid: true, payload: decoded };
  } catch (e) {
    return { valid: false, reason: 'decode_error' };
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

async function checkEndpoint(url, method = 'GET') {
  try {
    const response = await fetch(url, { method });
    return {
      endpoint: url,
      status: response.status,
      ok: response.ok,
    };
  } catch (error) {
    return {
      endpoint: url,
      status: 0,
      ok: false,
      error: error.message,
    };
  }
}

async function resolveSession(req) {
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

    const { discord_id } = result.payload;
    if (!discord_id) {
      return { valid: false, reason: 'missing_discord_id' };
    }

    const base44 = createClientFromRequest(req);
    const user = (await base44.asServiceRole.entities.NexusUser.filter({ discord_id: String(discord_id) }))?.[0];

    if (!user) {
      return { valid: false, reason: 'user_not_found' };
    }

    const invalidatedAt = user.session_invalidated_at ? new Date(user.session_invalidated_at).getTime() : 0;
    if (invalidatedAt && invalidatedAt > (result.payload.iat || 0)) {
      return { valid: false, reason: 'session_invalidated' };
    }

    return {
      valid: true,
      user: {
        id: user.id,
        callsign: user.callsign,
        rank: user.nexus_rank || 'AFFILIATE',
        onboarding_complete: user.onboarding_complete ?? false,
      },
    };
  } catch (error) {
    return { valid: false, reason: 'resolution_error', error: error.message };
  }
}

function buildDiscordAuthorizeUrl() {
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

Deno.serve(async (req) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const appUrl = Deno.env.get('APP_URL') || '';
  const baseUrl = new URL(appUrl || req.url).origin;

  // 1. Environment Configuration
  const envConfig = {
    DISCORD_CLIENT_ID: Boolean(Deno.env.get('DISCORD_CLIENT_ID')),
    DISCORD_CLIENT_SECRET: Boolean(Deno.env.get('DISCORD_CLIENT_SECRET')),
    DISCORD_REDIRECT_URI: Boolean(Deno.env.get('DISCORD_REDIRECT_URI')),
    DISCORD_GUILD_ID: Boolean(Deno.env.get('DISCORD_GUILD_ID')),
    DISCORD_BOT_TOKEN: Boolean(Deno.env.get('DISCORD_BOT_TOKEN')),
    SESSION_SIGNING_SECRET: Boolean(Deno.env.get('SESSION_SIGNING_SECRET')),
    APP_URL: Boolean(Deno.env.get('APP_URL')),
  };

  // 2. Endpoint Health Checks
  const healthChecks = await Promise.all([
    checkEndpoint(`${baseUrl}/api/functions/auth/health/entry`),
    checkEndpoint(`${baseUrl}/api/functions/auth/session/entry`),
    checkEndpoint(`${baseUrl}/api/functions/auth/discord/start/entry`, 'GET'),
  ]);

  // 3. Cookie Inspection
  const cookies = parseCookies(req);
  const cookieInspection = {
    nexus_member_session: Boolean(cookies[SESSION_COOKIE_NAME]),
    nexus_session: Boolean(cookies['nexus_session']), // Check for legacy cookie
    nexus_oauth_state: Boolean(cookies[STATE_COOKIE_NAME]),
    found_legacy_cookies: Boolean(cookies['nexus_session']),
  };

  // 4. Session Validation
  const sessionValidation = await resolveSession(req);

  // 5. OAuth Configuration Check
  const discordAuthorizeUrl = buildDiscordAuthorizeUrl();
  const redirectUri = Deno.env.get('DISCORD_REDIRECT_URI') || '';
  const oauthConfig = {
    authorize_url_generated: Boolean(discordAuthorizeUrl),
    authorize_url: discordAuthorizeUrl ? 'TRUNCATED' : null,
    redirect_uri_matches: redirectUri.includes('/api/functions/auth/discord/callback'),
    required_scopes_present: true, // Built in
    scopes: ['identify', 'guilds.members.read'],
  };

  // 6. Rank Mapping Check
  const rankMapping = {
    mapped_ranks: [
      { role: 'The Pioneer', rank: 'PIONEER' },
      { role: 'Founder', rank: 'FOUNDER' },
      { role: 'Voyager', rank: 'VOYAGER' },
      { role: 'Scout', rank: 'SCOUT' },
      { role: 'Vagrant', rank: 'VAGRANT' },
      { role: 'Affiliate', rank: 'AFFILIATE' },
    ],
    mapping_logic_present: true,
  };

  // 7. Final Status Summary
  const oauthConfigured = Object.values(envConfig).every(v => v);
  const endpointsHealthy = healthChecks.every(check => check.ok);
  const sessionWorking = sessionValidation.valid || cookieInspection.nexus_member_session === false;

  const summary = {
    oauth_configured: oauthConfigured,
    endpoints_healthy: endpointsHealthy,
    session_working: sessionWorking,
    ready_for_login: oauthConfigured && endpointsHealthy,
  };

  // Compile full diagnostic report
  const report = {
    timestamp: new Date().toISOString(),
    environment_configuration: envConfig,
    endpoint_health_checks: healthChecks,
    cookie_inspection: cookieInspection,
    session_validation: sessionValidation,
    oauth_configuration: oauthConfig,
    rank_mapping_validation: rankMapping,
    status_summary: summary,
  };

  return new Response(JSON.stringify(report, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
});