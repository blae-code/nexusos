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

/** @typedef {{ timeoutMs?: number }} TimeoutOptions */
/** @typedef {{ rememberMe?: boolean, timeoutMs?: number }} LoginOptions */
/** @typedef {{ username: string, callsign?: string, nexusRank: string, timeoutMs?: number }} KeyIssueOptions */
/** @typedef {{ userId: string, timeoutMs?: number }} KeyMutationOptions */
/** @typedef {{ recoveryToken?: string, reset?: boolean, timeoutMs?: number }} BootstrapSystemAdminOptions */

export const authApi = {
  async getHealth(/** @type {TimeoutOptions} */ { timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const response = await fetchWithTimeout(buildFunctionUrl('auth/health/entry'), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    }, timeoutMs);

    const data = await parseJson(response);
    return { ok: response.ok, ...(data || {}) };
  },

  async login(username, key, /** @type {LoginOptions} */ options = {}) {
    const { rememberMe = false, timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = options;
    const response = await fetchWithTimeout(buildFunctionUrl('auth/login/entry'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, key, remember_me: rememberMe }),
    }, timeoutMs);

    return (await parseJson(response)) || {};
  },

  async register(username, key, /** @type {LoginOptions} */ options = {}) {
    const { rememberMe = false, timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = options;
    const response = await fetchWithTimeout(buildFunctionUrl('auth/register/entry'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, key, remember_me: rememberMe }),
    }, timeoutMs);

    return (await parseJson(response)) || {};
  },

  async getSession(/** @type {TimeoutOptions} */ { timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const response = await fetchWithTimeout(buildFunctionUrl('auth/session/entry'), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    }, timeoutMs);

    const data = await parseJson(response);
    if (!response.ok) {
      return { authenticated: false, ...(data || {}), status: response.status };
    }
    return { ...(data || {}), status: response.status };
  },

  async logout(/** @type {TimeoutOptions} */ { timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const response = await fetchWithTimeout(buildFunctionUrl('auth/logout/entry'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    }, timeoutMs);

    return parseJson(response);
  },

  async listManagedUsers(/** @type {TimeoutOptions} */ { timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const response = await fetchWithTimeout(buildFunctionUrl('auth/keys/entry'), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    }, timeoutMs);

    return (await parseJson(response)) || {};
  },

  async issueAuthKey(/** @type {KeyIssueOptions} */ { username, callsign, nexusRank, timeoutMs = AUTH_REQUEST_TIMEOUT_MS }) {
    const response = await fetchWithTimeout(buildFunctionUrl('auth/keys/entry'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'issue',
        username,
        callsign,
        nexus_rank: nexusRank,
      }),
    }, timeoutMs);

    return (await parseJson(response)) || {};
  },

  async revokeAuthKey(/** @type {KeyMutationOptions} */ { userId, timeoutMs = AUTH_REQUEST_TIMEOUT_MS }) {
    const response = await fetchWithTimeout(buildFunctionUrl('auth/keys/entry'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'revoke',
        user_id: userId,
      }),
    }, timeoutMs);

    return (await parseJson(response)) || {};
  },

  async regenerateAuthKey(/** @type {KeyMutationOptions} */ { userId, timeoutMs = AUTH_REQUEST_TIMEOUT_MS }) {
    const response = await fetchWithTimeout(buildFunctionUrl('auth/keys/entry'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'regenerate',
        user_id: userId,
      }),
    }, timeoutMs);

    return (await parseJson(response)) || {};
  },

  async bootstrapSystemAdmin(/** @type {BootstrapSystemAdminOptions} */ { recoveryToken, reset = false, timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const payload = {
      ...(recoveryToken ? { recovery_token: recoveryToken } : {}),
      ...(reset ? { reset: true } : {}),
    };
    const response = await fetchWithTimeout(buildFunctionUrl('auth/bootstrap/entry'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, timeoutMs);

    return (await parseJson(response)) || {};
  },
};
