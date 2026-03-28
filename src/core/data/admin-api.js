import { AUTH_REQUEST_TIMEOUT_MS } from '@/core/data/auth-api';

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

async function fetchWithTimeout(url, init = {}, timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

async function post(functionName, payload = {}, timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
  const response = await fetchWithTimeout(buildFunctionUrl(functionName), {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, timeoutMs);

  return parseApiResponse(response);
}

export const adminApi = {
  listEntities(timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
    return post('adminData', { action: 'list_entities' }, timeoutMs);
  },

  listRecords({ entity, query = '', id = '', sort = '', limit = 25, page = 1, recentWindow = 'all' }, timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
    return post('adminData', {
      action: 'list_records',
      entity,
      query,
      id,
      sort,
      limit,
      page,
      recent_window: recentWindow,
    }, timeoutMs);
  },

  getRecord({ entity, id }, timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
    return post('adminData', { action: 'get_record', entity, id }, timeoutMs);
  },

  updateRecord({ entity, id, patch, reason = '' }, timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
    return post('adminData', { action: 'update_record', entity, id, patch, reason }, timeoutMs);
  },

  deactivateRecord({ entity, id, reason }, timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
    return post('adminData', { action: 'deactivate_record', entity, id, reason }, timeoutMs);
  },

  restoreRecord({ entity, id, reason }, timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
    return post('adminData', { action: 'restore_record', entity, id, reason }, timeoutMs);
  },

  deleteRecord({ entity, id, reason }, timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
    return post('adminData', { action: 'delete_record', entity, id, reason }, timeoutMs);
  },

  getActionLog(limit = 20, timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
    return post('adminData', { action: 'get_action_log', limit }, timeoutMs);
  },

  runOperation({ action, reason = '' }, timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
    return post('adminOps', { action, reason }, timeoutMs);
  },
};

export default adminApi;
