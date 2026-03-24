import { createClient } from '@base44/sdk';
import { appParams } from '@/core/data/app-params';

function resolveBase44Origin(value) {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return undefined;
}

const { appId, token, functionsVersion, appBaseUrl, serverUrl } = appParams;
const resolvedServerUrl = resolveBase44Origin(serverUrl);
const resolvedAppBaseUrl = resolveBase44Origin(appBaseUrl) || resolvedServerUrl;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: resolvedServerUrl,
  requiresAuth: false,
  appBaseUrl: resolvedAppBaseUrl
});
