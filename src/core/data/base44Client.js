import { createClient } from '@base44/sdk';
import { getAppParams } from '@/core/data/app-params';
import { IS_LOCAL_SIMULATION_MODE, IS_SHARED_SANDBOX_MODE } from '@/core/data/dev';
import { createMockBase44Client } from '@/core/data/dev/mockBase44Client';
import { createSharedSandboxClient } from '@/core/data/dev/sharedSandboxClient';

/** @typedef {ReturnType<typeof createClient>} Base44Client */

/** @type {Base44Client | null} */
let cachedClient = null;

/** @returns {Base44Client} */
function createBase44Client() {
  if (IS_SHARED_SANDBOX_MODE) {
    return /** @type {Base44Client} */ (/** @type {unknown} */ (createSharedSandboxClient()));
  }

  if (IS_LOCAL_SIMULATION_MODE) {
    return /** @type {Base44Client} */ (/** @type {unknown} */ (createMockBase44Client()));
  }

  const { appId, token, functionsVersion, appBaseUrl, serverUrl } = getAppParams();

  return createClient({
    appId,
    token,
    functionsVersion,
    serverUrl,
    requiresAuth: false,
    appBaseUrl,
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
