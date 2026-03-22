// Self-contained Discord OAuth callback handler — apex canonical
// All redirects go to APP_URL origin (https://nomadnexus.space)

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const SESSION_COOKIE_NAME = 'nexus_member_session';
const STATE_COOKIE_NAME = 'nexus_oauth_state';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const enc = new TextEncoder();

// ── Crypto helpers ────────────────────────────────────────────────────────────

function toBase64Url(bytes) {
  const binary = Array.from(bytes, b => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

async function getSigningKey() {
  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) throw new Error('SESSION_SIGNING_SECRET not set');
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function signValue(value) {
  const key = await getSigningKey();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return toBase64Url(new Uint8Array(sig));
}

async function encodeSignedPayload(payload) {
  const body = toBase64Url(enc.encode(JSON.stringify(payload)));
  const sig = await signValue(body);
  return `${body}.${sig}`;
}

async function decodeSignedPayload(token) {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = await signValue(body);
  if (sig !== expected) return null;
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
    const idx = trimmed.indexOf('=');
    if (idx === -1) return acc;
    acc[trimmed.slice(0, idx)] = decodeURIComponent(trimmed.slice(idx + 1));
    return acc;
  }, {});
}

// ── URL helpers — always use APP_URL origin ───────────────────────────────────

function apexOrigin() {
  const appUrl = Deno.env.get('APP_URL') || '';
  if (!appUrl) throw new Error('APP_URL not set');
  return new URL(appUrl).origin; // always https://nomadnexus.space
}

function isSecure(req) {
  const appUrl = Deno.env.get('APP_URL') || '';
  return appUrl.startsWith('https://') ||
    new URL(req.url).protocol === 'https:' ||
    (req.headers.get('x-forwarded-proto') || '').includes('https');
}

function cookieHeader(name, value, req, maxAge) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    'HttpOnly',
  ];
  if (isSecure(req)) parts.push('Secure');
  return parts.join('; ');
}

function clearCookieHeader(name, req) {
  return cookieHeader(name, '', req, 0);
}

function gateRedirect(errorCode, headers) {
  const target = new URL('/', apexOrigin());
  target.searchParams.set('error', errorCode);
  headers.set('Location', target.toString());
  return new Response(null, { status: 302, headers });
}

function appRedirect(path, headers) {
  const target = new URL(path, apexOrigin());
  headers.set('Location', target.toString());
  return new Response(null, { status: 302, headers });
}

// ── Discord API helpers ───────────────────────────────────────────────────────

async function exchangeCode(code) {
  const clientId = Deno.env.get('DISCORD_CLIENT_ID');
  const clientSecret = Deno.env.get('DISCORD_CLIENT_SECRET');
  const redirectUri = Deno.env.get('DISCORD_REDIRECT_URI');

  const res = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function fetchDiscordUser(accessToken) {
  const res = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Discord user fetch failed: ${res.status}`);
  return res.json();
}

async function fetchGuildMember(userId) {
  const guildId = Deno.env.get('DISCORD_GUILD_ID');
  const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Guild member fetch failed: ${res.status}`);
  return res.json();
}

const ROLE_PRIORITY = [
  { roleName: 'The Pioneer', nexusRank: 'PIONEER' },
  { roleName: 'Pioneer', nexusRank: 'PIONEER' },
  { roleName: 'Founder', nexusRank: 'FOUNDER' },
  { roleName: 'Voyager', nexusRank: 'VOYAGER' },
  { roleName: 'Scout', nexusRank: 'SCOUT' },
  { roleName: 'Vagrant', nexusRank: 'VAGRANT' },
  { roleName: 'Affiliate', nexusRank: 'AFFILIATE' },
];

async function mapRolesToRank(roleIds) {
  const guildId = Deno.env.get('DISCORD_GUILD_ID');
  const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  if (!res.ok) throw new Error(`Guild roles fetch failed: ${res.status}`);
  const guildRoles = await res.json();
  const roleById = new Map(guildRoles.map(r => [r.id, r.name]));
  const roleNames = roleIds.map(id => roleById.get(id)).filter(Boolean);
  const matched = ROLE_PRIORITY.find(({ roleName }) => roleNames.includes(roleName));
  return { roleNames, nexusRank: matched?.nexusRank || null };
}

function sanitizeCallsign(v) {
  const n = v.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return n || null;
}

async function upsertNexusUser(req, discordUser, member, roleNames, nexusRank) {
  const base44 = createClientFromRequest(req);
  const now = new Date().toISOString();
  const discordId = String(discordUser.id);
  const callsign = sanitizeCallsign(member.nick || discordUser.global_name || discordUser.username || `NOMAD-${discordUser.id.slice(-4)}`) || `NOMAD-${discordUser.id.slice(-4)}`;
  const existing = (await base44.asServiceRole.entities.NexusUser.filter({ discord_id: discordId }))?.[0];

  if (existing) {
    await base44.asServiceRole.entities.NexusUser.update(existing.id, {
      callsign: existing.callsign || callsign,
      discord_handle: discordUser.username || null,
      discord_avatar: discordUser.avatar || null,
      discord_roles: roleNames,
      nexus_rank: nexusRank,
      roles_synced_at: now,
    });
    return { ...existing, callsign: existing.callsign || callsign, nexus_rank: nexusRank, isNew: false };
  }

  await base44.asServiceRole.entities.NexusUser.create({
    callsign,
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
  return created ? { ...created, isNew: true } : null;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const headers = new Headers({ 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', clearCookieHeader(STATE_COOKIE_NAME, req));

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return gateRedirect('missing_params', headers);
  }

  const cookies = parseCookies(req);
  const signedState = await decodeSignedPayload(cookies[STATE_COOKIE_NAME]);

  if (!signedState || signedState.state !== state) {
    console.warn('[auth/discord/callback] State mismatch or expired');
    return gateRedirect('state_mismatch', headers);
  }

  try {
    const { access_token: accessToken } = await exchangeCode(code);
    const discordUser = await fetchDiscordUser(accessToken);
    const guildMember = await fetchGuildMember(String(discordUser.id));

    if (!guildMember) return gateRedirect('not_in_guild', headers);

    const { roleNames, nexusRank } = await mapRolesToRank(guildMember.roles);
    if (!nexusRank) return gateRedirect('role_not_allowed', headers);

    const nexusUser = await upsertNexusUser(req, discordUser, guildMember, roleNames, nexusRank);
    if (!nexusUser) return gateRedirect('auth_failed', headers);

    headers.append('Set-Cookie', cookieHeader(SESSION_COOKIE_NAME, await encodeSignedPayload({
      discord_id: String(discordUser.id),
      iat: Date.now(),
      exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    }), req, SESSION_MAX_AGE_SECONDS));

    const redirectPath = nexusUser.onboarding_complete
      ? (signedState.redirect_to || '/app/industry')
      : '/onboarding';

    return appRedirect(redirectPath, headers);
  } catch (error) {
    console.error('[auth/discord/callback]', error);
    return gateRedirect('callback_failed', headers);
  }
});