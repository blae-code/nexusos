import { getAppBasePath } from '@/lib/app-base-path';
import { appParams } from '@/lib/app-params';
import { safeLocalStorage } from '@/lib/safe-storage';

const AUTH_BASE = '/functions/auth';
export const AUTH_REQUEST_TIMEOUT_MS = 6000;

function buildUrl(path, searchParams) {
  const origin = appParams.serverUrl || window.location.origin;
  const url = new URL(`${AUTH_BASE}/${path}`, origin);
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
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url, init = {}, timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function getAuthHeaders() {
  const headers = {};
  const token = appParams.token
    || safeLocalStorage.getItem('base44_access_token')
    || safeLocalStorage.getItem('token');

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (appParams.appId) {
    headers['X-App-Id'] = appParams.appId;
    headers['Base44-App-Id'] = appParams.appId;
  }

  if (appParams.serverUrl) {
    headers['Base44-Api-Url'] = appParams.serverUrl;
  }

  if (appParams.functionsVersion) {
    headers['Base44-Functions-Version'] = appParams.functionsVersion;
  }

  return headers;
}

export const authApi = {
  getDiscordStartUrl(redirectTo) {
    return buildUrl('discord/start', {
      redirect_to: redirectTo,
      app_base: getAppBasePath(),
    }).toString();
  },

  async getSession({ timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const response = await fetchWithTimeout(buildUrl('session'), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: getAuthHeaders(),
    }, timeoutMs);

    const data = await parseJson(response);
    if (!response.ok) {
      return {
        authenticated: false,
        ...(data || {}),
        status: response.status,
      };
    }

    return {
      ...(data || {}),
      status: response.status,
    };
  },

  async logout({ timeoutMs = AUTH_REQUEST_TIMEOUT_MS } = {}) {
    const response = await fetchWithTimeout(buildUrl('logout'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: getAuthHeaders(),
    }, timeoutMs);

    return parseJson(response);
  },
};
