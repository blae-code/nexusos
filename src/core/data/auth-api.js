import { IS_DEV_MODE, getDevPersona, buildDevSession, clearDevPersona } from '@/core/data/dev';

export const AUTH_REQUEST_TIMEOUT_MS = 6000;
const DISCORD_CLIENT_ID = '1483421250301989057';
const DISCORD_REDIRECT_URI = 'https://nexus-nomad-core.base44.app/api/functions/auth/discord/callback';

function buildFunctionUrl(functionPath) {
  const base = 'https://nexus-nomad-core.base44.app/api/functions';
  return `${base}/${functionPath}`;
}

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url, init = {}, timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export const authApi = {
  getDiscordOAuthUrl(redirectTo = '/app/industry') {
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      redirect_uri: DISCORD_REDIRECT_URI,
      response_type: 'code',
      scope: 'identify guilds guilds.members.read',
      state: btoa(JSON.stringify({ redirectTo, timestamp: Date.now() })),
    });
    return `https://discord.com/oauth2/authorize?${params.toString()}`;
  },

  async getHealth({ timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    if (IS_DEV_MODE) {
      return { ok: true, status: 200, oauth_ready: true, guild_label: 'REDSCAR NOMADS', support_channel_label: '#nexusos-ops', invite_url: '#' };
    }

    const response = await fetchWithTimeout(buildFunctionUrl('auth/health/entry'), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    }, timeoutMs);

    const data = await parseJson(response);
    return {
      ok: response.ok,
      status: response.status,
      ...(data || {}),
    };
  },

  async getSession({ timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    if (IS_DEV_MODE) {
      const persona = getDevPersona();
      if (persona) return buildDevSession(persona);
      return { authenticated: false, status: 401 };
    }

    const response = await fetchWithTimeout(buildFunctionUrl('auth/session/entry'), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    }, timeoutMs);

    const data = await parseJson(response);
    if (!response.ok) {
      return {
        authenticated: false,
        ...(data || {}),
        status: response.status,
      };
    }

    return {
      ...(data || {}),
      status: response.status,
    };
  },

  async logout({ timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    if (IS_DEV_MODE) {
      clearDevPersona();
      return { ok: true };
    }

    const response = await fetchWithTimeout(buildFunctionUrl('auth/logout/entry'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    }, timeoutMs);

    return parseJson(response);
  },
};