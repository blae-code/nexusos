import { getAppBasePath } from '@/core/data/app-base-path';
import { base44 } from '@/api/base44Client';
import {
  IS_DEV_MODE,
  IS_LOCAL_SIMULATION_MODE,
  IS_SHARED_SANDBOX_MODE,
  clearDevPersona,
  getDevPersona,
  setDevPersona,
} from '@/core/data/dev';
import { getLocalDemoSession } from '@/core/data/dev/localDemoSession';
import { sharedSandboxApi } from '@/core/data/dev/sharedSandboxApi';

export const AUTH_REQUEST_TIMEOUT_MS = 6000;

// Only fall back to the Base44 origin on localhost dev — never in production
const FALLBACK_AUTH_ORIGIN = 'https://nexus-nomad-core.base44.app';

function getAuthOrigin() {
  if (typeof window === 'undefined') return FALLBACK_AUTH_ORIGIN;
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return FALLBACK_AUTH_ORIGIN;
  }
  // All non-localhost sessions use same-origin auth routes
  return window.location.origin;
}

function buildFunctionUrl(functionPath, searchParams) {
  const origin = getAuthOrigin();
  const url = new URL(`${origin}/api/functions/${functionPath}`);
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
    return buildFunctionUrl('auth/discord/start/entry', {
      redirect_to: redirectTo,
      app_base: getAppBasePath(),
    }).toString();
  },

  async getHealth({ timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    if (IS_DEV_MODE) {
      return {
        ok: true,
        status: 200,
        oauth_ready: true,
        guild_label: 'REDSCAR NOMADS',
        support_channel_label: '#nexusos-collab',
        invite_url: '#',
        mode: IS_SHARED_SANDBOX_MODE ? 'shared_sandbox' : 'local_simulation',
      };
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
    if (IS_SHARED_SANDBOX_MODE) {
      try {
        return await sharedSandboxApi.getSession();
      } catch (error) {
        return {
          authenticated: false,
          status: error?.status || 503,
          error: error?.message || 'Sandbox session unavailable',
        };
      }
    }

    if (IS_LOCAL_SIMULATION_MODE) {
      const session = getLocalDemoSession();
      if (session) return session;
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
    if (IS_SHARED_SANDBOX_MODE) {
      return sharedSandboxApi.logout();
    }

    if (IS_LOCAL_SIMULATION_MODE) {
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
  async setDemoPersona(personaId) {
    if (IS_SHARED_SANDBOX_MODE) {
      return sharedSandboxApi.setPersona(personaId);
    }

    if (IS_LOCAL_SIMULATION_MODE) {
      setDevPersona(personaId);
      return { ok: true, persona_id: personaId };
    }

    throw new Error('Demo persona switching is only available in collaboration mode.');
  },

  async adminLogin({ email, timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const response = await fetchWithTimeout(buildFunctionUrl('adminLogin/entry'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }, timeoutMs);
    return parseJson(response);
  },

  async resetDemoSandbox() {
    if (!IS_SHARED_SANDBOX_MODE) {
      return { ok: false, skipped: true };
    }

    return sharedSandboxApi.reset();
  },

  async getDemoState(options = {}) {
    if (!IS_SHARED_SANDBOX_MODE) {
      return null;
    }

    return sharedSandboxApi.getState(options);
  },
};