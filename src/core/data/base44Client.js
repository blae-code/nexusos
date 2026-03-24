import { createClient } from '@base44/sdk';
import { getAppParams } from '@/core/data/app-params';

/** @typedef {ReturnType<typeof createClient>} Base44Client */

/** @type {Base44Client | null} */
let cachedClient = null;

function resolveBase44Origin(value) {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return undefined;
}

/** @returns {Base44Client} */
function createBase44Client() {
  const { appId, token, functionsVersion, appBaseUrl, serverUrl } = getAppParams();
  const resolvedServerUrl = resolveBase44Origin(serverUrl);
  const resolvedAppBaseUrl = resolveBase44Origin(appBaseUrl) || resolvedServerUrl;

  return createClient({
    appId,
    token,
    functionsVersion,
    serverUrl: resolvedServerUrl,
    requiresAuth: false,
    appBaseUrl: resolvedAppBaseUrl,
  });
}

/** @returns {Base44Client} */
export function getBase44Client() {
  if (!cachedClient) {
    cachedClient = createBase44Client();
  }

  return cachedClient;
}

export const base44 = /** @type {Base44Client} */ (new Proxy({}, {
  get(_target, property) {
    const value = getBase44Client()[property];
    return typeof value === 'function' ? value.bind(getBase44Client()) : value;
  },
}));
