import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const enc = new TextEncoder();

export const SESSION_COOKIE_NAME = 'nexus_member_session';
export const STATE_COOKIE_NAME = 'nexus_oauth_state';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const STATE_MAX_AGE_SECONDS = 60 * 10;

const ROLE_PRIORITY = [
  { roleName: 'The Pioneer', nexusRank: 'PIONEER' },
  { roleName: 'Founder', nexusRank: 'FOUNDER' },
  { roleName: 'Voyager', nexusRank: 'VOYAGER' },
  { roleName: 'Scout', nexusRank: 'SCOUT' },
  { roleName: 'Vagrant', nexusRank: 'VAGRANT' },
  { roleName: 'Affiliate', nexusRank: 'AFFILIATE' },
];

type SignedPayload = {
  exp: number;
  iat?: number;
  [key: string]: unknown;
};

type DiscordTokenResponse = {
  access_token: string;
  token_type: string;
};

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

type DiscordGuildMember = {
  nick?: string | null;
  roles: string[];
};

type DiscordRole = {
  id: string;
  name: string;
};

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
  if (!secret) {
    throw new Error('SESSION_SIGNING_SECRET is not configured');
  }

  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function signValue(value: string): Promise<string> {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

export async function encodeSignedPayload(payload: SignedPayload): Promise<string> {
  const serialized = JSON.stringify(payload);
  const body = toBase64Url(enc.encode(serialized));
  const signature = await signValue(body);
  return `${body}.${signature}`;
}

export async function decodeSignedPayload<T extends SignedPayload>(token?: string | null): Promise<T | null> {
  if (!token) return null;

  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = await signValue(body);
  if (signature !== expected) return null;

  try {
    const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as T;
    if (!decoded.exp || decoded.exp < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function parseCookies(req: Request): Record<string, string> {
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

function cookieParts(name: string, value: string, req: Request, options: {
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
} = {}) {
  const appUrl = Deno.env.get('APP_URL') || '';
  const reqUrl = new URL(req.url);
  const secure = appUrl.startsWith('https://')
    || reqUrl.protocol === 'https:'
    || (req.headers.get('x-forwarded-proto') || '').includes('https');

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

export function setCookie(headers: Headers, name: string, value: string, req: Request, options?: {
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
}) {
  headers.append('Set-Cookie', cookieParts(name, value, req, options));
}

export function clearCookie(headers: Headers, name: string, req: Request) {
  headers.append('Set-Cookie', cookieParts(name, '', req, { maxAge: 0 }));
}

export function normalizeRedirectTo(raw: string | null): string {
  if (!raw) return '/app/industry';
  if (!raw.startsWith('/')) return '/app/industry';
  if (raw.startsWith('//')) return '/app/industry';
  if (!raw.startsWith('/app')) return '/app/industry';
  return raw;
}

export function normalizeAppBase(raw: string | null): string {
  if (!raw || raw === '/') return '';
  if (!raw.startsWith('/')) return '';
  if (raw.startsWith('//')) return '';
  if (raw.includes('?') || raw.includes('#')) return '';

  const trimmed = raw.endsWith('/') ? raw.slice(0, -1) : raw;
  return trimmed === '/' ? '' : trimmed;
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

export async function buildDiscordAuthorizeUrl(req: Request, redirectTo: string, appBase = '') {
  const { clientId, redirectUri } = getDiscordConfig();
  const state = crypto.randomUUID().replace(/-/g, '');
  const signedState = await encodeSignedPayload({
    state,
    redirect_to: redirectTo,
    app_base: appBase,
    exp: Date.now() + (STATE_MAX_AGE_SECONDS * 1000),
  });

  const url = new URL('https://discord.com/api/v10/oauth2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'identify');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'consent');

  const headers = new Headers({ Location: url.toString() });
  setCookie(headers, STATE_COOKIE_NAME, signedState, req, { maxAge: STATE_MAX_AGE_SECONDS });
  return headers;
}

async function discordFetch(path: string, init: RequestInit, useBotToken = false) {
  const { botToken } = getDiscordConfig();
  const headers = new Headers(init.headers || {});
  if (useBotToken) {
    headers.set('Authorization', `Bot ${botToken}`);
  }

  const response = await fetch(`https://discord.com/api/v10${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Discord request failed: ${response.status} ${body}`);
  }

  return response.json();
}

export async function exchangeDiscordCode(code: string): Promise<DiscordTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getDiscordConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Discord token exchange failed: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<DiscordTokenResponse>;
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  return discordFetch('/users/@me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  }) as Promise<DiscordUser>;
}

export async function fetchGuildMember(userId: string): Promise<DiscordGuildMember | null> {
  const { guildId } = getDiscordConfig();
  const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
    method: 'GET',
    headers: { Authorization: `Bot ${getDiscordConfig().botToken}` },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Guild member lookup failed: ${response.status} ${body}`);
  }

  return response.json() as Promise<DiscordGuildMember>;
}

export async function mapGuildRolesToRank(roleIds: string[]) {
  const { guildId } = getDiscordConfig();
  const guildRoles = await discordFetch(`/guilds/${guildId}/roles`, { method: 'GET' }, true) as DiscordRole[];
  const roleById = new Map(guildRoles.map(role => [role.id, role.name]));
  const roleNames = roleIds.map(id => roleById.get(id)).filter(Boolean) as string[];

  const matched = ROLE_PRIORITY.find(({ roleName }) => roleNames.includes(roleName));
  return {
    roleNames,
    nexusRank: matched?.nexusRank || null,
  };
}

function sanitizeCallsign(value: string) {
  const normalized = value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

  return normalized || null;
}

export function deriveSeedCallsign(member: DiscordGuildMember, user: DiscordUser) {
  return sanitizeCallsign(
    member.nick
      || user.global_name
      || user.username
      || `NOMAD-${user.id.slice(-4)}`
  ) || `NOMAD-${user.id.slice(-4)}`;
}

export async function upsertNexusUser(req: Request, discordUser: DiscordUser, member: DiscordGuildMember, roleNames: string[], nexusRank: string) {
  const base44 = createClientFromRequest(req);
  const now = new Date().toISOString();
  const discordId = String(discordUser.id);
  const seededCallsign = deriveSeedCallsign(member, discordUser);
  const discordHandle = discordUser.username || null;
  const discordAvatar = discordUser.avatar || null;
  const existing = (await base44.asServiceRole.entities.NexusUser.filter({ discord_id: discordId }))?.[0];

  if (existing) {
    const nextCallsign = existing.callsign || seededCallsign;
    await base44.asServiceRole.entities.NexusUser.update(existing.id, {
      callsign: nextCallsign,
      discord_handle: discordHandle,
      discord_avatar: discordAvatar,
      discord_roles: roleNames,
      nexus_rank: nexusRank,
      roles_synced_at: now,
    });

    return {
      ...existing,
      callsign: nextCallsign,
      discord_handle: discordHandle,
      discord_avatar: discordAvatar,
      discord_roles: roleNames,
      nexus_rank: nexusRank,
      roles_synced_at: now,
      isNew: false,
    };
  }

  await base44.asServiceRole.entities.NexusUser.create({
    callsign: seededCallsign,
    discord_id: discordId,
    discord_handle: discordHandle,
    discord_avatar: discordAvatar,
    discord_roles: roleNames,
    nexus_rank: nexusRank,
    joined_at: now,
    roles_synced_at: now,
    onboarding_complete: false,
  });

  const created = (await base44.asServiceRole.entities.NexusUser.filter({ discord_id: discordId }))?.[0];
  return created ? { ...created, isNew: true } : null;
}

export async function createSessionCookieValue(discordId: string) {
  return encodeSignedPayload({
    discord_id: discordId,
    iat: Date.now(),
    exp: Date.now() + (SESSION_MAX_AGE_SECONDS * 1000),
  });
}

export async function resolveMemberSession(req: Request) {
  const cookies = parseCookies(req);
  const payload = await decodeSignedPayload<{ discord_id: string; iat: number }>(cookies[SESSION_COOKIE_NAME]);
  if (!payload?.discord_id || !payload?.iat) return null;

  const base44 = createClientFromRequest(req);
  const user = (await base44.asServiceRole.entities.NexusUser.filter({ discord_id: String(payload.discord_id) }))?.[0];
  if (!user) return null;

  const invalidatedAt = user.session_invalidated_at ? new Date(user.session_invalidated_at).getTime() : 0;
  if (invalidatedAt && invalidatedAt > payload.iat) {
    return null;
  }

  if (!user.callsign) {
    return null;
  }

  return {
    authenticated: true,
    source: 'member',
    user: {
      id: user.id,
      discordId: String(user.discord_id),
      callsign: user.callsign,
      rank: user.nexus_rank || 'AFFILIATE',
      discordRoles: user.discord_roles || [],
      joinedAt: user.joined_at || null,
      onboarding_complete: user.onboarding_complete ?? false,
    },
  };
}

export function sessionNoStoreHeaders() {
  return {
    'Cache-Control': 'no-store',
  };
}

function resolveAppUrl(req: Request, appBase = '') {
  const configured = Deno.env.get('APP_URL') || new URL(req.url).origin;
  const normalizedBase = normalizeAppBase(appBase);
  if (normalizedBase) {
    return new URL(`${normalizedBase}/`, configured);
  }

  const configuredUrl = new URL(configured);
  const configuredPath = configuredUrl.pathname && configuredUrl.pathname !== '/'
    ? (configuredUrl.pathname.endsWith('/') ? configuredUrl.pathname : `${configuredUrl.pathname}/`)
    : '/';

  return new URL(configuredPath, configuredUrl);
}

export function gateErrorRedirect(errorCode: string, req: Request, headers = new Headers(), appBase = '') {
  const target = resolveAppUrl(req, appBase);
  target.searchParams.set('error', errorCode);
  headers.set('Location', target.toString());
  return new Response(null, { status: 302, headers });
}

export function appRedirect(targetPath: string, req: Request, headers = new Headers(), appBase = '') {
  const target = resolveAppUrl(req, appBase);
  if (targetPath && targetPath !== '/') {
    target.searchParams.set('redirect_to', targetPath);
  }
  headers.set('Location', target.toString());
  return new Response(null, { status: 302, headers });
}
