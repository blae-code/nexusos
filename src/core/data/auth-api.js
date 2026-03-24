import { base44 } from '@/core/data/base44Client';

export const AUTH_REQUEST_TIMEOUT_MS = 6000;

const FALLBACK_AUTH_ORIGIN = 'https://nexus-nomad-core.base44.app';

function getAuthOrigin() {
  if (typeof window === 'undefined') return FALLBACK_AUTH_ORIGIN;
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return FALLBACK_AUTH_ORIGIN;
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
  try { return await response.json(); } catch { return null; }
}

async function fetchWithTimeout(url, init = {}, timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * Call a backend function via the Base44 SDK.
 * This ensures platform auth headers are included so asServiceRole works.
 */
async function sdkInvoke(functionPath, payload = {}) {
  const response = await base44.functions.invoke(functionPath, payload);
  return response?.data ?? response;
}

/** @typedef {{ timeoutMs?: number }} TimeoutOptions */
/** @typedef {{ rememberMe?: boolean, timeoutMs?: number }} LoginOptions */
/** @typedef {{ username: string, callsign?: string, nexusRank: string, timeoutMs?: number }} KeyIssueOptions */
/** @typedef {{ userId: string, timeoutMs?: number }} KeyMutationOptions */
/** @typedef {{ recoveryToken?: string, reset?: boolean, timeoutMs?: number }} BootstrapSystemAdminOptions */

export const authApi = {
  async getHealth(/** @type {TimeoutOptions} */ { timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const response = await fetchWithTimeout(buildFunctionUrl('auth/health'), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    }, timeoutMs);

    const data = await parseJson(response);
    return { ok: response.ok, ...(data || {}) };
  },

  async login(username, key, /** @type {LoginOptions} */ options = {}) {
    const { rememberMe = false } = options;
    // Use SDK invoke so backend gets platform auth for asServiceRole access
    const result = await sdkInvoke('auth/login', { username, key, remember_me: rememberMe });
    return result || {};
  },

  async register(username, key, /** @type {LoginOptions} */ options = {}) {
    const { rememberMe = false } = options;
    const result = await sdkInvoke('auth/register', { username, key, remember_me: rememberMe });
    return result || {};
  },

  async getSession(/** @type {TimeoutOptions} */ { timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    // Session check uses SDK invoke for service-role DB access
    try {
      const result = await sdkInvoke('auth/session', {});
      if (result && (result.authenticated !== undefined || result.user)) return result;
      return { authenticated: false };
    } catch {
      return { authenticated: false };
    }
  },

  async logout(/** @type {TimeoutOptions} */ { timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    // Logout uses SDK invoke
    try {
      return await sdkInvoke('auth/logout', {});
    } catch {
      // Fallback: raw fetch to clear any cookies
      const response = await fetchWithTimeout(buildFunctionUrl('auth/logout'), {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      }, timeoutMs);
      return parseJson(response);
    }
  },

  async listManagedUsers(/** @type {TimeoutOptions} */ { timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    try {
      return await sdkInvoke('auth/keys', { _method: 'GET' });
    } catch {
      const response = await fetchWithTimeout(buildFunctionUrl('auth/keys'), {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      }, timeoutMs);
      return (await parseJson(response)) || {};
    }
  },

  async issueAuthKey(/** @type {KeyIssueOptions} */ { username, callsign, nexusRank, timeoutMs = AUTH_REQUEST_TIMEOUT_MS }) {
    return sdkInvoke('auth/keys', {
      action: 'issue',
      username,
      callsign,
      nexus_rank: nexusRank,
    });
  },

  async revokeAuthKey(/** @type {KeyMutationOptions} */ { userId, timeoutMs = AUTH_REQUEST_TIMEOUT_MS }) {
    return sdkInvoke('auth/keys', {
      action: 'revoke',
      user_id: userId,
    });
  },

  async regenerateAuthKey(/** @type {KeyMutationOptions} */ { userId, timeoutMs = AUTH_REQUEST_TIMEOUT_MS }) {
    return sdkInvoke('auth/keys', {
      action: 'regenerate',
      user_id: userId,
    });
  },

  async updateManagedUserRank({ userId, nexusRank, timeoutMs = AUTH_REQUEST_TIMEOUT_MS }) {
    return sdkInvoke('auth/keys', {
      action: 'update_rank',
      user_id: userId,
      nexus_rank: nexusRank,
    });
  },

  async completeOnboarding({ consentGiven = true, aiEnabled = true, consentVersion = '1.0', timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    return sdkInvoke('completeOnboarding', {
      consent_given: consentGiven,
      ai_features_enabled: aiEnabled,
      consent_version: consentVersion,
    });
  },

  async bootstrapSystemAdmin(/** @type {BootstrapSystemAdminOptions} */ { recoveryToken, reset = false, timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    return sdkInvoke('auth/bootstrap', {
      ...(recoveryToken ? { recovery_token: recoveryToken } : {}),
      ...(reset ? { reset: true } : {}),
    });
  },
};