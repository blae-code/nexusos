import { getBase44Client } from '@/core/data/base44Client';

export const AUTH_REQUEST_TIMEOUT_MS = 6000;

const SESSION_TOKEN_KEY = 'nexus_session_token';

/** Store the session token in localStorage for SDK-based session calls */
function storeSessionToken(token) {
  if (token) {
    try { localStorage.setItem(SESSION_TOKEN_KEY, token); } catch { /* noop */ }
  }
}

/** Retrieve stored session token */
function getSessionToken() {
  try { return localStorage.getItem(SESSION_TOKEN_KEY) || null; } catch { return null; }
}

/** Clear stored session token */
function clearSessionToken() {
  try { localStorage.removeItem(SESSION_TOKEN_KEY); } catch { /* noop */ }
}

/**
 * Call a backend function via the Base44 SDK.
 * Tries invoke() first, falls back to fetch(), then falls back to direct HTTP.
 * This ensures platform auth headers are included so asServiceRole works in the backend.
 */
async function sdkInvoke(functionPath, payload = {}) {
  const client = getBase44Client();

  // Try SDK invoke first (standard approach)
  try {
    const response = await client.functions.invoke(functionPath, payload);
    // invoke returns axios response: { data, status, headers }
    return response?.data ?? response;
  } catch (invokeErr) {
    const status = invokeErr?.response?.status || invokeErr?.status;
    // If it's a real backend error (401, 403, 500), don't retry with fetch
    if (status && status !== 404) {
      // Return the error response data if available
      if (invokeErr?.response?.data) return invokeErr.response.data;
      throw invokeErr;
    }
    console.warn(`[auth-api] invoke('${functionPath}') returned 404, trying fetch()`);
  }

  // Fallback: use SDK fetch for nested paths that invoke may not resolve
  try {
    const response = await client.functions.fetch(`/${functionPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (fetchErr) {
    console.warn(`[auth-api] fetch('/${functionPath}') also failed`, fetchErr?.message);
    throw fetchErr;
  }
}

/** @typedef {{ timeoutMs?: number }} TimeoutOptions */
/** @typedef {{ rememberMe?: boolean, timeoutMs?: number }} LoginOptions */
/** @typedef {{ username: string, callsign?: string, nexusRank: string, timeoutMs?: number }} KeyIssueOptions */
/** @typedef {{ userId: string, timeoutMs?: number }} KeyMutationOptions */
/** @typedef {{ recoveryToken?: string, reset?: boolean, timeoutMs?: number }} BootstrapSystemAdminOptions */

export const authApi = {
  async getHealth({ timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    try {
      return await sdkInvoke('auth/health', { _method: 'GET' });
    } catch {
      return { ok: false };
    }
  },

  async login(username, key, /** @type {LoginOptions} */ options = {}) {
    const { rememberMe = false } = options;
    const result = await sdkInvoke('auth/login', { username, key, remember_me: rememberMe });

    // Store session token for subsequent session checks
    if (result?.session_token) {
      storeSessionToken(result.session_token);
    }

    return result || {};
  },

  async register(username, key, /** @type {LoginOptions} */ options = {}) {
    const { rememberMe = false } = options;
    const result = await sdkInvoke('auth/register', { username, key, remember_me: rememberMe });

    if (result?.session_token) {
      storeSessionToken(result.session_token);
    }

    return result || {};
  },

  async getSession({ timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      return { authenticated: false };
    }

    try {
      const result = await sdkInvoke('auth/session', { session_token: sessionToken });
      if (result?.authenticated === false) {
        // Token is invalid/expired — clear it
        clearSessionToken();
      }
      return result || { authenticated: false };
    } catch {
      return { authenticated: false };
    }
  },

  async logout({ timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    clearSessionToken();
    try {
      return await sdkInvoke('auth/logout', {});
    } catch {
      return { success: true };
    }
  },

  async listManagedUsers({ timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const sessionToken = getSessionToken();
    return sdkInvoke('auth/keys', { _method: 'GET', session_token: sessionToken });
  },

  async issueAuthKey(/** @type {KeyIssueOptions} */ { username, callsign, nexusRank }) {
    const sessionToken = getSessionToken();
    return sdkInvoke('auth/keys', {
      action: 'issue',
      username,
      callsign,
      nexus_rank: nexusRank,
      session_token: sessionToken,
    });
  },

  async revokeAuthKey(/** @type {KeyMutationOptions} */ { userId }) {
    const sessionToken = getSessionToken();
    return sdkInvoke('auth/keys', { action: 'revoke', user_id: userId, session_token: sessionToken });
  },

  async regenerateAuthKey(/** @type {KeyMutationOptions} */ { userId }) {
    const sessionToken = getSessionToken();
    return sdkInvoke('auth/keys', { action: 'regenerate', user_id: userId, session_token: sessionToken });
  },

  async updateManagedUserRank({ userId, nexusRank }) {
    const sessionToken = getSessionToken();
    return sdkInvoke('auth/keys', {
      action: 'update_rank',
      user_id: userId,
      nexus_rank: nexusRank,
      session_token: sessionToken,
    });
  },

  async completeOnboarding({ consentGiven = true, aiEnabled = true, consentVersion = '1.0' } = {}) {
    const sessionToken = getSessionToken();
    return sdkInvoke('completeOnboarding', {
      consent_given: consentGiven,
      ai_features_enabled: aiEnabled,
      consent_version: consentVersion,
      session_token: sessionToken,
    });
  },

  async bootstrapSystemAdmin(/** @type {BootstrapSystemAdminOptions} */ { recoveryToken, reset = false } = {}) {
    return sdkInvoke('auth/bootstrap', {
      ...(recoveryToken ? { recovery_token: recoveryToken } : {}),
      ...(reset ? { reset: true } : {}),
    });
  },
};