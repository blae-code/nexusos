import { SANDBOX_API_BASE } from './index';

function getSandboxBaseUrl() {
  if (SANDBOX_API_BASE) {
    return SANDBOX_API_BASE.endsWith('/') ? SANDBOX_API_BASE : `${SANDBOX_API_BASE}/`;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/`;
  }

  return 'http://localhost/';
}

function buildDemoUrl(path, searchParams) {
  const normalizedPath = path.startsWith('/') ? path : `/api/demo/${path}`;
  const url = new URL(normalizedPath, getSandboxBaseUrl());
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value != null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url;
}

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function request(path, init = {}, searchParams) {
  const response = await fetch(buildDemoUrl(path, searchParams), {
    credentials: 'include',
    cache: 'no-store',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const data = await parseJson(response);
  if (!response.ok) {
    const error = new Error(data?.error || `Demo API request failed with ${response.status}`);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

export const sharedSandboxApi = {
  async getSession() {
    return request('/api/demo/session', { method: 'GET', headers: {} });
  },

  async setPersona(personaId) {
    return request('/api/demo/session', {
      method: 'POST',
      body: JSON.stringify({ action: 'set_persona', persona_id: personaId }),
    });
  },

  async logout() {
    return request('/api/demo/session', {
      method: 'POST',
      body: JSON.stringify({ action: 'logout' }),
    });
  },

  async getState({ metaOnly = false } = {}) {
    return request('/api/demo/state', { method: 'GET', headers: {} }, metaOnly ? { meta: '1' } : undefined);
  },

  async mutate(payload) {
    return request('/api/demo/mutate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async reset() {
    return request('/api/demo/reset', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },
};
