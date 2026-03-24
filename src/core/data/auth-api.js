import { base44 } from '@/core/data/base44Client';

export const AUTH_REQUEST_TIMEOUT_MS = 6000;

const FALLBACK_AUTH_ORIGIN = 'https://nexus-nomad-core.base44.app';

function getAuthOrigin() {
  if (typeof window === 'undefined') return FALLBACK_AUTH_ORIGIN;
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return FALLBACK_AUTH_ORIGIN;
  return window.location.origin;
}

function buildFunctionUrl(functionPath) {
  const origin = getAuthOrigin();
  return new URL(`${origin}/api/functions/${functionPath}`);
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
 * Call a backend function via the Base44 SDK (which includes platform auth headers).
 * Falls back to raw fetch if needed (e.g. for cookie-setting endpoints).
 */
async function sdkInvoke(functionPath, payload = {}) {
  const response = await base44.functions.invoke(functionPath, payload);
  return response?.data ?? response;
}

/**
 * Call a backend function via raw fetch (needed for endpoints that set cookies).
 * Includes credentials: 'include' so cookies are sent and received.
 */
async function rawPost(functionPath, payload = {}, timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
  const response = await fetchWithTimeout(buildFunctionUrl(functionPath), {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, timeoutMs);
  return (await parseJson(response)) || {};
}

async function rawGet(functionPath, timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
  const response = await fetchWithTimeout(buildFunctionUrl(functionPath), {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  }, timeoutMs);
  const data = await parseJson(response);
  if (!response.ok) {
    return { authenticated: false, ...(data || {}), status: response.status };
  }
  return { ...(data || {}), status: response.status };
}

/** @typedef {{ timeoutMs?: number }} TimeoutOptions */
/** @typedef {{ rememberMe?: boolean, timeoutMs?: number }} LoginOptions */
/** @typedef {{ username: string, callsign?: string, nexusRank: string, timeoutMs?: number }} KeyIssueOptions */
/** @typedef {{ userId: string, timeoutMs?: number }} KeyMutationOptions */
/** @typedef {{ recoveryToken?: string, reset?: boolean, timeoutMs?: number }} BootstrapSystemAdminOptions */

export const authApi = {
  async getHealth({ timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const response = await fetchWithTimeout(buildFunctionUrl('auth/health'), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    }, timeoutMs);
    const data = await parseJson(response);
    return { ok: response.ok, ...(data || {}) };
  },

  /**
   * Login — uses SDK invoke for service-role auth, then raw fetch to set session cookie.
   */
  async login(username, key, options = {}) {
    const { rememberMe = false } = options;
    const payload = { username, key, remember_me: rememberMe };

    // Use SDK invoke so createClientFromRequest gets proper platform auth
    try {
      const sdkResult = await sdkInvoke('auth/login', payload);

      // If SDK call succeeded, we also need to set the cookie via raw fetch
      if (sdkResult?.success) {
        // Do a raw fetch to set the session cookie in the browser
        await rawPost('auth/login', payload);
      }
      return sdkResult || {};
    } catch {
      // Fallback to raw fetch
      return rawPost('auth/login', payload);
    }
  },

  async register(username, key, options = {}) {
    const { rememberMe = false } = options;
    const payload = { username, key, remember_me: rememberMe };

    try {
      const sdkResult = await sdkInvoke('auth/register', payload);
      if (sdkResult?.success) {
        await rawPost('auth/register', payload);
      }
      return sdkResult || {};
    } catch {
      return rawPost('auth/register', payload);
    }
  },

  async getSession({ timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    // Session check needs both: SDK for service-role DB access, and cookie for session validation
    try {
      const result = await sdkInvoke('auth/session', { _method: 'GET' });
      return result || { authenticated: false };
    } catch {
      return rawGet('auth/session', timeoutMs);
    }
  },

  async logout({ timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    // Logout needs raw fetch to clear cookies
    const response = await fetchWithTimeout(buildFunctionUrl('auth/logout'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    }, timeoutMs);
    return parseJson(response);
  },

  async listManagedUsers({ timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
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

  async issueAuthKey({ username, callsign, nexusRank, timeoutMs = AUTH_REQUEST_TIMEOUT_MS }) {
    try {
      return await sdkInvoke('auth/keys', {
        action: 'issue',
        username,
        callsign,
        nexus_rank: nexusRank,
      });
    } catch {
      return rawPost('auth/keys', {
        action: 'issue',
        username,
        callsign,
        nexus_rank: nexusRank,
      }, timeoutMs);
    }
  },

  async revokeAuthKey({ userId, timeoutMs = AUTH_REQUEST_TIMEOUT_MS }) {
    try {
      return await sdkInvoke('auth/keys', { action: 'revoke', user_id: userId });
    } catch {
      return rawPost('auth/keys', { action: 'revoke', user_id: userId }, timeoutMs);
    }
  },

  async regenerateAuthKey({ userId, timeoutMs = AUTH_REQUEST_TIMEOUT_MS }) {
    try {
      return await sdkInvoke('auth/keys', { action: 'regenerate', user_id: userId });
    } catch {
      return rawPost('auth/keys', { action: 'regenerate', user_id: userId }, timeoutMs);
    }
  },

  async updateManagedUserRank({ userId, nexusRank, timeoutMs = AUTH_REQUEST_TIMEOUT_MS }) {
    try {
      return await sdkInvoke('auth/keys', {
        action: 'update_rank',
        user_id: userId,
        nexus_rank: nexusRank,
      });
    } catch {
      return rawPost('auth/keys', {
        action: 'update_rank',
        user_id: userId,
        nexus_rank: nexusRank,
      }, timeoutMs);
    }
  },

  async completeOnboarding({ consentGiven = true, aiEnabled = true, consentVersion = '1.0' } = {}) {
    try {
      return await sdkInvoke('completeOnboarding', {
        consent_given: consentGiven,
        ai_features_enabled: aiEnabled,
        consent_version: consentVersion,
      });
    } catch {
      return rawPost('completeOnboarding', {
        consent_given: consentGiven,
        ai_features_enabled: aiEnabled,
        consent_version: consentVersion,
      });
    }
  },

  async bootstrapSystemAdmin({ recoveryToken, reset = false, timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const payload = {
      ...(recoveryToken ? { recovery_token: recoveryToken } : {}),
      ...(reset ? { reset: true } : {}),
    };
    try {
      return await sdkInvoke('auth/bootstrap', payload);
    } catch {
      return rawPost('auth/bootstrap', payload, timeoutMs);
    }
  },
};