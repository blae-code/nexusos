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

export const authApi = {
  getDiscordStartUrl(redirectTo) {
    return buildUrl('discord/start', { redirect_to: redirectTo }).toString();
  },

  async getSession() {
    const response = await fetch(buildUrl('session'), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
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
    });

    return parseJson(response);
  },
};
