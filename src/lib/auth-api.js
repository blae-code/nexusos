import { appParams } from '@/lib/app-params';

const AUTH_BASE = '/functions/auth';

function buildUrl(path, searchParams) {
  const url = new URL(`${AUTH_BASE}/${path}`, window.location.origin);
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

function getAuthHeaders() {
  const headers = {};
  const token = appParams.token
    || window.localStorage.getItem('base44_access_token')
    || window.localStorage.getItem('token');

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (appParams.appId) {
    headers['X-App-Id'] = appParams.appId;
  }

  return headers;
}

export const authApi = {
  getDiscordStartUrl(redirectTo) {
    return buildUrl('discord/start', { redirect_to: redirectTo }).toString();
  },

  async getSession() {
    const response = await fetch(buildUrl('session'), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: getAuthHeaders(),
    });

    const data = await parseJson(response);
    if (!response.ok) {
      return data || { authenticated: false };
    }

    return data;
  },

  async logout() {
    const response = await fetch(buildUrl('logout'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: getAuthHeaders(),
    });

    return parseJson(response);
  },
};
