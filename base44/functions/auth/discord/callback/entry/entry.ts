import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createHmac } from 'node:crypto';

const enc = new TextEncoder();

const SESSION_COOKIE_NAME = 'nexus_member_session';
const STATE_COOKIE_NAME = 'nexus_oauth_state';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

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
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
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

function cookieParts(name, value, req, options = {}) {
  const appUrl = Deno.env.get('APP_URL') || '';
  const reqUrl = new URL(req.url);
  const secure = appUrl.startsWith('https://') || reqUrl.protocol === 'https:' || (req.headers.get('x-forwarded-proto') || '').includes('https');

  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path || '/'}`,
    'SameSite=Lax',
  ];

  if (typeof options.maxAge === 'number') {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.httpOnly !== false) {
    parts.push('HttpOnly');
  }

  if (secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function setCookie(headers, name, value, req, options) {
  headers.append('Set-Cookie', cookieParts(name, value, req, options));
}

async function exchangeDiscordCode(code) {
  const clientId = Deno.env.get('DISCORD_CLIENT_ID');
  const clientSecret = Deno.env.get('DISCORD_CLIENT_SECRET');
  const redirectUri = Deno.env.get('DISCORD_REDIRECT_URI');

  const response = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return response.json();
}

async function fetchDiscordUser(accessToken) {
  const response = await fetch('https://discord.com/api/v10/users/@me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Fetch user failed: ${response.status}`);
  }

  return response.json();
}

async function fetchGuildMember(userId) {
  const guildId = Deno.env.get('DISCORD_GUILD_ID');
  const botToken = Deno.env.get('DISCORD_BOT_TOKEN');

  const response = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
    {
      method: 'GET',
      headers: { Authorization: `Bot ${botToken}` },
    }
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Guild member lookup failed: ${response.status}`);
  }

  return response.json();
}

async function mapGuildRolesToRank(roleIds) {
  const guildId = Deno.env.get('DISCORD_GUILD_ID');
  const botToken = Deno.env.get('DISCORD_BOT_TOKEN');

  const response = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/roles`,
    {
      method: 'GET',
      headers: { Authorization: `Bot ${botToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Guild roles lookup failed: ${response.status}`);
  }

  const guildRoles = await response.json();
  const roleById = new Map(guildRoles.map(role => [role.id, role.name]));
  const roleNames = roleIds.map(id => roleById.get(id)).filter(Boolean);

  const ROLE_PRIORITY = [
    { roleName: 'The Pioneer', nexusRank: 'PIONEER' },
    { roleName: 'Founder', nexusRank: 'FOUNDER' },
    { roleName: 'Voyager', nexusRank: 'VOYAGER' },
    { roleName: 'Scout', nexusRank: 'SCOUT' },
    { roleName: 'Vagrant', nexusRank: 'VAGRANT' },
    { roleName: 'Affiliate', nexusRank: 'AFFILIATE' },
  ];

  const matched = ROLE_PRIORITY.find(({ roleName }) => roleNames.includes(roleName));
  return {
    roleNames,
    nexusRank: matched?.nexusRank || null,
  };
}

function resolveAppUrl(req, appBase = '') {
  const configured = Deno.env.get('APP_URL') || new URL(req.url).origin;
  const normalizedBase = appBase && appBase !== '/' ? appBase : '';

  const configuredUrl = new URL(configured);
  const configuredPath = configuredUrl.pathname && configuredUrl.pathname !== '/'
    ? (configuredUrl.pathname.endsWith('/') ? configuredUrl.pathname : `${configuredUrl.pathname}/`)
    : '/';

  return new URL(configuredPath, configuredUrl);
}

function appRedirect(targetPath, req, headers = new Headers(), appBase = '') {
  const target = resolveAppUrl(req, appBase);
  if (targetPath && targetPath !== '/') {
    target.pathname = (target.pathname === '/' ? '' : target.pathname) + targetPath;
  }
  headers.set('Location', target.toString());
  return new Response(null, { status: 302, headers });
}

async function createSessionCookieValue(discordId) {
  const payload = JSON.stringify({
    discord_id: discordId,
    iat: Date.now(),
    exp: Date.now() + (SESSION_MAX_AGE_SECONDS * 1000),
  });
  const body = toBase64Url(enc.encode(payload));
  const signature = await signValue(body);
  return `${body}.${signature}`;
}

async function upsertNexusUser(req, discordUser, member, roleNames, nexusRank) {
  const base44 = createClientFromRequest(req);
  const now = new Date().toISOString();
  const discordId = String(discordUser.id);

  const existing = (await base44.asServiceRole.entities.NexusUser.filter({ discord_id: discordId }))?.[0];

  if (existing) {
    await base44.asServiceRole.entities.NexusUser.update(existing.id, {
      discord_roles: roleNames,
      nexus_rank: nexusRank,
      roles_synced_at: now,
    });
    return { ...existing, discord_roles: roleNames, nexus_rank: nexusRank };
  }

  const sanitizeCallsign = (value) => {
    const normalized = value
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    return normalized || `NOMAD-${discordId.slice(-4)}`;
  };

  const callsign = sanitizeCallsign(member.nick || discordUser.global_name || discordUser.username || '');

  const created = await base44.asServiceRole.entities.NexusUser.create({
    callsign,
    discord_id: discordId,
    discord_roles: roleNames,
    nexus_rank: nexusRank,
    joined_at: now,
    roles_synced_at: now,
    onboarding_complete: false,
  });

  return created;
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return new Response(JSON.stringify({ error: 'Missing code or state' }), { status: 400 });
  }

  const cookies = parseCookies(req);
  const signedState = await decodeSignedPayload(cookies[STATE_COOKIE_NAME]);

  if (!signedState || signedState.state !== state) {
    console.warn('[auth/discord/callback] State mismatch or expired');
    return new Response(JSON.stringify({ error: 'State mismatch' }), { status: 403 });
  }

  try {
    const { access_token: accessToken } = await exchangeDiscordCode(code);
    const discordUser = await fetchDiscordUser(accessToken);
    const guildMember = await fetchGuildMember(discordUser.id);

    if (!guildMember) {
      return new Response(JSON.stringify({ error: 'not_in_guild' }), { status: 403 });
    }

    const { roleNames, nexusRank } = await mapGuildRolesToRank(guildMember.roles);

    if (!nexusRank) {
      return new Response(JSON.stringify({ error: 'role_not_allowed' }), { status: 403 });
    }

    const nexusUser = await upsertNexusUser(req, discordUser, guildMember, roleNames, nexusRank);

    if (!nexusUser) {
      return new Response(JSON.stringify({ error: 'auth_failed' }), { status: 500 });
    }

    const sessionValue = await createSessionCookieValue(discordUser.id);
    const headers = new Headers({ 'Cache-Control': 'no-store' });
    setCookie(headers, SESSION_COOKIE_NAME, sessionValue, req, { maxAge: 7 * 24 * 60 * 60 });
    setCookie(headers, STATE_COOKIE_NAME, '', req, { maxAge: 0 });

    const redirectPath = nexusUser.onboarding_complete ? '/app/industry' : '/onboarding';
    return appRedirect(redirectPath, req, headers, signedState.app_base);
  } catch (error) {
    console.error('[auth/discord/callback]', error);
    return new Response(JSON.stringify({ error: 'callback_failed' }), { status: 500 });
  }
});