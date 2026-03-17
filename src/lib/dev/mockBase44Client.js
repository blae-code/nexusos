import { mockStore } from './mockStore';

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

function createEntityController(entityType) {
  return {
    async list(sortField = '-created_date', limit = 100) {
      return sortItems(mockStore.getAll(entityType), sortField).slice(0, limit);
    },
    async filter(params, sortField = '-created_date', limit = 500) {
      const filtered = mockStore.getAll(entityType).filter(item =>
        Object.entries(params).every(([key, value]) => item[key] === value),
      );
      return sortItems(filtered, sortField).slice(0, limit);
    },
    async get(id) {
      return mockStore.get(entityType, id);
    },
    async create(data) {
      return mockStore.create(entityType, data);
    },
    async update(id, data) {
      return mockStore.update(entityType, id, data);
    },
    async delete(id) {
      return mockStore.delete(entityType, id);
    },
    subscribe(callback) {
      return mockStore.subscribe(entityType, callback);
    },
  };
}

export function createMockBase44Client() {
  const entityCache = {};

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
        // [DEV] mock functions.invoke: no-op in simulation mode
        return { success: true, message: '[DEV] mock response' };
      },
    },

    auth: {
      async me() { return null; },
      logout(redirectUrl) {
        if (redirectUrl) window.location.assign(redirectUrl);
      },
      redirectToLogin() {
        window.location.assign('/');
      },
    },
  };
}
