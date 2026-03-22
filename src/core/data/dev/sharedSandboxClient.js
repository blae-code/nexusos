import { invokeDemoFunction } from './demoFunctionMocks';
import { sharedSandboxApi } from './sharedSandboxApi';

function sortItems(items, sortField) {
  if (!sortField) return items;
  const desc = sortField.startsWith('-');
  const field = desc ? sortField.slice(1) : sortField;
  return [...items].sort((a, b) => {
    const va = a[field] ?? '';
    const vb = b[field] ?? '';
    if (va < vb) return desc ? 1 : -1;
    if (va > vb) return desc ? -1 : 1;
    return 0;
  });
}

function createUploadResult(file) {
  if (typeof window !== 'undefined' && file instanceof File) {
    return {
      file_url: URL.createObjectURL(file),
      file_name: file.name,
      content_type: file.type,
    };
  }

  return {
    file_url: `demo://upload/${file?.name || 'asset'}`,
    file_name: file?.name || 'asset',
    content_type: file?.type || 'application/octet-stream',
  };
}

export function createSharedSandboxClient() {
  const entityCache = {};
  const subscriptions = new Map();
  let stateCache = null;
  let sessionCache = null;
  let pollIntervalId = null;
  let lastVersion = null;

  async function loadState({ force = false, metaOnly = false } = {}) {
    if (!force && stateCache && !metaOnly) {
      return stateCache;
    }

    const payload = await sharedSandboxApi.getState({ metaOnly });
    if (metaOnly) {
      return payload;
    }

    stateCache = {
      entities: payload.entities || {},
      meta: payload.meta || {},
      version: payload.version ?? 0,
    };
    lastVersion = stateCache.version;
    return stateCache;
  }

  async function loadSession({ force = false } = {}) {
    if (!force && sessionCache) {
      return sessionCache;
    }

    const payload = await sharedSandboxApi.getSession();
    sessionCache = payload;
    return payload;
  }

  function notifyEntity(entityType, event) {
    const callbacks = subscriptions.get(entityType) || [];
    callbacks.forEach((callback) => callback(event));
  }

  function stopPolling() {
    if (pollIntervalId && subscriptions.size === 0) {
      window.clearInterval(pollIntervalId);
      pollIntervalId = null;
    }
  }

  function ensurePolling() {
    if (typeof window === 'undefined' || pollIntervalId || subscriptions.size === 0) {
      return;
    }

    pollIntervalId = window.setInterval(async () => {
      try {
        const previousVersion = lastVersion;
        const meta = await loadState({ force: true, metaOnly: true });
        if (meta.version != null && meta.version !== previousVersion) {
          stateCache = null;
          lastVersion = meta.version;
          subscriptions.forEach((callbacks, entityType) => {
            callbacks.forEach((callback) => callback({ type: 'refresh', entityType, version: meta.version }));
          });
        }
      } catch (error) {
        console.warn('[sharedSandboxClient] poll failed:', error?.message || error);
      }
    }, 3000);
  }

  function createEntityController(entityType) {
    return {
      async list(sortField = '-created_date', limit = 100) {
        const state = await loadState();
        const records = Array.isArray(state.entities[entityType]) ? state.entities[entityType] : [];
        return sortItems(records, sortField).slice(0, limit);
      },
      async filter(params, sortField = '-created_date', limit = 500) {
        const state = await loadState();
        const records = Array.isArray(state.entities[entityType]) ? state.entities[entityType] : [];
        const filtered = records.filter((item) =>
          Object.entries(params).every(([key, value]) => item[key] === value),
        );
        return sortItems(filtered, sortField).slice(0, limit);
      },
      async get(id) {
        const state = await loadState();
        return (Array.isArray(state.entities[entityType]) ? state.entities[entityType] : []).find((item) => item.id === id) || null;
      },
      async create(data) {
        const payload = await sharedSandboxApi.mutate({ action: 'create', entityType, data });
        stateCache = null;
        lastVersion = payload.version ?? lastVersion;
        notifyEntity(entityType, { type: 'create', record: payload.record });
        return payload.record;
      },
      async update(id, data) {
        const payload = await sharedSandboxApi.mutate({ action: 'update', entityType, id, data });
        stateCache = null;
        sessionCache = null;
        lastVersion = payload.version ?? lastVersion;
        notifyEntity(entityType, { type: 'update', record: payload.record });
        return payload.record;
      },
      async delete(id) {
        const payload = await sharedSandboxApi.mutate({ action: 'delete', entityType, id });
        stateCache = null;
        lastVersion = payload.version ?? lastVersion;
        notifyEntity(entityType, { type: 'delete', id: payload.id || id });
        return payload;
      },
      subscribe(callback) {
        const callbacks = subscriptions.get(entityType) || [];
        callbacks.push(callback);
        subscriptions.set(entityType, callbacks);
        ensurePolling();

        return () => {
          const current = subscriptions.get(entityType) || [];
          const next = current.filter((candidate) => candidate !== callback);
          if (next.length === 0) {
            subscriptions.delete(entityType);
          } else {
            subscriptions.set(entityType, next);
          }
          stopPolling();
        };
      },
    };
  }

  return {
    entities: new Proxy({}, {
      get(_, entityType) {
        if (!entityCache[entityType]) {
          entityCache[entityType] = createEntityController(entityType);
        }
        return entityCache[entityType];
      },
    }),

    functions: {
      async invoke(name, payload) {
        return invokeDemoFunction(name, payload, {
          getState: () => loadState({ force: true }),
          saveSecret: async (secretId, value) => {
            await sharedSandboxApi.mutate({ action: 'set_meta_secret', secretId, value });
            stateCache = null;
          },
        });
      },
    },

    integrations: {
      Core: {
        async UploadFile({ file }) {
          return createUploadResult(file);
        },
      },
    },

    auth: {
      async me() {
        const payload = await loadSession({ force: true });
        return payload?.user || null;
      },
      async logout(redirectUrl) {
        await sharedSandboxApi.logout();
        sessionCache = null;
        if (redirectUrl && typeof window !== 'undefined') {
          window.location.assign(redirectUrl);
        }
      },
      redirectToLogin(redirectUrl = '/') {
        if (typeof window !== 'undefined') {
          window.location.assign(redirectUrl);
        }
      },
    },
  };
}
