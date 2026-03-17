import { createClient } from '@base44/sdk';
import { getAppParams } from '@/core/data/app-params';
import { IS_DEV_MODE } from '@/core/data/dev';
import { createMockBase44Client } from '@/core/data/dev/mockBase44Client';
import { ENTITY_NAMES } from '@/core/data/entities';

/** @typedef {ReturnType<typeof createClient>} Base44Client */

/** @type {Base44Client | null} */
let cachedClient = null;

/**
 * Touch registered entity keys so the data layer exposes the local schema set
 * through the same base44.entities.<EntityName> pattern used elsewhere.
 *
 * @param {Base44Client} client
 * @returns {Base44Client}
 */
function registerEntityClients(client) {
  if (!client?.entities) {
    return client;
  }

  for (const entityName of ENTITY_NAMES) {
    void client.entities[entityName];
  }

  return client;
}

/** @returns {Base44Client} */
function createBase44Client() {
  if (IS_DEV_MODE) {
    return registerEntityClients(
      /** @type {Base44Client} */ (/** @type {unknown} */ (createMockBase44Client())),
    );
  }

  const { appId, token, functionsVersion, appBaseUrl, serverUrl } = getAppParams();

  return registerEntityClients(createClient({
    appId,
    token,
    functionsVersion,
    serverUrl,
    requiresAuth: false,
    appBaseUrl,
  }));
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
