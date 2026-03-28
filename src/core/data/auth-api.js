import { getAppParams } from '@/core/data/app-params';
import { getBase44Client } from '@/core/data/base44Client';

export const AUTH_REQUEST_TIMEOUT_MS = 6000;

function buildFunctionUrl(functionPath) {
  const origin = typeof window === 'undefined' ? 'http://127.0.0.1' : window.location.origin;
  return new URL(`/api/functions/${functionPath}`, origin);
}

async function parseJson(response) {
  try { return await response.json(); } catch { return null; }
}

async function parseApiResponse(response) {
  const data = await parseJson(response);
  return { ok: response.ok, status: response.status, ...(data || {}) };
}

/**
 * Build auth headers that include the Base44 platform access token.
 * This ensures createClientFromRequest(req) in backend functions can
 * establish asServiceRole context even for unauthenticated browser requests.
 */
function authHeaders(extra = {}) {
  const headers = { ...extra };
  const { appId, token } = getAppParams();
  if (appId) {
    headers['X-Base44-App-Id'] = appId;
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Also pull any headers the SDK client normally sends
  try {
    const client = /** @type {any} */ (getBase44Client());
    if (client && typeof client.getHeaders === 'function') {
      const sdkHeaders = client.getHeaders();
      if (sdkHeaders && typeof sdkHeaders === 'object') {
        Object.entries(sdkHeaders).forEach(([key, value]) => {
          if (value && !headers[key]) {
            headers[key] = value;
          }
        });
      }
    }
  } catch {
    // SDK client not yet initialized
  }
  return headers;
}

async function fetchWithTimeout(url, init = {}, timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
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
      headers: authHeaders(),
    }, timeoutMs);

    return parseApiResponse(response);
  },

  async login(username, key, /** @type {LoginOptions} */ options = {}) {
    const { rememberMe = false, timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = options;
    const response = await fetchWithTimeout(buildFunctionUrl('auth/login'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ username, key, remember_me: rememberMe }),
    }, timeoutMs);

    return parseApiResponse(response);
  },

  async register(username, key, /** @type {LoginOptions} */ options = {}) {
    const { rememberMe = false, timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = options;
    const response = await fetchWithTimeout(buildFunctionUrl('auth/register'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ username, key, remember_me: rememberMe }),
    }, timeoutMs);

    return parseApiResponse(response);
  },

  async getSession(/** @type {TimeoutOptions} */ { timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const response = await fetchWithTimeout(buildFunctionUrl('auth/session'), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: authHeaders(),
    }, timeoutMs);

    const data = await parseApiResponse(response);
    if (!response.ok) {
      return { authenticated: false, ...(data || {}), status: response.status };
    }
    return { ...(data || {}), status: response.status };
  },

  async logout(/** @type {TimeoutOptions} */ { timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const response = await fetchWithTimeout(buildFunctionUrl('auth/logout'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: authHeaders(),
    }, timeoutMs);

    return parseApiResponse(response);
  },

  async listManagedUsers(/** @type {TimeoutOptions} */ { timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const response = await fetchWithTimeout(buildFunctionUrl('auth/keys'), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: authHeaders(),
    }, timeoutMs);

    return parseApiResponse(response);
  },

  async issueAuthKey(/** @type {KeyIssueOptions} */ { username, callsign, nexusRank, timeoutMs = AUTH_REQUEST_TIMEOUT_MS }) {
    const response = await fetchWithTimeout(buildFunctionUrl('auth/keys'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        action: 'issue',
        username,
        callsign,
        nexus_rank: nexusRank,
      }),
    }, timeoutMs);

    return parseApiResponse(response);
  },

  async revokeAuthKey(/** @type {KeyMutationOptions} */ { userId, timeoutMs = AUTH_REQUEST_TIMEOUT_MS }) {
    const response = await fetchWithTimeout(buildFunctionUrl('auth/keys'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        action: 'revoke',
        user_id: userId,
      }),
    }, timeoutMs);

    return parseApiResponse(response);
  },

  async regenerateAuthKey(/** @type {KeyMutationOptions} */ { userId, timeoutMs = AUTH_REQUEST_TIMEOUT_MS }) {
    const response = await fetchWithTimeout(buildFunctionUrl('auth/keys'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        action: 'regenerate',
        user_id: userId,
      }),
    }, timeoutMs);

    return parseApiResponse(response);
  },

  async updateManagedUserRank({ userId, nexusRank, timeoutMs = AUTH_REQUEST_TIMEOUT_MS }) {
    const response = await fetchWithTimeout(buildFunctionUrl('auth/keys'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        action: 'update_rank',
        user_id: userId,
        nexus_rank: nexusRank,
      }),
    }, timeoutMs);

    return parseApiResponse(response);
  },

  async completeOnboarding({ consentGiven = true, aiEnabled = true, consentVersion = '1.0', timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const response = await fetchWithTimeout(buildFunctionUrl('completeOnboarding'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        consent_given: consentGiven,
        ai_features_enabled: aiEnabled,
        consent_version: consentVersion,
      }),
    }, timeoutMs);

    return parseApiResponse(response);
  },

  async bootstrapSystemAdmin(/** @type {BootstrapSystemAdminOptions} */ { recoveryToken, reset = false, timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const payload = {
      ...(recoveryToken ? { recovery_token: recoveryToken } : {}),
      ...(reset ? { reset: true } : {}),
    };
    const response = await fetchWithTimeout(buildFunctionUrl('auth/bootstrap'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    }, timeoutMs);

    return parseApiResponse(response);
  },

  async runAuthRoundtrip(/** @type {TimeoutOptions} */ { timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const response = await fetchWithTimeout(buildFunctionUrl('auth/roundtrip'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: authHeaders(),
    }, timeoutMs);

    return parseApiResponse(response);
  },

  async heartbeat(/** @type {TimeoutOptions} */ { timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const response = await fetchWithTimeout(buildFunctionUrl('heartbeat'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: authHeaders(),
    }, timeoutMs);

    return parseApiResponse(response);
  },

  async runProdReadiness(action = 'full_audit', payload = {}, /** @type {TimeoutOptions} */ { timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const response = await fetchWithTimeout(buildFunctionUrl('prodReadiness'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        action,
        ...payload,
      }),
    }, timeoutMs);

    return parseApiResponse(response);
  },

  async cleanupProdReadinessRecords(records, /** @type {TimeoutOptions} */ { timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const response = await fetchWithTimeout(buildFunctionUrl('prodReadiness'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        action: 'cleanup_records',
        records,
      }),
    }, timeoutMs);

    return parseApiResponse(response);
  },
};
