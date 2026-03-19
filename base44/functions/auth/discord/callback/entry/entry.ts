import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const enc = new TextEncoder();
const SESSION_COOKIE_NAME = 'nexus_member_session';
const STATE_COOKIE_NAME = 'nexus_oauth_state';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const ROLE_PRIORITY = [
  { roleName: 'The Pioneer', nexusRank: 'PIONEER' },
  { roleName: 'Founder', nexusRank: 'FOUNDER' },
  { roleName: 'Voyager', nexusRank: 'VOYAGER' },
  { roleName: 'Scout', nexusRank: 'SCOUT' },
  { roleName: 'Vagrant', nexusRank: 'VAGRANT' },
  { roleName: 'Affiliate', nexusRank: 'AFFILIATE' },
];

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
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
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

async function encodeSignedPayload(payload) {
  const body = toBase64Url(enc.encode(JSON.stringify(payload)));
  const signature = await signValue(body);
  return `${body}.${signature}`;
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

function getDiscordConfig() {
  const clientId = Deno.env.get('DISCORD_CLIENT_ID');
  const clientSecret = Deno.env.get('DISCORD_CLIENT_SECRET');
  const redirectUri = Deno.env.get('DISCORD_REDIRECT_URI');
  const guildId = Deno.env.get('DISCORD_GUILD_ID');
  const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
  if (!clientId || !clientSecret || !redirectUri || !guildId || !botToken) {
    throw new Error('Discord OAuth is not fully configured');
  }
  return { clientId, clientSecret, redirectUri, guildId, botToken };
}

function isSecureRequest(req) {
  const appUrl = Deno.env.get('APP_URL') || '';
  const reqUrl = new URL(req.url);
  return appUrl.startsWith('https://') || reqUrl.protocol === 'https:' || (req.headers.get('x-forwarded-proto') || '').includes('https');
}

function setCookieHeader(headers, name, value, req, options = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path || '/'}`,
    'SameSite=Lax',
  ];
  if (typeof options.maxAge === 'number') parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly !== false) parts.push('HttpOnly');
  if (isSecureRequest(req)) parts.push('Secure');
  headers.append('Set-Cookie', parts.join('; '));
}

function resolveAppUrl(req, appBase) {
  const configured = Deno.env.get('APP_URL') || new URL(req.url).origin;
  const configuredUrl = new URL(configured);
  const base = appBase && appBase !== '/' ? appBase : '';
  const path = base || (configuredUrl.pathname !== '/' ? configuredUrl.pathname : '');
  const target = new URL(configuredUrl.origin);
  target.pathname = path ? `${path}/` : '/';
  return target;
}

function gateErrorRedirect(errorCode, req, headers = new Headers(), appBase = '') {
  const target = resolveAppUrl(req, appBase);
  target.searchParams.set('error', errorCode);
  headers.set('Location', target.toString());
  return new Response(null, { status: 302, headers });
}

function appRedirect(redirectPath, req, headers = new Headers(), appBase = '') {
  const base = Deno.env.get('APP_URL') || new URL(req.url).origin;
  const target = new URL(redirectPath, base);
  headers.set('Location', target.toString());
  return new Response(null, { status: 302, headers });
}

async function exchangeDiscordCode(code) {
  const { clientId, clientSecret, redirectUri } = getDiscordConfig();
  const response = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${err}`);
  }
  return response.json();
}

async function fetchDiscordUser(accessToken) {
  const response = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Fetch user failed: ${response.status}`);
  return response.json();
}

async function fetchGuildMember(userId) {
  const { guildId, botToken } = getDiscordConfig();
  const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Guild member lookup failed: ${response.status}`);
  return response.json();
}

async function mapGuildRolesToRank(roleIds) {
  const { guildId, botToken } = getDiscordConfig();
  const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  if (!response.ok) throw new Error(`Guild roles lookup failed: ${response.status}`);
  const guildRoles = await response.json();
  const roleById = new Map(guildRoles.map(r => [r.id, r.name]));
  const roleNames = roleIds.map(id => roleById.get(id)).filter(Boolean);
  const matched = ROLE_PRIORITY.find(({ roleName }) => roleNames.includes(roleName));
  return { roleNames, nexusRank: matched?.nexusRank || null };
}

function sanitizeCallsign(value) {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return normalized || null;
}

function deriveSeedCallsign(member, user) {
  return sanitizeCallsign(member.nick || user.global_name || user.username || `NOMAD-${user.id.slice(-4)}`) || `NOMAD-${user.id.slice(-4)}`;
}

async function upsertNexusUser(req, discordUser, member, roleNames, nexusRank) {
  const base44 = createClientFromRequest(req);
  const now = new Date().toISOString();
  const discordId = String(discordUser.id);
  const seededCallsign = deriveSeedCallsign(member, discordUser);

  const existing = (await base44.asServiceRole.entities.NexusUser.filter({ discord_id: discordId }))?.[0];

  if (existing) {
    await base44.asServiceRole.entities.NexusUser.update(existing.id, {
      callsign: existing.callsign || seededCallsign,
      discord_handle: discordUser.username || null,
      discord_avatar: discordUser.avatar || null,
      discord_roles: roleNames,
      nexus_rank: nexusRank,
      roles_synced_at: now,
    });
    return { ...existing, onboarding_complete: existing.onboarding_complete ?? false };
  }

  await base44.asServiceRole.entities.NexusUser.create({
    callsign: seededCallsign,
    discord_id: discordId,
    discord_handle: discordUser.username || null,
    discord_avatar: discordUser.avatar || null,
    discord_roles: roleNames,
    nexus_rank: nexusRank,
    joined_at: now,
    roles_synced_at: now,
    onboarding_complete: false,
  });

  const created = (await base44.asServiceRole.entities.NexusUser.filter({ discord_id: discordId }))?.[0];
  return created || null;
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return gateErrorRedirect('missing_params', req);
  }

  const cookies = parseCookies(req);
  const signedState = await decodeSignedPayload(cookies[STATE_COOKIE_NAME]);

  if (!signedState || signedState.state !== state) {
    console.warn('[auth/discord/callback] State mismatch or expired');
    return gateErrorRedirect('state_mismatch', req);
  }

  try {
    const { access_token: accessToken } = await exchangeDiscordCode(code);
    const discordUser = await fetchDiscordUser(accessToken);
    const guildMember = await fetchGuildMember(discordUser.id);

    if (!guildMember) {
      return gateErrorRedirect('not_in_guild', req, new Headers(), signedState.app_base || '');
    }

    const { roleNames, nexusRank } = await mapGuildRolesToRank(guildMember.roles);

    if (!nexusRank) {
      return gateErrorRedirect('role_not_allowed', req, new Headers(), signedState.app_base || '');
    }

    const nexusUser = await upsertNexusUser(req, discordUser, guildMember, roleNames, nexusRank);

    if (!nexusUser) {
      return gateErrorRedirect('auth_failed', req, new Headers(), signedState.app_base || '');
    }

    const sessionValue = await encodeSignedPayload({
      discord_id: discordUser.id,
      iat: Date.now(),
      exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    });

    const headers = new Headers({ 'Cache-Control': 'no-store' });
    setCookieHeader(headers, SESSION_COOKIE_NAME, sessionValue, req, { maxAge: SESSION_MAX_AGE_SECONDS });
    setCookieHeader(headers, STATE_COOKIE_NAME, '', req, { maxAge: 0 });

    const redirectPath = nexusUser.onboarding_complete
      ? (signedState.redirect_to || '/app/industry')
      : '/onboarding';

    return appRedirect(redirectPath, req, headers, signedState.app_base || '');
  } catch (error) {
    console.error('[auth/discord/callback]', error);
    return gateErrorRedirect('callback_failed', req, new Headers(), signedState.app_base || '');
  }
});