import { getAppBasePath } from '@/lib/app-base-path';
import { buildBase44Url, getBase44Headers } from '@/lib/base44-host';

const AUTH_BASE = '/functions/auth';
export const AUTH_REQUEST_TIMEOUT_MS = 6000;

function buildUrl(path, searchParams) {
  const url = buildBase44Url(`${AUTH_BASE}/${path}`);
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
      headers: getBase44Headers(),
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
      headers: getBase44Headers(),
    }, timeoutMs);

    return parseJson(response);
  },
};
