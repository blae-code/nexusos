import { safeLocalStorage } from '@/core/data/safe-storage';

const isNode = typeof window === 'undefined';
const importMetaWithEnv = /** @type {{ env?: Record<string, string | undefined> }} */ (import.meta);
const viteEnv = importMetaWithEnv.env || {};
let cachedAppParams = null;

function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function replaceUrlSearch(nextSearchParams) {
  if (isNode) {
    return;
  }

  const nextUrl = `${window.location.pathname}${nextSearchParams.toString() ? `?${nextSearchParams.toString()}` : ''}${window.location.hash}`;

  try {
    window.history.replaceState({}, document.title, nextUrl);
  } catch {
    // Ignore history mutations in restricted host environments.
  }
}

function readAppParamValue(paramName, options = {}) {
  const {
    defaultValue = undefined,
    removeFromUrl = false,
    persistDefault = false,
  } = options;

  if (isNode) {
    return defaultValue ?? null;
  }

  const storageKey = `base44_${toSnakeCase(paramName)}`;
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get(paramName);

  if (searchParam !== null && searchParam !== '') {
    safeLocalStorage.setItem(storageKey, searchParam);

    if (removeFromUrl) {
      urlParams.delete(paramName);
      replaceUrlSearch(urlParams);
    }

    return searchParam;
  }

  const storedValue = safeLocalStorage.getItem(storageKey);
  if (storedValue) {
    return storedValue;
  }

  if (defaultValue !== undefined && defaultValue !== null && defaultValue !== '') {
    if (persistDefault) {
      safeLocalStorage.setItem(storageKey, String(defaultValue));
    }
    return defaultValue;
  }

  return null;
}

function resolveAppParams() {
  if (cachedAppParams) {
    return cachedAppParams;
  }

  const clearAccessToken = readAppParamValue('clear_access_token', { removeFromUrl: true });
  if (clearAccessToken === 'true') {
    safeLocalStorage.removeItem('base44_access_token');
    safeLocalStorage.removeItem('token');
  }

  const serverUrl = readAppParamValue('server_url', {
    defaultValue: viteEnv.VITE_BASE44_APP_BASE_URL,
  });

  cachedAppParams = {
    appId: readAppParamValue('app_id', {
      defaultValue: viteEnv.VITE_BASE44_APP_ID,
    }),
    token: readAppParamValue('access_token', { removeFromUrl: true }),
    fromUrl: readAppParamValue('from_url', {
      defaultValue: isNode ? '' : window.location.href,
    }),
    serverUrl,
    functionsVersion: readAppParamValue('functions_version', {
      defaultValue: viteEnv.VITE_BASE44_FUNCTIONS_VERSION,
    }),
    appBaseUrl: readAppParamValue('app_base_url', {
      defaultValue: serverUrl,
    }),
  };

  return cachedAppParams;
}

export function getAppParams() {
  return resolveAppParams();
}

export function refreshAppParams() {
  cachedAppParams = null;
  return resolveAppParams();
}

export const appParams = {
  get appId() {
    return getAppParams().appId;
  },
  get token() {
    return getAppParams().token;
  },
  get fromUrl() {
    return getAppParams().fromUrl;
  },
  get serverUrl() {
    return getAppParams().serverUrl;
  },
  get functionsVersion() {
    return getAppParams().functionsVersion;
  },
  get appBaseUrl() {
    return getAppParams().appBaseUrl;
  },
};
