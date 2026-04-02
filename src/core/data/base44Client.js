import { createClient } from '@base44/sdk';
import { getAppParams } from '@/core/data/app-params';
import { safeLocalStorage } from '@/core/data/safe-storage';

/** @typedef {ReturnType<typeof createClient>} Base44Client */

/** @type {Base44Client | null} */
let cachedClient = null;
const entityProxyCache = new WeakMap();
const entitiesProxyCache = new WeakMap();

function shouldUseSameOriginProxy() {
  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location?.hostname || '';
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function normalizeCollectionResponse(value) {
  return Array.isArray(value) ? value : [];
}

function resolveBase44Origin(value) {
  if (shouldUseSameOriginProxy()) {
    return window.location.origin;
  }

  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return undefined;
}

/** @returns {Base44Client} */
function createBase44Client() {
  const { appId, token, functionsVersion, appBaseUrl, serverUrl } = getAppParams();
  const resolvedServerUrl = resolveBase44Origin(serverUrl);
  const resolvedAppBaseUrl = resolveBase44Origin(appBaseUrl) || resolvedServerUrl;

  return createClient({
    appId,
    token,
    functionsVersion,
    serverUrl: resolvedServerUrl,
    requiresAuth: false,
    appBaseUrl: resolvedAppBaseUrl,
  });
}

// ── Entity proxy helpers ──────────────────────────────────────────────────

/**
 * Returns true when the frontend SDK has a valid Base44 platform access token.
 * Admin users get one via Base44 native auth; member users do not.
 */
function hasUserToken() {
  const { token } = getAppParams();
  if (token) return true;
  if (typeof window === 'undefined') return false;
  try {
    return !!(
      safeLocalStorage.getItem('base44_access_token') ||
      safeLocalStorage.getItem('token')
    );
  } catch {
    return false;
  }
}

/**
 * Route a read operation through the entityProxy backend function.
 * The function validates the member session cookie server-side and uses
 * service role to fetch entity data, so no platform token is required.
 *
 * @param {string} entityName
 * @param {'list'|'filter'|'get'} action
 * @param {unknown[]} args
 * @returns {Promise<unknown>}
 */
async function proxyEntityRead(entityName, action, args) {
  const origin = typeof window === 'undefined' ? 'http://127.0.0.1' : window.location.origin;
  const url = new URL('/api/functions/entityProxy', origin);
  const { appId } = getAppParams();

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(appId ? { 'X-Base44-App-Id': appId } : {}),
    },
    body: JSON.stringify({ entity: entityName, action, params: args }),
  });

  if (!response.ok) {
    let errMsg = `entityProxy ${response.status}`;
    try {
      const errBody = await response.json();
      if (errBody?.error) errMsg = `entityProxy: ${errBody.error}`;
    } catch { /* ignore */ }
    throw new Error(errMsg);
  }

  const result = await response.json();
  return result?.data ?? null;
}

// ── Entity wrapping ───────────────────────────────────────────────────────

/**
 * @param {object} entity - raw SDK entity handler
 * @param {string} [entityName] - entity collection name, used for proxy routing
 */
function wrapEntity(entity, entityName) {
  if (!entity || typeof entity !== 'object') {
    return entity;
  }

  if (entityProxyCache.has(entity)) {
    return entityProxyCache.get(entity);
  }

  const proxy = new Proxy(entity, {
    get(target, property) {
      const value = target[property];

      if ((property === 'list' || property === 'filter') && typeof value === 'function') {
        return async (...args) => {
          // Route through the cookie-authenticated backend proxy when the
          // frontend has no Base44 platform token (i.e. all member accounts).
          if (entityName && !hasUserToken()) {
            const data = await proxyEntityRead(entityName, property, args);
            return Array.isArray(data) ? data : [];
          }
          return normalizeCollectionResponse(await value.apply(target, args));
        };
      }

      if (property === 'get' && typeof value === 'function') {
        return async (...args) => {
          if (entityName && !hasUserToken()) {
            return proxyEntityRead(entityName, 'get', args);
          }
          return value.apply(target, args);
        };
      }

      return typeof value === 'function' ? value.bind(target) : value;
    },
  });

  entityProxyCache.set(entity, proxy);
  return proxy;
}

function wrapEntities(entities) {
  if (!entities || typeof entities !== 'object') {
    return entities;
  }

  if (entitiesProxyCache.has(entities)) {
    return entitiesProxyCache.get(entities);
  }

  const proxy = new Proxy(entities, {
    get(target, property) {
      // Pass the entity name through so wrapEntity can route reads correctly.
      return wrapEntity(target[property], typeof property === 'string' ? property : undefined);
    },
  });

  entitiesProxyCache.set(entities, proxy);
  return proxy;
}

// ── Public API ────────────────────────────────────────────────────────────

/** @returns {Base44Client} */
export function getBase44Client() {
  if (!cachedClient) {
    cachedClient = createBase44Client();
  }

  return cachedClient;
}

export const base44 = /** @type {Base44Client} */ (new Proxy({}, {
  get(_target, property) {
    const client = getBase44Client();
    if (property === 'entities') {
      return wrapEntities(client.entities);
    }
    const value = client[property];
    return typeof value === 'function' ? value.bind(getBase44Client()) : value;
  },
}));
