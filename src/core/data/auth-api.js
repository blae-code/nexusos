import { getAppBasePath } from '@/core/data/app-base-path';
import { IS_DEV_MODE, getDevPersona, buildDevSession, clearDevPersona } from '@/core/data/dev';

export const AUTH_REQUEST_TIMEOUT_MS = 6000;

function buildFunctionUrl(functionPath, searchParams) {
  const base = 'https://nexus-nomad-core.base44.app/api/functions';
  const url = new URL(`${base}/${functionPath}`);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value != null && value !== '') {
        url.searchParams.set(key, value);
      }
    });
  }
  return url;
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
  getDiscordStartUrl(redirectTo = '/app/industry') {
    return buildFunctionUrl('auth/discord/start', {
      redirect_to: redirectTo,
      app_base: getAppBasePath(),
    }).toString();
  },

  async getHealth({ timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    if (IS_DEV_MODE) {
      return { ok: true, status: 200, oauth_ready: true, guild_label: 'REDSCAR NOMADS', support_channel_label: '#nexusos-ops', invite_url: '#' };
    }

    const response = await fetchWithTimeout(buildFunctionUrl('auth/health'), {
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

    const response = await fetchWithTimeout(buildFunctionUrl('auth/session'), {
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

    const response = await fetchWithTimeout(buildFunctionUrl('auth/logout'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    }, timeoutMs);

    return parseJson(response);
  },
};