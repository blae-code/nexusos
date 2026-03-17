import crypto from 'node:crypto';
import {
  exchangeCode,
  getAuthUrl,
  getGuildMember,
  getUserProfile,
  syncRoles,
  verifyMembership,
} from './discord.js';
import { verifyOrgMembership } from './rsi.js';

const DEFAULT_POST_LOGIN_PATH = '/app/industry';
const SESSION_COOKIE = 'nexus_member_session';
const STATE_COOKIE = 'nexus_oauth_state';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const STATE_MAX_AGE_SECONDS = 60 * 10;

const nexusUserStore = new Map();

function base44AppUrl() {
  return (process.env.BASE44_APP_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function sessionSecret() {
  return process.env.SESSION_SECRET || 'replace-me';
}

function appUrl(pathname, searchParams = {}) {
  const url = new URL(pathname, `${base44AppUrl()}/`);
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function sanitizeRedirectTarget(value) {
  if (!value || typeof value !== 'string') return DEFAULT_POST_LOGIN_PATH;
  if (!value.startsWith('/')) return DEFAULT_POST_LOGIN_PATH;
  if (value.startsWith('//')) return DEFAULT_POST_LOGIN_PATH;
  return value;
}

function parseCookies(header = '') {
  return header.split(';').reduce((acc, chunk) => {
    const trimmed = chunk.trim();
    if (!trimmed) return acc;
    const separator = trimmed.indexOf('=');
    if (separator < 0) return acc;
    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function serializeCookie(name, value, options = {}) {
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
  if (base44AppUrl().startsWith('https://')) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function appendCookie(res, cookieValue) {
  const current = res.getHeader('Set-Cookie');
  if (!current) {
    res.setHeader('Set-Cookie', [cookieValue]);
    return;
  }

  const next = Array.isArray(current) ? [...current, cookieValue] : [current, cookieValue];
  res.setHeader('Set-Cookie', next);
}

function signPayload(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', sessionSecret())
    .update(body)
    .digest('base64url');
  return `${body}.${signature}`;
}

function verifyPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = crypto
    .createHmac('sha256', sessionSecret())
    .update(body)
    .digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function clearCookie(res, name) {
  appendCookie(res, serializeCookie(name, '', { maxAge: 0 }));
}

function currentSession(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const payload = verifyPayload(cookies[SESSION_COOKIE]);
  if (!payload?.discord_id) {
    return null;
  }

  const record = nexusUserStore.get(String(payload.discord_id));
  if (!record) {
    return null;
  }

  return {
    authenticated: true,
    source: 'member',
    user: {
      id: record.id,
      discordId: record.discord_id,
      callsign: record.callsign,
      rank: record.nexus_rank,
      discordRoles: record.discord_roles,
      joinedAt: record.joined_at,
      rsiVerified: Boolean(record.rsi_verified),
    },
  };
}

async function upsertNexusUserRecord(profile, guildMember, roleSync, rsiVerified, options = {}) {
  const existing = nexusUserStore.get(String(profile.id));
  const now = new Date().toISOString();
  const callsign = guildMember.nick || profile.global_name || profile.username || `NOMAD-${String(profile.id).slice(-4)}`;

  const record = {
    id: existing?.id || `nexus-user-${profile.id}`,
    discord_id: String(profile.id),
    callsign,
    discord_roles: roleSync.discordRoles,
    nexus_rank: roleSync.nexusRank,
    roles_synced_at: now,
    joined_at: existing?.joined_at || now,
    rsi_verified: Boolean(rsiVerified),
  };

  nexusUserStore.set(String(profile.id), record);

  if (typeof options.onUpsertNexusUser === 'function') {
    await options.onUpsertNexusUser(record, { profile, guildMember, roleSync, rsiVerified });
  }

  return record;
}

function buildSessionRecord(record) {
  return {
    authenticated: true,
    source: 'member',
    user: {
      id: record.id,
      discordId: record.discord_id,
      callsign: record.callsign,
      rank: record.nexus_rank,
      discordRoles: record.discord_roles,
      joinedAt: record.joined_at,
      rsiVerified: Boolean(record.rsi_verified),
    },
  };
}

function stateFromRequest(req) {
  const redirectTo = sanitizeRedirectTarget(req.query.redirect_to || DEFAULT_POST_LOGIN_PATH);
  const value = signPayload({
    nonce: crypto.randomUUID(),
    redirect_to: redirectTo,
    exp: Date.now() + (STATE_MAX_AGE_SECONDS * 1000),
  });

  return {
    redirectTo,
    cookieValue: value,
    state: verifyPayload(value)?.nonce,
  };
}

function assertState(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const stateCookie = verifyPayload(cookies[STATE_COOKIE]);
  const stateFromQuery = req.query.state;

  if (!stateCookie?.nonce || !stateFromQuery || stateCookie.nonce !== stateFromQuery) {
    return null;
  }

  return stateCookie;
}

export function registerHeraldBotRoutes(app, options = {}) {
  app.get('/auth/discord', async (req, res) => {
    try {
      const { cookieValue, state } = stateFromRequest(req);
      appendCookie(res, serializeCookie(STATE_COOKIE, cookieValue, { maxAge: STATE_MAX_AGE_SECONDS }));
      res.redirect(getAuthUrl({ state }));
    } catch (error) {
      res.redirect(appUrl('/gate', { error: 'oauth_unavailable' }));
    }
  });

  app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    const statePayload = assertState(req);

    clearCookie(res, STATE_COOKIE);

    if (!code || !statePayload) {
      res.redirect(appUrl('/gate', { error: 'expired_state' }));
      return;
    }

    try {
      const tokenResponse = await exchangeCode(code);
      const profile = await getUserProfile(tokenResponse.access_token);
      const guildMember = await getGuildMember(tokenResponse.access_token, process.env.DISCORD_GUILD_ID);

      if (!guildMember) {
        res.redirect(appUrl('/gate', { error: 'not_in_guild' }));
        return;
      }

      if (!verifyMembership(guildMember)) {
        res.redirect(appUrl('/gate', { error: 'role_not_allowed' }));
        return;
      }

      const roleSync = syncRoles(guildMember);
      if (!roleSync.nexusRank) {
        res.redirect(appUrl('/gate', { error: 'role_not_allowed' }));
        return;
      }

      const rsiHandle = req.query.rsi_handle || req.query.rsiHandle || null;
      const rsiVerified = rsiHandle ? await verifyOrgMembership(rsiHandle) : false;

      const nexusUser = await upsertNexusUserRecord(profile, guildMember, roleSync, rsiVerified, options);
      const sessionValue = signPayload({
        discord_id: nexusUser.discord_id,
        exp: Date.now() + (SESSION_MAX_AGE_SECONDS * 1000),
      });

      appendCookie(res, serializeCookie(SESSION_COOKIE, sessionValue, { maxAge: SESSION_MAX_AGE_SECONDS }));
      res.redirect(appUrl(statePayload.redirect_to || DEFAULT_POST_LOGIN_PATH));
    } catch (error) {
      res.redirect(appUrl('/gate', { error: 'callback_failed' }));
    }
  });

  app.post('/auth/logout', (req, res) => {
    clearCookie(res, SESSION_COOKIE);
    res.redirect(appUrl('/gate'));
  });

  app.get('/auth/me', (req, res) => {
    const session = currentSession(req);
    if (!session) {
      res.status(401).json({ authenticated: false });
      return;
    }

    res.json(session);
  });

  return app;
}

export function createHeraldBotApp(express, options = {}) {
  const app = express();
  app.use(express.json());
  return registerHeraldBotRoutes(app, options);
}

export default {
  createHeraldBotApp,
  registerHeraldBotRoutes,
};
