import { createClient } from '@base44/sdk';
import { getAppParams } from '@/core/data/app-params';

/** @typedef {ReturnType<typeof createClient>} Base44Client */

/** @type {Base44Client | null} */
let cachedClient = null;
const entityProxyCache = new WeakMap();
const entitiesProxyCache = new WeakMap();

function normalizeCollectionResponse(value) {
  return Array.isArray(value) ? value : [];
}

function resolveBase44Origin(value) {
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

function wrapEntity(entity) {
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
        return async (...args) => normalizeCollectionResponse(await value.apply(target, args));
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
      return wrapEntity(target[property]);
    },
  });

  entitiesProxyCache.set(entities, proxy);
  return proxy;
}

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
