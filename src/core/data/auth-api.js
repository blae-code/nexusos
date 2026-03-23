import {
  IS_DEV_MODE,
  IS_LOCAL_SIMULATION_MODE,
  IS_SHARED_SANDBOX_MODE,
  clearDevPersona,
  setDevPersona,
} from '@/core/data/dev';
import { base44 } from '@/core/data/base44Client';
import { getLocalDemoSession } from '@/core/data/dev/localDemoSession';
import { sharedSandboxApi } from '@/core/data/dev/sharedSandboxApi';

export const AUTH_REQUEST_TIMEOUT_MS = 6000;

const FALLBACK_AUTH_ORIGIN = 'https://nexus-nomad-core.base44.app';
const DEV_KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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

function normalizeLoginName(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeCallsign(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function generateDevAuthKey() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (byte) => DEV_KEY_CHARS[byte % DEV_KEY_CHARS.length]).join('');
  return `RSN-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

function serializeManagedUser(user) {
  const loginName = normalizeLoginName(user?.login_name || user?.username || user?.callsign);
  return {
    id: user?.id,
    username: loginName,
    login_name: loginName,
    callsign: user?.callsign || user?.login_name || user?.username || 'NOMAD',
    nexus_rank: String(user?.nexus_rank || user?.rank || 'AFFILIATE').toUpperCase(),
    key_prefix: user?.key_prefix || null,
    key_issued_by: user?.key_issued_by || null,
    key_issued_at: user?.key_issued_at || null,
    key_revoked: user?.key_revoked === true,
    joined_at: user?.joined_at || null,
    onboarding_complete: user?.onboarding_complete ?? false,
    last_seen_at: user?.last_seen_at || null,
    is_admin: String(user?.nexus_rank || user?.rank || '').toUpperCase() === 'PIONEER' || user?.is_admin === true,
  };
}

function isSandboxManagedMode() {
  return IS_LOCAL_SIMULATION_MODE || IS_SHARED_SANDBOX_MODE;
}

async function listManagedUsersInSandbox() {
  const users = await base44.entities.NexusUser.list('-created_date', 500);
  return { users: (users || []).map(serializeManagedUser) };
}

async function issueAuthKeyInSandbox({ username, callsign, nexusRank }) {
  const loginName = normalizeLoginName(username);
  const displayCallsign = normalizeCallsign(callsign || username);
  const users = await base44.entities.NexusUser.list('-created_date', 500);

  if ((users || []).some((candidate) => normalizeLoginName(candidate?.login_name || candidate?.username || candidate?.callsign) === loginName)) {
    return { error: 'username_taken' };
  }

  if ((users || []).some((candidate) => normalizeCallsign(candidate?.callsign || '') === displayCallsign)) {
    return { error: 'callsign_taken' };
  }

  const key = generateDevAuthKey();
  const created = await base44.entities.NexusUser.create({
    login_name: loginName,
    callsign: displayCallsign,
    nexus_rank: nexusRank,
    key_prefix: key.slice(0, 8),
    key_issued_by: 'DEV-SANDBOX',
    key_issued_at: new Date().toISOString(),
    key_revoked: false,
    onboarding_complete: false,
    auth_key_hash: 'dev-only',
    is_admin: String(nexusRank || '').toUpperCase() === 'PIONEER',
  });

  return {
    key,
    key_prefix: key.slice(0, 8),
    user: serializeManagedUser(created),
  };
}

async function revokeAuthKeyInSandbox(userId) {
  await base44.entities.NexusUser.update(userId, {
    key_revoked: true,
    session_invalidated_at: new Date().toISOString(),
  });
  return { ok: true };
}

async function regenerateAuthKeyInSandbox(userId) {
  const key = generateDevAuthKey();
  await base44.entities.NexusUser.update(userId, {
    key_prefix: key.slice(0, 8),
    key_issued_by: 'DEV-SANDBOX',
    key_issued_at: new Date().toISOString(),
    key_revoked: false,
    session_invalidated_at: new Date().toISOString(),
    auth_key_hash: 'dev-only',
  });
  const users = await base44.entities.NexusUser.filter({ id: userId });
  return {
    key,
    key_prefix: key.slice(0, 8),
    user: users?.[0] ? serializeManagedUser(users[0]) : null,
  };
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
/** @typedef {{ email?: string, timeoutMs?: number }} AdminLoginOptions */
/** @typedef {{ rememberMe?: boolean, timeoutMs?: number }} LoginOptions */
/** @typedef {{ username: string, callsign?: string, nexusRank: string, timeoutMs?: number }} KeyIssueOptions */
/** @typedef {{ userId: string, timeoutMs?: number }} KeyMutationOptions */

export const authApi = {
  async getHealth(/** @type {TimeoutOptions} */ { timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    if (IS_DEV_MODE) {
      return { ok: true, status: 'ok', auth_mode: 'issued_key', remember_me_supported: true };
    }

    const response = await fetchWithTimeout(buildFunctionUrl('auth/health/entry'), {
      method: 'GET', credentials: 'include', cache: 'no-store',
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
    if (IS_SHARED_SANDBOX_MODE) {
      try { return await sharedSandboxApi.getSession(); } catch (error) {
        return { authenticated: false, status: error?.status || 503, error: error?.message || 'Sandbox session unavailable' };
      }
    }

    if (IS_LOCAL_SIMULATION_MODE) {
      const session = getLocalDemoSession();
      if (session) return session;
      return { authenticated: false, status: 401 };
    }

    const response = await fetchWithTimeout(buildFunctionUrl('auth/session/entry'), {
      method: 'GET', credentials: 'include', cache: 'no-store',
    }, timeoutMs);

    const data = await parseJson(response);
    if (!response.ok) {
      return { authenticated: false, ...(data || {}), status: response.status };
    }
    return { ...(data || {}), status: response.status };
  },

  async logout(/** @type {TimeoutOptions} */ { timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    if (IS_SHARED_SANDBOX_MODE) {
      return sharedSandboxApi.logout();
    }

    if (IS_LOCAL_SIMULATION_MODE) {
      clearDevPersona();
      return { ok: true };
    }

    const response = await fetchWithTimeout(buildFunctionUrl('auth/logout/entry'), {
      method: 'POST', credentials: 'include', cache: 'no-store',
    }, timeoutMs);

    return parseJson(response);
  },

  async setDemoPersona(personaId) {
    if (IS_SHARED_SANDBOX_MODE) return sharedSandboxApi.setPersona(personaId);
    if (IS_LOCAL_SIMULATION_MODE) { setDevPersona(personaId); return { ok: true, persona_id: personaId }; }
    throw new Error('Demo persona switching is only available in collaboration mode.');
  },

  /**
   * @param {AdminLoginOptions} [options]
   */
  async adminLogin(options = {}) {
    const { email, timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = options;
    const url = buildFunctionUrl('adminLogin/entry');
    const response = await fetchWithTimeout(url, {
      method: 'POST', credentials: 'include', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }, timeoutMs);
    return parseJson(response);
  },

  async resetDemoSandbox() {
    if (!IS_SHARED_SANDBOX_MODE) return { ok: false, skipped: true };
    return sharedSandboxApi.reset();
  },

  async getDemoState(options = {}) {
    if (!IS_SHARED_SANDBOX_MODE) return null;
    return sharedSandboxApi.getState(options);
  },

  async listManagedUsers(/** @type {TimeoutOptions} */ { timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    if (isSandboxManagedMode()) {
      return listManagedUsersInSandbox();
    }

    const response = await fetchWithTimeout(buildFunctionUrl('auth/keys/entry'), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    }, timeoutMs);

    return (await parseJson(response)) || {};
  },

  async issueAuthKey(/** @type {KeyIssueOptions} */ { username, callsign, nexusRank, timeoutMs = AUTH_REQUEST_TIMEOUT_MS }) {
    if (isSandboxManagedMode()) {
      return issueAuthKeyInSandbox({ username, callsign, nexusRank });
    }

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
    if (isSandboxManagedMode()) {
      return revokeAuthKeyInSandbox(userId);
    }

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
    if (isSandboxManagedMode()) {
      return regenerateAuthKeyInSandbox(userId);
    }

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
};
