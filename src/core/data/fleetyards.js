const importMetaWithEnv = /** @type {{ env?: Record<string, string | undefined> }} */ (import.meta);
const env = importMetaWithEnv.env || {};

const FLEETYARDS_API_URL = env.VITE_FLEETYARDS_API_URL || 'https://api.fleetyards.net';
const FLEETYARDS_API_KEY = env.VITE_FLEETYARDS_API_KEY || '';
const REQUEST_TIMEOUT_MS = 10000;
const FLEET_TTL_MS = 5 * 60 * 1000;
const SHIP_TTL_MS = 5 * 60 * 1000;
const AVAILABILITY_TTL_MS = 60 * 1000;

const fleetCache = new Map();
const shipCache = new Map();
const availabilityCache = new Map();
const rateLimitState = {
  resetAt: 0,
};

/**
 * Returns the current backoff reset time.
 *
 * @returns {number}
 */
function getRateLimitResetAt() {
  return Number(rateLimitState.resetAt || 0);
}

/**
 * Updates the current backoff reset time.
 *
 * @param {number} resetAt
 */
function setRateLimitResetAt(resetAt) {
  rateLimitState.resetAt = Math.max(0, Number(resetAt || 0));
}

/**
 * Returns true when Fleetyards has rate-limited the client.
 *
 * @returns {boolean}
 */
function isRateLimited() {
  return Date.now() < getRateLimitResetAt();
}

/**
 * Builds standard request headers for Fleetyards.
 *
 * @returns {Record<string, string>}
 */
function buildHeaders() {
  /** @type {Record<string, string>} */
  const headers = {
    Accept: 'application/json',
  };

  if (FLEETYARDS_API_KEY) {
    headers.Authorization = `Bearer ${FLEETYARDS_API_KEY}`;
    headers['X-API-Key'] = FLEETYARDS_API_KEY;
  }

  return headers;
}

/**
 * Builds a Fleetyards URL from a path and params.
 *
 * @param {string} path
 * @param {Record<string, string | number | undefined>} [params]
 * @returns {URL}
 */
function buildUrl(path, params = {}) {
  const url = new URL(path, FLEETYARDS_API_URL.endsWith('/') ? FLEETYARDS_API_URL : `${FLEETYARDS_API_URL}/`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
}

/**
 * Reads a retry delay from common response headers.
 *
 * @param {Headers} headers
 * @returns {number}
 */
function getRetryDelayMs(headers) {
  const retryAfter = headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) {
      return seconds * 1000;
    }
  }

  const resetAfter = headers.get('x-ratelimit-reset-after');
  if (resetAfter) {
    const seconds = Number(resetAfter);
    if (Number.isFinite(seconds) && seconds > 0) {
      return seconds * 1000;
    }
  }

  return 60 * 1000;
}

/**
 * Waits for a bounded interval.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * Fetches JSON from Fleetyards while failing closed with null.
 *
 * @param {string} path
 * @param {Record<string, string | number | undefined>} [params]
 * @returns {Promise<any | null>}
 */
async function fetchJson(path, params = {}) {
  if (isRateLimited()) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(path, params), {
      method: 'GET',
      headers: buildHeaders(),
      signal: controller.signal,
    });

    if (response.status === 429) {
      const retryDelayMs = getRetryDelayMs(response.headers);
      setRateLimitResetAt(Date.now() + retryDelayMs);
      await wait(Math.min(retryDelayMs, 1500));
      return null;
    }

    if (!response.ok) {
      return null;
    }

    setRateLimitResetAt(0);
    return await response.json();
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * Extracts the first array-like payload from a Fleetyards response.
 *
 * @param {any} payload
 * @returns {any[]}
 */
function extractArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  if (Array.isArray(payload?.results)) {
    return payload.results;
  }
  if (Array.isArray(payload?.ships)) {
    return payload.ships;
  }
  if (Array.isArray(payload?.fleet)) {
    return payload.fleet;
  }
  return [];
}

/**
 * Reads a still-fresh cached value.
 *
 * @param {Map<string, { value: any, expiresAt: number }>} store
 * @param {string} key
 * @returns {any | null}
 */
function getCachedValue(store, key) {
  const entry = store.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.value;
  }
  return null;
}

/**
 * Stores a value with an expiry in a simple in-memory cache.
 *
 * @param {Map<string, { value: any, expiresAt: number }>} store
 * @param {string} key
 * @param {any} value
 * @param {number} ttlMs
 */
function setCachedValue(store, key, value, ttlMs) {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Normalizes a Fleetyards fleet item.
 *
 * @param {any} ship
 * @returns {{name: string, model: string | null, paint: string | null, status: string | null, slug: string | null, loaner: boolean, owner: string | null} | null}
 */
function normalizeFleetItem(ship) {
  const name = ship?.name || ship?.model || ship?.ship_name || ship?.vehicle_name;
  if (!name) {
    return null;
  }

  return {
    name: String(name),
    model: ship?.model || ship?.variant || null,
    paint: ship?.paint || ship?.livery || null,
    status: ship?.status || ship?.availability || null,
    slug: ship?.slug || ship?.id || null,
    loaner: Boolean(ship?.loaner),
    owner: ship?.owner || ship?.username || ship?.member || null,
  };
}

/**
 * Normalizes a Fleetyards ship details payload.
 *
 * @param {any} ship
 * @returns {{name: string, slug: string | null, manufacturer: string | null, cargoScu: number | null, crew: number | null, hardpoints: any[] | null, loadout: any[] | null, dimensions: any | null, roles: any[] | null} | null}
 */
function normalizeShipDetails(ship) {
  const name = ship?.name || ship?.model || ship?.ship_name;
  if (!name) {
    return null;
  }

  const cargoScu = Number(ship?.cargo_scu ?? ship?.cargo ?? ship?.specs?.cargo);
  const crew = Number(ship?.crew ?? ship?.crew_size ?? ship?.specs?.crew);

  return {
    name: String(name),
    slug: ship?.slug || ship?.id || null,
    manufacturer: ship?.manufacturer || ship?.maker || null,
    cargoScu: Number.isFinite(cargoScu) ? cargoScu : null,
    crew: Number.isFinite(crew) ? crew : null,
    hardpoints: Array.isArray(ship?.hardpoints) ? ship.hardpoints : Array.isArray(ship?.weapons) ? ship.weapons : null,
    loadout: Array.isArray(ship?.loadout) ? ship.loadout : Array.isArray(ship?.components) ? ship.components : null,
    dimensions: ship?.dimensions || ship?.size || null,
    roles: Array.isArray(ship?.roles) ? ship.roles : null,
  };
}

/**
 * Returns a member's fleet list with models, paint, and status.
 *
 * @param {string} fleetyardsUsername
 * @returns {Promise<any[] | null>}
 */
export async function getMemberFleet(fleetyardsUsername) {
  if (!fleetyardsUsername) {
    return [];
  }

  const cacheKey = String(fleetyardsUsername).trim().toLowerCase();
  const cached = getCachedValue(fleetCache, cacheKey);
  if (cached) {
    return cached;
  }

  const payload =
    await fetchJson(`/users/${encodeURIComponent(cacheKey)}/fleet`)
    || await fetchJson('/fleet', { user: cacheKey })
    || await fetchJson('/api/fleet', { username: cacheKey });

  const fleet = extractArray(payload)
    .map(normalizeFleetItem)
    .filter(Boolean);

  if (fleet.length === 0) {
    return null;
  }

  setCachedValue(fleetCache, cacheKey, fleet, FLEET_TTL_MS);
  return fleet;
}

/**
 * Returns full ship spec details including hardpoints and loadout.
 *
 * @param {string} shipSlug
 * @returns {Promise<any | null>}
 */
export async function getShipDetails(shipSlug) {
  if (!shipSlug) {
    return null;
  }

  const cacheKey = String(shipSlug).trim().toLowerCase();
  const cached = getCachedValue(shipCache, cacheKey);
  if (cached) {
    return cached;
  }

  const payload =
    await fetchJson(`/ships/${encodeURIComponent(cacheKey)}`)
    || await fetchJson('/ships/details', { slug: cacheKey })
    || await fetchJson('/api/ships', { slug: cacheKey });

  const details = normalizeShipDetails(payload);
  if (!details) {
    return null;
  }

  setCachedValue(shipCache, cacheKey, details, SHIP_TTL_MS);
  return details;
}

/**
 * Checks which members have which ship types available by aggregating individual fleets.
 *
 * @param {string[]} memberIds
 * @returns {Promise<Record<string, any[]> | null>}
 */
export async function getFleetAvailability(memberIds) {
  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return {};
  }

  const normalizedIds = memberIds
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .sort();

  const cacheKey = normalizedIds.join('|');
  const cached = getCachedValue(availabilityCache, cacheKey);
  if (cached) {
    return cached;
  }

  const fleetEntries = await Promise.all(
    normalizedIds.map(async (memberId) => ({
      memberId,
      fleet: await getMemberFleet(memberId),
    })),
  );

  if (fleetEntries.every((entry) => entry.fleet === null)) {
    return null;
  }

  /** @type {Record<string, any[]>} */
  const availability = {};
  for (const entry of fleetEntries) {
    if (!Array.isArray(entry.fleet)) {
      continue;
    }

    entry.fleet.forEach((ship) => {
      const shipType = ship.model || ship.name;
      if (!shipType) {
        return;
      }

      if (!availability[shipType]) {
        availability[shipType] = [];
      }

      availability[shipType].push({
        memberId: entry.memberId,
        shipName: ship.name,
        paint: ship.paint,
        status: ship.status,
        slug: ship.slug,
      });
    });
  }

  setCachedValue(availabilityCache, cacheKey, availability, AVAILABILITY_TTL_MS);
  return availability;
}
