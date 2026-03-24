import { safeLocalStorage } from '@/core/data/safe-storage';

const isNode = typeof window === 'undefined';
const importMetaWithEnv = /** @type {{ env?: Record<string, string | undefined> }} */ (import.meta);
const viteEnv = importMetaWithEnv.env || {};
let cachedAppParams = null;
const INVALID_PARAM_SENTINELS = new Set(['null', 'undefined', 'nan']);

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

function normalizeUrlValue(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function normalizeAppParamValue(paramName, value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmedValue = String(value).trim();
  if (!trimmedValue) {
    return null;
  }

  if (INVALID_PARAM_SENTINELS.has(trimmedValue.toLowerCase())) {
    return null;
  }

  switch (paramName) {
    case 'server_url':
    case 'app_base_url':
    case 'from_url':
      return normalizeUrlValue(trimmedValue);
    default:
      return trimmedValue;
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
  const normalizedSearchParam = normalizeAppParamValue(paramName, searchParam);

  if (normalizedSearchParam !== null) {
    safeLocalStorage.setItem(storageKey, normalizedSearchParam);

    if (removeFromUrl) {
      urlParams.delete(paramName);
      replaceUrlSearch(urlParams);
    }

    return normalizedSearchParam;
  }

  if (searchParam !== null) {
    safeLocalStorage.removeItem(storageKey);
    urlParams.delete(paramName);
    replaceUrlSearch(urlParams);
  }

  const storedValue = safeLocalStorage.getItem(storageKey);
  const normalizedStoredValue = normalizeAppParamValue(paramName, storedValue);
  if (normalizedStoredValue !== null) {
    return normalizedStoredValue;
  }

  if (storedValue !== null) {
    safeLocalStorage.removeItem(storageKey);
  }

  const normalizedDefaultValue = normalizeAppParamValue(paramName, defaultValue);
  if (normalizedDefaultValue !== null) {
    if (persistDefault) {
      safeLocalStorage.setItem(storageKey, normalizedDefaultValue);
    }
    return normalizedDefaultValue;
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
