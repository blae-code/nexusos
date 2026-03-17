import { authApi } from '@/core/data/auth-api';

const meta = /** @type {{ env?: Record<string, string | boolean | undefined> }} */ (import.meta);
const viteEnv = meta.env || {};
const isProduction = viteEnv.PROD === true;
const isDevelopment = viteEnv.DEV === true;

const ENV_SPECS = [
  { name: 'VITE_BASE44_APP_ID', level: 'critical', scope: 'client', aliases: ['VITE_BASE44_APP_ID'] },
  { name: 'VITE_BASE44_APP_BASE_URL', level: 'critical', scope: 'client', aliases: ['VITE_BASE44_APP_BASE_URL'] },
  { name: 'DISCORD_CLIENT_ID', level: 'critical', scope: 'server' },
  { name: 'DISCORD_CLIENT_SECRET', level: 'critical', scope: 'server' },
  { name: 'DISCORD_REDIRECT_URI', level: 'critical', scope: 'server' },
  { name: 'DISCORD_BOT_TOKEN', level: 'critical', scope: 'server' },
  { name: 'DISCORD_GUILD_ID', level: 'critical', scope: 'server' },
  { name: 'STARHEAD_API_URL', level: 'high', scope: 'client', aliases: ['VITE_STARHEAD_API_URL', 'STARHEAD_API_URL'] },
  { name: 'UEX_API_URL', level: 'high', scope: 'client', aliases: ['VITE_UEX_API_URL', 'UEX_API_URL'] },
  { name: 'FLEETYARDS_API_URL', level: 'high', scope: 'client', aliases: ['VITE_FLEETYARDS_API_URL', 'FLEETYARDS_API_URL'] },
  { name: 'SESSION_SECRET', level: 'optional', scope: 'server' },
  { name: 'SENTRY_DSN', level: 'optional', scope: 'client', aliases: ['VITE_SENTRY_DSN', 'SENTRY_DSN'] },
];

function hasValue(value) {
  return Boolean(String(value ?? '').trim());
}

function readClientEnv(aliases = []) {
  const matchedKey = aliases.find((key) => hasValue(viteEnv[key]));
  return {
    matchedKey: matchedKey || null,
    present: Boolean(matchedKey),
  };
}

async function readServerStatuses() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const health = await authApi.getHealth({ timeoutMs: 4000 });
    return health?.env_statuses && typeof health.env_statuses === 'object'
      ? health.env_statuses
      : {};
  } catch (error) {
    console.warn('[validateEnv] Unable to verify server environment via auth health:', error?.message || error);
    return {};
  }
}

function summarizeMissing(results, level) {
  return Object.entries(results)
    .filter(([, value]) => value.level === level && value.present !== true)
    .map(([name]) => name);
}

/**
 * Validate startup environment for the NexusOS frontend and server-backed auth path.
 *
 * @returns {Promise<{
 *   mode: 'production' | 'development' | 'unknown',
 *   env: Record<string, { level: string, scope: string, present: boolean, status: string, resolvedFrom: string | null }>,
 *   missing: { critical: string[], high: string[], optional: string[] }
 * }>}
 */
export async function validateEnv() {
  const serverStatuses = await readServerStatuses();
  const serverStatusAvailable = Object.keys(serverStatuses).length > 0;
  /** @type {Record<string, { level: string, scope: string, present: boolean, status: string, resolvedFrom: string | null }>} */
  const results = {};

  for (const spec of ENV_SPECS) {
    if (spec.scope === 'client') {
      const clientStatus = readClientEnv(spec.aliases);
      results[spec.name] = {
        level: spec.level,
        scope: spec.scope,
        present: clientStatus.present,
        status: clientStatus.present ? 'present' : 'missing',
        resolvedFrom: clientStatus.matchedKey,
      };
      continue;
    }

    const serverPresent = serverStatusAvailable ? Boolean(serverStatuses[spec.name]) : false;
    results[spec.name] = {
      level: spec.level,
      scope: spec.scope,
      present: serverPresent,
      status: serverStatusAvailable ? (serverPresent ? 'present' : 'missing') : 'unverified',
      resolvedFrom: serverStatusAvailable ? spec.name : null,
    };
  }

  const missing = {
    critical: summarizeMissing(results, 'critical'),
    high: summarizeMissing(results, 'high'),
    optional: summarizeMissing(results, 'optional'),
  };

  if (isDevelopment && missing.critical.length > 0) {
    console.warn(`[validateEnv] Missing CRITICAL variables in development: ${missing.critical.join(', ')}`);
  }

  if (isDevelopment && missing.high.length > 0) {
    console.warn(`[validateEnv] Missing HIGH variables in development: ${missing.high.join(', ')}`);
  }

  if (missing.optional.length > 0) {
    console.warn(`[validateEnv] Missing OPTIONAL variables: ${missing.optional.join(', ')}`);
  }

  if (isProduction && missing.critical.length > 0) {
    const message = `[validateEnv] Missing CRITICAL environment variables: ${missing.critical.join(', ')}`;
    console.error(message);
    throw new Error(message);
  }

  return {
    mode: isProduction ? 'production' : isDevelopment ? 'development' : 'unknown',
    env: results,
    missing,
  };
}

export default validateEnv;
