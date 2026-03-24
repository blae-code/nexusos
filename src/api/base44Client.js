import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

const entityProxyCache = new WeakMap();
const entitiesProxyCache = new WeakMap();

function normalizeCollectionResponse(value) {
  return Array.isArray(value) ? value : [];
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

//Create a client with authentication required
const client = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

export const base44 = new Proxy(client, {
  get(target, property) {
    if (property === 'entities') {
      return wrapEntities(target.entities);
    }
    const value = target[property];
    return typeof value === 'function' ? value.bind(target) : value;
  },
});
